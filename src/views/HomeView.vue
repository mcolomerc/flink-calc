<template>
  <section class="home">
    <div class="hero">
      <img src="/flink-logo.svg" alt="Flink Logo" class="logo" />
  <h1>Estimator</h1>
      <p class="tagline">Smart capacity planning for Apache Flink workloads</p>
    </div>

    <div class="content-grid">
      <div class="feature-card">
        <div class="feature-icon">⚙️</div>
        <h3>Configure Workload</h3>
        <p>Define input rates, latency targets, and SLA requirements for accurate sizing.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔧</div>
        <h3>Set Environment</h3>
        <p>Configure TaskManager resources, state backend, and checkpoint parameters.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔀</div>
        <h3>Build Topology</h3>
        <p>Visually construct your job DAG with operators, connections, and state config.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Get Results</h3>
        <p>Calculate parallelism, memory splits, and export your Bill of Materials.</p>
      </div>
    </div>

    <div class="cta-section">
      <router-link class="start-btn" to="/workload">
        <span>Start Planning</span>
        <span class="arrow">→</span>
      </router-link>
      <p class="help-text">No installation required • Free to use</p>
    </div>
  </section>
</template>

<script setup>
// Landing page component
</script>

<style scoped>
.home {
  
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  background: #f5f7fa;
  position: relative;
  overflow: hidden;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.logo {
  width: 270px;
  height: 200px;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
}

.hero h1 {
  font-size: 36px;
  font-weight: 700;
  color: #2c3e50; 
  margin-bottom: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tagline {
  font-size: 16px;
  color: #555;
  margin: 0;
  font-weight: 400;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  max-width: 960px;
  width: 100%;
  margin-top: 14px;   /* add space between text and cards */
  margin-bottom: 20px; /* add space between cards and CTA */
  position: relative;
  z-index: 1;
}

.feature-card {
  background: linear-gradient(to right, #667eea 0%, #764ba2 90%, #764ba3 100%);
  border-radius: 8px;
  padding: 16px 14px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Hover animations removed per request */

.feature-icon {
  font-size: 32px;
  margin-bottom: 6px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.feature-card h3 {
  font-size: 17px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.feature-card p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.35;
  margin: 0;
}

.cta-section {
  text-align: center;
  position: relative;
  z-index: 1;
  margin-top: 40px; /* extra space above Start button */
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  padding: 12px 30px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #7b8cf5 0%, #8a5cb8 100%);
}

.arrow {
  font-size: 24px;
  transition: transform 0.3s;
}

.start-btn:hover .arrow {
  transform: translateX(4px);
}

.help-text {
  margin-top: 6px;
  font-size: 12px;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 32px;
  }
  
  .tagline {
    font-size: 16px;
  }
  
  .logo {
    width: 80px;
    height: 80px;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .start-btn {
    padding: 14px 32px;
    font-size: 16px;
  }
}
</style>
