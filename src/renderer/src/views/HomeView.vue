<template>
  <div>
    <!-- 收支概览卡片 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="stat-card" style="background: linear-gradient(135deg, #f56c6c, #e04040);">
        <div class="stat-label">本月支出</div>
        <div class="stat-value">¥{{ currentMonthTotal.toFixed(2) }}</div>
        <div class="stat-sub">共 {{ currentMonthCount }} 笔记录</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #67c23a, #4fa82e);">
        <div class="stat-label">本月收入</div>
        <div class="stat-value">¥{{ incomeMonthTotal.toFixed(2) }}</div>
        <div class="stat-sub">共 {{ incomeMonthCount }} 笔记录</div>
      </div>
    </div>

    <!-- 结余 -->
    <div class="page-card" style="text-align: center; padding: 16px;">
      <span style="font-size: 14px; color: #909399;">本月结余</span>
      <div :style="{ fontSize: '28px', fontWeight: 700, color: balance >= 0 ? '#67c23a' : '#f56c6c', marginTop: '4px' }">
        ¥{{ Math.abs(balance).toFixed(2) }}
        <span style="font-size: 14px; margin-left: 6px;">{{ balance >= 0 ? '盈余' : '超支' }}</span>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="page-card">
      <h3 style="margin-bottom: 12px; font-size: 15px; color: #303133;">快捷记账</h3>
      <div class="quick-actions">
        <button
          v-for="cat in quickCategories"
          :key="cat.id"
          class="quick-action-btn"
          @click="quickAddExpense(cat)"
        >
          <el-icon><component :is="getIconComponent(cat.icon)" /></el-icon>
          <span>{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- 最近记录 -->
    <div class="page-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 15px; color: #303133; margin: 0;">最近支出</h3>
        <el-button text type="primary" size="small" @click="$router.push('/list')">查看全部</el-button>
      </div>
      <div v-if="recentExpenses.length === 0" style="text-align: center; padding: 32px; color: #909399;">
        还没有花销记录，开始记一笔吧！
      </div>
      <div v-for="item in recentExpenses" :key="item.id" class="expense-item">
        <div class="expense-icon">
          <el-icon><component :is="getIconComponent(item.category_icon)" /></el-icon>
        </div>
        <div class="expense-info">
          <div class="expense-category">{{ item.parent_category_name || item.category_name }}</div>
          <div class="expense-note">{{ item.note || item.category_name }}</div>
        </div>
        <div class="expense-amount" style="color: #f56c6c;">
          ¥{{ item.amount.toFixed(2) }}
          <span class="expense-date">{{ item.date }}</span>
        </div>
      </div>
    </div>

    <!-- 本月分类占比 -->
    <div class="page-card">
      <h3 style="margin-bottom: 12px; font-size: 15px; color: #303133;">本月支出分类占比</h3>
      <div v-if="categoryStats.length === 0" style="text-align: center; padding: 32px; color: #909399;">
        暂无数据
      </div>
      <div v-for="stat in categoryStats" :key="stat.id" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
          <span>{{ stat.name }}</span>
          <span>¥{{ stat.total.toFixed(2) }}</span>
        </div>
        <el-progress
          :percentage="Math.round((stat.total / currentMonthTotal) * 100)"
          :stroke-width="8"
          :color="getProgressColor(stat.name)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '@/stores/expenses'
import { useIncomeStore } from '@/stores/incomes'
import { useCategoryStore } from '@/stores/categories'
import * as icons from '@element-plus/icons-vue'

const router = useRouter()
const expenseStore = useExpenseStore()
const incomeStore = useIncomeStore()
const categoryStore = useCategoryStore()

const quickCategories = computed(() => categoryStore.categories.filter(c => c.type === 'expense').slice(0, 8))
const currentMonthTotal = computed(() => expenseStore.currentMonthTotal)
const currentMonthCount = computed(() => expenseStore.currentMonthCount)
const incomeMonthTotal = computed(() => incomeStore.currentMonthTotal)
const incomeMonthCount = computed(() => incomeStore.currentMonthCount)
const balance = computed(() => incomeMonthTotal.value - currentMonthTotal.value)
const recentExpenses = computed(() => expenseStore.expenseList.slice(0, 5))
const categoryStats = computed(() => expenseStore.currentMonthData?.categoryTotal || [])

function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    food: 'ForkSpoon', car: 'Van', 'shopping-bag': 'ShoppingBag',
    home: 'House', camera: 'Camera', 'first-aid-kit': 'FirstAidKit',
    reading: 'Reading', 'chat-line-square': 'ChatLineSquare', more: 'More',
    money: 'Money', 'trend-charts': 'TrendCharts', present: 'Present',
    'more-filled': 'MoreFilled'
  }
  const name = iconMap[iconName] || iconName
  return (icons as any)[name] || icons.Coin
}

function getProgressColor(name: string) {
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0', '#ffc53d']
  const index = categoryStats.value.findIndex(s => s.name === name)
  return colors[index % colors.length]
}

function quickAddExpense(cat: any) {
  router.push({ path: '/add', query: { parentId: String(cat.id) } })
}

onMounted(async () => {
  await Promise.all([
    expenseStore.fetchCurrentMonth(),
    expenseStore.fetchExpenses(),
    incomeStore.fetchCurrentMonth(),
    categoryStore.fetchCategories()
  ])
})
</script>
