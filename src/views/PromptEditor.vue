<template>
  <div class="labeling-container">
    <div class="top-toolbar">
      <div class="path-input-wrapper">
        <el-input
          v-model="workDirPath"
          placeholder="输入远端图片根目录进行对照预览..."
          class="fluid-input"
          clearable
          @keyup.enter="loadRemoteImages"
        >
          <template #prepend>📂 数据目录</template>
          <template #append>
            <el-button :icon="FolderOpened" :loading="isScanning" @click="loadRemoteImages" class="primary-append-btn"
              >加载数据</el-button
            >
          </template>
        </el-input>

        <div class="dir-navigator" v-if="realRemoteDirList.length > 0 || workDirPath !== BASE_ROOT">
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

      <div class="action-group">
        <el-select
          v-model="currentVersion"
          placeholder="选择或输入新版本号"
          style="width: 180px"
          filterable
          allow-create
          default-first-option
        >
          <template #prefix>🏷️</template>
          <el-option v-for="v in versionOptions" :key="v" :label="v" :value="v" />
        </el-select>

        <el-upload
          class="inline-upload"
          :action="API.PROMPT_IMPORT_EXCEL"
          :show-file-list="false"
          accept=".xlsx, .xls"
          name="file"
          :data="{ version: currentVersion }"
          :before-upload="handleBeforeUpload"
          :on-success="handleImportExcelSuccess"
          :on-error="handleImportError"
        >
          <el-button color="#E6A23C" plain :icon="Upload" :loading="isLoading"
            >导入 Excel</el-button
          >
        </el-upload>
        <el-button color="#3370ff" plain :icon="Download" @click="exportExcel"
          >导出 Excel</el-button
        >
      </div>
    </div>

    <div class="filter-toolbar">
      <div class="filter-list">
        <div class="filter-item" v-for="(filter, index) in activeFilters" :key="index">
          <el-select
            v-model="filter.field"
            placeholder="筛选字段"
            class="filter-field"
            clearable
            filterable
            @change="filter.value = []"
          >
            <el-option
              v-for="opt in fieldSchema"
              :key="opt.key"
              :label="opt.label"
              :value="opt.key"
            />
          </el-select>
          <el-select
            v-model="filter.value"
            placeholder="筛选值 (可多选)"
            class="filter-value"
            clearable
            filterable
            multiple
            collapse-tags
            collapse-tags-tooltip
            allow-create
          >
            <el-option
              label="[空值/未标注]"
              value="__EMPTY__"
              style="color: #f56c6c; font-weight: bold"
            />
            <el-option
              v-for="val in getUniqueValues(filter.field)"
              :key="val"
              :label="val"
              :value="val"
            />
          </el-select>
          <el-button
            type="danger"
            circle
            plain
            :icon="Delete"
            size="small"
            @click="removeFilter(index)"
            v-if="activeFilters.length > 1"
          />
        </div>
        <el-button type="primary" plain size="small" @click="addFilter" :icon="Plus" color="#3370ff"
          >添加条件</el-button
        >
        <el-button
          type="info"
          plain
          size="small"
          @click="clearAllFilters"
          :icon="Refresh"
          v-if="
            activeFilters.length > 1 ||
            activeFilters[0]?.field ||
            activeFilters[0]?.value.length > 0
          "
          >清空条件</el-button
        >
      </div>
      <div class="filter-stats">
        当前版本共 <strong>{{ filteredData.length }}</strong> 条数据
      </div>
    </div>

    <div class="grid-container" v-loading="isLoading" element-loading-text="正在同步数据...">
      <div
        class="annotation-card"
        v-for="item in paginatedData"
        :key="item.pose_code"
        @click="openFocusMode(item)"
      >
        <div class="card-image-section">
          <div class="pose-code-badge">{{ item.pose_code }}</div>
          <div class="status-badge" :class="item.modified_prompt ? 'is-done' : 'is-wait'">
            {{ item.modified_prompt ? '已配' : '待配' }}
          </div>

          <el-image :src="item._imageUrl" fit="cover" class="thumbnail" loading="lazy">
            <template #placeholder
              ><div class="img-placeholder">
                <el-icon class="is-loading"><Loading /></el-icon></div
            ></template>
            <template #error
              ><div class="img-placeholder">
                <el-icon><Picture /></el-icon><span>暂无对照图</span>
              </div></template
            >
          </el-image>
          <div class="hover-overlay">
            <el-icon :size="24"><EditPen /></el-icon><span>去配置</span>
          </div>
        </div>

        <div class="card-form-section">
          <div class="prompt-preview">
            <div class="preview-title">修改引导词预览：</div>
            <div class="preview-text" :class="{ 'empty-text': !item.modified_prompt }">
              {{ item.modified_prompt || '暂无修改内容...' }}
            </div>
          </div>

          <div class="meta-info-row">
            <span class="meta-item"
              ><el-icon><User /></el-icon> {{ item.modifier || '--' }}</span
            >
            <span class="meta-item time-item"
              ><el-icon><Clock /></el-icon> {{ formatTime(item.updated_at) }}</span
            >
          </div>
        </div>
      </div>
      <el-empty
        v-if="paginatedData.length === 0 && !isLoading"
        :description="currentVersion ? '无符合条件的数据' : '请先选择版本号'"
        class="empty-state"
      />
    </div>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        layout="total, prev, pager, next, jumper"
        :total="filteredData.length"
        background
      />
    </div>

    <el-dialog
      v-model="focusModeVisible"
      fullscreen
      :show-close="false"
      destroy-on-close
      class="focus-mode-dialog"
    >
      <div class="focus-header">
        <div class="focus-title">
          <el-icon><EditPen /></el-icon> 引导词精细配置
          <el-tag type="info" effect="dark" size="small" class="focus-progress"
            >{{ focusCurrentIndex + 1 }} / {{ filteredData.length }}</el-tag
          >
          <el-tag type="primary" size="small" style="margin-left: 8px">{{ currentVersion }}</el-tag>
        </div>
        <el-button @click="handleExitFocusMode" round plain class="esc-btn"
          >退出 (Esc)</el-button
        >
      </div>

      <div class="focus-layout" v-if="focusItem">
        <div class="focus-left">
          <el-image
            :src="focusItem._imageUrl"
            fit="contain"
            class="focus-main-img"
            :preview-src-list="[focusItem._imageUrl]"
          >
            <template #error>
              <div class="no-img-view">
                <el-icon :size="60"><Picture /></el-icon>
                <p>该编号暂未同步图像，可仅修改文本</p>
              </div>
            </template>
          </el-image>
        </div>

        <div class="focus-right">
          <div class="feishu-panel">
            <div class="feishu-header">
              <h1 class="feishu-title">{{ focusItem.pose_code }}</h1>
              <div class="feishu-tabs">
                <span class="feishu-tab active">引导词配置</span>
              </div>
            </div>

            <div class="feishu-body">
              <div class="prompt-compare-section">
                <div class="feishu-row vertical-row">
                  <div class="feishu-label">
                    <el-icon><DocumentCopy /></el-icon> 系统生成 (参考)
                  </div>
                  <el-input
                    v-model="focusItem.generated_prompt"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 6 }"
                    class="seamless-input readonly-input"
                    placeholder="系统生成的原始引导词..."
                    readonly
                  />
                </div>

                <div
                  class="feishu-row vertical-row highlight-row"
                  :class="{ 'has-error': promptError }"
                >
                  <div class="feishu-label primary-label">
                    <el-icon><Edit /></el-icon> 人工修改 (正式)
                  </div>
                  <el-input
                    v-model="focusItem.modified_prompt"
                    type="textarea"
                    :autosize="{ minRows: 4, maxRows: 10 }"
                    class="seamless-input main-input"
                    placeholder="在此处输入优化后的正式引导词..."
                    maxlength="30"
                    show-word-limit
                  />
                  <div v-if="promptError" class="error-hint">
                    <el-icon><Warning /></el-icon> {{ promptError }}
                  </div>
                </div>
              </div>

              <div class="attribute-block">
                <div class="feishu-row">
                  <div class="feishu-label">
                    <el-icon><User /></el-icon> 责任归属
                  </div>
                  <div class="dense-grid">
                    <div class="dense-item item-blue">
                      <span class="lbl">修改人</span>
                      <el-select
                        v-model="focusItem.modifier"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="输入姓名"
                        :options="getOptions('modifier')"
                      />
                    </div>
                    <div class="dense-item item-purple">
                      <span class="lbl">Check人</span>
                      <el-select
                        v-model="focusItem.check_owner"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="输入姓名"
                        :options="getOptions('check_owner')"
                      />
                    </div>
                  </div>
                </div>

                <div class="feishu-row">
                  <div class="feishu-label">
                    <el-icon><Setting /></el-icon> 状态设定
                  </div>
                  <div class="dense-grid">
                    <div class="dense-item item-gray">
                      <span class="lbl">字数</span>
                      <span class="readonly-text" :class="{ 'text-error': promptError }">
                        {{ focusItem.modified_prompt ? focusItem.modified_prompt.length : 0 }} / 30
                      </span>
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">DoubleCheck</span>
                      <el-switch
                        v-model="focusItem.is_double_check"
                        active-value="1"
                        inactive-value="0"
                        size="small"
                        style="--el-switch-on-color: #3370ff"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">固定数据</span>
                      <el-switch
                        v-model="focusItem.is_fixed_data"
                        active-value="1"
                        inactive-value="0"
                        size="small"
                        style="--el-switch-on-color: #3370ff"
                      />
                    </div>
                  </div>
                </div>

                <div class="feishu-row">
                  <div class="feishu-label">
                    <el-icon><ChatLineSquare /></el-icon> 备注信息
                  </div>
                  <el-input
                    v-model="focusItem.remarks"
                    type="textarea"
                    :rows="2"
                    autosize
                    placeholder="添加相关备注..."
                    class="seamless-input"
                  />
                </div>
              </div>

              <div class="inline-actions">
                <el-button
                  size="large"
                  @click="prevFocusItem"
                  :disabled="focusCurrentIndex <= 0"
                  class="nav-btn"
                >
                  <el-icon><ArrowLeft /></el-icon> 上一个
                </el-button>
                <el-button
                  type="primary"
                  size="large"
                  class="save-next-btn"
                  color="#3370ff"
                  @click="saveAndNext"
                  :disabled="!!promptError"
                >
                  保存并下一个 (Enter) <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  FolderOpened,
  Upload,
  Download,
  Delete,
  Plus,
  Loading,
  Top,
  Picture,
  EditPen,
  Refresh,
  ArrowLeft,
  ArrowRight,
  DocumentCopy,
  Edit,
  User,
  Setting,
  ChatLineSquare,
  Clock,
  Warning,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useGlobalStore } from '@/stores/global'
