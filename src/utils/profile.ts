import profileJson from '@/content/profile.json'
import photosJson from '@/content/photos.json'
import type { PhotoEntry, Profile } from '@/types/site'

/** 站内资料唯一数据源：由内容工作台写入，组件只读。 */
export const profile = profileJson as Profile

/** 照片槽位；src 为空的条目在首页继续显示渐变占位图。 */
export const photos = photosJson as PhotoEntry[]

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ESCAPES[char] ?? char)
}

/**
 * 资料里的 **文字** 会变成橙色强调。
 * 先整体转义，再把成对的 ** 换成 <em>，因此 JSON 里不能注入 HTML。
 */
export function emphasize(value: string): string {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<em class="profile-em">$1</em>')
}

/** 保留换行，用于封面欢迎语。 */
export function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />')
}
