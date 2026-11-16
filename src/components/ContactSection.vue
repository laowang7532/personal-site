<script setup lang="ts">
import SectionHead from '@/components/SectionHead.vue'
</script>

<template>
  <section
    id="contact"
    class="section last relative border-y border-line-soft px-[var(--pad)] py-[clamp(70px,11vw,140px)]"
  >
    <SectionHead num="05" title="联系" />

    <div class="contact">
      <p
        class="big mb-[26px] text-[clamp(1.35rem,2.9vw,2.1rem)] font-medium leading-[1.55] tracking-[-.01em]"
      >
        想聊无人机、前端，或者<em class="not-italic text-orange">只是想打个招呼</em>。
      </p>
      <div class="mt-2 flex flex-wrap gap-7">
        <a class="contact-link" href="mailto:1613104610@qq.com">1613104610@qq.com</a>
        <a
          class="contact-link"
          href="https://github.com/laowang7532"
          target="_blank"
          rel="noopener"
        >
          GitHub ↗
        </a>
      </div>
    </div>
  </section>
</template>
