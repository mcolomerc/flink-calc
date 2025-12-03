<template>
  <div id="app">
    <header class="app-header" v-if="!isHome">
      <div class="header-content">
        <div style="display: flex; align-items: center; gap: 18px;">
          <router-link :to="{ name: 'Home' }" style="display: flex; align-items: center; text-decoration: none;">
            <img src="/flink-logo.svg" alt="Flink Logo" style="height: 60px; width: auto; cursor: pointer;" />
          </router-link>
          <div>
            <h1>Estimator</h1>
            <p class="subtitle">Estimate parallelism and compute your bill of materials</p>
          </div>
        </div>
      </div>
    </header>
    
    <nav class="app-nav" v-if="!isHome">
      <router-link to="/workload" class="nav-item">
        <span class="nav-number">1</span>
        <span class="nav-label">Workload</span>
      </router-link>
      <router-link to="/environment" class="nav-item">
        <span class="nav-number">2</span>
        <span class="nav-label">Environment</span>
      </router-link>
      <router-link to="/topology" class="nav-item">
        <span class="nav-number">3</span>
        <span class="nav-label">Topology</span>
      </router-link>
      <router-link 
        to="/results" 
        :class="['nav-item', { disabled: !hasTopology }]"
        :title="hasTopology ? '' : 'Add operators to the topology first'"
        @click="handleResultsClick"
      >
        <span class="nav-number">4</span>
        <span class="nav-label">Results</span>
      </router-link>
    </nav>
    
    <main class="app-main">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <p>Flink Estimator v.1.0.0 | made with ❤️</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useGraphStore } from '@/stores/graph';
import { useRoute } from 'vue-router';

const graphStore = useGraphStore();
const hasTopology = computed(() => graphStore.hasOperators);
const route = useRoute();
const isHome = computed(() => route.path === '/');

const handleResultsClick = (event) => {
  if (!hasTopology.value) {
    event.preventDefault();
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
  color: #2c3e50;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(90deg, #e76f8a 0%, #cc932d 90%, #e0a53a 100%);
  color: white;
  padding: 30px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
}

.app-header h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
}

.app-nav {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
  gap: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-item {
  flex: 1;
  max-width: 200px;
  padding: 16px 20px;
  text-decoration: none;
  color: #7f8c8d;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
}

.nav-item:hover {
  background: #f8f9fa;
  color: #3498db;
}

.nav-item.router-link-active {
  color: #3498db;
  border-bottom-color: #3498db;
  background: #f8f9fa;
}

.nav-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ecf0f1;
  font-size: 14px;
  font-weight: 600;
}

.nav-item.router-link-active .nav-number {
  background: #3498db;
  color: white;
}

.nav-item.disabled {
  pointer-events: none;
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-item.disabled:hover {
  background: transparent;
  color: #7f8c8d;
}

.nav-label {
  font-size: 15px;
}

.app-main {
  flex: 1;
  padding: 30px 20px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  background: #f5f7fa;
}

.app-footer {
  background: #34495e;
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: 40px;
}

.app-footer p {
  font-size: 14px;
  opacity: 0.8;
}

/* Responsive */
@media (max-width: 768px) {
  .app-header h1 {
    font-size: 24px;
  }
  
  .nav-item {
    flex-direction: column;
    gap: 4px;
    padding: 12px 8px;
  }
  
  .nav-label {
    font-size: 13px;
  }
  
  .app-main {
    padding: 20px 10px;
  }
}
</style>