import { storeToRefs } from 'pinia'
import { BASE_ROOT, API, PROMPT_FIELD_SCHEMA, PROMPT_MAX_LENGTH } from '@/config'
import { extractPoseCode, formatTime, buildImageUrl, formatNow, debounce } from '@/utils'
import { RecordIndex } from '@/utils/recordIndex'
import { usePagination } from '@/composables/usePagination'
import { useFilters } from '@/composables/useFilters'
import { useOptionsCache } from '@/composables/useOptionsCache'

const isLoading = ref(false)

const allRecords = ref<any[]>([])

const fieldSchema = PROMPT_FIELD_SCHEMA

// 🚀 性能优化：使用 Map 索引快速查找记录
const recordsIndex = new RecordIndex()

// ==========================================
// 1. 挂载全局 Store（版本控制 + 远程目录）
// ==========================================
const store = useGlobalStore()
const { currentVersion, versionOptions, workDirPath, realRemoteDirList, isScanning } = storeToRefs(store)
const { scanDirectory, enterDirectory, goUpDirectory } = store

const loadRemoteImages = async () => {
  if (!workDirPath.value.trim() || allRecords.value.length === 0) return

  const files = await scanDirectory()
  if (files) {
    // 🚀 性能优化：构建 Map 索引，避免双重循环查找
    recordsIndex.build(allRecords.value)

    let matchCount = 0
    files.forEach((file: any) => {
      const poseCode = extractPoseCode(file.name)
      if (!poseCode) return

      // 🚀 使用 Map.get 替代 Array.find，从 O(n²) 降到 O(n)
      const record = recordsIndex.get(poseCode)
      if (record) {
        record._fileName = file.name
        record._imageUrl = buildImageUrl(file.fullPath)
        matchCount++
      }
    })
    ElMessage.success(`图像同步完成。成功为 ${matchCount} 个数据匹配到参考图。`)
  }
}

