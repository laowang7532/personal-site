# 主题切换方案（浅色 / 深色）

> 状态：核心已实施（2026-11-18），截图矩阵与文档收尾待补 ｜ 更新：2026-11-18
> 关联：[方案索引](README.md) ｜ [架构说明](../notes/ARCHITECTURE.md) ｜ [双语方案](i18n-plan.md)

## 0. 结论先行

- 用 **`data-theme` + CSS 变量**实现两套主题，不复制样式表、不逐组件写 `dark:`。
- `uno.config.ts` 仍是设计令牌唯一来源；颜色工具类全部改为引用 CSS 变量。
- 浅色主题是一套**暖纸色**调色板，而不是纯白反色；橙色在浅色下加深，保证小字号对比度。
- 主题开关放在顶栏右侧；文章页单独放一个固定按钮；`localStorage` 记忆，首次访问跟随系统。
- 用 Vite 插件向**所有 HTML 入口**注入内联启动脚本，避免刷新时先闪深色再切浅色。
- 加载彩蛋与贴纸预览卡在两种主题下都保持深色，作为固定的「影院 / 灯箱」视觉。
- 不新增运行时依赖；预计客户端 JS gzip 增加 < 1.5 KB，CSS 增加 < 1 KB。

## 1. 目标与非目标

**目标**

- 全站（首页五个翻页、文章页）都能在浅色 / 深色之间切换；旧链接页只是跳转页，保持现状；
- 刷新、跨页跳转、浏览器前进后退后主题不丢、不闪；
- 首次访问跟随系统偏好；用户手动切换后以用户选择为准；
- 深色保持现有观感不变，浅色可读性达到 WCAG AA（正文与小字号）；
- 不改变布局尺寸、不引入 FOUC、不增加新的 npm 依赖；
- 与后续双语方案正交：两种语言 × 两种主题任意组合都可用。

**非目标**

- 不做第三种主题、自定义强调色、跟随时间的自动切换；
- 不做高对比度 / 护眼模式等额外可访问性主题；
- 不借这次改动重做视觉风格、不改字体与版式；
- 不把加载海报、贴纸手绘素材做成两套图片。

## 2. 现状与约束

### 2.1 主题相关的现状

| 项                     | 现状                                                                                  | 对主题的影响                                             |
| ---------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 设计令牌               | `uno.config.ts` 的 `theme.colors` 是深色十六进制值，preflight 输出 `:root` CSS 变量   | 需要把令牌改成变量，并新增浅色覆盖                       |
| UnoCSS 工具类          | 组件里只用了少量颜色类：`text-orange`、`text-ink-2/3`、`border-line`、`bg-bg-soft` 等 | 这些类的值由构建期固化，必须改成 `var(...)` 才会随主题变 |
| 全局样式               | `base.css` / `article.css` 基本都走 `var(--token)`                                    | 改动小                                                   |
| 首页样式               | `home.css` 有 62 处硬编码色值，集中在加载海报、翻页阴影、贴纸预览、照片占位图          | 需要分类：主题色改令牌，艺术性配色保留                   |
| 入口壳                 | `index.html` 与 `scripts/gen-entries.mjs` 生成的 `posts/*.html` 内联 `html{background:#0B0B0D}` | 需要在首屏绘制前就知道主题，否则闪白 / 闪黑              |
| 自定义光标 / 顶栏      | 使用 `mix-blend-mode: difference`                                                     | 浅色下会反色成浅色，可能不可见，需要单独覆盖             |
| Canvas 纹络            | `useVeins` 启动时读取 `--ink-rgb` / `--orange-rgb` 并缓存                              | 切换主题后需要重新读取颜色并重绘                         |
| 站内资料 / 文章 / 图片 | 与主题无关                                                                            | 不需要改数据                                             |

### 2.2 硬性约束

- 纯静态 MPA：每次跳转是整页刷新，主题状态必须在每个文档里独立恢复；
- Caddy 配置不可改：不能依赖服务端注入、Cookie 或 rewrite；
- 首屏预算：当前首页 JS gzip 约 51.3 KB、CSS 约 9.8 KB，预算上限 60 KB / 15 KB；
- 现有深色观感是设计基线，主题改造不能顺带改深色。

## 3. 备选方案与选择

| 方案                                      | 做法                                                                   | 优点                                             | 缺点                                                         | 结论 |
| ----------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ | ---- |
| **A. `data-theme` + CSS 变量**            | 在 `<html>` 上切属性，变量整体换值；Uno 颜色引用变量                    | 改动集中、无重复 CSS、运行时零成本、易扩展第三套 | 需要把 Uno 颜色改成变量；硬编码颜色要逐个清理                | ✅ 采用 |
| B. 构建两套 CSS，切换 `<link>`           | 生成 `dark.css` / `light.css`，按钮换样式表                            | 不需要改变量                                     | 两套样式重复、切换闪烁、构建与缓存复杂、组件类仍要两套值      | ❌    |
| C. 只用 `prefers-color-scheme` 媒体查询  | 不做手动开关，跟随系统                                                 | 实现最简单                                       | 用户无法手动切换，不满足「可以切换」的要求                    | ❌    |
| D. 逐组件 `dark:` 变体                   | 给每个颜色类补 `dark:` 版本                                            | 思路直观                                         | 站点已有语义令牌，逐类改会重复且容易漏；浅色需要改的地方更多  | ❌    |

