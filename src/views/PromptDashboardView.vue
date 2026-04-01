<template>
  <div class="dashboard-container">
    <div class="top-control-panel">
      <div class="dir-loader-group">
        <el-input
          v-model="workDirPath"
          placeholder="输入远端图片根目录以限定看板数据范围..."
          class="fluid-input"
          clearable
          @keyup.enter="loadRemoteImages"
        >
          <template #prepend>📂 数据目录</template>
          <template #append>
            <el-button
              :icon="FolderOpened"
              :loading="isScanning"
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

      <div class="export-import-group">
        <el-tag v-if="hasLoadedDir" type="success" effect="light" round class="status-tag">
          <el-icon><Select /></el-icon> 当前为目录范围数据
        </el-tag>

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
          :action="`${API.PROMPT_IMPORT_EXCEL}?version=${encodeURIComponent(currentVersion)}`"
          :show-file-list="false"
          accept=".xlsx, .xls"
          name="file"
          :before-upload="handleBeforeUpload"
          :on-success="handleImportExcelSuccess"
          :on-error="handleImportError"
        >
          <el-button type="primary" plain :icon="Upload" :loading="isLoading" color="#3370ff"
            >导入配置</el-button
          >
        </el-upload>
        <el-button color="#3370ff" :icon="Download" @click="exportExcel">导出看板数据</el-button>
      </div>
    </div>

    <div class="metric-cards-wrapper">
      <div class="metric-card default-card">
        <div class="card-title">当前范围总数据量</div>
        <div class="card-value">{{ filteredData.length }} <span class="unit">条</span></div>
      </div>
      <div class="metric-card primary-card">
        <div class="card-title">已配置引导词</div>
        <div class="card-value color-blue">
          {{ overviewStats.configured }} <span class="unit">条</span>
        </div>
        <div class="card-trend">
          完成率: <strong>{{ overviewStats.configRate }}%</strong>
        </div>
      </div>
      <div class="metric-card success-card">
        <div class="card-title">已完成 Double Check</div>
        <div class="card-value color-green">
          {{ overviewStats.doubleChecked }} <span class="unit">条</span>
        </div>
        <div class="card-trend">
          双检覆盖率: <strong>{{ overviewStats.dcRate }}%</strong>
        </div>
      </div>
      <div
        class="metric-card warning-card"
        :class="{ 'is-clickable': overviewStats.errorCount > 0 }"
        @click="viewErrorData"
      >
        <div class="card-title">字数检查预警</div>
        <div class="card-value color-red">
          {{ overviewStats.errorCount }} <span class="unit">条</span>
        </div>
        <div class="card-trend alert-trend">
          包含标点或长度异常
          <span v-if="overviewStats.errorCount > 0" class="click-hint">点击筛查 👉</span>
        </div>
      </div>
    </div>

    <div class="main-workspace">
      <div class="workspace-toolbar">
        <div class="filter-group">
          <el-tag
            v-if="showOnlyErrors"
            closable
            @close="showOnlyErrors = false"
            type="danger"
            effect="dark"
            size="large"
            class="error-filter-tag"
          >
            <el-icon><Filter /></el-icon> 正在筛查字数/标点预警数据
          </el-tag>

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
              placeholder="二级筛选 (可多选)"
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
          <el-button
            type="primary"
            plain
            size="small"
            color="#3370ff"
            @click="addFilter"
            :icon="Plus"
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
              activeFilters[0]?.value.length > 0 ||
              showOnlyErrors
            "
            >清空</el-button
          >
        </div>

        <div class="view-switcher-group">
          <el-radio-group
            v-model="currentView"
            size="default"
            class="view-switcher"
            style="--el-color-primary: #3370ff"
          >
            <el-radio-button label="table"
              ><el-icon><Grid /></el-icon> 数据明细</el-radio-button
            >
            <el-radio-button label="member"
              ><el-icon><UserFilled /></el-icon> 人员效能</el-radio-button
            >
            <el-radio-button label="status"
              ><el-icon><PieChart /></el-icon> 质量大盘</el-radio-button
            >
          </el-radio-group>
        </div>
      </div>

      <div class="view-container" v-loading="isLoading" element-loading-text="正在处理数据...">
        <div v-if="currentView === 'table'" class="table-view-wrapper">
          <div class="table-tools">
            <el-popover placement="bottom-end" :width="200" trigger="click">
              <template #reference>
                <el-button size="small"
                  ><el-icon><Setting /></el-icon> 自定义显示列</el-button
                >
              </template>
              <div class="column-selector custom-scrollbar">
                <el-checkbox-group v-model="visibleColumns">
                  <el-checkbox
                    v-for="col in fieldSchema"
                    :key="col.key"
                    :label="col.key"
                    style="display: block; margin-bottom: 8px"
                  >
                    {{ col.label }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </el-popover>
          </div>

          <el-table
            :data="paginatedData"
            style="width: 100%; height: 100%"
            border
            stripe
            size="small"
            :header-cell-style="{ background: '#f4f5f7', color: '#1f2329', fontWeight: 'bold' }"
          >
            <el-table-column fixed="left" prop="pose_code" label="编号" width="80" align="center">
              <template #default="{ row }"
                ><span class="code-text">{{ row.pose_code }}</span></template
              >
            </el-table-column>

            <el-table-column label="参考图" width="70" align="center">
              <template #default="{ row }">
                <el-image
                  v-if="row._imageUrl"
                  :src="row._imageUrl"
                  :preview-src-list="[row._imageUrl]"
                  preview-teleported
                  fit="cover"
                  class="table-thumbnail"
                />
                <el-icon v-else color="#c0c4cc" :size="20"><Picture /></el-icon>
              </template>
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('modified_prompt')"
              prop="modified_prompt"
              label="修改引导词 (正式)"
              min-width="260"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span :class="{ 'empty-cell': !row.modified_prompt }">{{
                  row.modified_prompt || '尚未配置'
                }}</span>
              </template>
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('word_count_check')"
              prop="word_count_check"
              label="字数"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="
                    !row.modified_prompt
                      ? 'info'
                      : row.modified_prompt.length > 30 ||
                          /[\p{P}\p{S}]$/u.test(row.modified_prompt.trim())
                        ? 'danger'
                        : 'success'
                  "
                  disable-transitions
                >
                  {{ row.modified_prompt ? row.modified_prompt.length : 0 }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('generated_prompt')"
              prop="generated_prompt"
              label="生成引导词 (参考)"
              min-width="200"
              show-overflow-tooltip
            />

            <el-table-column
              v-if="visibleColumns.includes('modifier')"
              prop="modifier"
              label="修改人"
              width="90"
              align="center"
            >
              <template #default="{ row }"
                ><el-tag size="small" type="info" disable-transitions v-if="row.modifier">{{
                  row.modifier
                }}</el-tag></template
              >
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('check_owner')"
              prop="check_owner"
              label="Check人"
              width="90"
              align="center"
            >
              <template #default="{ row }"
                ><el-tag size="small" type="warning" disable-transitions v-if="row.check_owner">{{
                  row.check_owner
                }}</el-tag></template
              >
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('is_double_check')"
              prop="is_double_check"
              label="双检"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <el-icon v-if="row.is_double_check === '1'" color="#12aa50" :size="16"
                  ><Select
                /></el-icon>
                <el-icon v-else color="#c0c4cc" :size="16"><CloseBold /></el-icon>
              </template>
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('is_fixed_data')"
              prop="is_fixed_data"
              label="固定"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.is_fixed_data === '1'"
                  size="small"
                  type="danger"
                  effect="dark"
                  disable-transitions
                  >是</el-tag
                >
              </template>
            </el-table-column>

            <el-table-column
              v-if="visibleColumns.includes('remarks')"
              prop="remarks"
              label="备注"
              min-width="120"
              show-overflow-tooltip
            />

            <el-table-column fixed="right" label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  plain
                  size="small"
                  color="#3370ff"
                  @click="openEditDrawer(row)"
                  ><el-icon><EditPen /></el-icon> 修改</el-button
                >
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-footer">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              layout="total, prev, pager, next, jumper"
              :total="filteredData.length"
              background
            />
          </div>
        </div>

        <div v-else-if="currentView === 'member'" class="stats-view-wrapper custom-scrollbar">
          <div class="stats-grid">
            <div class="stats-card">
              <h3>
                <el-icon color="#3370ff"><Medal /></el-icon> 引导词配置进度榜 (修改人)
              </h3>
              <div class="progress-list">
                <div class="progress-item" v-for="item in modifierRank" :key="item.name">
                  <div class="p-info">
                    <span>{{ item.name }}</span
                    ><span>{{ item.count }} 条</span>
                  </div>
                  <el-progress
                    :percentage="item.percent"
                    :stroke-width="12"
                    color="#3370ff"
                    :show-text="false"
                  />
                </div>
                <el-empty
                  v-if="modifierRank.length === 0"
                  description="暂无配置数据"
                  :image-size="60"
                />
              </div>
            </div>
            <div class="stats-card">
              <h3>
                <el-icon color="#e6a23c"><SuccessFilled /></el-icon> 质量核验进度榜 (Check人)
              </h3>
              <div class="progress-list">
                <div class="progress-item" v-for="item in checkerRank" :key="item.name">
                  <div class="p-info">
                    <span>{{ item.name }}</span
                    ><span>{{ item.count }} 条</span>
                  </div>
                  <el-progress
                    :percentage="item.percent"
                    :stroke-width="12"
                    color="#e6a23c"
                    :show-text="false"
                  />
                </div>
                <el-empty
                  v-if="checkerRank.length === 0"
                  description="暂无 Check 数据"
                  :image-size="60"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentView === 'status'" class="stats-view-wrapper custom-scrollbar">
          <div class="stats-grid three-cols">
            <div class="stats-card center-card">
              <h3>引导词配置率</h3>
              <el-progress
                type="dashboard"
                :percentage="overviewStats.configRate"
                :stroke-width="14"
                color="#3370ff"
              >
                <template #default="{ percentage }">
                  <span class="ring-value">{{ percentage }}%</span>
                  <span class="ring-label">已配置</span>
                </template>
              </el-progress>
            </div>
            <div class="stats-card center-card">
              <h3>双检覆盖率 (Double Check)</h3>
              <el-progress
                type="dashboard"
                :percentage="overviewStats.dcRate"
                :stroke-width="14"
                color="#12aa50"
              >
                <template #default="{ percentage }">
                  <span class="ring-value">{{ percentage }}%</span>
                  <span class="ring-label">已双检</span>
                </template>
              </el-progress>
            </div>
            <div class="stats-card center-card">
              <h3>字数/标点合格率</h3>
              <el-progress
                type="dashboard"
                :percentage="overviewStats.validRate"
                :stroke-width="14"
                color="#722ed1"
              >
                <template #default="{ percentage }">
                  <span class="ring-value">{{ percentage }}%</span>
                  <span class="ring-label">检测合格</span>
                </template>
              </el-progress>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-drawer
      v-model="editDrawerVisible"
      :title="`配置数据 - ${focusItem?.pose_code} (${currentVersion})`"
      size="650px"
      class="custom-drawer"
    >
      <div class="drawer-layout" v-if="focusItem">
        <div class="drawer-image-header" v-if="focusItem._imageUrl">
          <el-image
            :src="focusItem._imageUrl"
            :preview-src-list="[focusItem._imageUrl]"
            fit="contain"
            class="drawer-img"
          />
          <div class="img-tip">
            <el-icon><Picture /></el-icon> 点击图片可放大预览
          </div>
        </div>

        <div class="feishu-panel custom-scrollbar">
          <div class="feishu-body compact-body">
            <div class="section-divider">
              <span class="section-mark"></span><span class="section-title">引导词配置</span>
            </div>

            <div class="feishu-row vertical-row">
              <div class="feishu-label">
                <el-icon><DocumentCopy /></el-icon> 生成引导词 (参考)
              </div>
              <div class="feishu-value">
                <el-input
                  v-model="focusItem.generated_prompt"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  class="seamless-input readonly-input"
                  placeholder="系统生成的原始引导词..."
                />
              </div>
            </div>

            <div
              class="feishu-row vertical-row highlight-row"
              :class="{ 'has-error': promptError }"
            >
              <div class="feishu-label primary-label">
                <el-icon><Edit /></el-icon> 修改引导词 (正式)
              </div>
              <div class="feishu-value col-layout">
                <el-input
                  v-model="focusItem.modified_prompt"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                  class="seamless-input main-input"
                  placeholder="输入优化后的正式引导词..."
                  maxlength="30"
                  show-word-limit
                />
                <div v-if="promptError" class="error-hint">
                  <el-icon><Warning /></el-icon> {{ promptError }}
                </div>
              </div>
            </div>

            <div class="section-divider" style="margin-top: 16px">
              <span class="section-mark"></span><span class="section-title">责任与状态</span>
            </div>

            <div class="feishu-row">
              <div class="feishu-label">
                <el-icon><User /></el-icon> 责任归属
              </div>
              <div class="feishu-value">
                <div class="dense-grid col-2">
                  <div class="dense-item item-blue">
                    <span class="lbl">修改人</span
                    ><el-select
                      v-model="focusItem.modifier"
                      class="seamless-select"
                      allow-create
                      filterable
                      clearable
                      placeholder="姓名"
                      :options="getOptions('modifier')"
                    />
                  </div>
                  <div class="dense-item item-purple">
                    <span class="lbl">Check人</span
                    ><el-select
                      v-model="focusItem.check_owner"
                      class="seamless-select"
                      allow-create
                      filterable
                      clearable
                      placeholder="姓名"
                      :options="getOptions('check_owner')"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="feishu-row">
              <div class="feishu-label">
                <el-icon><Setting /></el-icon> 检查状态
              </div>
              <div class="feishu-value">
                <div class="dense-grid col-3">
                  <div class="dense-item item-gray">
                    <span class="lbl">字数</span>
                    <span class="readonly-text" :class="{ 'text-error': promptError }"
                      >{{ focusItem.modified_prompt ? focusItem.modified_prompt.length : 0 }} /
                      30</span
                    >
                  </div>
                  <div class="dense-item item-gray">
                    <span class="lbl">双检</span
                    ><el-switch
                      v-model="focusItem.is_double_check"
                      active-value="1"
                      inactive-value="0"
                      size="small"
                      style="--el-switch-on-color: #3370ff"
                    />
                  </div>
                  <div class="dense-item item-gray">
                    <span class="lbl">固定</span
                    ><el-switch
                      v-model="focusItem.is_fixed_data"
                      active-value="1"
                      inactive-value="0"
                      size="small"
                      style="--el-switch-on-color: #3370ff"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="feishu-row" style="margin-top: 4px">
              <div class="feishu-label">
                <el-icon><ChatLineSquare /></el-icon> 备注信息
              </div>
              <div class="feishu-value">
                <el-input
                  v-model="focusItem.remarks"
                  type="textarea"
                  :rows="2"
                  autosize
                  placeholder="添加备注..."
                  class="seamless-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="drawer-footer-wrapper">
          <span class="update-info">更新于: {{ formatTime(focusItem?.updated_at) }}</span>
          <div class="drawer-actions">
            <el-button @click="editDrawerVisible = false" class="cancel-btn">取消</el-button>
            <el-button color="#3370ff" @click="saveAndNextDrawer" :disabled="!!promptError"
              >保存并自动下一条</el-button
            >
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  FolderOpened,
  Upload,
  Download,
  Delete,
  Plus,
  Refresh,
  Top,
  EditPen,
  DocumentCopy,
  Edit,
  User,
  Setting,
  ChatLineSquare,
  Warning,
  Grid,
  PieChart,
  UserFilled,
  Select,
  CloseBold,
  Medal,
  SuccessFilled,
  Picture,
  Filter,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import { useGlobalStore } from '@/stores/global'
import { storeToRefs } from 'pinia'
import { BASE_ROOT, API, PROMPT_FIELD_SCHEMA, DEFAULT_PROMPT_VISIBLE_COLUMNS } from '@/config'
import { extractPoseCode, buildImageUrl, formatTime, formatNow, downloadBlob, debounce } from '@/utils'
import { RecordIndex } from '@/utils/recordIndex'
import { useFilters } from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'
import { useOptionsCache } from '@/composables/useOptionsCache'

const isLoading = ref(false)
const hasLoadedDir = ref(false)
const currentView = ref('table')
const showOnlyErrors = ref(false)

const allRecords = ref<any[]>([])

const fieldSchema = PROMPT_FIELD_SCHEMA

// 🚀 性能优化：使用 Map 索引快速查找记录
const recordsIndex = new RecordIndex()

const visibleColumns = ref([...DEFAULT_PROMPT_VISIBLE_COLUMNS])

// ==========================================
// 1. 挂载全局 Store
// ==========================================
const store = useGlobalStore()
const { currentVersion, versionOptions, workDirPath, realRemoteDirList, isScanning } = storeToRefs(store)
const { scanDirectory, enterDirectory, goUpDirectory } = store

const loadRemoteImages = async () => {
  if (!workDirPath.value.trim()) {
    hasLoadedDir.value = false
    return
  }
  const files = await scanDirectory()
  if (files) {
    allRecords.value.forEach((r) => {
      r._imageUrl = ''
      r._fileName = ''
    })
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
    hasLoadedDir.value = true
    ElMessage.success(`读取完成！已切换至该目录范围，匹配到 ${matchCount} 条数据。`)
  }
}

const handleEnterDir = (fullPath: string) => enterDirectory(fullPath, loadRemoteImages)
const handleGoUpDir = () => goUpDirectory(loadRemoteImages)

// ==========================================
// 2. 挂载筛选器 Composable
// ==========================================
const contextRecords = computed(() => {
  if (hasLoadedDir.value) return allRecords.value.filter((r) => r._imageUrl)
  return allRecords.value
})

// 复用统一的过滤逻辑
const {
  activeFilters,
  addFilter,
  removeFilter,
  clearAllFilters: baseClearAllFilters,
  getUniqueValues: baseGetUniqueValues,
  filteredData: baseFilteredData,
} = useFilters(contextRecords)

// 🚀 性能优化：使用 optionsDict 缓存所有选项
const { optionsDict, getOptions } = useOptionsCache(contextRecords, fieldSchema)
const getUniqueValues = (field: string) => baseGetUniqueValues(field)

const clearAllFilters = () => {
  baseClearAllFilters()
  showOnlyErrors.value = false
}

// 基于 baseFilteredData 追加一层本页特有的"预警状态"过滤逻辑
const filteredData = computed(() => {
  let result = baseFilteredData.value
  if (showOnlyErrors.value) {
    result = result.filter((i) => {
      if (!i.modified_prompt) return false
      const val = i.modified_prompt.trim()
      return val.length > 30 || /[\p{P}\p{S}]$/u.test(val)
    })
  }
  return result
})

// ==========================================
// 3. 分页
// ==========================================
const { currentPage, pageSize, paginatedData } = usePagination(filteredData, 15)

// ==========================================
// 业务统计指标
// ==========================================
const overviewStats = computed(() => {
  const baseData = filteredData.value
  const total = baseData.length

  if (total === 0)
    return {
      configured: 0,
      configRate: 0,
      doubleChecked: 0,
      dcRate: 0,
      errorCount: 0,
      validRate: 0,
    }

  const configuredItems = baseData.filter(
    (i) => i.modified_prompt && i.modified_prompt.trim().length > 0,
  )
  const configured = configuredItems.length
  const doubleChecked = baseData.filter(
    (i) => i.is_double_check === '1' || i.is_double_check === true,
  ).length

  const errorCount = configuredItems.filter((i) => {
    const val = i.modified_prompt.trim()
    return val.length > 30 || /[\p{P}\p{S}]$/u.test(val)
  }).length

  const validCount = configured - errorCount

  return {
    configured,
    configRate: Math.round((configured / total) * 100) || 0,
    doubleChecked,
    dcRate: Math.round((doubleChecked / total) * 100) || 0,
    errorCount,
    validRate: configured > 0 ? Math.round((validCount / configured) * 100) : 0,
  }
})

// ==========================================
// 表格接口与核心业务
// ==========================================
const fetchPromptList = async () => {
  if (!currentVersion.value) return
  isLoading.value = true
  try {
    const res = await fetch(
      `${API.PROMPT_LIST}?version=${encodeURIComponent(currentVersion.value)}&t=${Date.now()}`,
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
  // 初始化时拉取版本列表，成功后自动拉取表格数据
  store.fetchPromptVersions(fetchPromptList)
})

watch(currentVersion, (newVal) => {
  if (newVal) {
    currentPage.value = 1
    showOnlyErrors.value = false
    allRecords.value = []
    fetchPromptList()
  }
})

const viewErrorData = () => {
  if (overviewStats.value.errorCount > 0) {
    showOnlyErrors.value = true
    currentView.value = 'table'
    currentPage.value = 1
  }
}

const generateRank = (field: string) => {
  const counts: Record<string, number> = {}
  let max = 0
  filteredData.value.forEach((item) => {
    if (item[field]) {
      counts[item[field]] = (counts[item[field]] || 0) + 1
      if (counts[item[field]]! > max) max = counts[item[field]]!
    }
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percent: max > 0 ? Math.round((count / max) * 100) : 0,
    }))
}
const modifierRank = computed(() => generateRank('modifier'))
const checkerRank = computed(() => generateRank('check_owner'))

// ================== 抽屉编辑逻辑 ==================
const editDrawerVisible = ref(false)
const focusItem = ref<any>(null)
const focusCurrentIndex = ref(0)

const promptError = computed(() => {
  if (!focusItem.value?.modified_prompt) return ''
  const val = focusItem.value.modified_prompt.trim()
  if (/[\p{P}\p{S}]$/u.test(val)) return '结尾不能包含标点符号！'
  return ''
})

watch(
  () => focusItem.value?.modified_prompt,
  (newVal) => {
    if (!focusItem.value) return
    const val = (newVal || '').trim()
    focusItem.value.word_count_check = String(val.length)
  },
)

watch(
  () => [focusItem.value?.modifier, focusItem.value?.check_owner],
  ([modifier, checkOwner]) => {
    if (!focusItem.value) return
    focusItem.value.is_double_check = modifier && checkOwner ? '1' : '0'
  },
)

const openEditDrawer = (item: any) => {
  focusCurrentIndex.value = filteredData.value.findIndex((r) => r.pose_code === item.pose_code)
  focusItem.value = { ...item }
  editDrawerVisible.value = true
}

const saveAndNextDrawer = async () => {
  if (!focusItem.value || promptError.value) return

  try {
    const payload = {
      pose_code: focusItem.value.pose_code,
      version: currentVersion.value,
      generated_prompt: focusItem.value.generated_prompt,
      modified_prompt: focusItem.value.modified_prompt,
      modifier: focusItem.value.modifier,
      word_count_check: focusItem.value.word_count_check,
      check_owner: focusItem.value.check_owner,
      is_double_check:
        focusItem.value.is_double_check === '1' || focusItem.value.is_double_check === true,
      is_fixed_data:
        focusItem.value.is_fixed_data === '1' || focusItem.value.is_fixed_data === true,
      remarks: focusItem.value.remarks,
    }

    const res = await fetch(API.PROMPT_SAVE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const originalItem = filteredData.value[focusCurrentIndex.value]
      focusItem.value.updated_at = formatNow()
      Object.assign(originalItem, focusItem.value)

      ElMessage.success({ message: `[${focusItem.value.pose_code}] 保存成功`, duration: 1000 })

      if (focusCurrentIndex.value < filteredData.value.length - 1) {
        focusCurrentIndex.value++
        focusItem.value = { ...filteredData.value[focusCurrentIndex.value] }
        const targetPage = Math.ceil((focusCurrentIndex.value + 1) / pageSize.value)
        if (currentPage.value !== targetPage) currentPage.value = targetPage
      } else {
        ElMessage.info('当前列表已全部处理完毕')
        editDrawerVisible.value = false
      }
    } else {
      ElMessage.error('保存失败，请检查网络')
    }
  } catch (e) {
    ElMessage.error('接口异常')
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

const handleImportExcelSuccess = (res: any) => {
  isLoading.value = false
  if (res.code === 200) {
    ElMessage.success(res.msg)
    store.fetchPromptVersions()
    fetchPromptList()
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
    downloadBlob(blob, `prompt_dashboard_${currentVersion.value}_${Date.now()}.xlsx`)
  } catch (err) {
    ElMessage.error(`导出失败`)
  } finally {
    loading.close()
  }
}
</script>

<style scoped>
/* =========== 0. 容器级 =========== */
.dashboard-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  gap: 16px;
  min-width: 1200px;
  box-sizing: border-box;
}

/* =========== 1. 顶部控制台 =========== */
.top-control-panel {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 16px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}
.dir-loader-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  max-width: 800px;
}

.export-import-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  height: 32px;
}
.status-tag {
  margin-right: 8px;
  font-weight: bold;
}

/* =========== 2. 顶部指标卡 =========== */
.metric-cards-wrapper {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  flex-shrink: 0;
}
.metric-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #dee0e3;
  transition: width 0.2s;
}
.primary-card::before {
  background: #3370ff;
}
.success-card::before {
  background: #12aa50;
}
.warning-card::before {
  background: #f53f3f;
}

