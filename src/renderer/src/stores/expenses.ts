import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Expense, ExpenseQuery, MonthlyData, PaginatedResult } from '@/types'
import dayjs from 'dayjs'

/**
 * 花销记录 Store
 * 管理支出数据的获取、增删改查，以及当月汇总数据的缓存
 * 涉及全部与支出相关的业务逻辑：按月统计、分页查询、CRUD 操作
 */
export const useExpenseStore = defineStore('expense', () => {
  /** 当月汇总数据：含总金额 totalAmount 和总笔数 count，用于首页卡片和统计页展示 */
  const currentMonthData = ref<MonthlyData | null>(null)
  /** 当前查询结果列表（分页场景下为当前页数据） */
  const expenseList = ref<Expense[]>([])
  /** 符合查询条件的总记录数（用于分页组件计算总页数） */
  const totalCount = ref(0)
  /** 当前分页页码 */
  const currentPage = ref(1)
  /** 每页显示条数 */
  const pageSize = ref(50)

  /** 当月支出总额（便捷访问，若无数据则返回 0） */
  const currentMonthTotal = computed(() => currentMonthData.value?.totalAmount || 0)
  /** 当月支出总笔数（便捷访问，若无数据则返回 0） */
  const currentMonthCount = computed(() => currentMonthData.value?.count || 0)

  /**
   * 获取当月的支出汇总数据
   * 内部自动计算当前年月，调用 IPC 获取当月 totalAmount 和 count
   * 结果存入 currentMonthData，供首页卡片和统计页消费
   */
  async function fetchCurrentMonth() {
    const now = dayjs()
    const data = await window.electronAPI.db.getExpensesByMonth(now.year(), now.month() + 1)
    currentMonthData.value = data
  }

  /**
   * 获取指定年月的支出汇总数据
   * @param year - 年份（如 2026）
   * @param month - 月份（1-12）
   * @returns 当月汇总数据，包含 totalAmount（总金额）和 count（笔数）
   * @remarks
   * 与 fetchCurrentMonth 不同，此方法不修改 store 状态，仅返回数据，
   * 用于统计页切换月份时获取独立数据
   */
  async function fetchMonth(year: number, month: number) {
    const data = await window.electronAPI.db.getExpensesByMonth(year, month)
    return data
  }

  /**
   * 查询支出记录列表（支持分页和筛选）
   * @param query - 查询参数：可指定类型、日期范围、分类等筛选条件
   * @returns 分页结果，包含 list（当前页记录数组）和 total（总记录数）
   * @remarks
   * monthlyData 的结构：{ totalAmount: number, count: number }
   * 由后端按月分组聚合查询返回，用于首页和统计页的月度汇总
   */
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

  /**
   * 添加一笔支出记录
   * @param expense - 支出数据，包含金额、分类 ID、日期、备注和支付方式
   * @param expense.amount - 金额（必填）
   * @param expense.category_id - 二级分类 ID（必填）
   * @param expense.date - 日期 YYYY-MM-DD（必填，默认当天）
   * @param expense.note - 备注（可选）
   * @param expense.payment_method - 支付方式（可选：微信/支付宝/银行卡/现金/其他）
   * @returns 数据库插入结果（含新记录 ID）
   */
  async function addExpense(expense: { amount: number; category_id: number; date: string; note?: string; payment_method?: string }) {
    const result = await window.electronAPI.db.addExpense(expense)
    // 新增后刷新当月汇总数据，确保首页卡片和统计页实时更新
    await fetchCurrentMonth()
    return result
  }

  /**
   * 更新指定支出记录
   * @param id - 记录 ID
   * @param data - 待更新的部分字段（支持增量更新）
   */
  async function updateExpense(id: number, data: Partial<Expense>) {
    await window.electronAPI.db.updateExpense(id, data)
    await fetchCurrentMonth()
  }

  /**
   * 删除指定支出记录
   * @param id - 待删除的记录 ID
   */
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
