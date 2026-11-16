/**
 * 对 dist/ 做三档宽度的基线截图，输出到 notes/snapshots/。
 * 需要先 npm run build。
 *
 * 用法：npm run snapshot
 * 可用 CHROME_PATH 指定 Chrome/Chromium 路径。
 */
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import puppeteer from 'puppeteer-core'
import { readPostMetas } from './lib/posts.mjs'

const root = process.cwd()
const dist = join(root, 'dist')
const outDir = join(root, 'notes', 'snapshots')
const widths = [1280, 768, 500]
const height = 900

if (!existsSync(join(dist, 'index.html'))) {
  console.error('✗ 先运行 npm run build')
  process.exit(1)
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  return candidates.find(path => existsSync(path))
}

const chrome = findChrome()
if (!chrome) {
  console.error('✗ 找不到 Chrome，请设置 CHROME_PATH=/path/to/chrome')
  process.exit(1)
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost')
    let pathname = decodeURIComponent(url.pathname)
    if (pathname.endsWith('/')) pathname += 'index.html'
    const file = normalize(join(dist, pathname))
    if (file !== dist && !file.startsWith(dist + sep)) {
      response.writeHead(403).end('forbidden')
      return
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end('not found')
      return
    }
    response.writeHead(200, {
      'content-type': mime[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    response.end(readFileSync(file))
  } catch {
    response.writeHead(500).end('server error')
  }
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()

const posts = readPostMetas(root).filter(post => !post.draft)
const pages = [
  { name: 'home', path: '/' },
  ...posts.map(post => ({ name: post.slug, path: `/posts/${post.slug}.html` })),
  { name: 'docs-web-101', path: '/docs/web-101.html' },
]

mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    '--no-proxy-server',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--disable-gpu',
  ],
})

let failed = false
try {
  for (const width of widths) {
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    for (const item of pages) {
      const url = `http://127.0.0.1:${port}${item.path}`
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
        // 等翻页动画结束（最长 2.15s + 淡出）
        await new Promise(resolve => setTimeout(resolve, 4200))
        const metrics = await page.evaluate(() => ({
          title: document.title,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollHeight: document.documentElement.scrollHeight,
          url: location.pathname,
        }))
        const file = join(outDir, `${item.name}-${width}.png`)
        await page.screenshot({ path: file })
        const overflow = metrics.scrollWidth > metrics.clientWidth
        if (overflow) failed = true
        console.log(
          JSON.stringify({
            page: item.name,
            width,
            overflow,
            ...metrics,
            file: file.replace(root + sep, ''),
          }),
        )
      } catch (error) {
        failed = true
        console.error(`✗ ${item.name} @ ${width}: ${error.message}`)
      }
    }
    await page.close()
  }
} finally {
  await browser.close()
  server.close()
}

if (failed) {
  console.error('✗ 截图过程中有页面失败或出现横向溢出')
  process.exit(1)
}
console.log(`\n✓ 截图已输出到 ${outDir}`)
