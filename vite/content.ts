import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import type { Plugin } from 'vite'
import type { Post, PostHeading } from '../src/types/post'

const HEADING_MARKER = /\s*\{#([\w-]+)\}\s*$/

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function createRenderer() {
  const headings: PostHeading[] = []
  const md = new MarkdownIt({
    html: true,
    linkify: false,
    typographer: false,
    breaks: false,
  })

  // CommonMark 的 flanking 规则会让「**粗体。**后面紧跟汉字」无法闭合，
  // 这里把解析后仍残留的成对 ** 文本转成 <strong>，代码（code_inline / fence）不在 text token 中，不受影响
  md.core.ruler.push('cjk_strong', state => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue

      const next: NonNullable<typeof token.children> = []
      for (const child of token.children) {
        if (child.type !== 'text' || !child.content.includes('**')) {
          next.push(child)
          continue
        }

        const parts = child.content.split('**')
        if (parts.length < 3 || parts.length % 2 === 0) {
          next.push(child)
          continue
        }

        parts.forEach((part, index) => {
          if (!part) return
          const text = new state.Token('text', '', 0)
          text.content = part
          if (index % 2 === 1) {
            next.push(new state.Token('strong_open', 'strong', 1), text, new state.Token('strong_close', 'strong', -1))
          } else {
            next.push(text)
          }
        })
      }
      token.children = next
    }
  })

  // 允许在标题末尾写 {#anchor} 指定目录锚点；不写则按文本自动生成
  md.core.ruler.push('heading_anchors', state => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i]
      if (token.type !== 'heading_open') continue
      const inline = state.tokens[i + 1]
      if (!inline || inline.type !== 'inline') continue

      const level = Number(token.tag.slice(1))
      if (level !== 2 && level !== 3) continue

      const matched = inline.content.match(HEADING_MARKER)
      let id = matched?.[1] ?? ''

      if (matched) {
        inline.content = inline.content.replace(HEADING_MARKER, '')
        for (const child of inline.children ?? []) {
          if (child.type === 'text') {
            child.content = child.content.replace(HEADING_MARKER, '')
          }
        }
      }

      if (!id) {
        id = inline.content
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w一-龥-]/g, '')
      }

      token.attrSet('id', id)

      if (level === 2) {
        headings.push({
          id,
          text: md.renderer.renderInlineAsText(inline.children ?? [], md.options, {}),
          level: 2,
        })
      }
    }
  })

  return { md, headings }
}

export function parsePost(source: string, slug: string): Post {
  const { data, content } = matter(source)
  const { md, headings } = createRenderer()

  return {
    slug,
    title: String(data.title ?? slug),
    date: normalizeDate(data.date),
    status: data.status ? String(data.status) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    summary: String(data.summary ?? ''),
    lede: data.lede ? String(data.lede) : undefined,
    minutes: typeof data.minutes === 'number' ? data.minutes : null,
    toc: Boolean(data.toc),
    order: typeof data.order === 'number' ? data.order : 999,
    draft: Boolean(data.draft),
    link: data.link ? String(data.link) : undefined,
    next: data.next ? String(data.next) : undefined,
    html: md.render(content),
    headings,
  }
}

/**
 * 构建期把 Markdown 渲染成文章数据模块。
 * markdown-it / gray-matter 只存在于构建期，不会进入客户端 bundle。
 */
export function markdownPlugin(): Plugin {
  return {
    name: 'personal-site:markdown',
    enforce: 'pre',
    load(id) {
      const [file, query = ''] = id.split('?')
      if (!file.endsWith('.md')) return null
      if (!query.split('&').includes('markdown')) return null

      const source = readFileSync(file, 'utf8')
      const post = parsePost(source, basename(file, '.md'))
      return `export default ${JSON.stringify(post)}`
    },
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.md')) {
        ctx.server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}
