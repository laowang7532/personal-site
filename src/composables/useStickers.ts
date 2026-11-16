import { onBeforeUnmount } from 'vue'
import bear from '@/assets/stickers/bear.svg?raw'
import spark from '@/assets/stickers/spark.svg?raw'
import star from '@/assets/stickers/star.svg?raw'

export interface StickerDef {
  svg: string
  left?: string
  right?: string
  top?: string
  bottom?: string
  rot: number
  small?: boolean
}

export const bearSvg = bear

export const stickerDefs: StickerDef[] = [
  { svg: bear, right: '6%', top: '16%', rot: -9 },
  { svg: bear, left: '4%', top: '46%', rot: 12, small: true },
  { svg: spark, right: '16%', bottom: '18%', rot: 8, small: true },
  { svg: star, left: '12%', bottom: '14%', rot: -14, small: true },
  { svg: bear, right: '4%', bottom: '42%', rot: 5, small: true },
]

/**
 * 贴纸拖拽：pointer events + 边界钳制，松手后轻微随机旋转并抖一下。
 * 与 v1 的手感保持一致。
 */
export function useStickerDrag() {
  const rotations = new WeakMap<HTMLElement, number>()
  let element: HTMLElement | null = null
  let startX = 0
  let startY = 0
  let originX = 0
  let originY = 0
  let dragging = false
  let wiggleTimer = 0

  function start(event: PointerEvent, def: StickerDef): void {
    const target = event.currentTarget as HTMLElement
    element = target
    dragging = true
    target.classList.add('dragging')
    target.setPointerCapture(event.pointerId)

    const rect = target.getBoundingClientRect()
    startX = event.clientX
    startY = event.clientY
    originX = rect.left
    originY = rect.top

    target.style.left = `${rect.left}px`
    target.style.top = `${rect.top}px`
    target.style.right = 'auto'
    target.style.bottom = 'auto'

    if (!rotations.has(target)) rotations.set(target, def.rot)
    event.preventDefault()
  }

  function move(event: PointerEvent): void {
    if (!dragging || !element) return
    const nextX = originX + (event.clientX - startX)
    const nextY = originY + (event.clientY - startY)
    element.style.left = `${Math.max(4, Math.min(window.innerWidth - element.offsetWidth - 4, nextX))}px`
    element.style.top = `${Math.max(4, Math.min(window.innerHeight - element.offsetHeight - 4, nextY))}px`
  }

  function end(): void {
    if (!dragging || !element) return
    dragging = false
    const target = element
    element = null
    target.classList.remove('dragging')

    const base = rotations.get(target) ?? 0
    const next = Number((base + (Math.random() - 0.5) * 16).toFixed(1))
    rotations.set(target, next)
    target.style.transform = `rotate(${next}deg)`

    window.clearTimeout(wiggleTimer)
    target.classList.add('wiggle')
    wiggleTimer = window.setTimeout(() => target.classList.remove('wiggle'), 650)
  }

  onBeforeUnmount(() => window.clearTimeout(wiggleTimer))

  return { start, move, end }
}
