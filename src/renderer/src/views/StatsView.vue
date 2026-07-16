<template>
  <div>
    <div class="page-header">
      <h2>数据统计</h2>
      <!-- 月份选择器：切换统计月份 -->
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

    <!-- ====== 月度收支概览卡片：支出总额 + 收入总额并列 ====== -->
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

    <!-- ====== 结余卡片 ====== -->
    <div class="page-card" style="text-align: center; padding: 16px; margin-bottom: 16px;">
      <span style="font-size: 14px; color: #909399;">结余</span>
      <div :style="{ fontSize: '28px', fontWeight: 700, color: balance >= 0 ? '#67c23a' : '#f56c6c', marginTop: '4px' }">
        ¥{{ Math.abs(balance).toFixed(2) }}
        <span style="font-size: 14px; margin-left: 6px;">{{ balance >= 0 ? '盈余' : '超支' }}</span>
      </div>
    </div>

    <!-- ====== 图表区域：2x2 网格展示四张图表 ====== -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <!-- 每日收支趋势双折线图 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">每日收支趋势</h3>
        <div v-if="dailyChartData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="trendChartRef" style="height: 300px;"></div>
      </div>

      <!-- 支出分类占比饼图 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">支出分类占比</h3>
        <div v-if="expensePieData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="expensePieRef" style="height: 300px;"></div>
      </div>

      <!-- 收入分类占比饼图 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">收入分类占比</h3>
        <div v-if="incomePieData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="incomePieRef" style="height: 300px;"></div>
      </div>

      <!-- 年度月度收支对比柱状图 -->
      <div class="page-card">
        <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">年度月度收支对比</h3>
        <div v-if="yearlyChartData.length === 0" style="text-align: center; padding: 40px; color: #909399;">
          暂无数据
        </div>
        <div v-else ref="yearlyChartRef" style="height: 300px;"></div>
      </div>
    </div>

    <!-- ====== 每日明细：按日期列出的收支明细 ====== -->
    <div class="page-card">
      <h3 style="margin-bottom: 16px; font-size: 15px; color: #303133;">每日明细</h3>
      <div v-if="Object.keys(dailyData).length === 0" style="text-align: center; padding: 40px; color: #909399;">
        暂无数据
      </div>
      <!-- 按日期倒序展示明细，每天分支出/收入合计 -->
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

/** 当前选中的统计月份（YYYY-MM 格式） */
const currentMonth = ref(dayjs().format('YYYY-MM'))

// 四张图表的 DOM 容器 ref
const trendChartRef = ref<HTMLElement>()      // 每日收支趋势折线图容器
const expensePieRef = ref<HTMLElement>()       // 支出分类占比饼图容器
const incomePieRef = ref<HTMLElement>()        // 收入分类占比饼图容器
const yearlyChartRef = ref<HTMLElement>()      // 年度月度对比柱状图容器

// ECharts 实例缓存（复用实例避免重复创建，利用 resize 自适应）
let trendChart: echarts.ECharts | null = null
let expensePieChart: echarts.ECharts | null = null
let incomePieChart: echarts.ECharts | null = null
let yearlyChart: echarts.ECharts | null = null

/** 当月支出总额 */
const expenseTotal = ref(0)
/** 当月支出笔数 */
const expenseCount = ref(0)
/** 当月收入总额 */
const incomeTotal = ref(0)
/** 当月收入笔数 */
const incomeCount = ref(0)
/** 结余 = 收入 - 支出 */
const balance = computed(() => incomeTotal.value - expenseTotal.value)
/** 每日明细数据：{ "YYYY-MM-DD": [记录列表] } */
const dailyData = ref<Record<string, any[]>>({})
/** 每日趋势数据：{ date, expense, income } 用于折线图 */
const dailyChartData = ref<{ date: string; expense: number; income: number }[]>([])
/** 支出分类占比数据 [{ name, value }] */
const expensePieData = ref<{ name: string; value: number }[]>([])
/** 收入分类占比数据 [{ name, value }] */
const incomePieData = ref<{ name: string; value: number }[]>([])
/** 年度月度对比数据 [{ month, expense, income }] 用于柱状图 */
const yearlyChartData = ref<{ month: string; expense: number; income: number }[]>([])

/** 每日支出明细（用于单独计算某天支出合计） */
const expenseDaily = ref<Record<string, any[]>>({})
/** 每日收入明细（用于单独计算某天收入合计） */
const incomeDaily = ref<Record<string, any[]>>({})

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
 * 获取某一天的支出合计
 * @param date - 日期字符串 "YYYY-MM-DD"
 * @returns 该天所有支出金额之和
 */
function getDayExpenseTotal(date: string) {
  return (expenseDaily.value[date] || []).reduce((s: number, e: any) => s + e.amount, 0)
}

/**
 * 获取某一天的收入合计
 * @param date - 日期字符串 "YYYY-MM-DD"
 * @returns 该天所有收入金额之和
 */
function getDayIncomeTotal(date: string) {
  return (incomeDaily.value[date] || []).reduce((s: number, e: any) => s + e.amount, 0)
}

