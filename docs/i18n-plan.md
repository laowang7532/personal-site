# 中英双语方案

> 状态：方案稿；首批范围已调整（先做 UI + 首页 / 资料，文章翻译暂缓）｜ 更新：2026-11-18
> 关联：[方案索引](README.md) ｜ [架构说明](../notes/ARCHITECTURE.md) ｜ [主题方案](theme-plan.md)

## 0. 结论先行

- **中文保持根路径不变**，英文统一放在 `/en/` 前缀下；每个页面都有独立、可分享、可被搜索引擎抓取的 URL。
- **首批只做英文站骨架与 UI**：首页、关于、照片、联系、页脚与所有界面文案；文章暂不翻译（部分文章不是作者本人撰写）。
- 文章翻译的架构先设计好，后续启用时用**同 slug 配对**：中文 `src/content/posts/<slug>.md`，英文 `src/content/posts/en/<slug>.md`。
- 个人资料拆成 `src/content/profile/zh.json` 与 `en.json`；UI 文案放类型化字典 `src/i18n/{zh,en}.ts`。
- 不引入 `vue-i18n`：MPA 每个文档只加载当前语言，字典用普通对象 + 类型约束即可，运行时更小。
- 语言切换是普通 `<a>` 链接，不自动跳转、不依赖 Cookie / localStorage；URL 是语言的唯一事实来源。
- SEO 同步输出 `<html lang>`、`canonical`、`hreflang`、`og:locale`；hreflang 只对**已存在的翻译**输出。
- 首批分三批：英文首页入口 → UI 字典 / 资料 / 英文首页 → 工作台与脚本收尾；文章翻译作为后续可选批次。

## 0.1 首批范围（2026-11-18 确认）

| 项               | 决定                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 英文站名         | **W / H**                                                                                      |
| 首批内容         | 英文首页、关于、照片、联系、页脚、所有 UI 文案                                                  |
| 文章             | **暂不翻译**；原因：部分文章不是作者本人撰写，翻译授权与准确性先不处理                           |
| 英文博客页       | 保留 Writing 翻页，显示说明「Articles are currently published in Chinese only.」并链接回中文博客 |
| 英文文章入口     | 首批不生成；`/en/posts/*.html` 不存在                                                          |
| 文章 hreflang    | 不输出英文 alternate；只输出中文 canonical                                                      |
| 后续 I3          | 有授权或作者自写文章时，再按第 4–8 节补英文文章、`/en/posts/*` 与 alternate                     |

## 1. 目标与非目标

**目标**

- 中文页面与现有 URL 完全不变；英文页面有独立 URL、独立标题与描述；
- 首批：UI 文案、个人资料、照片说明、无障碍标签都能按语言显示；文章正文按 I3 后续扩展；
- 语言切换保留当前页面（首页保留翻页 hash）；
- 英文站可被爬虫正确识别，不产生重复内容；
- 新增一种语言的成本可控：加目录、加字典、加入口，不需要重写组件；
- 构建、发布、工作台、截图脚本都能处理两种语言。

**非目标**

- 不做第三种语言（但结构上允许扩展）；
- 不做机器翻译流水线、不在运行时调用翻译 API；
- 不做基于 IP / `Accept-Language` 的自动跳转；
- 不拆分部署（仍是一套 `dist/`、一个 Caddy 根目录）；
- 不把中文站迁到 `/zh/`，避免旧链接失效与 SEO 损失。

## 2. 现状与约束

### 2.1 站点约束

| 约束                       | 对双语方案的影响                                                     |
| -------------------------- | -------------------------------------------------------------------- |
| 纯静态 MPA                 | 每个语言必须是真实 HTML 入口，不能只靠前端切文案                     |
| Caddy 配置不可改           | 不能加 `Accept-Language` 重写；`/en/` 只能靠目录与 `index.html` 提供 |
| 旧链接必须保留             | `/posts/<slug>.html` 继续是中文；英文另起 `/en/posts/<slug>.html`    |
| 构建期解析 Markdown        | 英文文章也必须在构建期产出 HTML                                      |
| 首屏预算 60 KB（gzip）     | 每个入口只加载当前语言字典与资料，不能把两种语言都塞进 bundle        |
| 服务器从 jsDelivr 拉文件   | `release.json` 必须包含 `en/` 子目录；发布脚本要递归遍历（已支持）    |

### 2.2 当前文案来源盘点

| 来源                                        | 内容                                                                 | 现状                       |
| ------------------------------------------- | -------------------------------------------------------------------- | -------------------------- |
| `src/content/profile.json`                  | 站名、标题、描述、眉题、两行大标题、欢迎语、关于、联系、页脚         | 单一中文                   |
| `src/content/posts/*.md`                    | 标题、日期、状态、tags、摘要、导语、正文、目录锚点                   | 单一中文                   |
| `src/content/photos.json`                   | 照片槽位、说明、alt                                                   | 说明只有中文               |
| `index.html` + `scripts/gen-entries.mjs`    | `<title>`、description、`lang`、noscript、品牌后缀                    | 单一中文                   |
| `src/components/*.vue`                      | 导航、区块标题、按钮、空状态、无障碍标签、贴纸预览、目录             | 约 23 个文件含中文字面量   |
| `src/composables/useDeck.ts`                | 五个翻页页名                                                         | 中文数组，被多个组件引用   |
| `src/composables/useStickers.ts`            | 9 张兔子贴纸的 `label` / `latin`                                     | 中文名 + 英文副标题        |
| `src/utils/content.ts`                      | 日期格式、列表排序                                                   | 中文点号格式               |

