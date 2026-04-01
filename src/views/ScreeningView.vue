<template>
  <div class="screening-container">
    <div class="top-toolbar">
      <div class="tool-group path-group">
        <div class="path-input-wrapper">
          <el-input
            v-model="workDirPath"
            placeholder="输入远端图片根目录..."
            style="width: 750px"
            clearable
            @keyup.enter="fetchFileList"
          >
            <template #prepend>📂 数据目录</template>
            <template #append>
              <el-button :icon="FolderOpened" :loading="isScanning" @click="fetchFileList" class="primary-append-btn"
                >加载数据</el-button
              >
            </template>
          </el-input>

          <div
            class="dir-navigator"
            v-if="realRemoteDirList.length > 0 || workDirPath !== BASE_ROOT"
          >
            <el-button
              v-if="workDirPath !== BASE_ROOT"
              size="small"
              @click="handleGoUpDir"
              class="go-up-btn"
            >
              <el-icon><Top /></el-icon> 返回上一级
            </el-button>
            <div class="sub-dirs-list" v-if="realRemoteDirList.length > 0">
              <el-tag
                v-for="dir in realRemoteDirList"
                :key="dir.fullPath"
                size="small"
                class="dir-tag"
                @click="handleEnterDir(dir.fullPath)"
              >
                📁 {{ dir.name }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="right-actions">
        <el-button
          color="#12aa50"
          class="action-btn"
          @click="handleMoveFiles('_approved')"
          :disabled="isMovingFiles"
        >
          <el-icon><Select /></el-icon>
          {{ selectedFilePaths.length > 0 ? '批量通过' : '通过当前' }}
          <span v-if="selectedFilePaths.length > 0" class="count-badge">{{
            selectedFilePaths.length
          }}</span>
        </el-button>
        <el-button
          color="#f53f3f"
          plain
          class="action-btn"
          @click="handleMoveFiles('_rejected')"
          :disabled="isMovingFiles"
        >
          <el-icon><Delete /></el-icon>
          {{ selectedFilePaths.length > 0 ? '批量废弃' : '废弃当前' }}
          <span v-if="selectedFilePaths.length > 0" class="count-badge">{{
            selectedFilePaths.length
          }}</span>
        </el-button>
      </div>
    </div>

    <div class="content-layout">
      <div class="sidebar-panel">
        <div class="sidebar-header">
          <el-input
            v-model="filterText"
            placeholder="搜索图片名称..."
            clearable
            class="search-input"
            :prefix-icon="Search"
          />
          <div class="selection-controls">
            <el-checkbox
              v-model="isAllSelected"
              :indeterminate="isIndeterminate"
              size="large"
              class="custom-checkbox"
            />
            <span>{{ selectedFilePaths.length }} / {{ filteredList.length }} 项</span>
          </div>
        </div>

        <div class="sidebar-list-wrapper custom-scrollbar">
          <el-empty
            v-if="filteredList.length === 0"
            description="暂无图片"
            :image-size="60"
          ></el-empty>
          <el-menu
            v-else
            :default-active="selectedImageId?.toString()"
            class="file-menu"
            @select="handleFileSelect"
          >
            <el-menu-item
              v-for="item in filteredList"
              :key="item.id"
              :index="item.id.toString()"
              class="premium-menu-item"
            >
              <div class="menu-item-content">
                <div class="img-icon">
                  <el-icon><PictureFilled /></el-icon>
                </div>
                <span class="file-name" :title="item.fileName">{{ item.fileName }}</span>
              </div>
              <el-checkbox v-model="item.selected" @click.stop></el-checkbox>
            </el-menu-item>
          </el-menu>
        </div>
      </div>

      <div class="main-panel" v-loading="isMovingFiles" element-loading-text="正在移动文件...">
        <div class="main-toolbar">
          <div class="left-info">
            <div class="info-capsule">
              <el-icon><LocationInformation /></el-icon>
              <span class="path-text" :title="selectedImage?.fullPath">{{
                selectedImage?.fullPath || '未选择任何文件'
              }}</span>
            </div>
            <div class="info-capsule" v-if="imageResolution && imageResolution !== '计算中...'">
              <el-icon><FullScreen /></el-icon>
              <span>{{ imageResolution }}</span>
            </div>
          </div>
        </div>

        <div class="viewer-area" v-if="selectedImage">
          <div class="nav-btn prev-btn" @click="prevImage" title="上一张 (⬅️)">
            <el-icon><ArrowLeftBold /></el-icon>
          </div>

          <el-image
            class="hd-image-canvas"
            :src="currentImageUrl"
            fit="contain"
            :preview-src-list="[currentImageUrl]"
            @load="handleImageLoad"
          >
            <template #placeholder>
              <div class="image-slot loading-slot">
                <div class="loader-spinner"></div>
                <span>解析原图中...</span>
              </div>
            </template>
            <template #error>
              <div class="image-slot error-slot">
                <el-icon size="40" color="#f53f3f"><WarningFilled /></el-icon>
                <span style="margin-top: 12px; color: #f53f3f"
                  >读取失败，文件可能已损坏或不存在</span
                >
              </div>
            </template>
          </el-image>

          <div class="nav-btn next-btn" @click="nextImage" title="下一张 (➡️)">
            <el-icon><ArrowRightBold /></el-icon>
          </div>
        </div>

        <div v-else class="viewer-area empty-placeholder">
          <el-icon size="60" color="#c0c4cc"><Camera /></el-icon>
          <p>在左侧选择图片以开启画廊预览</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  Delete,
  Search,
  Top,
  FolderOpened,
  PictureFilled,
  LocationInformation,
  FullScreen,
  ArrowLeftBold,
  ArrowRightBold,
  WarningFilled,
  Camera,
  Select,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import { BASE_ROOT, API } from '@/config'
import type { ImageItem } from '@/types'
import { useGlobalStore } from '@/stores/global'
import { storeToRefs } from 'pinia'
import { buildImageUrl } from '@/utils'

// 🚀 使用 Pinia 全局 Store 接管目录状态和扫描逻辑
const store = useGlobalStore()
const { workDirPath, realRemoteDirList, isScanning } = storeToRefs(store)
const { scanDirectory, enterDirectory, goUpDirectory } = store

const imageResolution = ref('')
const selectedImageId = ref<number | null>(null)

const handleImageLoad = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) {
    imageResolution.value = `${target.naturalWidth} × ${target.naturalHeight} px`
  }
}

