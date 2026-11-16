# 架构说明

> 状态：v2 已落地（批次 0–4）。线上仍由 WorkBuddy 定时任务发布。

## 1. 为什么是 MPA

线上 Caddy 的配置不可修改，不能依赖 `try_files` 回退，也不能使用 history 路由。因此每篇文章必须在构建期输出真实的
`posts/<slug>.html`，URL 与 v1 完全一致。Vite 多入口天然满足这一点，且不需要引入 SSR / SSG 框架。

代价是每次跳转整页刷新，用 **Cross-Document View Transitions** 补观感：

```css
@view-transition {
  navigation: auto;
}
```

Chromium / Safari 生效，Firefox 自动降级为普通跳转。

## 2. 目录职责

| 路径                         | 职责                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `index.html`、`posts/*.html` | 极薄入口壳，只负责挂载与 SEO 元信息；`posts/*.html` 由 `scripts/gen-entries.mjs` 依据 md 生成 |
| `src/entries/`               | 入口脚本，读取入口壳上的 `data-page` / `data-slug` 并挂载对应页面                             |
| `src/pages/`                 | 页面级组件：`HomePage.vue`、`PostPage.vue`                                                    |
| `src/components/`            | 可复用组件：加载动画、纹络、光标、贴纸、各内容区块、文章目录                                  |
| `src/composables/`           | 有状态、有副作用的逻辑：加载、纹络、贴纸、滚动入场、时钟                                      |
| `src/content/posts/`         | 文章正文 + frontmatter，唯一内容源                                                            |
| `src/styles/`                | UnoCSS 难以覆盖的全局样式：reset、grain、keyframes、文章正文排版                              |
| `src/utils/content.ts`       | 构建期读取 md，产出文章列表与详情                                                             |
| `vite/content.ts`            | Markdown 构建插件：gray-matter + markdown-it + 自定义规则                                     |
| `vite/legacy-redirect.ts`    | 原样输出 `docs/web-101.html`，避免 Vite 改写旧链接页                                          |
| `scripts/`                   | 构建期工具：生成入口、新建文章、发布、截图                                                    |
| `public/`                    | 原样复制到 dist 的静态资源（照片）                                                            |
| `notes/`                     | 内部文档与基线截图，不进入构建产物                                                            |

## 3. 数据流

```
src/content/posts/*.md
        │  (构建期：gray-matter 解析 frontmatter，markdown-it 渲染正文)
        ▼
vite/content.ts ──► ?markdown 模块 ──► src/utils/content.ts
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
               HomePage.vue                                        PostPage.vue
                    │                                                   │
                    └──────────────► dist/index.html / posts/*.html ◄────┘

scripts/gen-entries.mjs ──► posts/<slug>.html 入口壳（构建前自动执行）
```

Markdown 解析发生在构建期，markdown-it 不进入客户端 bundle；首屏只包含 Vue 运行时与渲染后的正文。

## 4. 样式与 design tokens

- `uno.config.ts` 是**唯一**的配色、字体、缓动、断点来源；`theme.colors` 与服务端渲染的
  CSS 变量（`--ink-rgb`、`--orange-rgb`、`--line-table` 等）都由它生成。
- 常规布局、间距、响应式用 UnoCSS 原子类；以下内容放在 `src/styles/`：
  - `base.css`：reset、border preflight、grain、`.reveal`、View Transitions、reduced-motion；
  - `home.css`：加载动画、首页区块、marquee、照片墙、贴纸、光标、1024px 响应式；
  - `article.css`：v1 `post.css` 的等价迁移，作用域限定在 `.post-wrap` / `.post-body` / `.article-content`。
- 正文排版（表格、引用、代码、`.note`、`.steps`、`.chain`）属于 `v-html` 内容，只能靠全局
  CSS 选择器，因此不拆成 Uno 原子类。
- 命名为 `text-xs` 一类会附带默认行高的 Uno 工具类不要用在需要精确复刻 v1 的位置，
  统一用 `text-[12px]` 这类任意值，避免 1px 基线漂移。

## 5. 文章渲染与目录

- `src/content/posts/*.md` 的 frontmatter 决定列表展示、排序、是否产出页面：
  `draft: true` 的条目只出现在首页列表，不生成入口；`order` 升序，草稿永远排最后。
- `vite/content.ts` 在构建期把 md 转成 `Post` 对象，通过 `?markdown` 查询串交给
  `import.meta.glob(..., { eager: true })`，因此运行时没有 Markdown 解析器。
- 标题锚点使用 `## 标题 {#id}`；`heading_anchors` 规则剥掉 `{#id}`，写入 `id`，并把
  二级标题收集为 `headings`。只有 frontmatter `toc: true` 且存在 headings 时才渲染目录。