### 2.3 当前 URL

| 页面         | 地址                              |
| ------------ | --------------------------------- |
| 首页         | `/`（可带 `#about` 等）           |
| 文章         | `/posts/<slug>.html`              |
| 旧链接跳转   | `/docs/web-101.html`              |

## 3. URL 与路由方案

### 3.1 备选方案

| 方案                                | URL 形态                                      | SEO / 分享                                    | 实现成本                                         | 结论 |
| ----------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------------ | ---- |
| **A. 语言前缀**                     | 中文 `/...`，英文 `/en/...`                   | 每种语言独立 URL，可 canonical / hreflang     | 增加英文入口与构建产物；静态服务器直接支持       | ✅ 采用 |
| B. 同 URL 前端切换                  | `/` 上按存储 / 浏览器语言渲染                 | 英文内容不被抓取；分享链接会跟随接收者语言    | 实现简单，但 `<html lang>` 与 meta 无法按语言输出 | ❌    |
| C. 查询参数                         | `/?lang=en`、`/posts/x.html?lang=en`          | 抓取与 canonical 处理麻烦，容易被判重复        | 中等                                             | ❌    |
| D. 子域名                           | `en.example.com`                              | 隔离清晰                                      | 需要 DNS、证书、Caddy 配置；当前都不可行         | ❌    |

选 A：不改中文 URL、不需要服务端配置、对搜索引擎和分享最友好；代价是英文入口要单独生成，这是构建期工作，不增加运行时复杂度。

### 3.2 最终 URL 结构

| 页面         | 中文（默认）                  | 英文                          |
| ------------ | ----------------------------- | ----------------------------- |
| 首页         | `/`、`/#about`                | `/en/`、`/en/#about`          |
| 文章         | `/posts/<slug>.html`          | 首批不生成；I3 启用后为 `/en/posts/<slug>.html` |
| 旧链接跳转   | `/docs/web-101.html`          | 不提供（旧链接只服务中文）    |
| 构建产物     | `dist/index.html`、`dist/posts/*.html` | `dist/en/index.html`；I3 后增加 `dist/en/posts/*.html` |

- 中文为 `x-default`；
- `/en/` 依赖静态服务器的目录索引（Caddy 默认按 `index.html` 提供）；构建后本地预览与线上都要各测一次。
  如果线上 `/en/` 不返回 200，则所有英文首页链接改用 `/en/index.html`，其余结构不变。

### 3.3 语言切换的 URL 映射

| 当前页面            | 切到英文                                             | 切到中文                       |
| ------------------- | ---------------------------------------------------- | ------------------------------ |
| 中文首页 `/#about`  | `/en/#about`                                         | —                              |
| 英文首页 `/en/#about` | —                                                  | `/#about`                      |
| 中文文章（有译文）  | `/en/posts/<slug>.html`（有锚点则带锚点）            | —                              |
| 中文文章（无译文）  | `/en/`（英文首页的 Writing 页）                      | —                              |
| 英文文章            | —                                                    | 首批不存在；I3 后为 `/posts/<slug>.html` |
| 文章不存在页        | 对侧首页                                             | 对侧首页                       |

切换用普通链接；首页 hash 由一小段点击处理补上，禁用 JavaScript 时仍能跳到英文首页。

## 4. 内容组织

### 4.1 目录结构

```text
src/content/
├── posts/
│   ├── hello-world.md          # 中文，slug = hello-world
│   ├── web-101.md
│   ├── why-i-build.md
│   ├── wip-motion.md           # 草稿，只出现在中文列表
│   └── en/                     # I3 启用；首批不创建
│       ├── hello-world.md      # 英文，slug 与中文一致
│       ├── web-101.md
│       └── why-i-build.md
├── profile/
│   ├── zh.json                 # 原 profile.json 迁移过来
│   └── en.json
└── photos.json                 # 增加 captionEn（可选）
```

`slug` 就是跨语言配对键：**英文文件名必须与中文一致**。I3 启用后这样：

- URL 对称：`/posts/web-101.html` ↔ `/en/posts/web-101.html`；
- 文章页切换语言不需要额外的映射表；
- 标题锚点可以保持相同 `{#id}`，切换语言时 `#section` 仍然有效。

如果未来出现 slug 必须不同的情况，再在 frontmatter 增加可选的 `translationOf`；本期不做。

### 4.2 文章 frontmatter

中英文各自维护完整 frontmatter，不共享字段：

