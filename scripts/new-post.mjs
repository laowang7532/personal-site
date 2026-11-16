import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readPostMetas } from './lib/posts.mjs'

const [slug, ...titleParts] = process.argv.slice(2)
const title = titleParts.join(' ').trim()

if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('用法：npm run new-post -- <kebab-case-slug> "<文章标题>"')
  process.exit(1)
}

if (!title) {
  console.error('缺少文章标题')
  process.exit(1)
}

const root = process.cwd()
const file = join(root, 'src', 'content', 'posts', `${slug}.md`)

if (existsSync(file)) {
  console.error(`文章已存在：${file}`)
  process.exit(1)
}

const maxOrder = readPostMetas(root)
  .filter(post => !post.draft)
  .reduce((max, post) => Math.max(max, post.order), 0)
const today = new Date().toISOString().slice(0, 10)

const source = `---
title: "${title.replaceAll('"', '\\"')}"
date: "${today}"
tags: []
summary: ""
minutes: null
order: ${maxOrder + 1}
---

在这里写正文。

## 第一节 {#first}

正文……
`

writeFileSync(file, source)
console.log(`created  src/content/posts/${slug}.md`)
console.log('下一步：npm run gen && npm run dev')
