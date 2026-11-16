# 个人站 v2 改造方案（Vite + Vue 3 + TS）

> 版本：v2 实施规格 ｜ 更新：2026-11-16
> **本文件是给「独立开发 Agent」执行的规格书**，不是讨论稿。所有决策已锁定，开发方按批次交付即可。
> 计划维护与线上发布由 WorkBuddy 侧负责（见第 9 节）。

---

## 0. 已锁定的决策

| # | 决策项 | 结论 |
|---|---|---|
| 1 | 构建形态 | **A：多页构建（MPA）**，每篇文章输出真实 HTML 文件 |
| 2 | 样式方案 | **UnoCSS 全量重写**，但必须做到视觉**零漂移**（见第 5 节的验收机制） |
| 3 | 旧版处理 | 打 tag `v1-legacy` 后**删除旧文件**，仓库只保留 v2 结构 |
| 4 | 发布方式 | 开发方只负责 push 到 `main`；**由 WorkBuddy 定时任务检测更新 → 构建 → 同步到云服务器** |

---

## 1. 目标与非目标

**目标**
- 工程化：组件化、类型化、可热更新、可 lint、可一键构建
- 内容化：文章只写 Markdown，首页列表自动汇总
- 自动化：push 之后无需任何人手动操作，线上自动更新
- 可追溯：每次发布有 CHANGELOG 与发布日志

**非目标（明确不做）**
- 不做 SSR / 服务端渲染；不引入后端和数据库
- 不接 CMS、不做评论系统
- **不修改服务器 `/etc` 下任何配置**（云侧网关会拦截，见第 2 节）
- 不顺带改视觉风格、不改文案、不重排首页结构（只做等价迁移）

---

## 2. 硬性约束（开发前必须知道）

| 约束 | 具体情况 | 对开发的要求 |
|---|---|---|
| **Caddy 配置不可改** | 远程命令通道被云侧 EdgeOne 网关策略过滤，写/读 `/etc/caddy/Caddyfile` 一律返回 `EO_WEB_PROTECTION_BLOCKED` | 不能依赖 `try_files` 回退；**不能用 history 路由**；不假设能加 rewrite / 301 规则 |
| **URL 必须保持不变** | 现网地址是 `/posts/hello-world.html`（带 `.html`） | 构建产物必须仍然输出 `posts/hello-world.html`，**不要改成目录形式** `/posts/hello-world/` |
| **服务器不能 `git pull`** | 北京机器到 GitHub 的 HTTPS 被中断（`GnuTLS recv error -110`），实测多次失败 | 服务器侧一律走 jsDelivr CDN 取文件 |
| **jsDelivr 必须用 commit SHA** | 用 `@main` 会命中 CDN 缓存（最长 12 小时）拿到旧文件 | 发布脚本必须输出并使用 `dist` 分支的 commit SHA |
| **443 无服务** | Caddy 只监听 80，没有证书 | 所有本地/线上链接用 `http://`；不要写死 `https://` 外链自测 |
| **站点根目录** | 对外目录是 `/usr/share/caddy`（Caddy 出厂默认 root） | 发布产物落在这里；源码目录 `/var/www/personal-site` **不是**对外目录 |

---

## 3. 技术栈

| 项 | 版本 / 说明 |
|---|---|
| Node | 22.x（本机 22.22.2） |
| 包管理 | npm 10.x，锁文件 `package-lock.json` 必须提交 |
| 构建 | Vite（以 `npm view vite version` 为准，当前 8.x） |
| 框架 | Vue 3.5+，统一 `<script setup lang="ts">` |
| 语言 | TypeScript，`strict: true` |
| 样式 | **UnoCSS**（presetUno + presetTypography 按需），设计令牌集中在 `uno.config.ts` |
| 内容 | Markdown + `gray-matter`（frontmatter 解析），构建期读取 |
| 代码质量 | ESLint + Prettier，`npm run lint` 必须零错误 |

依赖原则：只装真正用到的；**禁止引入 UI 组件库**（Naive/Element 等）；**禁止引入 SSR/SSG 框架**（nuxt/vite-ssg）。

---

## 4. 构建形态 A 的落地细节

### 4.1 入口与产物

| 源文件（仓库根） | 构建产物 | 线上地址 |
|---|---|---|
| `index.html` | `dist/index.html` | `/` |
| `posts/web-101.html` | `dist/posts/web-101.html` | `/posts/web-101.html` |
| `posts/hello-world.html` | `dist/posts/hello-world.html` | `/posts/hello-world.html` |
| `posts/why-i-build.html` | `dist/posts/why-i-build.html` | `/posts/why-i-build.html` |
| `docs/web-101.html` | `dist/docs/web-101.html` | `/docs/web-101.html`（旧链接跳转页，必须保留） |

