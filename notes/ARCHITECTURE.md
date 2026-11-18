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
| `src/components/`            | 可复用组件：翻页导轨、加载动画、纹络、光标、贴纸、各内容区块、文章目录                        |
| `src/composables/`           | 有状态、有副作用的逻辑：翻页、加载、纹络、贴纸、滚动入场、时钟                                |
| `src/content/posts/`         | 文章正文 + frontmatter，唯一内容源                                                            |
| `src/content/profile.json`   | 个人资料、封面、联系与页脚文案，唯一资料源                                                    |
| `src/content/photos.json`    | 照片墙槽位与照片库索引                                                                        |
| `src/assets/`                | 贴纸与加载海报等本地静态素材                                                                  |
| `src/styles/`                | UnoCSS 难以覆盖的全局样式：reset、grain、keyframes、文章正文排版                              |
| `src/utils/content.ts`       | 构建期读取 md，产出文章列表与详情                                                             |
| `src/utils/profile.ts`       | 资料 JSON 导出、`**强调**` 与换行渲染                                                         |
| `vite/content.ts`            | Markdown 构建插件：gray-matter + markdown-it + 自定义规则                                     |
| `vite/legacy-redirect.ts`    | 原样输出 `docs/web-101.html`，避免 Vite 改写旧链接页                                          |
| `vite/profile-html.ts`       | 把 `profile.json` 的标题与描述注入首页入口壳                                                  |
| `vite/studio.ts`             | 仅 dev 生效的内容工作台：本地 API、原子写入、照片落盘                                         |
| `vite/studio/`               | 工作台前端（HTML / CSS / 原生 JS），不进入生产构建                                            |
| `scripts/`                   | 构建期工具：生成入口、新建文章、发布、截图                                                    |
| `public/`                    | 原样复制到 dist 的静态资源（照片）                                                            |
| `notes/`                     | 内部文档、站内编辑规划与基线截图，不进入构建产物                                              |

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

src/content/profile.json ──► src/utils/profile.ts ──► Hero / About / Contact / Footer
                                   │
src/content/photos.json ───────────┴──► PhotoWall.vue（t1–t8，空槽位用渐变占位）
```

Markdown 解析发生在构建期，markdown-it 不进入客户端 bundle；首屏只包含 Vue 运行时与渲染后的正文。
资料与照片 JSON 直接编进 bundle，体积极小，但改完需要 Vite 热更新或重新构建。

## 4. 样式与 design tokens

- `uno.config.ts` 是**唯一**的配色、字体、缓动、断点来源；`theme.colors` 与服务端渲染的
  CSS 变量（`--ink-rgb`、`--orange-rgb`、`--line-table` 等）都由它生成。
- 常规布局、间距、响应式用 UnoCSS 原子类；以下内容放在 `src/styles/`：
  - `base.css`：reset、border preflight、grain、`.reveal`、View Transitions、reduced-motion；
  - `home.css`：翻页层叠与 3D 动画、翻页导轨、加载动画、首页区块、marquee、照片墙、贴纸、光标、响应式；
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

| 动效            | 出现位置     | 实现                                                                                                        |
| --------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| 首次彩蛋 / 翻页 | 首页首次进入 | `usePageLoader` + `PosterScene`：随机海报卡片 → 小王同学 → 首页；会话内只播放一次                           |
| 首页书页翻动    | 首页         | `useDeck` + `.deck-page`：五页叠放，绕左缘 `rotateY(-112deg)`；前进时当前页翻出，后退时上一页翻回盖住当前页 |
| 渐变纹络        | 首页         | `useVeins` + canvas，曲线算法与 v1 一致；reduced-motion 画静态帧                                            |
| 自定义光标      | 首页桌面端   | `CursorDot.vue` + `useCursor`；触屏与 reduced-motion 不启用；小圆按钮上不放大                               |
| 可拖拽贴纸      | 首页         | `useStickers`，5 枚小贴纸 + 3 张随机兔子（刷新 / 开关重抽，9 选 3 不重复）                                  |
| 贴纸大图预览    | 首页贴纸     | 兔子右上角放大镜按钮；悬停 / 聚焦弹出发光卡，指针 3D 起伏，翻面看绘制日期                                   |
| 贴纸开关        | 首页左上角   | W/H 右侧的 autumn 兔子卡片；`StickerLayer` 内部状态，`localStorage` 记忆；关闭时收贴纸并关预览              |
| 翻页导轨        | 首页右侧     | `DeckRail`：竖排「翻页」，当前页橙色长线；点击跳到对应页                                                    |
| 顶栏导航        | 首页顶栏     | 封面隐藏，翻到内页后淡入并高亮当前页；保留 logo、贴纸开关与时钟                                             |
| 首屏跑马灯      | 首页首屏底部 | 6 组重复内容 + 1/6 位移，无缝循环；标签与组数见 `MarqueeBand.vue`                                           |
| 滚动入场        | 首页         | `useReveal`，IntersectionObserver，阈值与延迟与 v1 一致                                                     |

首页区块组件只负责结构与 Uno 类，不直接操作 DOM；动效统一由 `composables/` 管理，
方便在文章页复用时不带首页副作用。

### 6.1 首页翻页层

- 五个 `section.deck-page` 同时挂载在 `main.deck` 内，`useDeck` 的 `activeIndex`
  决定 `is-active` / `is-before` / `is-after`。离开页固定 `rotateY(-112deg)`，
  `transform-origin: left center`，父层 `perspective: 3000px`。
- 翻页时只有 `flipFrom`（前进）或 `flipTo`（后退）拿到最高 z-index，进入页留在下层，
  纸面阴影 `::after` 随翻动加深；跨页跳转时 `is-skip` 让中间页直接落到终态。
- 两个方向动作不同：前进时当前页 `is-flip-out` 从 0° 翻到 -112°；后退时上一页
  `is-flip-in` 从 -112° 翻回 0°，盖在当前页上方，当前页 `is-flip-under` 同时压暗。
  翻回来的页落定后带 `is-back-landed`，不再叠加内容上浮。
- 每页 `.deck-scroll` 独立纵向滚动，切页后回到顶部；`body.deck-mode` 锁住文档滚动，
  离开首页时释放。文章页仍是普通文档滚动。
- hash 是唯一外部状态：`#top` / `#about` / `#photos` / `#writing` / `#contact`。
  文档内 `a[href^="#"]` 由 `useDeck` 拦截并 `pushState`，`popstate` 恢复页面；
  `←` / `→`、滚轮与单指横滑分别映射上一页 / 下一页。
