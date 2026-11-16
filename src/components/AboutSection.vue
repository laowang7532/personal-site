<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'

const cards = [
  { key: '现在', text: '无人机综合管控 / 森林防火 / 智慧国土' },
  { key: '工具', text: 'Cursor · Claude Code · Ardot · Figma' },
  { key: '在学', text: 'Astro · 动效设计 · 把博客写下去' },
  { key: '副作用', text: '减脂中，肌酸与谷氨酰胺常伴' },
]
</script>

<template>
  <section
    id="about"
    class="section relative border-t border-line-soft px-[var(--pad)] py-[clamp(70px,11vw,140px)]"
  >
    <SectionHead num="02" title="关于" />

    <div
      class="about-grid grid grid-cols-[1.35fr_.9fr] items-start gap-[clamp(30px,6vw,80px)] max-lg:grid-cols-1"
    >
      <div class="about-text reveal">
        <!-- 注意：v1 里 .about-text p 的优先级压过了 .big，这里刻意保留 15.5px 的实际效果 -->
        <p
          class="big mb-[18px] max-w-[36em] text-[15.5px] font-medium leading-[1.55] tracking-[-.01em] text-ink-2"
        >
          我做的事情，说白了就是<em class="not-italic text-orange">把复杂的东西讲清楚，再把它做出来</em>。
        </p>
        <p class="mb-[18px] max-w-[36em] text-[15.5px] text-ink-2">
          在无人机行业做解决方案：机库统一接入、航线规划、任务调度、遥感影像处理、AI
          识别上报。也做前端——小程序、监管平台、可视化大屏，顺手把 UI 一并收拾干净。
        </p>
        <p class="mb-[18px] max-w-[36em] text-[15.5px] text-ink-2">
          喜欢清爽、克制、留白够多的设计。不喜欢堆功能，喜欢一个东西点下去就有反馈。
        </p>
      </div>

      <aside class="about-cards grid grid-cols-2 gap-3">
        <div
          v-for="card in cards"
          :key="card.key"
          class="card info-card reveal rounded-[14px] border border-line bg-bg-soft px-4 py-[18px]"
        >
          <span class="card-k mb-2 block font-mono text-[10.5px] uppercase tracking-[.16em] text-orange">
            {{ card.key }}
          </span>
          <p class="text-[13.5px] leading-[1.6] text-ink-2">{{ card.text }}</p>
        </div>
      </aside>
    </div>
  </section>
</template>
