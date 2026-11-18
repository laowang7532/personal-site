import type { Plugin } from 'vite'

/**
 * 在首屏样式绘制前确定主题，避免浅色用户先看到深色背景。
 * 脚本必须内联、同步执行，因此由插件注入到所有 HTML 入口（含 gen-entries 生成的文章壳）。
 */
const BOOT = `(function(){try{var s=localStorage.getItem('personal-site:theme');var t=s==='light'||s==='dark'?s:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m)}m.setAttribute('content',t==='light'?'#F5F1E8':'#0B0B0D')}catch(e){document.documentElement.dataset.theme='dark'}})()`

const CRITICAL = `html{background:#0B0B0D}html[data-theme="light"]{background:#F5F1E8}`

export function themeBootPlugin(): Plugin {
  return {
    name: 'personal-site:theme-boot',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          // 先于其他 head 内容执行，CSS 还没加载就已经知道主题
          { tag: 'script', children: BOOT, injectTo: 'head-prepend' },
          // 关键背景色放在 head 末尾，避免被入口壳里的默认样式覆盖
          { tag: 'style', children: CRITICAL, injectTo: 'head' },
        ],
      }
    },
  }
}
