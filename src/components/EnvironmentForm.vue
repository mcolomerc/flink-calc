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
    
    <div class="form-section">
      <h3>Runtime Versions</h3>
      
      <div class="form-group">
        <label>Java Version</label>
        <select 
          v-model="localEnv.javaVersion"
          @change="updateEnvironment"
        >
          <option value="11">Java 11</option>
          <option value="17">Java 17 (Recommended)</option>
          <option value="21">Java 21</option>
        </select>
        <span class="help-text">Java 17 typically provides ~5% better throughput. Java 21 offers ~6% improvement but is experimental in Flink.</span>
      </div>
      
      <div class="form-group">
        <label>Flink Version</label>
        <select 
          v-model="localEnv.flinkVersion"
          @change="updateEnvironment"
        >
          <option value="1.16">Flink 1.16</option>
          <option value="1.17">Flink 1.17</option>
          <option value="1.18">Flink 1.18</option>
          <option value="1.19">Flink 1.19</option>
          <option value="1.20">Flink 1.20 (Recommended)</option>
          <option value="2.0">Flink 2.0</option>
        </select>
        <span class="help-text">Newer Flink versions include runtime optimizations. Flink 1.20: +8%, Flink 2.0: +10% typical efficiency gains.</span>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="localEnv.useEfficiencyAdjustments"
            @change="updateEnvironment"
          />
          Use version efficiency adjustments
        </label>
        <span class="help-text">Apply runtime efficiency multipliers based on Java and Flink versions. Disable to use baseline (Java 11 / Flink 1.16) capacity.</span>
      </div>
      
      <div v-if="localEnv.useEfficiencyAdjustments" class="efficiency-info">
        <strong>Estimated efficiency boost:</strong> {{ efficiencyDescription }}
      </div>
    </div>
    
    <div class="form-section">
      <h3>Data Format & Record Size</h3>
      
      <div class="form-group">
        <label>Record Format</label>
        <select 
          v-model="localEnv.recordFormat"
          @change="updateEnvironment"
        >
          <option value="json">JSON</option>
          <option value="avro">Avro (Recommended)</option>
          <option value="protobuf">Protobuf</option>
          <option value="binary">Binary / POJO / Kryo</option>
        </select>
        <span class="help-text">JSON: ~40% lower CPU throughput due to serialization overhead. Avro: baseline. Protobuf: slight advantage. Binary: most efficient if self-describing.</span>
      </div>
      
      <div class="form-group">
        <label>Wire Size (Kafka/Network, bytes)</label>
        <input 
          type="number" 
          v-model.number="localEnv.recordWireSizeBytes"
          @change="updateEnvironment"
          min="1"
        />
        <span class="help-text">Average serialized record size on the wire. Used to calculate network bandwidth and state size impact. If unknown, use logical size estimate.</span>
      </div>
      
      <div class="form-group">
        <label>Logical Size (memory, bytes) — optional</label>
        <input 
          type="number" 
          v-model.number="localEnv.recordLogicalSizeBytes"
          @change="updateEnvironment"
          min="1"
        />
        <span class="help-text">Average in-memory size of decoded objects. Mainly for reference. Wire size is used for capacity calculations.</span>
      </div>
      
      <div class="form-group">
        <label>Compression</label>
        <select 
          v-model="localEnv.compressionCodec"
          @change="updateEnvironment"
        >
          <option value="none">None</option>
          <option value="snappy">Snappy</option>
          <option value="zstd">Zstd</option>
          <option value="gzip">Gzip</option>
        </select>
        <span class="help-text">Network compression. Snappy: fast, moderate ratio. Zstd: better ratio, slightly slower. Gzip: best ratio, highest CPU overhead.</span>
      </div>
      
      <div class="format-impact-info">
        <strong>Record impact on capacity:</strong> {{ formatDescription }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useEnvironmentStore } from '@/stores/environment';

const envStore = useEnvironmentStore();
const localEnv = ref({ ...envStore.$state });

const efficiencyDescription = computed(() => {
  const javaMultipliers = { '11': 1.00, '17': 1.05, '21': 1.06 };
  const javaMultiplier = javaMultipliers[localEnv.value.javaVersion] || 1.00;
  const javaGain = ((javaMultiplier - 1) * 100).toFixed(0);
  
  const version = parseFloat(localEnv.value.flinkVersion);
  let flinkMultiplier = 1.00;
  if (version >= 2.0) flinkMultiplier = 1.10;
  else if (version >= 1.20) flinkMultiplier = 1.08;
  else if (version >= 1.17) flinkMultiplier = 1.05;
  const flinkGain = ((flinkMultiplier - 1) * 100).toFixed(0);
  
  const totalGain = ((javaMultiplier * flinkMultiplier - 1) * 100).toFixed(0);
  
  return `Java ${localEnv.value.javaVersion}: +${javaGain}%, Flink ${localEnv.value.flinkVersion}: +${flinkGain}% → Total: +${totalGain}% capacity`;
});

const formatDescription = computed(() => {
  const formatMultipliers = {
    json: 0.6,
    avro: 1.0,
    protobuf: 1.05,
    binary: 1.15
  };
  const formatMult = formatMultipliers[localEnv.value.recordFormat] || 1.0;
  
  const bytes = localEnv.value.recordWireSizeBytes;
  let sizePenalty = 1.0;
  if (bytes <= 1024) sizePenalty = 1.0;
  else if (bytes <= 10 * 1024) sizePenalty = 0.85;
  else if (bytes <= 100 * 1024) sizePenalty = 0.65;
  else sizePenalty = 0.5;
  
  const combined = (formatMult * sizePenalty - 1) * 100;
  const direction = combined >= 0 ? '+' : '';
  
  return `Format (${localEnv.value.recordFormat}): ${formatMult}x | Size (${bytes}B): ${sizePenalty}x penalty | Combined: ${direction}${combined.toFixed(0)}%`;
});

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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #555;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.efficiency-info {
  margin-top: 10px;
  padding: 12px;
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  border-radius: 4px;
  font-size: 14px;
  color: #2e7d32;
}

.format-impact-info {
  margin-top: 10px;
  padding: 12px;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  border-radius: 4px;
  font-size: 14px;
  color: #1565c0;
}
</style>
