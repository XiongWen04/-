<template>
  <div>
    <!-- ====== 收支概览卡片区：本月支出和本月收入并列展示 ====== -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="stat-card" style="background: linear-gradient(135deg, #f56c6c, #e04040);">
        <div class="stat-label">本月支出</div>
        <!-- 支出金额用红色高亮，toFixed(2) 强制保留两位小数避免浮点显示问题 -->
        <div class="stat-value">¥{{ currentMonthTotal.toFixed(2) }}</div>
        <div class="stat-sub">共 {{ currentMonthCount }} 笔记录</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #67c23a, #4fa82e);">
        <div class="stat-label">本月收入</div>
        <div class="stat-value">¥{{ incomeMonthTotal.toFixed(2) }}</div>
        <div class="stat-sub">共 {{ incomeMonthCount }} 笔记录</div>
      </div>
    </div>

    <!-- ====== 结余区：收入-支出，正数绿色盈余/负数红色超支 ====== -->
    <div class="page-card" style="text-align: center; padding: 16px;">
      <span style="font-size: 14px; color: #909399;">本月结余</span>
      <!-- 结余正负决定颜色和文案，取绝对值展示金额本身 -->
      <div :style="{ fontSize: '28px', fontWeight: 700, color: balance >= 0 ? '#67c23a' : '#f56c6c', marginTop: '4px' }">
        ¥{{ Math.abs(balance).toFixed(2) }}
        <span style="font-size: 14px; margin-left: 6px;">{{ balance >= 0 ? '盈余' : '超支' }}</span>
      </div>
    </div>

    <!-- ====== 快捷记账区：取前 8 个支出分类作为快捷按钮 ====== -->
    <div class="page-card">
      <h3 style="margin-bottom: 12px; font-size: 15px; color: #303133;">快捷记账</h3>
      <div class="quick-actions">
        <button
          v-for="cat in quickCategories"
          :key="cat.id"
          class="quick-action-btn"
          @click="quickAddExpense(cat)"
        >
          <!-- 图标映射：将数据库中的 icon 名字映射为 Element Plus 图标组件 -->
          <el-icon><component :is="getIconComponent(cat.icon)" /></el-icon>
          <span>{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- ====== 最近记录区：只展示最近 5 条支出 ====== -->
    <div class="page-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 15px; color: #303133; margin: 0;">最近支出</h3>
        <!-- 引导用户进入完整的收支明细页面 -->
        <el-button text type="primary" size="small" @click="$router.push('/list')">查看全部</el-button>
      </div>
      <div v-if="recentExpenses.length === 0" style="text-align: center; padding: 32px; color: #909399;">
        还没有花销记录，开始记一笔吧！
      </div>
      <!-- 每条记录展示图标、分类名、金额和日期 -->
      <div v-for="item in recentExpenses" :key="item.id" class="expense-item">
        <div class="expense-icon">
          <el-icon><component :is="getIconComponent(item.category_icon)" /></el-icon>
        </div>
        <div class="expense-info">
          <div class="expense-category">{{ item.parent_category_name || item.category_name }}</div>
          <!-- 优先展示用户填写的备注，无备注时退而显示分类名兜底 -->
          <div class="expense-note">{{ item.note || item.category_name }}</div>
        </div>
        <div class="expense-amount" style="color: #f56c6c;">
          ¥{{ item.amount.toFixed(2) }}
          <span class="expense-date">{{ item.date }}</span>
        </div>
      </div>
    </div>

    <!-- ====== 本月支出分类占比区：进度条展示各分类支出占比 ====== -->
    <div class="page-card">
      <h3 style="margin-bottom: 12px; font-size: 15px; color: #303133;">本月支出分类占比</h3>
      <div v-if="categoryStats.length === 0" style="text-align: center; padding: 32px; color: #909399;">
        暂无数据
      </div>
      <!-- 每行展示一个分类，通过 percentage 算出占比宽度 -->
      <div v-for="stat in categoryStats" :key="stat.id" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
          <span>{{ stat.name }}</span>
          <span>¥{{ stat.total.toFixed(2) }}</span>
        </div>
        <!-- percentage = 该分类金额 / 总支出 * 100，取整展示 -->
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

/**
 * 快捷记账分类列表：取前 8 个支出分类作为首页快捷按钮
 * @description 只展示支出分类（用户日常记支出最多），截取前 8 个避免按钮太多
 */
const quickCategories = computed(() => categoryStore.categories.filter(c => c.type === 'expense').slice(0, 8))
/** 本月支出总金额，来自 expenseStore 的 monthly 统计结果 */
const currentMonthTotal = computed(() => expenseStore.currentMonthTotal)
/** 本月支出笔数 */
const currentMonthCount = computed(() => expenseStore.currentMonthCount)
/** 本月收入总金额 */
const incomeMonthTotal = computed(() => incomeStore.currentMonthTotal)
/** 本月收入笔数 */
const incomeMonthCount = computed(() => incomeStore.currentMonthCount)
/**
 * 结余 = 收入 - 支出，正数盈余、负数超支
 * @description 注意：结余展示绝对值 + 文案，所以需要同时依赖收入和支出两个 store
 */
const balance = computed(() => incomeMonthTotal.value - currentMonthTotal.value)
/** 最近 5 条支出记录（从 expenseList 头部切片） */
const recentExpenses = computed(() => expenseStore.expenseList.slice(0, 5))
/** 本月各支出分类的合计数据，来自后端每月统计查询 */
const categoryStats = computed(() => expenseStore.currentMonthData?.categoryTotal || [])

/**
 * 将数据库中存储的 icon 名称映射为 Element Plus 图标组件
 * @param iconName - 数据库中存储的图标标识（如 'food', 'car'）
 * @returns 对应的 Element Plus 图标组件，找不到时兜底返回 Coin 图标
 */
function getIconComponent(iconName: string) {
  // 内部短名 → Element Plus 图标组件名的映射表
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

/**
 * 为分类占比进度条分配颜色
 * @description 按分类在 categoryStats 数组中的顺序循环取色，保证同一分类始终同色
 * @param name - 分类名称
 * @returns 十六进制颜色值
 */
function getProgressColor(name: string) {
  // 预置 9 种颜色，按数组下标循环
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0', '#ffc53d']
  const index = categoryStats.value.findIndex(s => s.name === name)
  return colors[index % colors.length]
}

/**
 * 快捷记一笔：点击快捷按钮跳转到记账页并预选分类
 * @param cat - 选中的一级分类对象，将 id 作为 query 参数传递
 */
function quickAddExpense(cat: any) {
  router.push({ path: '/add', query: { parentId: String(cat.id) } })
}

/**
 * 页面挂载时并行拉取首页所需的所有数据
 * @description 同时获取当月收支、全部收支列表和分类数据
 * 使用 Promise.all 并发加载，减少串行等待时间
 */
onMounted(async () => {
  await Promise.all([
    expenseStore.fetchCurrentMonth(),
    expenseStore.fetchExpenses(),
    incomeStore.fetchCurrentMonth(),
    categoryStore.fetchCategories()
  ])
})
</script>
