<template>
  <div class="checkpoint-io-section">
    <h3>Checkpoint I/O Analysis</h3>
    
    <!-- No Stateful Operators Message -->
    <div v-if="!hasStatefulOperators" class="no-stateful-ops">
      <p>ℹ️ No stateful operators detected in topology.</p>
      <p>Checkpoint I/O analysis applies only to jobs with stateful operators (windows, joins, or operators with state).</p>
      <p>To see checkpoint analysis, add a stateful operator to your topology.</p>
    </div>
    
    <!-- Stateful Operators Found But Not Configured -->
    <div v-else-if="hasStatefulOperators && !anyStatefulOperatorConfigured" class="unconfigured-state">
      <p>⚠️ Stateful operators detected but state configuration is incomplete.</p>
      <p>To calculate checkpoint I/O analysis, configure state for stateful operators:</p>
      <ul>
        <li v-for="op in checkpointIO?.statefulOperators" :key="op.id">
          <strong>{{ op.name }}</strong> - Set Keys and Bytes per Key
        </li>
      </ul>
    </div>
    
    <!-- Checkpoint Analysis (shows only if stateful operators are configured) -->
    <div v-else>
    <!-- Summary Cards -->
      <div class="checkpoint-cards">
      <div class="checkpoint-card">
        <div class="card-title">State Size</div>
        <div class="card-value">{{ checkpointIO?.totalStateGiB?.toFixed(2) ?? 0 }} GiB</div>
        <div class="card-details">
          Total state across all stateful operators
        </div>
      </div>
      
      <div class="checkpoint-card">
        <div class="card-title">Checkpoint Data Volume</div>
        <div class="card-value">{{ checkpointIO?.estimatedCheckpointDataGiB ?? 0 }} GiB</div>
        <div class="card-details">
          <div v-if="checkpointIO?.rocksDbPenalty && checkpointIO.rocksDbPenalty > 0">
            Includes {{ checkpointIO?.rocksDbPenalty?.toFixed(1) }}% RocksDB overhead
          </div>
          <div v-else>
            Heap state backend
          </div>
        </div>
      </div>
      
      <div class="checkpoint-card">
        <div class="card-title">Estimated Duration</div>
        <div class="card-value">{{ checkpointIO?.estimatedCheckpointDurationSec ?? 0 }}s</div>
        <div class="card-details">
          <div v-if="checkpointIO?.estimatedCheckpointThroughputMBps">
            At {{ checkpointIO?.estimatedCheckpointThroughputMBps }} MB/s throughput
          </div>
          <div v-else>
            (Configure storage backend for estimate)
          </div>
        </div>
      </div>
      
      <div class="checkpoint-card">
        <div class="card-title">Required Throughput</div>
        <div class="card-value">{{ checkpointIO?.estimatedCheckpointThroughputMBps || '?' }} MB/s</div>
        <div class="card-details">
          Minimum recommended storage I/O capacity
        </div>
      </div>
    </div>
    
    <!-- Stateful Operators Details -->
    <div v-if="checkpointIO?.statefulOperators?.length > 0" class="stateful-operators">
      <h4>Stateful Operator Breakdown</h4>
      <table class="operators-table">
        <thead>
          <tr>
            <th>Operator</th>
            <th style="text-align: center;">Parallelism</th>
            <th style="text-align: right;">State/Task (GiB)</th>
            <th style="text-align: right;">Total State (GiB)</th>
            <th style="text-align: center;">Backend</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="op in checkpointIO.statefulOperators" :key="op.id">
            <td class="operator-name">{{ op.name }}</td>
            <td class="number" style="text-align: center;">{{ op.parallelism }}</td>
            <td class="number">{{ op.statePerSubtaskGiB?.toFixed(3) }}</td>
            <td class="number total">{{ op.totalStateGiB?.toFixed(3) }}</td>
            <td class="backend" style="text-align: center;">{{ op.stateBackend }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Recommendations -->
    <div class="checkpoint-recommendations">
      <h4>Checkpoint Configuration Recommendations</h4>
      <div class="recommendations-grid">
        <div class="recommendation-card">
          <div class="rec-icon">⏱️</div>
          <div class="rec-content">
            <h5>Minimum Checkpoint Interval</h5>
            <p v-if="minCheckpointInterval">
              <strong>{{ minCheckpointInterval }}s</strong> (at least 2x estimated duration)
            </p>
            <p v-if="checkpointIO.estimatedCheckpointDurationSec > 0">
              Current: {{ envStore.checkpointIntervalSec }}s
              <span 
                v-if="envStore.checkpointIntervalSec < minCheckpointInterval" 
                class="warning-text"
              >
                ⚠️ Too frequent - may cause cascading checkpoints
              </span>
              <span v-else class="success-text">
                ✓ OK
              </span>
            </p>
          </div>
        </div>
        
        <div class="recommendation-card">
          <div class="rec-icon">💾</div>
          <div class="rec-content">
            <h5>Storage Backend</h5>
            <p>
              Recommended: <strong>{{ recommendedBackend }}</strong>
            </p>
            <p class="small-text">
              For {{ (checkpointIO.estimatedCheckpointDataGiB || 0).toFixed(1) }} GiB checkpoints
            </p>
          </div>
        </div>
        
        <div class="recommendation-card">
          <div class="rec-icon">⚙️</div>
          <div class="rec-content">
            <h5>Max Checkpoint Duration</h5>
            <p>
              Recommended: <strong>{{ recommendedMaxDuration }}s</strong>
            </p>
            <p v-if="envStore.maxCheckpointDurationSec < recommendedMaxDuration" class="warning-text">
              ⚠️ Current ({{ envStore.maxCheckpointDurationSec }}s) is too tight
            </p>
            <p v-else class="success-text">
              ✓ Current ({{ envStore.maxCheckpointDurationSec }}s) is adequate
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Warnings -->
    <div v-if="checkpointIO?.warnings?.length > 0" class="checkpoint-warnings">
      <h4>Checkpoint Warnings</h4>
      <div 
        v-for="(warning, idx) in checkpointIO?.warnings" 
        :key="idx"
        :class="['warning-item', warning.type]"
      >
        {{ warning.message }}
      </div>
    </div>
    
    <!-- RocksDB Information -->
    <div v-if="envStore.stateBackend === 'rocksdb'" class="rocksdb-info">
      <h4>RocksDB Checkpoint Considerations</h4>
      <ul class="info-list">
        <li>
          <strong>Write Amplification:</strong> RocksDB produces ~{{ ((checkpointIO?.rocksDbPenalty ?? 0) * 100 / 26).toFixed(0) }}x the state data during checkpointing
        </li>
        <li>
          <strong>Block Cache:</strong> Ensure block cache fits in managed memory ({{ ((checkpointIO?.totalStateGiB ?? 0) * 0.1).toFixed(1) }} GiB recommended)
        </li>
        <li>
          <strong>Compaction:</strong> May pause checkpoint progress; consider tuning <code>compaction_style</code> and <code>level0_slowdown_writes_trigger</code>
        </li>
        <li>
          <strong>Incremental Checkpoints:</strong> Use incremental checkpoints to reduce checkpoint data by 50-90% on subsequent checkpoints
        </li>
        <li>
          <strong>Background Compaction:</strong> Keep enabled but tune for your checkpoint interval
        </li>
      </ul>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { useEnvironmentStore } from '@/stores/environment';
import { useEstimateStore } from '@/stores/estimate';

const props = defineProps({
  checkpointIO: {
    type: Object,
    default: null
  }
});

const envStore = useEnvironmentStore();
const estimateStore = useEstimateStore();

// Access checkpointIO directly from the store
const checkpointIO = computed(() => estimateStore.result?.checkpointIO);

const anyStatefulOperatorConfigured = computed(() => {
  if (!checkpointIO.value?.statefulOperators?.length) return false;
  return checkpointIO.value.statefulOperators.some(op => op.isConfigured);
});

// Explicitly check for stateful operators
const hasStatefulOperators = computed(() => {
  if (!checkpointIO.value) return false;
  
  const statefulOperators = checkpointIO.value.statefulOperators;
  return Array.isArray(statefulOperators) && statefulOperators.length > 0;
});

const minCheckpointInterval = computed(() => {
  if (!checkpointIO.value?.estimatedCheckpointDurationSec) return null;
  return Math.ceil(checkpointIO.value.estimatedCheckpointDurationSec * 2);
});

const recommendedBackend = computed(() => {
  if (!checkpointIO.value?.estimatedCheckpointDataGiB) return 'S3';
  const dataGiB = checkpointIO.value.estimatedCheckpointDataGiB;
  
  if (dataGiB > 500) return 'HDFS or S3 (distributed for scalability)';
  if (dataGiB > 100) return 'HDFS, S3, or NFS';
  return 'Local disk or S3';
});

const recommendedMaxDuration = computed(() => {
  if (!checkpointIO.value?.estimatedCheckpointDurationSec) return 120;
  const duration = checkpointIO.value.estimatedCheckpointDurationSec;
  // Recommend max checkpoint duration = 0.5x checkpoint interval
  const interval = envStore.checkpointIntervalSec;
  const recommended = Math.ceil(interval * 0.5);
  
  // But at least 1.5x estimated duration
  return Math.max(recommended, Math.ceil(duration * 1.5));
});
</script>

<style scoped>
.checkpoint-io-section {
  background: #fafbfc;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  padding: 24px;
  margin: 24px 0;
}

.checkpoint-io-section h3 {
  font-size: 20px;
  font-weight: 600;
  color: #24292e;
  margin: 0 0 20px 0;
}

.checkpoint-io-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #24292e;
  margin: 20px 0 12px 0;
}

