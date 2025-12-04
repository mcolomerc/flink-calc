import { defineStore } from 'pinia';

export const useEnvironmentStore = defineStore('environment', {
  state: () => ({
    slotsPerTM: 4,
    coresPerTM: 4,
    tmProcessMemoryGiB: 16,
    jmProcessMemoryGiB: 4,
    stateBackend: 'rocksdb',
    checkpointIntervalSec: 300,
    maxCheckpointDurationSec: 120,
    javaVersion: '17',
    flinkVersion: '1.20',
    useEfficiencyAdjustments: true
  }),
  
  getters: {
    javaMultiplier: (state) => {
      if (!state.useEfficiencyAdjustments) return 1.0;
      const multipliers = {
        '11': 1.00,
        '17': 1.05,
        '21': 1.06
      };
      return multipliers[state.javaVersion] || 1.00;
    },
    
    flinkMultiplier: (state) => {
      if (!state.useEfficiencyAdjustments) return 1.0;
      const version = parseFloat(state.flinkVersion);
      if (version >= 2.0) return 1.10;
      if (version >= 1.20) return 1.08;
      if (version >= 1.17) return 1.05;
      return 1.00;
    },
    
    combinedEfficiencyMultiplier: (state) => {
      return state.javaMultiplier * state.flinkMultiplier;
    },
    
    efficiencyDescription: (state) => {
      if (!state.useEfficiencyAdjustments) return 'No efficiency adjustments applied';
      const javaGain = ((state.javaMultiplier - 1) * 100).toFixed(0);
      const flinkGain = ((state.flinkMultiplier - 1) * 100).toFixed(0);
      const totalGain = ((state.combinedEfficiencyMultiplier - 1) * 100).toFixed(0);
      return `Java ${state.javaVersion}: +${javaGain}%, Flink ${state.flinkVersion}: +${flinkGain}% → Total: +${totalGain}% capacity improvement`;
    }
  },
  
  actions: {
    updateEnvironment(updates) {
      Object.assign(this, updates);
      
      // Keep slots aligned with cores by default
      if (updates.coresPerTM !== undefined && updates.slotsPerTM === undefined) {
        this.slotsPerTM = updates.coresPerTM;
      }
    },
    
    reset() {
      this.slotsPerTM = 4;
      this.coresPerTM = 4;
      this.tmProcessMemoryGiB = 16;
      this.jmProcessMemoryGiB = 4;
      this.stateBackend = 'rocksdb';
      this.checkpointIntervalSec = 300;
      this.maxCheckpointDurationSec = 120;
      this.javaVersion = '17';
      this.flinkVersion = '1.20';
      this.useEfficiencyAdjustments = true;
    }
  }
});