| 字段      | 中文                         | 英文                                  |
| --------- | ---------------------------- | ------------------------------------- |
| `title`   | 中文标题                     | 英文标题                              |
| `date`    | 同一日期                     | 同一日期                              |
| `status`  | 如「即将」                   | 如 `Coming soon`                      |
| `tags`    | 中文标签                     | 英文标签（如 `Web`、`Notes`）         |
| `summary` | 中文摘要                     | 英文摘要                              |
| `lede`    | 中文导语                     | 英文导语                              |
| `minutes` | 中文阅读时长                 | 按英文正文重新估算                    |
| `order`   | 列表顺序                     | **与中文保持一致**，保证两种语言排序相同 |
| `toc`     | 是否显示目录                 | 同中文                                |
| `next`    | 中文下一篇 slug              | 英文下一篇 slug                       |
| `draft`   | 是否草稿                     | 同中文；英文未翻译时不会存在这个文件   |

### 4.3 翻译缺失规则

| 场景                                   | 行为                                                                 |
| -------------------------------------- | -------------------------------------------------------------------- |
| 中文有、英文没有                       | 不生成英文页面；英文首页列表不出现该文章；中文文章页的语言切换指向 `/en/`。**首批所有文章都属于这种情况** |
| 中文草稿、英文已发布                   | 英文照常生成（内容独立）；首页各自按 `draft` 过滤                     |
| 英文有、中文没有                       | 视为内容错误，构建脚本报 warning；页面仍可生成，但切换中文指向 `/`    |
| 直接访问不存在的英文 slug              | 英文「文章不存在」页，链接回 `/en/`                                   |

英文站只展示**真正翻译过**的文章，不自动把中文正文塞进英文页面，也不显示「暂无翻译」占位页——避免低质量页面被索引。

### 4.4 个人资料

`src/content/profile/zh.json` 与 `en.json` 字段完全一致（`Profile` 类型除新增 `marquee` 外不变），例如：

```jsonc
// en.json（示意）
{
  "name": "W / H",
  "title": "W / H",
  "description": "A personal site about work, photos, and notes from life.",
  "eyebrow": "Life notes",
  "heroLines": ["Make", "things"],            // 首屏英文短句待作者确认
  "heroLede": "Welcome to my little corner...",
  "about": { "lead": "...", "paragraphs": ["..."], "cards": [{ "key": "Now", "text": "..." }] },
  "contact": { "lead": "...", "email": "1613104610@qq.com", "github": "https://github.com/laowang7532" },
  "footer": { "copyright": "© 2026 W / H", "tagline": "Built by hand" },
  "marquee": ["Code", "Lifting", "Photography", "Music", "Films", "Planning ahead"]
}
```

建议把 `MarqueeBand` 的标签从组件常量移入 profile 的 `marquee` 字段，这样中英文都能由资料文件驱动；
`Profile` 类型同步增加 `marquee: string[]`。

### 4.5 照片说明

`PhotoEntry` 增加可选 `captionEn?: string`：

```jsonc
{
  "slot": "t1",
  "src": "/assets/photos/2026-11-17-a1b2c3d4.webp",
  "caption": "起飞前的十分钟",
  "captionEn": "Ten minutes before takeoff",
  "alt": ""
}
```

- 英文页优先 `captionEn`，缺省回退 `caption`（作者自填的专有名词可以接受）；
- 8 个空槽位的占位说明属于 UI 文案，放字典，不放 `photos.json`；
- 工作台上传时提示填写英文说明，不强制。

### 4.6 贴纸与兔子

`RabbitArtwork` 增加 `labelEn?: string`：

```ts
{ src: rabbitAutumn, label: '秋日', labelEn: 'Autumn', latin: 'Autumn', date: '2026.11.07' }
```

- 中文预览显示 `label` + `latin`；英文显示 `labelEn`（缺省用 `latin`）+ `latin`；
- 贴纸预览的 UI 文案（翻面、日期待补充、关闭）走字典；
- 手绘素材本身不区分语言。

## 5. 运行时与构建期 i18n

### 5.1 不引入 `vue-i18n` 的原因

- 站点只有两种语言、每个页面只渲染一种语言，没有运行时切换需求；
- `vue-i18n` 的运行时、消息编译和 API 对本站来说过重；
- 当前 JS gzip 约 53.0 KB（主题切换已落地），预算 60 KB，应该把剩余空间留给字典与内容；
- 用普通对象 + 类型约束就能获得编译期 key 校验。

### 5.2 字典设计

```ts
// src/i18n/types.ts
export type Locale = 'zh' | 'en'

export interface Messages {
  nav: { about: string; photos: string; writing: string; contact: string; main: string }
  deck: {
    caption: string
    page: (index: number, total: number, label: string) => string
    pages: Record<'top' | 'about' | 'photos' | 'writing' | 'contact', string>
  }
  hero: { read: string; about: string }
  sections: { about: string; photos: string; writing: string; contact: string }
  photos: { hint: string; fallback: string[] }
  posts: { hint: string }
  article: {
    toc: string
    back: string
    minutes: (n: number) => string
    next: string
    notFound: string
    notFoundBody: string
  }
  footer: { back: string }
  stickers: {
    toggleOn: string
    toggleOff: string
    preview: (label: string) => string
    zoom: (label: string) => string
    close: string
    flip: string
    flipBack: string
    flipHint: string
    dateMissing: string
  }
  loader: { subtitle: string }
  langSwitch: { zh: string; en: string; label: string }
}
```

