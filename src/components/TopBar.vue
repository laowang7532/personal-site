<script setup lang="ts">
import { useClock } from '@/composables/useClock'

const time = useClock()

const links = [
  { href: '#about', label: '关于' },
  { href: '#photos', label: '照片' },
  { href: '#writing', label: '博客' },
  { href: '#contact', label: '联系' },
]
</script>

<template>
  <header
    class="topbar fixed inset-x-0 top-0 z-[600] flex items-center justify-between px-[var(--pad)] py-5 mix-blend-difference"
  >
    <a class="logo text-[15px] font-bold tracking-[.08em]" href="#top">
      W<span class="mx-[1px] text-orange">/</span>H
    </a>
    <nav class="flex gap-[26px] max-sm:gap-4">
      <a
        v-for="link in links"
        :key="link.href"
        class="nav-link relative pb-[2px] text-[13px] text-ink-2 transition-colors duration-200 hover:text-ink max-sm:text-[12px]"
        :href="link.href"
      >
        {{ link.label }}
      </a>
    </nav>
    <div class="clock font-mono text-[12px] tracking-[.06em] text-ink-3 max-sm:hidden">{{ time }}</div>
  </header>
</template>
