<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="theme === 'light' ? '切换到深色主题' : '切换到浅色主题'"
    :title="theme === 'light' ? '切换到深色主题' : '切换到浅色主题'"
    @click="toggleTheme"
  >
    <!-- 图标显示目标主题：深色时是太阳，浅色时是月亮 -->
    <svg v-if="theme === 'light'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 14.1A8.4 8.4 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.2s,
    background 0.2s,
    border-color 0.2s,
    transform 0.2s var(--ease);
}

.theme-toggle:hover {
  color: var(--ink);
  border-color: var(--line);
  background: var(--overlay);
  transform: translateY(-1px);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--orange);
  outline-offset: 2px;
}

.theme-toggle svg {
  display: block;
  width: 17px;
  height: 17px;
}
</style>
