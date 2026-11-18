<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const SELECTOR = 'a, button, .tile, .sticker'
/** 小圆点按钮不放大光标，否则光学差会把按钮整个盖住 */
const KEEP_SMALL = '.sticker-peek, .sticker-preview-close'

function shouldGrow(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null
  if (!element || element.closest(KEEP_SMALL)) return false
  return Boolean(element.closest(SELECTOR))
}

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
  grow.value = shouldGrow(event.target)
}

function onOut(event: MouseEvent): void {
  grow.value = shouldGrow(event.relatedTarget)
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
  <div ref="cursor" class="cursor" :class="{ on: visible, grow }" aria-hidden="true" />
</template>
