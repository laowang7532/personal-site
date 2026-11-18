# personal-site

小王同学的个人网站。Vite + Vue 3 + TypeScript + UnoCSS 多页静态站，首页是五页翻页式书页，
文章页保持真实 `posts/<slug>.html` 与普通滚动，构建产物直接丢给 Caddy。

线上地址：<http://154.8.177.56/>

## 环境

- Node.js **>= 22.12**（推荐 22 LTS）
- npm 10+
- 截图脚本需要本机安装 Chrome / Chromium

## 常用命令

```bash
npm ci              # 安装依赖（package-lock.json 已提交）
npm run dev         # 开发服务器，改 md / Vue / CSS 自动热更新
npm run studio      # 打开仅本机可用的内容工作台（/studio）
npm run build       # 生成入口壳 + 类型检查 + 构建到 dist/
npm run preview     # 本地预览 dist/
npm run lint        # ESLint，零警告
npm run format      # Prettier 格式化
npm run new-post -- <slug> "<标题>"   # 新建文章 md
npm run snapshot    # 三档宽度截图：首页五个翻页 + 文章页，输出到 notes/snapshots/
npm run deploy      # 构建 + 推 dist 孤儿分支 + 打印发布 SHA
```

首次 `npm run dev` / `npm run build` 前会自动执行 `npm run gen`，依据
`src/content/posts/*.md` 生成 `posts/<slug>.html` 入口壳，不需要手写。

## 方案与技术文档

所有方案、决策与实施规格都留存在 `docs/`，已落地的实现说明在 `notes/`：

- [方案索引](docs/README.md)：所有方案的清单、状态与关键决策速查；
- [主题切换方案（浅色 / 深色）](docs/theme-plan.md)：令牌架构、浅色调色板、防闪烁、逐文件改动与验收；
- [中英双语方案](docs/i18n-plan.md)：`/en/` URL、文章配对、字典、SEO、脚本与工作台改造；
- [v2 工程化迁移方案](docs/v2-migration-plan.md)：当前 MPA 构建形态的来源；
- 已落地技术说明：[架构](notes/ARCHITECTURE.md)、[内容工作台](notes/AUTHORING.md)、[发布](notes/DEPLOY.md)。

## 目录

```
personal-site/
├── index.html                首页入口壳（只挂载 + SEO）
├── posts/<slug>.html         文章入口壳，由 scripts/gen-entries.mjs 生成
├── docs/web-101.html         旧地址跳转页（必须保留）
├── src/
│   ├── entries/              入口脚本：home.ts / post.ts
│   ├── pages/                HomePage.vue / PostPage.vue
│   ├── components/           区块组件 + 动效组件 + DeckRail + article/ArticleToc.vue
│   ├── composables/          翻页、加载动画、纹络、贴纸、滚动入场、时钟、主题
│   ├── content/posts/*.md    文章唯一内容源（frontmatter + 正文）
│   ├── content/profile.json  个人资料 / 封面 / 联系 / 页脚文案
│   ├── content/photos.json   照片墙槽位与图库索引
│   ├── styles/               base.css / theme.css / home.css / article.css
│   ├── utils/content.ts      构建期读取 md，导出文章列表与详情
│   ├── utils/profile.ts      资料 JSON、**强调**与换行渲染
│   └── types/                Post / Profile / PhotoEntry 类型
├── scripts/
│   ├── gen-entries.mjs       生成文章入口壳
│   ├── new-post.mjs          新建文章
│   ├── deploy.mjs            构建 → dist 孤儿分支 → 打印 SHA
│   ├── snapshot.mjs          三档宽度截图
│   └── lib/posts.mjs         构建期读取 frontmatter
├── public/assets/photos/     照片墙图片（构建后位于 /assets/photos/）
├── docs/                     方案与决策记录（索引、主题、双语、v2 迁移）
├── notes/                    架构、部署、基线截图（不进入构建产物）
├── vite/                     Markdown 插件、旧链接重定向、资料注入、主题启动、内容工作台
│   └── studio/               工作台页面（只在 dev 服务器提供，不进生产构建）
├── uno.config.ts             design tokens 唯一来源
└── vite.config.ts            多页入口 / 插件 / 别名
```

## 写一篇文章

```bash
npm run new-post -- my-post "文章标题"
```

会生成 `src/content/posts/my-post.md`，填好 frontmatter 与正文后：

- `npm run dev` 预览；
- `npm run build` 会生成 `posts/my-post.html` 并自动出现在首页列表；
- 不想要页面时把 `draft: true` 加上（首页仍可显示预告，构建不产出页面）。

