import { defineStore } from 'pinia';

export const useWorkloadStore = defineStore('workload', {
  state: () => ({
    inputRateAvg: 50000,
    inputRatePeak: 120000,
    burstFactor: 2.4,
    latencyTargetMs: 2000,
    catchUpMinutes: 15,
    headroom: 1.5
  }),
  
  actions: {
    updateWorkload(updates) {
      Object.assign(this, updates);
      
      // Auto-calculate peak if burst factor changes
      if (updates.burstFactor !== undefined && updates.inputRatePeak === undefined) {
        this.inputRatePeak = Math.round(this.inputRateAvg * this.burstFactor);
      }
      
      // Auto-calculate burst factor if peak changes
      if (updates.inputRatePeak !== undefined && updates.inputRateAvg > 0) {
        this.burstFactor = this.inputRatePeak / this.inputRateAvg;
      }
    },
    
    reset() {
      this.inputRateAvg = 50000;
      this.inputRatePeak = 120000;
      this.burstFactor = 2.4;
      this.latencyTargetMs = 2000;
      this.catchUpMinutes = 15;
      this.headroom = 1.5;
    }
  }
});
