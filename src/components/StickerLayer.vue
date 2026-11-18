<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import rabbitToggleArt from '@/assets/stickers/rabbit-autumn.svg'
import {
  pickRabbits,
  rabbitSlots,
  stickerDefs,
  useStickerDrag,
  type RabbitArtwork,
  type StickerDef,
} from '@/composables/useStickers'

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
const enabled = ref(readPreference())

/** 每次刷新随机抽三只兔子；开关按钮时再换一批。 */
const rabbits = ref<RabbitArtwork[]>(pickRabbits(rabbitSlots.length))
const rabbitEpoch = ref(0)

const rabbitDefs = computed<StickerDef[]>(() =>
  rabbitSlots.map((slot, index) => ({ ...slot, image: rabbits.value[index]?.src })),
)

const card = ref<HTMLElement | null>(null)
const preview = ref<{ rabbit: RabbitArtwork; slot: number } | null>(null)
const previewPinned = ref(false)
const flipped = ref(false)
let closeTimer = 0
let suppressHoverUntil = 0

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches

let wiggleTimer = 0

function stickerStyle(def: StickerDef, index = 0): Record<string, string | number | undefined> {
  const style: Record<string, string | number | undefined> = {
    transform: `rotate(${def.rot}deg)`,
    '--sticker-delay': `${index * 70}ms`,
  }

  if (def.left) style['--sticker-left'] = def.left
  if (def.right) style['--sticker-right'] = def.right
  if (def.top) style['--sticker-top'] = def.top
  if (def.bottom) style['--sticker-bottom'] = def.bottom
  if (def.size) style['--sticker-size'] = `${def.size}px`

  return style
}

function resetTilt(element: HTMLElement | null): void {
  if (!element) return
  element.style.setProperty('--tilt-x', '0deg')
  element.style.setProperty('--tilt-y', '0deg')
  element.style.setProperty('--glow-x', '50%')
  element.style.setProperty('--glow-y', '30%')
}

function setPreview(rabbit: RabbitArtwork, slot: number): void {
  if (preview.value?.rabbit.src !== rabbit.src) {
    flipped.value = false
    resetTilt(card.value)
  }
  preview.value = { rabbit, slot }
}

function openPreview(rabbit: RabbitArtwork, slot: number): void {
  window.clearTimeout(closeTimer)
  setPreview(rabbit, slot)
  previewPinned.value = true
}

function hoverPreview(rabbit: RabbitArtwork, slot: number): void {
  // 刚按 Esc / 关闭按钮收起时，不要让仍停在按钮上的鼠标立刻又弹出来
  if (performance.now() < suppressHoverUntil) return
  window.clearTimeout(closeTimer)
  setPreview(rabbit, slot)
}

function keepPreview(): void {
  window.clearTimeout(closeTimer)
}

function scheduleHide(): void {
  if (previewPinned.value) return
  window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    preview.value = null
  }, 200)
}

function closePreview(): void {
  window.clearTimeout(closeTimer)
  previewPinned.value = false
  preview.value = null
  flipped.value = false
  suppressHoverUntil = performance.now() + 400
}

function flipPreview(): void {
  flipped.value = !flipped.value
}

