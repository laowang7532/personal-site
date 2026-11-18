<script setup lang="ts">
import MarqueeBand from '@/components/MarqueeBand.vue'
import { multiline, profile } from '@/utils/profile'
</script>

<template>
  <section
    class="hero relative flex min-h-full flex-col px-[var(--pad)] pt-[clamp(96px,13vh,120px)]"
  >
    <div
      class="hero-main-wrap grid flex-1 grid-cols-[1fr_auto] items-end gap-5 pb-[clamp(38px,7vh,64px)] max-lg:grid-cols-1"
    >
      <div class="hero-main max-w-[min(1000px,86%)] max-lg:max-w-full">
        <p class="eyebrow reveal mb-[26px] font-mono text-[12px] tracking-[.16em] text-orange">
          {{ profile.eyebrow }}
        </p>
        <h1
          class="display flex flex-col text-[clamp(4.4rem,15vw,12.5rem)] font-semibold leading-[.84] tracking-[-.055em]"
        >
          <span class="line reveal">{{ profile.heroLines[0] }}</span>
          <span class="line offset reveal ml-[clamp(40px,14vw,190px)]">
            {{ profile.heroLines[1] }}<span class="dot text-orange">.</span>
          </span>
        </h1>
        <p
          class="lede reveal mt-[34px] max-w-[34em] text-[clamp(15px,2vw,18px)] leading-[1.85] text-ink-2"
          v-html="multiline(profile.heroLede)"
        ></p>
        <div class="hero-actions reveal mt-[38px] flex flex-wrap gap-[14px]">
          <a class="btn" href="#writing">读点东西 <i>→</i></a>
          <a class="btn ghost" href="#about">我是谁</a>
        </div>
      </div>

      <div
        class="hero-index select-none self-center text-[clamp(5rem,16vw,14rem)] font-bold leading-none text-transparent max-lg:hidden"
      >
        01
      </div>
    </div>

    <div class="-mx-[var(--pad)]">
      <MarqueeBand />
    </div>
  </section>
</template>