.no-stateful-ops {
  background: #f0f8ff;
  border: 1px solid #87ceeb;
  border-left: 4px solid #0366d6;
  border-radius: 6px;
  padding: 16px;
  color: #0366d6;
  line-height: 1.6;
}

.no-stateful-ops p {
  margin: 8px 0;
  font-size: 14px;
}

.no-stateful-ops p:first-child {
  margin-top: 0;
}

.no-stateful-ops p:last-child {
  margin-bottom: 0;
}

.unconfigured-state {
  background: #fffbea;
  border: 1px solid #ffa500;
  border-left: 4px solid #ff9800;
  border-radius: 6px;
  padding: 16px;
  color: #996600;
  line-height: 1.6;
}

.unconfigured-state p {
  margin: 8px 0;
  font-size: 14px;
}

.unconfigured-state p:first-child {
  margin-top: 0;
  font-weight: 600;
}

.unconfigured-state ul {
  margin: 12px 0 0 0;
  padding-left: 24px;
  list-style: disc;
}

.unconfigured-state li {
  margin: 6px 0;
  font-size: 13px;
}

.checkpoint-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.checkpoint-card {
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #586069;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #0366d6;
  margin-bottom: 8px;
}

.card-details {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.stateful-operators {
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 6px;
  padding: 16px;
  margin: 20px 0;
  overflow-x: auto;
}

.operators-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.operators-table thead {
  background: #f6f8fa;
  border-bottom: 2px solid #e0e4e8;
}

.operators-table th,
.operators-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e0e4e8;
}

