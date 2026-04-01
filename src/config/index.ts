export const BASE_API = 'http://10.114.198.175:5000'
export const BASE_ROOT =
  '\\\\10.114.198.31\\05_Data\\ai姿态推荐数据库_3.0_pipeline\\99_版本数据交付路径'

// ==================== API 端点 ====================
export const API = {
  // 姿态标签相关
  POSE_VERSIONS: `${BASE_API}/api/pose/versions`,
  POSE_LIST: `${BASE_API}/api/pose/list`,
  POSE_SAVE: `${BASE_API}/api/pose/save`,
  POSE_IMPORT_JSON: `${BASE_API}/api/pose/import_json`,
  POSE_IMPORT_EXCEL: `${BASE_API}/api/pose/import_excel`,
  POSE_EXPORT_JSON: `${BASE_API}/api/pose/export_json`,
  POSE_EXPORT_EXCEL: `${BASE_API}/api/pose/export_excel`,

  // 引导词相关
  PROMPT_VERSIONS: `${BASE_API}/api/prompt/versions`,
  PROMPT_LIST: `${BASE_API}/api/prompt/list`,
  PROMPT_SAVE: `${BASE_API}/api/prompt/save`,
  PROMPT_IMPORT_EXCEL: `${BASE_API}/api/prompt/import_excel`,
  PROMPT_EXPORT_EXCEL: `${BASE_API}/api/prompt/export_excel`,

  // 文件操作
  FILE_STREAM: `${BASE_API}/api/files/stream`,
  FILE_MOVE_BATCH: `${BASE_API}/api/files/move_batch`,
  DIR_LIST: `${BASE_API}/api/files/list_dir`,
} as const

// ==================== 图表调色板 ====================
export const CHART_COLOR_PALETTE = [
  '#3370ff',
  '#12aa50',
  '#ff6a00',
  '#f53f3f',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
]

// ==================== 引导词校验常量 ====================
export const PROMPT_MAX_LENGTH = 30

// 从 schema.ts 导入配置
export * from './schema'
