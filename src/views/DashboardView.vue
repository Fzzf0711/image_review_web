<template>
  <div class="dashboard-container">
    <div class="control-panel">
      <div class="path-input-wrapper">
        <el-input
          v-model="workDirPath"
          placeholder="输入远端图片根目录以挂载资源..."
          clearable
          class="custom-input fluid-input"
          @keyup.enter="loadRemoteImages"
        >
          <template #prepend>📂 数据目录</template>
          <template #append>
            <el-button
              :icon="FolderOpened"
              :loading="isLoading || isScanning"
              @click="loadRemoteImages"
              class="primary-append-btn"
            >
              加载数据
            </el-button>
          </template>
        </el-input>

        <div class="dir-navigator" v-if="realRemoteDirList.length > 0 || workDirPath !== BASE_ROOT">
          <el-button
            v-if="workDirPath !== BASE_ROOT"
            size="small"
            @click="handleGoUpDir"
            class="go-up-btn"
          >
            <el-icon>
              <Top />
            </el-icon>
            返回上一级
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

      <div class="stats-capsule">
        <el-icon>
          <Grid />
        </el-icon>
        匹配资产: <strong>{{ filteredData.length }}</strong>
        <span class="stats-total">/ {{ folderTotalCount }}</span>
      </div>

      <div class="export-import-group" style="display: flex; gap: 12px; margin-left: 16px">
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
          :action="`${API.POSE_IMPORT_JSON}?version=${encodeURIComponent(currentVersion)}`"
          :show-file-list="false"
          accept=".json"
          name="file"
          :before-upload="handleBeforeUpload"
          :on-success="handleImportSuccess"
          :on-error="handleImportError"
        >
          <el-button color="#909399" plain :icon="Upload" :loading="isLoading">导入 JSON</el-button>
        </el-upload>
        <el-upload
          class="inline-upload"
          :action="`${API.POSE_IMPORT_EXCEL}?version=${encodeURIComponent(currentVersion)}`"
          :show-file-list="false"
          accept=".xlsx, .xls"
          name="file"
          :before-upload="handleBeforeUpload"
          :on-success="handleImportExcelSuccess"
          :on-error="handleImportError"
        >
          <el-button color="#E6A23C" plain :icon="Upload" :loading="isLoading"
            >导入 Excel</el-button
          >
        </el-upload>
        <el-button color="#10B981" plain :icon="Download" @click="exportJSON">导出 JSON</el-button>
        <el-button color="#3370ff" :icon="Download" @click="exportExcel">导出 Excel</el-button>
      </div>
    </div>

    <div class="filter-panel">
      <div class="filter-group">
        <div class="filter-item" v-for="(filter, index) in activeFilters" :key="index">
          <el-select
            v-model="filter.field"
            placeholder="筛选字段"
            class="filter-field seamless-select"
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

          <el-select-v2
            v-model="filter.value"
            :options="getFilterOptions(filter.field)"
            placeholder="筛选值 (支持多选)"
            class="filter-value seamless-select-v2"
            clearable
            filterable
            multiple
            collapse-tags
            collapse-tags-tooltip
          />
          <el-button
            type="danger"
            circle
            plain
            :icon="Delete"
            size="small"
            @click="removeFilter(index)"
            v-if="activeFilters.length > 1"
            class="delete-btn"
          />
        </div>
        <el-button
          type="primary"
          plain
          size="small"
          color="#3370ff"
          @click="addFilter"
          :icon="Plus"
          class="rounded-btn"
          >添加条件</el-button
        >
        <el-button
          type="info"
          plain
          size="small"
          @click="clearAllFilters"
          v-if="activeFilters[0]?.field || activeFilters.length > 1"
          class="rounded-btn"
          >清空筛选</el-button
        >
      </div>
    </div>

    <div class="main-workspace">
      <el-tabs v-model="activeTab" class="custom-tabs" style="--el-color-primary: #3370ff">
        <el-tab-pane name="table">
          <template #label
            ><span class="tab-label"
              ><el-icon>
                <Grid />
              </el-icon>
              数据明细与编辑</span
            ></template
          >

          <div class="table-container" v-loading="isLoading" element-loading-text="正在加载数据...">
            <div class="table-tools-header">
              <el-popover placement="bottom-end" :width="380" trigger="click">
                <template #reference>
                  <el-button size="small" class="rounded-btn"
                    ><el-icon>
                      <Setting />
                    </el-icon>
                    自定义显示列</el-button
                  >
                </template>
                <div class="column-selector-popover custom-scrollbar">
                  <div class="popover-title">勾选需要展示的字段：</div>
                  <el-checkbox-group v-model="visibleColumns" class="column-grid">
                    <el-checkbox
                      v-for="col in fieldSchema"
                      :key="col.key"
                      :label="col.key"
                      :value="col.key"
                      style="--el-color-primary: #3370ff"
                    >
                      {{ col.label }}
                    </el-checkbox>
                  </el-checkbox-group>
                </div>
              </el-popover>
            </div>

            <el-table
              :data="paginatedData"
              border
              stripe
              height="100%"
              class="custom-table"
              size="small"
              :header-cell-style="{
                background: 'var(--table-header-bg, #f4f5f7)',
                color: 'var(--table-header-text, #1f2329)',
                fontWeight: 'bold',
                borderBottom: '1px solid var(--el-border-color-lighter)',
              }"
            >
              <el-table-column fixed label="缩略图" width="70" align="center">
                <template #default="{ row }">
                  <el-image
                    :src="row._imageUrl"
                    fit="cover"
                    class="table-thumb"
                    :preview-src-list="[row._imageUrl]"
                    preview-teleported
                    lazy
                  >
                    <template #error>
                      <div class="img-error">
                        <el-icon>
                          <Picture />
                        </el-icon>
                      </div>
                    </template>
                  </el-image>
                </template>
              </el-table-column>

              <el-table-column fixed prop="pose_code" label="编号" width="90" align="center">
                <template #default="{ row }">
                  <span class="code-badge">{{ row.pose_code }}</span>
                </template>
              </el-table-column>

              <template v-for="col in fieldSchema" :key="col.key">
                <el-table-column
                  v-if="visibleColumns.includes(col.key)"
                  :label="col.label"
                  :min-width="col.key === 'remarks' ? 180 : 110"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    <span v-if="col.key.startsWith('style_') || col.key === 'is_fixed_data'">
                      <el-tag
                        size="small"
                        :type="row[col.key] == '1' ? 'success' : 'info'"
                        disable-transitions
                      >
                        {{ row[col.key] == '1' ? '是' : '否' }}
                      </el-tag>
                    </span>
                    <div v-else class="cell-text" :class="{ 'is-empty': !row[col.key] }">
                      {{ row[col.key] || '-' }}
                    </div>
                  </template>
                </el-table-column>
              </template>

              <el-table-column fixed="right" label="操作" width="90" align="center">
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    size="small"
                    plain
                    color="#3370ff"
                    @click="openEditDrawer(row)"
                    class="rounded-btn"
                  >
                    <el-icon>
                      <EditPen />
                    </el-icon>
                    编辑
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[20, 50, 100, 200]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="filteredData.length"
                background
                style="--el-color-primary: #3370ff"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="charts">
          <template #label
            ><span class="tab-label"
              ><el-icon>
                <PieChart />
              </el-icon>
              自定义趋势分析</span
            ></template
          >

          <div class="chart-workspace" v-loading="isLoading">
            <div class="chart-controls">
              <div class="control-group">
                <span class="control-label">分析维度：</span>
                <el-select
                  v-model="analyzeDimension"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  class="chart-dim-select seamless-select"
                  @change="renderChart"
                >
                  <el-option
                    v-for="opt in fieldSchema"
                    :key="opt.key"
                    :label="opt.label"
                    :value="opt.key"
                  />
                </el-select>
              </div>
              <div class="control-group">
                <span class="control-label">图表类型：</span>
                <el-radio-group
                  v-model="chartType"
                  @change="renderChart"
                  class="custom-radio-group"
                  style="--el-color-primary: #3370ff"
                >
                  <el-radio-button label="pie">饼图</el-radio-button>
                  <el-radio-button label="bar">柱形图</el-radio-button>
                  <el-radio-button label="line">折线图</el-radio-button>
                </el-radio-group>
              </div>
            </div>

            <div class="chart-card">
              <div ref="mainChartRef" class="main-chart-box"></div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-drawer
      v-model="drawerVisible"
      :title="`正在编辑 - ${editingForm.pose_code} (${currentVersion})`"
      size="650px"
      class="custom-drawer"
    >
      <div class="drawer-content custom-scrollbar">
        <el-form :model="editingForm" label-position="top" size="default" class="drawer-form">
          <el-form-item
            v-for="col in fieldSchema"
            :key="col.key"
            :label="col.label"
            :class="{ 'full-width-item': col.key === 'remarks' }"
          >
            <el-switch
              v-if="col.key.startsWith('style_') || col.key === 'is_fixed_data'"
              v-model="editingForm[col.key]"
              active-value="1"
              inactive-value="0"
              active-text="是"
              inactive-text="否"
              style="--el-switch-on-color: #3370ff"
            />

            <el-input
              v-else-if="col.key === 'remarks'"
              v-model="editingForm[col.key]"
              type="textarea"
              :rows="3"
              class="seamless-input"
              placeholder="输入备注信息..."
            />

            <el-select-v2
              v-else
              v-model="editingForm[col.key]"
              :options="getEditOptions(col.key)"
              filterable
              allow-create
              clearable
              style="width: 100%"
              class="seamless-select-v2"
              placeholder="请选择或输入"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false" class="rounded-btn">取消修改</el-button>
          <el-button
            type="primary"
            color="#3370ff"
            :loading="isSaving"
            @click="confirmSave"
            class="rounded-btn"
            >确认并保存</el-button
          >
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  FolderOpened,
  Delete,
  Plus,
  Top,
  Grid,
  PieChart,
  EditPen,
  Setting,
  Picture,
  Upload,
  Download,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import type { ECharts, EChartsCoreOption } from '@/utils/echarts'

