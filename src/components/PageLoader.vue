<script setup lang="ts">
import { ref } from 'vue'
import PosterScene from '@/components/PosterScene.vue'
import posterOne from '@/assets/loader/poster-1.jpg'
import posterTwo from '@/assets/loader/poster-2.jpg'
import posterThree from '@/assets/loader/poster-3.jpg'

defineProps<{
  sheetAOut: boolean
  sheetBOut: boolean
}>()

const POSTER_KEY = 'personal-site:loader-poster'
const posters = [posterOne, posterTwo, posterThree]

/** 新会话随机一张，避开上一次播放过的海报 */
function pickPoster(): string {
  let last = -1
  try {
    const stored = localStorage.getItem(POSTER_KEY)
    if (stored !== null) last = Number(stored)
  } catch {
    // 隐私模式下 localStorage 不可用，直接随机
  }

  const choices = posters.map((_, index) => index).filter(index => index !== last)
  const index = choices[Math.floor(Math.random() * choices.length)] ?? 0
  try {
    localStorage.setItem(POSTER_KEY, String(index))
  } catch {
    // 忽略写入失败
  }
  return posters[index] ?? posterOne
}

const posterUrl = pickPoster()
const aGone = ref(false)

function onSceneEnd(event: AnimationEvent): void {
  if (event.animationName === 'flipOut') aGone.value = true
}
</script>

<template>
  <div id="loader" aria-hidden="true">
    <div
      v-show="!aGone && !sheetBOut"
      class="sheet sheet-a"
      :class="{ 'flip-out': sheetAOut }"
      @animationend="onSceneEnd"
    >
      <PosterScene :poster="posterUrl" />
    </div>
    <div class="sheet sheet-b" :class="{ 'flip-out': sheetBOut }">
      <div class="sheet-inner loader-names">
        <div class="loader-kicker">W<span>.</span></div>
        <div class="loader-name-line">
          <span>小王同学</span>
        </div>
        <div class="loader-line"><i /></div>
        <div class="loader-sub zh">一起造点东西 · 记录生活</div>
      </div>
    </div>
  </div>
</template>
