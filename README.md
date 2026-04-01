# 姿态数据管理平台 (Pose Data Management Platform)

基于 Vue 3 + TypeScript + Element Plus 的 B 端数据管理系统，用于姿态推荐数据库的标注、审核、分析全流程管理。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5 | 前端框架（Composition API + `<script setup>`） |
| TypeScript | ^6.0 | 类型安全 |
| Vite | ^8.0 | 构建工具 |
| Element Plus | ^2.13 | UI 组件库 |
| Pinia | ^3.0 | 全局状态管理 |
| Axios | ^1.6 | HTTP 请求封装 |
| ECharts | ^6.0 | 数据可视化（按需引入） |
| Vue Router | ^5.0 | 路由管理（懒加载） |

## 功能模块

### 1. 数据审核筛选 (`/screening`)
- 远程目录浏览与图片加载
- 高清图片画廊预览（支持键盘左右导航）
- 批量通过/废弃操作（文件移动）
- 全选/筛选/搜索

### 2. 姿态标签配置 (`/labeling`)
- 卡片式网格布局（5列自适应）
- 快速标签选择器（场景、性别、景别、角度等）
- 全屏沉浸标注模式（左图右表单）
- 风格标签云切换（点击激活/关闭）
- 标签继承：切换下一张时自动继承上一张的基础标签
- 姿态+引导词双接口并行保存
- 防抖保存（300ms debounce）
- **未保存修改确认**：退出前检测并提示

### 3. 引导词审核 (`/prompt`)
- 卡片式预览（响应式网格）
- 全屏编辑弹窗
- 引导词字数限制（30字）+ 结尾标点校验
- 修改人/Check人联动自动设置双检状态
- 快捷键保存（Ctrl/Shift + Enter）
- **未保存保存确认**：退出前检测并提示

### 4. 标签数据看板 (`/dashboard`)
- 数据表格（自定义显示列、分页、行内编辑抽屉）
- ECharts 图表分析（饼图/柱形图/折线图）
- 多维度交叉分析
- JSON/Excel 双格式导入导出

### 5. 引导词数据看板 (`/prompt-dashboard`)
- 4 维指标卡（总量/已配置/已双检/字数预警）
- 数据明细表格（自定义列、行内操作）
- 人员效能排行榜（修改人进度/Check人进度）
- 质量大盘（配置率/双检率/合格率环形图）
- 字数预警一键筛查

## 项目结构

```
src/
├── config/
│   ├── index.ts              # 全局常量、API 端点、图表色板
│   └── schema.ts             # 字段 Schema、风格分组、可见列配置
├── types/index.ts                # TypeScript 接口定义
├── utils/
│   ├── index.ts                  # 工具函数（extractPoseCode, formatTime, debounce 等）
│   ├── request.ts                # Axios HTTP 请求封装（拦截器、统一错误处理）
│   ├── recordIndex.ts            # Map 索引工具（性能优化）
│   └── echarts.ts                # ECharts 按需引入（Tree-Shaking 优化）
├── stores/
│   └── global.ts                 # Pinia 全局 Store（版本号/目录路径跨页面共享）
├── composables/
│   ├── useFilters.ts             # 多条件筛选逻辑（带缓存优化）
│   ├── usePagination.ts          # 分页逻辑
│   └── useOptionsCache.ts        # 选项缓存（性能优化）
├── components/
│   ├── FocusEditorDialog.vue     # 全屏编辑对话框组件
│   └── DataActionBar.vue         # 数据操作栏组件
├── assets/styles/
│   ├── base.css                  # 公共原子类（dense-grid、seamless-select 等）
│   └── dark.css                 # 暗黑模式全局样式
├── styles/common.css              # 公共样式
├── router/index.ts              # 路由配置（全懒加载）
├── views/
│   ├── ScreeningView.vue          # 数据审核筛选
│   ├── LabelingView.vue           # 姿态标签配置（全量标注）
│   ├── PromptEditor.vue           # 引导词审核
│   ├── DashboardView.vue          # 标签数据看板
│   └── PromptDashboardView.vue    # 引导词数据看板
├── App.vue                       # 根组件（导航栏 + 暗黑模式切换）
└── main.ts                       # 入口文件
```