watch(selectedImageId, () => {
  imageResolution.value = '计算中...'
})

const filterText = ref('')
const isMovingFiles = ref(false)
const realRemoteImageList = ref<ImageItem[]>([])

// 🚀 重构后的 fetchFileList：专注于组装图片列表
const fetchFileList = async () => {
  if (!workDirPath.value.trim()) return

  const files = await scanDirectory()

  if (files) {
    realRemoteImageList.value = files.map((file: any, index: number) => ({
      id: index + 1,
      fileName: file.name,
      fullPath: file.fullPath,
      selected: false,
    }))
    filterText.value = ''

    // ✅ 已修复：添加了非空断言 !
    selectedImageId.value =
      realRemoteImageList.value.length > 0 ? realRemoteImageList.value[0]!.id : null

    if (realRemoteImageList.value.length > 0) {
      ElMessage.success(`成功加载 ${realRemoteImageList.value.length} 张图片`)
    }
  } else {
    // 接口报错或为空时兜底清空
    realRemoteImageList.value = []
    selectedImageId.value = null
  }
}

// 🚀 封装点击事件，连接 Store 和 业务请求
const handleEnterDir = (fullPath: string) => enterDirectory(fullPath, fetchFileList)
const handleGoUpDir = () => goUpDirectory(fetchFileList)