```ts
// src/i18n/zh.ts
import type { Messages } from './types'

export const zh: Messages = {
  nav: { about: '关于', photos: '照片', writing: '博客', contact: '联系', main: '主导航' },
  deck: {
    caption: '翻页',
    page: (index, total, label) => `第 ${index} 页，共 ${total} 页：${label}`,
    pages: { top: '封面', about: '关于', photos: '照片', writing: '博客', contact: '联系' },
  },
  // ...
}
```

```ts
// src/i18n/en.ts
import type { Messages } from './types'

export const en: Messages = {
  nav: { about: 'About', photos: 'Photos', writing: 'Writing', contact: 'Contact', main: 'Main navigation' },
  deck: {
    caption: 'Pages',
    page: (index, total, label) => `Page ${index} of ${total}: ${label}`,
    pages: { top: 'Cover', about: 'About', photos: 'Photos', writing: 'Writing', contact: 'Contact' },
  },
  // ...
}
```

- 带参数的文案用函数，而不是 `"{n} min read"` 字符串模板，key 与参数类型都由 TypeScript 检查；
- 不需要复数规则；如果以后要 `1 photo / 2 photos`，在函数里用 `Intl.PluralRules`；
- 字典只放**结构性 UI 文案**，作者个人内容仍放 profile / md，避免两处维护。

### 5.3 每个入口只加载当前语言

```text
src/entries/
├── home.ts        # 中文首页：import zh + profile/zh.json
├── home.en.ts     # 英文首页：import en + profile/en.json
├── post.ts        # 中文文章：import zh + profile/zh.json
└── post.en.ts     # 英文文章：import en + profile/en.json
```

入口在 `createApp` 之前激活当前语言：

```ts
import { activateI18n } from '@/i18n'
import { en } from '@/i18n/en'
import { activateProfile } from '@/utils/profile'
import profile from '@/content/profile/en.json'

activateI18n('en', en)
activateProfile(profile)
createApp(App, { page: 'home', lang: 'en' }).mount('#app')
```

`src/i18n/index.ts` 不静态引入两份字典，只保存「当前语言 + 当前字典」：

```ts
let current: { locale: Locale; m: Messages } | null = null

export function activateI18n(locale: Locale, m: Messages): void {
  current = { locale, m }
}

export function useI18n() {
  if (!current) throw new Error('i18n 未激活：请在入口调用 activateI18n')
  return current
}
```

这样英文入口的 bundle 不会包含中文字典，反之亦然。`profile.ts` 同理：`activateProfile()` 在入口调用，
组件从同一个响应式对象读取；编辑资料 JSON 时 Vite 仍会整页刷新，与现在的行为一致。

替代方案：如果实现时发现四个入口的重复代码太多，可以改成「一个入口 + 动态 import 当前语言」；代价是多一次模块请求。
当前只有两种语言、四个入口，静态拆分更可预测。

### 5.4 构建期数据流

```text
src/content/posts/*.md（zh）
src/content/posts/en/*.md（en）
        │  readPostMetas() 返回 lang
        ├──────────────► scripts/gen-entries.mjs
        │                  ├─ posts/<slug>.html
        │                  └─ en/posts/<slug>.html
        └──────────────► vite.config.ts 的 rollupOptions.input
                           ├─ home
                           ├─ en-home
                           ├─ post-zh-<slug>
                           └─ post-en-<slug>

src/content/profile/{zh,en}.json
        ├──────────────► vite/profile-html.ts（注入首页 title/description）
        └──────────────► src/entries/*（activateProfile）

src/i18n/{zh,en}.ts ──► src/entries/*（activateI18n）
```

### 5.5 关键文件改动

> 下表中 `Post.lang`、`posts/en/` 扫描、英文文章入口、`hreflang` 等**文章相关改动属于 I3**；
> 首批只增加英文首页入口、字典、资料拆分与英文 UI。

