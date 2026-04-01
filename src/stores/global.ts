import { defineStore } from 'pinia'
import { ref } from 'vue'
import { BASE_ROOT, API } from '@/config'
import { ElMessage } from 'element-plus'
import { http } from '@/utils/request'

/**
 * 全局共享状态：版本号、工作目录、远程目录列表
 * 在整个应用中跨页面保持一致
 */
export const useGlobalStore = defineStore('global', () => {
  // ==================== 版本控制 ====================
  const currentVersion = ref('')
  const versionOptions = ref<string[]>([])

  /**
   * 拉取姿态版本列表
   */
  const fetchPoseVersions = async (callback?: () => void) => {
    try {
      const res = await http.get<string[]>(API.POSE_VERSIONS)
      if (res.data && Array.isArray(res.data)) {
        versionOptions.value = res.data
        if (!currentVersion.value && res.data.length > 0) {
          currentVersion.value = res.data[0]
        }
      }
      callback?.()
    } catch {
      ElMessage.error('版本列表获取失败')
    }
  }

  /**
   * 拉取引导词版本列表
   */
  const fetchPromptVersions = async (callback?: () => void) => {
    try {
      const res = await http.get<string[]>(API.PROMPT_VERSIONS)
      if (res.data && Array.isArray(res.data)) {
        versionOptions.value = res.data
        if (!currentVersion.value && res.data.length > 0) {
          currentVersion.value = res.data[0]
        }
      }
      callback?.()
    } catch {
      ElMessage.error('版本列表获取失败')
    }
  }

  // ==================== 工作目录 ====================
  const workDirPath = ref(BASE_ROOT)
  const remoteDirList = ref<{ name: string; fullPath: string; isDir: boolean }[]>([])
  const isScanning = ref(false)

  const realRemoteDirList = ref<{ name: string; fullPath: string }[]>([])

  /**
   * 扫描远程目录
   */
  const scanDirectory = async () => {
    if (!workDirPath.value.trim()) {
      ElMessage.warning('请输入有效的目录路径')
      return null
    }
    isScanning.value = true
    try {
      const url = `${API.DIR_LIST}?path=${encodeURIComponent(workDirPath.value)}`
      const res = await http.get<{
        dirs: { name: string; fullPath: string; isDir: boolean }[]
        files: { name: string; fullPath: string }[]
      }>(url)

      if (res.data) {
        const dirs: { name: string; fullPath: string }[] = []
        const files: { name: string; fullPath: string }[] = []

        if (res.data.dirs) {
          res.data.dirs.forEach((item) => {
            if (item.isDir) {
              dirs.push({ name: item.name, fullPath: item.fullPath })
            } else {
              files.push({ name: item.name, fullPath: item.fullPath })
            }
          })
        }

        realRemoteDirList.value = dirs
        return files
      }
      return null
    } catch {
      ElMessage.error('网络异常，无法扫描目录')
      return null
    } finally {
      isScanning.value = false
    }
  }

  /**
   * 进入子目录
   */
  const enterDirectory = (fullPath: string, callback?: () => void) => {
    workDirPath.value = fullPath
    callback?.()
  }

  /**
   * 返回上一级目录
   */
  const goUpDirectory = (callback?: () => void) => {
    const sep = workDirPath.value.includes('/') ? '/' : '\\'
    const parts = workDirPath.value.split(sep)
    if (parts.length > 1) {
      parts.pop()
      workDirPath.value = parts.join(sep)
      callback?.()
    }
  }

  return {
    // 版本
    currentVersion,
    versionOptions,
    fetchPoseVersions,
    fetchPromptVersions,
    // 目录
    workDirPath,
    remoteDirList,
    realRemoteDirList,
    isScanning,
    scanDirectory,
    enterDirectory,
    goUpDirectory,
  }
})
