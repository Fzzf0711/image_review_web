import { ref, computed, watch, type Ref } from 'vue'

export function usePagination<T>(source: Ref<T[]>, defaultPageSize = 50) {
  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return source.value.slice(start, start + pageSize.value)
  })

  watch(source, () => {
    currentPage.value = 1
  })

  return { currentPage, pageSize, paginatedData }
}
