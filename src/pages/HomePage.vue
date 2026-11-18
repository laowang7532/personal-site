<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AboutSection from '@/components/AboutSection.vue'
import ContactSection from '@/components/ContactSection.vue'
import CursorDot from '@/components/CursorDot.vue'
import DeckRail from '@/components/DeckRail.vue'
import HeroSection from '@/components/HeroSection.vue'
import PageLoader from '@/components/PageLoader.vue'
import PhotoWall from '@/components/PhotoWall.vue'
import PostList from '@/components/PostList.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import StickerLayer from '@/components/StickerLayer.vue'
import TopBar from '@/components/TopBar.vue'
import VeinsCanvas from '@/components/VeinsCanvas.vue'
import { useDeck } from '@/composables/useDeck'
import { usePageLoader } from '@/composables/usePageLoader'
import { useReveal } from '@/composables/useReveal'
import '@/styles/home.css'

const { done, visible, sheetAOut, sheetBOut } = usePageLoader()
const { pages, activeIndex, direction, turning, flipFrom, flipTo, initDeck, disposeDeck } =
  useDeck()

useReveal(done)

function pageClass(index: number): Record<string, boolean> {
  return {
    'is-active': index === activeIndex.value,
    'is-before': index < activeIndex.value,
    'is-after': index > activeIndex.value,
    // 前进：当前页向左翻出去，下一页在下面露出
    'is-flip-out': turning.value && direction.value === 'forward' && index === flipFrom.value,
    // 后退：上一页从左侧翻回来，盖在当前页上面
    'is-flip-in': turning.value && direction.value === 'back' && index === flipTo.value,
    'is-flip-under': turning.value && direction.value === 'back' && index === flipFrom.value,
    // 翻回来的页本身已经在动，落定后不再补一次内容上浮
    'is-back-landed': !turning.value && direction.value === 'back' && index === activeIndex.value,
    'is-skip': turning.value && index !== flipFrom.value && index !== flipTo.value,
    'is-contact': index === pages.length - 1,
  }
}

function pageStyle(index: number): Record<string, number> {
  let zIndex = 10

  if (turning.value) {
    if (direction.value === 'forward') {
      if (index === flipFrom.value) zIndex = 40
      else if (index === activeIndex.value) zIndex = 30
    } else if (index === flipTo.value) {
      zIndex = 40
    } else if (index === flipFrom.value) {
      zIndex = 30
    }
  } else if (index === activeIndex.value) {
    zIndex = 30
  } else if (index < activeIndex.value) {
    zIndex = 20
  }

  return { zIndex }
}

onMounted(initDeck)
onBeforeUnmount(disposeDeck)
</script>

<template>
  <PageLoader v-if="visible" :sheet-a-out="sheetAOut" :sheet-b-out="sheetBOut" />
  <VeinsCanvas :active="done" />
  <CursorDot />
  <TopBar />

  <main
    class="deck"
    :class="[`deck-${direction}`, { 'is-turning': turning }]"
    aria-label="小王同学的个人网站"
  >
    <section
      v-for="(page, index) in pages"
      :id="page.id"
      :key="page.id"
      class="deck-page"
      :class="pageClass(index)"
      :style="pageStyle(index)"
      :inert="index !== activeIndex"
      :aria-hidden="index !== activeIndex"
      :aria-label="`第 ${index + 1} 页：${page.label}`"
    >
      <div class="deck-scroll">
        <HeroSection v-if="index === 0" />
        <AboutSection v-else-if="index === 1" />
        <PhotoWall v-else-if="index === 2" />
        <PostList v-else-if="index === 3" />
        <template v-else>
          <ContactSection />
          <SiteFooter />
        </template>
      </div>
    </section>
  </main>

  <DeckRail />
  <p class="sr-only" aria-live="polite">
    {{ pages[activeIndex]?.label }}，第 {{ activeIndex + 1 }} 页，共 {{ pages.length }} 页
  </p>

  <StickerLayer />
</template>