function onCardMove(event: PointerEvent): void {
  if (!hoverCapable) return
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5

  element.style.setProperty('--tilt-y', `${(x * 16).toFixed(2)}deg`)
  element.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`)
  element.style.setProperty('--glow-x', `${((x + 0.5) * 100).toFixed(1)}%`)
  element.style.setProperty('--glow-y', `${((y + 0.5) * 100).toFixed(1)}%`)
}

function onCardLeave(event: MouseEvent): void {
  resetTilt(event.currentTarget as HTMLElement)
  scheduleHide()
}

function wiggleTick(): void {
  const nodes = layer.value?.querySelectorAll<HTMLElement>('.sticker')
  if (!nodes?.length) return

  const target = nodes[Math.floor(Math.random() * nodes.length)]
  if (!target || target.classList.contains('dragging')) return

  target.classList.add('wiggle')
  window.setTimeout(() => target.classList.remove('wiggle'), 650)
}

function reroll(): void {
  rabbits.value = pickRabbits(rabbitSlots.length)
  rabbitEpoch.value += 1
}

function toggle(): void {
  enabled.value = !enabled.value
  closePreview()
  suppressHoverUntil = 0
  // 每次按下开关都换一批兔子，关掉时也先备好下一批
  reroll()
}

function onKeydown(event: KeyboardEvent): void {
  if (!preview.value) return

  if (event.key === 'Escape') {
    closePreview()
    return
  }
  // 预览打开时别让左右方向键翻动后面的页面
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.stopPropagation()
}

watch(enabled, value => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // localStorage 不可用时只影响记忆，不影响本次开关
  }
  if (!value) {
    drag.cancel()
    closePreview()
  }
})

onMounted(() => {
  if (!reduce) wiggleTimer = window.setInterval(wiggleTick, 4200)
  document.addEventListener('keydown', onKeydown, true)
})

onBeforeUnmount(() => {
  window.clearInterval(wiggleTimer)
  window.clearTimeout(closeTimer)
  document.removeEventListener('keydown', onKeydown, true)
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
    <img class="sticker-toggle-art" :src="rabbitToggleArt" alt="" draggable="false" />
  </button>

  <div v-show="enabled" ref="layer" class="stickers">
    <div
      v-for="(rabbit, index) in rabbits"
      :key="`${rabbitEpoch}-${index}`"
      class="sticker rabbit-sticker"
      :class="`rabbit-slot-${index + 1}`"
      :style="stickerStyle(rabbitDefs[index], index)"
      @pointerdown="drag.start($event, rabbitDefs[index])"
      @pointermove="drag.move($event)"
      @pointerup="drag.end()"
      @pointercancel="drag.end()"
    >
      <img class="sticker-image" :src="rabbit.src" alt="" draggable="false" />
      <button
        class="sticker-peek"
        type="button"
        :aria-label="`放大预览：${rabbit.label}`"
        aria-haspopup="dialog"
        :aria-expanded="preview?.slot === index"
        @pointerdown.stop
        @click.stop="openPreview(rabbit, index)"
        @mouseenter="hoverPreview(rabbit, index)"
        @mouseleave="scheduleHide()"
        @focus="hoverPreview(rabbit, index)"
        @blur="scheduleHide()"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.1" stroke="currentColor" stroke-width="1.7" />
          <path
            d="m10.2 10.2 3.3 3.3"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <div
      v-for="(def, index) in stickerDefs"
      :key="`vector-${index}`"
      class="sticker"
      :class="[def.small ? 'small' : '', def.kind ? `is-${def.kind}` : '']"
      :style="stickerStyle(def)"
      @pointerdown="drag.start($event, def)"
      @pointermove="drag.move($event)"
      @pointerup="drag.end()"
      @pointercancel="drag.end()"
    >
      <span class="sticker-vector" v-html="def.svg" />
    </div>
  </div>

  <Teleport to="body">
    <Transition name="preview-fade">
      <div
        v-if="preview && previewPinned"
        class="sticker-preview-scrim"
        @click="closePreview"
        @wheel.stop
      />
    </Transition>

    <Transition name="preview-fade">
      <div v-if="preview" class="sticker-preview-aura" aria-hidden="true" />
    </Transition>

    <Transition name="preview-pop">
      <figure
        v-if="preview"
        ref="card"
        class="sticker-preview-card"
        :class="{ 'is-flipped': flipped }"
        role="dialog"
        aria-modal="false"
        :aria-label="`贴纸预览：${preview.rabbit.label}`"
        @mouseenter="keepPreview"
        @mouseleave="onCardLeave"
        @pointermove="onCardMove"
        @wheel.stop
      >
        <button
          class="sticker-preview-close"
          type="button"
          aria-label="关闭预览"
          @click.stop="closePreview"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <div class="sticker-preview-flipper">
          <div class="sticker-preview-face sticker-preview-front" :inert="flipped">
            <div class="sticker-preview-art" title="翻面看日期" @click="flipPreview">
              <img
                :src="preview.rabbit.src"
                :alt="`手绘兔子贴纸：${preview.rabbit.label}`"
                draggable="false"
              />
            </div>

            <figcaption class="sticker-preview-meta">
              <span class="sticker-preview-label">{{ preview.rabbit.label }}</span>
              <span class="sticker-preview-side">
                <span class="sticker-preview-latin">{{ preview.rabbit.latin }}</span>
                <button
                  class="sticker-preview-flip"
                  type="button"
                  aria-label="翻到背面看日期"
                  title="翻面看日期"
                  @click.stop="flipPreview"
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M13.2 5.3A5.4 5.4 0 1 0 13.5 10"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                    />
                    <path
                      d="M13 2.2v3.9h-3.9"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span>翻面</span>
                </button>
              </span>
            </figcaption>
          </div>

          <div
            class="sticker-preview-face sticker-preview-back"
            :inert="!flipped"
            @click="flipPreview"
          >
            <span class="sticker-back-kicker">DRAWN ON</span>
            <span v-if="preview.rabbit.date" class="sticker-back-date">
              {{ preview.rabbit.date }}
            </span>
            <span v-else class="sticker-back-empty">日期待补充</span>
            <span class="sticker-back-rule" />
            <span class="sticker-back-label">
              {{ preview.rabbit.label }} · {{ preview.rabbit.latin }}
            </span>
            <button
              class="sticker-preview-flip is-back"
              type="button"
              aria-label="翻回正面"
              @click.stop="flipPreview"
            >
              翻回正面
            </button>
            <span class="sticker-back-hint">点击卡片任意处翻回</span>
          </div>
        </div>
      </figure>
    </Transition>
  </Teleport>
</template>
