<template>
  <div>
    <div class="page-header">
      <h2>花销列表</h2>
      <div>
        <el-button type="primary" @click="$router.push('/add')">
          <el-icon><Plus /></el-icon> 新增记录
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="page-card">
      <el-form :inline="true" :model="filters" size="default">
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
            :options="categoryOptions"
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
      <div v-if="expenseList.length === 0" style="text-align: center; padding: 60px 0; color: #909399;">
        <el-icon :size="48" style="margin-bottom: 12px;"><FolderDelete /></el-icon>
        <p>暂无花销记录</p>
      </div>

      <!-- 按月份分组 -->
      <div v-for="(group, monthKey) in groupedExpenses" :key="monthKey">
        <div style="font-size: 14px; font-weight: 600; color: #606266; padding: 12px 0 8px; border-bottom: 1px solid #e4e7ed; margin-bottom: 4px;">
          {{ monthKey }}
          <span style="font-weight: 400; color: #909399; font-size: 12px; margin-left: 8px;">
            合计：¥{{ group.total.toFixed(2) }}
          </span>
        </div>
        <div v-for="item in group.items" :key="item.id" class="expense-item">
          <div class="expense-icon">
            <el-icon><component :is="getIconComponent(item.category_icon)" /></el-icon>
          </div>
          <div class="expense-info">
            <div class="expense-category">{{ item.parent_category_name || item.category_name }}</div>
            <div class="expense-note">{{ item.note || item.category_name }}</div>
          </div>
          <div class="expense-amount">
            ¥{{ item.amount.toFixed(2) }}
            <span class="expense-date">{{ item.date }}</span>
          </div>
          <div style="margin-left: 12px;">
            <el-popconfirm
              title="确定删除此记录？"
              confirm-button-text="删除"
              @confirm="handleDelete(item.id)"
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
import { useCategoryStore } from '@/stores/categories'
import { ElMessage } from 'element-plus'
import { Plus, Delete, FolderDelete } from '@element-plus/icons-vue'
import * as icons from '@element-plus/icons-vue'

const expenseStore = useExpenseStore()
const categoryStore = useCategoryStore()

const expenseList = computed(() => expenseStore.expenseList)
const totalCount = computed(() => expenseStore.totalCount)
const currentPage = computed({
  get: () => expenseStore.currentPage,
  set: (val) => { expenseStore.currentPage = val }
})
const pageSize = computed(() => expenseStore.pageSize)

const categoryOptions = computed(() => categoryStore.getCategoryOptions())

const dateRange = ref<string[]>([])
const filterCategory = ref<number[]>([])

const filters = reactive({
  dateFrom: '',
  dateTo: '',
  category_id: undefined as number | undefined
})

// 按月份分组
const groupedExpenses = computed(() => {
  const groups: Record<string, { items: any[]; total: number }> = {}
  for (const item of expenseList.value) {
    const monthKey = item.date.substring(0, 7)
    if (!groups[monthKey]) {
      groups[monthKey] = { items: [], total: 0 }
    }
    groups[monthKey].items.push(item)
    groups[monthKey].total += item.amount
  }
  return groups
})

function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    food: 'ForkSpoon', car: 'Van', 'shopping-bag': 'ShoppingBag',
    home: 'House', camera: 'Camera', 'first-aid-kit': 'FirstAidKit',
    reading: 'Reading', 'chat-line-square': 'ChatLineSquare', more: 'More'
  }
  const name = iconMap[iconName] || iconName
  return (icons as any)[name] || icons.Coin
}

function handleSearch() {
  if (dateRange.value && dateRange.value.length === 2) {
    filters.dateFrom = dateRange.value[0]
    filters.dateTo = dateRange.value[1]
  } else {
    filters.dateFrom = ''
    filters.dateTo = ''
  }
  filters.category_id = filterCategory.value.length > 1 ? filterCategory.value[1] : undefined
  expenseStore.currentPage = 1
  loadData()
}

function handleReset() {
  dateRange.value = []
  filterCategory.value = []
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.category_id = undefined
  expenseStore.currentPage = 1
  loadData()
}

async function loadData() {
  await expenseStore.fetchExpenses({
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    category_id: filters.category_id
  })
}

async function handleDelete(id: number) {
  await expenseStore.deleteExpense(id)
  ElMessage.success('已删除')
  loadData()
}

function handlePageChange() {
  loadData()
}

onMounted(async () => {
  await Promise.all([
    expenseStore.fetchCurrentMonth(),
    categoryStore.fetchCategories(),
    loadData()
  ])
})
</script>