选 A 的核心理由：站点的颜色本来就集中在设计令牌里，语义色（`ink` / `bg` / `line`）比「深色模式补丁」更适合整体换值；组件不需要知道当前主题。

## 4. Token 架构

### 4.1 三层结构

```
基础调色板（dark / light 两套）
        ↓  写入 :root[data-theme=...] 的 CSS 变量
语义令牌（--bg / --ink / --line / --orange / ...）
        ↓  被 UnoCSS 工具类与 src/styles/*.css 引用
组件与页面
```

- 组件只使用语义令牌，不出现裸色值；
- 浅色只覆盖变量值，不改组件结构；
- 如果需要新增颜色，先加到令牌表，再使用。

### 4.2 UnoCSS 颜色改为变量

当前：

```ts
const colors = {
  ink: { DEFAULT: '#F2EFE9', 2: '#A9A49B', 3: '#6B675F' },
  bg: { DEFAULT: '#0B0B0D', soft: '#111113', hover: '#151517' },
  line: { DEFAULT: 'rgba(242,239,233,.12)', soft: 'rgba(242,239,233,.07)' },
  orange: { DEFAULT: '#EA580C', soft: 'rgba(234,88,12,.14)' },
  blue: '#2563EB',
  green: '#3FB950',
  post: { DEFAULT: '#CFCAC1', code: '#D8D3CA' },
}
```

改为：

```ts
/** 实色令牌：同时支持 text-ink/70 这类透明度修饰 */
const token = (name: string) => `rgba(var(--${name}-rgb), <alpha-value>)`

const colors = {
  ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
  bg: { DEFAULT: token('bg'), soft: token('bg-soft'), hover: token('bg-hover') },
  // line / orange-soft 本身带透明度，保留直接变量引用
  line: { DEFAULT: 'var(--line)', soft: 'var(--line-soft)' },
  orange: { DEFAULT: token('orange'), soft: 'var(--orange-soft)' },
  blue: token('blue'),
  green: token('green'),
  post: { DEFAULT: token('post-text'), code: token('post-code') },
}
```

说明：

- 变量是逗号分隔的 `rgb` 三元组，透明度占位符必须写成 `rgba(var(--x-rgb), <alpha-value>)`；
- **不要写 `rgb(var(--x-rgb) / <alpha-value>)`**：它会拼成 `rgb(31,28,23 / 1)`，逗号与斜杠混用是非法值，
  整条 `color` 声明会被浏览器丢弃，元素回退到继承的 `--ink`。首次实现时踩过这个坑，表现就是
  「所有 `text-ink-2` / `text-ink-3` / `text-orange` 都变成主文字色」；现已改为 `rgba()` 写法并加注释；
- `line` 这类「语义上就是半透明」的颜色继续用 `var(--line)`，避免把基础透明度算错；
- 每种实色都要在 preflight 同时输出 `--x` 与 `--x-rgb`；Canvas 纹络继续读 `--ink-rgb` / `--orange-rgb`。

### 4.3 preflight 输出两套变量

```ts
const dark = { bg: '#0B0B0D', 'bg-soft': '#111113', /* ... */ }
const light = { bg: '#F5F1E8', 'bg-soft': '#EFEAE0', /* ... */ }

function block(selector: string, p: Record<string, string>): string {
  const vars = Object.entries(p)
    .map(([key, value]) => `--${key}:${value};`)
    .join('')
  const rgb = ['bg', 'bg-soft', 'bg-hover', 'ink', 'ink-2', 'ink-3', 'orange', 'blue', 'green', 'post', 'post-code']
    .map(key => `--${key}-rgb:${rgbTriplet(p[key])};`)
    .join('')
  return `${selector}{${vars}${rgb}}`
}

// getCSS 返回：:root 深色默认 + html[data-theme='light'] 浅色覆盖
```

不在 CSS 里写 `@media (prefers-color-scheme: light)`：启动脚本会把系统偏好解析成具体的 `data-theme`，CSS 只需要处理两个确定值，避免「媒体查询 + 手动属性」叠加出的优先级问题。

### 4.4 令牌对照表