// 封装点击函数传递回调
const handleEnterDir = (fullPath: string) => enterDirectory(fullPath, loadRemoteImages)
const handleGoUpDir = () => goUpDirectory(loadRemoteImages)

// ==========================================
// 3. 挂载筛选器 Composable
// ==========================================
const {
  activeFilters,
  addFilter,
  removeFilter,
  clearAllFilters,
  getUniqueValues: baseGetUniqueValues,
  filteredData,
} = useFilters(allRecords)

// 🚀 性能优化：使用 optionsDict 缓存所有选项
const { optionsDict, getOptions } = useOptionsCache(allRecords, fieldSchema)
const getUniqueValues = (field: string) => baseGetUniqueValues(field)

// ==========================================
// 4. 分页
// ==========================================
const { currentPage, pageSize, paginatedData } = usePagination(filteredData, 10)

// ==========================================
// 业务状态与接口逻辑
// ==========================================
const fetchPromptList = async () => {
  if (!currentVersion.value) return
  isLoading.value = true
  try {
    const res = await fetch(
      `${API.PROMPT_LIST}?version=${encodeURIComponent(currentVersion.value)}`,
    )
    const data = await res.json()
    if (data.code === 200) {
      allRecords.value = data.data.map((r: any) => {
        const record = { ...r, _fileName: '', _imageUrl: '' }
        record.pose_code = String(record.pose_code).padStart(6, '0')
        for (const key in record) {
          if (record[key] === null) record[key] = ''
        }
        record.is_double_check =
          record.is_double_check === true || record.is_double_check === '1' ? '1' : '0'
        record.is_fixed_data =
          record.is_fixed_data === true || record.is_fixed_data === '1' ? '1' : '0'
        return record
      })
      if (workDirPath.value !== BASE_ROOT) loadRemoteImages()
    }
  } catch (e) {
    ElMessage.error('无法连接服务')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  store.fetchPromptVersions(fetchPromptList)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))