| 文件                          | 改动                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `scripts/lib/posts.mjs`       | 扫描 `posts/*.md` 与 `posts/en/*.md`，返回 `lang`；目录项跳过                                           |
| `scripts/lib/posts.d.mts`     | `PostMeta` 增加 `lang: 'zh' \| 'en'`                                                                   |
| `scripts/gen-entries.mjs`     | 按 `lang` 决定输出目录、`<html lang>`、noscript、品牌后缀、入口脚本；清理逻辑分语言                      |
| `vite.config.ts`              | `postInputs` 的 key/path 带语言；新增 `en-home` 输入 `en/index.html`                                    |
| `vite/content.ts`             | `parsePost` 从路径识别 `lang`；`Post` 增加 `lang`                                                       |
| `src/types/post.ts`           | `Post` 增加 `lang`                                                                                     |
| `src/utils/content.ts`        | `import.meta.glob('../content/posts/**/*.md')`；按语言分组；`getPost(slug, lang)`、`postHref`、日期格式 |
| `src/utils/profile.ts`        | 改为 `activateProfile()` + 当前语言资料；保留 `emphasize` / `multiline`                                   |
| `vite/profile-html.ts`        | 根据 `/`、`/en/` 选择 `profile/zh.json` 或 `en.json`                                                    |
| `src/entries/*.en.ts`         | 新增英文入口                                                                                           |
| `src/i18n/`                   | 新增 `types.ts` / `zh.ts` / `en.ts` / `index.ts`                                                       |
| `src/App.vue`                 | 接收 `lang` 并向下传递（或由入口激活全局；二选一，见 5.3）                                              |
| `src/pages/*.vue`             | 使用当前语言的文章集、资料与字典                                                                       |
| `src/components/*.vue`        | 所有中文字面量替换为字典 / profile 字段                                                                 |
| `src/composables/useDeck.ts`  | `deckPages` 只保留 id，不再导出中文 label                                                               |
| `src/composables/useStickers.ts` | `rabbitPool` 增加 `labelEn`                                                                            |
| `index.html`                  | 增加 `data-lang="zh"`；`en/index.html` 新增英文壳                                                       |
| `scripts/deploy.mjs`          | 缺失文章检查按语言路径；`release.json` 已递归，无需改遍历                                               |
| `scripts/snapshot.mjs`        | 页面列表加入英文首页与英文文章；输出名带语言                                                             |
| `scripts/new-post.mjs`        | 支持 `--lang en`，输出到 `posts/en/`；翻译时沿用中文 `order`                                            |
| `vite/studio.ts` / `studio/client.js` | 文章列表与读写支持语言；资料按语言读写；照片说明增加英文                                                |

### 5.6 文章日期与排序

- 中文保持 `2026.11.13` 的点号风格；
- 英文建议 `Nov 13, 2026`（`Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' })`），
  在 96px 的列表日期列内可以放下；
- 排序仍按 `order` 升序、草稿置底；英文列表只含英文文章，`order` 与中文一致；
- `status` 是内容字段，按语言各自填写，不自动翻译。

## 6. UI 文案清单

### 6.1 迁移规则

| 类型                     | 放哪里                            | 例子                                               |
| ------------------------ | --------------------------------- | -------------------------------------------------- |
| 结构性 UI                | `src/i18n/{zh,en}.ts`             | 导航、区块标题、按钮、目录、翻页提示、贴纸 UI      |
| 作者个人内容             | `src/content/profile/<lang>.json` | 站名、眉题、大标题、欢迎语、关于、联系、页脚、跑马灯 |
| 文章内容                 | `src/content/posts/{,en/}*.md`    | 标题、摘要、正文、标签                             |
| 素材元数据               | 数据文件附加 `<field>En`          | 照片说明、兔子贴纸名                               |
| 入口壳                   | `gen-entries.mjs` + 字典          | title 后缀、description、noscript                  |

### 6.2 主要文案对照

| 位置 / key                    | 中文                          | 英文（建议）                         |
| ----------------------------- | ----------------------------- | ------------------------------------ |
| `nav.about/photos/...`        | 关于 / 照片 / 博客 / 联系     | About / Photos / Writing / Contact   |
| `nav.main`                    | 主导航                        | Main navigation                      |
| `deck.caption`                | 翻页                          | Pages                                |
| `deck.pages.top`              | 封面                          | Cover                                |
| `hero.read`                   | 读点东西                      | Read something                       |
| `hero.about`                  | 我是谁                        | About me                             |
| `sections.about`              | 关于                          | About                                |
| `sections.photos`             | 照片墙                        | Photos                               |
| `sections.writing`            | 博客                          | Writing                              |
| `sections.contact`            | 联系                          | Contact                              |
| `photos.hint`                 | 在「内容工作台」上传……        | Upload in Studio, or place images in `assets/photos/` |
| `posts.hint`                  | 慢慢写，不追热点              | Writing slowly, not chasing trends   |
| `posts.empty`                 | 文章目前只有中文版。          | Articles are currently published in Chinese only. |
| `posts.zhLink`                | 去看中文博客                  | Read the Chinese blog                |
| `article.toc`                 | 目录                          | Contents                             |
| `article.back`                | ← 回首页                      | ← Back home                          |
| `article.minutes(n)`          | 约 n 分钟                     | n min read                           |
| `article.next`                | 继续读下一篇 →                | Read next →                          |
| `article.notFound`            | 文章不存在                    | Article not found                    |
| `article.notFoundBody`        | 这个地址没有对应的文章……      | There is no article at this address. |
| `footer.back`                 | 回到封面 ↑                    | Back to cover ↑                      |
| `stickers.toggleOn/Off`       | 隐藏贴纸 / 显示贴纸           | Hide stickers / Show stickers        |
| `stickers.flip`               | 翻面                          | Flip                                 |
| `stickers.flipBack`           | 翻回正面                      | Flip back                            |
| `stickers.flipHint`           | 点击卡片任意处翻回            | Click anywhere to flip back          |
| `stickers.dateMissing`        | 日期待补充                    | Date TBD                             |
| `stickers.close`              | 关闭预览                      | Close preview                        |
| `loader.subtitle`             | 一起造点东西 · 记录生活       | Making things, recording life        |
| `langSwitch.label`            | 切换语言                      | Switch language                      |

