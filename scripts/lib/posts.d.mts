export interface PostMeta {
  slug: string
  title: string
  date: string | null
  status?: string
  tags: string[]
  summary: string
  lede?: string
  minutes: number | null
  order: number
  draft: boolean
  link?: string
  next?: string
}

export function readPostMetas(root?: string): PostMeta[]
