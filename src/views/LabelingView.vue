<template>
  <div class="labeling-container">
    <div class="top-toolbar">
      <div class="tool-group path-group" style="flex: 1">
        <div class="path-input-wrapper">
          <el-input
            v-model="workDirPath"
            placeholder="输入远端图片根目录..."
            class="fluid-input"
            clearable
            @keyup.enter="loadRemoteImages"
          >
            <template #prepend>📂 数据目录</template>
            <template #append>
              <el-button
                :icon="FolderOpened"
                :loading="isLoading"
                @click="loadRemoteImages"
                class="primary-append-btn"
                >加载数据</el-button
              >
            </template>
          </el-input>

          <div
            class="dir-navigator"
            v-if="(realRemoteDirList && realRemoteDirList.length > 0) || workDirPath !== BASE_ROOT"
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

      <div class="export-import-group">
        <el-upload
          class="inline-upload"
          :action="API.POSE_IMPORT_JSON"
          :show-file-list="false"
          accept=".json"
          name="file"
          :before-upload="
            () => {
              isLoading = true
            }
          "
          :on-success="handleImportSuccess"
          :on-error="handleImportError"
        >
          <el-button color="#909399" plain :icon="Upload" :loading="isLoading">导入 JSON</el-button>
        </el-upload>
        <el-upload
          class="inline-upload"
          :action="API.POSE_IMPORT_EXCEL"
          :show-file-list="false"
          accept=".xlsx, .xls"
          name="file"
          :before-upload="
            () => {
              isLoading = true
            }
          "
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
        <el-button type="primary" plain size="small" color="#3370ff" @click="addFilter" :icon="Plus"
          >添加条件</el-button
        >
        <el-button
          type="info"
          plain
          size="small"
          @click="clearAllFilters"
          :icon="Refresh"
          v-if="
            activeFilters.length > 1 || activeFilters[0].field || activeFilters[0].value.length > 0
          "
          >清空条件</el-button
        >
      </div>
      <div class="filter-stats">
        共匹配 <strong>{{ filteredData.length }}</strong> 张图
      </div>
    </div>

    <div class="grid-container" v-loading="isLoading" element-loading-text="正在加载合并数据...">
      <div class="annotation-card" v-for="item in paginatedData" :key="item.pose_code">
        <div class="card-image-section" @click="openFocusMode(item)" title="点击进入全量标注模式">
          <div class="pose-code-badge">{{ item.pose_code }}</div>
          <el-image :src="item._imageUrl" fit="cover" class="thumbnail" loading="lazy">
            <template #placeholder
              ><div class="img-placeholder">
                <el-icon class="is-loading"><Loading /></el-icon></div
            ></template>
            <template #error
              ><div class="img-placeholder">
                <el-icon><Picture /></el-icon></div
            ></template>
          </el-image>
          <div class="hover-overlay">
            <el-icon :size="28"><EditPen /></el-icon><span>进入全量标注</span>
          </div>
        </div>

        <div class="card-form-section">
          <div class="file-info-row">
            <div class="file-name" :title="item._fileName">{{ item._fileName || '未知文件' }}</div>
            <div class="update-time" v-if="item.update_time" :title="`更新于: ${item.update_time}`">
              {{ item.update_time }}
            </div>
          </div>

          <div class="quick-tags-grid">
            <el-select
              v-model="item.scene_theme"
              class="bubble-select color-blue"
              placeholder="场景"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '场景')"
            >
              <el-option
                v-for="opt in getUniqueValues('scene_theme')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.gender"
              class="bubble-select color-orange"
              placeholder="性别"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '性别')"
            >
              <el-option
                v-for="opt in getUniqueValues('gender')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.age"
              class="bubble-select color-green"
              placeholder="年龄"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '年龄')"
            >
              <el-option
                v-for="opt in getUniqueValues('age')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.body_type_fit"
              class="bubble-select color-gray"
              placeholder="身材"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '身材')"
            >
              <el-option
                v-for="opt in getUniqueValues('body_type_fit')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>

            <el-select
              v-model="item.framing"
              class="bubble-select color-red"
              placeholder="景别"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '景别')"
            >
              <el-option
                v-for="opt in getUniqueValues('framing')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.camera_angle"
              class="bubble-select color-purple"
              placeholder="角度"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '角度')"
            >
              <el-option
                v-for="opt in getUniqueValues('camera_angle')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.special_lighting"
              class="bubble-select color-blue"
              placeholder="光线"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '光线')"
            >
              <el-option
                v-for="opt in getUniqueValues('special_lighting')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.difficulty_level"
              class="bubble-select color-orange"
              placeholder="难度"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '难度')"
            >
              <el-option
                v-for="opt in getUniqueValues('difficulty_level')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>

            <el-select
              v-model="item.element_1"
              class="bubble-select color-gray"
              placeholder="元素1"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '元素1')"
            >
              <el-option
                v-for="opt in getUniqueValues('element_1')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.element_2"
              class="bubble-select color-gray"
              placeholder="元素2"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '元素2')"
            >
              <el-option
                v-for="opt in getUniqueValues('element_2')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.element_3"
              class="bubble-select color-gray"
              placeholder="元素3"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '元素3')"
            >
              <el-option
                v-for="opt in getUniqueValues('element_3')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <div class="empty-spacer"></div>

            <el-select
              v-model="item.character_prop_1"
              class="bubble-select color-gray"
              placeholder="人陪1"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '人陪1')"
            >
              <el-option
                v-for="opt in getUniqueValues('character_prop_1')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.character_prop_2"
              class="bubble-select color-gray"
              placeholder="人陪2"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '人陪2')"
            >
              <el-option
                v-for="opt in getUniqueValues('character_prop_2')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.scene_prop_1"
              class="bubble-select color-gray"
              placeholder="景陪1"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '景陪1')"
            >
              <el-option
                v-for="opt in getUniqueValues('scene_prop_1')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-select
              v-model="item.scene_prop_2"
              class="bubble-select color-gray"
              placeholder="景陪2"
              allow-create
              filterable
              clearable
              @change="autoSave(item, '景陪2')"
            >
              <el-option
                v-for="opt in getUniqueValues('scene_prop_2')"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>

            <el-button class="more-btn full-width-btn" @click="openFocusMode(item)">
              <el-icon><EditPen /></el-icon> 展开全量打标
            </el-button>
          </div>
        </div>
      </div>
      <el-empty
        v-if="paginatedData.length === 0 && !isLoading"
        description="无符合条件的图片数据"
        style="grid-column: 1 / -1"
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
          <el-icon><EditPen /></el-icon> 全量标注模式
          <span class="focus-progress"
            >{{ focusCurrentIndex + 1 }} / {{ filteredData.length }}</span
          >
        </div>
        <div class="focus-controls">
          <el-tag
            type="warning"
            effect="dark"
            round
            v-if="isInherited"
            style="border: none; margin-right: 12px"
            >已继承上一张姿态标签</el-tag
          >
          <el-button @click="focusModeVisible = false" round plain class="esc-btn"
            >退出 (Esc)</el-button
          >
        </div>
      </div>

      <div class="focus-layout" v-if="focusItem">
        <div class="focus-left">
          <el-image
            :src="focusItem._imageUrl"
            fit="contain"
            class="focus-main-img"
            :preview-src-list="[focusItem._imageUrl]"
          />
        </div>

        <div class="focus-right">
          <div class="feishu-panel custom-scrollbar">
            <div class="feishu-title-bar">
              <h1 class="feishu-title">{{ focusItem.pose_code }}</h1>
            </div>

            <div class="feishu-body">
              <div class="section-divider">
                <span class="section-mark"></span>
                <span class="section-title">姿态标签配置</span>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><User /></el-icon> 基础属性
                </div>
                <div class="feishu-value">
                  <div class="dense-grid">
                    <div class="dense-item item-blue">
                      <span class="lbl">场景</span
                      ><el-select
                        v-model="focusItem.scene_theme"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('scene_theme')"
                      />
                    </div>
                    <div class="dense-item item-orange">
                      <span class="lbl">性别</span
                      ><el-select
                        v-model="focusItem.gender"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('gender')"
                      />
                    </div>
                    <div class="dense-item item-green">
                      <span class="lbl">年龄</span
                      ><el-select
                        v-model="focusItem.age"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('age')"
                      />
                    </div>
                    <div class="dense-item item-default">
                      <span class="lbl">身材</span
                      ><el-select
                        v-model="focusItem.body_type_fit"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('body_type_fit')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><Camera /></el-icon> 摄影参数
                </div>
                <div class="feishu-value">
                  <div class="dense-grid">
                    <div class="dense-item item-red">
                      <span class="lbl">景别</span
                      ><el-select
                        v-model="focusItem.framing"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('framing')"
                      />
                    </div>
                    <div class="dense-item item-purple">
                      <span class="lbl">角度</span
                      ><el-select
                        v-model="focusItem.camera_angle"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('camera_angle')"
                      />
                    </div>
                    <div class="dense-item item-default">
                      <span class="lbl">光线</span
                      ><el-select
                        v-model="focusItem.special_lighting"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('special_lighting')"
                      />
                    </div>
                    <div class="dense-item item-default">
                      <span class="lbl">难度</span
                      ><el-select
                        v-model="focusItem.difficulty_level"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('difficulty_level')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><CollectionTag /></el-icon> 元素特征
                </div>
                <div class="feishu-value">
                  <div class="dense-grid">
                    <div class="dense-item item-gray">
                      <span class="lbl">元素1</span
                      ><el-select
                        v-model="focusItem.element_1"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('element_1')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">元素2</span
                      ><el-select
                        v-model="focusItem.element_2"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('element_2')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">元素3</span
                      ><el-select
                        v-model="focusItem.element_3"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('element_3')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><Connection /></el-icon> 陪体
                </div>
                <div class="feishu-value">
                  <div class="dense-grid">
                    <div class="dense-item item-gray">
                      <span class="lbl">人陪1</span
                      ><el-select
                        v-model="focusItem.character_prop_1"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('character_prop_1')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">人陪2</span
                      ><el-select
                        v-model="focusItem.character_prop_2"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('character_prop_2')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">景陪1</span
                      ><el-select
                        v-model="focusItem.scene_prop_1"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('scene_prop_1')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">景陪2</span
                      ><el-select
                        v-model="focusItem.scene_prop_2"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('scene_prop_2')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row style-cloud-row">
                <div class="feishu-label">
                  <el-icon><MagicStick /></el-icon> 人景风格
                </div>
                <div class="feishu-value">
                  <div class="style-tags-container">
                    <div
                      v-for="s in styleGroup1"
                      :key="s.key"
                      class="style-pill"
                      :class="{ 'is-active': focusItem[s.key] === '1' }"
                      @click="toggleStyle(s.key)"
                    >
                      {{ s.label }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="feishu-row style-cloud-row">
                <div class="feishu-label">
                  <el-icon><PictureRounded /></el-icon> 记录风格
                </div>
                <div class="feishu-value">
                  <div class="style-tags-container">
                    <div
                      v-for="s in styleGroup2"
                      :key="s.key"
                      class="style-pill"
                      :class="{ 'is-active': focusItem[s.key] === '1' }"
                      @click="toggleStyle(s.key)"
                    >
                      {{ s.label }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><Location /></el-icon> 地标
                </div>
                <div class="feishu-value">
                  <div class="dense-grid" style="grid-template-columns: 1fr">
                    <div class="dense-item item-purple" style="width: 25%">
                      <el-select
                        v-model="focusItem.style_landmark"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="选择或输入地标"
                        :options="getOptions('style_landmark')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><Setting /></el-icon> 其它属性
                </div>
                <div class="feishu-value">
                  <div class="dense-grid">
                    <div class="dense-item item-gray">
                      <span class="lbl">优先级</span
                      ><el-select
                        v-model="focusItem.priority"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('priority')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">责1</span
                      ><el-select
                        v-model="focusItem.owner_1"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('owner_1')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">责2</span
                      ><el-select
                        v-model="focusItem.owner_2"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('owner_2')"
                      />
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">责3</span
                      ><el-select
                        v-model="focusItem.owner_3"
                        class="seamless-select"
                        allow-create
                        filterable
                        clearable
                        placeholder="无"
                        :options="getOptions('owner_3')"
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
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><ChatLineSquare /></el-icon> 姿态备注
                </div>
                <div class="feishu-value">
                  <el-input
                    v-model="focusItem.pose_remarks"
                    type="textarea"
                    :autosize="{ minRows: 1, maxRows: 3 }"
                    placeholder="姿态标签专属备注..."
                    class="seamless-input"
                  />
                </div>
              </div>

              <el-divider border-style="dashed" class="module-divider" />

              <div class="section-divider">
                <span class="section-mark prompt-mark"></span>
                <span class="section-title">引导词配置</span>
              </div>

              <div class="feishu-row vertical-row">
                <div class="feishu-label">
                  <el-icon><DocumentCopy /></el-icon> 引导词参考
                </div>
                <div class="feishu-value">
                  <el-input
                    v-model="focusItem.generated_prompt"
                    type="textarea"
                    :autosize="{ minRows: 1, maxRows: 3 }"
                    class="seamless-input readonly-input"
                    placeholder="系统生成的原始引导词..."
                    readonly
                  />
                </div>
              </div>

              <div
                class="feishu-row vertical-row highlight-row"
                :class="{ 'has-error': promptError }"
              >
                <div class="feishu-label primary-label">
                  <el-icon><Edit /></el-icon> 修改引导词
                </div>
                <div class="feishu-value col-layout">
                  <el-input
                    v-model="focusItem.modified_prompt"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
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

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><User /></el-icon> 检查状态
                </div>
                <div class="feishu-value">
                  <div class="dense-grid">
                    <div class="dense-item item-blue">
                      <span class="lbl">修改</span
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
                      <span class="lbl">Check</span
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
                    <div class="dense-item item-gray">
                      <span class="lbl">字数</span>
                      <span class="readonly-text" :class="{ 'text-error': promptError }">
                        {{ focusItem.modified_prompt ? focusItem.modified_prompt.length : 0 }} / 30
                      </span>
                    </div>
                    <div class="dense-item item-gray">
                      <span class="lbl">双检(DC)</span>
                      <el-switch
                        v-model="focusItem.is_double_check"
                        active-value="1"
                        inactive-value="0"
                        size="small"
                        style="--el-switch-on-color: #3370ff"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="feishu-row">
                <div class="feishu-label">
                  <el-icon><ChatLineSquare /></el-icon> 引导词备注
                </div>
                <div class="feishu-value">
                  <el-input
                    v-model="focusItem.remarks"
                    type="textarea"
                    :autosize="{ minRows: 1, maxRows: 2 }"
                    placeholder="引导词专属备注..."
                    class="seamless-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="focus-footer">
            <el-button
              size="large"
              @click="prevFocusItem"
              :disabled="focusCurrentIndex <= 0"
              class="nav-btn"
            >
              <el-icon><ArrowLeft /></el-icon> 上一张
            </el-button>
            <el-button
              type="primary"
              size="large"
              class="save-next-btn"
              color="#3370ff"
              @click="saveAndNext"
              :disabled="!!promptError"
            >
              保存并下一张 (Enter) <el-icon><ArrowRight /></el-icon>
            </el-button>
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
  CollectionTag,
  MagicStick,
  PictureRounded,
  Location,
  User,
  Camera,
  Connection,
  Setting,
  Edit,
  Warning,
  ChatLineSquare,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'

import { BASE_ROOT, API } from '@/config'
import { MERGED_FIELD_SCHEMA, STYLE_GROUP_1_KEYS, STYLE_GROUP_2_KEYS } from '@/config/schema'
import { extractPoseCode, buildImageUrl, debounce, downloadBlob } from '@/utils'
import { RecordIndex } from '@/utils/recordIndex'
import { useGlobalStore } from '@/stores/global'
import { useFilters } from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'
import { useOptionsCache } from '@/composables/useOptionsCache'

// ==================== Store ====================
const store = useGlobalStore()
const { workDirPath, realRemoteDirList, isScanning } = storeToRefs(store)
const { scanDirectory, enterDirectory: storeEnterDir, goUpDirectory: storeGoUpDir } = store

// ==================== Local state ====================
const isLoading = ref(false)
const allRecords = ref<any[]>([])

// 🚀 性能优化：使用 Map 索引快速查找记录
const recordsIndex = new RecordIndex()

// ==================== Style groups ====================
const styleGroup1 = computed(() =>
  MERGED_FIELD_SCHEMA.filter((f) => STYLE_GROUP_1_KEYS.includes(f.key)),
)
const styleGroup2 = computed(() =>
  MERGED_FIELD_SCHEMA.filter((f) => STYLE_GROUP_2_KEYS.includes(f.key)),
)

// ==================== Filters (composable) ====================
const displayRecords = computed(() => allRecords.value.filter((r) => r._imageUrl))
const {
  activeFilters,
  addFilter,
  removeFilter,
  clearAllFilters,
  getUniqueValues: baseGetUniqueValues,
  filteredData,
} = useFilters(displayRecords)

// 🚀 性能优化：使用 optionsDict 缓存所有选项，避免模板中重复计算

const { optionsDict, getOptions } = useOptionsCache(displayRecords, MERGED_FIELD_SCHEMA)
const getUniqueValues = (field: string) => baseGetUniqueValues(field)

// ==================== Pagination (composable) ====================
const { currentPage, pageSize, paginatedData } = usePagination(filteredData, 5)

// ==================== Lifecycle ====================
onMounted(() => {
  fetchMergedData()
  window.addEventListener('keydown', handleGlobalKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))

// ==================== Data fetching ====================
const fetchMergedData = async () => {
  isLoading.value = true
  try {
    const poseRes = await fetch(API.POSE_LIST).then((r) => r.json())
    const promptRes = await fetch(API.PROMPT_LIST)
      .then((r) => r.json())
      .catch((e) => {
        console.error('获取引导词数据失败:', e)
        // 即使失败也返回空数组，避免阻断整个流程
        return { code: 200, data: [] }
      })

    const promptMap = new Map()
    if (promptRes.code === 200) {
      promptRes.data.forEach((p: any) => promptMap.set(String(p.pose_code).padStart(6, '0'), p))
    }

    if (poseRes.code === 200) {
      allRecords.value = poseRes.data.map((r: any) => {
        const pCode = String(r.pose_code).padStart(6, '0')
        const promptData = promptMap.get(pCode) || {}

        const merged = { ...r, ...promptData, _fileName: '', _imageUrl: '', pose_code: pCode }
        for (const key in merged) {
          if (merged[key] === null) merged[key] = ''
        }

        merged.update_time = promptData.update_time || r.update_time || ''
        merged.is_double_check =
          merged.is_double_check === true || merged.is_double_check === '1' ? '1' : '0'
        merged.is_fixed_data =
          merged.is_fixed_data === true || merged.is_fixed_data === '1' ? '1' : '0'
        return merged
      })
      // Auto-load images if workDirPath was set from another page
      if (workDirPath.value && workDirPath.value !== BASE_ROOT) {
        loadRemoteImages()
      }
    }
  } catch (e) {
    ElMessage.error('获取数据失败')
  } finally {
    isLoading.value = false
  }
}

// ==================== Remote images ====================
const loadRemoteImages = async () => {
  if (!workDirPath.value.trim()) return
  isLoading.value = true
  try {
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
      ElMessage.success(`图片挂载完成，成功匹配 ${matchCount} 张图片`)
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    isLoading.value = false
  }
}

// ==================== Directory navigation (store wrappers) ====================
const handleEnterDir = (fullPath: string) => storeEnterDir(fullPath, loadRemoteImages)
const handleGoUpDir = () => storeGoUpDir(loadRemoteImages)

// ==================== Auto-save (debounced) ====================
const _autoSave = async (item: any, fieldLabel: string = '', showToast: boolean = true) => {
  try {
    const posePayload = { ...item }
    delete posePayload._fileName
    delete posePayload._imageUrl
    delete posePayload.generated_prompt
    delete posePayload.modified_prompt
    delete posePayload.modifier
    delete posePayload.check_owner
    delete posePayload.word_count_check
    delete posePayload.remarks

    const promptPayload = {
      pose_code: item.pose_code,
      generated_prompt: item.generated_prompt,
      modified_prompt: item.modified_prompt,
      modifier: item.modifier,
      word_count_check: String(item.modified_prompt?.length || 0),
      check_owner: item.check_owner,
      is_double_check: item.is_double_check === '1',
      is_fixed_data: item.is_fixed_data === '1',
      remarks: item.remarks,
    }

    const reqs = [
      fetch(API.POSE_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posePayload),
      }),
      fetch(API.PROMPT_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptPayload),
      }),
    ]

    const res = await Promise.all(reqs)
    if (showToast) {
      if (res.every((r) => r.ok))
        ElMessage({
          message: fieldLabel
            ? `[${item.pose_code}] ${fieldLabel}已保存`
            : `[${item.pose_code}] 已保存`,
          type: 'success',
          duration: 1500,
          grouping: true,
        })
      else ElMessage.error(`❌ [${item.pose_code}] 部分接口保存失败`)
    }
  } catch (e) {
    if (showToast) ElMessage.error('保存失败')
  }
}
const autoSave = debounce(_autoSave, 300)

