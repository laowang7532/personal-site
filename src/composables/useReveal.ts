import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * 滚动入场：等首页加载层退场后再启动，保持 v1 的节奏。
 * 逻辑与 v1 对齐：IntersectionObserver + 批次内错峰 + hero 首屏顺序入场。
 */
export function useReveal(active: Ref<boolean>) {
  const timers = new Set<number>()
  let observer: IntersectionObserver | null = null
  let started = false

  function later(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
  }

  function start(): void {
    if (started) return
    started = true

    const items = document.querySelectorAll<HTMLElement>('.reveal')

    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'))
      return
    }

    observer = new IntersectionObserver(
      entries => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return
          const target = entry.target as HTMLElement
          const delay = Number(target.dataset.delay || 0) + index * 70
          later(() => target.classList.add('in'), delay)
          observer?.unobserve(target)
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    items.forEach(el => observer?.observe(el))

    // hero 首屏按顺序入场
    document.querySelectorAll<HTMLElement>('.hero .reveal').forEach((el, index) => {
      later(() => el.classList.add('in'), 120 + index * 130)
    })
  }

  watch(
    active,
    value => {
      if (value) nextTick(start)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    for (const timer of timers) window.clearTimeout(timer)
    timers.clear()
  })
}
