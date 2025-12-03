<template>
  <div class="view-container">
    <WorkloadForm />
    <StepNavigation />
  </div>
</template>

<script setup>
import WorkloadForm from '@/components/WorkloadForm.vue';
import StepNavigation from '@/components/StepNavigation.vue';
</script>

<style scoped>
.view-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
