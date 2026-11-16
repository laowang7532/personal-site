/**
 * 把 dist/ 发布为孤儿分支 dist，供服务器按 commit SHA 从 jsDelivr 拉取。
 *
 * 用法：
 *   npm run deploy              # 构建 + 推送
 *   npm run deploy -- --dry-run # 只构建并生成本地提交，不推送
 *   npm run deploy -- --no-build
 *
 * 说明：每次发布都是一个没有父提交的根提交，分支历史始终只有一条，
 * 因此推送需要 --force。服务器必须使用打印出来的完整 SHA，不要用 @main。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { readPostMetas } from './lib/posts.mjs'

const root = process.cwd()
const dist = join(root, 'dist')
const gitDir = join(root, '.git')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const skipBuild = args.has('--no-build')

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  })
}

function output(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  }).trim()
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

if (!skipBuild) {
  console.log('▸ 构建站点…')
  run('npm', ['run', 'build'], { shell: process.platform === 'win32' })
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('✗ dist/index.html 不存在，构建失败或未执行构建')
  process.exit(1)
}

const published = readPostMetas(root).filter(post => !post.draft)
const missing = published.filter(post => !existsSync(join(dist, 'posts', `${post.slug}.html`)))
if (missing.length > 0) {
  console.error(`✗ 构建产物缺少文章页：${missing.map(post => post.slug).join(', ')}`)
  process.exit(1)
}

const sourceSha = output('git', ['rev-parse', '--short', 'HEAD'])
const message = `release: ${sourceSha}`

// 服务器无法 git pull，需要一份文件清单才能按 SHA 从 jsDelivr 逐个拉取。
const releases = walk(dist)
  .map(file => relative(dist, file).split(sep).join('/'))
  .filter(file => file !== 'release.json')
  .sort()
writeFileSync(
  join(dist, 'release.json'),
  JSON.stringify(
    { source: sourceSha, builtAt: new Date().toISOString(), files: releases },
    null,
    2,
  ) + '\n',
)

const indexDir = mkdtempSync(join(tmpdir(), 'personal-site-index-'))
const indexFile = join(indexDir, 'index')
const gitEnv = { ...process.env, GIT_INDEX_FILE: indexFile }

try {
  // 用临时 index 把 dist/ 写成 tree，不污染工作区与当前分支。
  execFileSync('git', ['--git-dir', gitDir, '--work-tree', '.', 'add', '--all', '.'], {
    cwd: dist,
    env: gitEnv,
    stdio: 'inherit',
  })
  const tree = execFileSync('git', ['--git-dir', gitDir, 'write-tree'], {
    cwd: dist,
    env: gitEnv,
    encoding: 'utf8',
  }).trim()
  const commit = output('git', ['--git-dir', gitDir, 'commit-tree', tree, '-m', message])

  const files = walk(dist)
  const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0)

  console.log('')
  console.log(`  source   ${sourceSha}`)
  console.log(`  commit   ${commit}`)
  console.log(`  files    ${files.length} 个，共 ${(bytes / 1024).toFixed(1)} KB`)
  console.log(`  message  ${message}`)

  if (dryRun) {
    console.log('  status   dry-run，未推送')
  } else {
    run('git', ['push', '--force', 'origin', `${commit}:refs/heads/dist`])
    const remote = output('git', ['remote', 'get-url', 'origin'])
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (match) {
      const [, owner, repo] = match
      console.log(`  jsDelivr https://cdn.jsdelivr.net/gh/${owner}/${repo}@${commit}`)
    }
    console.log('  status   已推送到 origin/dist')
  }
} finally {
  rmSync(indexDir, { recursive: true, force: true })
}