const currentImageUrl = computed(() => {
  if (!selectedImage.value) return ''
  return buildImageUrl(selectedImage.value.fullPath)
})

const selectedImage = computed(() =>
  realRemoteImageList.value.find((img) => img.id === selectedImageId.value),
)
const filteredList = computed(() => {
  if (!filterText.value) return realRemoteImageList.value
  return realRemoteImageList.value.filter((item) =>
    item.fileName.toLowerCase().includes(filterText.value.toLowerCase()),
  )
})
const selectedFilePaths = computed(() =>
  realRemoteImageList.value.filter((i) => i.selected).map((i) => i.fullPath),
)

const isIndeterminate = computed(
  () =>
    selectedFilePaths.value.length > 0 &&
    selectedFilePaths.value.length < filteredList.value.length,
)

const isAllSelected = computed({
  get() {
    return (
      filteredList.value.length > 0 && selectedFilePaths.value.length === filteredList.value.length
    )
  },
  set(val: boolean) {
    realRemoteImageList.value.forEach((item) => {
      if (filteredList.value.some((f) => f.id === item.id)) {
        item.selected = val
      }
    })
  },
})

watch(filterText, () => {
  realRemoteImageList.value.forEach((item) => (item.selected = false))
})

const selectImageById = (id: number) => {
  selectedImageId.value = id
}
const handleFileSelect = (index: string) => {
  selectImageById(parseInt(index))
}

const prevImage = () => {
  const currentIndex = filteredList.value.findIndex((img) => img.id === selectedImageId.value)
  // ✅ 已修复：添加了非空断言 !
  if (currentIndex > 0) selectImageById(filteredList.value[currentIndex - 1]!.id)
  else if (currentIndex === 0) ElMessage.info('已经是首张图片了。')
}
const nextImage = () => {
  const currentIndex = filteredList.value.findIndex((img) => img.id === selectedImageId.value)
  // ✅ 已修复：添加了非空断言 !
  if (currentIndex < filteredList.value.length - 1 && currentIndex !== -1) {
    selectImageById(filteredList.value[currentIndex + 1]!.id)
  } else if (currentIndex !== -1) {
    ElMessage.info('🎉 已看完当前列表所有图片！')
  }
}

const handleKeyboardNav = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
  if (event.key === 'ArrowLeft') prevImage()
  else if (event.key === 'ArrowRight') nextImage()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyboardNav)
  if (workDirPath.value && workDirPath.value !== BASE_ROOT) {
    fetchFileList()
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardNav)
})

const handleMoveFiles = async (destination: '_approved' | '_rejected') => {
  let filesToMove: string[] = selectedFilePaths.value

  if (filesToMove.length === 0 && selectedImage.value) {
    filesToMove = [selectedImage.value.fullPath]
  }

  if (filesToMove.length === 0) {
    ElMessage.warning('请先选择要操作的图片')
    return
  }

  isMovingFiles.value = true
  try {
    const response = await fetch(API.FILE_MOVE_BATCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_paths: filesToMove,
        destination_folder: destination,
      }),
    })
    const result = await response.json()
    if (result.code === 200) {
      ElMessage.success(`${filesToMove.length}个文件已成功移动至 ${destination} 文件夹`)
      await fetchFileList()
    } else {
      ElMessage.error(result.msg || '文件移动失败')
    }
  } catch (error) {
    ElMessage.error('网络请求失败，无法移动文件')
  } finally {
    isMovingFiles.value = false
  }
}
</script>

<style scoped>
/* ================= 整体框架 ================= */
.screening-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--el-bg-color-page);
  min-width: 1100px;
}

/* 顶部工具栏 */
.top-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  background: var(--el-bg-color);
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}
.tool-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 右侧操作按钮 */
.right-actions {
  display: flex;
  gap: 12px;
  height: 32px;
  align-items: center;
}
.action-btn {
  border-radius: 8px;
  font-weight: bold;
  padding: 8px 20px;
  border: none;
  position: relative;
}
.count-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #f56c6c;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 0 0 2px #fff;
  z-index: 2;
}
.action-btn[color='#12aa50'] .count-badge {
  background-color: #12aa50;
  box-shadow: 0 0 0 2px #f0f9eb;
}

