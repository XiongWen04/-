import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Income, IncomeQuery, IncomeMonthlyData } from '@/types'
import dayjs from 'dayjs'

/**
 * 收入记录 Store
 * 管理收入数据的获取、增删改查，以及当月收入汇总数据的缓存
 * 结构与 expense Store 对称，提供与支出一致的操作接口
 */
export const useIncomeStore = defineStore('income', () => {
  /** 当月收入汇总数据：含总金额 totalAmount 和总笔数 count */
  const currentMonthData = ref<IncomeMonthlyData | null>(null)
  /** 当前查询结果列表（分页场景下为当前页数据） */
  const incomeList = ref<Income[]>([])
  /** 符合查询条件的总记录数（用于分页组件计算总页数） */
  const totalCount = ref(0)
  /** 当前分页页码 */
  const currentPage = ref(1)
  /** 每页显示条数 */
  const pageSize = ref(50)

  /** 当月收入总额（便捷访问，若无数据则返回 0） */
  const currentMonthTotal = computed(() => currentMonthData.value?.totalAmount || 0)
  /** 当月收入总笔数（便捷访问，若无数据则返回 0） */
  const currentMonthCount = computed(() => currentMonthData.value?.count || 0)

  /**
   * 获取当月的收入汇总数据
   * 内部自动计算当前年月，调用 IPC 获取当月 totalAmount 和 count
   * 结果存入 currentMonthData，供首页卡片和统计页消费
   */
  async function fetchCurrentMonth() {
    const now = dayjs()
    const data = await window.electronAPI.db.getIncomesByMonth(now.year(), now.month() + 1)
    currentMonthData.value = data
  }

  /**
   * 获取指定年月的收入汇总数据
   * @param year - 年份（如 2026）
   * @param month - 月份（1-12）
   * @returns 当月汇总数据，包含 totalAmount（总金额）和 count（笔数）
   * @remarks
   * 与 fetchCurrentMonth 不同，此方法不修改 store 状态，仅返回独立数据
   */
  async function fetchMonth(year: number, month: number) {
    const data = await window.electronAPI.db.getIncomesByMonth(year, month)
    return data
  }

  /**
   * 查询收入记录列表（支持分页和筛选）
   * @param query - 查询参数：可指定日期范围、分类等筛选条件
   * @returns 分页结果，包含 list（当前页记录数组）和 total（总记录数）
   */
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

  /**
   * 添加一笔收入记录
   * @param income - 收入数据，包含金额、分类 ID、日期、备注和来源
   * @param income.amount - 金额（必填）
   * @param income.category_id - 二级分类 ID（必填）
   * @param income.date - 日期 YYYY-MM-DD（必填，默认当天）
   * @param income.note - 备注（可选）
   * @param income.source - 来源（可选：工资/兼职/投资/红包/退款/报销/其他）
   * @returns 数据库插入结果（含新记录 ID）
   */
  async function addIncome(income: { amount: number; category_id: number; date: string; note?: string; source?: string }) {
    const result = await window.electronAPI.db.addIncome(income)
    // 新增后刷新当月汇总数据，确保首页卡片和统计页实时更新
    await fetchCurrentMonth()
    return result
  }

  /**
   * 更新指定收入记录
   * @param id - 记录 ID
   * @param data - 待更新的部分字段（支持增量更新）
   */
  async function updateIncome(id: number, data: Partial<Income>) {
    await window.electronAPI.db.updateIncome(id, data)
    await fetchCurrentMonth()
  }

  /**
   * 删除指定收入记录
   * @param id - 待删除的记录 ID
   */
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