| 令牌                | 深色（现有）                 | 浅色（建议）                  | 用途 / 备注                               |
| ------------------- | ---------------------------- | ----------------------------- | ----------------------------------------- |
| `--bg`              | `#0B0B0D`                    | `#F5F1E8`                     | 页面底色，暖纸色                          |
| `--bg-soft`         | `#111113`                    | `#EFEAE0`                     | 卡片、代码块、目录                        |
| `--bg-hover`        | `#151517`                    | `#E7DFD1`                     | 悬停背景                                  |
| `--ink`             | `#F2EFE9`                    | `#1F1C17`                     | 主文字；暖黑，不用纯黑                    |
| `--ink-2`           | `#A9A49B`                    | `#5B5347`                     | 次级文字                                  |
| `--ink-3`           | `#6B675F`                    | `#6F685C`                     | 弱化文字、日期、说明                      |
| `--line`            | `rgba(242,239,233,.12)`      | `rgba(31,28,23,.16)`          | 边框                                      |
| `--line-soft`       | `rgba(242,239,233,.07)`      | `rgba(31,28,23,.09)`          | 弱边框                                    |
| `--line-table`      | `rgba(242,239,233,.06)`      | `rgba(31,28,23,.07)`          | 表格分隔线                                |
| `--orange`          | `#EA580C`                    | `#C2410C`                     | 强调色；浅色下加深以保证小字对比度        |
| `--orange-soft`     | `rgba(234,88,12,.14)`        | `rgba(194,65,12,.12)`         | 橙色浅底                                  |
| `--blue`            | `#2563EB`                    | `#1D4ED8`                     | 文章链接                                  |
| `--green`           | `#3FB950`                    | `#1A7F37`                     | 完成状态                                  |
| `--post-text`       | `#CFCAC1`                    | `#37322B`                     | 文章正文                                  |
| `--post-code`       | `#D8D3CA`                    | `#403A32`                     | 代码块文字                                |
| `--overlay`         | `rgba(255,255,255,.025)`     | `rgba(31,28,23,.04)`          | 悬停叠层                                  |
| `--overlay-soft`    | `rgba(255,255,255,.012)`     | `rgba(31,28,23,.025)`         | 弱叠层                                    |
| `--tooltip-bg`      | `rgba(11,11,13,.72)`         | `rgba(245,241,232,.9)`        | 翻页导轨提示、贴纸开关悬停                |
| `--flip-shade-strong` | `rgba(0,0,0,.72)`          | `rgba(31,28,23,.3)`           | 翻页左侧强阴影                            |
| `--flip-shade-mid`  | `rgba(0,0,0,.24)`            | `rgba(31,28,23,.09)`          | 翻页中段阴影                              |
| `--under-shade`     | `rgba(0,0,0,.42)`            | `rgba(31,28,23,.13)`          | 后退翻页时被盖住页面的压暗                |
| `--shadow-sheet`    | `rgba(0,0,0,.6)`             | `rgba(31,28,23,.18)`          | 纸张投影                                  |
| `--shadow-sheet-soft` | `rgba(0,0,0,.55)`          | `rgba(31,28,23,.14)`          | 纸张内侧阴影                              |
| `--shadow-sticker`  | `rgba(0,0,0,.45)`            | `rgba(31,28,23,.22)`          | 贴纸投影                                  |
| `--shadow-rabbit`   | `rgba(0,0,0,.5)`             | `rgba(31,28,23,.25)`          | 兔子贴纸投影                              |
| `--index-stroke`    | `rgba(242,239,233,.16)`      | `rgba(31,28,23,.22)`          | 首屏「01」描边；比普通边框略强            |
| `--grain-opacity`   | `0.045`                      | `0.1`                         | 颗粒质感；浅色下需要更明显                |
| `--grain-blend`     | `normal`                     | `multiply`                    | 浅色下用正片叠底，让深色颗粒吃进纸色      |

### 4.5 对比度校验

浅色候选值实测（WCAG 对比度，背景 `#F5F1E8`）：

| 组合                     | 对比度 | 结论                                         |
| ------------------------ | ------ | -------------------------------------------- |
| `ink` / `bg`             | 15.06  | 通过                                         |
| `ink-2` / `bg`           | 6.72   | 通过；与主文字拉开层级                       |
| `ink-3` / `bg`           | 4.89   | 通过（小字号 AA 需 ≥ 4.5）                   |
| `orange` / `bg`          | 4.59   | 通过（因此浅色用 `#C2410C`，不用 `#EA580C`） |
| `post-text` / `bg`       | 11.27  | 通过                                         |
| `blue` / `bg`            | 5.95   | 通过                                         |
| `green` / `bg`           | 4.51   | 通过                                         |

深色现状：`ink` 17.14、`ink-2` 7.93、`orange` 5.52；`ink-3` 约 3.49，低于小字号 AA。本次**不改**深色 `ink-3`（保持现有观感），
如果以后做可访问性专项，再单独提亮到约 `#7B766C`，不要混在主题改造里。

## 5. 主题状态与切换

### 5.1 状态来源

```ts
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'personal-site:theme'

// 优先级：启动脚本已写入的 data-theme > localStorage > 系统偏好 > dark
```

- `localStorage` 只存 `light` / `dark`；**不存 `system`**；
- 没有存值时跟随系统；用户一旦手动切换，就写入具体值，不再跟随系统；
- 清除站点数据后回到系统偏好。