import {
  BASE_ROOT,
  API,
  DEFAULT_POSE_VISIBLE_COLUMNS,
  CHART_COLOR_PALETTE,
} from '@/config'
import { POSE_FIELD_SCHEMA } from '@/config/schema'
import { extractPoseCode, buildImageUrl } from '@/utils'
import { useFilters } from '@/composables/useFilters'
import { useGlobalStore } from '@/stores/global'
import { storeToRefs } from 'pinia'
import { usePagination } from '@/composables/usePagination'

const activeTab = ref('table')
const isLoading = ref(false)

const allRecords = shallowRef<any[]>([])

const drawerVisible = ref(false)
const isSaving = ref(false)
const editingForm = ref<any>({})
let currentEditingIndex = -1

const fieldSchema = POSE_FIELD_SCHEMA

const visibleColumns = ref([...DEFAULT_POSE_VISIBLE_COLUMNS])

// ==========================================
// 1. 使用 Pinia 全局 Store
// ==========================================
const store = useGlobalStore()
const { currentVersion, versionOptions, workDirPath, realRemoteDirList, isScanning } =
  storeToRefs(store)
const { scanDirectory, enterDirectory, goUpDirectory } = store

const loadRemoteImages = async () => {
  if (!workDirPath.value.trim() || !currentVersion.value) {
    if (!currentVersion.value) ElMessage.warning('请先选择或输入一个版本号')
    return
  }
  isLoading.value = true
  try {
    // 1. 调用 Store 扫描目录
    const files = await scanDirectory()
    if (!files) throw new Error('扫描目录中止或失败')

    // 2. 拉取数据库指定版本数据
    const dbRes = await fetch(
      `${API.POSE_LIST}?version=${encodeURIComponent(currentVersion.value)}`,
    )
    const dbData = await dbRes.json()

    const dbRecordMap = new Map()
    if (dbData.code === 200) {
      dbData.data.forEach((r: any) => {
        const cleanRecord = { ...r, _fileName: '', _imageUrl: '' }
        cleanRecord.pose_code = String(r.pose_code).padStart(6, '0')
        dbRecordMap.set(cleanRecord.pose_code, cleanRecord)
      })
    }

    // 3. 数据合并
    files.forEach((file: any) => {
      const poseCode = extractPoseCode(file.name)
      if (!poseCode) return
      if (dbRecordMap.has(poseCode)) {
        const existing = dbRecordMap.get(poseCode)
        existing._fileName = file.name
        existing._imageUrl = buildImageUrl(file.fullPath)
      } else {
        dbRecordMap.set(poseCode, {
          pose_code: poseCode,
          _fileName: file.name,
          _imageUrl: buildImageUrl(file.fullPath),
        })
      }
    })

    allRecords.value = Array.from(dbRecordMap.values())
    ElMessage.success('数据加载完毕')
    if (activeTab.value === 'charts') renderChart()
  } catch (err: any) {
    // 静默处理，scanDirectory 内部有弹窗提示
  } finally {
    isLoading.value = false
  }
}

