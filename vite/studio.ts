import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import matter from 'gray-matter'
import type { Plugin, ViteDevServer } from 'vite'
import type { PhotoEntry } from '../src/types/site'

const API = '/__studio/api'
const STUDIO_DIR = fileURLToPath(new URL('./studio/', import.meta.url))
const POSTS_REL = 'src/content/posts'
const PROFILE_REL = 'src/content/profile.json'
const PHOTOS_REL = 'src/content/photos.json'
const PHOTO_OUT_REL = 'public/assets/photos'
const TRASH_REL = '.studio-trash/posts'
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_JSON = 2 * 1024 * 1024
const MAX_IMAGE = 2 * 1024 * 1024

const run = promisify(execFile)

type Json = Record<string, unknown>

function send(res: ServerResponse, status: number, body: string, type: string): void {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body)
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8')
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message })
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('请求体过大')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

async function readJson(req: IncomingMessage, limit = MAX_JSON): Promise<Json> {
  const raw = await readBody(req, limit)
  if (!raw.length) return {}
  const parsed: unknown = JSON.parse(raw.toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('请求体必须是 JSON 对象')
  }
  return parsed as Json
}

async function writeAtomic(file: string, content: string | Buffer): Promise<void> {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temp, content)
  await fs.rename(temp, file)
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function isLocalRequest(req: IncomingMessage): boolean {
  const host = (req.headers.host ?? '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') return false

  // 浏览器发起的跨站请求会带 Origin；没有 Origin 的是 curl / 同源导航。
  const origin = req.headers.origin
  if (!origin) return true
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
}

function webpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null

  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    }
  }

  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    }
  }

  if (chunk === 'VP8L') {
    const packed = buffer.readUInt32LE(21)
    return {
      width: (packed & 0x3fff) + 1,
      height: ((packed >> 14) & 0x3fff) + 1,
    }
  }

  return null
}

