# 站内内容工作台

> 状态：Phase 1 已落地（2026-11-17）。当前是仅本机可访问的 Studio，已能编辑文章、
> 上传照片和修改个人资料；发布仍走现有构建 / 部署链。

## 1. 结论先行

站点是纯静态 MPA：文章在构建期从 `src/content/posts/*.md` 解析，线上没有 Node 运行时，
Caddy 配置不可改，服务器也不能直连 GitHub；加上服务器目前不具备备案条件，公网后台
不再作为目标。因此工作台做成**只在开发环境存在、只监听本机**的工具：

```bash
npm run studio
# 浏览器打开 http://127.0.0.1:5173/studio
```

它直接读写仓库文件，复用 `npm run build` / `npm run deploy`。生产构建不包含 Studio 的
页面、接口或依赖；`--host` 暴露到局域网时接口会返回 403。

如需在外面改内容，优先用 SSH / Tailscale 隧道连回这台机器，而不是把编辑器部署到公网。

## 2. 现状与硬约束

| 约束                       | 对方案的影响                                       |
| -------------------------- | -------------------------------------------------- |
| Caddy 配置在 `/etc` 不可改 | 不能加 `/admin` 反向代理、不能加 history 路由      |
| 只有静态文件               | 没有服务端 session、数据库、上传接口               |
| 文章构建期生成             | 新文章必须重新 build，才能产出 `posts/<slug>.html` |
| 服务器不能 `git pull`      | 发布仍走 jsDelivr + commit SHA + 现有同步脚本      |
| 线上只有 HTTP              | 不能依赖安全 Cookie / HTTPS 登录                   |
| 服务器不具备备案条件       | 不做公网后台；工作台限定本机                       |

## 3. 已实现

### 3.1 形态

`vite/studio.ts` 是 `apply: 'serve'` 的 Vite 插件：

```
npm run studio
  └─ vite（127.0.0.1）
       ├─ /            现有站点，热更新
       └─ /studio      工作台 UI（原生 HTML / CSS / JS）
            └─ /__studio/api/*   本机中间件，读写仓库文件
```

- 接口先检查 `Host` 是否为 `localhost` / `127.0.0.1` / `::1`，否则 403；
- 所有写入使用「同目录临时文件 + rename」，失败不会留下半写文件；
- 文章 slug 只允许 kebab-case；照片文件名由服务端按日期 + 内容哈希生成，不接受任意路径；
- JSON 请求体限制 2 MB，照片限制 2 MB；照片只接受 `image/webp` 并校验 RIFF 头与尺寸。

### 3.2 三个编辑模块

**文章**

- 列表、frontmatter 表单（标题 / 日期 / 状态 / tags / summary / lede / minutes / order /
  toc / next / draft）与 Markdown 正文；
- 保存写回 `src/content/posts/<slug>.md`；新建复用现有模板规则；
- 删除移到 `.studio-trash/posts/`（已 gitignore），不会直接丢文件；
- 「生成文章入口」调用 `scripts/gen-entries.mjs`，新建或删除后自动执行。

没有内嵌 Markdown 预览：保存后直接打开站点文章页看真实渲染，避免再维护一套解析器。

**照片**

- 选择或拖入图片后，浏览器 canvas 自动旋转（按 EXIF 方向）、长边缩到 1600px、
  导出 WebP（质量 0.82），再把字节 POST 给本机接口；
- 服务端校验 WebP 头与宽高，按 `YYYY-MM-DD-<hash8>.webp` 写入
  `public/assets/photos/`；
- 照片先进入照片库，再分配到 t1–t8 槽位；`src/content/photos.json` 保存索引，
  未分配的只留在库里；
- 删除只删索引，不删磁盘文件，避免误操作。

**个人资料**

- `src/content/profile.json` 是唯一资料源：站点标题、描述、封面眉题、两行大标题、
  欢迎语、关于导语与段落、四张信息卡、联系邮箱 / GitHub、页脚；