const handleEnterDir = (fullPath: string) => enterDirectory(fullPath, loadRemoteImages)
const handleGoUpDir = () => goUpDirectory(loadRemoteImages)

onMounted(() => {
  store.fetchPoseVersions(() => {
    if (currentVersion.value && workDirPath.value) {
      loadRemoteImages()
    }
  })
})

watch(currentVersion, (newVal) => {
  if (newVal) {
    currentPage.value = 1
    allRecords.value = []
    if (workDirPath.value) loadRemoteImages()
  }
})

// ==========================================
// 3. 使用筛选器 Composable
// ==========================================
const displayRecords = computed(() => allRecords.value.filter((r) => r._imageUrl))
const folderTotalCount = computed(() => displayRecords.value.length)

// 获取复用的筛选逻辑
const { activeFilters, addFilter, removeFilter, clearAllFilters, getUniqueValues, filteredData } =
  useFilters(displayRecords)

// 获取筛选器选项 (追加空值提示)
const getFilterOptions = (field: string) => {
  if (!field) return []
  const options = getUniqueValues(field).map((v) => ({ value: v, label: v }))
  options.unshift({ value: '__EMPTY__', label: '🔴 [空值/未标注]' })
  return options
}

// 获取编辑表单选项
const getEditOptions = (field: string) =>
  getUniqueValues(field).map((v) => ({ value: v, label: v }))