- `posts/*.html` 与 `index.html` 是**极薄入口壳**（只含 `<div id="app">` 与 `<script type="module" src="/src/entries/xxx.ts">`），正文全部由 Vue 渲染
- 入口由 `scripts/gen-entries.mjs` 依据 `src/content/posts/*.md` **自动生成**，禁止手写
- Vite `build.rollupOptions.input` 显式列出全部入口

### 4.2 页面转场

MPA 是整页刷新，用 **Cross-Document View Transitions** 补观感：

```css
@view-transition { navigation: auto; }
```

- Chromium / Safari 支持，Firefox 自动降级为普通跳转，**不影响功能**
- 转场要克制：淡入 + 8px 位移，时长 ≤ 220ms
- 现有「翻页式加载动画」只在**首页首次进入**播一次，文章页不播（避免每次点文章都等 2 秒）；用 `sessionStorage` 记录本次会话已播过

---

## 5. UnoCSS 全量重写 + 零漂移机制

### 5.1 单一来源

所有颜色、间距、字号、圆角、动效曲线，**只允许**在 `uno.config.ts` 的 `theme` 里定义，组件里禁止出现裸十六进制色值和魔法数字：

```ts
theme: {
  colors: {
    ink:    { DEFAULT: '#F2EFE9', 2: '#A9A49B', 3: '#6B675F' },
    bg:     { DEFAULT: '#0B0B0D', soft: '#111113' },
    line:   { DEFAULT: 'rgba(242,239,233,.12)', soft: 'rgba(242,239,233,.07)' },
    orange: { DEFAULT: '#EA580C', soft: 'rgba(234,88,12,.14)' },
    blue:   '#2563EB',
  },
  // 间距/字号按现有 CSS 的实际取值固化，不要自创刻度
}
```

### 5.2 基线快照（开工第一件事）

1. 对**现网** `http://154.8.177.56/` 的 5 个页面，用无头 Chrome 在 **1280 / 768 / 500** 三个宽度各截一张，共 15 张
2. 存到 `notes/baseline/<页面>-<宽度>.png` 并**提交进仓库**作为对照基线
3. 每批改造完成后用**完全相同的参数**重截，逐张并排比对

### 5.3 判定标准

| 项 | 通过条件 |
|---|---|
| 布局 | 关键元素（标题、栏位、卡片、表格）位置偏差 **0px**（不计滚动条宽度差） |
| 颜色 | 背景/文字/强调色与基线**完全一致**（取色器抽查 ≥ 5 处） |
| 字号/行高 | 视觉一致，允许子像素级差异 |
| 动效 | 加载翻页、纹络生长、贴纸拖拽、滚动入场 **四项全部保留**，手感不变 |
| 差异报告 | 每批交付附「哪几处不同、为什么、是否接受」，不接受"看起来差不多" |

> 无头 Chrome 视口最小 500px，`--window-size=390` 会被钳到 500 再裁图，**不要用它判断移动端溢出**；判断溢出用 `scrollWidth === clientWidth`。

---

## 6. 目录结构（最终态）

```
personal-site/
├── index.html                     # 入口壳（薄）
├── posts/
│   ├── web-101.html               # 入口壳，自动生成
│   ├── hello-world.html           # 入口壳，自动生成
│   └── why-i-build.html           # 入口壳，自动生成
├── docs/
│   ├── web-101.html               # 旧链接跳转页（保留，勿删）
│   └── v2-migration-plan.md       # 本文件（构建产物排除，不对外发布）
├── src/
│   ├── entries/
│   │   ├── home.ts                # 首页挂载
│   │   └── post.ts                # 文章页挂载（从 data-slug 读 slug）
│   ├── App.vue
│   ├── pages/HomePage.vue  pages/PostPage.vue
│   ├── components/
│   │   ├── PageLoader.vue         # 翻页式加载动画
│   │   ├── VeinsCanvas.vue        # 渐变纹络背景
│   │   ├── StickerLayer.vue       # 可拖拽小熊贴纸
│   │   ├── TopBar.vue  HeroSection.vue  AboutSection.vue
│   │   ├── PhotoWall.vue  PostList.vue  ContactSection.vue
│   │   └── article/{ArticleToc,ArticleTable,ArticleNote,ArticleSteps,Chip}.vue
│   ├── composables/usePageLoader.ts  useVeins.ts  useStickers.ts  useReveal.ts
│   ├── content/posts/*.md         # 文章正文 + frontmatter
│   ├── styles/                    # 仅 UnoCSS 覆盖不到的部分（keyframes、滚动条）
│   ├── types/post.ts              # Post 接口定义
│   └── utils/content.ts           # import.meta.glob 读取 md、排序、摘要
├── scripts/
│   ├── gen-entries.mjs            # md → posts/*.html 入口
│   ├── new-post.mjs               # 新建文章脚手架
│   ├── deploy.mjs                 # build → 推 dist 分支 → 打印 SHA
│   └── snapshot.mjs               # 三个宽度批量截图（对照基线用）
├── notes/                         # 内部文档，**不进构建产物**
│   ├── baseline/                  # 基线截图
│   ├── ARCHITECTURE.md
│   └── DEPLOY.md
├── CHANGELOG.md                   # 变更与发布日志
├── README.md
├── vite.config.ts  uno.config.ts
├── tsconfig.json  package.json
└── .gitignore                     # dist/ node_modules/ .DS_Store
```

