import { computed, ref } from 'vue'

export interface DeckPage {
  id: string
  label: string
}

export const deckPages: DeckPage[] = [
  { id: 'top', label: '封面' },
  { id: 'about', label: '关于' },
  { id: 'photos', label: '照片' },
  { id: 'writing', label: '博客' },
  { id: 'contact', label: '联系' },
]

export type DeckDirection = 'forward' | 'back'

function readIndex(): number {
  if (typeof window === 'undefined') return 0
  const id = window.location.hash.replace(/^#/, '') || 'top'
  const index = deckPages.findIndex(page => page.id === id)
  return index < 0 ? 0 : index
}

function flipDuration(): number {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduce ? 80 : 740
}

const activeIndex = ref(readIndex())
const direction = ref<DeckDirection>('forward')
const turning = ref(false)
const flipFrom = ref(activeIndex.value)
const flipTo = ref(activeIndex.value)

const activeId = computed(() => deckPages[activeIndex.value]?.id ?? 'top')
const navVisible = computed(() => activeIndex.value > 0)

let turnTimer = 0
let cleanup: (() => void) | null = null
let touchX = 0
let touchY = 0
let touching = false
let wheelLockUntil = 0
let wheelAccum = 0
let wheelDir = 0
let wheelResetTimer = 0

function pageScroller(index: number): HTMLElement | null {
  const page = deckPages[index]
  if (!page) return null
  return document.getElementById(page.id)?.querySelector<HTMLElement>('.deck-scroll') ?? null
}

function scrollPageToTop(index: number, smooth = false): void {
  pageScroller(index)?.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

function pushHash(id: string): void {
  const base = window.location.pathname + window.location.search
  const current = base + window.location.hash
  const next = id === 'top' ? base : `${base}#${id}`
  if (current === next) return
  // 封面不带 hash，避免历史里出现 #top 与空 hash 两条重复记录
  if (id === 'top' && (!window.location.hash || window.location.hash === '#top')) return
  window.history.pushState({ deck: id }, '', next)
}

export interface GoToOptions {
  /** 是否写入浏览器历史，默认写入 */
  push?: boolean
  /** 翻页动画中是否强制切换（popstate 使用） */
  force?: boolean
}

function goTo(target: number, options: GoToOptions = {}): void {
  const { push = true, force = false } = options
  if (!Number.isInteger(target) || target < 0 || target >= deckPages.length) return

  if (target === activeIndex.value) {
    if (!turning.value) scrollPageToTop(target, true)
    return
  }

  if (turning.value) {
    if (!force) return
    window.clearTimeout(turnTimer)
  }

  direction.value = target > activeIndex.value ? 'forward' : 'back'
  flipFrom.value = activeIndex.value
  flipTo.value = target
  activeIndex.value = target
  turning.value = true
  scrollPageToTop(target)

  if (push) pushHash(deckPages[target].id)

  window.clearTimeout(turnTimer)
  turnTimer = window.setTimeout(() => {
    turning.value = false
    scrollPageToTop(target)
  }, flipDuration())
}

function next(): void {
  goTo(activeIndex.value + 1)
}

function prev(): void {
  goTo(activeIndex.value - 1)
}

function syncFromLocation(): void {
  const index = readIndex()
  if (index === activeIndex.value) return
  goTo(index, { push: false, force: true })
}

function onDocumentClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const target = event.target
  if (!(target instanceof Element)) return

  const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]')
  if (!anchor) return

  const id = anchor.getAttribute('href')?.slice(1) || 'top'
  const index = deckPages.findIndex(page => page.id === id)
  if (index < 0) return

  event.preventDefault()
  goTo(index)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

  const target = event.target
  if (target instanceof HTMLElement) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
      return
    }
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  }
}

/**
 * 滚轮翻页：
 * - 当前页还能往下/往上滚时，先滚内容；
 * - 滚到边界后继续滚，累计到阈值再翻页；
 * - 翻页动画和随后的惯性滚动期间锁住，避免连翻好几页。
 */
function onWheel(event: WheelEvent): void {
  if (event.ctrlKey) return

  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
  const dy = event.deltaY * multiplier
  if (Math.abs(dy) < 0.5 || Math.abs(event.deltaX) > Math.abs(dy)) return

  const now = performance.now()
  if (turning.value || now < wheelLockUntil) {
    event.preventDefault()
    return
  }

  const scroller = pageScroller(activeIndex.value)
  const canScroll = (() => {
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 2) return false
    if (dy > 0) return scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2
    return scroller.scrollTop > 2
  })()

  if (canScroll) {
    wheelAccum = 0
    wheelDir = 0
    return
  }

  const dir = dy > 0 ? 1 : -1
  if (dir !== wheelDir) {
    wheelDir = dir
    wheelAccum = 0
  }
  wheelAccum += Math.abs(dy)

  window.clearTimeout(wheelResetTimer)
  wheelResetTimer = window.setTimeout(() => {
    wheelAccum = 0
    wheelDir = 0
  }, 180)

  const scrollable = scroller ? scroller.scrollHeight > scroller.clientHeight + 2 : false
  const threshold = scrollable ? 70 : 24
  if (wheelAccum < threshold) return

  wheelAccum = 0
  const target = activeIndex.value + dir
  if (target < 0 || target >= deckPages.length) {
    event.preventDefault()
    return
  }

  event.preventDefault()
  wheelLockUntil = now + flipDuration() + 140
  goTo(target)
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1) return
  const target = event.target
  if (!(target instanceof Element)) return
  // 贴纸、预览、按钮、链接上的手势保留给它们自己
  if (
    target.closest(
      '.sticker, .sticker-toggle, .sticker-preview-card, .sticker-preview-scrim, .deck-rail, a, button',
    )
  )
    return

  touchX = event.touches[0].clientX
  touchY = event.touches[0].clientY
  touching = true
}

function onTouchEnd(event: TouchEvent): void {
  if (!touching) return
  touching = false

  const touch = event.changedTouches[0]
  if (!touch) return

  const dx = touch.clientX - touchX
  const dy = touch.clientY - touchY
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) return

  if (dx < 0) next()
  else prev()
}

/** 首页翻页模式：接管 hash、键盘、滑动手势与 body 滚动。 */
export function initDeck(): void {
  if (cleanup) return

  document.body.classList.add('deck-mode')
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
  syncFromLocation()

  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('popstate', syncFromLocation)
  window.addEventListener('hashchange', syncFromLocation)

  cleanup = () => {
    document.body.classList.remove('deck-mode')
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('wheel', onWheel)
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('popstate', syncFromLocation)
    window.removeEventListener('hashchange', syncFromLocation)
    window.clearTimeout(turnTimer)
    window.clearTimeout(wheelResetTimer)
    turning.value = false
    touching = false
    wheelAccum = 0
    wheelDir = 0
    wheelLockUntil = 0
    cleanup = null
  }
}

export function disposeDeck(): void {
  cleanup?.()
}

export function useDeck() {
  return {
    pages: deckPages,
    activeIndex,
    activeId,
    direction,
    turning,
    flipFrom,
    flipTo,
    navVisible,
    goTo,
    next,
    prev,
    initDeck,
    disposeDeck,
  }
}