// ==========================================
// 4. 使用分页 Composable
// ==========================================
const { currentPage, pageSize, paginatedData } = usePagination(filteredData, 50)

// ==========================================
// 操作与表单相关逻辑
// ==========================================
const openEditDrawer = (row: any) => {
  currentEditingIndex = allRecords.value.findIndex((r) => r.pose_code === row.pose_code)
  editingForm.value = { ...row }
  drawerVisible.value = true
}

const confirmSave = async () => {
  isSaving.value = true
  try {
    const payload = { ...editingForm.value, version: currentVersion.value }
    delete payload._fileName
    delete payload._imageUrl

    const res = await fetch(API.POSE_SAVE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      if (currentEditingIndex !== -1) {
        const newArray = [...allRecords.value]
        newArray[currentEditingIndex] = { ...editingForm.value }
        allRecords.value = newArray
      }
      ElMessage.success(`[${payload.pose_code}] 保存成功`)
      drawerVisible.value = false
    } else {
      ElMessage.error('保存失败')
    }
  } catch (e) {
    ElMessage.error('网络异常，保存失败')
  } finally {
    isSaving.value = false
  }
}

const handleBeforeUpload = () => {
  if (!currentVersion.value) {
    ElMessage.warning('请先选择或输入一个版本号，再进行导入！')
    return false
  }
  isLoading.value = true
  return true
}

const handleImportSuccess = (res: any) => {
  isLoading.value = false
  if (res.code === 200) {
    ElMessage.success(res.msg)
    store.fetchPoseVersions()
    loadRemoteImages()
  } else ElMessage.error(res.msg || '导入失败')
}

const handleImportExcelSuccess = (res: any) => {
  isLoading.value = false
  if (res.code === 200) {
    ElMessage.success(res.msg)
    store.fetchPoseVersions()
    loadRemoteImages()
  } else ElMessage.error(res.msg || '导入失败')
}

