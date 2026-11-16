import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/**
 * 旧链接跳转页原样复制到产物。
 * 不放进 rollup input，避免 Vite 把 canonical 指向的旧文章当成资源处理。
 */
export function legacyRedirectPlugin(sourceFile: string, outputFile: string): Plugin {
  return {
    name: 'personal-site:legacy-redirect',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: outputFile,
        source: readFileSync(sourceFile, 'utf8'),
      })
    },
  }
}
