import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'personal-site:theme'
const media = window.matchMedia('(prefers-color-scheme: light)')

/** 显式选择：只有 light / dark 两个值；没有值表示跟随系统 */
function stored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function system(): Theme {
  return media.matches ? 'light' : 'dark'
}

/** 启动脚本已经写入 data-theme，优先复用它，避免首屏与 Vue 状态不一致 */
function initial(): Theme {
  const boot = document.documentElement.dataset.theme
  if (boot === 'light' || boot === 'dark') return boot
  return stored() ?? system()
}

const theme = ref<Theme>(initial())

function syncMeta(next: Theme): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = next === 'light' ? '#F5F1E8' : '#0B0B0D'
}

export function applyTheme(next: Theme): void {
  theme.value = next
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
  syncMeta(next)
}

export function toggleTheme(): void {
  const next = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 隐私模式只影响记忆，不影响本次切换
  }
}

export function useTheme() {
  return { theme, toggleTheme }
}

// 系统主题只在用户没有显式选择时跟随
media.addEventListener('change', () => {
  if (!stored()) applyTheme(system())
})

// 多标签页同步
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) applyTheme(stored() ?? system())
})

// 从 bfcache 返回时重新对齐，避免恢复旧文档的旧主题
window.addEventListener('pageshow', event => {
  if (event.persisted) applyTheme(stored() ?? system())
})
