<template>
  <div class="view-container">
    <EstimateResults />
    <StepNavigation />
  </div>
</template>

<script setup>
import EstimateResults from '@/components/EstimateResults.vue';
import StepNavigation from '@/components/StepNavigation.vue';
</script>

<style scoped>
.view-container {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