.operators-table th {
  font-weight: 600;
  color: #24292e;
}

.operators-table .number {
  text-align: right;
  font-family: 'Monaco', 'Courier New', monospace;
}

.operators-table .total {
  font-weight: 600;
  color: #0366d6;
}

.operators-table .operator-name {
  font-weight: 500;
}

.operators-table .backend {
  font-size: 12px;
  background: #f6f8fa;
  padding: 4px 8px;
  border-radius: 3px;
}

.checkpoint-recommendations {
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 6px;
  padding: 16px;
  margin: 20px 0;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.recommendation-card {
  background: #f6f8fa;
  border: 1px solid #e0e4e8;
  border-radius: 6px;
  padding: 14px;
  display: flex;
  gap: 12px;
}

.rec-icon {
  font-size: 24px;
  line-height: 1.4;
}

.rec-content h5 {
  font-size: 13px;
  font-weight: 600;
  color: #24292e;
  margin: 0 0 6px 0;
}

.rec-content p {
  font-size: 12px;
  color: #666;
  margin: 4px 0 0 0;
}

.small-text {
  font-size: 11px !important;
  color: #999 !important;
}

.warning-text {
  color: #d73a49;
  font-weight: 500;
}

.success-text {
  color: #28a745;
  font-weight: 500;
}

.checkpoint-warnings {
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 6px;
  padding: 16px;
  margin: 20px 0;
}

.warning-item {
  padding: 12px;
  margin: 8px 0;
  border-left: 4px solid;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.warning-item.error {
  background: #fff5f5;
  border-color: #d73a49;
  color: #d73a49;
}

.warning-item.warning {
  background: #fffbea;
  border-color: #ffa500;
  color: #996600;
}

.warning-item.info {
  background: #f0f8ff;
  border-color: #0366d6;
  color: #0366d6;
}

.rocksdb-info {
  background: #f6f8fa;
  border: 1px solid #e0e4e8;
  border-left: 4px solid #0366d6;
  border-radius: 6px;
  padding: 16px;
  margin-top: 20px;
}

.info-list {
  margin: 12px 0 0 0;
  padding-left: 20px;
  list-style: disc;
}

.info-list li {
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
}

.info-list code {
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #d73a49;
}

@media (max-width: 768px) {
  .checkpoint-cards {
    grid-template-columns: 1fr;
  }
  
  .recommendations-grid {
    grid-template-columns: 1fr;
  }
  
  .operators-table {
    font-size: 12px;
  }
  
  .operators-table th,
  .operators-table td {
    padding: 8px;
  }
}
</style>
