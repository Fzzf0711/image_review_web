export interface FieldSchema {
  key: string
  label: string
}

export interface RemoteDir {
  name: string
  fullPath: string
}

export interface RemoteFile {
  name: string
  fullPath: string
}

export interface ImageItem {
  id: number
  fileName: string
  fullPath: string
  selected: boolean
}

export interface FilterItem {
  field: string
  value: string[]
}

export interface PoseRecord {
  pose_code: string
  pose_name?: string
  framing?: string
  camera_angle?: string
  scene_theme?: string
  element_1?: string
  element_2?: string
  element_3?: string
  special_lighting?: string
  character_prop_1?: string
  character_prop_2?: string
  scene_prop_1?: string
  scene_prop_2?: string
  gender?: string
  age?: string
  body_type_fit?: string
  difficulty_level?: string
  remarks?: string
  is_fixed_data?: string
  priority?: string
  owner_1?: string
  owner_2?: string
  owner_3?: string
  _fileName: string
  _imageUrl: string
  [key: string]: string | undefined
}

export interface PromptRecord {
  pose_code: string
  generated_prompt?: string
  modified_prompt?: string
  modifier?: string
  word_count_check?: string
  check_owner?: string
  is_double_check?: string
  is_fixed_data?: string
  remarks?: string
  updated_at?: string
  _fileName: string
  _imageUrl: string
  [key: string]: string | undefined
}