const handleImportError = () => {
  isLoading.value = false
  ElMessage.error('导入异常')
}

const exportFile = async (type: 'json' | 'excel') => {
  if (filteredData.value.length === 0) return ElMessage.warning('没有可导出的数据')
  if (!currentVersion.value) return ElMessage.warning('缺少版本信息，无法导出')

  const loading = ElMessage.success({ message: `正在生成...`, duration: 0 })
  try {
    const url = type === 'json' ? API.POSE_EXPORT_JSON : API.POSE_EXPORT_EXCEL
    const res = await fetch(url, {
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
    a.download = `export_${currentVersion.value}_${Date.now()}.${type === 'excel' ? 'xlsx' : 'json'}`
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
const exportJSON = () => exportFile('json')
const exportExcel = () => exportFile('excel')

// ================= 图表分析区逻辑 =================
const analyzeDimension = ref<string[]>(['scene_theme'])
const chartType = ref<'bar' | 'pie' | 'line'>('bar')
const mainChartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<ECharts | null>(null)

const handleResize = () => chartInstance.value?.resize()

watch([activeTab, filteredData], () => {
  if (activeTab.value === 'charts') renderChart()
})

const renderChart = () => {
  nextTick(() => {
    if (!mainChartRef.value) return
    if (!chartInstance.value) {
      chartInstance.value = echarts.init(mainChartRef.value)
      window.addEventListener('resize', handleResize)
    }

    const instance = chartInstance.value

    if (!analyzeDimension.value || analyzeDimension.value.length === 0) {
      instance.clear()
      return
    }

    // 🌟 动态获取当前是否为暗黑模式
    const isDark = document.documentElement.classList.contains('dark')
    const titleColor = isDark ? '#e5e6eb' : '#1f2329'
    const labelColor = isDark ? '#a8abb2' : '#646a73'
    const splitColor = isDark ? '#4c4d4f' : '#f2f3f5'

    const dimLabels = analyzeDimension.value
      .map((dim) => fieldSchema.find((f) => f.key === dim)?.label || dim)
      .join(' & ')

    const counts: Record<string, number> = {}
    filteredData.value.forEach((item) => {
      const combinedKey = analyzeDimension.value
        .map((dim) => {
          let val = item[dim]
          if (dim.startsWith('style_')) {
            return val == '1' || val === true ? '是' : '否'
          } else {
            return (val || '未标').toString().trim()
          }
        })
        .join(' / ')

      counts[combinedKey] = (counts[combinedKey] || 0) + 1
    })

    const chartData = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const names = chartData.map((d) => d.name)
    const values = chartData.map((d) => d.value)

    let option: EChartsCoreOption = {
      color: CHART_COLOR_PALETTE,
      title: {
        text: `交叉维度探索 - ${dimLabels}`,
        left: 'center',
        top: 10,
        textStyle: { fontSize: 18, color: titleColor }, // 🌟 应用标题颜色
      },
      tooltip: {
        trigger: chartType.value === 'pie' ? 'item' : 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
    }

    if (chartType.value === 'pie') {
      option.series = [
        {
          name: dimLabels,
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: { borderRadius: 8, borderColor: isDark ? '#141414' : '#fff', borderWidth: 2 },
          data: chartData,
        },
      ]
    } else if (chartType.value === 'bar') {
      option.xAxis = {
        type: 'category',
        data: names,
        axisLabel: { interval: 0, rotate: 30, color: labelColor }, // 🌟 应用轴标签颜色
      }
      option.yAxis = {
        type: 'value',
        splitLine: { lineStyle: { color: splitColor, type: 'dashed' } }, // 🌟 应用网格线颜色
      }
      option.series = [
        {
          name: '资产数量',
          type: 'bar',
          data: values,
          barMaxWidth: 50,
          itemStyle: { color: '#3370ff', borderRadius: [4, 4, 0, 0] },
        },
      ]
    } else if (chartType.value === 'line') {
      option.xAxis = {
        type: 'category',
        data: names,
        boundaryGap: false,
        axisLabel: { interval: 0, rotate: 30, color: labelColor }, // 🌟 应用轴标签颜色
      }
      option.yAxis = {
        type: 'value',
        splitLine: { lineStyle: { color: splitColor, type: 'dashed' } }, // 🌟 应用网格线颜色
      }
      option.series = [
        {
          name: '资产数量',
          type: 'line',
          data: values,
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3 },
          itemStyle: { color: '#3370ff' },
          areaStyle: { color: '#3370ff', opacity: 0.1 },
        },
      ]
    }

    instance.setOption(option, true)
  })
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance.value?.dispose()
  chartInstance.value = null
})
</script>

<style scoped>
/* =========== 全局容器 =========== */
.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  background-color: var(--el-bg-color-page);
  min-width: 1100px;
  box-sizing: border-box;
}

/* =========== 1. 顶部控制台 =========== */
.control-panel {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
  gap: 24px;
}

.stats-capsule {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f4f8ff;
  color: #3370ff;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  height: 36px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.stats-capsule strong {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
}

.stats-total {
  color: #8f959e;
  font-size: 13px;
  font-weight: 400;
}

/* =========== 2. 多维筛选栏 =========== */
.filter-panel {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 12px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

/* Dashboard uses 130px filter-field (common.css uses 140px) */
.filter-field {
  width: 130px;
}

.filter-value {
  width: 240px;
}

.delete-btn {
  border: none;
  background: transparent;
}

/* =========== 3. 核心工作区 (Tabs & Table) =========== */
.main-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.custom-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.custom-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #f2f3f5;
}

.custom-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.custom-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  color: #646a73;
  font-weight: 500;
  height: 50px;
  line-height: 50px;
}

.custom-tabs :deep(.el-tabs__item.is-active) {
  color: #3370ff;
  font-weight: bold;
}

.custom-tabs :deep(.el-tabs__active-bar) {
  background-color: #3370ff;
  height: 3px;
  border-radius: 3px 3px 0 0;
}

.custom-tabs :deep(.el-tabs__content) {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.custom-tabs :deep(.el-tab-pane) {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 表格样式 */
.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  overflow: hidden;
}

.table-tools-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.custom-table {
  flex: 1;
  height: 0;
  border: 1px solid #dee0e3;
  border-radius: 8px;
  border-bottom: none;
}

.custom-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.custom-table :deep(.el-table__cell) {
  padding: 8px 0;
  border-right: none;
}

.custom-table :deep(.el-table__row) {
  transition: background-color 0.2s;
}

.custom-table :deep(.el-table__row:hover > td) {
  background-color: #f4f8ff !important;
}

.cell-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  color: #1f2329;
}

.cell-text.is-empty {
  color: #8f959e;
  font-style: italic;
}

.table-thumb {
  width: 36px;
  height: 48px;
  border-radius: 6px;
  background-color: #f4f5f7;
  border: 1px solid #dee0e3;
}

.img-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 16px;
}

