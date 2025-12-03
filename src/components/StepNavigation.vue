<template>
  <div class="step-navigation">
    <button 
      v-if="prevRoute" 
      @click="goTo(prevRoute)" 
      class="nav-btn nav-btn-prev"
    >
      ← {{ prevLabel }}
    </button>
    <div v-else></div>
    
    <button 
      v-if="nextRoute && canNavigateNext" 
      @click="goTo(nextRoute)" 
      class="nav-btn nav-btn-next"
    >
      {{ nextLabel }} →
    </button>
    <button 
      v-else-if="nextRoute && !canNavigateNext"
      class="nav-btn nav-btn-next nav-btn-disabled"
      :title="disabledMessage"
      disabled
    >
      {{ nextLabel }} →
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useGraphStore } from '@/stores/graph';

const router = useRouter();
const route = useRoute();
const graphStore = useGraphStore();

const steps = [
  { path: '/workload', label: 'Workload' },
  { path: '/environment', label: 'Environment' },
  { path: '/topology', label: 'Topology' },
  { path: '/results', label: 'Results', requiresTopology: true }
];

const currentIndex = steps.findIndex(s => s.path === route.path);
const prevRoute = currentIndex > 0 ? steps[currentIndex - 1].path : null;
const nextRoute = currentIndex < steps.length - 1 ? steps[currentIndex + 1].path : null;
const prevLabel = currentIndex > 0 ? steps[currentIndex - 1].label : '';
const nextLabel = currentIndex < steps.length - 1 ? steps[currentIndex + 1].label : '';

const canNavigateNext = computed(() => {
  if (!nextRoute) return false;
  
  const nextStep = steps[currentIndex + 1];
  if (nextStep?.requiresTopology) {
    return graphStore.hasOperators;
  }
  
  return true;
});

const disabledMessage = computed(() => {
  const nextStep = steps[currentIndex + 1];
  if (nextStep?.requiresTopology && !graphStore.hasOperators) {
    return 'Add at least one operator to the topology before viewing results';
  }
  return '';
});

const goTo = (path) => {
  router.push(path);
  window.scrollTo(0, 0);
};
</script>

<style scoped>
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px solid #e0e0e0;
}

.nav-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn-prev {
  background: #95a5a6;
  color: white;
}

.nav-btn-prev:hover {
  background: #7f8c8d;
  transform: translateX(-4px);
}

.nav-btn-next {
  background: #3498db;
  color: white;
}

.nav-btn-next:hover {
  background: #2980b9;
  transform: translateX(4px);
}

.nav-btn:active {
  transform: scale(0.98);
}

.nav-btn-disabled {
  background: #bdc3c7;
  color: #7f8c8d;
  cursor: not-allowed;
}

.nav-btn-disabled:hover {
  background: #bdc3c7;
  transform: none;
}

@media (max-width: 768px) {
  .nav-btn {
    padding: 10px 18px;
    font-size: 14px;
  }
}
</style>
