import { defineStore } from 'pinia';

// Allowed enums for validation
const ALLOWED_TYPES = [
  'source',
  'map_filter',
  'flatmap',
  'keyby',
  'window_agg',
  'interval_join',
  'temporal_join',
  'async_io',
  'sink'
];
const COST_CLASSES = ['low', 'medium', 'high'];
const REPARTITIONS = ['hash', 'rebalance', 'broadcast'];

function isNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

// Validate and normalize topology JSON; return { ok, normalized, errors, warnings }
function validateTopologyJSON(input) {
  const errors = [];
  const warnings = [];

  if (!input || (typeof input !== 'object')) {
    return { ok: false, errors: ['File does not contain a JSON object.'], warnings, normalized: null };
  }

  const topology = input.topology ? input.topology : input;

  if (!topology || typeof topology !== 'object') {
    return { ok: false, errors: ['Missing "topology" object or root object.'], warnings, normalized: null };
  }

  if (!Array.isArray(topology.operators)) {
    errors.push('"operators" must be an array.');
  }
  if (!Array.isArray(topology.edges)) {
    errors.push('"edges" must be an array.');
  }
  if (errors.length) {
    return { ok: false, errors, warnings, normalized: null };
  }

  // Operators validation and normalization
  const ids = new Set();
  const normalizedOperators = [];
  topology.operators.forEach((op, idx) => {
    const ctx = `operator[#${idx + 1}]`;
    if (!op || typeof op !== 'object') {
      errors.push(`${ctx}: must be an object.`);
      return;
    }
    let id = op.id;
    if (id == null || id === '') {
      id = `op-import-${idx + 1}`;
      warnings.push(`${ctx}: missing id; assigned "${id}".`);
    } else if (typeof id !== 'string') {
      id = String(id);
      warnings.push(`${ctx}: id coerced to string "${id}".`);
    }
    if (ids.has(id)) {
      errors.push(`${ctx}: duplicate id "${id}".`);
      return;
    }
    ids.add(id);

    // Type
    let type = op.type ?? 'map_filter';
    if (!ALLOWED_TYPES.includes(type)) {
      warnings.push(`${ctx}: unknown type "${type}"; defaulted to "map_filter".`);
      type = 'map_filter';
    }

    // Booleans and numbers
    const stateful = Boolean(op.stateful);
    const inputRatio = isNumber(op.inputRatio) ? op.inputRatio : 1.0;
    if (!isNumber(op.inputRatio)) {
      warnings.push(`${ctx}: inputRatio missing/invalid; defaulted to 1.0.`);
    }
    let costClass = op.costClass ?? 'medium';
    if (!COST_CLASSES.includes(costClass)) {
      warnings.push(`${ctx}: costClass "${costClass}" invalid; defaulted to "medium".`);
      costClass = 'medium';
    }

    const userCapacityOverride = isNumber(op.userCapacityOverride)
      ? op.userCapacityOverride
      : (op.userCapacityOverride == null ? null : null);
    if (op.userCapacityOverride != null && !isNumber(op.userCapacityOverride)) {
      warnings.push(`${ctx}: userCapacityOverride not a number; ignored.`);
    }

    const keys = isNumber(op.keys) ? op.keys : null;
    if (op.keys != null && !isNumber(op.keys)) warnings.push(`${ctx}: keys invalid; ignored.`);
    const bytesPerKey = isNumber(op.bytesPerKey) ? op.bytesPerKey : null;
    if (op.bytesPerKey != null && !isNumber(op.bytesPerKey)) warnings.push(`${ctx}: bytesPerKey invalid; ignored.`);
    const windowSizeSec = isNumber(op.windowSizeSec) ? op.windowSizeSec : null;
    if (op.windowSizeSec != null && !isNumber(op.windowSizeSec)) warnings.push(`${ctx}: windowSizeSec invalid; ignored.`);
    const ttlSec = isNumber(op.ttlSec) ? op.ttlSec : null;
    if (op.ttlSec != null && !isNumber(op.ttlSec)) warnings.push(`${ctx}: ttlSec invalid; ignored.`);
    const keyBy = Boolean(op.keyBy);
    let repartition = op.repartition ?? 'hash';
    if (!REPARTITIONS.includes(repartition)) {
      warnings.push(`${ctx}: repartition "${repartition}" invalid; defaulted to "hash".`);
      repartition = 'hash';
    }

    normalizedOperators.push({
      id,
      name: op.name ?? `Operator ${idx + 1}`,
      type,
      stateful,
      inputRatio,
      costClass,
      userCapacityOverride,
      keys,
      bytesPerKey,
      windowSizeSec,
      ttlSec,
      keyBy,
      repartition
    });
  });

  // Edges validation and normalization
  const normalizedEdges = [];
  const validIds = new Set(normalizedOperators.map(o => o.id));
  const seenEdges = new Set();
  topology.edges.forEach((e, idx) => {
    const ctx = `edge[#${idx + 1}]`;
    if (!e || typeof e !== 'object') {
      errors.push(`${ctx}: must be an object.`);
      return;
    }
    const from = String(e.from ?? '');
    const to = String(e.to ?? '');
    if (!from || !to) {
      errors.push(`${ctx}: missing from/to.`);
      return;
    }
    if (!validIds.has(from)) {
      errors.push(`${ctx}: from "${from}" not found in operators.`);
      return;
    }
    if (!validIds.has(to)) {
      errors.push(`${ctx}: to "${to}" not found in operators.`);
      return;
    }
    if (from === to) {
      warnings.push(`${ctx}: self-loop detected from "${from}"; allowed but unusual.`);
    }
    const key = `${from}-->${to}`;
    if (seenEdges.has(key)) {
      warnings.push(`${ctx}: duplicate edge ${from}→${to}; ignored.`);
      return;
    }
    seenEdges.add(key);
    normalizedEdges.push({ from, to });
  });

  if (errors.length) {
    return { ok: false, errors, warnings, normalized: null };
  }

  return { ok: true, errors, warnings, normalized: { operators: normalizedOperators, edges: normalizedEdges } };
}

