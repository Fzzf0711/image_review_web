<template>
  <div class="app-wrapper">
    <header class="top-header">
      <div class="header-left">
        <div class="brand-logo" @click="goToHome" title="返回主页">
          <div class="logo-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 8V4h4"></path>
              <path d="M16 4h4v4"></path>
              <path d="M4 16v4h4"></path>
              <path d="M16 20h4v-4"></path>
              <circle cx="12" cy="8" r="1.5"></circle>
              <line x1="12" y1="9.5" x2="12" y2="14"></line>
              <line x1="12" y1="11" x2="9" y2="13"></line>
              <line x1="12" y1="11" x2="15" y2="10"></line>
              <line x1="12" y1="14" x2="10" y2="18"></line>
              <line x1="12" y1="14" x2="14" y2="18"></line>
            </svg>
          </div>
          <span class="logo-text">姿态数据管理平台</span>
        </div>

        <el-menu
          :default-active="$route.path"
          class="top-menu"
          mode="horizontal"
          router
          :ellipsis="false"
        >
          <el-menu-item index="/screening">
            <el-icon><Filter /></el-icon> 数据审核筛选
          </el-menu-item>
          <el-menu-item index="/labeling">
            <el-icon><Edit /></el-icon> 姿态标签配置
          </el-menu-item>
          <el-menu-item index="/prompt">
            <el-icon><DocumentChecked /></el-icon> 引导词审核
          </el-menu-item>
          <el-menu-item index="/dashboard">
            <el-icon><DataLine /></el-icon> 标签数据看板
          </el-menu-item>
          <el-menu-item index="/prompt-dashboard">
            <el-icon><DataLine /></el-icon> 引导词数据看板
          </el-menu-item>
        </el-menu>
      </div>

      <div class="header-right">
        <el-switch
          v-model="isDark"
          inline-prompt
          :active-icon="Moon"
          :inactive-icon="Sunny"
          class="theme-switch"
          style="--el-switch-on-color: #2c2c2c; --el-switch-off-color: #e5e7eb"
          @change="toggleTheme"
        />

        <div class="user-profile">
          <el-avatar
            size="small"
            src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
          />
          <span class="username">Admin</span>
        </div>
      </div>
    </header>

    <main class="main-container">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Filter, Edit, DocumentChecked, DataLine, Moon, Sunny } from '@element-plus/icons-vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()

const goToHome = () => {
  router.push('/screening')
}

const isDark = ref(false)

onMounted(() => {
  const savedTheme = localStorage.getItem('app-theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else if (savedTheme === 'light') {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDark.value = true
      document.documentElement.classList.add('dark')
    }
  }
})

const toggleTheme = (val: boolean) => {
  if (val) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('app-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('app-theme', 'light')
  }
}
</script>

<style>
/* ================= 🌟 全局主色调覆盖 ================= */
:root {
  /* 强行覆盖 Element Plus 的原生主色调，让所有组件的蓝色统一 */
  --el-color-primary: #3370ff;
}
html.dark {
  /* 暗色模式下也保持一样的蓝色 */
  --el-color-primary: #3370ff;
}

/* ================= 全局基础设置 ================= */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.app-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

/* ================= 顶部导航栏 ================= */
.top-header {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  z-index: 100;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  height: 100%;
}

/* Logo 样式 */
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 40px;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;
}
.brand-logo:hover {
  opacity: 0.8;
}
.logo-icon {
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #3370ff; /* 🌟 统一蓝色 */
}
.logo-icon svg {
  width: 100%;
  height: 100%;
}
.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: 0.5px;
}

/* 顶部菜单定制化覆盖 */
.top-menu {
  height: 60px;
  border-bottom: none !important;
  background-color: transparent;
}
.top-menu .el-menu-item {
  font-size: 14px;
  font-weight: 500;
  padding: 0 16px !important;
  color: var(--el-text-color-regular) !important;
  transition: all 0.2s;
}
.top-menu .el-menu-item:hover {
  background-color: transparent !important;
  color: #3370ff !important; /* 🌟 统一蓝色 */
}
.top-menu .el-menu-item.is-active {
  background-color: transparent !important;
  color: #3370ff !important; /* 🌟 统一蓝色 */
  border-bottom: 2px solid #3370ff !important; /* 🌟 统一蓝色 */
}

/* 右侧操作区 */
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.theme-switch {
  transform: scale(1.1);
}
.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: background-color 0.2s;
}
.user-profile:hover {
  background-color: var(--el-fill-color-light);
}
.username {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* ================= 核心渲染区 ================= */
.main-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 16px 20px 0;
}

/* Dark mode */
html.dark .top-header {
  border-bottom-color: #333;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
}
html.dark .logo-icon {
  color: #5a9aff;
}
html.dark .top-menu .el-menu-item:hover,
html.dark .top-menu .el-menu-item.is-active {
  color: #5a9aff !important;
}
html.dark .top-menu .el-menu-item.is-active {
  border-bottom-color: #5a9aff !important;
}
</style>
