import { API } from '@/config'

/**
 * 从文件名中提取 pose_code（最长连续数字，左补零到6位）
 */
export function extractPoseCode(str: string): string | null {
  const matches = str.match(/\d+/g)
  if (!matches) return null
  const longest = matches.reduce((a, b) => (a.length >= b.length ? a : b))
  return longest.padStart(6, '0')
}

/**
 * 格式化时间字符串为 MM-DD HH:mm
 */
export function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '-'
  try {
    const d = new Date(timeStr)
    if (isNaN(d.getTime())) return timeStr.substring(0, 16)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return '-'
  }
}

/**
 * 构建图片流式访问 URL
 */
export function buildImageUrl(fullPath: string): string {
  return `${API.FILE_STREAM}?path=${encodeURIComponent(fullPath)}`
}

/**
 * 下载 Blob 文件
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 格式化当前时间为 YYYY-MM-DD HH:mm:ss
 */
export function formatNow(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}
