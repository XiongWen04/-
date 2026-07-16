import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useExpenseStore } from '../stores/expenses'
import type { MonthlyData, PaginatedResult, Expense } from '../types'

// 模拟 dayjs 让测试中的"当月"固定下来
vi.mock('dayjs', () => {
  const mockDayjs = (): any => ({
    year: () => 2026,
    month: () => 6, // 7月（0-indexed）
    format: vi.fn()
  })
  return { default: mockDayjs }
})

const mockMonthlyData: MonthlyData = {
  daily: {
    '2026-07-01': [
      { id: 1, amount: 25, category_id: 2, date: '2026-07-01', note: '午餐', payment_method: '微信', created_at: '', updated_at: '' }
    ],
    '2026-07-02': [
      { id: 2, amount: 15, category_id: 2, date: '2026-07-02', note: '早餐', payment_method: '支付宝', created_at: '', updated_at: '' }
    ]
  },
  totalAmount: 40,
  categoryTotal: [{ id: 1, name: '餐饮', icon: 'food', total: 40 }],
  count: 2
}

const mockExpenseList: PaginatedResult<Expense> = {
  list: [
    { id: 1, amount: 25, category_id: 2, date: '2026-07-01', note: '午餐', payment_method: '微信', created_at: '', updated_at: '', category_name: '午餐', category_icon: '', parent_category_name: '餐饮' }
  ],
  total: 1,
  page: 1,
  pageSize: 50
}

const mockElectronAPI = {
  db: {
    getExpensesByMonth: vi.fn().mockResolvedValue(mockMonthlyData),
    getExpenses: vi.fn().mockResolvedValue(mockExpenseList),
    addExpense: vi.fn().mockResolvedValue({ id: 100 }),
    updateExpense: vi.fn().mockResolvedValue(undefined),
    deleteExpense: vi.fn().mockResolvedValue(undefined),
    getCategories: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getParentCategories: vi.fn(),
    getChildCategories: vi.fn(),
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

describe('Expense Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchCurrentMonth 获取当月数据并计算合计', async () => {
    const store = useExpenseStore()
    await store.fetchCurrentMonth()

    expect(mockElectronAPI.db.getExpensesByMonth).toHaveBeenCalledWith(2026, 7)
    expect(store.currentMonthTotal).toBe(40)
    expect(store.currentMonthCount).toBe(2)
    expect(store.currentMonthData?.totalAmount).toBe(40)
    expect(store.currentMonthData?.count).toBe(2)
  })

  it('fetchExpenses 获取分页列表', async () => {
    const store = useExpenseStore()
    const result = await store.fetchExpenses({ dateFrom: '2026-07-01' })

    expect(mockElectronAPI.db.getExpenses).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      dateFrom: '2026-07-01'
    })
    expect(result.total).toBe(1)
    expect(store.expenseList.length).toBe(1)
    expect(store.totalCount).toBe(1)
  })

  it('addExpense 调用 API 并刷新月度数据', async () => {
    const store = useExpenseStore()

    const newExpense = { amount: 30, category_id: 2, date: '2026-07-03', note: '咖啡', payment_method: '微信' }
    await store.addExpense(newExpense)

    expect(mockElectronAPI.db.addExpense).toHaveBeenCalledWith(newExpense)
    // 添加后自动刷新月度数据
    expect(mockElectronAPI.db.getExpensesByMonth).toHaveBeenCalled()
  })

  it('deleteExpense 调用 API 并刷新月度数据', async () => {
    const store = useExpenseStore()
    await store.deleteExpense(1)

    expect(mockElectronAPI.db.deleteExpense).toHaveBeenCalledWith(1)
    expect(mockElectronAPI.db.getExpensesByMonth).toHaveBeenCalled()
  })
})