- `**文字**` 渲染为橙色强调，其余内容先转义，因此 JSON 里不能注入 HTML；
- `vite/profile-html.ts` 在 dev / build 时把标题与描述注入 `index.html`；
- 保存后 Vite 热更新；浏览器标题修改需要刷新页面。

### 3.3 预览与发布

- 保存内容 → Vite 热更新，站点标签页自动刷新；
- 构建 / 发布仍手动执行：

```bash
npm run build
npm run deploy
```

- 工作台没有「发布」按钮，也不改动现有部署脚本；WorkBuddy 保持暂停。

## 4. 数据结构

```jsonc
// src/content/profile.json
{
  "name": "小王同学",
  "title": "W / H · 小王同学",
  "description": "小王同学的个人网站：作品、照片，还有一些生活记录。",
  "eyebrow": "生活记录",
  "heroLines": ["造点", "东西"],
  "heroLede": "欢迎你来到我的一处小天地。\n这里放一些作品、照片，还有一些没处说的想法。",
  "about": {
    "lead": "我做的事情，说白了就是**把复杂的东西讲清楚，再把它做出来**。",
    "paragraphs": ["……", "……"],
    "cards": [{ "key": "现在", "text": "无人机综合管控 / 森林防火 / 智慧国土" }],
  },
  "contact": {
    "lead": "想聊无人机、前端，或者**只是想打个招呼**。",
    "email": "1613104610@qq.com",
    "github": "https://github.com/laowang7532",
  },
  "footer": {
    "copyright": "© 2026 小王同学",
    "tagline": "Built by hand · 部署于腾讯云轻量",
  },
}
```

```jsonc
// src/content/photos.json
[
  {
    "slot": "t1",
    "src": "/assets/photos/2026-11-17-a1b2c3d4.webp",
    "caption": "起飞前的十分钟",
    "alt": "",
  },
]
```

文章继续使用原 frontmatter；新增字段时同步 `src/types/post.ts` 与 `vite/content.ts`。

## 5. 尚未实现

- 工作台内的「构建 / 发布」按钮（目前用命令行，保持发布链单一入口）；
- Markdown 实时预览与图片拖入正文；
- 照片磁盘文件的删除 / 清理；
- 多用户、登录、权限。按当前约束不做；需要远程访问时走隧道，不暴露端口。

## 6. 验收

- `npm run studio` 只从 `127.0.0.1` 打开；`npm run build` 产物不含 Studio 页面与接口；
- 文章保存后出现在首页列表，`npm run gen` / 工作台按钮能生成真实 `posts/<slug>.html`；
- 图片上传自动转 WebP、长边 ≤1600px，分配到槽位后出现在首页照片墙；
- 资料修改同步反映到封面、关于、联系与页脚；
- 保存失败不会留下半写文件；删除的文章可从 `.studio-trash/` 恢复；
- 现有发布脚本与 WorkBuddy 流程无需改动。

## 7. 如果一定要公网直接编辑

按代价从低到高：

1. **Sveltia / Decap CMS + GitHub OAuth**：静态 `/admin` 页面直接提交到 GitHub；
   需要一个 OAuth 代理（Cloudflare Worker）和 CI 构建；解决的是「远程改内容」，
   不解决「立即上线」，服务器仍需同步脚本。北京访问 GitHub 的稳定性是主要风险。
2. **Supabase / 其他 BaaS**：提供登录、数据库、对象存储；站点改为运行时拉取内容，
   会牺牲构建期 SEO 与首屏确定性，并引入外部依赖和密钥管理。
3. **自建后台 + 独立域名/端口**：Caddy 不可改，只能另开端口或另购反代；鉴权、备份、
   监控、HTTPS 全部自担，不建议为个人站承担这套运维，而且当前服务器不具备备案条件。

除非站点变成多人协作或需要每天远程发布，否则本机 Studio 已经覆盖需求。
