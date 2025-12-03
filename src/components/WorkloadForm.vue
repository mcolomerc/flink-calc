<template>
  <div class="workload-form">
    <h2>Workload & SLA</h2>
    
    <div class="form-section">
      <h3>Input Rates</h3>
      
      <div class="form-group">
        <label>Average Rate (records/sec)</label>
        <input 
          type="number" 
          v-model.number="localWorkload.inputRateAvg"
          @change="updateWorkload"
        />
        <span class="help-text">Expected sustained input throughput during normal operation. Used for steady-state capacity planning.</span>
      </div>
      
      <div class="form-group">
        <label>Peak Rate (records/sec)</label>
        <input 
          type="number" 
          v-model.number="localWorkload.inputRatePeak"
          @change="updateWorkload"
        />
        <span class="help-text">Maximum input throughput during traffic spikes or peak hours. The system will be sized to handle this rate.</span>
      </div>
      
      <div class="form-group">
        <label>Burst Factor (peak/avg)</label>
        <input 
          type="number" 
          step="0.1"
          v-model.number="localWorkload.burstFactor"
          @change="updateWorkload"
        />
        <span class="help-text">Ratio of peak to average rate. Auto-calculated: {{ calculatedBurstFactor.toFixed(2) }}. Helps understand traffic variability.</span>
      </div>
    </div>
    
    <div class="form-section">
      <h3>SLA Requirements</h3>
      
      <div class="form-group">
        <label>Latency Target (ms)</label>
        <input 
          type="number" 
          v-model.number="localWorkload.latencyTargetMs"
          @change="updateWorkload"
        />
        <span class="help-text">End-to-end P95 latency goal. Lower values may require more resources to meet processing time requirements.</span>
      </div>
      
      <div class="form-group">
        <label>Catch-up Time (minutes)</label>
        <input 
          type="number" 
          v-model.number="localWorkload.catchUpMinutes"
          @change="updateWorkload"
        />
        <span class="help-text">How quickly the system should recover from backlog after an outage or lag. Shorter times need more capacity.</span>
      </div>
      
      <div class="form-group">
        <label>Headroom Multiplier</label>
        <input 
          type="number" 
          step="0.1"
          min="1.0"
          max="3.0"
          v-model.number="localWorkload.headroom"
          @change="updateWorkload"
        />
        <span class="help-text">Safety buffer for capacity planning. 1.3-2.0 recommended. Higher values = more resilience but higher cost.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useWorkloadStore } from '@/stores/workload';

const workloadStore = useWorkloadStore();
const localWorkload = ref({ ...workloadStore.$state });

const calculatedBurstFactor = computed(() => {
  if (localWorkload.value.inputRateAvg > 0) {
    return localWorkload.value.inputRatePeak / localWorkload.value.inputRateAvg;
  }
  return 0;
});

const updateWorkload = () => {
  workloadStore.updateWorkload(localWorkload.value);
};

// Watch store changes
watch(() => workloadStore.$state, (newState) => {
  localWorkload.value = { ...newState };
}, { deep: true });
</script>

<style scoped>
.workload-form {
  padding: 20px;
  max-width: 600px;
}

h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  color: #34495e;
  font-size: 1.1em;
}

.form-section {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #7f8c8d;
}
</style>
