<template>
  <el-dialog
    v-model="visible"
    fullscreen
    :show-close="false"
    destroy-on-close
    class="focus-mode-dialog"
  >
    <div class="focus-header">
      <div class="focus-title">
        <slot name="icon">
          <el-icon><EditPen /></el-icon>
        </slot>
        <slot name="title">
          <span>{{ title }}</span>
        </slot>
        <el-tag type="info" effect="dark" size="small" class="focus-progress"
          >{{ currentIndex + 1 }} / {{ totalCount }}</el-tag
        >
        <slot name="header-extra"></slot>
      </div>
      <el-button @click="handleExit" round plain class="esc-btn"
        >退出 (Esc)</el-button
      >
    </div>

    <div class="focus-layout">
      <div class="focus-left">
        <slot name="image-view"></slot>
      </div>

      <div class="focus-right">
        <slot name="editor-view"></slot>
      </div>
    </div>

    <slot name="footer"></slot>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { EditPen } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

interface Props {
  modelValue: boolean
  title: string
  currentIndex: number
  totalCount: number
  item?: any
}

const props = withDefaults(defineProps<Props>(), {
  title: '编辑模式',
  currentIndex: 0,
  totalCount: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'exit': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// 保存原始数据用于检测修改
const itemOriginal = computed(() => props.item ? { ...props.item } : null)

// 检测是否有未保存的修改
const isModified = computed(() => {
  if (!props.item || !itemOriginal.value) return false
  return JSON.stringify(props.item) !== JSON.stringify(itemOriginal.value)
})

/**
 * 处理退出，检测未保存的修改
 */
const handleExit = async () => {
  if (!isModified.value) {
    visible.value = false
    emit('exit')
    return
  }

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
    visible.value = false
    emit('exit')
  } catch {
    // 用户点击取消，不退出
  }
}
</script>

<style scoped>
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

.focus-right {
  width: 480px;
  flex-shrink: 0;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

/* 暗黑模式适配 */
暗.dark .focus-right {
  background-color: var(--el-bg-color);
}
</style>
