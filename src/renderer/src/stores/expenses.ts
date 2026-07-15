import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Expense, ExpenseQuery, MonthlyData, PaginatedResult } from '@/types'
import dayjs from 'dayjs'

export const useExpenseStore = defineStore('expense', () => {
  const currentMonthData = ref<MonthlyData | null>(null)
  const expenseList = ref<Expense[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(50)

  const currentMonthTotal = computed(() => currentMonthData.value?.totalAmount || 0)
  const currentMonthCount = computed(() => currentMonthData.value?.count || 0)

  // 获取当月数据
  async function fetchCurrentMonth() {
    const now = dayjs()
    const data = await window.electronAPI.db.getExpensesByMonth(now.year(), now.month() + 1)
    currentMonthData.value = data
  }

  // 获取指定年月
  async function fetchMonth(year: number, month: number) {
    const data = await window.electronAPI.db.getExpensesByMonth(year, month)
    return data
  }

  // 获取花销列表
  async function fetchExpenses(query: ExpenseQuery = {}) {
    const result = await window.electronAPI.db.getExpenses({
      page: currentPage.value,
      pageSize: pageSize.value,
      ...query
    }) as PaginatedResult<Expense>
    expenseList.value = result.list
    totalCount.value = result.total
    return result
  }

  // 添加花销
  async function addExpense(expense: { amount: number; category_id: number; date: string; note?: string; payment_method?: string }) {
    const result = await window.electronAPI.db.addExpense(expense)
    await fetchCurrentMonth()
    return result
  }

  // 更新花销
  async function updateExpense(id: number, data: Partial<Expense>) {
    await window.electronAPI.db.updateExpense(id, data)
    await fetchCurrentMonth()
  }

  // 删除花销
  async function deleteExpense(id: number) {
    await window.electronAPI.db.deleteExpense(id)
    await fetchCurrentMonth()
  }

  return {
    currentMonthData,
    expenseList,
    totalCount,
    currentPage,
    pageSize,
    currentMonthTotal,
    currentMonthCount,
    fetchCurrentMonth,
    fetchMonth,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense
  }
})