/* ================= 核心布局区 ================= */
.content-layout {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden; /* 防止内部内容撑破外层容器 */
}

/* 左侧面板 */
.sidebar-panel {
  width: 320px;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 20px;
  border-bottom: 1px solid #f2f3f5;
  flex-shrink: 0;
}
.selection-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
}

:deep(.search-input .el-input__wrapper) {
  background-color: #f2f3f5;
  box-shadow: none !important;
  border-radius: 8px;
}
:deep(.search-input .el-input__wrapper.is-focus) {
  background-color: #fff;
  box-shadow: 0 0 0 1px #3370ff inset !important;
}

/* [修复] 左侧文件列表滚动区域 */
.sidebar-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}
.file-menu {
  border-right: none;
  padding: 8px 12px;
}

/* 菜单项视觉 */
.premium-menu-item {
  height: 44px;
  line-height: 44px;
  margin-bottom: 4px;
  border-radius: 8px;
  padding: 0 12px !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #1f2329;
  transition: all 0.2s;
}
.premium-menu-item:hover {
  background-color: #f2f3f5;
}
.file-menu .el-menu-item.is-active {
  background-color: #f4f8ff;
  color: #3370ff;
  font-weight: 600;
}
.menu-item-content {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  margin-right: 12px;
}
.img-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8f959e;
  margin-right: 8px;
  font-size: 14px;
}
.is-active .img-icon {
  color: #3370ff;
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

:deep(.custom-checkbox .el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #3370ff;
  border-color: #3370ff;
}

/* 右侧主体面板 */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

/* 右侧顶部状态栏 */
.main-toolbar {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}
.left-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.info-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #f2f3f5;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #646a73;
}
.path-text {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2329;
  font-weight: 600;
  font-family: 'Fira Code', monospace;
}

/* [修复] 画廊预览区域：解决黑边和图片小的问题 */
.viewer-area {
  flex: 1;
  /* 移除丑陋的黑边，使用柔和的浅灰背景或者白底 */
  background-color: #f5f7fa;
  border-radius: 12px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.02);
}

/* 强制图片占满高度和宽度 */
.hd-image-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.el-image__inner) {
  object-fit: contain !important;
  width: 100%;
  height: 100%;
  max-height: 100%;
}

/* 加载动画 */
.image-slot {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #8f959e;
  font-size: 14px;
  gap: 12px;
}
.loader-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(51, 112, 255, 0.2);
  border-top-color: #3370ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 导航按钮：修改配色使其在亮色背景也清晰可见 */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  border-radius: 50%;
}

.nav-btn:hover {
  background-color: rgba(0, 0, 0, 0.4);
  transform: translateY(-50%) scale(1.1);
}
.prev-btn {
  left: 24px;
}
.next-btn {
  right: 24px;
}

/* 兜底态 */
.empty-placeholder {
  flex-direction: column;
  gap: 16px;
  background-color: #fff;
  border: 1px dashed #dee0e3;
  color: #8f959e;
}

/* Dark mode */
html.dark .top-toolbar,
html.dark .sidebar-panel,
html.dark .main-toolbar {
  background: var(--el-bg-color);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
html.dark .sidebar-header {
  border-bottom-color: var(--el-border-color);
}
html.dark .premium-menu-item:hover {
  background-color: var(--el-fill-color);
}
html.dark .file-menu .el-menu-item.is-active {
  background-color: rgba(51, 112, 255, 0.1);
}
html.dark .viewer-area {
  background-color: #1a1a1a;
}
html.dark .info-capsule {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-regular);
}
html.dark .pagination-container,
html.dark .empty-placeholder {
  background: var(--el-bg-color);
}
</style>
