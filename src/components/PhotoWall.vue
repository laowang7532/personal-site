<script setup lang="ts">
import { computed } from 'vue'
import SectionHead from '@/components/SectionHead.vue'
import { photos } from '@/utils/profile'

const slots = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'] as const

const fallback = [
  { caption: '起飞前的十分钟' },
  { caption: '正射影像的另一种看法' },
  { caption: '山里没有信号' },
  { caption: '加班到路灯亮' },
  { caption: '早餐是唯一准时的会议' },
  { caption: '某个周五的黄昏' },
  { caption: '跑完五公里的自拍' },
  { caption: '机库里的安静时刻' },
]

const tiles = computed(() =>
  fallback.map((tile, index) => {
    const entry = photos.find(photo => photo.slot === slots[index])
    return {
      caption: entry?.caption ?? tile.caption,
      image: entry?.src || undefined,
    }
  }),
)
</script>

<template>
  <section class="section relative px-[var(--pad)] py-[clamp(70px,11vw,140px)]">
    <SectionHead num="03" title="照片墙">
      <template #hint>在「内容工作台」上传，或把图片放进 <code>assets/photos/</code></template>
    </SectionHead>

    <div
      class="wall grid grid-cols-4 grid-auto-rows-[132px] gap-3 max-lg:grid-cols-2 max-lg:grid-auto-rows-[120px]"
    >
      <figure
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile reveal"
        :class="`t${index + 1}`"
      >
        <div
          class="ph"
          :style="tile.image ? { backgroundImage: `url(${tile.image})` } : undefined"
        />
        <figcaption>{{ tile.caption }}</figcaption>
      </figure>
    </div>
  </section>
</template>
