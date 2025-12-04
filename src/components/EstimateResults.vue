<template>
  <div class="results-view">
    <div class="results-header">
      <h2>Estimation Results</h2>
      <button @click="compute" class="btn-primary">Recalculate</button>
    </div>
    
    <div v-if="!hasResult" class="empty-state">
      <p>Calculating your infrastructure estimate...</p>
    </div>
    
    <div v-else class="results-content">
      <!-- Confidence Badge -->
      <div :class="['confidence-badge', confidenceLevel]">
        <span class="label">Confidence:</span>
        <span class="value">{{ (confidence * 100).toFixed(0) }}%</span>
        <span class="level">({{ confidenceLevel }})</span>
      </div>
      
      <!-- Bill of Materials -->
      <div class="bom-section">
        <h3>Bill of Materials</h3>
        
        <div class="bom-cards">
          <div class="bom-card">
            <div class="card-title">Task Managers</div>
            <div class="card-value">{{ result.taskManagers.count }}</div>
            <div class="card-details">
              <div>{{ result.taskManagers.coresEach }} cores each</div>
              <div>{{ result.taskManagers.processMemoryGiBEach }} GiB memory each</div>
              <div>{{ result.taskManagers.slotsEach }} slots each</div>
            </div>
          </div>
          
          <div class="bom-card">
            <div class="card-title">Job Manager</div>
            <div class="card-value">{{ result.jobManager.count }}</div>
            <div class="card-details">
              <div>{{ result.jobManager.cores }} core</div>
              <div>{{ result.jobManager.processMemoryGiB }} GiB memory</div>
            </div>
          </div>
          
          <div class="bom-card totals">
            <div class="card-title">Total Resources</div>
            <div class="card-value">{{ result.totals.cores }} cores</div>
            <div class="card-details">
              <div>{{ result.totals.memoryGiB }} GiB total memory</div>
              <div>{{ result.totals.slots }} total slots</div>
            </div>
          </div>
        </div>
        
        <!-- Memory Split -->
        <div class="memory-split">
          <h4>Task Manager Memory Split</h4>
          <div class="memory-bars">
            <div class="memory-bar">
              <div 
                class="bar-segment heap" 
                :style="{ width: getPercentage('heap') + '%' }"
              >
                <span v-if="getPercentage('heap') > 10">Heap: {{ result.taskManagers.memorySplitEach.heap }}G</span>
              </div>
              <div 
                class="bar-segment managed" 
                :style="{ width: getPercentage('managed') + '%' }"
              >
                <span v-if="getPercentage('managed') > 10">Managed: {{ result.taskManagers.memorySplitEach.managed }}G</span>
              </div>
              <div 
                class="bar-segment network" 
                :style="{ width: getPercentage('network') + '%' }"
              >
                <span v-if="getPercentage('network') > 10">Network: {{ result.taskManagers.memorySplitEach.network }}G</span>
              </div>
              <div 
                class="bar-segment overhead" 
                :style="{ width: getPercentage('overhead') + '%' }"
              >
                <span v-if="getPercentage('overhead') > 10">Overhead: {{ result.taskManagers.memorySplitEach.overhead }}G</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Operator Details Table -->
      <div class="operators-table">
        <h3>Operator Parallelism</h3>
        <table>
          <thead>
            <tr>
              <th>Operator</th>
              <th>Type</th>
              <th>Input Rate<br/>(rec/s)</th>
              <th>Capacity<br/>(rec/s/task)</th>
              <th>Parallelism</th>
              <th>Stateful</th>
              <th>State/Task<br/>(GiB)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="op in result.operatorDetails" :key="op.id">
              <td class="operator-name">{{ op.name }}</td>
              <td>
                <span class="type-badge">{{ op.type }}</span>
              </td>
              <td class="number">{{ formatNumber(op.inputRate) }}</td>
              <td class="number">{{ formatNumber(op.capacity) }}</td>
              <td class="number parallelism">{{ op.parallelism }}</td>
              <td>
                <span v-if="op.stateful" class="badge stateful">Yes</span>
                <span v-else class="badge">No</span>
              </td>
              <td class="number">{{ op.statePerSubtaskGiB || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- DAG Visualization -->
      <div class="dag-visualization">
        <DAGCanvas />
      </div>
      
      <!-- Warnings -->
      <div v-if="result.warnings.length > 0" class="warnings-section">
        <h3>Warnings & Recommendations</h3>
        <div 
          v-for="(warning, idx) in result.warnings" 
          :key="idx"
          :class="['warning-item', warning.type]"
        >
          <strong>{{ warning.operator }}:</strong> {{ warning.message }}
        </div>
      </div>
      
      <!-- Conservative Estimate -->
      <div v-if="conservativeResult" class="conservative-section">
        <h3>Conservative Estimate (+50% headroom)</h3>
        <div class="conservative-summary">
          <div>Task Managers: <strong>{{ conservativeResult.taskManagers.count }}</strong></div>
          <div>Total Cores: <strong>{{ conservativeResult.totals.cores }}</strong></div>
          <div>Total Memory: <strong>{{ conservativeResult.totals.memoryGiB }} GiB</strong></div>
        </div>
      </div>
      
      <!-- Guidelines Section -->
      <div class="guidelines-section">
        <h3>💡 How to Improve Accuracy</h3>
        <div class="guidelines-grid">
          <div class="guideline-card">
            <div class="guideline-icon">🎯</div>
            <div class="guideline-content">
              <h4>Add Capacity Overrides</h4>
              <p>Benchmark your operators and enter actual throughput (rec/s/task) in the operator form. Each override adds <strong>+6% confidence</strong>.</p>
            </div>
          </div>
          
          <div class="guideline-card">
            <div class="guideline-icon">📊</div>
            <div class="guideline-content">
              <h4>Use Peak Rates from Metrics</h4>
              <p>Set peak rate based on monitoring data during traffic spikes. Check Kafka lag during peak hours to calculate realistic input rates.</p>
            </div>
          </div>
          
          <div class="guideline-card">
            <div class="guideline-icon">💾</div>
            <div class="guideline-content">
              <h4>Configure State Accurately</h4>
              <p>For stateful operators, measure actual state size: count distinct keys and calculate bytes per key from your data structures.</p>
            </div>
          </div>
          
          <div class="guideline-card">
            <div class="guideline-icon">⚡</div>
            <div class="guideline-content">
              <h4>Set Cost Class Correctly</h4>
              <p><strong>Low:</strong> simple transforms. <strong>Medium:</strong> aggregations, parsing. <strong>High:</strong> ML inference, external lookups, crypto.</p>
            </div>
          </div>
          
          <div class="guideline-card">
            <div class="guideline-icon">🔄</div>
            <div class="guideline-content">
              <h4>Flag KeyBy for Skewed Data</h4>
              <p>Enable "KeyBy" flag if keys are unevenly distributed (hot keys). Applies a 20% capacity reduction for safety.</p>
            </div>
          </div>
          
          <div class="guideline-card">
            <div class="guideline-icon">✅</div>
            <div class="guideline-content">
              <h4>Validate Post-Deployment</h4>
              <p>After deploying, monitor CPU utilization (target: 60-80%), backpressure, and actual parallelism. Feed findings back to improve estimates.</p>
            </div>
          </div>
        </div>
        
        <div class="confidence-explanation">
          <strong>About Confidence Score:</strong>
          <ul>
            <li><strong>Base: 65%</strong> - Built-in heuristics for default operator capacities</li>
            <li><strong>Bonus: up to +25%</strong> - Added when you provide capacity overrides based on benchmarks</li>
            <li><strong>Max: 95%</strong> - Always leaves room for unexpected variability</li>
          </ul>
          <p class="tip"><strong>💡 Tip:</strong> Start with {{ confidenceLevel }} confidence, then iterate with real metrics to reach 85%+ (high confidence).</p>
        </div>
      </div>
      
      <!-- Export Actions -->
      <div class="export-section">
        <h3>Export</h3>
        <div class="export-buttons">
          <button @click="exportJSON" class="btn-secondary">
            Download JSON
          </button>
          <button @click="exportCSV" class="btn-secondary">
            Download CSV
          </button>
          <button @click="exportConfig" class="btn-secondary">
            Export Flink Config
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useEstimateStore } from '@/stores/estimate';
import DAGCanvas from './DAGCanvas.vue';

const estimateStore = useEstimateStore();

const hasResult = computed(() => estimateStore.hasResult);
const result = computed(() => estimateStore.result);
const conservativeResult = computed(() => estimateStore.conservativeResult);
const confidence = computed(() => estimateStore.confidence);
const confidenceLevel = computed(() => estimateStore.confidenceLevel);

// Automatically compute results when component is mounted
onMounted(() => {
  estimateStore.compute();
});

const compute = () => {
  estimateStore.compute();
};

const getPercentage = (key) => {
  if (!result.value) return 0;
  const split = result.value.taskManagers.memorySplitEach;
  return (split[key] / split.total) * 100;
};

const formatNumber = (num) => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
};

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportJSON = () => {
  const data = estimateStore.exportToJSON();
  downloadFile(JSON.stringify(data, null, 2), 'flink-estimate.json', 'application/json');
};

