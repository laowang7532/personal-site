<script setup lang="ts">
import { profile } from '@/utils/profile'
</script>

<template>
  <footer
    class="foot relative z-2 flex flex-wrap items-center justify-between gap-4 px-[var(--pad)] pt-7 pb-10 font-mono text-[12px] text-ink-3 max-sm:text-[11px]"
  >
    <span>{{ profile.footer.copyright }}</span>
    <span>{{ profile.footer.tagline }}</span>
    <a class="transition-colors hover:text-orange" href="#top">回到封面 ↑</a>
  </footer>
</template>