## 架构设计

### 组件化设计
- **FocusEditorDialog**：可复用的全屏编辑对话框组件，支持自定义标题、图标、进度显示
- **DataActionBar**：可复用的数据操作栏组件，包含目录输入和版本选择

### 状态管理
使用 Pinia `useGlobalStore` 管理跨页面共享状态：
- `currentVersion` — 当前选择的数据版本号
- `workDirPath` — 远程工作目录路径
- `versionOptions` — 可选版本列表
- `realRemoteDirList` — 当前目录下的子目录列表
- `scanDirectory()` — 扫描远程目录
- `fetchPoseVersions()` / `fetchPromptVersions()` — 拉取版本列表

用户在任意页面切换版本或目录后，跳转到其他页面时上下文自动保持。

### Schema 配置统一管理
- `schema.ts`：集中管理所有字段 Schema、风格分组、默认可见列配置
- 避免在各 Vue 文件中重复定义的配置常量
- `index.ts`：从 `schema.ts` 重新导出，保持向后兼容

### HTTP 请求封装
- 统一使用 Axios 进行网络请求
- 请求拦截器：添加通用请求头
- 响应拦截器：统一错误处理、状态码判断
- 自动提示网络错误和业务错误

### 性能优化
- **选项缓存**：使用 `useOptionsCache` composable 预先计算并缓存所有字段选项，避免模板中重复遍历
- **Map 索引**：使用 `RecordIndex` 工具类建立 Map 索引，将 O(n²) 双重循环查找优化为 O(n)
- **字段值缓存**：在 `useFilters` 中缓存字段值的 Set，减少重复计算

### ECharts 按需引入
通过 `utils/echarts.ts` 仅注册 Bar/Pie/Line 三种图表 + 必要组件，打包体积优化约 49%。

### 防抖保存
标注和引导词编辑页面的自动保存操作使用 `debounce(fn, 300)` 防抖，避免高频提交。

### 暗黑模式
- Element Plus 原生 dark CSS 变量支持
- 公共样式和各页面均有 `html.dark` 适配
- 统一提取到 `src/assets/styles/dark.css`
- 自动跟随系统偏好 / 手动切换 / localStorage 持久化

### 用户防御性编程
- **未保存修改确认**：在焦点模式退出前检测是否有修改，弹出二次确认对话框
- **图片懒加载**：使用 `loading="lazy"` 属性实现图片懒加载

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 格式化代码
npm run format
```

## 环境要求

- Node.js ^20.19.0 或 >=22.12.0
- 后端 API 服务运行在 `http://10.114.198.175:5000`（可在 `src/config/index.ts` 中修改）

## 后端 API 依赖

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/pose/versions` | GET | 获取姿态版本列表 |
| `/api/pose/list` | GET | 获取姿态数据列表 |
| `/api/pose/save` | POST | 保存姿态标签 |
| `/api/pose/import_json` | POST | 导入 JSON |
| `/api/pose/import_excel` | POST | 导入 Excel |
| `/api/pose/export_json` | POST | 导出 JSON |
| `/api/pose/export_excel` | POST | 导出 Excel |
| `/api/prompt/versions` | GET | 获取引导词版本列表 |
| `/api/prompt/list` | GET | 获取引导词数据列表 |
| `/api/prompt/save` | POST | 保存引导词 |
| `/api/prompt/import_excel` | POST | 导入引导词 Excel |
| `/api/prompt/export_excel` | POST | 导出引导词 Excel |
| `/api/files/list_dir` | GET | 列出远程目录 |
| `/api/files/stream` | GET | 流式获取图片 |
| `/api/files/move_batch` | POST | 批量移动文件 |