// ==================== Focus mode ====================
const focusModeVisible = ref(false)
const focusItem = ref<any>(null)
const focusCurrentIndex = ref(0)
const isInherited = ref(false)

const promptError = computed(() => {
  if (!focusItem.value?.modified_prompt) return ''
  if (/[\p{P}\p{S}]$/u.test(focusItem.value.modified_prompt.trim())) {
    return '结尾不能是标点符号或特殊符号！'
  }
  return ''
})

watch(
  () => focusItem.value?.modified_prompt,
  (newVal) => {
    if (!focusItem.value) return
    if (promptError.value) focusItem.value.word_count_check = '结尾含符号'
    else if ((newVal || '').trim().length > 0) focusItem.value.word_count_check = '合格'
    else focusItem.value.word_count_check = '未填写'
  },
)
watch(
  () => [focusItem.value?.modifier, focusItem.value?.check_owner],
  ([modifier, checkOwner]) => {
    if (!focusItem.value) return
    if (modifier && checkOwner) focusItem.value.is_double_check = '1'
    else focusItem.value.is_double_check = '0'
  },
)

const openFocusMode = (item: any) => {
  focusCurrentIndex.value = filteredData.value.findIndex((r) => r.pose_code === item.pose_code)
  focusItem.value = { ...item }
  isInherited.value = false
  focusModeVisible.value = true
}

