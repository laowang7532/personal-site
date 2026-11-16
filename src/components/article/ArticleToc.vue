<script setup lang="ts">
import type { PostHeading } from '@/types/post'

defineProps<{ items: PostHeading[] }>()
</script>

<template>
  <nav class="toc">
    <b>目录</b>
    <template v-for="(item, index) in items" :key="item.id">
      <a :href="`#${item.id}`">{{ item.text }}</a>{{ index < items.length - 1 ? ' ' : '' }}
    </template>
  </nav>
</template>
