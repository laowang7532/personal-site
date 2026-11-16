<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVeins } from '@/composables/useVeins'

const props = defineProps<{ active: boolean }>()
const canvas = ref<HTMLCanvasElement | null>(null)

useVeins(
  canvas,
  computed(() => props.active),
)
</script>

<template>
  <canvas ref="canvas" id="veins" aria-hidden="true" :class="{ in: active }" />
</template>
