<script setup lang="ts">
interface Props {
  modelValue: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url';
  placeholder?: string;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <input
    class="input"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="handleInput"
  />
</template>