const prevFocusItem = () => {
  if (focusCurrentIndex.value > 0) {
    focusCurrentIndex.value--
    focusItem.value = { ...filteredData.value[focusCurrentIndex.value] }
    isInherited.value = false
  }
}
const toggleStyle = (key: string) => {
  if (focusItem.value) focusItem.value[key] = focusItem.value[key] === '1' ? '0' : '1'
}

const saveAndNext = async () => {
  if (!focusItem.value || promptError.value) return
  const originalItem = filteredData.value[focusCurrentIndex.value]
  Object.assign(originalItem, focusItem.value)
  await _autoSave(originalItem, '', false)
  ElMessage.success({ message: `保存成功`, duration: 1000, grouping: true })

  if (focusCurrentIndex.value < filteredData.value.length - 1) {
    const nextIndex = focusCurrentIndex.value + 1
    const nextData = { ...filteredData.value[nextIndex] }

    const isNextPoseEmpty = !nextData.scene_theme && !nextData.gender && !nextData.framing
    isInherited.value = false
    if (isNextPoseEmpty) {
      ;['scene_theme', 'gender', 'age', 'framing', 'camera_angle'].forEach((k) => {
        if (focusItem.value[k]) nextData[k] = focusItem.value[k]
      })
      isInherited.value = true
    }

    focusCurrentIndex.value = nextIndex
    focusItem.value = nextData
    const targetPage = Math.ceil((nextIndex + 1) / pageSize.value)
    if (currentPage.value !== targetPage) currentPage.value = targetPage
  } else {
    ElMessage.info('已经是最后一张了')
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

// ==================== Import / Export ====================
const handleImportSuccess = (res: any) => {
  isLoading.value = false
  if (res.code === 200) {
    ElMessage.success(res.msg)
    fetchMergedData()
  } else ElMessage.error('导入失败')
}
const handleImportExcelSuccess = (res: any) => {
  isLoading.value = false
  if (res.code === 200) {
    ElMessage.success(res.msg)
    fetchMergedData()
  } else ElMessage.error('导入失败')
}
const handleImportError = () => {
  isLoading.value = false
  ElMessage.error('异常')
}

const exportFile = async (type: 'json' | 'excel') => {
  if (filteredData.value.length === 0) return ElMessage.warning('没有可导出的数据')
  const loading = ElMessage.success({ message: `正在生成...`, duration: 0 })
  try {
    const url = type === 'json' ? API.POSE_EXPORT_JSON : API.POSE_EXPORT_EXCEL
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pose_codes: filteredData.value.map((i) => i.pose_code) }),
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    downloadBlob(blob, `export_${Date.now()}.${type === 'excel' ? 'xlsx' : 'json'}`)
  } catch (err) {
    ElMessage.error(`导出失败`)
  } finally {
    loading.close()
  }
}
const exportJSON = () => exportFile('json')
const exportExcel = () => exportFile('excel')
</script>

