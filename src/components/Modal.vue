<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="modal-body">
        <slot>
          <p v-for="(line, idx) in lines" :key="idx">{{ line }}</p>
        </slot>
      </div>
      <div class="modal-footer">
        <slot name="footer">
          <button v-if="showOk" class="btn" @click="close">OK</button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Notice' },
  message: { type: String, default: '' },
  showOk: { type: Boolean, default: true },
});

const emit = defineEmits(['update:show']);

const visible = computed({
  get() { return props.show; },
  set(val) { emit('update:show', val); }
});

const close = () => { visible.value = false; };

const lines = computed(() => props.message ? props.message.split('\n') : []);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  width: min(600px, 90vw);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 16px;
  color: #2c3e50;
}

.modal-body p {
  margin-bottom: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 16px;
  border: none;
  background: #3498db;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
}
</style>