let nextOperatorId = 1;

export const useGraphStore = defineStore('graph', {
  state: () => ({
    operators: [],
    edges: [],
    chainableFlags: {},
    selectedOperatorId: null
  }),
  
  getters: {
    operatorsById: (state) => {
      const map = {};
      state.operators.forEach(op => {
        map[op.id] = op;
      });
      return map;
    },
    
    selectedOperator: (state) => {
      return state.operators.find(op => op.id === state.selectedOperatorId);
    },
    
    hasOperators: (state) => state.operators.length > 0
  },
  
  actions: {
    addOperator(operatorData) {
      const id = `op-${nextOperatorId++}`;
      const operator = {
        id,
        name: operatorData.name || `Operator ${nextOperatorId - 1}`,
        type: operatorData.type || 'map_filter',
        stateful: operatorData.stateful ?? false,
        inputRatio: operatorData.inputRatio ?? 1.0,
        costClass: operatorData.costClass || 'medium',
        userCapacityOverride: null,
        
        // State hints
        keys: operatorData.keys || null,
        bytesPerKey: operatorData.bytesPerKey || null,
        windowSizeSec: operatorData.windowSizeSec || null,
        ttlSec: operatorData.ttlSec || null,
        
        // Shuffle behavior
        keyBy: operatorData.keyBy ?? false,
        repartition: operatorData.repartition || 'hash'
      };
      
      this.operators.push(operator);
      this.selectedOperatorId = id;
      return id;
    },
    
    updateOperator(id, updates) {
      const index = this.operators.findIndex(op => op.id === id);
      if (index !== -1) {
        this.operators[index] = { ...this.operators[index], ...updates };
      }
    },
    
    deleteOperator(id) {
      this.operators = this.operators.filter(op => op.id !== id);
      this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
      if (this.selectedOperatorId === id) {
        this.selectedOperatorId = null;
      }
    },
    
    addEdge(from, to) {
      // Check if edge already exists
      const exists = this.edges.some(e => e.from === from && e.to === to);
      if (!exists) {
        this.edges.push({ from, to });
      }
    },
    
    deleteEdge(from, to) {
      this.edges = this.edges.filter(e => !(e.from === from && e.to === to));
    },
    
    selectOperator(id) {
      this.selectedOperatorId = id;
    },
    
    updateChainableFlag(id, chainable) {
      this.chainableFlags[id] = chainable;
    },
    
    reset() {
      this.operators = [];
      this.edges = [];
      this.chainableFlags = {};
      this.selectedOperatorId = null;
      nextOperatorId = 1;
    },
    
    loadSampleTopology() {
      this.reset();
      
      // Create sample operators
      const sourceId = this.addOperator({
        name: 'Kafka Source',
        type: 'source',
        stateful: false,
        inputRatio: 1.0,
        costClass: 'low'
      });
      
      const filterId = this.addOperator({
        name: 'Filter & Map',
        type: 'map_filter',
        stateful: false,
        inputRatio: 0.7,
        costClass: 'low'
      });
      
      const windowId = this.addOperator({
        name: 'Session Window Agg',
        type: 'window_agg',
        stateful: true,
        inputRatio: 0.5,
        costClass: 'medium',
        keys: 1_000_000,
        bytesPerKey: 512,
        windowSizeSec: 300,
        ttlSec: 3600,
        keyBy: true
      });
      
      const sinkId = this.addOperator({
        name: 'Database Sink',
        type: 'sink',
        stateful: false,
        inputRatio: 1.0,
        costClass: 'medium'
      });
      
      // Create edges
      this.addEdge(sourceId, filterId);
      this.addEdge(filterId, windowId);
      this.addEdge(windowId, sinkId);
      
      this.selectedOperatorId = null;
    },

    exportTopology() {
      // Return a deep copy of the current topology
      return {
        operators: JSON.parse(JSON.stringify(this.operators)),
        edges: JSON.parse(JSON.stringify(this.edges))
      };
    },

    loadTopology(data) {
      try {
        const { ok, errors, warnings, normalized } = validateTopologyJSON(data);
        if (!ok) {
          return { ok: false, errors, warnings };
        }

        const { operators: normalizedOperators, edges: normalizedEdges } = normalized;

        // Apply
        this.operators = normalizedOperators;
        this.edges = normalizedEdges;
        this.chainableFlags = {}; // reset, can be recomputed if needed
        this.selectedOperatorId = null;

        // Update the nextOperatorId to avoid collisions with existing ids of the pattern op-<n>
        const re = /^op-(\d+)$/;
        let maxId = 0;
        for (const o of normalizedOperators) {
          const m = String(o.id).match(re);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n > maxId) maxId = n;
          }
        }
        nextOperatorId = Math.max(1, maxId + 1);

        return { ok: true, errors, warnings };
      } catch (e) {
        console.error('Failed to load topology:', e);
        return { ok: false, errors: ['Unexpected error reading topology.'], warnings: [] };
      }
    }
  }
});
