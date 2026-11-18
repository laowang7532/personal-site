<script setup lang="ts">
import { useClock } from '@/composables/useClock'
import { useDeck } from '@/composables/useDeck'
import { profile } from '@/utils/profile'

const time = useClock()
const { activeId, navVisible } = useDeck()

const links = [
  { id: 'about', href: '#about', label: '关于' },
  { id: 'photos', href: '#photos', label: '照片' },
  { id: 'writing', href: '#writing', label: '博客' },
  { id: 'contact', href: '#contact', label: '联系' },
]
</script>

<template>
  <header
    class="topbar pointer-events-none fixed inset-x-0 top-0 z-[600] flex items-center justify-between px-[var(--pad)] py-5 mix-blend-difference"
  >
    <a
      class="logo pointer-events-auto text-[15px] font-bold tracking-[.08em]"
      href="#top"
      :aria-label="`${profile.name} · 回到封面`"
    >
      W<span class="mx-[1px] text-orange">/</span>H
    </a>

    <div class="pointer-events-auto flex items-center gap-[26px] max-sm:gap-4">
      <nav
        class="topbar-nav flex gap-[26px] max-sm:gap-4"
        :class="{ 'is-visible': navVisible }"
        :inert="!navVisible"
        :aria-hidden="!navVisible"
        aria-label="主导航"
      >
        <a
          v-for="link in links"
          :key="link.href"
          class="nav-link relative pb-[2px] text-[13px] text-ink-2 transition-colors duration-200 hover:text-ink max-sm:text-[12px]"
          :class="{ 'is-active': activeId === link.id }"
          :href="link.href"
          :aria-current="activeId === link.id ? 'page' : undefined"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="clock font-mono text-[12px] tracking-[.06em] text-ink-3 max-sm:hidden">
        {{ time }}
      </div>
    </div>
  </header>
</template>
