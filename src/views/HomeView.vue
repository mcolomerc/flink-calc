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
      <a href="https://github.com/mcolomerc/flink-calc" target="_blank" rel="noopener noreferrer" class="github-link" title="View on GitHub">
        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
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
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.logo {
  width: 200px;
  height: 150px;
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
  margin: 0 0 20px 0;
  font-weight: 400;
}

.github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #2c3e50;
  color: white;
  transition: all 0.3s ease;
  text-decoration: none;
}

.github-link:hover {
  background: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.github-icon {
  width: 24px;
  height: 24px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  max-width: 960px;
  width: 100%;
  margin-top: 10px;   /* add space between text and cards */
  margin-bottom: 15px; /* add space between cards and CTA */
  position: relative;
  z-index: 1;
}

.feature-card {
  background: linear-gradient(to right, #667eea 0%, #764ba2 90%, #764ba3 100%);
  border-radius: 8px;
  padding: 12px 10px;
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
  margin-top: 20px; /* extra space above Start button */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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