frontmatter 字段：

```yaml
title: '文章标题'
date: '2026-11-16' # 或 null
status: '即将' # 可选，列表里替代日期显示
tags: [建站]
summary: '首页列表摘要'
lede: '文章页导语' # 可选，缺省用 summary
minutes: 8 # 预计阅读时间
order: 4 # 首页排序，越小越靠前
toc: true # 可选，显示右侧目录
next: hello-world # 可选，文末下一篇 slug
draft: false # 可选，草稿不产出页面
link: /posts/hello-world.html # 可选，草稿指向的占位链接
```

正文是 markdown-it 渲染的 Markdown，支持原始 HTML。标题锚点写法：

```md
## 第一节 {#first}
```

`toc: true` 时，带 `{#id}` 的二级标题会进入目录。

## 照片墙

运行 `npm run studio`，在「照片」页直接上传：浏览器会转成 WebP（长边 ≤1600px），
再选择放进 t1–t8 哪个格子。数据写入 `src/content/photos.json`，图片落在
`public/assets/photos/`，未选择格子的照片只留在照片库里。不填的格子继续显示内置
渐变占位图。也可以手动把图片放进 `public/assets/photos/` 并编辑 JSON。

## 首页翻页

首页不再纵向滚动，而是五张全屏页：封面 → 关于 → 照片 → 博客 → 联系。点击顶栏导航、
封面按钮或右侧竖排「翻页」导轨后，当前页绕左缘做 3D 翻页，露出下一页。地址栏同步
`#top` / `#about` / `#photos` / `#writing` / `#contact`，可以直接分享或深链；浏览器
前进后退可回到上一页。桌面端可用 `←` / `→`、滚轮或触控板，触屏可横向滑动；页面内容
还能继续滚时先滚内容，滚到边界后再翻页。每页内容在视口内独立滚动，文章页仍然是普通
文档滚动。

实现见 `src/composables/useDeck.ts`（状态、hash、键盘、滑动）、
`src/components/DeckRail.vue`（右侧导航）与 `src/styles/home.css` 的 `.deck*` 规则。
翻页过程中只有当前页与正在翻动的一页参与层叠，其余页面 `inert` 且对读屏隐藏。

## 主题切换

默认跟随系统 `prefers-color-scheme`。首页顶栏右侧、文章页右上角的太阳 / 月亮按钮可以手动切换，
选择写入 `localStorage`（键名 `personal-site:theme`），之后以手动选择为准；清除站点数据会回到跟随系统。

主题在首屏绘制前由 `vite/theme-boot.ts` 注入的内联脚本确定，刷新或跨页不会先闪一下另一套主题。
深浅两套颜色都在 `uno.config.ts` 里定义并输出为 CSS 变量；组件只引用变量。浅色下顶栏与自定义光标会
取消 `mix-blend-mode` 的反色，纸纹改用正片叠底，加载彩蛋和贴纸预览卡则固定深色。

实现入口：[`src/composables/useTheme.ts`](src/composables/useTheme.ts)、
[`src/components/ThemeToggle.vue`](src/components/ThemeToggle.vue)、
[`src/styles/theme.css`](src/styles/theme.css)。完整设计见 [docs/theme-plan.md](docs/theme-plan.md)。

## 贴纸

首页左上角 W/H 右侧的 autumn 兔子卡片开关控制 8 枚可拖拽贴纸：3 张随机兔子 + 火花 /
星星 / 爱心 / 音符 / 花，状态记忆在 `localStorage`。兔子每次刷新页面、每次按下开关都会
从 9 张手绘里重新随机抽 3 张（不重复）；跟随鼠标的贴纸已经取消。

每张兔子贴纸右上角有一个放大镜按钮：鼠标悬停或键盘聚焦弹出发光预览卡，深色卡面会随
指针做左右 / 上下的 3D 起伏，背后有缓慢旋转的橙色光晕；点「翻面」或图片翻到背面，可以
看到这张图的绘制日期（未填时显示「日期待补充」）。触屏点击打开、点遮罩或按 Esc 关闭。
日期写在 `src/composables/useStickers.ts` 的 `rabbitPool` 里。兔子素材由作者手绘 PNG 生成
SVG（内嵌 WebP，保留纸纹，不是矢量描摹）；后 8 张保留了原画的纸张底色并做圆角裁切，
像一张手账贴纸。贴纸的位置、旋转与移动端隐藏规则在
`src/composables/useStickers.ts` 的 `rabbitSlots` / `stickerDefs` 中调整；图片在
`src/assets/stickers/`。窄屏隐藏火花、星星与第三只兔子，其余小贴纸缩到 36px 并收进
右侧留白。

