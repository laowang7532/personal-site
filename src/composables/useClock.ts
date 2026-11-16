import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useClock() {
  const time = ref('--:--')
  let timer = 0

  function tick(): void {
    const now = new Date()
    time.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  onMounted(() => {
    tick()
    timer = window.setInterval(tick, 20000)
  })

  onBeforeUnmount(() => window.clearInterval(timer))

  return time
}
