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

// ==================== 姿态标签字段 Schema ====================
export const POSE_FIELD_SCHEMA = [
  { key: 'pose_name', label: '姿态' },
  { key: 'framing', label: '景别' },
  { key: 'camera_angle', label: '角度' },
  { key: 'scene_theme', label: '场景主题' },
  { key: 'element_1', label: '元素1' },
  { key: 'element_2', label: '元素2' },
  { key: 'element_3', label: '元素3' },
  { key: 'special_lighting', label: '特殊光线' },
  { key: 'character_prop_1', label: '人物陪体-1' },
  { key: 'character_prop_2', label: '人物陪体-2' },
  { key: 'scene_prop_1', label: '场景陪体-1' },
  { key: 'scene_prop_2', label: '场景陪体-2' },
  { key: 'gender', label: '性别' },
  { key: 'age', label: '年龄' },
  { key: 'body_type_fit', label: '姿态适配身材' },
  { key: 'difficulty_level', label: '姿态难易程度' },
  { key: 'remarks', label: '备注' },
  { key: 'is_fixed_data', label: '是否固定数据' },
  { key: 'style_ins', label: 'ins风' },
  { key: 'style_seductive', label: '钓系姐感' },
  { key: 'style_relaxed', label: '松弛感' },
  { key: 'style_hk', label: '港片风' },
  { key: 'style_rich', label: '贵气千金' },
  { key: 'style_faceless', label: '不露脸氛围' },
  { key: 'style_tall_thin', label: '显高显瘦' },
  { key: 'style_vitality', label: '生命力/活人感' },
  { key: 'style_introvert', label: 'i人出片姿势' },
  { key: 'style_aesthetic_food', label: '漂亮饭' },
  { key: 'style_polaroid', label: '拍立得' },
  { key: 'style_ccd', label: 'CCD' },
  { key: 'style_anniversary', label: '纪念日打卡' },
  { key: 'style_birthday', label: '生日打卡' },
  { key: 'style_landmark', label: '地标' },
  { key: 'style_ancient', label: '古风' },
  { key: 'priority', label: '优先级' },
  { key: 'owner_1', label: '责任人1' },
  { key: 'owner_2', label: '责任人2' },
  { key: 'owner_3', label: '责任人3' },
] as const

// ==================== 引导词字段 Schema ====================
export const PROMPT_FIELD_SCHEMA = [
  { key: 'pose_code', label: '姿态编号' },
  { key: 'generated_prompt', label: '生成引导词' },
  { key: 'modified_prompt', label: '修改引导词' },
  { key: 'modifier', label: '修改人' },
  { key: 'word_count_check', label: '字数检查' },
  { key: 'check_owner', label: 'Check责任人' },
  { key: 'is_double_check', label: '是否双检' },
  { key: 'is_fixed_data', label: '是否固定数据' },
  { key: 'remarks', label: '备注' },
] as const

// ==================== 默认可见列 ====================
export const DEFAULT_POSE_VISIBLE_COLUMNS = [
  'pose_name',
  'framing',
  'camera_angle',
  'scene_theme',
  'element_1',
  'element_2',
  'element_3',
  'special_lighting',
  'character_prop_1',
  'character_prop_2',
  'scene_prop_1',
  'scene_prop_2',
  'gender',
  'age',
  'body_type_fit',
  'difficulty_level',
]

export const DEFAULT_PROMPT_VISIBLE_COLUMNS = [
  'modified_prompt',
  'modifier',
  'check_owner',
  'word_count_check',
  'is_double_check',
  'remarks',
]

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
