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
      <h3>Checkpoint I/O & Storage</h3>
      
      <div class="form-group">
        <label>Storage Backend</label>
        <select 
          v-model="localEnv.checkpointStorageBackend"
          @change="updateEnvironment"
        >
          <option value="s3">S3 / Object Storage</option>
          <option value="hdfs">HDFS</option>
          <option value="nfs">NFS</option>
          <option value="local">Local Disk</option>
          <option value="disk">Fast SSD Disk</option>
        </select>
        <span class="help-text">Checkpoint storage backend. Affects throughput assumptions. S3: ~80-100 MB/s, HDFS: ~150 MB/s, Local: ~350-400 MB/s</span>
      </div>
      
      <div v-if="localEnv.checkpointStorageBackend === 's3'" class="form-group">
        <label>Cloud Provider (for S3 timing)</label>
        <select 
          v-model="localEnv.checkpointDeployment"
          @change="updateEnvironment"
        >
          <option value="aws">AWS S3</option>
          <option value="other">Other Cloud / On-Prem</option>
        </select>
        <span class="help-text">AWS S3 vs other providers affects latency assumptions. On-prem S3 is slightly slower.</span>
      </div>
      
      <div class="form-group">
        <label>I/O Throughput (MB/s) — optional</label>
        <input 
          type="number" 
          v-model.number="localEnv.checkpointIOThroughputMBps"
          @change="updateEnvironment"
          min="1"
          placeholder="Leave blank for auto-detect"
        />
        <span class="help-text">Measured checkpoint write throughput. Leave blank to auto-detect based on backend. Used to estimate checkpoint duration.</span>
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
    
    <div class="form-section">
      <h3>Advanced Memory (FLIP-49/116)</h3>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="localEnv.useFlip49"
            @change="updateEnvironment"
          />
          Enable FLIP-49 unified memory configuration
        </label>
        <span class="help-text">Use accurate FLIP-49/116 memory calculator instead of heuristic split. Recommended for production deployments.</span>
      </div>
      
      <div v-if="localEnv.useFlip49" class="flip49-settings">
        <div class="form-group">
          <label>Deployment Type</label>
          <select 
            v-model="localEnv.deploymentType"
            @change="updateEnvironment"
          >
            <option value="standalone">Standalone</option>
            <option value="kubernetes">Kubernetes</option>
            <option value="docker">Docker</option>
            <option value="yarn">YARN</option>
          </select>
          <span class="help-text">Deployment environment. Affects heap cutoff constraints and memory safety margins.</span>
        </div>
        
        <div class="form-group">
          <label>Network Memory Fraction</label>
          <input 
            type="number" 
            v-model.number="localEnv.flip49NetworkFraction"
            @change="updateEnvironment"
            min="0.05"
            max="0.25"
            step="0.01"
          />
          <span class="help-text">Fraction of Flink memory for network buffers. Default: 0.1 (10%). Range: 5-25%.</span>
        </div>
        
        <div class="form-group">
          <label>Managed Memory Fraction</label>
          <input 
            type="number" 
            v-model.number="localEnv.flip49ManagedFraction"
            @change="updateEnvironment"
            min="0.2"
            max="0.8"
            step="0.01"
          />
          <span class="help-text">Fraction of Flink memory for RocksDB state. Default: 0.4 (40%). Increase for large states, decrease for heap-heavy workloads.</span>
        </div>
        
        <div class="form-group">
          <label>Network Memory Min/Max (MiB)</label>
          <div class="range-inputs">
            <input 
              type="number" 
              v-model.number="localEnv.flip49NetworkMemoryMin"
              @change="updateEnvironment"
              min="32"
              placeholder="Min"
            />
            <span class="range-separator">to</span>
            <input 
              type="number" 
              v-model.number="localEnv.flip49NetworkMemoryMax"
              @change="updateEnvironment"
              max="2048"
              placeholder="Max"
            />
          </div>
          <span class="help-text">Absolute bounds for network memory. Default: 64-1024 MiB. Clamps fractional calculation.</span>
        </div>
        
        <div class="form-group">
          <label>Overhead Memory Min/Max (MiB)</label>
          <div class="range-inputs">
            <input 
              type="number" 
              v-model.number="localEnv.flip49OverheadMemoryMin"
              @change="updateEnvironment"
              min="128"
              placeholder="Min"
            />
            <span class="range-separator">to</span>
            <input 
              type="number" 
              v-model.number="localEnv.flip49OverheadMemoryMax"
              @change="updateEnvironment"
              max="1024"
              placeholder="Max"
            />
          </div>
          <span class="help-text">JVM overhead bounds (GC, metaspace, etc.). Default: 192-768 MiB.</span>
        </div>
        
        <div class="form-group">
          <label>Metaspace Size (MiB)</label>
          <input 
            type="number" 
            v-model.number="localEnv.flip49MetaspaceSize"
            @change="updateEnvironment"
            min="64"
            max="256"
          />
          <span class="help-text">JVM metaspace allocation. Default: 96 MiB.</span>
        </div>
        
        <div class="form-group">
          <label>Direct Memory Cap (MiB)</label>
          <input 
            type="number" 
            v-model.number="localEnv.flip49DirectMemoryCap"
            @change="updateEnvironment"
            min="256"
            max="1024"
          />
          <span class="help-text">Max direct memory for off-heap structures. Default: 512 MiB.</span>
        </div>
        
        <div v-if="isContainerized" class="form-group">
          <label>Heap Cutoff Min (MiB)</label>
          <input 
            type="number" 
            v-model.number="localEnv.flip49HeapCutoffMin"
            @change="updateEnvironment"
            min="512"
            max="2048"
          />
          <span class="help-text">Minimum heap for containerized deployments. Default: 1024 MiB.</span>
        </div>
        
        <div v-if="isContainerized" class="form-group">
          <label>Heap Cutoff Ratio</label>
          <input 
            type="number" 
            v-model.number="localEnv.flip49HeapCutoffRatio"
            @change="updateEnvironment"
            min="0.5"
            max="0.95"
            step="0.05"
          />
          <span class="help-text">Max heap as ratio of process memory. Default: 0.8 (80%). Prevents OOM in containers.</span>
        </div>
        
        <div class="flip49-info">
          <strong>ℹ️ FLIP-49 Calculator Enabled</strong>
          <p>Memory will be split using FLIP-49 unified configuration rules. Results will include Flink configuration snippet.</p>
        </div>
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

const isContainerized = computed(() => {
  return ['kubernetes', 'docker'].includes(localEnv.value.deploymentType);
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

.flip49-settings {
  background: #fafafa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-inputs input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.range-separator {
  color: #7f8c8d;
  font-weight: 500;
}

.flip49-info {
  margin-top: 12px;
  padding: 12px;
  background: #fff9e6;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  font-size: 14px;
  color: #8b6914;
}

.flip49-info p {
  margin: 4px 0 0 0;
  font-size: 13px;
}
</style>
