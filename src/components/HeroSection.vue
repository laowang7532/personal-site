<template>
  <section
    class="hero relative grid min-h-[100svh] grid-cols-[64px_1fr_auto] items-end gap-5 px-[var(--pad)] pt-[120px] pb-[60px] max-lg:grid-cols-1 max-lg:gap-[10px]"
  >
    <div
      class="hero-side flex flex-col gap-[10px] self-start pt-2 font-mono text-[11px] tracking-[.18em] text-ink-3 max-lg:mb-6 max-lg:flex-row max-lg:gap-[18px] max-lg:pt-0"
    >
      <span>EST. 2026</span>
      <span>BEIJING · JINAN</span>
    </div>

    <div class="hero-main max-w-[min(1000px,86%)] max-lg:max-w-full">
      <p class="eyebrow reveal mb-[26px] font-mono text-[12px] tracking-[.16em] text-orange">
        无人机解决方案 / 前端折腾 / 生活记录
      </p>
      <h1
        class="display flex flex-col text-[clamp(4.4rem,15vw,12.5rem)] font-semibold leading-[.84] tracking-[-.055em]"
      >
        <span class="line reveal">造点</span>
        <span class="line offset reveal ml-[clamp(40px,14vw,190px)]">
          东西<span class="dot text-orange">.</span>
        </span>
      </h1>
      <p class="lede reveal mt-[34px] max-w-[34em] text-[clamp(15px,2vw,18px)] leading-[1.85] text-ink-2">
        白天给无人机写方案，晚上给浏览器写样式。<br />这里放一些作品、照片和没处说的想法。
      </p>
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
  </section>
</template>