<style scoped>
/* =========== 整体与顶栏 (保持原样) =========== */
.labeling-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  gap: 16px;
  min-width: 1100px;
}
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
.path-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  max-width: 800px;
}
.fluid-input {
  width: 100%;
}
.dir-navigator {
  display: flex;
  align-items: center;
  gap: 10px;
}
.go-up-btn {
  border-radius: 6px;
  border: 1px dashed #dee0e3;
  color: #646a73;
}
.go-up-btn:hover {
  border-color: #3370ff;
  color: #3370ff;
  background-color: #f4f8ff;
}
.sub-dirs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 60px;
  overflow-y: auto;
}
.dir-tag {
  cursor: pointer;
  transition: background 0.2s;
}
.dir-tag:hover {
  background-color: #e1eaff;
  color: #3370ff;
}

.export-import-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.inline-upload {
  display: inline-flex;
  align-items: center;
}

/* =========== 筛选栏 (保持原样) =========== */
.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  background: var(--el-bg-color);
  padding: 12px 24px;
  border-radius: 12px;
  flex-shrink: 0;
}
.filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  flex: 1;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f4f5f7;
  padding: 4px;
  border-radius: 8px;
}
.filter-field {
  width: 140px;
}
.filter-value {
  width: 260px;
}
.filter-stats {
  font-size: 13px;
  color: #646a73;
  white-space: nowrap;
  flex-shrink: 0;
}

