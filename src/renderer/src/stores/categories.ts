import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category } from '@/types'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  // 获取所有分类（树形结构）
  async function fetchCategories() {
    loading.value = true
    try {
      categories.value = await window.electronAPI.db.getCategories()
    } finally {
      loading.value = false
    }
  }

  // 添加分类
  async function addCategory(category: { name: string; parent_id: number | null; icon: string; sort_order: number }) {
    await window.electronAPI.db.addCategory(category)
    await fetchCategories()
  }

  // 更新分类
  async function updateCategory(id: number, data: { name?: string; icon?: string; sort_order?: number }) {
    await window.electronAPI.db.updateCategory(id, data)
    await fetchCategories()
  }

  // 删除分类
  async function deleteCategory(id: number) {
    await window.electronAPI.db.deleteCategory(id)
    await fetchCategories()
  }

  // 获取二级分类选项（供级联选择器用）
  function getCategoryOptions() {
    return categories.value.map(parent => ({
      value: parent.id,
      label: parent.name,
      children: (parent.children || []).map(child => ({
        value: child.id,
        label: child.name
      }))
    }))
  }

  // 根据二级分类 ID 找父分类
  function getParentByChildId(childId: number): Category | undefined {
    for (const cat of categories.value) {
      if (cat.children?.some(c => c.id === childId)) {
        return cat
      }
    }
    return undefined
  }

  return {
    categories,
    loading,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryOptions,
    getParentByChildId
  }
})
