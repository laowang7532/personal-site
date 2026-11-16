<script setup lang="ts">
import { computed } from 'vue'
import ArticleToc from '@/components/article/ArticleToc.vue'
import { getPost, postDateLabel } from '@/utils/content'
import '@/styles/article.css'

const props = defineProps<{ slug: string }>()

const post = computed(() => getPost(props.slug))
const nextHref = computed(() => (post.value?.next ? `/posts/${post.value.next}.html` : '/index.html'))
</script>

<template>
  <article v-if="post" class="post-wrap">
    <a class="back" href="/index.html">← 回首页</a>

    <div class="post-meta">
      <span>{{ postDateLabel(post) }}</span>
      <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
      <span v-if="post.minutes">约 {{ post.minutes }} 分钟</span>
    </div>

    <h1>{{ post.title }}</h1>

    <p v-if="post.lede" class="post-lede">{{ post.lede }}</p>

    <div class="post-body">
      <ArticleToc v-if="post.toc && post.headings.length" :items="post.headings" />
      <!-- 正文在构建期由 markdown-it 渲染，不会把 markdown 运行时打进客户端 -->
      <div class="article-content" v-html="post.html" />
    </div>

    <div class="post-end">
      <span>© 2026 小王同学</span>
      <a :href="nextHref">继续读下一篇 →</a>
    </div>
  </article>

  <article v-else class="post-wrap">
    <a class="back" href="/index.html">← 回首页</a>
    <h1>文章不存在</h1>
    <p class="post-lede">这个地址没有对应的文章，可能已被移动或删除。</p>
  </article>
</template>