/* =========== 数据网格 (锁定单行 5 个) =========== */
.grid-container {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
  align-content: start;
  padding: 4px 8px 16px 4px;
}

.annotation-card {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  gap: 12px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
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
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background-color: #f4f5f7;
}
.thumbnail {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  transition: filter 0.3s;
}
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
.card-image-section:hover .hover-overlay {
  opacity: 1;
}
.card-image-section:hover .thumbnail {
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
  color: #111827;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.img-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #c0c4cc;
}

.card-form-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.file-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 4px;
  gap: 8px;
}
.file-name {
  font-size: 12px;
  color: #646a73;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}
.update-time {
  font-size: 11px;
  color: #a8abb2;
  flex-shrink: 0;
  background-color: #f4f5f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
}

.quick-tags-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.bubble-select :deep(.el-select__wrapper) {
  box-shadow: none !important;
  min-height: 26px;
  height: 26px;
  border-radius: 6px;
  padding: 0 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bubble-select :deep(.el-select__suffix) {
  display: none;
}
.bubble-select :deep(.el-select__selection-item),
.bubble-select :deep(.el-select__placeholder span) {
  font-size: 12px !important;
  font-weight: bold !important;
  text-align: center;
  width: 100%;
}

.color-blue :deep(.el-select__wrapper) {
  background-color: rgba(51, 112, 255, 0.1) !important;
  color: #3370ff;
}
.color-green :deep(.el-select__wrapper) {
  background-color: #e8f3ec !important;
  color: #12aa50;
}
.color-orange :deep(.el-select__wrapper) {
  background-color: #fff1e9 !important;
  color: #ff6a00;
}
.color-red :deep(.el-select__wrapper) {
  background-color: #fff0f0 !important;
  color: #f53f3f;
}
.color-purple :deep(.el-select__wrapper) {
  background-color: #f4eafe !important;
  color: #722ed1;
}
.color-gray :deep(.el-select__wrapper) {
  background-color: #f4f5f7 !important;
  color: #646a73;
  border: 1px solid #dee0e3;
}

.full-width-btn {
  grid-column: span 4;
}
.more-btn {
  width: 100%;
  height: 32px;
  border-radius: 6px;
  background-color: #f4f5f7;
  border: 1px dashed #dee0e3;
  color: #646a73;
  font-weight: bold;
  margin-top: 6px;
  transition: all 0.2s;
}
.more-btn:hover {
  background-color: rgba(51, 112, 255, 0.05);
  color: #3370ff;
  border-color: rgba(51, 112, 255, 0.3);
}

.pagination-container {
  background: var(--el-bg-color);
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* =========== 5. 全量标注模式 - 极致压缩与吸底排版 =========== */
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
  height: 50px;
  background-color: #1a1a1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  color: #fff;
  z-index: 10;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}
.focus-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e5e6eb;
}
.focus-progress {
  background-color: #333;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #a8abb2;
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

/* 主体容器使用 Flex 撑满高度 */
.focus-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: calc(100vh - 50px);
}

.focus-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: #141414;
}
.focus-main-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* 右侧面板拆分为 [滚动内容区] 和 [固定底部区] */
.focus-right {
  width: 800px;
  flex-shrink: 0;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  border-top-left-radius: 16px;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* 核心区1：滚动内容面板 - 调小内间距 */
.feishu-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 24px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 自定义美化滚动条，防止原生滚动条粗糙占位 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.feishu-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.feishu-title {
  font-size: 22px;
  font-weight: bold;
  margin: 0;
  color: #1f2329;
  font-family: 'Fira Code', monospace;
}

/* 极限压缩区块标题的上下间距 */
.section-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  margin-top: 8px;
}
.section-mark {
  width: 4px;
  height: 14px;
  background-color: #3370ff;
  border-radius: 2px;
}
.prompt-mark {
  background-color: #3370ff;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

/* 极限压缩表单行，压榨每一寸空间 */
.feishu-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.feishu-row {
  display: flex;
  align-items: flex-start;
  min-height: 36px;
  padding: 4px 8px;
  margin-left: -8px;
  border-radius: 6px;
  transition: background-color 0.2s;
}
.feishu-row:hover {
  background-color: #f9fafb;
}

.feishu-label {
  width: 100px;
  color: #646a73;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 28px;
  font-weight: 500;
  flex-shrink: 0;
}
.feishu-value {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 28px;
  width: 100%;
}

.dense-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
  align-items: center;
}
.dense-item {
  display: flex;
  align-items: center;
  border-radius: 6px;
  padding: 2px 8px;
  background: #fff;
  border: 1px solid #dee0e3;
}
.dense-item .lbl {
  font-size: 12px;
  margin-right: 6px;
  color: #646a73;
  white-space: nowrap;
  user-select: none;
}

