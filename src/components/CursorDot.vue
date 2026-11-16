<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const SELECTOR = 'a, button, .tile, .sticker'

const cursor = ref<HTMLElement | null>(null)
const visible = ref(false)
const grow = ref(false)

const isTouch = window.matchMedia('(hover: none)').matches

let frame = 0
let currentX = 0
let currentY = 0
let targetX = 0
let targetY = 0

function onMove(event: MouseEvent): void {
  targetX = event.clientX
  targetY = event.clientY
  visible.value = true
}

function onOver(event: MouseEvent): void {
  const target = event.target as Element | null
  grow.value = Boolean(target?.closest(SELECTOR))
}

function onOut(event: MouseEvent): void {
  const next = event.relatedTarget as Element | null
  grow.value = Boolean(next?.closest(SELECTOR))
}

function follow(): void {
  currentX += (targetX - currentX) * 0.22
  currentY += (targetY - currentY) * 0.22
  if (cursor.value) {
    cursor.value.style.transform = `translate(${currentX}px,${currentY}px) translate(-50%,-50%)`
  }
  frame = requestAnimationFrame(follow)
}

onMounted(() => {
  if (isTouch) return
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseover', onOver)
  document.addEventListener('mouseout', onOut)
  frame = requestAnimationFrame(follow)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseover', onOver)
  document.removeEventListener('mouseout', onOut)
})
</script>

<template>
  <div
    ref="cursor"
    class="cursor"
    :class="{ on: visible, grow }"
    aria-hidden="true"
  />
</template>
