import { onBeforeUnmount, onMounted, ref } from 'vue'

const STORAGE_KEY = 'personal-site:loader-played'

function readPlayed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markPlayed(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 隐私模式下无法写 sessionStorage，忽略即可
  }
}

/**
 * 翻页加载动画：
 * - 同一个标签页会话只播放一次
 * - prefers-reduced-motion 直接跳过
 * - 文章页不挂载，本动画只属于首页
 */
export function usePageLoader() {
  const played = readPlayed()
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const done = ref(false)
  const visible = ref(!played && !reduce)
  const sheetAOut = ref(false)
  const sheetBOut = ref(false)

  const timers: number[] = []
  let finished = false

  function finish(): void {
    if (finished) return
    finished = true
    done.value = true
    visible.value = false
    document.body.classList.remove('loading')
    markPlayed()
    for (const timer of timers) window.clearTimeout(timer)
    timers.length = 0
  }

  function schedule(callback: () => void, delay: number): void {
    timers.push(window.setTimeout(callback, delay))
  }

  if (visible.value) document.body.classList.add('loading')

  onMounted(() => {
    if (!visible.value) {
      finish()
      return
    }

    schedule(() => {
      sheetAOut.value = true
    }, 1050)
    schedule(() => {
      sheetBOut.value = true
    }, 1520)
    schedule(finish, 2150)
    schedule(finish, 5000) // 兜底
  })

  onBeforeUnmount(() => {
    for (const timer of timers) window.clearTimeout(timer)
    timers.length = 0
    document.body.classList.remove('loading')
  })

  return { done, visible, sheetAOut, sheetBOut }
}
