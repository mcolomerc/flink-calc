<template>
  <div class="topology-builder">
    <div class="builder-header">
      <h2>Topology Builder</h2>
      <div class="actions">
        <button @click="addNewOperator" class="btn-primary">Add Operator</button>
        <button @click="loadSample" class="btn-secondary">Load Sample</button>
        <button @click="clearAll" class="btn-danger">Clear All</button>
        <button @click="exportTopology" class="btn-secondary">Export Topology</button>
        <button @click="triggerImport" class="btn-secondary">Import Topology</button>
        <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="onImportFile" />
      </div>
    </div>
    
    <div class="builder-content">
      <div class="operators-list">
        <h3>Operators ({{ operators.length }})</h3>
        
        <div v-if="operators.length === 0" class="empty-state">
          <p>No operators yet. Add one to get started!</p>
        </div>
        
        <div 
          v-for="op in operators" 
          :key="op.id"
          :class="['operator-item', { selected: selectedOperatorId === op.id }]"
          @click="selectOperator(op.id)"
        >
          <div class="operator-header">
            <span class="operator-name">{{ op.name }}</span>
            <span :class="['operator-type', op.type]">{{ op.type }}</span>
          </div>
          <div class="operator-meta">
            <span v-if="op.stateful" class="badge stateful">Stateful</span>
            <span :class="['badge', 'cost-' + op.costClass]">{{ op.costClass }}</span>
            <span class="ratio">×{{ op.inputRatio }}</span>
          </div>
          <button @click.stop="deleteOperator(op.id)" class="btn-delete">×</button>
        </div>
      </div>
      
      <div class="operator-editor" v-if="selectedOperator">
        <OperatorForm :operator="selectedOperator" />
      </div>
    </div>
    
    <div class="edges-section" v-if="operators.length > 1">
      <h3>Connections</h3>
      <div class="edge-builder">
        <select v-model="newEdge.from">
          <option value="">From...</option>
          <option v-for="op in operators" :key="op.id" :value="op.id">
            {{ op.name }}
          </option>
        </select>
        <span>→</span>
        <select v-model="newEdge.to">
          <option value="">To...</option>
          <option v-for="op in operators" :key="op.id" :value="op.id">
            {{ op.name }}
          </option>
        </select>
        <button @click="addEdge" :disabled="!newEdge.from || !newEdge.to" class="btn-secondary">
          Add Edge
        </button>
      </div>
      
      <div class="edges-list">
        <div v-for="(edge, idx) in edges" :key="idx" class="edge-item">
          <span>{{ getOperatorName(edge.from) }}</span>
          <span>→</span>
          <span>{{ getOperatorName(edge.to) }}</span>
          <button @click="deleteEdge(edge)" class="btn-delete">×</button>
        </div>
      </div>
    </div>
    
    <!-- DAG Diagram -->
    <DAGCanvas v-if="operators.length > 0" />
    <!-- Feedback / Confirm Modal -->
    <Modal v-model:show="modalShow" :title="modalTitle" :message="modalMessage" :showOk="!showConfirm">
      <template #footer>
        <div v-if="showConfirm" class="footer-actions">
          <button class="btn-secondary" @click="modalShow = false">Cancel</button>
          <button class="btn-danger" @click="performConfirmAction">Confirm</button>
        </div>
        <button v-else class="btn" @click="modalShow = false">OK</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGraphStore } from '@/stores/graph';
import OperatorForm from './OperatorForm.vue';
import DAGCanvas from './DAGCanvas.vue';
import Modal from './Modal.vue';

const graphStore = useGraphStore();

const operators = computed(() => graphStore.operators);
const edges = computed(() => graphStore.edges);
const selectedOperatorId = computed(() => graphStore.selectedOperatorId);
const selectedOperator = computed(() => graphStore.selectedOperator);

const newEdge = ref({ from: '', to: '' });

const addNewOperator = () => {
  graphStore.addOperator({
    name: `Operator ${operators.value.length + 1}`,
    type: 'map_filter',
    stateful: false,
    costClass: 'medium'
  });
};

const selectOperator = (id) => {
  graphStore.selectOperator(id);
};

const deleteOperator = (id) => {
  modalTitle.value = 'Delete Operator';
  modalMessage.value = 'Delete this operator?';
  showConfirm.value = true;
  confirmAction.value = () => graphStore.deleteOperator(id);
  modalShow.value = true;
};

