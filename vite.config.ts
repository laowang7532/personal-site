import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { readPostMetas } from './scripts/lib/posts.mjs'
import { markdownPlugin } from './vite/content.ts'
import { legacyRedirectPlugin } from './vite/legacy-redirect.ts'
import { profileHtmlPlugin } from './vite/profile-html.ts'
import { studioPlugin } from './vite/studio.ts'
import { themeBootPlugin } from './vite/theme-boot.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

/** 只把「有 md 且非草稿」的文章注册为构建入口，避免把 v1 旧文章页带进产物 */
const postInputs = Object.fromEntries(
  readPostMetas(root)
    .filter(post => !post.draft)
    .map(post => [
      `post-${post.slug.replace(/[^\w-]/g, '_')}`,
      resolve(root, 'posts', `${post.slug}.html`),
    ]),
)

for (const [name, file] of Object.entries(postInputs)) {
  if (!existsSync(file)) {
    throw new Error(`缺少文章入口 ${file}（${name}），请先运行 npm run gen`)
  }
}

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    themeBootPlugin(),
    profileHtmlPlugin(root),
    markdownPlugin(),
    legacyRedirectPlugin(resolve(root, 'docs', 'web-101.html'), 'docs/web-101.html'),
    studioPlugin(root),
  ],
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        ...postInputs,
      },
    },
  },
})
