<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { bearSvg, stickerDefs, useStickerDrag, type StickerDef } from '@/composables/useStickers'

const drag = useStickerDrag()
const layer = ref<HTMLElement | null>(null)
const followBear = ref<HTMLElement | null>(null)

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(hover: none)').matches

const wiggleTimers: number[] = []
let followFrame = 0
let mouseX = 0
let mouseY = 0
let bearX = 0
let bearY = 0
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
  bearX += (mouseX - bearX) * 0.075
  bearY += (mouseY - bearY) * 0.075 + Math.sin(performance.now() / 420) * 0.5

  const velocityX = bearX - lastX
  lastX = bearX
  const tilt = Math.max(-16, Math.min(16, velocityX * 0.9))

  if (followBear.value) {
    followBear.value.style.transform = `translate(${bearX + 26}px,${bearY - 62}px) rotate(${tilt}deg)`
    followBear.value.style.opacity = '1'
  }
  followFrame = requestAnimationFrame(trail)
}

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

  // 跟随鼠标的小熊
  if (!isTouch && !reduce) {
    bearX = window.innerWidth / 2
    bearY = window.innerHeight / 2
    mouseX = bearX
    mouseY = bearY
    lastX = bearX
    document.addEventListener('mousemove', onMouseMove)
    followFrame = requestAnimationFrame(trail)
  }
})

onBeforeUnmount(() => {
  wiggleTimers.forEach(timer => window.clearInterval(timer))
  cancelAnimationFrame(followFrame)
  document.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <div ref="layer" class="stickers" aria-hidden="true">
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
  <div id="bear-follow" ref="followBear" v-html="bearSvg" />
</template>
