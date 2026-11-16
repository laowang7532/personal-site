import { onBeforeUnmount } from 'vue'
import flower from '@/assets/stickers/flower.svg?raw'
import heart from '@/assets/stickers/heart.svg?raw'
import note from '@/assets/stickers/note.svg?raw'
import rabbit from '@/assets/stickers/rabbit.svg?raw'
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

export const rabbitSvg = rabbit

export const stickerDefs: StickerDef[] = [
  { svg: rabbit, right: '6%', top: '16%', rot: -9 },
  { svg: spark, right: '18%', top: '34%', rot: 10, small: true },
  { svg: rabbit, left: '4%', top: '32%', rot: 12, small: true },
  { svg: heart, right: '4%', bottom: '42%', rot: 5, small: true },
  { svg: star, left: '2%', top: '24%', rot: -14, small: true },
  { svg: flower, right: '4%', bottom: '8%', rot: 8, small: true },
  { svg: note, right: '4%', bottom: '30%', rot: -8, small: true },
]

/**
 * 贴纸拖拽：pointer events + 边界钳制，松手后轻微随机旋转并抖一下。
 * 与 v1 的手感保持一致。
 */
export function useStickerDrag() {
  const rotations = new WeakMap<HTMLElement, number>()
  let element: HTMLElement | null = null
  let pointerId = -1
  let startX = 0
  let startY = 0
  let originX = 0
  let originY = 0
  let dragging = false
  let wiggleTimer = 0

  function release(target: HTMLElement): void {
    if (pointerId >= 0 && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    pointerId = -1
  }

  function start(event: PointerEvent, def: StickerDef): void {
    const target = event.currentTarget as HTMLElement
    element = target
    pointerId = event.pointerId
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
    release(target)

    const base = rotations.get(target) ?? 0
    const next = Number((base + (Math.random() - 0.5) * 16).toFixed(1))
    rotations.set(target, next)
    target.style.transform = `rotate(${next}deg)`

    window.clearTimeout(wiggleTimer)
    target.classList.add('wiggle')
    wiggleTimer = window.setTimeout(() => target.classList.remove('wiggle'), 650)
  }

  /** 关闭贴纸时取消进行中的拖拽，避免再次开启后残留 dragging 状态。 */
  function cancel(): void {
    if (!element) return
    const target = element
    element = null
    dragging = false
    target.classList.remove('dragging')
    release(target)
  }

  onBeforeUnmount(() => window.clearTimeout(wiggleTimer))

  return { start, move, end, cancel }
}
