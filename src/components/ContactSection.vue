<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'
import { emphasize, profile } from '@/utils/profile'
</script>

<template>
  <section class="section last relative px-[var(--pad)] py-[clamp(70px,11vw,140px)]">
    <SectionHead num="05" title="联系" />

    <div class="contact">
      <p
        class="big mb-[26px] text-[clamp(1.35rem,2.9vw,2.1rem)] font-medium leading-[1.55] tracking-[-.01em]"
        v-html="emphasize(profile.contact.lead)"
      ></p>
      <div class="mt-2 flex flex-wrap gap-7">
        <a class="contact-link" :href="`mailto:${profile.contact.email}`">
          {{ profile.contact.email }}
        </a>
        <a class="contact-link" :href="profile.contact.github" target="_blank" rel="noopener">
          GitHub ↗
        </a>
      </div>
    </div>
  </section>
</template>
