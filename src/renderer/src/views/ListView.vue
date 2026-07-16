<template>
  <div>
    <div class="page-header">
      <h2>收支明细</h2>
      <!-- 快速跳转新增记录 -->
      <div>
        <el-button type="primary" @click="$router.push('/add')">
          <el-icon><Plus /></el-icon> 新增记录
        </el-button>
      </div>
    </div>

    <!-- ====== 筛选条件区域：按类型/日期范围/分类过滤记录 ====== -->
    <div class="page-card">
      <el-form :inline="true" :model="filters" size="default">
        <!-- 类型筛选：全部/支出/收入，切换后只加载对应类型的数据 -->
        <el-form-item label="类型">
          <el-select v-model="listType" placeholder="全部" style="width: 120px" @change="handleSearch">
            <el-option label="全部" value="all" />
            <el-option label="支出" value="expense" />
            <el-option label="收入" value="income" />
          </el-select>
        </el-form-item>
        <!-- 日期范围：双端日期选择器，起止均不填则为全部时间 -->
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <!-- 分类级联筛选：支出/收入分类联动，选到二级分类时精确过滤 -->
        <el-form-item label="分类">
          <el-cascader
            v-model="filterCategory"
            :options="allCategoryOptions"
            :props="{ expandTrigger: 'hover', label: 'label', value: 'value', children: 'children' }"
            placeholder="全部"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ====== 记录列表区域 ====== -->
    <div class="page-card">
      <div v-if="combinedList.length === 0" style="text-align: center; padding: 60px 0; color: #909399;">
        <el-icon :size="48" style="margin-bottom: 12px;"><FolderDelete /></el-icon>
        <p>暂无记录</p>
      </div>

      <!--
        按月分组展示：将合并后的记录按 YYYY-MM 分组，每组显示该月支出/收入合计。
        使用 Object.entries 遍历 groupedList，每组头部展示月份和月度汇总
      -->
      <div v-for="(group, monthKey) in groupedList" :key="monthKey">
        <!-- 月份头部：显示"XXXX年X月"及该月收支合计 -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; color: #606266; padding: 12px 0 8px; border-bottom: 1px solid #e4e7ed; margin-bottom: 4px;">
          <span>{{ formatMonthKey(monthKey) }}</span>
          <span>
            <span style="color: #f56c6c; font-weight: 400; font-size: 12px;">支出 ¥{{ group.expenseTotal.toFixed(2) }}</span>
            <span style="color: #67c23a; font-weight: 400; font-size: 12px; margin-left: 12px;">收入 ¥{{ group.incomeTotal.toFixed(2) }}</span>
          </span>
        </div>
        <!-- 每条记录：图标 + 分类名 + 备注 + 金额（红支出绿收入）+ 删除按钮 -->
        <div v-for="item in group.items" :key="item._id" class="expense-item">
          <div class="expense-icon" :style="{ background: item._type === 'income' ? '#f0f9eb' : '#ecf5ff', color: item._type === 'income' ? '#67c23a' : '#409eff' }">
            <el-icon><component :is="getIconComponent(item.category_icon)" /></el-icon>
          </div>
          <div class="expense-info">
            <div class="expense-category">{{ item.parent_category_name || item.category_name }}</div>
            <div class="expense-note">{{ item.note || item.category_name }}</div>
          </div>
          <div class="expense-amount" :style="{ color: item._type === 'income' ? '#67c23a' : '#f56c6c' }">
            {{ item._type === 'income' ? '+' : '-' }}¥{{ item.amount.toFixed(2) }}
            <span class="expense-date">{{ item.date }}</span>
          </div>
          <!-- 删除操作带二次确认，防止误删 -->
          <div style="margin-left: 12px;">
            <el-popconfirm
              title="确定删除此记录？"
              confirm-button-text="删除"
              @confirm="handleDelete(item)"
            >
              <template #reference>
                <el-button text type="danger" size="small">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>

      <!-- ====== 分页：当记录总数超过每页条数时显示分页器 ====== -->
      <div v-if="totalCount > pageSize" style="text-align: center; padding: 16px 0;">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useExpenseStore } from '@/stores/expenses'
import { useIncomeStore } from '@/stores/incomes'
import { useCategoryStore } from '@/stores/categories'
import { ElMessage } from 'element-plus'
import { Plus, Delete, FolderDelete } from '@element-plus/icons-vue'
import * as icons from '@element-plus/icons-vue'

const expenseStore = useExpenseStore()
const incomeStore = useIncomeStore()
const categoryStore = useCategoryStore()

/** 筛选类型：all（全部）/ expense（仅支出）/ income（仅收入） */
const listType = ref('all')
/** 日期范围：[起始日期, 结束日期] */
const dateRange = ref<string[]>([])
/** 级联分类筛选：[一级分类ID, 二级分类ID] */
const filterCategory = ref<number[]>([])
/** 当前分页页码 */
const currentPage = ref(1)
/** 每页记录数 */
const pageSize = 50
/** 符合条件的总记录数（用于分页器计算总页数） */
const totalCount = ref(0)

/** 筛选条件对象，用于传递给 store 查询参数 */
const filters = reactive({
  dateFrom: '',
  dateTo: '',
  category_id: undefined as number | undefined
})

/** 全部分类选项（含支出+收入），用于级联选择器 */
const allCategoryOptions = computed(() => categoryStore.getCategoryOptions())

/**
 * 合并后的列表：将支出和收入数据统一格式后合并，按日期+创建时间倒序排列
 * @description
 * - 为每条记录添加 _type（标识来源类型）和 _id（防 key 重复）
 * - "全部"模式下将两个数组合并后按 date desc + created_at desc 排序
 * - "仅支出"/"仅收入"模式直接返回对应数组
 */
