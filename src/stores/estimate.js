import { defineStore } from 'pinia';
import { estimate, estimateConservative } from '@/estimator';
import { useWorkloadStore } from './workload';
import { useEnvironmentStore } from './environment';
import { useGraphStore } from './graph';

export const useEstimateStore = defineStore('estimate', {
  state: () => ({
    result: null,
    conservativeResult: null,
    lastUpdated: null
  }),
  
  getters: {
    hasResult: (state) => state.result !== null,
    
    confidence: (state) => state.result?.confidence ?? 0,
    
    confidenceLevel: (state) => {
      const conf = state.result?.confidence ?? 0;
      if (conf >= 0.85) return 'high';
      if (conf >= 0.70) return 'medium';
      return 'low';
    },
    
    totalCost: (state) => {
      if (!state.result) return null;
      const { taskManagers, jobManager } = state.result;
      return {
        cores: state.result.totals.cores,
        memoryGiB: state.result.totals.memoryGiB,
        taskManagers: taskManagers.count
      };
    }
  },
  
  actions: {
    compute() {
      const workloadStore = useWorkloadStore();
      const envStore = useEnvironmentStore();
      const graphStore = useGraphStore();
      
      if (!graphStore.hasOperators) {
        this.result = null;
        this.conservativeResult = null;
        return;
      }
      
      const workload = { ...workloadStore.$state };
      const env = { ...envStore.$state };
      const graph = {
        operators: graphStore.operators,
        edges: graphStore.edges,
        chainableFlags: graphStore.chainableFlags
      };
      
      this.result = estimate(workload, env, graph);
      this.conservativeResult = estimateConservative(workload, env, graph);
      this.lastUpdated = new Date();
    },
    
    exportToJSON() {
      if (!this.result) return null;
      
      return {
        timestamp: this.lastUpdated,
        workload: useWorkloadStore().$state,
        environment: useEnvironmentStore().$state,
        topology: {
          operators: useGraphStore().operators,
          edges: useGraphStore().edges
        },
        estimate: {
          typical: this.result,
          conservative: this.conservativeResult
        }
      };
    },
    
    exportToCSV() {
      if (!this.result) return null;
      
      let csv = 'Operator,Type,Input Rate (rec/s),Capacity (rec/s),Parallelism,Stateful,State per Task (GiB)\n';
      
      this.result.operatorDetails.forEach(op => {
        csv += `"${op.name}",${op.type},${op.inputRate},${op.capacity},${op.parallelism},${op.stateful},${op.statePerSubtaskGiB}\n`;
      });
      
      csv += '\n\nBill of Materials\n';
      csv += 'Component,Count,Cores,Memory (GiB)\n';
      csv += `Job Manager,${this.result.jobManager.count},${this.result.jobManager.cores},${this.result.jobManager.processMemoryGiB}\n`;
      csv += `Task Manager,${this.result.taskManagers.count},${this.result.taskManagers.coresEach},${this.result.taskManagers.processMemoryGiBEach}\n`;
      csv += `Total,1,${this.result.totals.cores},${this.result.totals.memoryGiB}\n`;
      
      return csv;
    },
    
    exportFlinkConfig() {
      if (!this.result) return null;
      
      const { taskManagers } = this.result;
      const { memorySplitEach } = taskManagers;
      const env = useEnvironmentStore();
      
      // Check if FLIP-49 was used
      if (memorySplitEach.flip49 && memorySplitEach.flip49Breakdown) {
        // Use FLIP-49 configuration from flip49 module
        const { generateFlinkConfig } = require('@/estimator/flip49');
        return generateFlinkConfig(
          memorySplitEach.flip49Breakdown,
          taskManagers.count,
          taskManagers.slotsEach
        );
      }
      
      // Fallback to heuristic configuration
      return `# Flink Configuration (Generated - Heuristic)
# Task Manager Memory Configuration
taskmanager.memory.process.size: ${taskManagers.processMemoryGiBEach}g
taskmanager.memory.flink.size: ${(memorySplitEach.heap + memorySplitEach.managed + memorySplitEach.network).toFixed(2)}g
taskmanager.memory.managed.size: ${memorySplitEach.managed}g
taskmanager.memory.network.min: ${(memorySplitEach.network * 0.8).toFixed(2)}g
taskmanager.memory.network.max: ${memorySplitEach.network}g

# Task Manager Slots
taskmanager.numberOfTaskSlots: ${taskManagers.slotsEach}

# Job Manager Memory
jobmanager.memory.process.size: ${this.result.jobManager.processMemoryGiB}g

# Parallelism
parallelism.default: ${Math.max(...this.result.operatorDetails.map(op => op.parallelism))}

# State Backend
state.backend: ${env.stateBackend}

# Checkpointing
execution.checkpointing.interval: ${env.checkpointIntervalSec * 1000}ms
execution.checkpointing.timeout: ${env.maxCheckpointDurationSec * 1000}ms
`;
    },
    
    reset() {
      this.result = null;
      this.conservativeResult = null;
      this.lastUpdated = null;
    }
  }
});
