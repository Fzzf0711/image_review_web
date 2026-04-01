import { computed, type Ref } from 'vue'
import type { FieldSchema } from '@/types'

/**
 * 优化后的选项缓存 Composable
 * 使用 computed 预先计算所有字段的选项并缓存，避免模板中的重复计算
 */
export function useOptionsCache<T extends Record<string, unknown>>(
  sourceData: Ref<T[]>,
  fieldSchema: FieldSchema[],
) {
  // 使用 computed 缓存所有选项字典，避免模板中重复调用 getOptions
  const optionsDict = computed(() => {
    const dict: Record<string, Array<{ value: string; label: string }>> = {}

    fieldSchema.forEach((field) => {
      const values = new Set<string>()
      sourceData.value.forEach((item) => {
        const val = item[field.key] as string | undefined
        if (val !== null && val !== undefined && val !== '') {
          values.add(val)
        }
      })

      dict[field.key] = Array.from(values).map((v) => ({ value: v, label: v }))
    })

    return dict
  })

  const getOptions = (key: string): Array<{ value: string; label: string }> => {
    return optionsDict.value[key] || []
  }

  return {
    optionsDict,
    getOptions,
  }
}