const exportCSV = () => {
  const csv = estimateStore.exportToCSV();
  downloadFile(csv, 'flink-estimate.csv', 'text/csv');
};

const exportConfig = () => {
  const config = estimateStore.exportFlinkConfig();
  downloadFile(config, 'flink-conf.yaml', 'text/plain');
};
</script>

<style scoped>
.results-view {
  padding: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-header h2 {
  margin: 0;
  color: #2c3e50;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  font-size: 16px;
}

.results-content {
  max-width: 1200px;
}

.confidence-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
}

.confidence-badge.high {
  background: #d5f4e6;
  color: #27ae60;
}

.confidence-badge.medium {
  background: #fef5e7;
  color: #f39c12;
}

.confidence-badge.low {
  background: #fadbd8;
  color: #e74c3c;
}

.confidence-badge .value {
  font-size: 18px;
  font-weight: 600;
}

.bom-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.bom-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
}

.bom-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.bom-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.bom-card.totals {
  border-color: #3498db;
  background: #ebf5fb;
}

.card-title {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 10px;
  text-transform: uppercase;
  font-weight: 500;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 10px;
}

.card-details {
  font-size: 13px;
  color: #555;
}

.card-details div {
  margin-bottom: 4px;
}

.memory-split {
  margin-top: 20px;
}