### 5.2 `useTheme` composable

新增 `src/composables/useTheme.ts`（示意）：

```ts
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'personal-site:theme'
const media = window.matchMedia('(prefers-color-scheme: light)')

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function system(): Theme {
  return media.matches ? 'light' : 'dark'
}

function initial(): Theme {
  return (document.documentElement.dataset.theme as Theme | undefined) ?? stored() ?? system()
}

const theme = ref<Theme>(initial())

export function applyTheme(next: Theme): void {
  theme.value = next
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'light' ? '#F5F1E8' : '#0B0B0D')
}

export function toggleTheme(): void {
  const next = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 隐私模式只影响记忆，不影响本次切换
  }
}

export function useTheme() {
  return { theme, toggleTheme }
}

// 系统主题只在没有显式选择时跟随
media.addEventListener('change', () => {
  if (!stored()) applyTheme(system())
})

// 多标签页同步
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) applyTheme(stored() ?? system())
})

// 从 bfcache 返回时重新对齐，避免恢复旧文档的旧主题
window.addEventListener('pageshow', event => {
  if (event.persisted) applyTheme(stored() ?? system())
})
```

要点：

- `initial()` 先读 `data-theme`，保证与启动脚本一致；
- `color-scheme` 同步设置，让原生滚动条、表单控件跟随主题；
- 不监听 `prefers-color-scheme` 的初始值，只监听变化，避免覆盖手动选择；
- 多标签页与 bfcache 是 MPA 场景下最容易漏的两处。

### 5.3 切换按钮

新增 `src/components/ThemeToggle.vue`：

- `<button type="button">`，44×44 触控热区；
- 图标表示**将要切换到的主题**：深色时显示太阳，浅色时显示月亮；
- 动态 `aria-label` + `title`：`切换到浅色主题` / `切换到深色主题`；
- `focus-visible` 有 2px 橙色描边；
- 不改变顶栏布局高度，图标占位固定。

放置位置：

| 页面     | 位置                                                                 |
| -------- | -------------------------------------------------------------------- |
| 首页     | `TopBar.vue` 右侧工具区，时钟左侧；封面页也可见（导航此时隐藏）       |
| 文章页   | `PostPage.vue` 右上角固定按钮，`top: 12px; right: var(--pad)`         |

移动端注意：英文导航 + 语言切换 + 主题按钮同时出现时，320–375px 可能拥挤；在 ≤640px 下压缩导航间距、
语言切换缩成 `中 / EN` 紧凑链接；若 320px 仍溢出，把语言与主题合并成一个固定右上角工具组（实现时以截图验收为准）。

### 5.4 切换动效

- 核心方案：**即时切换**，不做全站颜色过渡，避免大面积 `transition` 带来的卡顿与误触发；
- 可选增强：用 `document.startViewTransition` 做一次 240ms 的圆形揭示 / 交叉淡入，检测 API 与
  `prefers-reduced-motion`，不支持就即时切换；
- 不允许用 `html.theme-anim * { transition: ... }` 这种全量选择器，它会让翻页、贴纸拖拽也产生额外过渡。

## 6. 防闪烁与入口注入

### 6.1 为什么需要内联脚本

MPA 每次导航都是新文档。CSS 文件要等网络请求才生效；如果只靠 Vue 挂载后再设置主题，浅色用户会先看到深色背景（或反之）。
因此必须在 `<head>` 里、样式绘制前同步执行一段极小的脚本。

### 6.2 由 Vite 插件统一注入

新增 `vite/theme-boot.ts`，用 `transformIndexHtml` 注入到所有 HTML 入口（`index.html`、`en/index.html`、所有
`posts/*.html` / `en/posts/*.html`），避免在 `index.html` 与 `gen-entries.mjs` 里各维护一份：

