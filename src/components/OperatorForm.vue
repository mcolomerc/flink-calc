<template>
  <div class="operator-form">
    <h3>Edit Operator</h3>
    
    <div class="form-group">
      <label>Name</label>
      <input type="text" v-model="localOp.name" @change="save" />
      <span class="help-text">Descriptive name for this operator in your topology.</span>
    </div>
    
    <div class="form-group">
      <label>Type</label>
      <select v-model="localOp.type" @change="save">
        <option value="source">Source</option>
        <option value="map_filter">Map/Filter</option>
        <option value="flatmap">FlatMap</option>
        <option value="keyby">KeyBy</option>
        <option value="window_agg">Window Aggregation</option>
        <option value="interval_join">Interval Join</option>
        <option value="temporal_join">Temporal Join</option>
        <option value="async_io">Async I/O</option>
        <option value="sink">Sink</option>
      </select>
      <span class="help-text">Operator category. Affects default capacity estimates.</span>
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="localOp.stateful" @change="save" />
        Stateful
      </label>
      <span class="help-text">Check if this operator maintains state (e.g., aggregations, windows, joins).</span>
    </div>
    
    <div class="form-group">
      <label>Input Ratio (α)</label>
      <input type="number" step="0.1" v-model.number="localOp.inputRatio" @change="save" />
      <span class="help-text">Output/input ratio. &lt;1 for filters (reduces records), &gt;1 for flatMap (expands records), =1 for 1:1 transforms.</span>
    </div>
    
    <div class="form-group">
      <label>Cost Class</label>
      <select v-model="localOp.costClass" @change="save">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <span class="help-text">Processing complexity. Low: simple transforms. High: complex computations or external lookups.</span>
    </div>
    
    <div class="form-group">
      <label>User Capacity Override (rec/s/task)</label>
      <input 
        type="number" 
        v-model.number="localOp.userCapacityOverride" 
        @change="save"
        placeholder="Leave empty for auto"
      />
      <span class="help-text">Manually specify capacity if you have benchmark data. Otherwise, leave empty for automatic estimation.</span>
    </div>
    
    <div v-if="localOp.stateful" class="state-section">
      <h4>State Configuration</h4>
      
      <div class="form-group">
        <label>Key Cardinality</label>
        <input type="number" v-model.number="localOp.keys" @change="save" />
        <span class="help-text">Number of unique keys. e.g., 1M for user IDs, 100K for session IDs. Used to estimate state size.</span>
      </div>
      
      <div class="form-group">
        <label>Bytes per Key</label>
        <input type="number" v-model.number="localOp.bytesPerKey" @change="save" />
        <span class="help-text">Average state size per key in bytes. Consider your aggregate data structure size.</span>
      </div>
      
      <div class="form-group">
        <label>Window Size (seconds)</label>
        <input type="number" v-model.number="localOp.windowSizeSec" @change="save" />
        <span class="help-text">For windowed operations. Duration of the window (e.g., 300 for 5-minute windows).</span>
      </div>
      
      <div class="form-group">
        <label>TTL (seconds)</label>
        <input type="number" v-model.number="localOp.ttlSec" @change="save" />
        <span class="help-text">Time-to-live for state entries. How long to retain inactive keys before cleanup.</span>
      </div>
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="localOp.keyBy" @change="save" />
        KeyBy (potential skew)
      </label>
      <span class="help-text">Check if data is partitioned by key. May reduce capacity estimate due to potential key skew.</span>
    </div>
    
    <div class="form-group">
      <label>Repartition Strategy</label>
      <select v-model="localOp.repartition" @change="save">
        <option value="hash">Hash</option>
        <option value="rebalance">Rebalance</option>
        <option value="broadcast">Broadcast</option>
      </select>
      <span class="help-text">Hash: partition by key. Rebalance: round-robin distribution. Broadcast: send to all subtasks.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGraphStore } from '@/stores/graph';

const props = defineProps({
  operator: {
    type: Object,
    required: true
  }
});

const graphStore = useGraphStore();
const localOp = ref({ ...props.operator });

const save = () => {
  graphStore.updateOperator(localOp.value.id, localOp.value);
};

watch(() => props.operator, (newOp) => {
  localOp.value = { ...newOp };
}, { deep: true });
</script>

<style scoped>
.operator-form {
  max-width: 100%;
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
}

h4 {
  margin-top: 20px;
  margin-bottom: 15px;
  color: #34495e;
  font-size: 1em;
}

.state-section {
  background: #fff;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
  border: 1px solid #e0e0e0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input[type="checkbox"] {
  margin-right: 8px;
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