const combinedList = computed(() => {
  const expenses = expenseStore.expenseList.map(e => ({ ...e, _type: 'expense', _id: `e-${e.id}` }))
  const incomes = incomeStore.incomeList.map(i => ({ ...i, _type: 'income', _id: `i-${i.id}` }))

  if (listType.value === 'expense') return expenses
  if (listType.value === 'income') return incomes

  // "全部"模式：合并后按日期降序排，同日期按创建时间降序排
  const all = [...expenses, ...incomes]
  all.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date)
    if (dateCmp !== 0) return dateCmp
    return (b.created_at || '').localeCompare(a.created_at || '')
  })
  return all
})

/**
 * 按月份分组合并后的列表
 * @description 遍历 combinedList，按 date 的 YYYY-MM 前缀分组，
 * 每组内分别累计支出总额和收入总额，用于月度头部展示。
 * 返回 { monthKey: { items, expenseTotal, incomeTotal } } 结构
 */
const groupedList = computed(() => {
  const groups: Record<string, { items: any[], expenseTotal: number, incomeTotal: number }> = {}
  for (const item of combinedList.value) {
    // 取日期前 7 位得到 "YYYY-MM" 作为月份分组 key
    const monthKey = item.date.substring(0, 7)
    if (!groups[monthKey]) {
      groups[monthKey] = { items: [], expenseTotal: 0, incomeTotal: 0 }
    }
    groups[monthKey].items.push(item)
    // 按类型累计月度总额
    if (item._type === 'income') {
      groups[monthKey].incomeTotal += item.amount
    } else {
      groups[monthKey].expenseTotal += item.amount
    }
  }
  return groups
})

/**
 * 格式化月份 key 为可读文案："2026-07" → "2026年7月"
 * @param key - "YYYY-MM" 格式的月份字符串
 */
function formatMonthKey(key: string) {
  const [y, m] = key.split('-')
  return `${y}年${parseInt(m)}月`
}

/**
 * 将数据库中存储的 icon 名称映射为 Element Plus 图标组件
 * @param iconName - 数据库中存储的图标标识
 * @returns 对应的 Element Plus 图标组件
 */
function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    food: 'ForkSpoon', car: 'Van', 'shopping-bag': 'ShoppingBag',
    home: 'House', camera: 'Camera', 'first-aid-kit': 'FirstAidKit',
    reading: 'Reading', 'chat-line-square': 'ChatLineSquare', more: 'More',
    money: 'Money', 'trend-charts': 'TrendCharts', present: 'Present', 'more-filled': 'MoreFilled'
  }
  const name = iconMap[iconName] || iconName
  return (icons as any)[name] || icons.Coin
}

/**
 * 搜索：将筛选条件同步到 filters 对象并重新加载数据
 * @description 日期范围转为起止日期字符串，分类取二级 ID 做精确过滤
 */
async function handleSearch() {
  if (dateRange.value && dateRange.value.length === 2) {
    filters.dateFrom = dateRange.value[0]
    filters.dateTo = dateRange.value[1]
  } else {
    filters.dateFrom = ''
    filters.dateTo = ''
  }
  // 级联选择器选到二级时用二级分类 ID，否则不按分类过滤
  filters.category_id = filterCategory.value.length > 1 ? filterCategory.value[1] : undefined
  currentPage.value = 1
  await loadData()
}

/**
 * 重置：清空所有筛选条件并重新加载数据
 */
async function handleReset() {
  dateRange.value = []
  filterCategory.value = []
  listType.value = 'all'
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.category_id = undefined
  currentPage.value = 1
  await loadData()
}

/**
 * 加载数据：根据筛选条件并行拉取支出和/或收入数据
 * @description
 * - 根据 listType 决定拉取哪些数据（只支出/只收入/两者）
 * - 取完数据后根据类型更新 totalCount 用于分页
 */
async function loadData() {
  const query = {
    page: currentPage.value,
    pageSize,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    category_id: filters.category_id
  }
  await Promise.all([
    listType.value !== 'income' ? expenseStore.fetchExpenses(query) : Promise.resolve(),
    listType.value !== 'expense' ? incomeStore.fetchIncomes(query) : Promise.resolve()
  ])

  // 根据筛选类型更新总记录数（用于分页计算）
  if (listType.value === 'expense') {
    totalCount.value = expenseStore.totalCount
  } else if (listType.value === 'income') {
    totalCount.value = incomeStore.totalCount
  } else {
    // "全部"模式下取两者较大值作为分页基准（因为两边记录数不同但共用一个分页器）
    totalCount.value = Math.max(expenseStore.totalCount, incomeStore.totalCount)
  }
}

/**
 * 删除记录：根据 _type 调用对应的 store 删除方法，删除后刷新列表
 * @param item - 带 _type 标记的记录对象
 */
async function handleDelete(item: any) {
  if (item._type === 'income') {
    await incomeStore.deleteIncome(item.id)
  } else {
    await expenseStore.deleteExpense(item.id)
  }
  ElMessage.success('已删除')
  await loadData()
}

/**
 * 分页切换事件：页码改变时重新加载数据
 */
async function handlePageChange() {
  await loadData()
}

/**
 * 页面挂载时初始化：并行加载当月概览、全部分类和列表数据
 */
onMounted(async () => {
  await Promise.all([
    expenseStore.fetchCurrentMonth(),
    incomeStore.fetchCurrentMonth(),
    categoryStore.fetchCategories(),
    loadData()
  ])
})
</script>
