const API = '/__studio/api'
const SLOTS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']

const state = {
  tab: 'posts',
  posts: [],
  profile: null,
  photos: [],
  post: null,
  uploading: false,
}

const view = document.querySelector('#view')
const toastEl = document.querySelector('#toast')
let toastTimer = 0

function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )
}

function toast(message, error = false) {
  toastEl.textContent = message
  toastEl.classList.toggle('is-error', error)
  toastEl.classList.add('is-visible')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 3200)
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, options)
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!response.ok) throw new Error(data?.error || `请求失败（${response.status}）`)
  return data
}

function getPath(object, path) {
  return path.split('.').reduce((node, key) => node?.[key], object)
}

function setPath(object, path, value) {
  const keys = path.split('.')
  let node = object
  for (const key of keys.slice(0, -1)) {
    if (!node[key] || typeof node[key] !== 'object') node[key] = /^\d+$/.test(key) ? [] : {}
    node = node[key]
  }
  node[keys.at(-1)] = value
}

async function loadState() {
  try {
    const data = await api('/state')
    state.posts = data.posts || []
    state.profile = data.profile || {}
    state.photos = Array.isArray(data.photos) ? data.photos : []
    render()
  } catch (error) {
    view.innerHTML = `<div class="empty">读取失败：${esc(error.message)}</div>`
  }
}

/* ---------------- 文章 ---------------- */

