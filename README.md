# personal-site

小王同学的个人网站。零依赖纯静态站，`git clone` 下来双击 `index.html` 就能看。

## 结构

```
personal-site/
├── index.html              首页（自我介绍 / 照片墙 / 博客列表 / 联系）
├── assets/
│   ├── css/style.css       全站样式（改配色只动 :root 里的变量）
│   ├── css/post.css        文章页样式
│   ├── js/main.js          加载动画、背景纹络、光标、滚动入场、贴纸
│   └── photos/             照片墙的图片放这里
├── posts/                  文章页（每篇一个 html）
└── docs/web-101.html       建站名词与流程科普（可删）
```

## 本地预览

```bash
cd personal-site
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 怎么改

| 想改什么 | 改哪 |
|---|---|
| 站点配色 | `assets/css/style.css` 顶部 `:root` 里的 `--orange` / `--blue` / `--bg` |
| 大标题「造点东西」 | `index.html` 里 `.display` 那两行 |
| 自我介绍 | `index.html` 的 `#about` 区块 |
| 照片墙 | 把图片放进 `assets/photos/`，再把 `index.html` 里对应 `.ph` 的 `background-image` 换成 `url(assets/photos/xxx.jpg)` |
| 加一篇博客 | 复制 `posts/hello-world.html` 改名，再在 `index.html` 的 `.posts` 列表里加一行 |
| 贴纸 | `assets/js/main.js` 底部的 `STICKERS` 数组，或者拖动网页里的贴纸 |

## 部署

静态站，任何 web 服务器都能跑。

### 线上地址

| 用途 | 地址 |
|---|---|
| 主站（腾讯云轻量） | http://154.8.177.56/ |
| 备用（GitHub Pages，自带 HTTPS、免备案） | https://laowang7532.github.io/personal-site/ |

### 更新流程（由 AI 代劳，用户只需说"更新"）

1. 本地改文件 → `git add -A && git commit && git push`
2. 服务器上拉取并同步：

```bash
cd /var/www/personal-site && git pull -q
cp index.html /usr/share/caddy/index.html
cp -r /var/www/personal-site/assets/. /usr/share/caddy/assets/
cp -r /var/www/personal-site/posts/.  /usr/share/caddy/posts/
cp -r /var/www/personal-site/docs/.   /usr/share/caddy/docs/
```

> 注意 `源目录/. 目标目录/` 的写法，写成 `cp -r assets /usr/share/caddy/assets` 会多套一层变成 `assets/assets`。
> Caddy 用的是出厂默认配置（root 指向 `/usr/share/caddy`），所以同步落在这里。想改成指向 `/var/www/personal-site`，需要在服务器上改 `/etc/caddy/Caddyfile`。

### 换到别的地方

Vercel / Cloudflare Pages / GitHub Pages 都行，推上去就有地址（GitHub Pages 已启用）。

## 生态位说明

这是"先跑起来"的第一版：单页 + 手写 HTML，改起来最直观。
等内容多到十几个页面、想要标签和 RSS 时，再迁到 Astro 或 Next.js，那时候结构和现在这套 CSS 都能直接复用。
