<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import rabbitIcon from '@/assets/stickers/rabbit-icon.svg?raw'
import { rabbitSvg, stickerDefs, useStickerDrag, type StickerDef } from '@/composables/useStickers'

const STORAGE_KEY = 'personal-site:stickers'

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

const drag = useStickerDrag()
const layer = ref<HTMLElement | null>(null)
const followRabbit = ref<HTMLElement | null>(null)
const enabled = ref(readPreference())

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(hover: none)').matches

const wiggleTimers: number[] = []
let followFrame = 0
let following = false
let mouseX = 0
let mouseY = 0
let rabbitX = 0
let rabbitY = 0
let lastX = 0

function stickerStyle(def: StickerDef): Record<string, string | number | undefined> {
  return {
    left: def.left,
    right: def.right,
    top: def.top,
    bottom: def.bottom,
    transform: `rotate(${def.rot}deg)`,
  }
}

function onMouseMove(event: MouseEvent): void {
  mouseX = event.clientX
  mouseY = event.clientY
}

function trail(): void {
  if (!following) return

  rabbitX += (mouseX - rabbitX) * 0.075
  rabbitY += (mouseY - rabbitY) * 0.075 + Math.sin(performance.now() / 420) * 0.5

  const velocityX = rabbitX - lastX
  lastX = rabbitX
  const tilt = Math.max(-16, Math.min(16, velocityX * 0.9))

  if (followRabbit.value) {
    followRabbit.value.style.transform = `translate(${rabbitX + 26}px,${rabbitY - 78}px) rotate(${tilt}deg)`
    followRabbit.value.style.opacity = '1'
  }
  followFrame = requestAnimationFrame(trail)
}

function startFollow(): void {
  if (following || isTouch || reduce || !enabled.value) return
  following = true
  rabbitX = window.innerWidth / 2
  rabbitY = window.innerHeight / 2
  mouseX = rabbitX
  mouseY = rabbitY
  lastX = rabbitX
  document.addEventListener('mousemove', onMouseMove)
  followFrame = requestAnimationFrame(trail)
}

function stopFollow(): void {
  following = false
  cancelAnimationFrame(followFrame)
  document.removeEventListener('mousemove', onMouseMove)
  if (followRabbit.value) followRabbit.value.style.opacity = '0'
}

function toggle(): void {
  enabled.value = !enabled.value
}

watch(enabled, value => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // localStorage 不可用时只影响记忆，不影响本次开关
  }
  if (value) {
    startFollow()
  } else {
    drag.cancel()
    stopFollow()
  }
})

onMounted(() => {
  if (!layer.value) return

  // 周期性抖一下
  layer.value.querySelectorAll<HTMLElement>('.sticker').forEach((el, index) => {
    if (reduce) return
    const timer = window.setInterval(
      () => {
        if (el.classList.contains('dragging')) return
        el.classList.add('wiggle')
        window.setTimeout(() => el.classList.remove('wiggle'), 650)
      },
      7000 + index * 2600,
    )
    wiggleTimers.push(timer)
  })

  if (enabled.value) startFollow()
})

onBeforeUnmount(() => {
  wiggleTimers.forEach(timer => window.clearInterval(timer))
  stopFollow()
})
</script>

<template>
  <button
    class="sticker-toggle"
    type="button"
    role="switch"
    :aria-checked="enabled"
    :aria-label="enabled ? '隐藏贴纸' : '显示贴纸'"
    :title="enabled ? '隐藏贴纸' : '显示贴纸'"
    @click="toggle"
  >
    <span class="sticker-toggle-icon" v-html="rabbitIcon" />
    <span class="sticker-toggle-label">贴纸</span>
    <span class="sticker-toggle-track" aria-hidden="true">
      <span class="sticker-toggle-thumb" />
    </span>
  </button>

  <div v-show="enabled" ref="layer" class="stickers" aria-hidden="true">
    <div
      v-for="(def, index) in stickerDefs"
      :key="index"
      class="sticker"
      :class="{ small: def.small }"
      :style="stickerStyle(def)"
      @pointerdown="drag.start($event, def)"
      @pointermove="drag.move($event)"
      @pointerup="drag.end()"
      @pointercancel="drag.end()"
      v-html="def.svg"
    />
  </div>
  <div
    v-show="enabled"
    id="rabbit-follow"
    ref="followRabbit"
    aria-hidden="true"
    v-html="rabbitSvg"
  />
</template>