.item-blue {
  border-left: 3px solid #3370ff;
}
.item-orange {
  border-left: 3px solid #ff6a00;
}
.item-green {
  border-left: 3px solid #12aa50;
}
.item-red {
  border-left: 3px solid #f53f3f;
}
.item-purple {
  border-left: 3px solid #722ed1;
}
.item-gray {
  border-left: 3px solid #8f959e;
}
.item-default {
  background: transparent;
  padding: 2px 8px;
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
  background-color: #fff !important;
  padding: 6px 10px;
  border-radius: 6px;
  color: #1f2329;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  border: 1px solid #dee0e3;
  transition: all 0.2s;
}
.seamless-input :deep(.el-textarea__inner):focus {
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1) !important;
}

.style-cloud-row {
  align-items: stretch;
}
.style-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0;
}
.style-pill {
  padding: 2px 10px;
  background: #f4f5f7;
  color: #646a73;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.style-pill:hover {
  background: #e4e7ed;
}
.style-pill.is-active {
  background: #3370ff;
  color: #fff;
  font-weight: bold;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.3);
}

.col-layout {
  flex-direction: column;
  align-items: flex-start !important;
  gap: 4px;
  width: 100%;
}
.error-hint {
  color: #f53f3f;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
  background: #fff0f0;
  padding: 6px 10px;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 2px;
}