watch(currentVersion, (newVal) => {
  if (newVal) {
    currentPage.value = 1
    allRecords.value = []
    fetchPromptList()
  }
})

const _autoSave = async (item: any, showToast: boolean = true) => {
  try {
    const payload = {
      pose_code: item.pose_code,
      version: currentVersion.value,
      generated_prompt: item.generated_prompt,
      modified_prompt: item.modified_prompt,
      modifier: item.modifier,
      word_count_check: item.word_count_check,
      check_owner: item.check_owner,
      is_double_check: item.is_double_check === '1' || item.is_double_check === true,
      is_fixed_data: item.is_fixed_data === '1' || item.is_fixed_data === true,
      remarks: item.remarks,
    }

    const res = await fetch(API.PROMPT_SAVE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (showToast) {
      if (res.ok)
        ElMessage({
          message: `[${item.pose_code}] 引导词已保存`,
          type: 'success',
          duration: 1500,
          grouping: true,
        })
      else ElMessage.error(`[${item.pose_code}] 保存失败`)
    }
  } catch (e) {
    if (showToast) ElMessage.error('保存失败')
  }
}
const autoSave = debounce(_autoSave, 300)

// ================== 抽屉模式与数据校验 ==================
const focusModeVisible = ref(false)
const focusItem = ref<any>(null)
const focusCurrentIndex = ref(0)
const focusItemOriginal = ref<any>(null) // 用于检测修改

const promptError = computed(() => {
  if (!focusItem.value?.modified_prompt) return ''
  const val = focusItem.value.modified_prompt.trim()
  if (/[\p{P}\p{S}]$/u.test(val)) {
    return '结尾不能包含任何标点或特殊符号！'
  }
  return ''
})

watch(
  () => focusItem.value?.modified_prompt,
  (newVal) => {
    if (!focusItem.value) return
    const val = (newVal || '').trim()
    const len = val.length

    if (promptError.value) {
      focusItem.value.word_count_check = '结尾含符号'
    } else if (len > 0) {
      focusItem.value.word_count_check = String(len)
    } else {
      focusItem.value.word_count_check = '0'
    }
  },
)

watch(
  () => [focusItem.value?.modifier, focusItem.value?.check_owner],
  ([modifier, checkOwner]) => {
    if (!focusItem.value) return
    if (modifier && checkOwner) {
      focusItem.value.is_double_check = '1'
    } else {
      focusItem.value.is_double_check = '0'
    }
  },
)

const openFocusMode = (item: any) => {
  focusCurrentIndex.value = filteredData.value.findIndex((r) => r.pose_code === item.pose_code)
  focusItem.value = { ...item }
  focusItemOriginal.value = { ...item } // 保存原始数据用于检测修改
  focusModeVisible.value = true
}

/**
 * 处理退出焦点模式，检测未保存的修改
 */
const handleExitFocusMode = async () => {
  if (!focusItem.value) {
    focusModeVisible.value = false
    return
  }

  // 检测是否有未保存的修改
  const isModified = JSON.stringify(focusItem.value) !== JSON.stringify(focusItemOriginal.value)
  if (isModified) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的修改，确定要退出吗？',
        '提示',
        {
          confirmButtonText: '确定退出',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
      focusModeVisible.value = false
      focusItem.value = null
      focusItemOriginal.value = null
    } catch {
      // 用户点击取消，不退出
    }
  } else {
    focusModeVisible.value = false
    focusItem.value = null
    focusItemOriginal.value = null
  }
}

