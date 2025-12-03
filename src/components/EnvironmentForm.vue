<template>
  <div class="environment-form">
    <h2>Environment Configuration</h2>
    
    <div class="form-section">
      <h3>Task Manager Settings</h3>
      
      <div class="form-group">
        <label>Cores per Task Manager</label>
        <input 
          type="number" 
          v-model.number="localEnv.coresPerTM"
          @change="updateEnvironment"
        />
        <span class="help-text">Number of CPU cores allocated to each Task Manager. Affects parallelism capacity.</span>
      </div>
      
      <div class="form-group">
        <label>Slots per Task Manager</label>
        <input 
          type="number" 
          v-model.number="localEnv.slotsPerTM"
          @change="updateEnvironment"
        />
        <span class="help-text">Processing slots per Task Manager. Usually equals number of cores. Each slot runs one parallel task.</span>
      </div>
      
      <div class="form-group">
        <label>Task Manager Process Memory (GiB)</label>
        <input 
          type="number" 
          v-model.number="localEnv.tmProcessMemoryGiB"
          @change="updateEnvironment"
        />
        <span class="help-text">Total memory allocated to each Task Manager process. Split between heap, managed memory, and network buffers.</span>
      </div>
      
      <div class="form-group">
        <label>Job Manager Process Memory (GiB)</label>
        <input 
          type="number" 
          v-model.number="localEnv.jmProcessMemoryGiB"
          @change="updateEnvironment"
        />
        <span class="help-text">Memory for the Job Manager. Handles coordination, checkpointing metadata, and web UI. 2-4 GiB typical.</span>
      </div>
    </div>
    
    <div class="form-section">
      <h3>State Backend</h3>
      
      <div class="form-group">
        <label>Backend Type</label>
        <select 
          v-model="localEnv.stateBackend"
          @change="updateEnvironment"
        >
          <option value="rocksdb">RocksDB</option>
          <option value="heap">Heap</option>
        </select>
        <span class="help-text">RocksDB: Disk-based, handles large state (TBs), slightly higher latency. Heap: In-memory, faster but limited by RAM.</span>
      </div>
    </div>
    
    <div class="form-section">
      <h3>Checkpointing</h3>
      
      <div class="form-group">
        <label>Checkpoint Interval (seconds)</label>
        <input 
          type="number" 
          v-model.number="localEnv.checkpointIntervalSec"
          @change="updateEnvironment"
        />
        <span class="help-text">How often to snapshot state for fault tolerance. Lower = less data loss on failure, but more overhead. 60-600s typical.</span>
      </div>
      
      <div class="form-group">
        <label>Max Checkpoint Duration (seconds)</label>
        <input 
          type="number" 
          v-model.number="localEnv.maxCheckpointDurationSec"
          @change="updateEnvironment"
        />
        <span class="help-text">Maximum time allowed for a checkpoint to complete. Should be less than interval. Depends on state size.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useEnvironmentStore } from '@/stores/environment';

const envStore = useEnvironmentStore();
const localEnv = ref({ ...envStore.$state });

const updateEnvironment = () => {
  envStore.updateEnvironment(localEnv.value);
};

watch(() => envStore.$state, (newState) => {
  localEnv.value = { ...newState };
}, { deep: true });
</script>

<style scoped>
.environment-form {
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

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
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
