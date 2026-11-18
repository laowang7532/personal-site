import { onBeforeUnmount } from 'vue'
import flower from '@/assets/stickers/flower.svg?raw'
import heart from '@/assets/stickers/heart.svg?raw'
import note from '@/assets/stickers/note.svg?raw'
import rabbitAutumn from '@/assets/stickers/rabbit-autumn.svg'
import rabbitBlindbox from '@/assets/stickers/rabbit-blindbox.svg'
import rabbitCooking from '@/assets/stickers/rabbit-cooking.svg'
import rabbitNap from '@/assets/stickers/rabbit-nap.svg'
import rabbitParking from '@/assets/stickers/rabbit-parking.svg'
import rabbitRoad from '@/assets/stickers/rabbit-road.svg'
import rabbitRose from '@/assets/stickers/rabbit-rose.svg'
import rabbitShopping from '@/assets/stickers/rabbit-shopping.svg'
import rabbitWinter from '@/assets/stickers/rabbit-winter.svg'
import spark from '@/assets/stickers/spark.svg?raw'
import star from '@/assets/stickers/star.svg?raw'

export interface StickerDef {
  svg?: string
  image?: string
  left?: string
  right?: string
  top?: string
  bottom?: string
  rot: number
  small?: boolean
  size?: number
  kind?: string
}

export interface RabbitArtwork {
  src: string
  label: string
  latin: string
  /** 画这张图的日期，显示在预览卡背面 */
  date?: string
}

/** 可随机出场的兔子贴纸池。 */
export const rabbitPool: RabbitArtwork[] = [
  { src: rabbitAutumn, label: '秋日', latin: 'Autumn', date: '2026.11.07' },
  { src: rabbitRose, label: '玫瑰', latin: 'Rose', date: '2026.11.06' },
  { src: rabbitCooking, label: '下厨', latin: 'Cooking', date: '2026.11.10' },
  { src: rabbitWinter, label: '暖冬', latin: 'Winter', date: '2026.11.20' },
  { src: rabbitShopping, label: '采购', latin: 'Shopping', date: '2026.11.13' },
  { src: rabbitParking, label: '停车', latin: 'Parking', date: '2026.11.15' },
  { src: rabbitRoad, label: '出发', latin: 'On the road', date: '2026.12.04' },
  { src: rabbitNap, label: '打盹', latin: 'Nap', date: '2026.11.14' },
  { src: rabbitBlindbox, label: '盲盒', latin: 'Blind box', date: '2026.11.17' },
]

/** 随机抽 count 张不重复的兔子；每次刷新、每次开关都会重新抽。 */
export function pickRabbits(count = 3): RabbitArtwork[] {
  const pool = [...rabbitPool]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = pool[i]
    pool[i] = pool[j]
    pool[j] = current
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}

export interface RabbitSlot {
  right: string
  top: string
  rot: number
  size: number
}

/** 三只兔子沿右侧竖向错落摆放：避开翻页导轨、页头提示文字与第一行操作按钮。 */
export const rabbitSlots: RabbitSlot[] = [
  { right: '5%', top: '6%', rot: -8, size: 86 },
  { right: '2.5%', top: '18%', rot: 7, size: 68 },
  { right: '6%', top: '36%', rot: -5, size: 74 },
]

export const stickerDefs: StickerDef[] = [
  { svg: spark, right: '18%', top: '34%', rot: 10, small: true, kind: 'spark' },
  { svg: star, left: '2%', top: '7%', rot: -14, small: true, kind: 'star' },
  { svg: heart, right: '4%', bottom: '27%', rot: 5, small: true, kind: 'heart' },
  { svg: note, right: '4%', bottom: '19%', rot: -8, small: true, kind: 'note' },
  { svg: flower, right: '4%', bottom: '12%', rot: 8, small: true, kind: 'flower' },
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