---

## 7. 分批实施（开发 Agent 任务卡）

### 批次 0 — 基线与备份

| 项 | 内容 |
|---|---|
| 动作 | ① `git tag v1-legacy && git push --tags` ② 按 5.2 截 15 张基线图存 `notes/baseline/` ③ 写 `notes/ARCHITECTURE.md` 骨架 |
| 验收 | tag 在远端可见；基线图齐全且能对上现网 |
| 禁止 | 此时不要动任何现有页面 |

### 批次 1 — 工程骨架

| 项 | 内容 |
|---|---|
| 动作 | 初始化 Vite+Vue3+TS；接 UnoCSS / ESLint / Prettier；`uno.config.ts` 写全 design tokens；`vite.config.ts` 配多入口；先只让首页出空壳 |
| 验收 | `npm run dev` 有热更新；`npm run build` 产出 `dist/index.html`；`npm run preview` 可打开；`npm run lint` 零错误 |
| 禁止 | 不要删旧文件 |

### 批次 2 — 首页等价迁移

| 项 | 内容 |
|---|---|
| 动作 | 拆 `PageLoader` / `VeinsCanvas` / `StickerLayer` / `TopBar` / `Hero` / `About` / `PhotoWall` / `PostList` / `Contact`；动效逻辑进 composable；全部改用 UnoCSS |
| 验收 | 与基线逐屏比对通过（第 5.3 节）；四项动效手感不变；控制台零报错；**此批合并即替换旧首页** |
| 禁止 | 不要"顺手优化"排版；不要改文案（除必要的数据抽离） |

### 批次 3 — 文章系统

| 项 | 内容 |
|---|---|
| 动作 | 3 篇文章转 `src/content/posts/*.md`（frontmatter：`title/date/tags/summary`）；`PostPage.vue` 复刻现有排版（目录卡、表格、提示块、编号步骤、状态标签）；`gen-entries.mjs` 生成入口；首页列表由 md 自动汇总并置顶 `web-101` |
| 验收 | 三个文章 URL 与现网一致且 200；样式与基线一致；新增一篇 md 后 `npm run build` 自动出现新页面、首页列表自动多一条 |
| 禁止 | 不要改正文措辞；不要改 URL 后缀 |

### 批次 4 — 收尾

| 项 | 内容 |
|---|---|
| 动作 | 删除旧文件（旧 `assets/`、旧文章 HTML、旧 `main.js` 等）；`docs/` 只留跳转页与计划文件；写 `CHANGELOG.md`、`README.md`、`notes/DEPLOY.md`；提交 `package-lock.json` |
| 验收 | `git ls-tree -r main --name-only` 里没有废弃文件；从零 `git clone` → `npm ci` → `npm run build` 一次通过 |
| 禁止 | 不要删 `docs/web-101.html`（旧链接还在用） |

---

## 8. 部署流水线

```
【开发方】改完 push 到 main
        ↓
【WorkBuddy 定时任务】检测 origin/main 是否有新 commit（详见第 9 节）
        ↓ 有更新
  npm ci → npm run build（失败即停，不动线上）
        ↓
  把 dist/ 提交到 dist 孤儿分支 → push → 拿到 SHA
        ↓
【服务器】
  1) 备份现网 /usr/share/caddy → /var/www/site-prev（只留最近一版）
  2) 清掉 /usr/share/caddy 里的 index.html、posts/*.html 与旧哈希 assets
  3) 按 SHA 从 jsDelivr 逐个下载到 /usr/share/caddy
  4) 自检：/ 与 3 篇文章页必须全部 200
  5) 任一步失败 → 用 /var/www/site-prev 整目录回滚，并报告失败步骤
```

