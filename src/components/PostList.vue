<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'
import { allPosts, postDateLabel, postHref } from '@/utils/content'
</script>

<template>
  <section
    id="writing"
    class="section relative border-t border-line-soft px-[var(--pad)] py-[clamp(70px,11vw,140px)]"
  >
    <SectionHead num="04" title="博客">
      <template #hint>慢慢写，不追热点</template>
    </SectionHead>

    <ul class="posts list-none">
      <li
        v-for="post in allPosts"
        :key="post.slug"
        class="reveal border-t border-line-soft last:border-b"
      >
        <a
          class="post-row group grid grid-cols-[96px_1fr_auto_30px] items-center gap-[18px] p-[24px_6px] max-sm:grid-cols-[1fr_26px] max-sm:gap-[6px]"
          :href="postHref(post)"
        >
          <span class="p-date font-mono text-[12px] text-ink-3 max-sm:col-span-full">
            {{ postDateLabel(post) }}
          </span>
          <span
            class="p-title text-[clamp(15px,2.1vw,19px)] font-medium tracking-[-.01em] transition-colors duration-[250ms] group-hover:text-orange"
          >
            {{ post.title }}
          </span>
          <span
            class="p-tag rounded-full border border-line px-[10px] py-[3px] text-[11px] text-ink-2 max-sm:hidden"
          >
            {{ post.tags[0] ?? '' }}
          </span>
          <span
            class="p-arrow text-ink-3 transition-[transform,color] duration-300 ease-[var(--ease)] group-hover:translate-x-[5px] group-hover:text-orange"
          >
            →
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>