.vertical-row {
  flex-direction: column;
  align-items: stretch;
  margin-top: 2px;
}
.vertical-row .feishu-label {
  width: 100%;
  line-height: normal;
  margin-bottom: 4px;
}
.vertical-row .feishu-value {
  width: 100%;
}

.highlight-row {
  background-color: #f4f8ff;
  border: 1px solid rgba(51, 112, 255, 0.2);
  margin-bottom: 8px;
  padding: 12px;
  margin-left: 0;
  border-radius: 8px;
  transition: all 0.3s;
}
.highlight-row.has-error {
  background-color: #fffafa;
  border-color: #f53f3f;
}
.primary-label {
  color: #3370ff !important;
  font-size: 13px !important;
  font-weight: bold !important;
}

.readonly-input :deep(.el-textarea__inner) {
  background-color: #f4f5f7 !important;
  color: #8f959e !important;
  cursor: default;
  border-color: transparent;
}
.main-input :deep(.el-input__count) {
  background: transparent;
  bottom: 4px;
  right: 8px;
  font-weight: bold;
  font-size: 11px;
  color: #8f959e;
}
.readonly-text {
  font-size: 12px;
  font-weight: 600;
  color: #1f2329;
  padding: 0 4px;
}
.text-error {
  color: #f53f3f;
}

