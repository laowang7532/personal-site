import type { Post } from '@/types/post'

const modules = import.meta.glob<Post>('../content/posts/*.md', {
  eager: true,
  query: '?markdown',
  import: 'default',
})

/** 首页列表使用的全部条目（含草稿/预告），草稿永远排在最后 */
export const allPosts: Post[] = Object.values(modules).sort((a, b) => {
  if (a.draft !== b.draft) return a.draft ? 1 : -1
  return a.order - b.order || a.slug.localeCompare(b.slug)
})

/** 有真实页面的文章 */
export const publishedPosts: Post[] = allPosts.filter(post => !post.draft)

export function getPost(slug: string): Post | undefined {
  return publishedPosts.find(post => post.slug === slug)
}

export function postHref(post: Post): string {
  return post.link ?? `/posts/${post.slug}.html`
}

export function postDateLabel(post: Post): string {
  return post.status ?? (post.date ? post.date.replaceAll('-', '.') : '')
}
