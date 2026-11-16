<script setup lang="ts">
defineProps<{
  num: string
  title: string
}>()
</script>

<template>
  <div class="section-head mb-[clamp(34px,5vw,64px)] flex items-baseline gap-[18px]">
    <span class="font-mono text-[12px] tracking-[.14em] text-orange">{{ num }}</span>
    <h2 class="text-[clamp(1.9rem,4.4vw,3.2rem)] font-semibold leading-none tracking-[-.03em]">
      {{ title }}
    </h2>
    <span
      v-if="$slots.hint"
      class="ml-auto hidden font-mono text-[12px] tracking-[.04em] text-ink-3 wide:block"
    >
      <slot name="hint" />
    </span>
  </div>
</template>