- 滚轮先交给当前页的 `.deck-scroll`；内容还能滚时原生滚动，到达上下边界后累计
  `deltaY`（可滚动页 70、整页适配页 24）再翻页。翻页动画和随后的惯性滚动用时间戳
  锁住，避免一次滑动连翻多页。
- 非活动页设置 `inert` 与 `aria-hidden`；右侧 `DeckRail` 和一条 `aria-live` 文案
  负责导航与反馈。翻页动画在 `prefers-reduced-motion` 下直接切换。

### 6.2 贴纸与加载彩蛋

贴纸在窄屏（≤640px）隐藏火花、星星与第三只兔子，保留两只兔子、爱心、音符和花；
≤900px 时小贴纸缩到 36px 并收进右侧留白，兔子贴纸缩到 `--sticker-size × 0.8`，
避免压住正文或被翻页导轨挡住。兔子池共 9 张素材：最早一张是透明底剪纸，后 8 张保留
原画纸色并做圆角裁切；每次刷新和每次开关从池中不重复随机抽 3 张，不再有跟随鼠标的
兔子。每张兔子右上角有放大镜按钮，悬停 / 聚焦弹出发光预览卡：深色卡面随指针做左右 /
上下的 3D 起伏，背后是缓慢旋转的橙色光晕；点「翻面」或图片翻到背面，显示这张图的绘制
日期（`rabbitPool[].date`，未填时显示「日期待补充」）。触屏点击打开、点遮罩或按 Esc
关闭；预览打开期间捕获左右方向键，避免误翻后面的页面。所有兔子都是内嵌 WebP 的 SVG
封装，不是矢量描摹。

加载彩蛋由 `PosterScene.vue` 渲染随机电影海报卡片：背景是同一张海报的高斯模糊环境光，
卡片带入场、轻浮动、扫光和底部进度线。`PageLoader.vue` 在新会话从
`src/assets/loader/poster-*.jpg` 随机选一张，并用 `localStorage` 避开上一次播放的那张；
卡片宽度取 `min(78vw, 46vh, 420px)`，手机与桌面都保持海报完整比例，不裁切文字。
海报素材由站点作者提供，版权归原片方。

### 6.3 内容工作台

