import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

interface Curve {
  pts: [number, number][]
  delay: number
  dur: number
  alpha: number
  hot: boolean
  born: number
}

function readRgb(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}-rgb`).trim()
  return value || '0,0,0'
}

/**
 * 渐变纹络背景：算法与 v1 完全一致，颜色从设计令牌读取。
 * 首页加载层退场后才开始绘制。
 */
export function useVeins(canvas: Ref<HTMLCanvasElement | null>, active: Ref<boolean>) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let ctx: CanvasRenderingContext2D | null = null
  let width = 0
  let height = 0
  let dpr = 1
  let curves: Curve[] = []
  let frame = 0
  let resizeTimer = 0
  let started = false
  let mounted = false

  let inkRgb = '0,0,0'
  let orangeRgb = '0,0,0'

  function sizeCanvas(): void {
    const el = canvas.value
    if (!el) return
    ctx = el.getContext('2d')
    if (!ctx) return

    dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    el.width = Math.floor(width * dpr)
    el.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function buildCurves(): void {
    const count = width < 700 ? 7 : 13
    curves = []

    for (let i = 0; i < count; i++) {
      const points: [number, number][] = []
      const steps = 26
      const startY = height * (0.08 + Math.random() * 0.84)
      const amp = 40 + Math.random() * 130
      const freq = 1 + Math.random() * 2.4
      const phase = Math.random() * Math.PI * 2
      const drift = (Math.random() - 0.5) * 180

      for (let step = 0; step <= steps; step++) {
        const t = step / steps
        const x = -60 + t * (width + 120)
        const y =
          startY +
          Math.sin(t * Math.PI * freq + phase) * amp +
          Math.sin(t * Math.PI * freq * 2.7 + phase) * amp * 0.22 +
          t * drift
        points.push([x, y])
      }

      curves.push({
        pts: points,
        delay: 260 + Math.random() * 1500,
        dur: 2600 + Math.random() * 2600,
        alpha: 0.03 + Math.random() * 0.045,
        hot: Math.random() < 0.22,
        born: 0,
      })
    }
  }

  function drawCurve(curve: Curve, progress: number): void {
    if (!ctx) return
    const points = curve.pts
    const total = Math.max(1, Math.floor((points.length - 1) * progress))

    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i <= total; i++) {
      const [x, y] = points[i]
      const [px, py] = points[i - 1]
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2)
    }

    ctx.strokeStyle = curve.hot
      ? `rgba(${orangeRgb},${(curve.alpha * 1.9).toFixed(3)})`
      : `rgba(${inkRgb},${curve.alpha.toFixed(3)})`
    ctx.lineWidth = curve.hot ? 1.1 : 0.8
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function loop(now: number): void {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    let alive = false

    for (const curve of curves) {
      if (!curve.born) curve.born = now + curve.delay
      const progress = (now - curve.born) / curve.dur
      if (progress <= 0) {
        alive = true
        continue
      }
      const eased = 1 - Math.pow(1 - Math.min(progress, 1), 2.2)
      drawCurve(curve, eased)
      if (progress < 1) alive = true
    }

    if (alive) frame = requestAnimationFrame(loop)
  }

  function start(): void {
    if (started || !mounted) return
    started = true

    inkRgb = readRgb('ink')
    orangeRgb = readRgb('orange')

    sizeCanvas()
    if (!ctx) return
    buildCurves()

    if (reduce) {
      curves.forEach(curve => drawCurve(curve, 1))
      return
    }

    frame = requestAnimationFrame(loop)
  }

  function onResize(): void {
    if (!started) return
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      sizeCanvas()
      buildCurves()
      curves.forEach(curve => {
        curve.born = performance.now()
      })
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(loop)
    }, 250)
  }

  onMounted(() => {
    mounted = true
    window.addEventListener('resize', onResize)
    if (active.value) start()
  })

  watch(active, value => {
    if (value) start()
  })

  onBeforeUnmount(() => {
    mounted = false
    cancelAnimationFrame(frame)
    window.clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
  })
}