const prevFocusItem = () => {
  if (focusCurrentIndex.value > 0) {
    focusCurrentIndex.value--
    focusItem.value = { ...filteredData.value[focusCurrentIndex.value] }
    focusItemOriginal.value = { ...filteredData.value[focusCurrentIndex.value] }
  }
}

const saveAndNext = async () => {
  if (!focusItem.value || promptError.value) return

  const currentCode = focusItem.value.pose_code
  const indexBeforeSave = filteredData.value.findIndex((r) => r.pose_code === currentCode)

  let nextTarget = null
  if (indexBeforeSave >= 0 && indexBeforeSave < filteredData.value.length - 1) {
    nextTarget = filteredData.value[indexBeforeSave + 1]
  }

  const originalItem = allRecords.value.find((r) => r.pose_code === currentCode)
  if (originalItem) {
    focusItem.value.updated_at = formatNow()

    Object.assign(originalItem, focusItem.value)
    await autoSave(originalItem, false)
    ElMessage.success({
      message: `[${focusItem.value.pose_code}] 配置已保存`,
      duration: 1000,
      grouping: true,
    })
  }

  if (nextTarget) {
    const newIndex = filteredData.value.findIndex((r) => r.pose_code === nextTarget.pose_code)

    if (newIndex !== -1) {
      focusCurrentIndex.value = newIndex
      focusItem.value = { ...filteredData.value[newIndex] }
      focusItemOriginal.value = { ...filteredData.value[newIndex] }

      const targetPage = Math.ceil((newIndex + 1) / pageSize.value)
      if (currentPage.value !== targetPage) currentPage.value = targetPage
    } else {
      ElMessage.info('后续没有符合条件的数据了')
      focusModeVisible.value = false
    }
  } else {
    ElMessage.info('已经是最后一条了')
    focusModeVisible.value = false
  }
}

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (focusModeVisible.value && e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
    if (!promptError.value) {
      e.preventDefault()
      saveAndNext()
    }
  }
}

// ================== 上传导出逻辑 ==================
const handleBeforeUpload = () => {
  if (!currentVersion.value) {
    ElMessage.warning('请先在左侧选择或输入一个版本号，再进行导入！')
    return false
  }
  isLoading.value = true
  return true
}

const handleImportExcelSuccess = (res: any) => {
  isLoading.value = false
  if (res.code === 200) {
    ElMessage.success(res.msg)
    store.fetchPromptVersions()
  } else {
    ElMessage.error(res.msg || 'Excel导入失败')
  }
}

