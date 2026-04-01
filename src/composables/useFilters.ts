import { ref, computed, type Ref } from 'vue'
import type { FilterItem } from '@/types'

export function useFilters<T extends Record<string, unknown>>(sourceData: Ref<T[]>) {
  const activeFilters = ref<FilterItem[]>([{ field: '', value: [] }])

  const addFilter = () => activeFilters.value.push({ field: '', value: [] })

  const removeFilter = (idx: number) => activeFilters.value.splice(idx, 1)

  const clearAllFilters = () => {
    activeFilters.value = [{ field: '', value: [] }]
  }

  // 🚀 性能优化：缓存字段值的 Set，避免重复计算
  const fieldValuesCache = computed(() => {
    const cache = new Map<string, Set<string>>()

    // 一次性收集所有字段的唯一值
    const fieldKeys = new Set<string>()
    sourceData.value.forEach((item) => {
      Object.keys(item).forEach((key) => fieldKeys.add(key))
    })

    fieldKeys.forEach((key) => {
      const values = new Set<string>()
      sourceData.value.forEach((item) => {
        const val = item[key] as string | undefined
        if (val !== null && val !== undefined && val !== '') {
          values.add(val)
        }
      })
      cache.set(key, values)
    })

    return cache
  })

  const getUniqueValues = (field: string): string[] => {
    if (!field) return []
    const cachedSet = fieldValuesCache.value.get(field)
    return cachedSet ? Array.from(cachedSet) : []
  }

  const filteredData = computed(() => {
    return sourceData.value.filter((item) => {
      return activeFilters.value.every((f) => {
        if (!f.field || !f.value || f.value.length === 0) return true
        const itemVal = item[f.field]
        const isEmpty = itemVal === null || itemVal === undefined || itemVal === ''
        if (f.value.includes('__EMPTY__')) return isEmpty || f.value.includes(itemVal as string)
        return f.value.includes(itemVal as string)
      })
    })
  })

  return {
    activeFilters,
    addFilter,
    removeFilter,
    clearAllFilters,
    getUniqueValues,
    filteredData,
  }
}
