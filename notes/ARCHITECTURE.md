# 架构说明

> 状态：v2 迁移中（批次 0 已完成）。本文档随批次推进补全。

## 1. 为什么是 MPA

线上 Caddy 的配置不可修改，不能依赖 `try_files` 回退，也不能使用 history 路由。因此每篇文章必须在构建期输出真实的
`posts/<slug>.html`，URL 与 v1 完全一致。Vite 多入口天然满足这一点，且不需要引入 SSR / SSG 框架。

## 2. 目录职责（规划）

| 目录 | 职责 |
|---|---|
| `index.html`、`posts/*.html` | 极薄入口壳，只负责挂载与 SEO 元信息；由 `scripts/gen-entries.mjs` 依据 md 自动生成 |
| `src/entries/` | 入口脚本，读取入口壳上的数据并挂载对应页面组件 |
| `src/pages/` | 页面级组件（首页、文章页） |
| `src/components/` | 可复用组件（加载动画、纹络、贴纸、各内容区块） |
| `src/composables/` | 有状态、有副作用的逻辑（加载、纹络、贴纸、滚动入场） |
| `src/content/posts/` | 文章正文 + frontmatter，唯一内容源 |
| `src/styles/` | UnoCSS 难以覆盖的全局样式（keyframes、滚动条、v-html 正文排版） |
| `src/utils/content.ts` | 构建期读取 md，产出文章列表与详情 |
| `scripts/` | 构建期工具：生成入口、新建文章、发布、截图 |
| `notes/` | 内部文档与基线截图，不进入构建产物 |

## 3. 数据流

```
src/content/posts/*.md
        │  (构建期：gray-matter 解析 frontmatter，markdown-it 渲染正文)
        ▼
src/utils/content.ts  ──►  HomePage / PostPage  ──►  dist/*.html + assets
        ▲
scripts/gen-entries.mjs ──► posts/<slug>.html 入口壳
```

Markdown 解析发生在构建期，markdown-it 不进入客户端 bundle；首屏只包含 Vue 运行时与渲染后的正文。

## 4. 动效边界

| 动效 | 出现位置 | 说明 |
|---|---|---|
| 翻页加载 | 首页首次进入 | `sessionStorage` 记录会话内已播放，文章页不播放 |
| 渐变纹络 | 首页 | canvas 随机生成，截图对比时排除 |
| 自定义光标 / 跟随小熊 | 首页桌面端 | 触屏与 reduced-motion 不启用 |
| 可拖拽贴纸 | 首页 | 位置与 v1 一致 |
| 滚动入场 | 首页 | 与 v1 相同的 IntersectionObserver 逻辑 |

## 5. 待补

- 批次 1：工程骨架与 design tokens 说明
- 批次 2：首页组件边界与 UnoCSS 使用约定
- 批次 3：文章渲染与目录生成规则
- 批次 4：构建、部署、回滚流程（另见 `notes/DEPLOY.md`）
