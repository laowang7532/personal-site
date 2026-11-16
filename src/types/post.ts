export interface PostHeading {
  id: string
  text: string
  level: 2 | 3
}

export interface Post {
  slug: string
  title: string
  /** ISO 日期，例如 2026-11-13；草稿可为 null */
  date: string | null
  /** 列表里代替日期的状态文案，例如「即将」 */
  status?: string
  tags: string[]
  summary: string
  /** 文章页导语（可选） */
  lede?: string
  /** 阅读时长（分钟） */
  minutes: number | null
  /** 是否在文章页顶部渲染目录卡 */
  toc: boolean
  order: number
  /** 草稿只出现在首页列表，不生成文章页 */
  draft: boolean
  /** 草稿卡片指向的地址 */
  link?: string
  /** 下一篇的 slug；缺省则回首页 */
  next?: string
  /** 构建期渲染好的正文 HTML */
  html: string
  headings: PostHeading[]
}
