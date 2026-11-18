<script setup lang="ts">
const words = ['程序员', '撸铁', '摄影', '音乐', '电影爱好者', '规划未来']

// 每组内容完全一致：6 组 + 位移 1/6，滚动到下一组时画面无缝衔接
const copies = 6
</script>

<template>
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <div v-for="copy in copies" :key="copy" class="marquee-group">
        <template v-for="word in words" :key="`${copy}-${word}`">
          <span>{{ word }}</span><b>✳</b>
        </template>
      </div>
    </div>
  </div>
</template>
