<template>
  <div>
    <div class="page-header">
      <h2>收支明细</h2>
      <div>
        <el-button type="primary" @click="$router.push('/add')">
          <el-icon><Plus /></el-icon> 新增记录
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="page-card">
      <el-form :inline="true" :model="filters" size="default">
        <el-form-item label="类型">
          <el-select v-model="listType" placeholder="全部" style="width: 120px" @change="handleSearch">
            <el-option label="全部" value="all" />
            <el-option label="支出" value="expense" />
            <el-option label="收入" value="income" />
          </el-select>
        </el-form-item>
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

    <!-- 列表 -->
    <div class="page-card">
      <div v-if="combinedList.length === 0" style="text-align: center; padding: 60px 0; color: #909399;">
        <el-icon :size="48" style="margin-bottom: 12px;"><FolderDelete /></el-icon>
        <p>暂无记录</p>
      </div>

      <!-- 按月份分组 -->
      <div v-for="(group, monthKey) in groupedList" :key="monthKey">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; color: #606266; padding: 12px 0 8px; border-bottom: 1px solid #e4e7ed; margin-bottom: 4px;">
          <span>{{ formatMonthKey(monthKey) }}</span>
          <span>
            <span style="color: #f56c6c; font-weight: 400; font-size: 12px;">支出 ¥{{ group.expenseTotal.toFixed(2) }}</span>
            <span style="color: #67c23a; font-weight: 400; font-size: 12px; margin-left: 12px;">收入 ¥{{ group.incomeTotal.toFixed(2) }}</span>
          </span>
        </div>
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

      <!-- 分页 -->
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

const listType = ref('all')
const dateRange = ref<string[]>([])
const filterCategory = ref<number[]>([])
const currentPage = ref(1)
const pageSize = 50
const totalCount = ref(0)

const filters = reactive({
  dateFrom: '',
  dateTo: '',
  category_id: undefined as number | undefined
})

// 全部分类选项
const allCategoryOptions = computed(() => categoryStore.getCategoryOptions())

// 合并后的列表（expense + income，排序）
const combinedList = computed(() => {
  const expenses = expenseStore.expenseList.map(e => ({ ...e, _type: 'expense', _id: `e-${e.id}` }))
  const incomes = incomeStore.incomeList.map(i => ({ ...i, _type: 'income', _id: `i-${i.id}` }))

  if (listType.value === 'expense') return expenses
  if (listType.value === 'income') return incomes

  const all = [...expenses, ...incomes]
  all.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date)
    if (dateCmp !== 0) return dateCmp
    return (b.created_at || '').localeCompare(a.created_at || '')
  })
  return all
})

// 按月分组
const groupedList = computed(() => {
  const groups: Record<string, { items: any[], expenseTotal: number, incomeTotal: number }> = {}
  for (const item of combinedList.value) {
    const monthKey = item.date.substring(0, 7)
    if (!groups[monthKey]) {
      groups[monthKey] = { items: [], expenseTotal: 0, incomeTotal: 0 }
    }
    groups[monthKey].items.push(item)
    if (item._type === 'income') {
      groups[monthKey].incomeTotal += item.amount
    } else {
      groups[monthKey].expenseTotal += item.amount
    }
  }
  return groups
})

function formatMonthKey(key: string) {
  const [y, m] = key.split('-')
  return `${y}年${parseInt(m)}月`
}

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

async function handleSearch() {
  if (dateRange.value && dateRange.value.length === 2) {
    filters.dateFrom = dateRange.value[0]
    filters.dateTo = dateRange.value[1]
  } else {
    filters.dateFrom = ''
    filters.dateTo = ''
  }
  filters.category_id = filterCategory.value.length > 1 ? filterCategory.value[1] : undefined
  currentPage.value = 1
  await loadData()
}

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

  // 根据筛选类型更新总记录数
  if (listType.value === 'expense') {
    totalCount.value = expenseStore.totalCount
  } else if (listType.value === 'income') {
    totalCount.value = incomeStore.totalCount
  } else {
    // "全部" 模式下取两者较大值作为分页基准
    totalCount.value = Math.max(expenseStore.totalCount, incomeStore.totalCount)
  }
}

async function handleDelete(item: any) {
  if (item._type === 'income') {
    await incomeStore.deleteIncome(item.id)
  } else {
    await expenseStore.deleteExpense(item.id)
  }
  ElMessage.success('已删除')
  await loadData()
}

async function handlePageChange() {
  await loadData()
}

onMounted(async () => {
  await Promise.all([
    expenseStore.fetchCurrentMonth(),
    incomeStore.fetchCurrentMonth(),
    categoryStore.fetchCategories(),
    loadData()
  ])
})
</script>
