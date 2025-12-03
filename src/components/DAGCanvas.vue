<template>
  <div class="dag-canvas">
    <h3>Topology Diagram</h3>
    
    <div v-if="operators.length === 0" class="empty-state">
      <p>Add operators to see the topology diagram</p>
    </div>
    
    <div v-else class="canvas-container">
      <svg 
        ref="svgRef"
        class="dag-svg"
        :width="canvasWidth"
        :height="canvasHeight"
      >
        <!-- Edges (arrows) -->
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#3498db" />
          </marker>
        </defs>
        
        <g v-for="edge in edges" :key="`${edge.from}-${edge.to}`">
          <line
            :x1="getNodePosition(edge.from).x + nodeWidth / 2"
            :y1="getNodePosition(edge.from).y + nodeHeight"
            :x2="getNodePosition(edge.to).x + nodeWidth / 2"
            :y2="getNodePosition(edge.to).y"
            stroke="#3498db"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
        </g>
        
        <!-- Nodes -->
        <g 
          v-for="op in operators" 
          :key="op.id"
          :transform="`translate(${getNodePosition(op.id).x}, ${getNodePosition(op.id).y})`"
          @mousedown="startDrag(op.id, $event)"
          :class="['dag-node', { selected: selectedOperatorId === op.id }]"
          @click="selectNode(op.id)"
        >
          <rect
            :width="nodeWidth"
            :height="nodeHeight"
            :rx="8"
            :class="['node-rect', { stateful: op.stateful }]"
          />
          
          <text
            :x="nodeWidth / 2"
            :y="25"
            text-anchor="middle"
            class="node-name"
          >
            {{ op.name }}
          </text>
          
          <text
            :x="nodeWidth / 2"
            :y="45"
            text-anchor="middle"
            class="node-type"
          >
            {{ op.type }}
          </text>
          
          <text
            v-if="op.stateful"
            :x="nodeWidth / 2"
            :y="65"
            text-anchor="middle"
            class="node-badge"
          >
            ⚡ Stateful
          </text>
        </g>
      </svg>
      
      <div class="canvas-controls">
        <button @click="autoLayout" class="btn-control">Auto Layout</button>
        <button @click="resetView" class="btn-control">Reset View</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGraphStore } from '@/stores/graph';

const graphStore = useGraphStore();

const operators = computed(() => graphStore.operators);
const edges = computed(() => graphStore.edges);
const selectedOperatorId = computed(() => graphStore.selectedOperatorId);

const svgRef = ref(null);
const nodeWidth = 160;
const nodeHeight = 80;
const canvasWidth = 800;
const canvasHeight = 600;

// Node positions (draggable)
const nodePositions = ref({});

// Dragging state
const dragging = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

// Initialize positions with auto-layout
const initializePositions = () => {
  if (operators.value.length === 0) return;
  
  // Simple layered layout
  const layers = computeLayers();
  const positions = {};
  
  layers.forEach((layer, layerIndex) => {
    const layerY = 50 + layerIndex * 150;
    const layerWidth = layer.length * (nodeWidth + 40);
    const startX = (canvasWidth - layerWidth) / 2;
    
    layer.forEach((opId, index) => {
      positions[opId] = {
        x: startX + index * (nodeWidth + 40),
        y: layerY
      };
    });
  });
  
  nodePositions.value = positions;
};

// Compute layers for hierarchical layout
const computeLayers = () => {
  const layers = [];
  const visited = new Set();
  const inDegree = {};
  
  // Calculate in-degree for each node
  operators.value.forEach(op => {
    inDegree[op.id] = 0;
  });
  
  edges.value.forEach(edge => {
    inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
  });
  
  // Start with nodes that have no incoming edges (sources)
  let currentLayer = operators.value
    .filter(op => inDegree[op.id] === 0)
    .map(op => op.id);
  
  while (currentLayer.length > 0) {
    layers.push([...currentLayer]);
    currentLayer.forEach(id => visited.add(id));
    
    // Find next layer
    const nextLayer = new Set();
    currentLayer.forEach(nodeId => {
      edges.value
        .filter(edge => edge.from === nodeId)
        .forEach(edge => {
          if (!visited.has(edge.to)) {
            nextLayer.add(edge.to);
          }
        });
    });
    
    currentLayer = Array.from(nextLayer);
  }
  
  // Add any remaining nodes (in case of cycles or disconnected nodes)
  const remaining = operators.value
    .filter(op => !visited.has(op.id))
    .map(op => op.id);
  
  if (remaining.length > 0) {
    layers.push(remaining);
  }
  
  return layers;
};

const getNodePosition = (nodeId) => {
  return nodePositions.value[nodeId] || { x: 0, y: 0 };
};

const selectNode = (nodeId) => {
  graphStore.selectOperator(nodeId);
};

const startDrag = (nodeId, event) => {
  event.preventDefault();
  const pos = getNodePosition(nodeId);
  const rect = svgRef.value.getBoundingClientRect();
  
  dragging.value = nodeId;
  dragOffset.value = {
    x: event.clientX - rect.left - pos.x,
    y: event.clientY - rect.top - pos.y
  };
};

const onMouseMove = (event) => {
  if (!dragging.value) return;
  
  const rect = svgRef.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(canvasWidth - nodeWidth, event.clientX - rect.left - dragOffset.value.x));
  const y = Math.max(0, Math.min(canvasHeight - nodeHeight, event.clientY - rect.top - dragOffset.value.y));
  
  nodePositions.value[dragging.value] = { x, y };
};

const onMouseUp = () => {
  dragging.value = null;
};

const autoLayout = () => {
  initializePositions();
};

const resetView = () => {
  initializePositions();
};

// Watch for topology changes
watch(() => operators.value.length, () => {
  initializePositions();
}, { immediate: true });

// Setup mouse event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}
</script>

<style scoped>
.dag-canvas {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.dag-canvas h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #34495e;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.canvas-container {
  position: relative;
}

.dag-svg {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: block;
  margin: 0 auto;
}

.dag-node {
  cursor: move;
  transition: all 0.2s;
}

.dag-node:hover .node-rect {
  stroke: #3498db;
  stroke-width: 3;
}

.dag-node.selected .node-rect {
  stroke: #2980b9;
  stroke-width: 3;
  filter: drop-shadow(0 4px 6px rgba(52, 152, 219, 0.3));
}

.node-rect {
  fill: white;
  stroke: #bdc3c7;
  stroke-width: 2;
}

.node-rect.stateful {
  fill: #e8f8f5;
}

.node-name {
  font-size: 14px;
  font-weight: 600;
  fill: #2c3e50;
  pointer-events: none;
}

.node-type {
  font-size: 11px;
  fill: #7f8c8d;
  text-transform: uppercase;
  pointer-events: none;
}

.node-badge {
  font-size: 10px;
  fill: #16a085;
  font-weight: 500;
  pointer-events: none;
}

.canvas-controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
}

.btn-control {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-control:hover {
  background: #2980b9;
}

@media (max-width: 768px) {
  .dag-svg {
    width: 100%;
    height: auto;
  }
}
</style>
