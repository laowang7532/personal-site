<script setup lang="ts">
defineProps<{ poster: string }>()
</script>

<template>
  <div class="poster-scene">
    <div class="poster-ambient" aria-hidden="true">
      <img :src="poster" alt="" />
    </div>
    <div class="poster-stage">
      <div class="poster-float">
        <div class="poster-card">
          <img :src="poster" alt="" fetchpriority="high" />
          <span class="poster-sheen" aria-hidden="true" />
        </div>
      </div>
      <div class="poster-caption">
        <span class="poster-now"><i />Now showing</span>
        <span class="poster-progress" aria-hidden="true"><i /></span>
      </div>
    </div>
  </div>
</template>
