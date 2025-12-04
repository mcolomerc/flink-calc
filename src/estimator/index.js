/**
 * Default capacity (records/sec/subtask) for each operator type
 */
export const DEFAULT_CAPACITY = {
  source: 200_000,
  map_filter: 250_000,
  flatmap: 120_000,
  keyby: 100_000,
  window_agg: 60_000,
  interval_join: 25_000,
  temporal_join: 15_000,
  async_io: 80_000,
  sink: 150_000
};

/**
 * Cost multipliers
 */
const COST_MULTIPLIERS = {
  low: 1.2,
  medium: 1.0,
  high: 0.6
};

/**
 * Calculate the capacity for an operator based on heuristics
 */
export function capacityFor(op, env) {
  if (op.userCapacityOverride) return op.userCapacityOverride;
  
  let c = DEFAULT_CAPACITY[op.type] ?? 80_000;
  
  // Apply cost class multiplier
  const costMult = COST_MULTIPLIERS[op.costClass] ?? 1.0;
  c *= costMult;
  
  // RocksDB penalty for stateful ops
  if (op.stateful && env.stateBackend === 'rocksdb') {
    c *= 0.7;
  }
  
  // KeyBy skew risk
  if (op.keyBy) {
    c *= 0.8;
  }
  
  // Apply Java and Flink efficiency multipliers
  const javaMultiplier = getJavaMultiplier(env);
  const flinkMultiplier = getFlinkMultiplier(env);
  c *= javaMultiplier * flinkMultiplier;
  
  return c;
}

/**
 * Get Java version efficiency multiplier
 */
function getJavaMultiplier(env) {
  if (!env.useEfficiencyAdjustments) return 1.0;
  const multipliers = {
    '11': 1.00,
    '17': 1.05,
    '21': 1.06
  };
  return multipliers[env.javaVersion] || 1.00;
}

/**
 * Get Flink version efficiency multiplier
 */
function getFlinkMultiplier(env) {
  if (!env.useEfficiencyAdjustments) return 1.0;
  const version = parseFloat(env.flinkVersion);
  if (version >= 2.0) return 1.10;
  if (version >= 1.20) return 1.08;
  if (version >= 1.17) return 1.05;
  return 1.00;
}

/**
 * Topological sort of the DAG
 */
function topologicalSort(graph) {
  const visited = new Set();
  const stack = [];
  const operatorsById = {};
  
  graph.operators.forEach(op => {
    operatorsById[op.id] = op;
  });
  
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    
    // Visit children first
    const children = graph.edges.filter(e => e.from === id).map(e => e.to);
    children.forEach(childId => visit(childId));
    
    stack.unshift(id);
  }
  
  // Start from source nodes (nodes with no incoming edges)
  const targetIds = new Set(graph.edges.map(e => e.to));
  const sourceIds = graph.operators
    .map(op => op.id)
    .filter(id => !targetIds.has(id));
  
  sourceIds.forEach(id => visit(id));
  
  return stack;
}

/**
 * Compute input and output rates for each operator
 */
export function computeRates(graph, workload) {
  const rIn = {};
  const rOut = {};
  const operatorsById = {};
  
  graph.operators.forEach(op => {
    operatorsById[op.id] = op;
  });
  
  const topo = topologicalSort(graph);
  
  topo.forEach(id => {
    const op = operatorsById[id];
    const parents = graph.edges.filter(e => e.to === id).map(e => e.from);
    
    if (parents.length === 0) {
      // Source operator
      rIn[id] = workload.inputRatePeak;
    } else {
      // Sum outputs from all parents
      rIn[id] = parents.reduce((sum, p) => sum + (rOut[p] ?? 0), 0);
    }
    
    const alpha = op.inputRatio ?? 1.0;
    rOut[id] = rIn[id] * alpha;
  });
  
  return { rIn, rOut };
}

/**
 * Calculate required parallelism for an operator
 */
export function parallelismFor(op, rIn, workload, env) {
  const c = capacityFor(op, env);
  return Math.max(1, Math.ceil((rIn / c) * workload.headroom));
}

/**
 * Calculate state memory per subtask in GiB
 */
export function statePerSubtaskGiB(op, P, env) {
  if (!op.stateful || !op.keys || !op.bytesPerKey) return 0;
  
  let factor = 1.0;
  
  if (op.windowSizeSec && op.ttlSec) {
    factor = Math.min(op.ttlSec / op.windowSizeSec, 10);
  } else if (op.ttlSec) {
    factor = 1.5;
  }
  
  const totalBytes = op.keys * op.bytesPerKey * factor;
  const perSubtaskBytes = totalBytes / P;
  
  return perSubtaskBytes / (1024 ** 3);
}

/**
 * Calculate total slots needed
 */
export function totalSlotsNeeded(Ps, chainableFlags = {}) {
  let slots = 0;
  
  for (const [id, P] of Object.entries(Ps)) {
    if (!chainableFlags[id]) {
      slots += P;
    }
  }
  
  // Add chaining uncertainty buffer
  return Math.ceil(slots * 1.1);
}

/**
 * Calculate number of TaskManagers needed
 */
export function taskManagersNeeded(totalSlots, env) {
  return Math.ceil(totalSlots / env.slotsPerTM);
}

/**
 * Calculate memory split for TaskManager
 */
export function memorySplit(env, stateHeavy) {
  const total = env.tmProcessMemoryGiB;
  const overhead = total * 0.10;
  const network = total * (stateHeavy ? 0.12 : 0.10);
  const managed = total * (stateHeavy ? 0.50 : 0.25);
  const heap = total - overhead - network - managed;
  
  return {
    total: parseFloat(total.toFixed(2)),
    heap: parseFloat(heap.toFixed(2)),
    managed: parseFloat(managed.toFixed(2)),
    network: parseFloat(network.toFixed(2)),
    overhead: parseFloat(overhead.toFixed(2))
  };
}