function renderPosts() {
  const list = state.posts
    .map(
      post => `<button type="button" class="post-item ${
        state.post?.slug === post.slug ? 'is-active' : ''
      }" data-action="open-post" data-slug="${esc(post.slug)}">
        <span class="post-title">${esc(post.title)}</span>
        <span class="post-meta">${esc(post.date || '未定日期')} · ${post.draft ? '草稿' : `#${post.order}`}</span>
      </button>`,
    )
    .join('')

  return `<div class="split">
    <aside class="panel list-panel">
      <div class="panel-head">
        <h2>文章</h2>
        <button type="button" class="btn small" data-action="new-post">新建</button>
      </div>
      <div class="post-list">${list || '<div class="empty">还没有文章</div>'}</div>
      <div class="list-foot">
        <button type="button" class="btn ghost small" data-action="gen-entries">生成文章入口</button>
      </div>
    </aside>
    ${
      state.post
        ? renderPostEditor()
        : '<section class="panel"><div class="empty">从左侧选择一篇文章，或点「新建」。</div></section>'
    }
  </div>`
}

function renderPostEditor() {
  const post = state.post
  const data = post.data || {}
  const body = post.body || ''
  const tags = Array.isArray(data.tags) ? data.tags.join(', ') : ''
  const url = `/posts/${post.slug}.html`

  return `<section class="panel">
    <div class="panel-head">
      <h2>${esc(data.title || post.slug)}</h2>
      <div class="actions"><span class="status">src/content/posts/${esc(post.slug)}.md</span></div>
    </div>
    <div class="editor-body">
      <div class="form-grid">
        <label class="field"><span>标题</span><input data-post-field="title" value="${esc(data.title)}" /></label>
        <label class="field"><span>slug（只读）</span><input class="slug" value="${esc(post.slug)}" disabled /></label>
        <label class="field"><span>日期</span><input data-post-field="date" type="date" value="${esc(data.date || '')}" /></label>
        <label class="field"><span>状态（可选，替代日期显示）</span><input data-post-field="status" value="${esc(data.status || '')}" placeholder="即将" /></label>
        <label class="field"><span>标签（逗号分隔）</span><input name="tags" data-post-field="tags" value="${esc(tags)}" /></label>
        <label class="field"><span>排序（越小越靠前）</span><input data-post-field="order" type="number" value="${esc(data.order ?? 999)}" /></label>
        <label class="field"><span>阅读分钟</span><input data-post-field="minutes" type="number" value="${esc(data.minutes ?? '')}" /></label>
        <label class="field"><span>下一篇 slug</span><input data-post-field="next" value="${esc(data.next || '')}" /></label>
        <label class="check"><input type="checkbox" data-post-field="draft" ${data.draft ? 'checked' : ''} /> 草稿（不生成页面）</label>
        <label class="check"><input type="checkbox" data-post-field="toc" ${data.toc ? 'checked' : ''} /> 显示右侧目录</label>
        <label class="field full"><span>首页摘要</span><textarea data-post-field="summary" rows="2">${esc(data.summary)}</textarea></label>
        <label class="field full"><span>文章导语（可选）</span><textarea data-post-field="lede" rows="2">${esc(data.lede || '')}</textarea></label>
        <label class="field full"><span>正文 Markdown</span><textarea class="body-editor" data-post-field="body">${esc(body)}</textarea></label>
      </div>
      <div class="editor-actions">
        <button type="button" class="btn" data-action="save-post">保存</button>
        <a class="btn ghost" href="${url}" target="_blank" rel="noopener">在站点打开 ↗</a>
        <span class="spacer"></span>
        <button type="button" class="btn danger" data-action="delete-post">删除</button>
      </div>
    </div>
  </section>`
}

async function openPost(slug) {
  try {
    const post = await api(`/posts/${encodeURIComponent(slug)}`)
    state.post = post
    render()
  } catch (error) {
    toast(error.message, true)
  }
}

function readPostFields() {
  const data = { ...(state.post?.data || {}) }
  const body = document.querySelector('[data-post-field="body"]')?.value ?? ''
  for (const element of document.querySelectorAll('[data-post-field]')) {
    const key = element.dataset.postField
    if (key === 'body') continue
    if (element.type === 'checkbox') {
      data[key] = element.checked
    } else if (key === 'tags') {
      data.tags = element.value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
    } else if (key === 'minutes') {
      data.minutes = element.value === '' ? null : Number(element.value)
    } else if (key === 'order') {
      data.order = Number(element.value) || 999
    } else {
      data[key] = element.value
    }
  }
  return { data, body }
}

async function savePost() {
  if (!state.post) return
  const payload = readPostFields()
  if (!payload.data.title?.trim()) {
    toast('标题不能为空', true)
    return
  }
  try {
    await api(`/posts/${encodeURIComponent(state.post.slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    toast('文章已保存，站点会热更新')
    await loadState()
    await openPost(state.post?.slug || payload.slug)
  } catch (error) {
    toast(error.message, true)
  }
}

async function deletePost() {
  if (!state.post) return
  if (
    !window.confirm(
      `确定删除「${state.post.data?.title || state.post.slug}」？文件会移到 .studio-trash/`,
    )
  ) {
    return
  }
  const slug = state.post.slug
  try {
    await api(`/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
    state.post = null
    await api('/gen', { method: 'POST' })
    await loadState()
    toast('已移到 .studio-trash/，并重新生成入口')
  } catch (error) {
    toast(error.message, true)
  }
}

async function newPost() {
  const slug = window.prompt('新文章 slug（小写字母、数字、连字符）', '')
  if (!slug) return
  const title = window.prompt('文章标题', '')
  if (!title) return
  try {
    await api('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug.trim(), title: title.trim() }),
    })
    await api('/gen', { method: 'POST' })
    await loadState()
    await openPost(slug.trim())
    toast('文章已创建，入口已生成')
  } catch (error) {
    toast(error.message, true)
  }
}

async function genEntries() {
  try {
    const result = await api('/gen', { method: 'POST' })
    toast(result.stdout?.trim() || '入口已生成')
  } catch (error) {
    toast(error.message, true)
  }
}

/* ---------------- 照片 ---------------- */

function renderPhotos() {
  const slots = SLOTS.map(slot => {
    const index = state.photos.findIndex(photo => photo.slot === slot)
    const entry = index >= 0 ? state.photos[index] : null
    const options = state.photos
      .map((photo, photoIndex) =>
        photo.src
          ? `<option value="${photoIndex}" ${photoIndex === index ? 'selected' : ''}>${esc(
              photo.caption || photo.src,
            )}</option>`
          : '',
      )
      .join('')
    return `<article class="slot-card">
      <div class="thumb ${entry?.src ? '' : 'is-empty'}" ${
        entry?.src ? `style="background-image:url('${esc(entry.src)}')"` : ''
      }>${entry?.src ? '' : '待选择'}</div>
      <div class="slot-head"><span class="slot-name">${slot.toUpperCase()}</span><span class="src">${
        entry?.src ? '已放置' : '空'
      }</span></div>
      <select data-slot-select="${slot}">
        <option value="">不展示</option>
        ${options}
      </select>
    </article>`
  }).join('')

  const library = state.photos
    .map((photo, index) =>
      photo.src
        ? `<article class="photo-card" data-index="${index}">
            <div class="thumb" style="background-image:url('${esc(photo.src)}')"></div>
            <label>说明<input data-photo-field="caption" value="${esc(photo.caption)}" /></label>
            <label>替代文字<input data-photo-field="alt" value="${esc(photo.alt || '')}" /></label>
            <div class="card-foot">
              <span class="src">${esc(photo.src)}</span>
              <button type="button" class="btn ghost small" data-action="remove-photo" data-index="${index}">移除</button>
            </div>
            ${photo.slot ? `<span class="slot-badge">照片墙 ${esc(photo.slot.toUpperCase())}</span>` : ''}
          </article>`
        : '',
    )
    .join('')

  return `<div class="panel">
    <div class="panel-head">
      <h2>照片</h2>
      <div class="actions">
        <label class="btn ghost small upload-label">
          ${state.uploading ? '正在处理…' : '上传照片'}
          <input id="photo-input" type="file" accept="image/*" multiple hidden ${
            state.uploading ? 'disabled' : ''
          } />
        </label>
        <button type="button" class="btn" data-action="save-photos">保存照片数据</button>
      </div>
    </div>
    <p class="hint">上传时浏览器会转成 WebP（长边 ≤1600px），再选择放进哪个格子；原图不会被上传。</p>
    <div class="slots">${slots}</div>
    <div class="panel-head sub-head"><h2>照片库</h2><span class="src">${state.photos.filter(photo => photo.src).length} 张</span></div>
    <div class="photo-grid">${library || '<div class="empty">还没有照片，先上传一张。</div>'}</div>
  </div>`
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`无法读取图片：${file.name}`))
    }
    image.src = url
  })
}

async function fileToWebp(file) {
  const source =
    'createImageBitmap' in window
      ? await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
          readFileAsImage(file),
        )
      : await readFileAsImage(file)
  const width = source.width || source.naturalWidth
  const height = source.height || source.naturalHeight
  const scale = Math.min(1, 1600 / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      result => (result ? resolve(result) : reject(new Error('WebP 转换失败'))),
      'image/webp',
      0.82,
    ),
  )
  return blob
}

async function uploadPhotos(files) {
  if (!files.length || state.uploading) return
  state.uploading = true
  render()
  let done = 0
  try {
    for (const file of files) {
      try {
        const blob = await fileToWebp(file)
        const result = await api('/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'image/webp' },
          body: blob,
        })
        state.photos.push({
          slot: '',
          caption: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
          src: result.src,
          alt: '',
        })
        done += 1
      } catch (error) {
        toast(`${file.name}：${error.message}`, true)
      }
    }
    if (done) {
      await savePhotos(true)
      toast(`已上传 ${done} 张，选择格子后会出现在首页照片墙`)
    }
  } finally {
    state.uploading = false
    render()
  }
}

async function savePhotos(silent = false) {
  const payload = state.photos.map(photo => ({
    slot: photo.slot || '',
    caption: photo.caption || '',
    src: photo.src || null,
    alt: photo.alt || '',
  }))
  try {
    await api('/photos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!silent) toast('照片数据已保存，首页会热更新')
  } catch (error) {
    toast(error.message, true)
  }
}

/* ---------------- 资料 ---------------- */

function profileField(path, label, type = 'text') {
  const value = getPath(state.profile, path) ?? ''
  return `<label class="field${type === 'textarea' ? ' full' : ''}"><span>${label}</span>${
    type === 'textarea'
      ? `<textarea data-path="${path}" rows="3">${esc(value)}</textarea>`
      : `<input data-path="${path}" value="${esc(value)}" />`
  }</label>`
}

function renderProfile() {
  const cards = (state.profile.about?.cards || [])
    .map(
      (card, index) => `<div class="card-row">
        <input data-path="about.cards.${index}.key" value="${esc(card.key)}" placeholder="标题" />
        <input data-path="about.cards.${index}.text" value="${esc(card.text)}" placeholder="内容" />
        <button type="button" class="btn ghost small" data-action="remove-card" data-index="${index}">删除</button>
      </div>`,
    )
    .join('')

  return `<div class="panel">
    <div class="panel-head">
      <h2>个人资料</h2>
      <div class="actions"><button type="button" class="btn" data-action="save-profile">保存</button></div>
    </div>
    <p class="hint">用 <code>**文字**</code> 标记橙色强调。保存后站点热更新；浏览器标题修改需要刷新页面。</p>
    <div class="editor-body">
      <div class="form-grid">
        ${profileField('title', '浏览器标题')}
        ${profileField('name', '你的名字')}
        ${profileField('description', '搜索引擎描述', 'textarea')}
        ${profileField('eyebrow', '封面眉题')}
        ${profileField('heroLines.0', '封面第一行')}
        ${profileField('heroLines.1', '封面第二行')}
        ${profileField('heroLede', '封面欢迎语', 'textarea')}
        ${profileField('about.lead', '关于导语', 'textarea')}
        <label class="field full"><span>关于段落（空行分段）</span><textarea data-path="about.paragraphs" rows="7">${esc(
          (state.profile.about?.paragraphs || []).join('\n\n'),
        )}</textarea></label>
        <div class="cards-editor full">
          <span class="label">信息卡</span>
          ${cards}
          <button type="button" class="btn ghost small" data-action="add-card">添加信息卡</button>
        </div>
        ${profileField('contact.lead', '联系导语', 'textarea')}
        ${profileField('contact.email', '邮箱')}
        ${profileField('contact.github', 'GitHub 地址')}
        ${profileField('footer.copyright', '页脚版权')}
        ${profileField('footer.tagline', '页脚文案')}
      </div>
      <details>
        <summary>查看 JSON</summary>
        <pre>${esc(JSON.stringify(state.profile, null, 2))}</pre>
      </details>
    </div>
  </div>`
}

function syncProfileFromDom() {
  for (const element of document.querySelectorAll('[data-path]')) {
    const path = element.dataset.path
    if (path === 'about.paragraphs') {
      setPath(
        state.profile,
        path,
        element.value
          .split(/\n\s*\n/)
          .map(paragraph => paragraph.trim())
          .filter(Boolean),
      )
    } else {
      setPath(state.profile, path, element.value)
    }
  }
}

async function saveProfile() {
  syncProfileFromDom()
  try {
    await api('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.profile),
    })
    toast('资料已保存，站点会热更新')
    render()
  } catch (error) {
    toast(error.message, true)
  }
}

/* ---------------- 渲染与事件 ---------------- */

function render() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('is-active', tab.dataset.tab === state.tab)
  })

  if (state.tab === 'posts') view.innerHTML = renderPosts()
  else if (state.tab === 'photos') view.innerHTML = renderPhotos()
  else view.innerHTML = renderProfile()
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action], [data-tab]')
  if (!target) return

  if (target.dataset.tab) {
    state.tab = target.dataset.tab
    render()
    return
  }

  const action = target.dataset.action
  if (action === 'open-post') openPost(target.dataset.slug)
  else if (action === 'new-post') newPost()
  else if (action === 'save-post') savePost()
  else if (action === 'delete-post') deletePost()
  else if (action === 'gen-entries') genEntries()
  else if (action === 'save-photos') savePhotos()
  else if (action === 'remove-photo') {
    state.photos.splice(Number(target.dataset.index), 1)
    render()
  } else if (action === 'save-profile') saveProfile()
  else if (action === 'add-card') {
    syncProfileFromDom()
    state.profile.about.cards.push({ key: '', text: '' })
    render()
  } else if (action === 'remove-card') {
    syncProfileFromDom()
    state.profile.about.cards.splice(Number(target.dataset.index), 1)
    render()
  }
})

document.addEventListener('input', event => {
  const element = event.target
  if (element.dataset?.photoField) {
    const card = element.closest('[data-index]')
    const index = Number(card?.dataset.index)
    if (Number.isInteger(index) && state.photos[index]) {
      state.photos[index][element.dataset.photoField] = element.value
    }
  }
})

document.addEventListener('change', event => {
  const element = event.target
  if (element.id === 'photo-input') {
    void uploadPhotos([...element.files])
    element.value = ''
    return
  }
  if (element.dataset?.slotSelect) {
    const slot = element.dataset.slotSelect
    const index = element.value === '' ? -1 : Number(element.value)
    state.photos.forEach(photo => {
      if (photo.slot === slot) photo.slot = ''
    })
    if (index >= 0 && state.photos[index]) state.photos[index].slot = slot
    render()
  }
})

loadState()