const addEdge = () => {
  if (newEdge.value.from && newEdge.value.to) {
    graphStore.addEdge(newEdge.value.from, newEdge.value.to);
    newEdge.value = { from: '', to: '' };
  }
};

const deleteEdge = (edge) => {
  graphStore.deleteEdge(edge.from, edge.to);
};

const getOperatorName = (id) => {
  const op = operators.value.find(o => o.id === id);
  return op ? op.name : id;
};

const loadSample = () => {
  if (operators.value.length > 0) {
    modalTitle.value = 'Load Sample Topology';
    modalMessage.value = 'This will replace your current topology. Continue?';
    showConfirm.value = true;
    confirmAction.value = () => graphStore.loadSampleTopology();
    modalShow.value = true;
  } else {
    graphStore.loadSampleTopology();
  }
};

const clearAll = () => {
  modalTitle.value = 'Clear Topology';
  modalMessage.value = 'Clear all operators and edges?';
  showConfirm.value = true;
  confirmAction.value = () => graphStore.reset();
  modalShow.value = true;
};

// Export / Import Topology
const fileInput = ref(null);
const modalShow = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const showConfirm = ref(false);
const confirmAction = ref(null);

const exportTopology = () => {
  const data = graphStore.exportTopology();
  const blob = new Blob([JSON.stringify({ topology: data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flink-topology.json';
  a.click();
  URL.revokeObjectURL(url);
};

const triggerImport = () => {
  fileInput.value?.click();
};

const performConfirmAction = () => {
  if (confirmAction.value) {
    confirmAction.value();
    confirmAction.value = null;
  }
  showConfirm.value = false;
  modalShow.value = false;
};

const onImportFile = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const report = graphStore.loadTopology(json);
    if (!report.ok) {
      const msg = [
        'Failed to import topology due to the following errors:',
        ...report.errors.map(e => `• ${e}`)
      ].join('\n');
      modalTitle.value = 'Import Failed';
      modalMessage.value = msg;
      showConfirm.value = false;
      modalShow.value = true;
      return;
    }
    if (report.warnings && report.warnings.length) {
      const w = [
        'Imported with warnings:',
        ...report.warnings.slice(0, 10).map(e => `• ${e}`),
        report.warnings.length > 10 ? `• ...and ${report.warnings.length - 10} more` : ''
      ].filter(Boolean).join('\n');
      console.warn(w);
      modalTitle.value = 'Import Warnings';
      modalMessage.value = w;
      showConfirm.value = false;
      modalShow.value = true;
    }
  } catch (e) {
    console.error(e);
    modalTitle.value = 'Invalid JSON';
    modalMessage.value = 'The selected file is not a valid JSON.';
    showConfirm.value = false;
    modalShow.value = true;
  } finally {
    event.target.value = '';
  }
};
</script>

<style scoped>
.topology-builder {
  padding: 20px;
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.builder-header h2 {
  margin: 0;
  color: #2c3e50;
}

.actions {
  display: flex;
  gap: 10px;
}

.builder-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.operators-list {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.operators-list h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #34495e;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.operator-item {
  background: white;
  padding: 12px;
  padding-right: 40px;
  margin-bottom: 10px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.operator-item:hover {
  border-color: #3498db;
}

.operator-item.selected {
  border-color: #2980b9;
  background: #ebf5fb;
}

.operator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.operator-name {
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-type {
  font-size: 11px;
  padding: 2px 8px;
  background: #ecf0f1;
  border-radius: 3px;
  text-transform: uppercase;
  font-weight: 500;
  flex-shrink: 0;
}

.operator-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
}

.badge.stateful {
  background: #e8f8f5;
  color: #16a085;
}

.badge.cost-low {
  background: #d5f4e6;
  color: #27ae60;
}

.badge.cost-medium {
  background: #fef5e7;
  color: #f39c12;
}

.badge.cost-high {
  background: #fadbd8;
  color: #e74c3c;
}

.ratio {
  color: #7f8c8d;
}

.btn-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
}

.btn-delete:hover {
  background: #c0392b;
}

.operator-editor {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  max-height: 600px;
  overflow-y: auto;
}

.edges-section {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.edges-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #34495e;
}

.edge-builder {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}

.edge-builder select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.edges-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edge-item {
  background: white;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  gap: 10px;
  align-items: center;
  position: relative;
}

.edge-item span {
  color: #555;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 8px 16px;
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

.btn-secondary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.footer-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
