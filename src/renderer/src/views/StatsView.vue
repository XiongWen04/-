<template>
  <div>
    <div class="page-header">
      <h2>数据统计</h2>
      <div>
        <el-date-picker
          v-model="currentMonth"
          type="month"
          value-format="YYYY-MM"
          style="width: 150px"
          @change="handleMonthChange"
        />
      </div>
    </div>

    <!-- 月度收支对比 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="stat-card" style="background: linear-gradient(135deg, #f56c6c, #e04040);">
        <div class="stat-label">{{ currentMonth }} 支出</div>
        <div class="stat-value">¥{{ expenseTotal.toFixed(2) }}</div>
        <div class="stat-sub">共 {{ expenseCount }} 笔</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #67c23a, #4fa82e);">
        <div class="stat-label">{{ currentMonth }} 收入</div>
        <div class="stat-value">¥{{ incomeTotal.toFixed(2) }}</div>
        <div class="stat-sub">共 {{ incomeCount }} 笔</div>
      </div>
    </div>

    <!-- 结余卡片 -->
    <div class="page-card" style="text-align: center; padding: 16px; margin-bottom: 16px;">
      <span style="font-size: 14px; color: #909399;">结余</span>
      <div :style="{ fontSize: '28px', fontWeight: 700, color: balance >= 0 ? '#67c23a' : '#f56c6c', marginTop: '4px' }">
        ¥{{ Math.abs(balance).toFixed(2) }}
        <span style="font-size: 14px; margin-left: 6px;">{{ balance >= 0 ? '盈余' : '超支' }}</span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <!-- 收支趋势对比 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">每日收支趋势</h3>
        <div v-if="dailyChartData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="trendChartRef" style="height: 300px;"></div>
      </div>

      <!-- 支出分类占比 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">支出分类占比</h3>
        <div v-if="expensePieData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="expensePieRef" style="height: 300px;"></div>
      </div>

      <!-- 收入分类占比 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">收入分类占比</h3>
        <div v-if="incomePieData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="incomePieRef" style="height: 300px;"></div>
      </div>

      <!-- 月度收支对比柱状图 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">年度月度收支对比</h3>
        <div v-if="yearlyChartData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="yearlyChartRef" style="height: 300px;"></div>
      </div>
    </div>

    <!-- 每日明细 -->
    <div class="page-card">
      <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">每日明细</h3>
      <div v-if="Object.keys(dailyData).length === 0" style="text-align: center; padding: 40px; color: #909399;">
        暂无数据
      </div>
      <div v-for="(items, date) in dailyData" :key="date">
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: #606266; padding: 12px 0 8px; border-bottom: 1px solid #e4e7ed;">
          <span>{{ date }}</span>
          <span>
            <span style="color: #f56c6c; font-weight: 400;">支出 ¥{{ getDayExpenseTotal(date).toFixed(2) }}</span>
            <span style="color: #67c23a; font-weight: 400; margin-left: 12px;">收入 ¥{{ getDayIncomeTotal(date).toFixed(2) }}</span>
          </span>
        </div>
        <div v-for="item in items" :key="item._id || item.id" class="expense-item">
          <div class="expense-icon" :style="{ background: item._type === 'income' ? '#f0f9eb' : '#ecf5ff', color: item._type === 'income' ? '#67c23a' : '#409eff' }">
            <el-icon><component :is="getIconComponent(item.category_icon)" /></el-icon>
          </div>
          <div class="expense-info">
            <div class="expense-category">{{ item.parent_category_name || item.category_name }}</div>
            <div class="expense-note">{{ item.note || item.category_name }}</div>
          </div>
          <div class="expense-amount" :style="{ color: item._type === 'income' ? '#67c23a' : '#f56c6c' }">
            {{ item._type === 'income' ? '+' : '-' }}¥{{ item.amount.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useExpenseStore } from '@/stores/expenses'
import { useIncomeStore } from '@/stores/incomes'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import * as icons from '@element-plus/icons-vue'

const expenseStore = useExpenseStore()
const incomeStore = useIncomeStore()

const currentMonth = ref(dayjs().format('YYYY-MM'))
const trendChartRef = ref<HTMLElement>()
const expensePieRef = ref<HTMLElement>()
const incomePieRef = ref<HTMLElement>()
const yearlyChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let expensePieChart: echarts.ECharts | null = null
let incomePieChart: echarts.ECharts | null = null
let yearlyChart: echarts.ECharts | null = null

const expenseTotal = ref(0)
const expenseCount = ref(0)
const incomeTotal = ref(0)
const incomeCount = ref(0)
const balance = computed(() => incomeTotal.value - expenseTotal.value)
const dailyData = ref<Record<string, any[]>>({})
const dailyChartData = ref<{ date: string; expense: number; income: number }[]>([])
const expensePieData = ref<{ name: string; value: number }[]>([])
const incomePieData = ref<{ name: string; value: number }[]>([])
const yearlyChartData = ref<{ month: string; expense: number; income: number }[]>([])

// 用于每日明细的收入/支出分开计算
const expenseDaily = ref<Record<string, any[]>>({})
const incomeDaily = ref<Record<string, any[]>>({})

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

function getDayExpenseTotal(date: string) {
  return (expenseDaily.value[date] || []).reduce((s: number, e: any) => s + e.amount, 0)
}

function getDayIncomeTotal(date: string) {
  return (incomeDaily.value[date] || []).reduce((s: number, e: any) => s + e.amount, 0)
}

async function loadData() {
  const ym = currentMonth.value.split('-')
  const year = parseInt(ym[0])
  const month = parseInt(ym[1])

  const [expenseMonthData, incomeMonthData, expenseCategoryStats, incomeCategoryStats, yearlyExpenseStats, yearlyIncomeStats] = await Promise.all([
    expenseStore.fetchMonth(year, month),
    incomeStore.fetchMonth(year, month),
    window.electronAPI.db.getCategoryStats(year, month),
    window.electronAPI.db.getIncomeCategoryStats(year, month),
    window.electronAPI.db.getYearlyStats(year),
    window.electronAPI.db.getYearlyIncomeStats(year)
  ])

  expenseTotal.value = expenseMonthData.totalAmount
  expenseCount.value = expenseMonthData.count
  incomeTotal.value = incomeMonthData.totalAmount
  incomeCount.value = incomeMonthData.count
  expenseDaily.value = expenseMonthData.daily
  incomeDaily.value = incomeMonthData.daily

  // 合并每日明细（支出 + 收入）
  const allDates = new Set([...Object.keys(expenseMonthData.daily), ...Object.keys(incomeMonthData.daily)])
  const merged: Record<string, any[]> = {}
  for (const date of [...allDates].sort().reverse()) {
    const expenseItems = (expenseMonthData.daily[date] || []).map((e: any) => ({ ...e, _type: 'expense', _id: `e-${e.id}` }))
    const incomeItems = (incomeMonthData.daily[date] || []).map((i: any) => ({ ...i, _type: 'income', _id: `i-${i.id}` }))
    merged[date] = [...expenseItems, ...incomeItems].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    )
  }
  dailyData.value = merged

  // 每日趋势（含收支双线）
  const daysInMonth = dayjs(`${year}-${month}`).daysInMonth()
  const chartData: { date: string; expense: number; income: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentMonth.value}-${String(d).padStart(2, '0')}`
    const dayExpense = (expenseMonthData.daily[dateStr] || []).reduce((s: number, e: any) => s + e.amount, 0)
    const dayIncome = (incomeMonthData.daily[dateStr] || []).reduce((s: number, e: any) => s + e.amount, 0)
    chartData.push({ date: String(d), expense: dayExpense, income: dayIncome })
  }
  dailyChartData.value = chartData

  expensePieData.value = expenseCategoryStats as { name: string; value: number }[]
  incomePieData.value = incomeCategoryStats as { name: string; value: number }[]

  // 年度月度对比
  const expenseMap: Record<string, number> = {}
  for (const r of (yearlyExpenseStats as any[])) {
    expenseMap[parseInt(r.month)] = r.total
  }
  const incomeMap: Record<string, number> = {}
  for (const r of (yearlyIncomeStats as any[])) {
    incomeMap[parseInt(r.month)] = r.total
  }
  const yearlyData: { month: string; expense: number; income: number }[] = []
  for (let m = 1; m <= 12; m++) {
    yearlyData.push({
      month: `${m}月`,
      expense: expenseMap[m] || 0,
      income: incomeMap[m] || 0
    })
  }
  yearlyChartData.value = yearlyData

  nextTick(() => {
    renderCharts()
  })
}

function renderCharts() {
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0', '#ffc53d']

  // 每日收支趋势
  if (trendChartRef.value) {
    if (!trendChart) trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let s = `<strong>${params[0].axisValue}日</strong><br/>`
          for (const p of params) {
            s += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
          }
          return s
        }
      },
      legend: { data: ['支出', '收入'], bottom: 0, icon: 'circle', itemWidth: 8 },
      grid: { left: '3%', right: '4%', bottom: '20%', top: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dailyChartData.value.map(d => d.date),
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '¥{value}' }
      },
      series: [
        {
          name: '支出',
          data: dailyChartData.value.map(d => d.expense),
          type: 'line',
          smooth: true,
          lineStyle: { color: '#f56c6c', width: 2 },
          itemStyle: { color: '#f56c6c' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245,108,108,0.3)' },
              { offset: 1, color: 'rgba(245,108,108,0.05)' }
            ])
          }
        },
        {
          name: '收入',
          data: dailyChartData.value.map(d => d.income),
          type: 'line',
          smooth: true,
          lineStyle: { color: '#67c23a', width: 2 },
          itemStyle: { color: '#67c23a' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(103,194,58,0.3)' },
              { offset: 1, color: 'rgba(103,194,58,0.05)' }
            ])
          }
        }
      ]
    })
  }

  // 支出饼图
  if (expensePieRef.value) {
    if (!expensePieChart) expensePieChart = echarts.init(expensePieRef.value)
    expensePieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      title: { text: '支出', left: 'center', top: 'center', textStyle: { fontSize: 14, color: '#909399', fontWeight: 400 } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n¥{c}', fontSize: 11 },
        data: expensePieData.value.map((d, i) => ({
          ...d,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }]
    })
  }

  // 收入饼图
  if (incomePieRef.value) {
    if (!incomePieChart) incomePieChart = echarts.init(incomePieRef.value)
    incomePieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      title: { text: '收入', left: 'center', top: 'center', textStyle: { fontSize: 14, color: '#909399', fontWeight: 400 } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n¥{c}', fontSize: 11 },
        data: incomePieData.value.map((d, i) => ({
          ...d,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }]
    })
  }

  // 年度月度收支对比柱状图
  if (yearlyChartRef.value) {
    if (!yearlyChart) yearlyChart = echarts.init(yearlyChartRef.value)
    yearlyChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let s = `<strong>${params[0].axisValue}</strong><br/>`
          for (const p of params) {
            s += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
          }
          return s
        }
      },
      legend: { data: ['支出', '收入'], bottom: 0, icon: 'circle', itemWidth: 8 },
      grid: { left: '3%', right: '4%', bottom: '20%', top: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: yearlyChartData.value.map(d => d.month),
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '¥{value}' }
      },
      series: [
        {
          name: '支出',
          type: 'bar',
          data: yearlyChartData.value.map(d => d.expense),
          itemStyle: { color: '#f56c6c', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '收入',
          type: 'bar',
          data: yearlyChartData.value.map(d => d.income),
          itemStyle: { color: '#67c23a', borderRadius: [4, 4, 0, 0] }
        }
      ]
    })
  }
}

async function handleMonthChange() {
  await loadData()
}

onMounted(async () => {
  await loadData()
  window.addEventListener('resize', () => {
    trendChart?.resize()
    expensePieChart?.resize()
    incomePieChart?.resize()
    yearlyChart?.resize()
  })
})
</script>
