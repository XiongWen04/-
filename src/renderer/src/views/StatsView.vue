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

    <!-- 月度总览 -->
    <div class="stat-card">
      <div class="stat-label">{{ currentMonth }} 支出</div>
      <div class="stat-value">¥{{ totalAmount.toFixed(2) }}</div>
      <div class="stat-sub">共 {{ expenseCount }} 笔记录</div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <!-- 每日趋势 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">每日支出趋势</h3>
        <div v-if="dailyChartData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="trendChartRef" style="height: 300px;"></div>
      </div>

      <!-- 分类占比 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">分类支出占比</h3>
        <div v-if="pieChartData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="pieChartRef" style="height: 300px;"></div>
      </div>
    </div>

    <!-- 每日明细 -->
    <div class="page-card" style="margin-top: 16px;">
      <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">每日明细</h3>
      <div v-if="Object.keys(dailyData).length === 0" style="text-align: center; padding: 40px; color: #909399;">
        暂无数据
      </div>
      <div v-for="(expenses, date) in dailyData" :key="date">
        <div style="font-size: 14px; font-weight: 600; color: #606266; padding: 12px 0 8px; border-bottom: 1px solid #e4e7ed;">
          {{ date }}
          <span style="font-weight: 400; color: #f56c6c; margin-left: 8px;">
            ¥{{ expenses.reduce((s: number, e: any) => s + e.amount, 0).toFixed(2) }}
          </span>
        </div>
        <div v-for="item in expenses" :key="item.id" class="expense-item">
          <div class="expense-icon">
            <el-icon><component :is="getIconComponent(item.category_icon)" /></el-icon>
          </div>
          <div class="expense-info">
            <div class="expense-category">{{ item.parent_category_name || item.category_name }}</div>
            <div class="expense-note">{{ item.note || item.category_name }}</div>
          </div>
          <div class="expense-amount">
            ¥{{ item.amount.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useExpenseStore } from '@/stores/expenses'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import * as icons from '@element-plus/icons-vue'

const expenseStore = useExpenseStore()

const currentMonth = ref(dayjs().format('YYYY-MM'))
const trendChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const totalAmount = ref(0)
const expenseCount = ref(0)
const dailyData = ref<Record<string, any[]>>({})
const dailyChartData = ref<{ date: string; amount: number }[]>([])
const pieChartData = ref<{ name: string; value: number }[]>([])

function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    food: 'ForkSpoon', car: 'Van', 'shopping-bag': 'ShoppingBag',
    home: 'House', camera: 'Camera', 'first-aid-kit': 'FirstAidKit',
    reading: 'Reading', 'chat-line-square': 'ChatLineSquare', more: 'More'
  }
  const name = iconMap[iconName] || iconName
  return (icons as any)[name] || icons.Coin
}

async function loadData() {
  const ym = currentMonth.value.split('-')
  const year = parseInt(ym[0])
  const month = parseInt(ym[1])

  const [monthData, categoryStats] = await Promise.all([
    expenseStore.fetchMonth(year, month),
    window.electronAPI.db.getCategoryStats(year, month)
  ])

  totalAmount.value = monthData.totalAmount
  expenseCount.value = monthData.count
  dailyData.value = monthData.daily

  // 准备每日趋势数据
  const daysInMonth = dayjs(`${year}-${month}`).daysInMonth()
  const chartData: { date: string; amount: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentMonth.value}-${String(d).padStart(2, '0')}`
    const dayExpenses = monthData.daily[dateStr] || []
    const dayTotal = dayExpenses.reduce((s: number, e: any) => s + e.amount, 0)
    chartData.push({ date: String(d), amount: dayTotal })
  }
  dailyChartData.value = chartData

  pieChartData.value = categoryStats as { name: string; value: number }[]

  nextTick(() => {
    renderCharts()
  })
}

function renderCharts() {
  // 趋势图
  if (trendChartRef.value) {
    if (!trendChart) trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dailyChartData.value.map(d => d.date),
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '¥{value}' }
      },
      series: [{
        data: dailyChartData.value.map(d => d.amount),
        type: 'line',
        smooth: true,
        lineStyle: { color: '#409eff', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.3)' },
            { offset: 1, color: 'rgba(64,158,255,0.05)' }
          ])
        },
        itemStyle: { color: '#409eff' }
      }]
    })
  }

  // 饼图
  if (pieChartRef.value) {
    if (!pieChart) pieChart = echarts.init(pieChartRef.value)
    const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0', '#ffc53d']
    pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ¥{c} ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          formatter: '{b}\n¥{c}',
          fontSize: 11
        },
        data: pieChartData.value.map((d, i) => ({
          ...d,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }]
    })
  }
}

async function handleMonthChange() {
  await loadData()
}

onMounted(async () => {
  await loadData()
  // 窗口大小改变时重绘
  window.addEventListener('resize', () => {
    trendChart?.resize()
    pieChart?.resize()
  })
})
</script>