async function listPosts(root: string) {
  const dir = join(root, POSTS_REL)
  const files = (await fs.readdir(dir)).filter(file => file.endsWith('.md'))
  const posts = await Promise.all(
    files.map(async file => {
      const raw = await fs.readFile(join(dir, file), 'utf8')
      const { data } = matter(raw)
      return {
        slug: file.slice(0, -'.md'.length),
        title: String(data.title ?? file.slice(0, -'.md'.length)),
        date: normalizeDate(data.date),
        status: data.status ? String(data.status) : '',
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        order: typeof data.order === 'number' ? data.order : 999,
        draft: Boolean(data.draft),
      }
    }),
  )
  return posts.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

function cleanFrontmatter(input: Json): Json {
  const data: Json = { ...input }
  const emptyKeys = ['status', 'lede', 'link', 'next']
  for (const key of emptyKeys) {
    if (data[key] === '' || data[key] === undefined) delete data[key]
  }
  if (data.date === '' || data.date === undefined) data.date = null
  if (data.minutes === '' || data.minutes === undefined) data.minutes = null
  if (!Array.isArray(data.tags)) data.tags = []
  if (typeof data.order !== 'number') data.order = Number(data.order) || 999
  if (typeof data.draft !== 'boolean') data.draft = Boolean(data.draft)
  if (typeof data.toc !== 'boolean') data.toc = Boolean(data.toc)
  return data
}

function page(res: ServerResponse, file: string, type: string): void {
  fs.readFile(file, 'utf8')
    .then(body => send(res, 200, body, type))
    .catch(() => sendError(res, 404, '文件不存在'))
}

/** 仅开发环境可用的内容工作台：单机、无鉴权，写入仓库文件。 */
export function studioPlugin(root: string): Plugin {
  return {
    name: 'studio',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const postsDir = join(root, POSTS_REL)
      const profileFile = join(root, PROFILE_REL)
      const photosFile = join(root, PHOTOS_REL)
      const photoOutDir = join(root, PHOTO_OUT_REL)
      const trashDir = join(root, TRASH_REL)

      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        const port = address && typeof address === 'object' ? address.port : 5173
        server.config.logger.info(`  ➜  Studio: http://127.0.0.1:${port}/studio（仅本机）`)
      })

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = url.pathname
        if (!pathname.startsWith('/studio') && !pathname.startsWith(API)) {
          next()
          return
        }

        if (!isLocalRequest(req)) {
          sendError(res, 403, '内容工作台只接受本机访问')
          return
        }

        void (async () => {
          const method = req.method ?? 'GET'

          if (method === 'GET' && (pathname === '/studio' || pathname === '/studio/')) {
            page(res, join(STUDIO_DIR, 'index.html'), 'text/html; charset=utf-8')
            return
          }
          if (method === 'GET' && pathname === '/studio/client.js') {
            page(res, join(STUDIO_DIR, 'client.js'), 'text/javascript; charset=utf-8')
            return
          }
          if (method === 'GET' && pathname === '/studio/style.css') {
            page(res, join(STUDIO_DIR, 'style.css'), 'text/css; charset=utf-8')
            return
          }

          if (method === 'GET' && pathname === `${API}/state`) {
            const [posts, profile, photos] = await Promise.all([
              listPosts(root),
              fs.readFile(profileFile, 'utf8').then(raw => JSON.parse(raw) as unknown),
              fs.readFile(photosFile, 'utf8').then(raw => JSON.parse(raw) as unknown),
            ])
            sendJson(res, 200, { posts, profile, photos })
            return
          }

          if (method === 'POST' && pathname === `${API}/gen`) {
            const result = await run(process.execPath, [join(root, 'scripts/gen-entries.mjs')], {
              cwd: root,
            })
            sendJson(res, 200, { ok: true, stdout: result.stdout, stderr: result.stderr })
            return
          }

          if (pathname === `${API}/profile`) {
            if (method === 'GET') {
              const profile = JSON.parse(await fs.readFile(profileFile, 'utf8')) as unknown
              sendJson(res, 200, profile)
              return
            }
            if (method === 'PUT') {
              const profile = await readJson(req)
              await writeAtomic(profileFile, `${JSON.stringify(profile, null, 2)}\n`)
              sendJson(res, 200, { ok: true })
              return
            }
          }

          if (pathname === `${API}/photos`) {
            if (method === 'GET') {
              const photos = JSON.parse(await fs.readFile(photosFile, 'utf8')) as unknown
              sendJson(res, 200, photos)
              return
            }
            if (method === 'PUT') {
              const raw = await readBody(req, MAX_JSON)
              const parsed: unknown = JSON.parse(raw.toString('utf8'))
              if (!Array.isArray(parsed)) throw new Error('照片数据必须是数组')
              const photos: PhotoEntry[] = parsed.map(item => {
                if (!item || typeof item !== 'object') throw new Error('照片条目格式错误')
                const entry = item as Record<string, unknown>
                const src = entry.src == null || entry.src === '' ? null : String(entry.src)
                if (src && !src.startsWith('/assets/photos/')) {
                  throw new Error('照片地址必须以 /assets/photos/ 开头')
                }
                return {
                  slot: String(entry.slot ?? ''),
                  caption: String(entry.caption ?? ''),
                  src,
                  alt: String(entry.alt ?? ''),
                }
              })
              await writeAtomic(photosFile, `${JSON.stringify(photos, null, 2)}\n`)
              sendJson(res, 200, { ok: true })
              return
            }
          }

          if (method === 'POST' && pathname === `${API}/photos`) {
            const type = String(req.headers['content-type'] ?? '')
            if (!type.startsWith('image/webp')) {
              sendError(res, 415, '只接受 WebP（浏览器会在上传前转换）')
              return
            }
            const buffer = await readBody(req, MAX_IMAGE)
            const size = webpSize(buffer)
            if (!size || !size.width || !size.height) {
              sendError(res, 400, '无法识别的 WebP 文件')
              return
            }
            if (Math.max(size.width, size.height) > 2000) {
              sendError(res, 400, '图片长边不能超过 2000px')
              return
            }

            await fs.mkdir(photoOutDir, { recursive: true })
            const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 8)
            const date = new Date().toISOString().slice(0, 10)
            const name = `${date}-${hash}.webp`
            const file = join(photoOutDir, name)
            try {
              await fs.access(file)
            } catch {
              await writeAtomic(file, buffer)
            }
            sendJson(res, 200, {
              src: `/assets/photos/${name}`,
              width: size.width,
              height: size.height,
              bytes: buffer.length,
            })
            return
          }

          const postMatch = pathname.match(new RegExp(`^${API}/posts/([^/]+)$`))
          if (postMatch) {
            const slug = decodeURIComponent(postMatch[1])
            if (!SLUG_RE.test(slug)) {
              sendError(res, 400, '文章 slug 只能是小写字母、数字和连字符')
              return
            }
            const file = join(postsDir, `${slug}.md`)

            if (method === 'GET') {
              const raw = await fs.readFile(file, 'utf8')
              const parsed = matter(raw)
              sendJson(res, 200, {
                slug,
                data: { ...parsed.data, date: normalizeDate(parsed.data.date) },
                body: parsed.content,
              })
              return
            }

            if (method === 'PUT') {
              const payload = await readJson(req)
              const data = cleanFrontmatter(
                payload.data && typeof payload.data === 'object' ? (payload.data as Json) : {},
              )
              if (!String(data.title ?? '').trim()) {
                sendError(res, 400, '标题不能为空')
                return
              }
              const body = typeof payload.body === 'string' ? payload.body : ''
              await writeAtomic(file, matter.stringify(body, data))
              sendJson(res, 200, { ok: true })
              return
            }

            if (method === 'DELETE') {
              await fs.mkdir(trashDir, { recursive: true })
              const stamp = new Date().toISOString().replace(/[:.]/g, '-')
              await fs.rename(file, join(trashDir, `${slug}-${stamp}.md`))
              sendJson(res, 200, { ok: true })
              return
            }
          }

          if (method === 'POST' && pathname === `${API}/posts`) {
            const payload = await readJson(req)
            const slug = String(payload.slug ?? '').trim()
            const title = String(payload.title ?? '').trim()
            if (!SLUG_RE.test(slug)) {
              sendError(res, 400, '文章 slug 只能是小写字母、数字和连字符')
              return
            }
            if (!title) {
              sendError(res, 400, '标题不能为空')
              return
            }
            const file = join(postsDir, `${slug}.md`)
            try {
              await fs.access(file)
              sendError(res, 409, '同名文章已存在')
              return
            } catch {
              // 不存在才继续
            }
            const posts = await listPosts(root)
            const maxOrder = posts
              .filter(post => !post.draft)
              .reduce((max, post) => Math.max(max, post.order), 0)
            const date = String(payload.date ?? new Date().toISOString().slice(0, 10))
            const source = `---
title: ${JSON.stringify(title)}
date: "${date}"
tags: []
summary: ""
minutes: null
order: ${maxOrder + 1}
---

在这里写正文。

## 第一节 {#first}

正文……
`
            await writeAtomic(file, source)
            sendJson(res, 200, { ok: true, slug })
            return
          }

          sendError(res, 404, '接口不存在')
        })().catch(error => {
          const message = error instanceof Error ? error.message : '未知错误'
          sendError(res, 500, message)
        })
      })
    },
  }
}