/* 预警卡片的点击交互 */
.is-clickable {
  cursor: pointer;
  background: #fffafa;
  border-color: rgba(245, 63, 63, 0.2);
}
.is-clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(245, 63, 63, 0.15);
  border-color: rgba(245, 63, 63, 0.4);
}
.is-clickable:hover::before {
  width: 8px;
}
.click-hint {
  font-weight: bold;
  color: #f53f3f;
  font-size: 12px;
  margin-left: auto;
  background: #fff0f0;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(245, 63, 63, 0.2);
}
.alert-trend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.card-title {
  font-size: 14px;
  color: #646a73;
  font-weight: 500;
}
.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2329;
  font-family:
    'Fira Code',
    -apple-system,
    BlinkMacSystemFont,
    monospace;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.card-value .unit {
  font-size: 13px;
  color: #8f959e;
  font-weight: 400;
}
.card-trend {
  font-size: 13px;
  color: #8f959e;
  margin-top: auto;
  display: flex;
  align-items: center;
}
.card-trend strong {
  color: #1f2329;
  margin-left: 4px;
  font-weight: 700;
}
.color-blue {
  color: #3370ff;
}
.color-green {
  color: #12aa50;
}
.color-red {
  color: #f53f3f;
}

/* =========== 3. 主体工作区 =========== */
.main-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.workspace-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #f2f3f5;
}
.error-filter-tag {
  font-weight: bold;
  padding: 0 16px;
  border-radius: 6px;
}

