# personal-site

小王同学的个人网站。Vite + Vue 3 + TypeScript + UnoCSS 多页静态站，构建产物直接丢给 Caddy。

线上地址：<http://154.8.177.56/>

## 环境

- Node.js **>= 22.12**（推荐 22 LTS）
- npm 10+
- 截图脚本需要本机安装 Chrome / Chromium

## 常用命令

```bash
npm ci              # 安装依赖（package-lock.json 已提交）
npm run dev         # 开发服务器，改 md / Vue / CSS 自动热更新
npm run build       # 生成入口壳 + 类型检查 + 构建到 dist/
npm run preview     # 本地预览 dist/
npm run lint        # ESLint，零警告
npm run format      # Prettier 格式化
npm run new-post -- <slug> "<标题>"   # 新建文章 md
npm run snapshot    # 三档宽度批量截图到 notes/snapshots/
npm run deploy      # 构建 + 推 dist 孤儿分支 + 打印发布 SHA
```

首次 `npm run dev` / `npm run build` 前会自动执行 `npm run gen`，依据
`src/content/posts/*.md` 生成 `posts/<slug>.html` 入口壳，不需要手写。

## 目录

```
personal-site/
├── index.html                首页入口壳（只挂载 + SEO）
├── posts/<slug>.html         文章入口壳，由 scripts/gen-entries.mjs 生成
├── docs/web-101.html         旧地址跳转页（必须保留）
├── src/
│   ├── entries/              入口脚本：home.ts / post.ts
│   ├── pages/                HomePage.vue / PostPage.vue
│   ├── components/           区块组件 + 动效组件 + article/ArticleToc.vue
│   ├── composables/          加载动画、纹络、贴纸、滚动入场、时钟
│   ├── content/posts/*.md    文章唯一内容源（frontmatter + 正文）
│   ├── styles/               base.css / home.css / article.css
│   ├── utils/content.ts      构建期读取 md，导出文章列表与详情
│   └── types/post.ts         Post 类型
├── scripts/
│   ├── gen-entries.mjs       生成文章入口壳
│   ├── new-post.mjs          新建文章
│   ├── deploy.mjs            构建 → dist 孤儿分支 → 打印 SHA
│   ├── snapshot.mjs          三档宽度截图
│   └── lib/posts.mjs         构建期读取 frontmatter
├── public/assets/photos/     照片墙图片（构建后位于 /assets/photos/）
├── notes/                    架构、部署、基线截图（不进入构建产物）
├── vite/                     Markdown 构建插件、旧链接重定向插件
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

图片放 `public/assets/photos/`，然后在 `src/components/PhotoWall.vue` 的 `tiles`
里给对应格子加 `image: '/assets/photos/01.jpg'`。不填则保留内置渐变占位图。
详见 [public/assets/photos/README.md](public/assets/photos/README.md)。

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

## 视觉基线

`notes/baseline/` 是 v1 的 15 张基线截图（5 页 × 1280 / 768 / 500）。
重构后用 `npm run snapshot` 生成 `notes/snapshots/` 对照；首页动态元素
（时钟、随机纹络）会有少量像素差，布局应保持 0px 偏差。

## 技术说明

- 构建期解析 Markdown，markdown-it 不进入客户端 bundle。
- UnoCSS 负责常规样式，`src/styles/` 保留 keyframes 与文章正文排版。
- 每篇文章是真实 HTML 入口，跨页跳转使用 View Transitions。
- 首屏 JS gzip 约 42 KB、CSS gzip 约 6 KB。
