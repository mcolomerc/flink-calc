<template>
  <div class="view-container">
    <EnvironmentForm />
    <StepNavigation />
  </div>
</template>

<script setup>
import EnvironmentForm from '@/components/EnvironmentForm.vue';
import StepNavigation from '@/components/StepNavigation.vue';
</script>

<style scoped>
.view-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
