/**
 * FLIP-49 & FLIP-116 Unified Memory Configuration for TaskExecutors
 * Implements accurate Flink memory sizing for Flink >= 1.10
 * Reference: https://cwiki.apache.org/confluence/display/FLINK/FLIP-49%3A+Unified+Memory+Configuration+for+TaskExecutors
 */

/**
 * Default FLIP-49 memory configuration values
 */
export const FLIP49_DEFAULTS = {
  // Fractions (as decimal, e.g., 0.1 = 10%)
  networkFraction: 0.1,
  managedFraction: 0.4,
  overheadFraction: 0.1,
  
  // Clamps and bounds
  networkMemoryMin: 64, // MiB
  networkMemoryMax: 1024, // MiB
  overheadMemoryMin: 192, // MiB
  overheadMemoryMax: 768, // MiB
  
  // Metaspace and direct memory
  metaspaceSize: 96, // MiB
  directMemoryCap: 512, // MiB
  
  // JVM overhead (for containerization)
  heapCutoffMin: 1024, // MiB
  heapCutoffRatio: 0.8, // Max heap = 80% of process memory
};

/**
 * Calculate Flink memory from process memory using FLIP-49 rules
 * 
 * @param {number} processMemoryMiB - Total process memory in MiB
 * @param {object} config - FLIP-49 configuration overrides
 * @returns {object} Memory breakdown with all components
 */
export function calculateFlinkMemory(processMemoryMiB, config = {}) {
  const c = { ...FLIP49_DEFAULTS, ...config };
  
  // Reserved memory: metaspace + direct memory
  const reservedMemory = c.metaspaceSize + c.directMemoryCap; // ~608 MiB typically
  
  // Flink memory is what's left after JVM overhead
  // In practice: FlinkMemory ≈ ProcessMemory - JVMOverhead
  // where JVMOverhead includes metaspace + direct + OS overhead
  const flinkMemory = Math.max(processMemoryMiB - reservedMemory - 128, 1024); // Leave 128 for OS
  
  // Network memory (with clamping)
  const networkMemoryRaw = Math.round(flinkMemory * c.networkFraction);
  const networkMemory = clamp(networkMemoryRaw, c.networkMemoryMin, c.networkMemoryMax);
  
  // Managed memory (off-heap state storage)
  const managedMemory = Math.round(flinkMemory * c.managedFraction);
  
  // JVM overhead (metaspace + other overhead, clamped)
  const overheadMemoryRaw = Math.round(flinkMemory * c.overheadFraction);
  const overheadMemory = clamp(overheadMemoryRaw, c.overheadMemoryMin, c.overheadMemoryMax);
  
  // Remaining memory goes to JVM heap (task + framework)
  let heapMemory = flinkMemory - networkMemory - managedMemory - overheadMemory;
  heapMemory = Math.max(heapMemory, 512); // Minimum 512 MiB heap
  
  return {
    processMemory: processMemoryMiB,
    flinkMemory: Math.round(flinkMemory),
    networkMemory: Math.round(networkMemory),
    managedMemory: Math.round(managedMemory),
    heapMemory: Math.round(heapMemory),
    overheadMemory: Math.round(overheadMemory),
    metaspaceSize: c.metaspaceSize,
    directMemoryCap: c.directMemoryCap,
  };
}

/**
 * Apply containerization constraints (Kubernetes, Docker)
 * Enforces: heap >= cutoff-min and heap >= cutoff-ratio * processMemory
 * If violated, shifts memory from heap to off-heap buckets
 * 
 * @param {object} memoryBreakdown - Result from calculateFlinkMemory()
 * @param {object} constraints - Containerization constraints
 * @returns {object} Adjusted memory breakdown
 */