`PageLoader` 的名字取 `profile.name`；英文若字数变化，`loader-sub` 的 `letter-spacing` 从 `.16em` 降到
`.12em` 并允许换行，样式加 `html[lang='en']` 作用域。

### 6.3 无障碍与 HTML 属性

- 所有 `aria-label`、`title`、`alt`、`aria-live` 文案都走字典；
- `<html lang="zh-CN">` / `<html lang="en">` 由入口壳决定；
- 语言切换链接有 `aria-current="true"` 标记当前语言；
- 主题切换按钮的 `aria-label` 也按语言输出（与主题方案联动）；
- `sr-only` 的翻页播报：`第 N 页，共 M 页：关于` / `Page N of M: About`。

### 6.4 `useDeck` 的去中文化

当前 `deckPages` 同时承载 `id` 与中文 `label`，被 `TopBar`、`DeckRail`、`HomePage` 使用。改为：

```ts
export const deckPages = [
  { id: 'top' },
  { id: 'about' },
  { id: 'photos' },
  { id: 'writing' },
  { id: 'contact' },
] as const
```

组件用 `m.deck.pages[page.id]` 取当前语言名称。hash 仍是 `#top` / `#about` / ...，不随语言变化，
因此双语之间可以保留同一个锚点。

## 7. 语言切换

### 7.1 组件

新增 `src/components/LangSwitch.vue`：

- 两个链接：`中` / `EN`，当前语言用 `aria-current="true"` 与颜色区分；
- `aria-label` 来自字典（`Switch language` / `切换语言`）；
- 首页放在 `TopBar` 右侧工具区；文章页与主题按钮组成固定右上角工具组；
- 移动端缩成紧凑样式，不换行。

### 7.2 切换逻辑

```ts
function targetHref(): string {
  if (props.slug) {
    if (locale === 'zh') {
      return hasTranslation(props.slug) ? `/en/posts/${props.slug}.html` : '/en/'
    }
    return `/posts/${props.slug}.html`
  }
  return locale === 'zh' ? '/en/' : '/'
}
```

- 首页点击时若有 hash，追加 `location.hash`：`/en/#about`；无 JavaScript 时退化为 `/en/`；
- 文章页如果两边标题锚点一致，可保留 `#section`；
- 不写 `localStorage`、不设置 Cookie：用户看到的语言始终与 URL 一致；
- 不做自动跳转。首次访问英文浏览器也先看到中文首页，由用户点击切换；避免「URL 是中文、内容却是英文」的分享错位。

### 7.3 切换后的体验

- 跨文档 View Transitions 已存在，语言切换会沿用 180ms 的淡入 + 8px 位移，不需要额外动画；
- 首页切换后落回同一翻页（hash 保留）；文章页落回同一文章（有译文时）；
- 主题选择在跨文档时由启动脚本恢复，不会因为切语言回到默认主题。

## 8. SEO 与元数据

### 8.1 每个入口壳输出

```html
<!-- 英文首页；首批只做首页与资料 -->
<html lang="en">
<head>
  <title>W / H</title>
  <meta name="description" content="A personal site about work, photos, and notes from life.">
  <link rel="canonical" href="http://154.8.177.56/en/">
  <link rel="alternate" hreflang="zh-CN" href="http://154.8.177.56/">
  <link rel="alternate" hreflang="en" href="http://154.8.177.56/en/">
  <link rel="alternate" hreflang="x-default" href="http://154.8.177.56/">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="zh_CN">
</head>
```

- 中文为默认 / `x-default`；
- 只有存在译文时才输出对侧 `hreflang`，避免指向 404；**首批文章页只有中文版本，因此只输出中文 canonical，不输出 `en` alternate**；
- `canonical` 与 `hreflang` 必须绝对地址，统一从 `site.config.mjs` 读取：

```js
// site.config.mjs
export const site = {
  origin: 'http://154.8.177.56',
  defaultLang: 'zh',
}
```

`gen-entries.mjs` 与 `profile-html.ts` 都从这里取 origin；以后换域名只改一行。

### 8.2 首页

- 中文：`title` / `description` 来自 `profile/zh.json`；
- 英文：来自 `profile/en.json`；
- `profile-html.ts` 根据入口文件路径选择语言：`index.html` → zh，`en/index.html` → en；
- `og:locale` 同步输出。

### 8.3 文章（I3 启用后）

- `gen-entries.mjs` 用当前语言的 profile `name` 作为标题后缀；
- 文章 description 优先 `summary`，其次 `title`；
- 英文正文中的内部链接必须指向英文站或明确的中文原文，不能无意跳到中文页面；
- 语言切换链接与 `hreflang` 使用同一套 `hasTranslation` 判断，保证一致。

首批不生成英文文章页，因此文章壳维持现状；`/en/` 的 Writing 页由字典输出说明与回中文博客的链接。