.memory-split h4 {
  margin-bottom: 10px;
  color: #34495e;
}

.memory-bars {
  background: white;
  padding: 15px;
  border-radius: 6px;
}

.memory-bar {
  display: flex;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
}

.bar-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s;
}

.bar-segment.heap {
  background: #3498db;
}

.bar-segment.managed {
  background: #2ecc71;
}

.bar-segment.network {
  background: #f39c12;
}

.bar-segment.overhead {
  background: #95a5a6;
}

.operators-table {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  overflow-x: auto;
}

.operators-table h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

table {
  width: 100%;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border-collapse: collapse;
}

thead {
  background: #34495e;
  color: white;
}

th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
}

td {
  padding: 12px;
  border-bottom: 1px solid #ecf0f1;
}

tbody tr:hover {
  background: #f8f9fa;
}

.operator-name {
  font-weight: 500;
  color: #2c3e50;
}

.type-badge {
  font-size: 11px;
  padding: 4px 8px;
  background: #ecf0f1;
  border-radius: 3px;
  text-transform: uppercase;
}

.number {
  text-align: right;
  font-family: 'Courier New', monospace;
}

.parallelism {
  font-weight: 600;
  color: #2980b9;
  font-size: 16px;
}

.badge {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.badge.stateful {
  background: #e8f8f5;
  color: #16a085;
}

.dag-visualization {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.dag-visualization :deep(.dag-canvas) {
  margin: 0;
}

.dag-visualization :deep(.canvas-controls) {
  display: none; /* Hide interactive controls in results view */
}

.warnings-section {
  background: #fef5e7;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border-left: 4px solid #f39c12;
}

.warnings-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.warning-item {
  padding: 12px;
  margin-bottom: 10px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #f39c12;
}

.warning-item.error {
  border-left-color: #e74c3c;
  background: #fadbd8;
}

.conservative-section {
  background: #ebf5fb;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border-left: 4px solid #3498db;
}

.conservative-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.conservative-summary {
  display: flex;
  gap: 30px;
  font-size: 15px;
}

.conservative-summary strong {
  color: #2980b9;
}

.export-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.export-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.export-buttons {
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.guidelines-section {
  background: #f0f8ff;
  padding: 25px;
  border-radius: 8px;
  margin-bottom: 30px;
  border-left: 4px solid #3498db;
}

.guidelines-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 20px;
}

.guidelines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.guideline-card {
  background: white;
  padding: 16px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.guideline-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.guideline-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.guideline-content h4 {
  margin: 0 0 6px 0;
  color: #2c3e50;
  font-size: 15px;
}

.guideline-content p {
  margin: 0;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.confidence-explanation {
  background: white;
  padding: 18px;
  border-radius: 6px;
  border: 1px solid #d4e6f1;
}

.confidence-explanation strong {
  color: #2c3e50;
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
}

.confidence-explanation ul {
  margin: 10px 0;
  padding-left: 20px;
}

.confidence-explanation li {
  margin-bottom: 6px;
  font-size: 13px;
  color: #555;
}

.confidence-explanation .tip {
  margin: 12px 0 0 0;
  padding: 10px;
  background: #fef9e7;
  border-left: 3px solid #f39c12;
  border-radius: 4px;
  font-size: 13px;
}
</style>
