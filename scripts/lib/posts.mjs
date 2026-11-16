import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

/**
 * 读取 src/content/posts/*.md 的 frontmatter。
 * 只做构建期元信息解析，不渲染正文。
 *
 * @param {string} [root]
 * @returns {{
 *   slug: string, title: string, date: string | null, status?: string,
 *   tags: string[], summary: string, lede?: string, minutes: number | null,
 *   order: number, draft: boolean, link?: string, next?: string
 * }[]}
 */
export function readPostMetas(root = process.cwd()) {
  const dir = join(root, 'src', 'content', 'posts')
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const { data } = matter(readFileSync(join(dir, file), 'utf8'))
      return {
        slug: file.slice(0, -'.md'.length),
        title: String(data.title ?? file.slice(0, -'.md'.length)),
        date: normalizeDate(data.date),
        status: data.status ? String(data.status) : undefined,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        summary: String(data.summary ?? ''),
        lede: data.lede ? String(data.lede) : undefined,
        minutes: typeof data.minutes === 'number' ? data.minutes : null,
        order: typeof data.order === 'number' ? data.order : 999,
        draft: Boolean(data.draft),
        link: data.link ? String(data.link) : undefined,
        next: data.next ? String(data.next) : undefined,
      }
    })
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}
