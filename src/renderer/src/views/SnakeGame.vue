<template>
  <div>
    <div class="page-header">
      <h2>🐍 贪吃蛇</h2>
      <div>
        <el-button
          :type="isRunning ? 'warning' : 'success'"
          @click="toggleGame"
        >
          <el-icon><VideoPause v-if="isRunning" /><VideoPlay v-else /></el-icon>
          {{ isRunning && !paused ? '暂停' : isRunning && paused ? '继续' : gameOver ? '重新开始' : '开始游戏' }}
        </el-button>
      </div>
    </div>

    <div class="game-wrapper">
      <!-- 游戏信息栏 -->
      <div class="game-info">
        <div class="info-item">
          <span class="info-label">当前得分</span>
          <span class="info-value score">{{ score }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">最高记录</span>
          <span class="info-value best">{{ bestScore }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">蛇身长度</span>
          <span class="info-value length">{{ snake.length }}</span>
        </div>
      </div>

      <!-- 游戏画布 -->
      <div class="canvas-container">
        <canvas
          ref="canvasRef"
          :width="canvasSize"
          :height="canvasSize"
          class="game-canvas"
        />

        <!-- 游戏结束遮罩 -->
        <div v-if="gameOver && !isRunning" class="game-overlay">
          <div class="game-over-content">
            <h2>游戏结束</h2>
            <p class="final-score">得分：<strong>{{ score }}</strong></p>
            <p v-if="isNewBest" class="new-best">🎉 新纪录！</p>
            <el-button type="primary" @click="resetGame">再来一局</el-button>
          </div>
        </div>

        <!-- 暂停遮罩 -->
        <div v-if="paused && !gameOver" class="game-overlay">
          <div class="game-over-content">
            <h2>已暂停</h2>
            <p>按空格键或点击按钮继续</p>
          </div>
        </div>

        <!-- 开始提示 -->
        <div v-if="!hasStarted && !gameOver" class="game-overlay">
          <div class="game-over-content">
            <h2>🐍 贪吃蛇</h2>
            <p>方向键 / WASD 控制移动</p>
            <p>空格键暂停/继续</p>
            <el-button type="success" @click="startGame">开始游戏</el-button>
          </div>
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="controls-hint">
        <el-tag size="small">↑</el-tag>
        <el-tag size="small">↓</el-tag>
        <el-tag size="small">←</el-tag>
        <el-tag size="small">→</el-tag>
        <span style="color: #909399; font-size: 12px; margin-left: 8px;">方向键 / WASD 移动 · 空格暂停</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏常量
const GRID_SIZE = 20        // 20×20 棋盘
const CELL_SIZE = 22        // 每格像素
const CANVAS_PADDING = 20   // 内边距
const canvasSize = GRID_SIZE * CELL_SIZE + CANVAS_PADDING * 2
const TICK_INTERVAL = 150   // 毫秒

// 方向
const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
}

// 响应式
const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const bestScore = ref(0)
const isRunning = ref(false)
const paused = ref(false)
const gameOver = ref(false)
const hasStarted = ref(false)
const isNewBest = ref(false)

// 游戏状态
let snake: { x: number; y: number }[] = []
let food: { x: number; y: number } = { x: 0, y: 0 }
let direction = DIR.RIGHT
let nextDirection = DIR.RIGHT
let tickTimer: ReturnType<typeof setTimeout> | null = null
let ctx: CanvasRenderingContext2D | null = null

// 从 localStorage 读取最高分
function loadBestScore() {
  try {
    const saved = localStorage.getItem('snake-best-score')
    if (saved) bestScore.value = parseInt(saved, 10) || 0
  } catch { /* ignore */ }
}

// 保存最高分
function saveBestScore(val: number) {
  try {
    localStorage.setItem('snake-best-score', String(val))
  } catch { /* ignore */ }
}

// 初始化游戏
function initGame() {
  snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 }
  ]
  direction = DIR.RIGHT
  nextDirection = DIR.RIGHT
  score.value = 0
  isNewBest.value = false
  spawnFood()
  draw()
}

// 生成食物（避开蛇身）
function spawnFood() {
  const maxAttempts = 1000
  for (let i = 0; i < maxAttempts; i++) {
    const fx = Math.floor(Math.random() * GRID_SIZE)
    const fy = Math.floor(Math.random() * GRID_SIZE)
    if (!snake.some(seg => seg.x === fx && seg.y === fy)) {
      food = { x: fx, y: fy }
      return
    }
  }
  // 极端情况：蛇几乎占满棋盘，遍历所有格子
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!snake.some(seg => seg.x === x && seg.y === y)) {
        food = { x, y }
        return
      }
    }
  }
  // 真·全满，玩家赢了
  endGame()
}

// 游戏主循环（一步）
function tick() {
  if (paused.value || !isRunning.value) return

  direction = nextDirection

  // 计算新蛇头
  const head = snake[0]
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  }

  // 撞墙检测
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    endGame()
    return
  }

  // 撞自身检测
  if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    endGame()
    return
  }

  // 移动蛇
  snake.unshift(newHead)

  // 吃食物
  if (newHead.x === food.x && newHead.y === food.y) {
    score.value += 10
    spawnFood()
  } else {
    snake.pop()
  }

  draw()
}

// 结束游戏
function endGame() {
  isRunning.value = false
  gameOver.value = true
  // 检查最高分
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    isNewBest.value = true
    saveBestScore(score.value)
  }
  draw()
  clearTick()
}

