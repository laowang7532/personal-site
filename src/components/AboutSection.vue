<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'
import { emphasize, profile } from '@/utils/profile'
</script>

<template>
  <section class="section relative px-[var(--pad)] py-[clamp(70px,11vw,140px)]">
    <SectionHead num="02" title="关于" />

    <div
      class="about-grid grid grid-cols-[1.35fr_.9fr] items-start gap-[clamp(30px,6vw,80px)] max-lg:grid-cols-1"
    >
      <div class="about-text reveal">
        <!-- 注意：v1 里 .about-text p 的优先级压过了 .big，这里刻意保留 15.5px 的实际效果 -->
        <p
          class="big mb-[18px] max-w-[36em] text-[15.5px] font-medium leading-[1.55] tracking-[-.01em] text-ink-2"
          v-html="emphasize(profile.about.lead)"
        ></p>
        <p
          v-for="(paragraph, index) in profile.about.paragraphs"
          :key="index"
          class="mb-[18px] max-w-[36em] text-[15.5px] text-ink-2"
          v-html="emphasize(paragraph)"
        ></p>
      </div>

      <aside class="about-cards grid grid-cols-2 gap-3">
        <div
          v-for="card in profile.about.cards"
          :key="card.key"
          class="card info-card reveal rounded-[14px] border border-line bg-bg-soft px-4 py-[18px]"
        >
          <span
            class="card-k mb-2 block font-mono text-[10.5px] uppercase tracking-[.16em] text-orange"
          >
            {{ card.key }}
          </span>
          <p class="text-[13.5px] leading-[1.6] text-ink-2">{{ card.text }}</p>
        </div>
      </aside>
    </div>
  </section>
</template>