.module-divider {
  margin: 8px 0;
  border-color: #dee0e3;
}

/* 核心区2：吸底操作栏 (Sticky Footer) */
.focus-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 16px 24px;
  background-color: #fff;
  border-top: 1px solid #dee0e3;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
  z-index: 10;
}
.save-next-btn {
  width: 260px;
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
.nav-btn {
  border-radius: 8px;
  border: 1px solid #dee0e3;
  width: 140px;
}

/* Dark mode */
html.dark .top-toolbar,
html.dark .filter-toolbar,
html.dark .pagination-container {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
html.dark .annotation-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
html.dark .annotation-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  border-color: rgba(51, 112, 255, 0.3);
}
html.dark .card-image-section {
  background-color: #2a2a2a;
}
html.dark .pose-code-badge {
  background-color: rgba(0, 0, 0, 0.7);
  color: #e5e6eb;
}
html.dark .filter-item {
  background-color: var(--el-fill-color);
}
html.dark .focus-right {
  background-color: var(--el-bg-color);
}
html.dark .feishu-body {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}
html.dark .dense-item {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}
html.dark .attribute-block,
html.dark .style-tags-container {
  background: var(--el-fill-color);
}
html.dark .style-pill {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  border-color: var(--el-border-color);
}
html.dark .style-pill.is-active {
  background: rgba(51, 112, 255, 0.15);
  color: #5a9aff;
  border-color: #5a9aff;
}
html.dark .focus-footer {
  background: var(--el-bg-color);
  border-top-color: var(--el-border-color);
}
</style>
