# 更新日志

按日期倒序。分类：`[新增]` `[修复]` `[重构]` `[文档]` `[发布]`。

## 2026-11-16

### [新增]

- v2 工程化版本：Vite 8 多页构建，每篇文章输出真实 `posts/<slug>.html`，URL 与 v1 一致。
- 文章内容迁移到 `src/content/posts/*.md`，构建期解析 frontmatter 与 Markdown。
- `npm run new-post -- <slug> "<标题>"`：一条命令生成文章 md 与入口壳。
- `npm run snapshot`：用 Puppeteer 对首页、文章页、旧链接页做 1280 / 768 / 500 三档截图。
- `npm run deploy`：构建后将 `dist/` 发布为 `dist` 孤儿分支，并打印 jsDelivr 用的 commit SHA。
- 构建产物增加 `release.json` 文件清单，服务器可据此按 SHA 逐个下载。
- 照片墙支持在 `tiles` 数据里配置真实图片，保留原渐变占位图。
- 首页贴纸更新：跟随鼠标的小熊换成奶油色卡通兔子；新增花、爱心、音符贴纸，保留星星与火花。
- 首页右上角新增「贴纸」开关，可显示/隐藏全部贴纸与跟随兔子，状态记忆在 `localStorage`。

### [修复]

- 修复 CommonMark 在中文标点后无法识别 `**加粗**`、页面出现字面量星号的问题。
- 修复引用块末段多出 24px 间距的问题。
- 修复 UnoCSS `border` 工具类因缺少全局 border-style 导致卡片高度少 2px 的问题。
- 修复文章目录链接因缺失空白文本节点产生的横向偏移。
- 修复旧链接 `docs/web-101.html` 被 Vite 改写 canonical 的问题，改为构建时原样输出。
- 调整贴纸在 768 / 500 宽度下的位置，避免遮挡首屏标题、正文与按钮。

### [重构]

- 样式从手写 CSS 迁移到 UnoCSS + design tokens，配色、字体、缓动、间距变量统一到 `uno.config.ts`。
- 首页拆分为 TopBar / Hero / About / PhotoWall / PostList / Contact / Footer 等组件，动效拆为 composables。
- 文章页正文排版保留在 `src/styles/article.css`，与 v1 `post.css` 等价。
- 删除旧 `assets/css`、`assets/js`、旧手写文章 HTML；照片说明迁移到 `public/assets/photos/`。
- 删除旧 `bear.svg`，新增 `rabbit.svg`、`rabbit-icon.svg`、`flower.svg`、`heart.svg`、`note.svg`。
- 保留四项动效：翻页加载、canvas 渐变纹络、自定义光标 + 跟随兔子、可拖拽贴纸与滚动入场。

### [文档]

- 重写 `README.md`：环境、命令、目录、写文章、发布与约束。
- 补齐 `notes/ARCHITECTURE.md`：MPA 选型、组件边界、构建链路、文章渲染与验收结果。
- 新增 `notes/DEPLOY.md`：手动发布、服务器同步、回滚、jsDelivr 与 WAF 常见故障。

### [发布]

- `v1-legacy` tag 保留 v1 原始版本。
- v2 视觉回归：首页与 3 篇文章、旧链接页在 1280 / 768 / 500 下布局 0px 偏差；
  文章页与旧链接页像素级一致。首页贴纸已按需求更新，属预期视觉变化。
- 首屏 JS gzip 约 43.6 KB（预算 60 KB），CSS gzip 约 6.5 KB（预算 15 KB）。
- 待 WorkBuddy 定时任务首次发布 v2。

## 发布记录

| 日期 | main SHA | 文件数 | 结果 |
| ---- | -------- | ------ | ---- |
