// 分类类型
export interface Category {
  id: number
  name: string
  parent_id: number | null
  icon: string
  sort_order: number
  created_at: string
  children?: Category[]
}

// 花销记录类型
export interface Expense {
  id: number
  amount: number
  category_id: number
  date: string
  note: string
  payment_method: string
  created_at: string
  updated_at: string
  // 联表查询附加字段
  category_name?: string
  category_icon?: string
  parent_category_name?: string
  parent_category_id?: number
}

// 花销列表查询参数
export interface ExpenseQuery {
  page?: number
  pageSize?: number
  dateFrom?: string
  dateTo?: string
  category_id?: number
}

// 月度数据
export interface MonthlyData {
  daily: Record<string, Expense[]>
  totalAmount: number
  categoryTotal: { id: number; name: string; icon: string; total: number }[]
  count: number
}

// 年度统计
export interface YearlyStat {
  month: string
  total: number
  count: number
}

// 分类统计（饼图）
export interface CategoryStat {
  name: string
  value: number
}

// 分页响应
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