const handleImportError = () => {
  isLoading.value = false
  ElMessage.error('网络或服务器异常')
}

const exportExcel = async () => {
  if (filteredData.value.length === 0) return ElMessage.warning('没有可导出的数据')
  if (!currentVersion.value) return ElMessage.warning('缺少版本信息，无法导出')

  const loading = ElMessage.success({ message: `正在生成...`, duration: 0 })
  try {
    const res = await fetch(API.PROMPT_EXPORT_EXCEL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pose_codes: filteredData.value.map((i) => i.pose_code),
        version: currentVersion.value,
      }),
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `prompt_${currentVersion.value}_${Date.now()}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
  } catch (err) {
    ElMessage.error(`导出失败`)
  } finally {
    loading.close()
  }
}
</script>

<style scoped>
/* =========== 全局基础样式 =========== */
.labeling-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  gap: 16px;
  min-width: 1100px;
}

/* 1. 顶部工具栏 */
.top-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  background: var(--el-bg-color);
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.action-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

/* 2. 筛选器 */
.filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--el-bg-color);
  padding: 12px 24px;
  border-radius: 12px;
}
.filter-stats {
  font-size: 13px;
  color: #646a73;
  white-space: nowrap;
}

/* 3. 网格卡片 (自适应核心) */
.grid-container {
  flex: 1;
  overflow-y: auto;
  display: grid;
  /* 响应式网格布局，最小宽度 240px，自动填充 */
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  align-content: start;
  padding: 2px 8px 16px 0;
}

.annotation-card {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  gap: 12px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  cursor: pointer;
  border: 1px solid transparent;
}
.annotation-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: rgba(51, 112, 255, 0.2);
}

.card-image-section {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f4f5f7;
}
.thumbnail {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  transition: filter 0.3s;
}

/* Hover 编辑遮罩层 */
.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 14px;
  gap: 8px;
  font-weight: bold;
  z-index: 5;
}
.annotation-card:hover .hover-overlay {
  opacity: 1;
}
.annotation-card:hover .thumbnail {
  filter: blur(2px) brightness(0.8);
}

.pose-code-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 900;
  color: #1f2329;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 6px;
}
.status-badge.is-done {
  background: #e8f3ec;
  color: #12aa50;
  border: 1px solid #12aa50;
}
.status-badge.is-wait {
  background: #fff0f0;
  color: #f53f3f;
  border: 1px solid #f53f3f;
}
.img-placeholder,
.no-img-view {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #8f959e;
  font-size: 13px;
  gap: 8px;
}

.card-form-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.prompt-preview {
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #dee0e3;
  flex: 1;
}
.preview-title {
  font-size: 12px;
  color: #8f959e;
  margin-bottom: 6px;
}
.preview-text {
  font-size: 13px;
  color: #1f2329;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.empty-text {
  color: #bbbfc4;
  font-style: italic;
}

.meta-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px dashed #dee0e3;
  margin-top: auto;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #646a73;
  font-weight: 500;
}
.time-item {
  color: #8f959e;
}
.empty-state {
  grid-column: 1 / -1;
  margin-top: 60px;
}

/* 4. 分页 */
.pagination-container {
  background: var(--el-bg-color);
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  justify-content: flex-end;
}

/* =========== 5. 焦点沉浸模式 (重构面板布局) =========== */
.focus-mode-dialog :deep(.el-dialog__header) {
  display: none;
}
.focus-mode-dialog :deep(.el-dialog__body) {
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #141414;
  overflow: hidden;
}

.focus-header {
  height: 56px;
  background-color: #1a1a1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #333;
}
.focus-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e5e6eb;
}
.focus-progress {
  background-color: #333;
  border: none;
}
.esc-btn {
  background: transparent;
  border-color: #4c4d4f;
  color: #c0c4cc;
}
.esc-btn:hover {
  color: #fff;
  border-color: #8f959e;
}

.focus-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: calc(100vh - 56px);
}

.focus-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background-color: #141414;
  min-width: 0;
  min-height: 0;
}

.focus-main-img {
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  background-color: #1f1f1f;
}

/* 右侧面板固定 450px ~ 500px */
.focus-right {
  width: 480px;
  flex-shrink: 0;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.5);
  z-index: 10;
}
.feishu-panel {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feishu-header {
  border-bottom: 1px solid #dee0e3;
  padding-bottom: 16px;
}
.feishu-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 16px 0;
  color: #1f2329;
  font-family: 'Fira Code', monospace;
}
.feishu-tabs {
  display: flex;
  gap: 32px;
}
.feishu-tab {
  padding-bottom: 8px;
  font-size: 15px;
  cursor: pointer;
  margin-bottom: -17px;
}
.feishu-tab.active {
  color: #3370ff;
  border-bottom: 2px solid #3370ff;
  font-weight: 600;
}

.feishu-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.prompt-compare-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.attribute-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f9fafb;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #dee0e3;
}

.feishu-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feishu-label {
  color: #646a73;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}
.primary-label {
  color: #3370ff !important;
  font-size: 14px !important;
  font-weight: bold !important;
}

.highlight-row {
  background-color: #f4f8ff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(51, 112, 255, 0.2);
  transition: all 0.3s;
}
.highlight-row.has-error {
  background-color: #fff0f0;
  border-color: #f53f3f;
}

.dense-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}
.dense-item {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #dee0e3;
  border-radius: 6px;
  padding: 4px 12px;
  flex: 1;
  min-width: 120px;
}
.dense-item .lbl {
  font-size: 12px;
  margin-right: 8px;
  color: #646a73;
  white-space: nowrap;
}

.item-blue {
  border-left: 3px solid #3370ff;
}
.item-purple {
  border-left: 3px solid #722ed1;
}
.readonly-text {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}
.text-error {
  color: #f53f3f;
}

.seamless-select {
  flex: 1;
}
.seamless-select :deep(.el-select__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0;
  min-height: 24px;
}
.seamless-select :deep(.el-select__placeholder) {
  color: #8f959e;
  font-size: 13px;
}
.seamless-select :deep(.el-select__selected-item) {
  color: #1f2329;
  font-size: 13px;
  font-weight: bold;
}

.seamless-input :deep(.el-textarea__inner) {
  background-color: #fff;
  border-radius: 8px;
  color: #1f2329;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  border: 1px solid #dee0e3;
  transition: all 0.2s;
  box-shadow: none !important;
  padding: 12px;
}
.seamless-input :deep(.el-textarea__inner):focus {
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1) !important;
}
.readonly-input :deep(.el-textarea__inner) {
  background-color: #f4f5f7 !important;
  color: #8f959e !important;
  border-color: transparent;
}

.main-input :deep(.el-input__count) {
  background: transparent;
  bottom: 8px;
  right: 12px;
  font-weight: bold;
  color: #8f959e;
}

.error-hint {
  color: #f53f3f;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  margin-top: 4px;
}

.inline-actions {
  display: flex;
  gap: 16px;
  margin-top: auto;
  padding-top: 24px;
}
.nav-btn {
  flex: 1;
  border-radius: 8px;
}
.save-next-btn {
  flex: 2;
  font-size: 15px;
  font-weight: bold;
  border-radius: 8px;
  border: none;
}
.save-next-btn:hover {
  opacity: 0.9;
}
.save-next-btn:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

/* Dark mode */
html.dark .top-toolbar,
html.dark .filter-toolbar,
html.dark .pagination-container {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
html.dark .annotation-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
html.dark .annotation-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  border-color: rgba(51, 112, 255, 0.3);
}
html.dark .prompt-preview {
  background: var(--el-fill-color);
  border-color: var(--el-border-color);
}
html.dark .meta-info-row {
  border-top-color: var(--el-border-color);
}
html.dark .card-image-section {
  background-color: #2a2a2a;
}
html.dark .pose-code-badge {
  background-color: rgba(0, 0, 0, 0.7);
  color: #e5e6eb;
}
html.dark .focus-right {
  background-color: var(--el-bg-color);
}
html.dark .attribute-block {
  background: var(--el-fill-color);
  border-color: var(--el-border-color);
}
html.dark .dense-item {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}
</style>
