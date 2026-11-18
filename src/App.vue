<script setup lang="ts">
import 'virtual:uno.css'
import HomePage from '@/pages/HomePage.vue'
import PostPage from '@/pages/PostPage.vue'
import '@/styles/base.css'
import '@/styles/theme.css'

withDefaults(defineProps<{ page?: 'home' | 'post'; slug?: string }>(), {
  page: 'home',
  slug: '',
})
</script>

<template>
  <HomePage v-if="page === 'home'" />
  <PostPage v-else :slug="slug" />
</template>
