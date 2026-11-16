# 部署说明

面向开发方与 WorkBuddy 的发布手册。线上服务器在北京，Caddy 配置不可改。

## 1. 链路

```
开发方 push main
      ↓
WorkBuddy 每日 10:00 检测 origin/main
      ↓
npm ci → npm run build → npm run deploy
      ↓
dist 孤儿分支 push，得到 commit SHA
      ↓
服务器按 SHA 从 jsDelivr 逐个下载到 /usr/share/caddy
      ↓
自检 5 个 URL → 失败则用 /var/www/site-prev 回滚
```

关键点：

- `dist` 分支是**孤儿分支**，只放构建产物；每次发布一个根提交，message 为 `release: <main 短 SHA>`。
- 服务器只用 **dist 分支的 commit SHA**，禁止 `@main`（CDN 缓存最长 12 小时）。
- 线上只开 80；所有自检用 `http://`。
- 只操作 `/usr/share/caddy` 与 `/var/www`，**不要碰 `/etc`**（会被 EdgeOne WAF 拦截）。

## 2. 开发方发布

### 2.1 发布前检查

```bash
npm ci
npm run lint
npm run build
npm run preview
```

`npm run build` 会先运行 `npm run gen`，再执行 `vue-tsc --noEmit && vite build`。
构建后 `dist/` 应包含：

```
dist/index.html
dist/posts/web-101.html
dist/posts/hello-world.html
dist/posts/why-i-build.html
dist/docs/web-101.html
dist/assets/*.js
dist/assets/*.css
dist/assets/photos/README.md
```

### 2.2 发布

```bash
npm run deploy
```

脚本行为：

1. 执行 `npm run build`；
2. 校验每篇已发布文章都有对应的 `dist/posts/<slug>.html`；
3. 生成 `dist/release.json`（本次发布的文件清单，供服务器拉取）；
4. 用临时 index 把 `dist/` 写成 tree，创建一个**没有父提交**的发布提交；
5. `git push --force origin <commit>:refs/heads/dist`；
6. 打印短 SHA、文件数、体积与 jsDelivr 地址。

输出示例：

```
  source   ca46dac
  commit   3f2a1b9...
  files    12 个，共 128.4 KB
  message  release: ca46dac
  jsDelivr https://cdn.jsdelivr.net/gh/laowang7532/personal-site@3f2a1b9...
  status   已推送到 origin/dist
```

只验证流程、不推送远端：

```bash
npm run deploy -- --dry-run
```

已经构建过，跳过再次构建：

```bash
npm run deploy -- --no-build
```

> 日常只需要 push `main`，WorkBuddy 会完成构建与发布。手动 `npm run deploy`
> 用于首次发布、紧急修复或本地验证。

## 3. WorkBuddy 定时任务

- 频率：每天 10:00。
- 去重：`~/.workbuddy/state/personal-site-deploy.json` 记录上次发布的 `main` SHA。
- 流程：

```bash
git fetch origin main
git checkout main
git reset --hard origin/main
npm ci
npm run deploy
```

`npm run deploy` 内部会构建；它会打印 `commit` 与 `jsDelivr` 两行，后续步骤必须使用
`commit` 的完整 SHA。

失败策略：构建失败不动线上；同步失败整目录回滚；只报告，不自动重试。

## 4. 服务器同步

以下命令在云服务器上执行（WorkBuddy 通过 `lighthouse-ops` 远程执行）。

### 4.1 变量

```bash
SHA=<npm run deploy 输出的 commit>
BASE="https://cdn.jsdelivr.net/gh/laowang7532/personal-site@$SHA"
ROOT=/usr/share/caddy
PREV=/var/www/site-prev
```

### 4.2 备份现网

```bash
install -d "$PREV"
rsync -a --delete "$ROOT/" "$PREV/"
```

`--delete` 保证备份目录只保留最近一版。

### 4.3 清理旧入口与旧哈希资源

```bash
find "$ROOT" -maxdepth 1 -type f -name 'index.html' -delete
[ -d "$ROOT/posts" ] && find "$ROOT/posts" -maxdepth 1 -type f -name '*.html' -delete
[ -d "$ROOT/docs" ] && find "$ROOT/docs" -maxdepth 1 -type f -name '*.html' -delete
[ -d "$ROOT/assets" ] && find "$ROOT/assets" -maxdepth 1 -type f \( -name '*.js' -o -name '*.css' \) -delete
```

保留 `assets/photos/`，避免每次发布重传照片。

### 4.4 按清单下载

```bash
curl -fsS --retry 3 "$BASE/release.json" -o /tmp/personal-site-release.json
python3 -c 'import json; [print(f) for f in json.load(open("/tmp/personal-site-release.json"))["files"]]' \
  > /tmp/personal-site-files.txt

while IFS= read -r path; do
  mkdir -p "$ROOT/$(dirname "$path")"
  curl -fsS --retry 3 "$BASE/$path" -o "$ROOT/$path"
done < /tmp/personal-site-files.txt
```

`release.json` 不包含自身；它只列出本次构建的全部产物。文件名建议保持 ASCII
（文章 slug 本身已限制为 kebab-case）。

### 4.5 自检

```bash
for path in / /posts/web-101.html /posts/hello-world.html /posts/why-i-build.html /docs/web-101.html; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1$path")
  echo "$code $path"
  [ "$code" = "200" ] || exit 1
done
```

全部 200 才算成功；随后可把发布记录追加到 `CHANGELOG.md` 的「发布记录」。

### 4.6 失败回滚

```bash
rsync -a --delete "$PREV/" "$ROOT/"
```

回滚后重新执行 4.5 自检。备份目录保留的是发布前那一版，不要覆盖它。

## 5. 常见故障

| 现象                                   | 原因                              | 处理                                                                                                             |
| -------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| jsDelivr 404 / 内容仍旧                | 用了 `@main` 或 CDN 未刷新        | 改用 dist commit SHA；等待 1–2 分钟或访问 `https://purge.jsdelivr.net/gh/laowang7532/personal-site@<SHA>/<path>` |
| 远程命令报 `EO_WEB_PROTECTION_BLOCKED` | 触碰了 `/etc` 等被 WAF 保护的路径 | 只操作 `/usr/share/caddy` 与 `/var/www`，不要读改 Caddy 配置                                                     |
| 首页 200，文章 404                     | 入口壳未生成或未提交              | 本地 `npm run gen && npm run build`，确认 `dist/posts/<slug>.html` 存在后再发布                                  |
| 页面无样式 / JS 404                    | 旧哈希资源被清掉但新文件没下全    | 检查 `release.json` 文件清单，重跑 4.4；仍失败则回滚                                                             |
| 文章 URL 变成目录形式                  | 改了构建形态或链接                | 保持 `/posts/<slug>.html`，不要去掉 `.html`，不要使用 history 路由                                               |
| 浏览器仍加载旧页面                     | 浏览器缓存                        | 强制刷新；入口 HTML 引用的哈希文件名变化后会自动失效                                                             |
| 下载后 Caddy 403                       | 文件权限/属主不对                 | `chown -R caddy:caddy /usr/share/caddy`（按线上实际用户调整）                                                    |

## 6. 相关文件

- `scripts/deploy.mjs`：构建、生成 `release.json`、创建并推送 dist 孤儿提交。
- `scripts/snapshot.mjs`：发布前视觉抽查。
- `CHANGELOG.md`：变更与发布记录。
- `docs/v2-migration-plan.md`：本次改造的完整方案与约束。