### 8.4 可选：sitemap

本期不强制；如果加，生成 `dist/sitemap.xml`，包含中英两个 URL 与 `xhtml:link` alternates。
没有域名前 sitemap 的价值有限，等域名与 HTTPS 落地后再做。

## 9. 工作台与脚本

### 9.1 `new-post`

```bash
npm run new-post -- my-post "文章标题"              # 中文 → src/content/posts/my-post.md
npm run new-post -- my-post "Title" --lang en      # 英文 → src/content/posts/en/my-post.md
```

- 英文新建时如果中文同 slug 存在，沿用中文 `order`；否则取当前语言最大 `order + 1`；
- 英文模板的 frontmatter 注释用英文，正文占位用 `Write here.`；
- 不允许英文 slug 与中文不同（保持配对键）。

### 9.2 `gen-entries`

- `readPostMetas` 返回 `lang`；
- 清理旧入口时按语言目录分别处理，不能因为英文文件缺失就删掉中文入口；
- 英文壳的 `noscript`、title 后缀、入口脚本、`data-lang` 全部本地化；
- 生成后输出统计：`zh: 3 post(s), en: 3 post(s)`。

### 9.3 `deploy`

- `readPostMetas` 过滤后检查 `dist/posts/<slug>.html` 与 `dist/en/posts/<slug>.html`；
- `walk(dist)` 已经递归，`release.json` 会自动包含 `en/` 文件；
- 服务器同步脚本按 `release.json` 的相对路径下载；实施后要在线上验证 `/en/` 与 `/en/posts/*.html` 返回 200。

### 9.4 `snapshot`

- 页面列表加入 `en-home`、`en-<slug>`；
- 输出文件名带语言：`home-en-1280.png`、`web-101-en-1280.png`；
- 与主题方案联动：`{zh,en} × {dark,light} × {1280,768,500}`；
- Puppeteer 可用 `page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])`
  验证系统默认，或用 `page.evaluateOnNewDocument` 预置 `localStorage` 验证手动选择。

### 9.5 内容工作台

数据布局变化后，工作台必须同批更新：

- 文章列表扫描 `src/content/posts` 与 `src/content/posts/en`，返回 `lang`；
- 列表显示 `中文 / EN` 标识，编辑时按语言写回对应文件；
- 「新建文章」选择语言；英文新建沿用中文 `order`；
- 资料编辑增加 `中文 / English` 切换，分别读写 `profile/zh.json`、`profile/en.json`；
- 照片编辑增加英文说明字段（可选）；
- 删除、移动到 `.studio-trash/` 时保留语言目录结构。

如果不改工作台，至少保证它不会把英文文件当成中文文件写回；实施时宁可先只读英文，再补编辑。

## 10. 验收标准

| 项               | 通过条件                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| URL              | `/`、`/posts/*.html`、`/docs/web-101.html` 与现状一致；`/en/`、`/en/posts/*.html` 返回 200                |
| 语言正确         | 每个页面 `<html lang>` 正确；英文页面不出现中文 UI 文案（正文引用中文原文除外）                            |
| 语言切换         | 首页保留翻页 hash；有译文的文章保留锚点；无译文时落到 `/en/`；返回中文始终可用                            |
| 无自动跳转       | 英文浏览器访问 `/` 仍显示中文；URL 与内容始终一致                                                          |
| SEO              | 查看源码可见 `canonical`、`hreflang`、`og:locale`；不存在的译文不输出对侧 alternate                        |
| 构建             | 首批 `npm run build` 产出 `dist/en/index.html`；I3 启用后新增英文 md 自动产出 `en/posts/<slug>.html`      |
| 旧链接           | `docs/web-101.html` 跳转仍有效，仍指向中文文章                                                             |
| 首批内容         | 英文首页、关于、照片、联系、页脚、所有 UI 文案为英文；Writing 页显示英文说明并链回中文博客                  |
| I3 内容（后续）  | 英文文章的标题、摘要、导语、正文、标签、`next` 均为英文；代码块、链接、标题锚点与中文对应                  |
| 版面             | 英文在 1280 / 768 / 500 / 375 / 320 无横向溢出；首屏大标题、顶栏、文章列表日期列不挤压                    |
| 主题组合         | `{zh,en} × {dark,light}` 全部截图通过（与主题方案共用矩阵）                                                |
| 工程             | `npm run lint`、`npm run typecheck`、`npm run build` 通过；JS gzip ≤ 60 KB、CSS gzip ≤ 15 KB                |
| 工作台           | 中英文资料能切换、编辑、保存；I3 启用后再验收文章双语编辑                                                |
| 发布             | `release.json` 包含 `en/` 文件；线上 `/en/` 可访问；I3 启用后再验收英文文章；回滚仍按整目录进行           |

## 11. 实施批次

### 批次 I1 — 英文首页入口

- 新增 `en/index.html`、`src/entries/home.en.ts`、Vite `en-home` 输入；
- `profile-html.ts` 按路径选择 zh / en 资料；主题启动脚本对 `/en/` 生效；
- 验收：`/en/` 可打开，中文站完全不变；英文页暂时显示占位文案。