/**
 * 加载指定月份的全部统计数据
 * @description
 * 并行发 6 个请求获取数据：
 * 1. 当月支出月度统计（含每日明细）
 * 2. 当月收入月度统计（含每日明细）
 * 3. 当月支出分类统计（饼图用）
 * 4. 当月收入分类统计（饼图用）
 * 5. 当年各月支出统计（柱状图用）
 * 6. 当年各月收入统计（柱状图用）
 * 数据到齐后拼装出 dailyData / dailyChartData / pieData / yearlyData，再渲染图表
 */
async function loadData() {
  const ym = currentMonth.value.split('-')
  const year = parseInt(ym[0])
  const month = parseInt(ym[1])

  // 并行拉取 6 组数据
  const [expenseMonthData, incomeMonthData, expenseCategoryStats, incomeCategoryStats, yearlyExpenseStats, yearlyIncomeStats] = await Promise.all([
    expenseStore.fetchMonth(year, month),
    incomeStore.fetchMonth(year, month),
    window.electronAPI.db.getCategoryStats(year, month),
    window.electronAPI.db.getIncomeCategoryStats(year, month),
    window.electronAPI.db.getYearlyStats(year),
    window.electronAPI.db.getYearlyIncomeStats(year)
  ])

  // 更新顶部卡片数据
  expenseTotal.value = expenseMonthData.totalAmount
  expenseCount.value = expenseMonthData.count
  incomeTotal.value = incomeMonthData.totalAmount
  incomeCount.value = incomeMonthData.count
  expenseDaily.value = expenseMonthData.daily
  incomeDaily.value = incomeMonthData.daily

  // 合并每日明细：将所有日期取并集，各自带上 _type 标记，按创建时间倒序
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

  // 构建每日趋势数据：遍历当月每一天，计算该天收支金额（无记录则为 0）
  const daysInMonth = dayjs(`${year}-${month}`).daysInMonth()
  const chartData: { date: string; expense: number; income: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentMonth.value}-${String(d).padStart(2, '0')}`
    const dayExpense = (expenseMonthData.daily[dateStr] || []).reduce((s: number, e: any) => s + e.amount, 0)
    const dayIncome = (incomeMonthData.daily[dateStr] || []).reduce((s: number, e: any) => s + e.amount, 0)
    chartData.push({ date: String(d), expense: dayExpense, income: dayIncome })
  }
  dailyChartData.value = chartData

  // 饼图数据直接使用后端统计结果
  expensePieData.value = expenseCategoryStats as { name: string; value: number }[]
  incomePieData.value = incomeCategoryStats as { name: string; value: number }[]

  // 构建年度月度对比数据：将后端返回的月度统计按 [1-12] 补齐
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
      expense: expenseMap[m] || 0,  // 无记录月份补 0 以便柱状图连续展示
      income: incomeMap[m] || 0
    })
  }
  yearlyChartData.value = yearlyData

  // 数据就绪后下一帧渲染图表（需要 DOM 先更新）
  nextTick(() => {
    renderCharts()
  })
}

/**
 * 渲染全部四个 ECharts 图表
 * @description 每个图表独立配置，使用 echarts.init 单例模式
 * ——只初始化一次，后续用 setOption 更新数据，
 * 避免重复 init 导致内存泄漏或白屏闪烁
 */
function renderCharts() {
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0', '#ffc53d']

  // ---- 图表1: 每日收支趋势双折线图 ----
  // 作用：对比当月每日支出和收入的变化趋势，直观看出"花超"或"收入高峰"的日子
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
          smooth: true,                  // 平滑曲线，让趋势更易读
          lineStyle: { color: '#f56c6c', width: 2 },
          itemStyle: { color: '#f56c6c' },
          areaStyle: {                   // 渐变填充区域增强视觉冲击
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

  // ---- 图表2: 支出分类占比饼图 ----
  // 作用：展示当月各支出大类占总花销的比例，直观看出钱花在哪最多
  if (expensePieRef.value) {
    if (!expensePieChart) expensePieChart = echarts.init(expensePieRef.value)
    expensePieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      title: { text: '支出', left: 'center', top: 'center', textStyle: { fontSize: 14, color: '#909399', fontWeight: 400 } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],   // 环形饼图，内径 40% 外径 70%
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

  // ---- 图表3: 收入分类占比饼图 ----
  // 作用：展示当月各收入大类的占比，快速了解收入构成
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

  // ---- 图表4: 年度月度收支对比柱状图 ----
  // 作用：全年 1-12 月收支对比，便于发现月份规律（如双十一支出高峰）
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

/**
 * 月份切换事件
 * @description 当选中的月份改变时重新加载该月份的所有统计数据
 */
async function handleMonthChange() {
  await loadData()
}

/**
 * 页面挂载时：加载当月数据 + 监听窗口 resize 让图表自适应
 * @description 窗口大小变化时调用所有图表实例的 resize 方法，
 * 确保图表在布局变化后不会变形或出现空白
 */
onMounted(async () => {
  await loadData()
  // 监听窗口 resize 事件，自动调整所有 ECharts 图表尺寸
  window.addEventListener('resize', () => {
    trendChart?.resize()
    expensePieChart?.resize()
    incomePieChart?.resize()
    yearlyChart?.resize()
  })
})
</script>
