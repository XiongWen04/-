import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Income, IncomeQuery, IncomeMonthlyData } from '@/types'
import dayjs from 'dayjs'

export const useIncomeStore = defineStore('income', () => {
  const currentMonthData = ref<IncomeMonthlyData | null>(null)
  const incomeList = ref<Income[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(50)

  const currentMonthTotal = computed(() => currentMonthData.value?.totalAmount || 0)
  const currentMonthCount = computed(() => currentMonthData.value?.count || 0)

  // 获取当月数据
  async function fetchCurrentMonth() {
    const now = dayjs()
    const data = await window.electronAPI.db.getIncomesByMonth(now.year(), now.month() + 1)
    currentMonthData.value = data
  }

  // 获取指定年月
  async function fetchMonth(year: number, month: number) {
    const data = await window.electronAPI.db.getIncomesByMonth(year, month)
    return data
  }

  // 获取收入列表
  async function fetchIncomes(query: IncomeQuery = {}) {
    const result = await window.electronAPI.db.getIncomes({
      page: currentPage.value,
      pageSize: pageSize.value,
      ...query
    })
    incomeList.value = result.list
    totalCount.value = result.total
    return result
  }

  // 添加收入
  async function addIncome(income: { amount: number; category_id: number; date: string; note?: string; source?: string }) {
    const result = await window.electronAPI.db.addIncome(income)
    await fetchCurrentMonth()
    return result
  }

  // 更新收入
  async function updateIncome(id: number, data: Partial<Income>) {
    await window.electronAPI.db.updateIncome(id, data)
    await fetchCurrentMonth()
  }

  // 删除收入
  async function deleteIncome(id: number) {
    await window.electronAPI.db.deleteIncome(id)
    await fetchCurrentMonth()
  }

  return {
    currentMonthData,
    incomeList,
    totalCount,
    currentPage,
    pageSize,
    currentMonthTotal,
    currentMonthCount,
    fetchCurrentMonth,
    fetchMonth,
    fetchIncomes,
    addIncome,
    updateIncome,
    deleteIncome
  }
})
