import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCategoryStore } from '../stores/categories'
import type { Category } from '../types'

// 模拟 window.electronAPI
// 注意：真实 IPC 处理器返回带 children 的树形结构（按 parent_id 分组）
const mockCategories: Category[] = [
  { id: 1, name: '餐饮', parent_id: null, icon: 'food', sort_order: 1, type: 'expense', created_at: '',
    children: [
      { id: 2, name: '午餐', parent_id: 1, icon: '', sort_order: 1, type: 'expense', created_at: '' },
      { id: 3, name: '晚餐', parent_id: 1, icon: '', sort_order: 2, type: 'expense', created_at: '' }
    ]
  },
  { id: 4, name: '交通', parent_id: null, icon: 'transport', sort_order: 2, type: 'expense', created_at: '',
    children: [
      { id: 5, name: '地铁', parent_id: 4, icon: '', sort_order: 1, type: 'expense', created_at: '' }
    ]
  },
  { id: 6, name: '工资', parent_id: null, icon: 'salary', sort_order: 1, type: 'income', created_at: '',
    children: [
      { id: 7, name: '月薪', parent_id: 6, icon: '', sort_order: 1, type: 'income', created_at: '' }
    ]
  }
]

const mockElectronAPI = {
  db: {
    getCategories: vi.fn().mockResolvedValue(mockCategories),
    addCategory: vi.fn().mockResolvedValue({ id: 100 }),
    updateCategory: vi.fn().mockResolvedValue(undefined),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    getParentCategories: vi.fn(),
    getChildCategories: vi.fn(),
    addExpense: vi.fn(),
    getExpenses: vi.fn(),
    getExpensesByMonth: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    addIncome: vi.fn(),
    getIncomes: vi.fn(),
    getIncomesByMonth: vi.fn(),
    updateIncome: vi.fn(),
    deleteIncome: vi.fn(),
    getYearlyStats: vi.fn(),
    getYearlyIncomeStats: vi.fn(),
    getCategoryStats: vi.fn(),
    getIncomeCategoryStats: vi.fn(),
    backup: vi.fn()
  }
}

window.electronAPI = mockElectronAPI as any

describe('Category Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchCategories 从 API 获取分类数据', async () => {
    const store = useCategoryStore()
    expect(store.loading).toBe(false)
    expect(store.categories.length).toBe(0)

    await store.fetchCategories()

    expect(mockElectronAPI.db.getCategories).toHaveBeenCalled()
    expect(store.categories.length).toBe(3) // 3 个一级分类
    expect(store.categories[0].name).toBe('餐饮')
    expect(store.loading).toBe(false)
  })

  it('getCategoryOptions 返回层级结构数据', async () => {
    const store = useCategoryStore()
    await store.fetchCategories()

    const options = store.getCategoryOptions()
    expect(options.length).toBe(3) // 3 个一级分类
    expect(options[0]).toHaveProperty('value')
    expect(options[0]).toHaveProperty('label')
    expect(options[0]).toHaveProperty('children')
    expect(options[0].children!.length).toBe(2) // 餐饮下有 2 个二级分类
    expect(options[0].children![0].label).toBe('午餐')
  })

  it('getParentByChildId 根据子分类 ID 找到父分类', async () => {
    const store = useCategoryStore()
    await store.fetchCategories()

    const parent = store.getParentByChildId(2) // 午餐 → 餐饮
    expect(parent).toBeDefined()
    expect(parent!.name).toBe('餐饮')

    const parent2 = store.getParentByChildId(5) // 地铁 → 交通
    expect(parent2).toBeDefined()
    expect(parent2!.name).toBe('交通')
  })

  it('getParentByChildId 找不到时返回 undefined', async () => {
    const store = useCategoryStore()
    await store.fetchCategories()

    const parent = store.getParentByChildId(999)
    expect(parent).toBeUndefined()
  })

  it('addCategory 调用 API 并刷新列表', async () => {
    const store = useCategoryStore()
    await store.fetchCategories()

    const newCategory = { name: '早餐', parent_id: 1, icon: '', sort_order: 3 }
    await store.addCategory(newCategory)

    expect(mockElectronAPI.db.addCategory).toHaveBeenCalledWith({
      ...newCategory,
      type: 'expense' // 应从父分类继承
    })
    // 刷新后再次调用 getCategories
    expect(mockElectronAPI.db.getCategories).toHaveBeenCalledTimes(2)
  })
})
