import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

interface ProfileMeta {
  title?: string
  description?: string
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ESCAPES[char] ?? char)
}

/** 首页的标题与描述从 profile.json 注入，资料工作台改完只需刷新。 */
export function profileHtmlPlugin(root: string): Plugin {
  const profileFile = resolve(root, 'src/content/profile.json')
  const homeFile = resolve(root, 'index.html')

  return {
    name: 'profile-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const isHome =
          context.path === '/' ||
          context.path === '/index.html' ||
          (context.filename ? resolve(context.filename) === homeFile : false)
        if (!isHome) return html

        let profile: ProfileMeta = {}
        try {
          profile = JSON.parse(readFileSync(profileFile, 'utf8')) as ProfileMeta
        } catch {
          return html
        }

        let output = html
        if (typeof profile.title === 'string' && profile.title) {
          const title = escapeHtml(profile.title)
          output = output.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
          output = output.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
        }
        if (typeof profile.description === 'string' && profile.description) {
          const description = escapeHtml(profile.description)
          output = output.replace(
            /(<meta name="description" content=")[^"]*(")/,
            `$1${description}$2`,
          )
          output = output.replace(
            /(<meta property="og:description" content=")[^"]*(")/,
            `$1${description}$2`,
          )
        }
        return output
      },
    },
  }
}
