<script setup lang="ts">
defineProps<{
  sheetAOut: boolean
  sheetBOut: boolean
}>()
</script>

<template>
  <div id="loader" aria-hidden="true">
    <div class="sheet sheet-a" :class="{ 'flip-out': sheetAOut }">
      <div class="sheet-inner">
        <div class="loader-mark">W / H</div>
        <div class="loader-line"><i /></div>
        <div class="loader-sub">正在翻开第一页</div>
      </div>
    </div>
    <div class="sheet sheet-b" :class="{ 'flip-out': sheetBOut }">
      <div class="sheet-inner">
        <div class="loader-mark alt">小王同学</div>
        <div class="loader-sub">造点东西 · 记录生活</div>
      </div>
    </div>
  </div>
</template>
