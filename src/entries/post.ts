import { createApp } from 'vue'
import App from '@/App.vue'

const el = document.querySelector<HTMLElement>('#app')
const slug = el?.dataset.slug ?? ''

createApp(App, { page: 'post', slug }).mount(el ?? '#app')
