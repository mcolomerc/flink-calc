<template>
  <div class="view-container">
    <TopologyBuilder />
    <StepNavigation />
  </div>
</template>

<script setup>
import TopologyBuilder from '@/components/TopologyBuilder.vue';
import StepNavigation from '@/components/StepNavigation.vue';
</script>

<style scoped>
.view-container {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