.code-badge {
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: bold;
  color: #1f2329;
  background: #f4f5f7;
  padding: 2px 8px;
  border-radius: 6px;
}

.pagination-wrapper {
  padding-top: 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f2f3f5;
  flex-shrink: 0;
}

/* 自定义列选择器 Popover */
.column-selector-popover {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.popover-title {
  font-size: 13px;
  font-weight: bold;
  color: #1f2329;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f2f3f5;
}

.column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.column-grid .el-checkbox {
  margin-right: 0;
  color: #646a73;
}

/* 图表区 */
.chart-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 20px;
  background: #f7f8fa;
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-weight: 600;
  color: #1f2329;
}

.chart-dim-select {
  width: 320px;
  background: #f4f5f7;
  border-radius: 8px;
}

.custom-radio-group :deep(.el-radio-button__inner) {
  font-weight: 600;
  padding: 8px 20px;
}

.chart-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  display: flex;
  justify-content: center;
  align-items: center;
}

.main-chart-box {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

/* =========== 4. 抽屉内无边框极简表单 =========== */
.custom-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #dee0e3;
  font-weight: 700;
  color: #1f2329;
}

.custom-drawer :deep(.el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  overflow: hidden;
}

.custom-drawer :deep(.el-drawer__footer) {
  padding: 0;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.drawer-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  border: 1px solid #dee0e3;
}