## 首次进入

首页每个标签页会话第一次进入时播放一次彩蛋：随机一张《爱乐之城》海报卡片
（模糊环境光、扫光、入场与轻浮动、底部进度线）→「小王同学」→ 翻页进入首页。
`sessionStorage` 记录已播放，`prefers-reduced-motion` 直接跳过；海报每次随机，
并避开上一次播放的那张；手机端卡片按视口缩放，海报保持完整不裁切。实现见
`src/components/PosterScene.vue`、`PageLoader.vue` 与
`src/composables/usePageLoader.ts`，海报在 `src/assets/loader/`。

海报素材由站点作者提供，版权归电影版权方所有；公开部署或商用前请确认使用授权。

## 内容工作台

```bash
npm run studio
```

会启动 Vite 并打开 `http://127.0.0.1:5173/studio`。工作台只在开发服务器上存在，
生产构建不包含它，也不接受非本机请求。

- **文章**：列表、frontmatter 表单、Markdown 正文、新建、删除（移到 `.studio-trash/`）、
  一键重新生成文章入口。
- **照片**：拖拽/选择上传，浏览器端转 WebP（长边 ≤1600px，质量 0.82），再分配到
  t1–t8 照片墙格子；未分配的留在照片库。
- **资料**：编辑封面文案、关于段落、信息卡、联系方式和页脚；用 `**文字**` 标记橙色
  强调。保存后 Vite 热更新，浏览器标题由 `vite/profile-html.ts` 从
  `src/content/profile.json` 注入。

所有写操作都是「临时文件 + rename」的原子写入；接口做了本机来源、路径白名单、
slug 规则、JSON/WebP 类型与体积校验。它**没有登录鉴权**，因此不要通过
`--host` 暴露到局域网或公网。完整设计见 [notes/AUTHORING.md](notes/AUTHORING.md)。

## 发布

开发方只 push `main`；发布由 WorkBuddy 定时任务完成。手动发布时：

```bash
npm run deploy
```

脚本会构建、把 `dist/` 写成 `dist` 孤儿分支的一个根提交并推送，最后打印
commit SHA 与 jsDelivr 地址。服务器按这个 SHA 拉取，**禁止使用 `@main`**
（CDN 缓存可能长达 12 小时）。

完整步骤、回滚与常见故障见 [notes/DEPLOY.md](notes/DEPLOY.md)。

## 约束（不要改）

- Caddy 配置在 `/etc`，不可修改；不能依赖 `try_files` 或 history 路由。
- 文章 URL 必须保持 `/posts/<slug>.html`，不能去掉 `.html`。
- 服务器在北京，直连 GitHub 的 HTTPS 会被干扰，只能用 jsDelivr。
- 线上只有 HTTP（443 未开放）。

## 站内编辑

照片上传、博客写作与个人资料编辑已经做成仅本机可访问的「内容工作台」，实现与边界
见 [notes/AUTHORING.md](notes/AUTHORING.md)。它复用现有构建与发布链，不修改 Caddy，
也不把编辑器暴露到公网；服务器目前不具备备案条件，公网后台不在计划内。

## 视觉基线

`notes/baseline/` 是 v1 的 15 张基线截图（5 页 × 1280 / 768 / 500）。
文章页与旧链接页仍应与基线 0px 对齐；首页已改为翻页式，属于预期视觉变化。
`npm run snapshot` 会输出首页五个翻页、文章页和旧链接页的三档宽度截图到
`notes/snapshots/`。

## 技术说明

- 构建期解析 Markdown，markdown-it 不进入客户端 bundle。
- UnoCSS 负责常规样式，`src/styles/` 保留 keyframes、翻页、文章正文排版与主题覆盖。
- 每篇文章是真实 HTML 入口，跨页跳转使用 View Transitions；首页五页共用同一个入口，
  用 `useDeck` 在客户端翻页。
- 颜色令牌在 `uno.config.ts` 中定义深浅两套，输出为 CSS 变量；主题由 `data-theme` 切换，
  首屏前由 Vite 插件注入的启动脚本解析，避免闪烁。
- 首屏 JS gzip 约 53.0 KB、CSS gzip 约 10.6 KB；加载彩蛋海报是本地 JPEG，
  单次只加载随机选中的一张（约 60–81 KB）；兔子贴纸一次只请求抽中的 3 张。
