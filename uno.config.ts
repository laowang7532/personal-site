import { defineConfig, presetUno } from 'unocss'

/**
 * 设计令牌唯一来源。
 * 颜色、字体、缓动曲线只在这里定义；组件里用 UnoCSS 工具类或 var(--token) 引用，
 * 不允许出现裸十六进制色值。
 */
const colors = {
  ink: {
    DEFAULT: '#F2EFE9',
    2: '#A9A49B',
    3: '#6B675F',
  },
  bg: {
    DEFAULT: '#0B0B0D',
    soft: '#111113',
    hover: '#151517',
  },
  line: {
    DEFAULT: 'rgba(242,239,233,.12)',
    soft: 'rgba(242,239,233,.07)',
  },
  orange: {
    DEFAULT: '#EA580C',
    soft: 'rgba(234,88,12,.14)',
  },
  blue: '#2563EB',
  post: {
    DEFAULT: '#CFCAC1',
    code: '#D8D3CA',
  },
  green: '#3FB950',
} as const

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
  --bg:${colors.bg.DEFAULT};
  --bg-soft:${colors.bg.soft};
  --bg-hover:${colors.bg.hover};
  --ink:${colors.ink.DEFAULT};
  --ink-2:${colors.ink[2]};
  --ink-3:${colors.ink[3]};
  --line:${colors.line.DEFAULT};
  --line-soft:${colors.line.soft};
  --orange:${colors.orange.DEFAULT};
  --orange-soft:${colors.orange.soft};
  --blue:${colors.blue};
  --post-text:${colors.post.DEFAULT};
  --post-code:${colors.post.code};
  --green:${colors.green};
  --font-sans:${fontSans};
  --font-mono:${fontMono};
  --ink-rgb:${rgbTriplet(colors.ink.DEFAULT)};
  --orange-rgb:${rgbTriplet(colors.orange.DEFAULT)};
  --blue-rgb:${rgbTriplet(colors.blue)};
  --green-rgb:${rgbTriplet(colors.green)};
  --line-table:rgba(242,239,233,.06);
  --overlay:rgba(255,255,255,.025);
  --overlay-soft:rgba(255,255,255,.012);
  --shadow-sheet:rgba(0,0,0,.6);
  --shadow-sheet-soft:rgba(0,0,0,.55);
  --shadow-sticker:rgba(0,0,0,.45);
  --shadow-bear:rgba(0,0,0,.5);
  --ease:${ease};
  --pad:clamp(20px,4vw,64px);
}
`,
    },
  ],
})
