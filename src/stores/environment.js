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
    useEfficiencyAdjustments: true,
    recordWireSizeBytes: 1000,
    recordLogicalSizeBytes: 1000,
    recordFormat: 'avro',
    compressionCodec: 'none',
    // FLIP-49 configuration
    useFlip49: false,
    deploymentType: 'standalone', // 'standalone', 'kubernetes', 'docker', 'yarn'
    flip49NetworkFraction: 0.1,
    flip49ManagedFraction: 0.4,
    flip49OverheadFraction: 0.1,
    flip49NetworkMemoryMin: 64, // MiB
    flip49NetworkMemoryMax: 1024, // MiB
    flip49OverheadMemoryMin: 192, // MiB
    flip49OverheadMemoryMax: 768, // MiB
    flip49MetaspaceSize: 96, // MiB
    flip49DirectMemoryCap: 512, // MiB
    flip49HeapCutoffMin: 1024, // MiB
    flip49HeapCutoffRatio: 0.8
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
    },
    
    formatMultiplier: (state) => {
      const multipliers = {
        json: 0.6,
        avro: 1.0,
        protobuf: 1.05,
        binary: 1.15
      };
      return multipliers[state.recordFormat] || 1.0;
    },
    
    sizePenalty: (state) => {
      const bytes = state.recordWireSizeBytes;
      if (bytes <= 1024) return 1.0;
      if (bytes <= 10 * 1024) return 0.85;
      if (bytes <= 100 * 1024) return 0.65;
      return 0.5;
    },
    
    formatDescription: (state) => {
      const mult = state.formatMultiplier;
      const penalty = state.sizePenalty;
      const combined = ((mult * penalty - 1) * 100).toFixed(0);
      const direction = combined >= 0 ? '+' : '';
      return `Format (${state.recordFormat}): ${mult}x | Size penalty: ${penalty}x | Combined impact: ${direction}${combined}%`;
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
      this.recordWireSizeBytes = 1000;
      this.recordLogicalSizeBytes = 1000;
      this.recordFormat = 'avro';
      this.compressionCodec = 'none';
      this.useFlip49 = false;
      this.deploymentType = 'standalone';
      this.flip49NetworkFraction = 0.1;
      this.flip49ManagedFraction = 0.4;
      this.flip49OverheadFraction = 0.1;
      this.flip49NetworkMemoryMin = 64;
      this.flip49NetworkMemoryMax = 1024;
      this.flip49OverheadMemoryMin = 192;
      this.flip49OverheadMemoryMax = 768;
      this.flip49MetaspaceSize = 96;
      this.flip49DirectMemoryCap = 512;
      this.flip49HeapCutoffMin = 1024;
      this.flip49HeapCutoffRatio = 0.8;
    }
  }
});