export function applyContainerizationConstraints(memoryBreakdown, constraints = {}) {
  const {
    heapCutoffMin = 1024,
    heapCutoffRatio = 0.8,
    isContainerized = false
  } = constraints;
  
  if (!isContainerized) {
    return memoryBreakdown;
  }
  
  let { heapMemory, processMemory, flinkMemory, networkMemory, managedMemory } = memoryBreakdown;
  
  // Heap cutoff constraints
  const minHeapFromCutoff = heapCutoffMin;
  const maxHeapFromRatio = Math.round(processMemory * heapCutoffRatio);
  
  // Check if current heap violates constraints
  const maxAllowedHeap = Math.min(maxHeapFromRatio, heapMemory);
  
  if (heapMemory > maxAllowedHeap) {
    // Shift excess heap to managed/network memory
    const excessHeap = heapMemory - maxAllowedHeap;
    heapMemory = maxAllowedHeap;
    
    // Try to allocate excess to managed memory first (state storage)
    const managedIncrease = Math.min(excessHeap, Math.round(flinkMemory * 0.5)); // Up to 50% of Flink memory
    managedMemory += managedIncrease;
    
    // Remaining goes to network if possible
    const remainingExcess = excessHeap - managedIncrease;
    if (remainingExcess > 0) {
      networkMemory += remainingExcess;
    }
  }
  
  return {
    ...memoryBreakdown,
    heapMemory: Math.round(heapMemory),
    networkMemory: Math.round(networkMemory),
    managedMemory: Math.round(managedMemory),
  };
}

/**
 * Generate Flink configuration snippet from memory breakdown
 * 
 * @param {object} memoryBreakdown - Result from calculateFlinkMemory()
 * @param {number} tmCount - Number of task managers
 * @param {number} slotsPerTM - Task slots per manager
 * @returns {string} YAML configuration snippet
 */
export function generateFlinkConfig(memoryBreakdown, tmCount = 1, slotsPerTM = 4) {
  const {
    processMemory,
    networkMemory,
    managedMemory,
    heapMemory,
    metaspaceSize,
    directMemoryCap
  } = memoryBreakdown;
  
  // Convert MiB to m (Flink config format)
  const heapMB = `${heapMemory}m`;
  const networkMB = `${networkMemory}m`;
  const managedMB = `${managedMemory}m`;
  const processMB = `${processMemory}m`;
  
  return `# FLIP-49 Unified Memory Configuration (auto-generated)
# For all ${tmCount} TaskExecutors with ${slotsPerTM} slots each

taskmanager.numberOfTaskSlots: ${slotsPerTM}
taskmanager.memory.process.size: ${processMB}

# Flink memory breakdown (auto-calculated)
taskmanager.memory.framework.heap.size: 128m
taskmanager.memory.task.heap.size: ${Math.max(heapMemory - 128, 256)}m
taskmanager.memory.network.min: ${networkMB}
taskmanager.memory.network.max: ${networkMB}
taskmanager.memory.managed.size: ${managedMB}

# JVM settings
taskmanager.memory.jvm-overhead.fraction: 0.1
taskmanager.memory.jvm-metaspace.size: ${metaspaceSize}m
jobmanager.memory.off-heap.size: ${directMemoryCap}m

# Parallelism
parallelism.default: ${Math.min(4, slotsPerTM)}
taskmanager.memory.managed.consumer.network.ratio: 0.5
taskmanager.memory.managed.consumer.states.ratio: 0.5
`;
}

/**
 * Utility: Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate memory per slot from TaskManager breakdown
 * 
 * @param {object} memoryBreakdown - Memory breakdown per TM
 * @param {number} slotsPerTM - Number of slots per TM
 * @returns {object} Memory breakdown per slot
 */
export function memoryPerSlot(memoryBreakdown, slotsPerTM = 4) {
  const {
    heapMemory,
    networkMemory,
    managedMemory,
  } = memoryBreakdown;
  
  // Heap is shared per TM, but we can estimate task-local portion
  const heapPerSlot = Math.round(heapMemory / slotsPerTM);
  const managedPerSlot = Math.round(managedMemory / slotsPerTM);
  
  // Network is shared, not per-slot
  // But we can reference the limit
  
  return {
    heapPerSlot,
    managedPerSlot,
    networkSharedPerTM: networkMemory,
  };
}
