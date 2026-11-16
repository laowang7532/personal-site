<script setup lang="ts">
const words = ['无人机', '遥感影像', '前端', 'UI 设计', '摄影', '减脂中']
</script>

<template>
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <template v-for="copy in 2" :key="copy">
        <template v-for="word in words" :key="`${copy}-${word}`">
          <span>{{ word }}</span><b>✳</b>
        </template>
      </template>
    </div>
  </div>
</template>
