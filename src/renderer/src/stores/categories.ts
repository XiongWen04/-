import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category } from '@/types'

/**
 * 分类管理 Store
 * 负责管理支出/收入的一级和二级分类数据，包括分类的增删改查
 * 分类数据以树形结构存储，一级分类包含 children 数组存放二级分类
 */
export const useCategoryStore = defineStore('category', () => {
  /** 分类列表（树形结构）：每个一级分类节点包含 children 数组 */
  const categories = ref<Category[]>([])
  /** 加载状态：用于显示加载中提示 */
  const loading = ref(false)

  /**
   * 从数据库获取全部分类（树形结构）
   * 通过 IPC 调用主进程的 getCategories 接口，返回按 type 和 sort_order 排序的数据
   * 获取成功后赋值给 categories，供全页面共享使用
   */
  async function fetchCategories() {
    loading.value = true
    try {
      categories.value = await window.electronAPI.db.getCategories()
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加分类（支持一级和二级）
   * @param category - 分类数据，包含名称、父分类 ID、图标、排序号等
   * @param category.name - 分类名称
   * @param category.parent_id - 父分类 ID（null 表示一级分类）
   * @param category.icon - 分类图标标识
   * @param category.sort_order - 排序序号
   * @param category.type - 分类类型（expense 或 income），可选
   * @remarks
   * 如果未指定 type 但指定了 parent_id，则自动从父分类继承 type
   * 这是关键逻辑：二级分类无需重复指定 type，自动跟随一级
   */
  async function addCategory(category: { name: string; parent_id: number | null; icon: string; sort_order: number; type?: string }) {
    // 若未显式传入 type 且存在父分类，则从父分类继承 type 字段
    let type: string | undefined = category.type
    if (!type && category.parent_id) {
      const parent = categories.value.find(c => c.id === category.parent_id)
      type = parent?.type
    }
    await window.electronAPI.db.addCategory({ ...category, type })
    // 添加后刷新分类列表，保持本地数据与数据库同步
    await fetchCategories()
  }

  /**
   * 更新分类信息
   * @param id - 分类 ID
   * @param data - 待更新的字段（名称/图标/排序号），支持部分更新
   */
  async function updateCategory(id: number, data: { name?: string; icon?: string; sort_order?: number }) {
    await window.electronAPI.db.updateCategory(id, data)
    await fetchCategories()
  }

  /**
   * 删除分类（只能删除二级分类，受后端安全校验限制）
   * @param id - 待删除的分类 ID
   */
  async function deleteCategory(id: number) {
    await window.electronAPI.db.deleteCategory(id)
    await fetchCategories()
  }

  /**
   * 获取级联选择器所需的分类选项数据
   * @returns 格式化的级联选项数组，一级为父节点，children 为二级子节点
   * @remarks
   * 此方法专供 el-cascader 级联选择器使用，
   * 将树形分类数据转换为 value/label/children 三层结构
   */
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

  /**
   * 根据二级分类 ID 查找其所属的一级分类
   * @param childId - 二级分类的 ID
   * @returns 对应的一级分类对象，未找到时返回 undefined
   * @remarks
   * 用在收支列表/统计页面：已知一条记录所属的二级分类 ID，
   * 需要找到其一级分类以获取图标或大类名称，用于列表展示和分类筛选
   */
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