- `cjk_strong` 规则修复 CommonMark 的中文加粗边界问题：当闭合 `**` 前是中文标点、后是
  中文字符时，CommonMark 不识别为强调，页面会漏出字面量星号；该规则只处理文本 token，
  不碰代码块。
- 旧链接 `docs/web-101.html` 含 canonical、meta refresh 与兜底 `<a>`；它作为静态文件
  由 `legacyRedirectPlugin` 在 `generateBundle` 阶段原样写入，避免被 Vite 当成入口改写。

## 6. 组件与动效边界

| 动效                  | 出现位置     | 实现                                                               |
| --------------------- | ------------ | ------------------------------------------------------------------ |
| 翻页加载              | 首页首次进入 | `usePageLoader`，`sessionStorage` 记录会话内已播放；文章页不播放   |
| 渐变纹络              | 首页         | `useVeins` + canvas，曲线算法与 v1 一致；reduced-motion 画静态帧   |
| 自定义光标 / 跟随兔子 | 首页桌面端   | `CursorDot.vue` + `useCursor`；触屏与 reduced-motion 不启用        |
| 可拖拽贴纸            | 首页         | `useStickers`，兔子 / 星星 / 花 / 爱心 / 音符 / 火花共 7 枚        |
| 贴纸开关              | 首页右上角   | `StickerLayer` 内部状态，`localStorage` 记忆；关闭时取消跟随与拖拽 |
| 滚动入场              | 首页         | `useReveal`，IntersectionObserver，阈值与延迟与 v1 一致            |

首页区块组件只负责结构与 Uno 类，不直接操作 DOM；动效统一由 `composables/` 管理，
方便在文章页复用时不带首页副作用。贴纸在窄屏（≤640px）隐藏火花与小兔子，保留一枚
兔子、星星、花、爱心和音符。

## 7. 构建与发布

```
npm run build
  ├─ prebuild: npm run gen        生成 posts/<slug>.html
  ├─ vue-tsc --noEmit             类型检查
  └─ vite build                   多入口构建到 dist/
        ├─ dist/index.html
        ├─ dist/posts/*.html
        ├─ dist/docs/web-101.html
        └─ dist/assets/*.{js,css}
```

`npm run deploy` 在构建后写入 `dist/release.json`（文件清单），把 `dist/` 提交到
`dist` 孤儿分支并 push，打印 commit SHA 与 jsDelivr 地址。服务器按该 SHA 从
jsDelivr 下载，失败用 `/var/www/site-prev` 整目录回滚。详细步骤见
[`DEPLOY.md`](DEPLOY.md)。

## 8. 视觉回归结果

基线：`notes/baseline/`，5 个页面 × 1280 / 768 / 500，共 15 张。

| 页面                     | 布局偏差          | 像素差异                                                                  |
| ------------------------ | ----------------- | ------------------------------------------------------------------------- |
| 首页                     | 0px，滚动高度一致 | 贴纸更新前仅时钟/纹络有 75 / 47 / 0 px 动态差；当前贴纸变更为预期视觉差异 |
| `posts/web-101.html`     | 0px               | 0                                                                         |
| `posts/hello-world.html` | 0px               | 0                                                                         |
| `posts/why-i-build.html` | 0px               | 0                                                                         |
| `docs/web-101.html`      | 0px               | 0                                                                         |

500px 下所有页面无横向溢出。首屏 JS gzip 约 43.6 KB、CSS gzip 约 6.5 KB，低于
60 KB / 15 KB 的预算。

## 9. 已知取舍

- **保留 v1 的 CSS 特异性怪癖**：`#about .about-text p` 会覆盖 `.big`，导致大段落实际为
  15.5px / 18px 行高。为 0px 漂移，v2 显式保留并在 `AboutSection.vue` 注释说明。
- **文章正文没有改用 Uno / Typography 预设**：`v-html` 内容无法被作用域样式命中，
  手写 `article.css` 是复刻 v1 最稳的方式。
- **入口壳是生成物**：`posts/*.html` 带生成标记，`npm run gen` 只清理带标记的旧文件，
  不会误删 v1 遗留页面；迁移完成后 v1 文件已删除，仓库只保留 v2 结构。
- **照片不参与哈希**：放在 `public/assets/photos/`，发布时保留，避免每次重传大图。
- **贴纸固定定位不随滚动**：与 v1 一致，贴纸始终固定在视口边缘，滚动时会经过部分内容；
  位置已按 1280 / 768 / 500 的首屏留白校准，窄屏会减少数量避免遮挡标题。
