import { defineConfig, presetUno } from 'unocss'

/**
 * 设计令牌唯一来源。
 * 颜色先写成深浅两套基础调色板，再输出为 :root / html[data-theme='light'] 的 CSS 变量；
 * 组件里只引用变量或 UnoCSS 工具类，不允许出现裸十六进制色值。
 */
const fontSans =
  '-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
const fontMono = 'ui-monospace,SFMono-Regular,Menlo,"SF Mono",monospace'
const ease = 'cubic-bezier(.22,.7,.18,1)'

function rgbTriplet(hex: string): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map(char => char + char)
          .join('')
      : value
  return [0, 2, 4].map(offset => Number.parseInt(full.slice(offset, offset + 2), 16)).join(',')
}

const dark = {
  bg: '#0B0B0D',
  'bg-soft': '#111113',
  'bg-hover': '#151517',
  ink: '#F2EFE9',
  'ink-2': '#A9A49B',
  'ink-3': '#6B675F',
  line: 'rgba(242,239,233,.12)',
  'line-soft': 'rgba(242,239,233,.07)',
  'line-table': 'rgba(242,239,233,.06)',
  orange: '#EA580C',
  'orange-soft': 'rgba(234,88,12,.14)',
  blue: '#2563EB',
  green: '#3FB950',
  'post-text': '#CFCAC1',
  'post-code': '#D8D3CA',
  overlay: 'rgba(255,255,255,.025)',
  'overlay-soft': 'rgba(255,255,255,.012)',
  'tooltip-bg': 'rgba(11,11,13,.72)',
  'flip-shade-strong': 'rgba(0,0,0,.72)',
  'flip-shade-mid': 'rgba(0,0,0,.24)',
  'under-shade': 'rgba(0,0,0,.42)',
  'shadow-sheet': 'rgba(0,0,0,.6)',
  'shadow-sheet-soft': 'rgba(0,0,0,.55)',
  'shadow-sticker': 'rgba(0,0,0,.45)',
  'shadow-rabbit': 'rgba(0,0,0,.5)',
  'index-stroke': 'rgba(242,239,233,.16)',
  'grain-opacity': '0.045',
  'grain-blend': 'normal',
}

const light: typeof dark = {
  bg: '#F5F1E8',
  'bg-soft': '#EFEAE0',
  'bg-hover': '#E7DFD1',
  ink: '#1F1C17',
  'ink-2': '#5B5347',
  'ink-3': '#6F685C',
  line: 'rgba(31,28,23,.16)',
  'line-soft': 'rgba(31,28,23,.09)',
  'line-table': 'rgba(31,28,23,.07)',
  orange: '#C2410C',
  'orange-soft': 'rgba(194,65,12,.12)',
  blue: '#1D4ED8',
  green: '#1A7F37',
  'post-text': '#37322B',
  'post-code': '#403A32',
  overlay: 'rgba(31,28,23,.04)',
  'overlay-soft': 'rgba(31,28,23,.025)',
  'tooltip-bg': 'rgba(245,241,232,.9)',
  'flip-shade-strong': 'rgba(31,28,23,.3)',
  'flip-shade-mid': 'rgba(31,28,23,.09)',
  'under-shade': 'rgba(31,28,23,.13)',
  'shadow-sheet': 'rgba(31,28,23,.18)',
  'shadow-sheet-soft': 'rgba(31,28,23,.14)',
  'shadow-sticker': 'rgba(31,28,23,.22)',
  'shadow-rabbit': 'rgba(31,28,23,.25)',
  'index-stroke': 'rgba(31,28,23,.22)',
  'grain-opacity': '0.1',
  'grain-blend': 'multiply',
}

/** 实色令牌额外输出 rgb 三元组，供 UnoCSS 的透明度修饰与 Canvas 使用 */
const solidKeys = [
  'bg',
  'bg-soft',
  'bg-hover',
  'ink',
  'ink-2',
  'ink-3',
  'orange',
  'blue',
  'green',
  'post-text',
  'post-code',
] as const

function paletteVars(palette: typeof dark): string {
  const all = Object.entries(palette)
    .map(([key, value]) => `--${key}:${value};`)
    .join('')
  const rgb = solidKeys.map(key => `--${key}-rgb:${rgbTriplet(palette[key])};`).join('')
  return all + rgb
}

/** 实色工具类引用变量；line / orange-soft 本身是半透明语义色，保留直接变量引用。
 *  变量是逗号分隔的 rgb 三元组，因此这里用 rgba() 旧语法配合透明度占位符；
 *  rgb(var(--x-rgb) / <alpha-value>) 会拼成「逗号 + 斜杠」的非法值，整条声明会被丢弃。 */
const token = (name: string) => `rgba(var(--${name}-rgb), <alpha-value>)`

const colors = {
  ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
  bg: { DEFAULT: token('bg'), soft: token('bg-soft'), hover: token('bg-hover') },
  line: { DEFAULT: 'var(--line)', soft: 'var(--line-soft)' },
  orange: { DEFAULT: token('orange'), soft: 'var(--orange-soft)' },
  blue: token('blue'),
  green: token('green'),
  post: { DEFAULT: token('post-text'), code: token('post-code') },
}

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors,
    fontFamily: {
      sans: fontSans,
      mono: fontMono,
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      wide: '900px',
    },
  },
  preflights: [
    {
      getCSS: () => `
:root{
${paletteVars(dark)}
color-scheme:dark;
--font-sans:${fontSans};
--font-mono:${fontMono};
--ease:${ease};
--pad:clamp(20px,4vw,64px);
}
html[data-theme='light']{
${paletteVars(light)}
color-scheme:light;
}
`,
    },
  ],
})