.drawer-form .el-form-item {
  margin-bottom: 20px;
}

.drawer-form .full-width-item {
  grid-column: span 2;
}

.drawer-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #646a73;
  padding-bottom: 6px;
  line-height: 1;
}

/* 抽屉内无边框灰底输入框 */
:deep(.seamless-input .el-textarea__inner) {
  box-shadow: none !important;
  background-color: #f4f5f7 !important;
  padding: 12px;
  border-radius: 8px;
  color: #1f2329;
  border: 1px solid transparent;
  transition: all 0.2s;
}

:deep(.seamless-input .el-textarea__inner):focus {
  background-color: #fff !important;
  border: 1px solid #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1) !important;
}

/* 抽屉底部操作区 */
.drawer-footer {
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #dee0e3;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* ================= Dark mode 全面适配 ================= */
html.dark .control-panel,
html.dark .filter-panel,
html.dark .main-workspace {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  background: var(--el-bg-color);
}

/* 返回上一级按钮 */
html.dark .go-up-btn {
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);
  background: transparent;
}

html.dark .go-up-btn:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

/* 匹配资产小胶囊 */
html.dark .stats-capsule {
  background-color: rgba(51, 112, 255, 0.15);
  color: #5a9aff;
}

html.dark .stats-capsule strong {
  color: #5a9aff;
}

html.dark .stats-total {
  color: var(--el-text-color-secondary);
}

/* Tabs 标签页 */
html.dark .custom-tabs :deep(.el-tabs__header) {
  background: var(--el-bg-color);
  border-bottom-color: var(--el-border-color-light);
}

html.dark .custom-tabs :deep(.el-tabs__content) {
  background: transparent;
}

html.dark .custom-tabs :deep(.el-tabs__item) {
  color: var(--el-text-color-regular);
}

html.dark .custom-tabs :deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
}

/* Table 数据表格 */
html.dark .custom-table {
  border-color: var(--el-border-color-light);
  --table-header-bg: var(--el-fill-color-light);
  --table-header-text: var(--el-text-color-primary);
  background-color: transparent;
}

html.dark .custom-table :deep(tr),
html.dark .custom-table :deep(td.el-table__cell) {
  background-color: var(--el-bg-color);
}

html.dark .custom-table :deep(.el-table__row:hover > td) {
  background-color: var(--el-fill-color-dark) !important;
}

html.dark .cell-text {
  color: var(--el-text-color-primary);
}

html.dark .code-badge {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

html.dark .table-thumb {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color-light);
}

/* Table 工具区 & 分页 */
html.dark .pagination-wrapper {
  border-top-color: var(--el-border-color-light);
}

html.dark .popover-title {
  color: var(--el-text-color-primary);
  border-bottom-color: var(--el-border-color-light);
}

/* 图表工作区 */
html.dark .chart-workspace {
  background: var(--el-bg-color-page);
}

html.dark .chart-controls,
html.dark .chart-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  box-shadow: none;
}

html.dark .control-label {
  color: var(--el-text-color-primary);
}

/* 右侧滑出抽屉 (Drawer) */
html.dark .custom-drawer :deep(.el-drawer__body) {
  background: var(--el-bg-color-page);
}

html.dark .custom-drawer :deep(.el-drawer__header) {
  background: var(--el-bg-color);
  border-bottom-color: var(--el-border-color-light);
  color: var(--el-text-color-primary);
}

html.dark .drawer-form {
  background: var(--el-bg-color);
  border-color: var(--el-border-color-light);
}

html.dark .drawer-form :deep(.el-form-item__label) {
  color: var(--el-text-color-regular);
}

html.dark .drawer-footer {
  background: var(--el-bg-color);
  border-top-color: var(--el-border-color-light);
}

/* 抽屉内的无边框输入框 */
html.dark :deep(.seamless-input .el-textarea__inner) {
  background-color: var(--el-fill-color-light) !important;
  color: var(--el-text-color-primary);
  border-color: transparent;
}

html.dark :deep(.seamless-input .el-textarea__inner):focus {
  background-color: var(--el-bg-color) !important;
  border-color: var(--el-color-primary);
}
</style>