**`dist` 分支规则**：孤儿分支，只放构建产物，不含源码；每次发布一个 commit，message 为 `release: <源 main 的短 SHA>`。

---

## 9. WorkBuddy 定时任务（第 4 条的具体实现）

**可行性结论：可以干。** 已逐项实测：

| 前置条件 | 实测结果 |
|---|---|
| 本机 Node / npm | ✅ v22.22.2 / 10.9.7 |
| GitHub 推送通道 | ✅ 远端为 SSH，`git ls-remote` 正常 |
| npm 源 | ✅ `registry.npmmirror.com`，`npm view vite` 正常返回 |
| 云服务器可达 | ✅ `lighthouse-ops` 是**本机全局 MCP**（`~/.workbuddy/mcp.json`），定时任务会话同样可用 |
| 是否踩 WAF | ✅ 只用 `/var/www` 与 `/usr/share/caddy`，均为实测放行路径，**不碰 `/etc`** |

**任务规格**

| 项 | 值 |
|---|---|
| 名称 | 个人站自动发布（每日检测） |
| 频率 | 每天 10:00 |
| 去重 | 状态文件 `~/.workbuddy/state/personal-site-deploy.json` 记录上次发布的 `main` SHA，相同则返回「今日无更新」 |
| 幂等 | 同一 SHA 重复执行不会重复发布 |
| 失败策略 | 构建失败 → 不动线上；同步失败 → 整目录回滚；均只报告不重试 |
| 输出 | 每次执行输出：有无更新、SHA 前 7 位、文件数、自检结果；有发布则追加一行到 `CHANGELOG.md` 的「发布记录」 |

**已知风险**

1. 定时任务是无上下文的独立会话 → 提示词必须自带全部绝对路径与规则
2. 单次执行 2–5 分钟（装依赖 + 构建 + 上传）→ 失败不重试，交给下一天
3. `lighthouse-ops` 若 token 过期 → 卡在"无法执行远程命令"，需重新授权

---

## 10. 文档与日志规范

| 文件 | 内容 | 维护方 |
|---|---|---|
| `README.md` | 怎么装、怎么跑、怎么发、目录说明 | 开发方 |
| `notes/ARCHITECTURE.md` | 目录职责、数据流、组件边界、为什么选 MPA | 开发方 |
| `notes/DEPLOY.md` | 发布步骤、回滚步骤、常见故障（WAF 与 jsDelivr 的坑） | 开发方，WorkBuddy 补线上部分 |
| `CHANGELOG.md` | 按 `[新增]/[修复]/[重构]/[文档]/[发布]` 分类，日期倒序 | 双方 |

**提交信息规范**（定时任务据此生成日志）：
`feat:` 新功能 ｜ `fix:` 修缺陷 ｜ `style:` 样式 ｜ `refactor:` 重构 ｜ `docs:` 文档 ｜ `chore:` 杂务 ｜ `release:` 发布

---

## 11. 全站验收清单

- [ ] `npm ci && npm run build && npm run preview` 从零跑通
- [ ] 首页与 3 篇文章：URL 与现网完全一致，全部 200
- [ ] 5.3 节视觉比对全部通过，四项动效齐全
- [ ] 首屏 JS（gzip）≤ 60 KB，单页 CSS（gzip）≤ 15 KB
- [ ] 500px 宽度下 `scrollWidth === clientWidth`（无横向溢出）
- [ ] 新增一篇文章：只加 md，不改任何 JS/CSS
- [ ] 仓库中无废弃文件；`docs/web-101.html` 跳转仍有效
- [ ] `CHANGELOG.md` 记录本次改造；`notes/DEPLOY.md` 能照着完成一次发布与一次回滚

---

## 12. 风险登记

| 风险 | 影响 | 对策 |
|---|---|---|
| UnoCSS 重写导致视觉漂移 | 站点变丑、返工 | 基线截图 + 像素级比对 + 逐批验收，未过不允许合并 |
| 旧 URL 失效 | 外链失效、SEO 掉 | 强制保持 `.html` 后缀；`docs/` 跳转页保留 |
| 定时任务在授权失效时静默失败 | 以为已发布实则没同步 | 每次执行都输出结论；连续失败需人工确认 |
| jsDelivr 缓存拿到旧产物 | 线上回退到旧版 | 只用 commit SHA，禁 `@main` |
| 构建体积超预期 | 首屏变慢 | 体积预算写进验收；超了拆包 |
| 无域名无证书 | 地址仍是 IP + http | 与本次改造无关，另行处理备案与证书 |
