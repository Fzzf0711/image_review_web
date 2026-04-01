<template>
  <div class="data-action-bar">
    <!-- 左侧：版本选择和目录导航 -->
    <div class="left-section">
      <slot name="directory-input"></slot>
    </div>

    <!-- 右侧：导入导出和版本选择 -->
    <div class="right-section">
      <slot name="version-select"></slot>
      <slot name="import-export"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯布局组件，无逻辑
</script>

<style scoped>
.data-action-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  background: var(--el-bg-color);
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.left-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.right-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

/* 暗黑模式适配 */
暗.dark .data-action-bar {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
</style>
>