// 开始游戏
function startGame() {
  hasStarted.value = true
  gameOver.value = false
  paused.value = false
  isRunning.value = true
  initGame()
  startTick()
}

// 重置
function resetGame() {
  gameOver.value = false
  paused.value = false
  isRunning.value = false
  hasStarted.value = false
  clearTick()
  initGame()
}

// 切换暂停
function toggleGame() {
  if (!hasStarted.value) {
    startGame()
    return
  }
  if (gameOver.value) {
    resetGame()
    startGame()
    return
  }
  paused.value = !paused.value
  if (paused.value) {
    clearTick()
  } else {
    startTick()
  }
}

// 定时器
function startTick() {
  clearTick()
  tickTimer = setTimeout(function loop() {
    tick()
    if (isRunning.value && !paused.value) {
      tickTimer = setTimeout(loop, TICK_INTERVAL)
    }
  }, TICK_INTERVAL)
}

function clearTick() {
  if (tickTimer !== null) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}

// 绘制
function draw() {
  if (!ctx || !canvasRef.value) return
  const w = canvasRef.value.width
  const h = canvasRef.value.height
  const pad = CANVAS_PADDING
  const cell = CELL_SIZE

  // 清空
  ctx.clearRect(0, 0, w, h)

  // 背景
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, w, h)

  // 棋盘网格
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = pad + i * cell
    ctx.beginPath()
    ctx.moveTo(pad, pos)
    ctx.lineTo(pad + GRID_SIZE * cell, pos)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos, pad)
    ctx.lineTo(pos, pad + GRID_SIZE * cell)
    ctx.stroke()
  }

  // 边框
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(pad, pad, GRID_SIZE * cell, GRID_SIZE * cell)

  // 食物（闪烁光效）
  const fx = pad + food.x * cell + cell / 2
  const fy = pad + food.y * cell + cell / 2
  const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, cell * 0.8)
  glow.addColorStop(0, '#ff4757')
  glow.addColorStop(0.6, '#ff6b81')
  glow.addColorStop(1, 'rgba(255, 71, 87, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(fx - cell, fy - cell, cell * 2, cell * 2)
  // 食物本体
  ctx.fillStyle = '#ff4757'
  ctx.beginPath()
  ctx.arc(fx, fy, cell * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.arc(fx - 3, fy - 3, cell * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // 蛇身
  snake.forEach((seg, idx) => {
    const sx = pad + seg.x * cell
    const sy = pad + seg.y * cell
    const isHead = idx === 0
    const ratio = 1 - idx / snake.length

    if (isHead) {
      // 蛇头（圆角矩形 + 眼睛）
      ctx.fillStyle = '#2ed573'
      roundRect(ctx, sx + 2, sy + 2, cell - 4, cell - 4, 5)
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(sx + 6, sy + 6, 3, 0, Math.PI * 2)
      ctx.arc(sx + cell - 6, sy + 6, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath()
      ctx.arc(sx + 7, sy + 5, 1.5, 0, Math.PI * 2)
      ctx.arc(sx + cell - 5, sy + 5, 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 蛇身（渐变色）
      const g = Math.floor(180 + ratio * 75)
      ctx.fillStyle = `rgb(46, ${g}, 115)`
      const r = idx === snake.length - 1 ? 5 : 3
      roundRect(ctx, sx + 3, sy + 3, cell - 6, cell - 6, r)
      ctx.fill()
    }
  })
}

// 画圆角矩形
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// 键盘事件
function handleKeydown(e: KeyboardEvent) {
  const key = e.key

  // 空格暂停/继续
  if (key === ' ' || key === 'Spacebar') {
    e.preventDefault()
    toggleGame()
    return
  }

  if (!isRunning.value || paused.value) return

  // 方向控制
  let newDir: { x: number; y: number } | null = null
  if (key === 'ArrowUp' || key === 'w' || key === 'W') newDir = DIR.UP
  if (key === 'ArrowDown' || key === 's' || key === 'S') newDir = DIR.DOWN
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') newDir = DIR.LEFT
  if (key === 'ArrowRight' || key === 'd' || key === 'D') newDir = DIR.RIGHT

  if (newDir) {
    e.preventDefault()
    // 不允许原地掉头
    if (newDir.x + direction.x !== 0 || newDir.y + direction.y !== 0) {
      nextDirection = newDir
    }
  }
}

onMounted(() => {
  loadBestScore()
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
  }
  initGame()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  clearTick()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.game-info {
  display: flex;
  gap: 24px;
  padding: 16px 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.info-item {
  text-align: center;
}

.info-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.info-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.info-value.score {
  color: #409eff;
}

.info-value.best {
  color: #e6a23c;
}

.info-value.length {
  color: #67c23a;
}

.canvas-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.game-canvas {
  display: block;
}

.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.game-over-content {
  text-align: center;
  color: #fff;
  padding: 32px;
}

.game-over-content h2 {
  font-size: 28px;
  margin-bottom: 12px;
  color: #fff;
}

.game-over-content p {
  font-size: 14px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.7);
}

.final-score {
  font-size: 18px !important;
  margin-bottom: 4px !important;
  color: #fff !important;
}

.final-score strong {
  font-size: 28px;
  color: #409eff;
}

.new-best {
  color: #e6a23c !important;
  font-size: 20px !important;
  margin-bottom: 12px !important;
}

.controls-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
}
</style>
