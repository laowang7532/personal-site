<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'

interface Tile {
  caption: string
  /** 可选：/assets/photos/xxx.jpg；不填则使用内置渐变占位图 */
  image?: string
}

const tiles: Tile[] = [
  { caption: '起飞前的十分钟' },
  { caption: '正射影像的另一种看法' },
  { caption: '山里没有信号' },
  { caption: '加班到路灯亮' },
  { caption: '早餐是唯一准时的会议' },
  { caption: '某个周五的黄昏' },
  { caption: '跑完五公里的自拍' },
  { caption: '机库里的安静时刻' },
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

    <div
      class="wall grid grid-cols-4 grid-auto-rows-[132px] gap-3 max-lg:grid-cols-2 max-lg:grid-auto-rows-[120px]"
    >
      <figure
        v-for="(tile, index) in tiles"
        :key="tile.caption"
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