.view-switcher-group {
  flex-shrink: 0;
}
.view-switcher :deep(.el-radio-button__inner) {
  font-weight: 600;
  padding: 8px 16px;
}

.view-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

/* A. Table View */
.table-view-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  gap: 12px;
  overflow: hidden;
}
.table-tools {
  display: flex;
  justify-content: flex-end;
}
.column-selector {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}
.code-text {
  font-family: monospace;
  font-weight: 600;
  color: #3370ff;
  background: #f4f8ff;
  padding: 2px 6px;
  border-radius: 4px;
}
.table-thumbnail {
  width: 40px;
  height: 50px;
  border-radius: 4px;
  background: #f4f5f7;
  border: 1px solid #dee0e3;
}
.empty-cell {
  color: #c0c4cc;
  font-style: italic;
}
.pagination-footer {
  padding-top: 12px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f2f3f5;
  flex-shrink: 0;
}

/* B. Stats View (人员效能 & 质量大盘) */
.stats-view-wrapper {
  flex: 1;
  padding: 32px 24px;
  overflow-y: auto;
  background: #f7f8fa;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.stats-grid.three-cols {
  grid-template-columns: repeat(3, 1fr);
}
.stats-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}
.stats-card h3 {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #1f2329;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.center-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.p-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #646a73;
  font-weight: 500;
}
.ring-value {
  font-size: 32px;
  font-weight: bold;
  color: #1f2329;
  display: block;
}
.ring-label {
  font-size: 13px;
  color: #8f959e;
  display: block;
  margin-top: 4px;
}

