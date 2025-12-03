import { defineStore } from 'pinia';

export const useEnvironmentStore = defineStore('environment', {
  state: () => ({
    slotsPerTM: 4,
    coresPerTM: 4,
    tmProcessMemoryGiB: 16,
    jmProcessMemoryGiB: 4,
    stateBackend: 'rocksdb',
    checkpointIntervalSec: 300,
    maxCheckpointDurationSec: 120
  }),
  
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
    }
  }
});