`vite/studio.ts` 是一个 `apply: 'serve'` 的 Vite 插件：在 dev server 上挂
`/studio` 页面与 `/__studio/api/*` 接口，生产构建里完全不存在。它只接受
`localhost` / `127.0.0.1` / `::1`，没有登录鉴权，因此不能通过 `--host` 暴露。

- 文章：扫描 `src/content/posts/*.md`，frontmatter 用 gray-matter 读写；删除时移到
  `.studio-trash/`（已 gitignore），并可调用 `scripts/gen-entries.mjs` 重建入口壳。
- 照片：浏览器 canvas 先把图片缩到长边 ≤1600px 并导出 WebP，再 POST 原始字节；
  服务端校验 RIFF/WEBP 头、解析 VP8/VP8L/VP8X 尺寸、按内容哈希落盘到
  `public/assets/photos/`，最后把索引写进 `src/content/photos.json`。这样不需要
  sharp 或原生依赖。
- 资料：直接读写 `src/content/profile.json`；`vite/profile-html.ts` 在 dev/build 时
  把标题与描述注入首页入口壳。
- 所有写入走「同目录临时文件 + rename」，JSON 统一 2 空格缩进；路径由 slug 规则、
  固定文件名与内容哈希生成，不接受任意路径。

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

| 页面                     | 布局偏差     | 像素差异                                                                 |
| ------------------------ | ------------ | ------------------------------------------------------------------------ |
| 首页                     | 已改为翻页式 | 不再与 v1 首页逐像素对照；封面 / 关于 / 照片 / 博客 / 联系为预期视觉改版 |
| `posts/web-101.html`     | 0px          | 0                                                                        |
| `posts/hello-world.html` | 0px          | 0                                                                        |
| `posts/why-i-build.html` | 0px          | 0                                                                        |
| `docs/web-101.html`      | 0px          | 0                                                                        |

1280 / 768 / 500 与 375 / 320 宽度下均无页面横向溢出；翻页页面的正文在内部
`.deck-scroll` 中滚动。首屏 JS gzip 约 51.8 KB、CSS gzip 约 9.2 KB，低于
60 KB / 15 KB 的预算；加载彩蛋海报为 3 张本地 JPEG（61–81 KB/张），单次只加载
随机选中的一张。

## 9. 已知取舍

- **保留 v1 的 CSS 特异性怪癖**：`#about .about-text p` 会覆盖 `.big`，导致大段落实际为
  15.5px / 18px 行高。为 0px 漂移，v2 显式保留并在 `AboutSection.vue` 注释说明。
- **文章正文没有改用 Uno / Typography 预设**：`v-html` 内容无法被作用域样式命中，
  手写 `article.css` 是复刻 v1 最稳的方式。
- **入口壳是生成物**：`posts/*.html` 带生成标记，`npm run gen` 只清理带标记的旧文件，
  不会误删 v1 遗留页面；迁移完成后 v1 文件已删除，仓库只保留 v2 结构。
- **照片体积由构建保留**：Studio 上传的文件按内容哈希命名，手动放入 `public/assets/photos/`
  的图片按原名保留；发布时整目录同步，不会每次重传未变的图片。
- **贴纸固定定位**：贴纸始终固定在视口边缘，不随页面内容滚动；窄屏减少数量并把小贴纸
  缩到右侧留白，避免遮挡标题与正文。兔子素材是内嵌 WebP 的 SVG 封装，而不是矢量描摹，
  这样能保留手绘纸纹；最早一张约 76 KB，8 张新素材各 34–48 KB。随机池是 9 选 3，
  一次最多请求抽中的 3 张（另加开关图标直接引用的 autumn），未抽中的不会请求。
- **翻页与滚动并存**：首页用 `body.deck-mode` 禁用文档滚动，但每页内部仍可滚动；
  文章页不加载 `useDeck`，保持浏览器原生的滚动与历史行为。
- **工作台只在 dev**：没有登录、session 与线上写接口，鉴权边界就是「只监听本机」。
  这与服务器不能改 Caddy、没有备案条件的现状匹配；需要远程编辑时优先用 SSH / Tailscale
  隧道，而不是把 Studio 暴露到公网。
- **照片转码在浏览器**：省掉 sharp 与原生依赖，但 Safari 对 WebP 编码的版本有要求；
  工作台是给自己用的，遇到不支持的浏览器就先转成 JPG 再上传。