/* =========== 4. 抽屉内 B 端极简表单 =========== */
.custom-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #dee0e3;
  font-weight: 700;
  color: #1f2329;
  font-size: 16px;
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

.drawer-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.drawer-image-header {
  height: 220px;
  flex-shrink: 0;
  background: #141414;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.drawer-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.img-tip {
  position: absolute;
  bottom: 12px;
  right: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(4px);
}

.feishu-panel {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.feishu-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid #f2f3f5;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  margin-top: 8px;
}
.section-mark {
  width: 4px;
  height: 16px;
  background-color: #3370ff;
  border-radius: 2px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.feishu-row {
  display: flex;
  align-items: flex-start;
  min-height: 36px;
  margin-bottom: 12px;
}
.feishu-label {
  width: 100px;
  color: #646a73;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 28px;
  font-weight: 500;
  flex-shrink: 0;
}
.feishu-value {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
}

.vertical-row {
  flex-direction: column;
}
.vertical-row .feishu-label {
  width: 100%;
  margin-bottom: 6px;
}

.highlight-row {
  background-color: #f4f8ff;
  border: 1px solid rgba(51, 112, 255, 0.2);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.highlight-row.has-error {
  background-color: #fffafa;
  border-color: rgba(245, 63, 63, 0.3);
}
.primary-label {
  color: #3370ff !important;
  font-size: 14px !important;
  font-weight: bold !important;
}

.dense-grid {
  display: grid;
  gap: 12px;
  width: 100%;
  align-items: center;
}
.dense-grid.col-2 {
  grid-template-columns: repeat(2, 1fr);
}
.dense-grid.col-3 {
  grid-template-columns: repeat(3, 1fr);
}
.dense-item {
  display: flex;
  align-items: center;
  border-radius: 6px;
  padding: 4px 12px;
  border: 1px solid #dee0e3;
  background: #fff;
}
.dense-item .lbl {
  font-size: 12px;
  margin-right: 8px;
  white-space: nowrap;
  color: #646a73;
}

.item-blue {
  border-left: 3px solid #3370ff;
}
.item-purple {
  border-left: 3px solid #722ed1;
}
.item-gray {
  border-left: 3px solid #8f959e;
}

.seamless-select {
  flex: 1;
  width: 100%;
}
.seamless-select :deep(.el-select__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0;
  min-height: 24px;
}
.seamless-select :deep(.el-select__placeholder) {
  color: #8f959e;
  font-size: 12px;
}
.seamless-select :deep(.el-select__selected-item) {
  color: #1f2329;
  font-size: 12px;
  font-weight: 600;
}

.seamless-input :deep(.el-textarea__inner) {
  box-shadow: none !important;
  background-color: #f4f5f7 !important;
  padding: 10px 12px;
  border-radius: 6px;
  color: #1f2329;
  font-size: 13px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.seamless-input :deep(.el-textarea__inner):focus {
  background-color: #fff !important;
  border: 1px solid #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1) !important;
}
.readonly-input :deep(.el-textarea__inner) {
  background-color: #fafafa !important;
  color: #8f959e !important;
  cursor: default;
}
.main-input :deep(.el-textarea__inner) {
  background-color: #fff !important;
  border: 1px solid #d9e6ff;
  font-size: 14px;
  line-height: 1.6;
}
.main-input :deep(.el-input__count) {
  background: transparent;
  bottom: 8px;
  right: 12px;
  font-weight: bold;
}

.readonly-text {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
  padding: 0 4px;
}
.text-error {
  color: #f53f3f;
}
.error-hint {
  color: #f53f3f;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
  background: #fff0f0;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 6px;
  border: 1px solid rgba(245, 63, 63, 0.2);
}

/* 抽屉底部吸底固定操作栏 */
.drawer-footer-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #dee0e3;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.02);
}
.update-info {
  font-size: 12px;
  color: #8f959e;
  font-family: monospace;
}
.drawer-actions {
  display: flex;
  gap: 12px;
}
.cancel-btn {
  border-radius: 6px;
}

/* Dark mode */
html.dark .top-control-panel,
html.dark .main-workspace {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
html.dark .metric-card {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  border-color: var(--el-border-color);
}
html.dark .metric-card::before {
  background: var(--el-border-color);
}
html.dark .is-clickable {
  background: rgba(245, 63, 63, 0.05);
  border-color: rgba(245, 63, 63, 0.15);
}
html.dark .workspace-toolbar {
  border-bottom-color: var(--el-border-color);
}
html.dark .stats-view-wrapper {
  background: var(--el-bg-color-page);
}
html.dark .stats-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
html.dark .pagination-footer {
  border-top-color: var(--el-border-color);
}
html.dark .custom-drawer :deep(.el-drawer__body) {
  background: var(--el-bg-color-page);
}
html.dark .custom-drawer :deep(.el-drawer__header) {
  border-bottom-color: var(--el-border-color);
}
html.dark .feishu-body {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}
html.dark .dense-item {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}
html.dark .highlight-row {
  background-color: rgba(51, 112, 255, 0.05);
  border-color: rgba(51, 112, 255, 0.15);
}
html.dark .drawer-footer-wrapper {
  background: var(--el-bg-color);
  border-top-color: var(--el-border-color);
}
html.dark .section-divider .section-title {
  color: var(--el-text-color-primary);
}
html.dark .drawer-image-header {
  background: #0a0a0a;
}
</style>