```ts
const BOOT = `(function(){try{var s=localStorage.getItem('personal-site:theme');var t=s==='light'||s==='dark'?s:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='light'?'#F5F1E8':'#0B0B0D')}catch(e){document.documentElement.dataset.theme='dark'}})()`

const CRITICAL = `html{background:#0B0B0D}html[data-theme="light"]{background:#F5F1E8}`

export function themeBootPlugin(): Plugin {
  return {
    name: 'personal-site:theme-boot',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          { tag: 'script', children: BOOT, injectTo: 'head-prepend' },
          { tag: 'style', children: CRITICAL, injectTo: 'head' },
        ],
      }
    },
  }
}
```

同时在 `vite.config.ts` 的 `plugins` 中注册，位置放在 `profileHtmlPlugin` 之前或之后都可以，但必须在 HTML 注入阶段生效。

配套清理：

- 删除 `index.html` 与 `scripts/gen-entries.mjs` 里的 `<style>html{background:#0B0B0D}</style>`，避免与插件注入的
  关键样式重复、顺序打架；
- `<meta name="theme-color" content="#0B0B0D">` 加进入口壳（或由插件注入），启动脚本与 `useTheme` 负责更新；
- `docs/web-101.html` 不是 Vite 入口，不受影响；它只是跳转页，保持深色即可。

### 6.3 验证不会重复注入

- `transformIndexHtml` 对每个 HTML 入口执行一次；不要在插件里再用正则拼接 `<head>`；
- dev 和 build 都走同一插件，避免「开发正常、构建后闪烁」；
- 构建后检查 `dist/index.html` 与 `dist/posts/*.html` 的 `<head>` 顺序：启动脚本在最前，关键样式紧随其后。

## 7. 逐文件改动清单

| 文件 / 目录                         | 改动                                                                                                   | 类型     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| `uno.config.ts`                     | 颜色 token 改为 `rgb(var(--x-rgb)/<alpha-value>)`；preflight 输出深 / 浅两套变量；补 `--tooltip-bg` 等 | 核心     |
| `vite/theme-boot.ts`                | 新增：注入启动脚本与关键背景样式                                                                       | 新增     |
| `vite.config.ts`                    | 注册 `themeBootPlugin()`                                                                               | 配置     |
| `src/composables/useTheme.ts`       | 新增：主题状态、切换、持久化、系统 / 多标签 / bfcache 同步                                             | 新增     |
| `src/components/ThemeToggle.vue`    | 新增：太阳 / 月亮按钮                                                                                  | 新增     |
| `src/components/TopBar.vue`         | 右侧加入 `ThemeToggle`；浅色下取消 `mix-blend-difference`                                               | 组件     |
| `src/pages/PostPage.vue`            | 右上角加入 `ThemeToggle`                                                                               | 页面     |
| `src/styles/base.css`               | `color-scheme`、`accent-color`、颗粒透明度变量、选区颜色；浅色下 `body::after` 透明度                   | 样式     |
| `src/styles/theme.css`              | 新增：无法令牌化的浅色覆盖（blend mode、特殊卡片）；在 `App.vue` 引入                                   | 新增     |
| `src/styles/home.css`               | 翻页阴影 / 导轨提示 / 贴纸开关悬停改用变量；海报与贴纸预览保留艺术色                                    | 样式     |
| `src/styles/article.css`            | 基本不动；检查 `pre`、表格、引用在浅色下的对比度                                                        | 样式     |
| `src/composables/useVeins.ts`       | 监听主题变化，重新读取 `--ink-rgb` / `--orange-rgb` 并重绘                                              | 逻辑     |
| `src/components/StickerLayer.vue`   | 开关悬停背景改 `--tooltip-bg`；预览卡保持深色并加注释说明                                               | 组件     |
| `index.html`                        | 删除内联背景样式；补 `theme-color`；保持 `lang`                                                         | 入口     |
| `scripts/gen-entries.mjs`           | 删除内联背景样式；生成的文章壳同样由插件注入                                                            | 脚本     |
| `scripts/snapshot.mjs`              | 增加主题维度截图（可用 `prefers-color-scheme` 或预置 `localStorage`）                                   | 脚本     |
| `notes/ARCHITECTURE.md` / `README.md` | 实施完成后补「主题」章节与命令说明                                                                     | 文档     |

## 8. 硬编码颜色处理

`home.css` 的 62 处色值按用途分三类：

### 8.1 改为主题令牌

| 选择器 / 位置                         | 现状                                      | 改为                               |
| ------------------------------------- | ----------------------------------------- | ---------------------------------- |
| `.deck-rail-label` 背景               | `rgba(11,11,13,.72)`                      | `var(--tooltip-bg)`                |
| `.sticker-toggle:hover` 背景          | `rgba(17,17,19,.55)`                      | `var(--tooltip-bg)`                |
| `.deck-page::after` 翻页阴影          | `rgba(0,0,0,.72)` / `.24` / `transparent` | `var(--flip-shade-strong)` / `var(--flip-shade-mid)` / `transparent` |
| `.deck-page.is-flip-under::after`     | `rgba(0,0,0,.42)`                         | `var(--under-shade)`               |
| `.sheet` / `.sheet::after` 阴影       | `var(--shadow-sheet)` / `var(--shadow-sheet-soft)` | 已在用变量，补浅色值       |
| `body::after` 颗粒                     | `opacity: .035`                           | `opacity: var(--grain-opacity)`    |
| `index.html` / 入口壳背景             | `#0B0B0D`                                 | 由 `theme-boot` 注入两套关键样式   |

### 8.2 保留为固定深色 / 艺术性配色

这些颜色是**素材或灯箱的一部分**，不随主题变化：

- 加载彩蛋：`.sheet-a` 的 `#05070d`、`.poster-*` 的深色环境光、海报边框、扫光白色高光；
- 贴纸预览：`.sticker-preview-face` / `-back` / `-art` 的暖黑卡面、橙色光晕；
- 照片墙占位：`.t1`–`.t8` 的渐变；这些是「图片」而非页面背景；
- 图片上的遮罩：`.tile figcaption` 的黑色渐变、`.sticker-preview-scrim` 的深色遮罩；
- 贴纸本身的纸色：`.sticker-peek` 的 `#f7f1e4` 等。

在 `home.css` 对应位置加一行注释：`/* 固定深色：加载 / 灯箱视觉，不随主题变化 */`，防止后人误改。

### 8.3 混合模式单独处理

`mix-blend-mode: difference` 依赖「亮字压暗底」；浅色底上深色字反色后仍是浅色，会不可见。新增
`src/styles/theme.css`：

```css
/* 浅色下取消反色混合，改用普通叠色 */
html[data-theme='light'] .topbar {
  mix-blend-mode: normal;
  color: var(--ink);
}

html[data-theme='light'] .cursor {
  mix-blend-mode: normal;
  background: var(--ink);
}

html[data-theme='light'] .cursor.grow {
  background: var(--orange);
}
```

顶栏如果压到照片等复杂背景上，浅色下可加一层半透明背景或 `backdrop-filter`，以截图验收为准。

## 9. 组件与动效细节

### 9.1 Canvas 纹络

`useVeins` 在 `start()` 时读取变量并缓存。主题切换后：

```ts
watch(theme, () => {
  inkRgb = readRgb('ink')
  orangeRgb = readRgb('orange')
  // 已生成的曲线保留，按新颜色重画一帧或重新 buildCurves
})
```

如果只在启动时读一次，浅色用户会看到深色的纹络颜色（或反之），这是容易漏的细节。切换主题属于低频操作，
直接重画一帧即可，不需要重建曲线。

### 9.2 翻页

- 翻页阴影变量化后，浅色下阴影更轻，纸张翻动的层次仍然保留；
- 翻页逻辑、z-index、hash、滚轮阈值全部不动；
- `prefers-reduced-motion` 行为不变。

### 9.3 贴纸与加载

- 贴纸位置、拖拽、随机池不动；
- 贴纸开关的悬停底色换令牌；
- 预览卡的深色卡面保留，且在浅色主题下反而更能突出手绘纸纹；
- 加载彩蛋保持深色，理由与预览卡相同：它是全屏、短时、强氛围的「电影时刻」，不参与页面主题。
  如果作者希望浅色下也换，再单独做一套浅色海报环境光，不纳入本次范围。

### 9.4 文章页

- `.post-body`、`pre`、`.toc`、`.note`、表格全部走令牌，浅色下自动生效；
- 检查 `--line-table` 在浅色下是否过淡；
- 代码高亮没有第三方主题，只有 `--post-code`，无需额外处理。

### 9.5 颗粒与装饰线

- 颗粒层 `body::after` 必须盖过首页 `.deck`（z-index 2）与顶栏（600），否则首页的纸纹会被不透明的
  `.deck-page` 背景完全盖住。现在固定在 `z-index: 650`，低于光标（8000）、贴纸预览（880）和加载彩蛋（9000）。
- 浅色颗粒用 `opacity: .1` + `mix-blend-mode: multiply`，让深色噪点吃进纸色；深色保持 `.045` + `normal`。
- 首屏「01」描边使用独立的 `--index-stroke`（浅色 `.22`、深色 `.16`），不再复用 `--line`；
  否则浅色下 1px 描边几乎看不见。
- 浅色下翻页导轨的说明文字与未激活横线略提亮（`opacity: .82` / `.58`），补足浅底上细线的可见度。

## 10. 验收标准

| 项               | 通过条件                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| 主题覆盖         | 首页五个翻页、文章页在深 / 浅两套下都正确显示；旧链接页仅跳转，保持现状                              |
| 无闪烁           | 预置 `localStorage=light` 后硬刷新（禁用缓存 / 降速 3G），首帧就是浅色；深色同理                     |
| 持久化           | 刷新、跨页跳转、前进后退后主题保持；新标签页与旧标签页通过 `storage` 同步                            |
| 系统跟随         | 清除存储后，切换系统 `prefers-color-scheme` 页面跟随；手动切换后不再被系统覆盖                        |
| 对比度           | 浅色下正文、`ink-2`、`ink-3`、橙色小字达到 AA；深色保持现状                                          |
| 混合模式         | 浅色下顶栏文字、自定义光标本体可见；不出现「反色后消失」                                             |
| 布局             | 1280 / 768 / 500 / 375 / 320 无横向溢出；切换主题不引起布局位移                                      |
| 动效             | 翻页、纹络、贴纸拖拽、加载彩蛋在两种主题下手感一致；reduced-motion 下无额外过渡                       |
| 工程             | `npm run lint`、`npm run typecheck`、`npm run build` 通过；JS gzip ≤ 60 KB、CSS gzip ≤ 15 KB          |
| 回归             | 深色模式与改造前截图对比，除令牌化带来的微小阴影差异外，布局与主色不变                                |

截图矩阵建议：`{zh, en} × {dark, light} × {1280, 768, 500}`，首页额外覆盖五个翻页；具体实现见
[双语方案 §10](i18n-plan.md#10-验收标准)。

## 11. 视觉与交互决策

| 决策                         | 结论                                                                 | 理由                                                                 |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 浅色底色                     | `#F5F1E8` 暖纸色，不用纯白                                           | 与站点的手绘、纸张、贴纸气质一致；纯白会让橙色与颗粒显得脏           |
| 浅色橙色                     | `#C2410C`                                                            | `#EA580C` 在浅底上对比度只有 3.16，小字号不达标                      |
| 加载彩蛋                     | 两套主题都深色                                                       | 全屏短时氛围，换浅色会削弱电影感；进入首页后立即回到用户选择的主题   |
| 贴纸预览卡                   | 两套主题都深色                                                       | 灯箱式展示，深底更能突出纸纹与暖光                                   |
| 深色 `ink-3`                 | 暂不调整                                                             | 保持现有观感；可访问性专项另做                                       |
| 切换动效                     | 默认即时；可选 View Transition 圆形揭示                              | 避免全站颜色过渡造成卡顿；能力检测 + reduced-motion 降级             |
| 主题按钮图标                 | 显示目标主题（太阳 / 月亮）                                          | 用户一眼知道点下去会变成什么                                         |
| 主题按钮位置                 | 首页顶栏右侧，文章页右上角固定                                       | 与现有导航工具区一致；文章页没有顶栏，单独补一个                     |

## 12. 实施批次

### 批次 T1 — 令牌与主题骨架

- 改 `uno.config.ts`：变量化颜色、双套 preflight；
- 新增 `useTheme.ts`、`ThemeToggle.vue`、`vite/theme-boot.ts`；
- 顶部导航与文章页接入开关；
- 清理入口壳内联背景；
- 验收：切换按钮可用、刷新不闪、深色观感不变。

### 批次 T2 — 硬编码清理与浅色打磨

- 按第 8 节处理 `home.css` 的翻页阴影、导轨提示、贴纸开关；
- 新增 `theme.css` 处理 blend mode；
- `useVeins` 监听主题；
- 对比度与 320px 布局检查；
- 验收：浅色下所有页面可读，无「看不见」的元素。

### 批次 T3 — 截图矩阵与文档

- `snapshot.mjs` 增加主题参数；
- 输出双主题 × 双语言 × 三档宽度截图；
- 更新 `README.md`、`notes/ARCHITECTURE.md`、`CHANGELOG.md`；
- 验收：文档能指导别人新增一个主题令牌或排查主题闪烁。

## 13. 风险与对策

| 风险                                       | 影响                                   | 对策                                                                 |
| ------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| Uno 颜色漏改变量                           | 切换主题后个别文字 / 边框仍是深色值     | 全文搜索 `#` 与 `rgba(`，只允许保留第 8.2 节列出的艺术色；加 lint 约定 |
| 首屏闪烁                                   | 浅色用户先看到深色再切换               | Vite 插件 + 内联启动脚本；硬刷新验收                                 |
| 混合模式在浅色下失效                       | 顶栏文字或光标不可见                   | `theme.css` 显式覆盖；截图检查                                       |
| bfcache / 多标签不同步                     | 返回旧页面还是旧主题                   | `pageshow` + `storage` 监听                                          |
| Canvas 纹络颜色不更新                      | 浅色下出现深色线条                     | 监听主题重新读取 `*-rgb` 并重绘                                      |
| 阴影在浅色下过重                           | 页面显脏                               | 单独定义 `--shadow-*` / `--flip-shade-*`，不直接复用深色值             |
| 主题切换波及深色基线                       | 现有视觉回归失败                       | 深色令牌值保持不变；截图对比深色前后                                 |
| 与双语方案冲突                             | 英文页面漏做主题 / 中文页面漏做语言    | 验收矩阵按「语言 × 主题」组合执行                                    |

## 14. 待确认事项

1. **浅色橙色**：本文用 `#C2410C` 保证对比度；如果更看重品牌亮度、可以接受小字略低对比，可改回 `#EA580C`。
2. **切换动效**：是否要做 View Transition 圆形揭示；不做也不影响功能。
3. **深色 `ink-3`**：是否借这次一起提亮到 AA；建议单独做，避免视觉回归范围扩大。

已确认：

- 首次访问**跟随系统**；手动切换后以 `localStorage` 中的选择为准（`personal-site:theme`）。
- 浅色橙色先按 `#C2410C` 实现，等作者看实际效果后再决定是否调整。

## 15. 实施记录（2026-11-18）

### 15.1 已落地

| 文件                                  | 内容                                                                 |
| ------------------------------------- | -------------------------------------------------------------------- |
| `uno.config.ts`                       | 深浅两套调色板；颜色 token 改为 `rgba(var(--x-rgb), <alpha-value>)`；preflight 输出 `:root` 与 `html[data-theme='light']` |
| `vite/theme-boot.ts`                  | 新增：向所有 HTML 入口注入内联启动脚本与关键背景样式                  |
| `vite.config.ts`                      | 注册 `themeBootPlugin()`                                             |
| `src/composables/useTheme.ts`         | 新增：主题状态、切换、持久化、系统偏好、多标签、bfcache 同步          |
| `src/components/ThemeToggle.vue`      | 新增：太阳 / 月亮按钮，动态 `aria-label`                             |
| `src/components/TopBar.vue`           | 右侧工具区加入主题按钮                                               |
| `src/pages/PostPage.vue`              | 右上角固定主题按钮                                                   |
| `src/styles/theme.css`                | 新增：浅色下顶栏 / 光标混合模式覆盖、顶栏纸色渐隐、文章页按钮定位    |
| `src/styles/base.css`                 | 颗粒透明度改用 `--grain-opacity`；新增选区颜色、`accent-color`        |
| `src/styles/home.css`                 | 翻页阴影、导轨提示、贴纸开关悬停改用主题变量；标注固定深色区域        |
| `src/composables/useVeins.ts`         | 监听主题，重新读取 `--ink-rgb` / `--orange-rgb` 并重绘                |
| `index.html` / `scripts/gen-entries.mjs` | 删除固定深色内联样式，统一由 `theme-boot` 注入                     |
| `src/App.vue`                         | 引入 `theme.css`                                                     |

### 15.2 验证结果

| 项               | 结果                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| 类型 / lint       | `npm run typecheck`、`npm run lint` 均通过                                                       |
| 构建             | `npm run build` 通过；JS gzip **53.04 KB**（原 51.29 KB），CSS gzip **10.57 KB**（原 9.85 KB）    |
| 入口注入         | `dist/index.html` 与 `dist/posts/*.html` 的 `<head>` 首个元素是启动脚本，末尾是关键背景样式        |
| 主题解析         | 预置 `light` 刷新后首帧浅色；系统浅色 + 无存储 → 浅色；系统浅色 + 存储 `dark` → 深色              |
| 切换与持久化     | 点击按钮后 `data-theme`、`localStorage`、`meta[theme-color]` 同步；刷新后保持                     |
| 跨页             | 首页 → 文章页 → 首页，主题保持不变；文章页按钮可独立切换                                          |
| 布局             | 1280 / 500 / 375 / 320 截图无横向溢出；320px 内页顶栏（导航 + 主题按钮）不换行、不重叠             |
| 视觉效果         | 浅色首页五个翻页、文章页均已检查；加载彩蛋与贴纸预览保持深色                                      |
| 截图             | 临时截图在 `notes/snapshots/theme-check/`（gitignored），未进入仓库                               |

### 15.3 仍待完成

- 把主题维度并入 `scripts/snapshot.mjs`，自动输出 `{zh,en} × {dark,light} × {1280,768,500}` 矩阵；
- 更新 `notes/ARCHITECTURE.md`、`README.md`、`CHANGELOG.md`（本次已同步）；
- 可选：View Transition 圆形揭示；深色 `ink-3` 提亮；
- 作者确认浅色橙色 `#C2410C` 与顶栏纸色渐隐的观感。

### 15.4 实施后修正（2026-11-18，作者预览反馈）

作者预览浅色主题后反馈「文字都变成黑色、层级不明显，背景纸纹也没了」。排查后确认是两类问题：

1. **UnoCSS 颜色工具类全部失效（主因）**：`token()` 原来写的是
   `rgb(var(--x-rgb) / <alpha-value>)`，而 `--x-rgb` 是逗号分隔的 `31,28,23`，最终拼成
   `rgb(31,28,23 / 1)`。这是非法的混用语法，浏览器丢弃整条 `color`，所有
   `text-ink-2` / `text-ink-3` / `text-orange` 元素回退到继承的 `--ink`，于是次级文字、
   橙色眉题和序号都变成了主文字色。改为 `rgba(var(--x-rgb), <alpha-value>)` 后恢复。
   这是 v2 迁移时就存在的隐性 bug，深色主题同样受影响，只是现在才被主题对比放大。
2. **颗粒层被首页盖住**：`body::after` 原本 `z-index: 1`，而首页 `.deck` 是 2、`.deck-page`
   有不通明的 `var(--bg)` 背景，所以首页的纸纹从来没显示过。现在颗粒层固定到 650，
   高于翻页层与顶栏、低于光标 / 预览 / 加载层；浅色改用 `.1` + `multiply`，深色 `.045` + `normal`。

同时调整了浅色层级与细节：`ink` 改为暖黑 `#1F1C17`，`ink-2` 提到 `#5B5347` 以拉开二级文字，
`ink-3` 微调为 `#6F685C`，边框透明度略增；文章正文改用 `#37322B`。新增 `--index-stroke`
控制「01」描边，浅色导轨说明与横线略提亮。复检结果：构建通过，JS gzip 53.04 KB、
CSS gzip 10.57 KB；深浅两套首页五个翻页、文章页截图在
`notes/snapshots/theme-check-refine/`（仅本地、gitignored）。
