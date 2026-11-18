<script setup lang="ts">
import { useDeck } from '@/composables/useDeck'

const { pages, activeIndex, goTo } = useDeck()
</script>

<template>
  <nav class="deck-rail" aria-label="翻页导航" title="点击或滚动翻页">
    <span class="deck-rail-caption" aria-hidden="true">翻页</span>
    <button
      v-for="(page, index) in pages"
      :key="page.id"
      type="button"
      class="deck-rail-item"
      :class="{ 'is-active': index === activeIndex }"
      :aria-label="`第 ${index + 1} 页：${page.label}`"
      :aria-current="index === activeIndex ? 'page' : undefined"
      @click="goTo(index)"
    >
      <span class="deck-rail-label" aria-hidden="true">{{ page.label }}</span>
      <span class="deck-rail-line" aria-hidden="true" />
    </button>
  </nav>
</template>