### 批次 I2 — UI 字典、资料与英文首页

- 新增 `src/i18n/{types,zh,en}.ts`、`activateI18n`；
- `profile.json` 拆成 `profile/{zh,en}.json`，`activateProfile`；
- 所有组件中文字面量迁入字典；英文首页、导航、翻页、照片、联系、页脚完成；
- `/en/#writing` 显示 `posts.empty` 说明 + 回中文博客链接；语言切换与主题按钮组合；
- 验收：`/en/` 完整可用，中文无回归，英文无中文 UI 泄漏；1280 / 768 / 500 / 375 / 320 无溢出。

### 批次 I3 — 英文文章（暂缓，待授权）

- 前提：文章由作者本人撰写或获得翻译授权；首批不做；
- 翻译文章，按同 slug 放入 `posts/en/`；
- `readPostMetas` / `Post.lang` / `gen-entries` / `deploy` / `snapshot` 支持英文文章入口；
- 文章壳输出 `canonical` / `hreflang` / `og:locale`；
- 验收：英文文章可读、可切换、可索引；中文 URL 不变。

### 批次 I4 — 工作台、脚本与文档

- Studio 资料编辑支持 zh / en；如 I3 启用，再加文章语言切换与 `new-post --lang`；
- 截图矩阵（`{zh,en} × {dark,light} × {1280,768,500}`）；
- 更新 `README.md`、`notes/ARCHITECTURE.md`、`notes/AUTHORING.md`、`CHANGELOG.md`；
- 验收：从零 `npm ci && npm run build` 通过；工作台能维护中英资料；文档能指导后续补英文文章。

## 12. 风险与对策

| 风险                                   | 影响                                             | 对策                                                                 |
| -------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| 翻译内容漂移                           | 中英文信息不一致、链接失效                       | 把「标题锚点、代码块、外链、`next`、`order`」写进翻译检查清单         |
| 英文入口漏生成                         | 线上 `/en/posts/x.html` 404                      | `deploy` 按语言检查产物；构建后本地遍历 URL 矩阵                      |
| `/en/` 目录索引不生效                  | 英文首页 404                                     | 先验证 Caddy；失败则统一使用 `/en/index.html`                         |
| 双语都打进 bundle                      | 首屏超过 60 KB                                   | 每个入口只静态引入当前语言字典与资料；构建后量 gzip                   |
| 英文排版溢出                           | 顶栏、首屏大标题、文章列表在窄屏被挤坏           | 500 / 375 / 320 三档截图；英文标题单独调 `letter-spacing` 与字号      |
| 语言切换丢页面                         | 用户从文章切到英文首页，或反之                   | 用 `hasTranslation` 生成链接；首页保留 hash；文章保留锚点             |
| hreflang 指向 404                      | 搜索引擎报告错误                                 | 只为已存在的翻译输出 alternate；与语言切换共用同一判断                |
| 工作台写错语言文件                     | 英文内容被写进中文目录，或反向                   | Studio 同批改造；服务端按 `lang` 校验路径；先只读再开放写              |
| 自动跳转造成分享错位                   | 收件人看到与自己语言不一致的页面                 | 明确不做自动跳转；URL 即语言                                          |
| `profile.json` 迁移遗漏                | Studio、`profile-html`、文档引用旧路径           | 全文搜索 `profile.json`；保留兼容读取一个版本，再删除                 |
| 中文旧链接被带动                       | `/docs/web-101.html` 或文章 URL 失效             | 中文根路径不动；验收清单包含旧链接                                    |

## 13. 英文文案风格

- 语气与中文一致：克制、具体、不过度营销；
- 标题用句首大写（Sentence case），导航用单词首字母大写（About / Photos / Writing / Contact）；
- 品牌名、署名待作者确认；本文用 `Wang Hao` / `W / H` 作占位，确定后统一替换；
- 保留技术名词原样：`Markdown`、`Vite`、`Vue`、`UnoCSS`、`WebP`、`AI`；
- 日期用 `Nov 13, 2026`；阅读时长用 `8 min read`；
- 引号用弯引号 `“ ”`，破折号用 `—`；避免中文标点混入英文页面；
- 文章翻译保留代码块、链接、图片、标题锚点；`## 第一节 {#first}` → `## First section {#first}`。

## 14. 待确认事项

已确认：

- **英文站名**：`W / H`；
- **首批不翻译文章**：部分文章不是作者本人撰写，英文 Writing 页只放说明与回中文博客的链接；
- **主题默认跟随系统**：与 [主题方案](theme-plan.md) 一致。

待确认：

1. **英文首页首屏两行大标题**：需要作者给出「造点 / 东西」的英文短句；当前文档用 `Make / things` 占位。
2. **照片英文说明**：是否要求每张都填；建议可选，缺省回退中文。
3. **是否自动识别英文浏览器**：本文明确不做；如果以后要加，只做可关闭的提示横幅，不做强制跳转。
4. **I3 何时启用**：取决于文章是否由作者本人撰写或获得翻译授权。
