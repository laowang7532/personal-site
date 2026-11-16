<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'

const tiles = [
  '起飞前的十分钟',
  '正射影像的另一种看法',
  '山里没有信号',
  '加班到路灯亮',
  '早餐是唯一准时的会议',
  '某个周五的黄昏',
  '跑完五公里的自拍',
  '机库里的安静时刻',
]
</script>

<template>
  <section
    id="photos"
    class="section relative border-t border-line-soft px-[var(--pad)] py-[clamp(70px,11vw,140px)]"
  >
    <SectionHead num="03" title="照片墙">
      <template #hint>把照片丢进 <code>assets/photos/</code> 就能换掉占位图</template>
    </SectionHead>

    <div class="wall grid grid-cols-4 grid-auto-rows-[132px] gap-3 max-lg:grid-cols-2 max-lg:grid-auto-rows-[120px]">
      <figure
        v-for="(caption, index) in tiles"
        :key="caption"
        class="tile reveal"
        :class="`t${index + 1}`"
      >
        <div class="ph" />
        <figcaption>{{ caption }}</figcaption>
      </figure>
    </div>
  </section>
</template>