/**
 * Build warnings based on estimates
 */
function buildWarnings(graph, Ps, rIn, split, env) {
  const warnings = [];
  
  graph.operators.forEach(op => {
    const P = Ps[op.id];
    
    // Check state per subtask vs managed memory
    if (op.stateful) {
      const stateGiB = statePerSubtaskGiB(op, P, env);
      if (stateGiB > split.managed) {
        warnings.push({
          type: 'error',
          operator: op.name,
          message: `State per subtask (${stateGiB.toFixed(2)} GiB) exceeds managed memory (${split.managed} GiB)`
        });
      }
    }
    
    // Check if sink is likely bottleneck
    if (op.type === 'sink') {
      const capacity = capacityFor(op, env);
      const requiredCapacity = rIn[op.id] / P;
      if (requiredCapacity > capacity * 0.8) {
        warnings.push({
          type: 'warning',
          operator: op.name,
          message: `Sink may be bottleneck. Required: ${(requiredCapacity/1000).toFixed(0)}k rec/s/task vs capacity: ${(capacity/1000).toFixed(0)}k rec/s/task`
        });
      }
    }
  });
  
  // Check checkpoint interval
  const totalStateGiB = Object.entries(Ps).reduce((sum, [id, P]) => {
    const op = graph.operators.find(o => o.id === id);
    return sum + (op.stateful ? statePerSubtaskGiB(op, P, env) * P : 0);
  }, 0);
  
  if (totalStateGiB > 0) {
    const estimatedCheckpointSec = totalStateGiB * 0.5; // rough heuristic: 0.5s per GiB
    if (estimatedCheckpointSec > env.maxCheckpointDurationSec) {
      warnings.push({
        type: 'warning',
        operator: 'Checkpointing',
        message: `Estimated checkpoint duration (${estimatedCheckpointSec.toFixed(0)}s) may exceed limit (${env.maxCheckpointDurationSec}s)`
      });
    }
    
    if (env.checkpointIntervalSec < estimatedCheckpointSec * 2) {
      warnings.push({
        type: 'warning',
        operator: 'Checkpointing',
        message: `Checkpoint interval (${env.checkpointIntervalSec}s) should be at least 2x checkpoint duration`
      });
    }
  }
  
  return warnings;
}

/**
 * Build the final Bill of Materials
 */
function buildBoM(Ps, rIn, totalSlots, numTMs, split, env, warnings, graph) {
  const operatorDetails = graph.operators.map(op => {
    const P = Ps[op.id];
    const capacity = capacityFor(op, env);
    const stateGiB = op.stateful ? statePerSubtaskGiB(op, P, env) : 0;
    
    return {
      id: op.id,
      name: op.name,
      type: op.type,
      inputRate: rIn[op.id],
      capacity,
      parallelism: P,
      statePerSubtaskGiB: parseFloat(stateGiB.toFixed(3)),
      stateful: op.stateful
    };
  });
  
  return {
    jobManager: {
      count: 1,
      processMemoryGiB: env.jmProcessMemoryGiB,
      cores: 1
    },
    taskManagers: {
      count: numTMs,
      coresEach: env.coresPerTM,
      slotsEach: env.slotsPerTM,
      processMemoryGiBEach: env.tmProcessMemoryGiB,
      memorySplitEach: split
    },
    totals: {
      cores: numTMs * env.coresPerTM + 1,
      memoryGiB: parseFloat((numTMs * env.tmProcessMemoryGiB + env.jmProcessMemoryGiB).toFixed(2)),
      slots: numTMs * env.slotsPerTM
    },
    operatorDetails,
    warnings,
    confidence: calculateConfidence(graph, Ps)
  };
}

/**
 * Calculate confidence score based on user overrides
 */
function calculateConfidence(graph, Ps) {
  const total = graph.operators.length;
  const withOverrides = graph.operators.filter(op => op.userCapacityOverride).length;
  
  const baseConfidence = 0.65; // Base heuristic confidence
  const overrideBonus = withOverrides / total * 0.25;
  
  return Math.min(0.95, baseConfidence + overrideBonus);
}

/**
 * Main estimation function
 */
export function estimate(workload, env, graph) {
  if (!graph.operators || graph.operators.length === 0) {
    return null;
  }
  
  // Compute rates through the DAG
  const { rIn, rOut } = computeRates(graph, workload);
  
  // Calculate parallelism for each operator
  const Ps = {};
  let stateHeavy = false;
  
  for (const op of graph.operators) {
    const P = parallelismFor(op, rIn[op.id], workload, env);
    Ps[op.id] = P;
    if (op.stateful) stateHeavy = true;
  }
  
  // Calculate total slots and TaskManagers
  const slots = totalSlotsNeeded(Ps, graph.chainableFlags ?? {});
  const numTMs = taskManagersNeeded(slots, env);
  
  // Calculate memory split
  const split = memorySplit(env, stateHeavy);
  
  // Build warnings
  const warnings = buildWarnings(graph, Ps, rIn, split, env);
  
  // Build and return BoM
  return buildBoM(Ps, rIn, slots, numTMs, split, env, warnings, graph);
}

/**
 * Calculate conservative estimate (with +50% headroom)
 */
export function estimateConservative(workload, env, graph) {
  const conservativeWorkload = {
    ...workload,
    headroom: workload.headroom * 1.5
  };
  return estimate(conservativeWorkload, env, graph);
}
