<template>
  <!-- 整体容器：占满视口高度，使用 flex 布局，侧栏 + 主内容区左右排列 -->
  <el-container style="height: 100vh">
    <!-- ========== 侧边栏区域 ========== -->
    <el-aside width="200px" class="app-sidebar">
      <!-- 侧栏顶部：应用 Logo 和副标题 -->
      <div class="sidebar-header">
        <h1 class="app-logo">🐼 熊猫记账</h1>
        <p class="app-subtitle">管好你的每一笔收支</p>
      </div>
      <!-- 导航菜单：使用 el-menu 的 router 模式，点击自动跳转对应路由 -->
      <el-menu
        :default-active="activeMenu"
        :router="true"
        :collapse="false"
      >
        <!-- 首页：收支概览 -->
        <el-menu-item index="/home">
          <el-icon><Odometer /></el-icon>
          <template #title>首页概览</template>
        </el-menu-item>
        <!-- 新增记录：收支一体表单 -->
        <el-menu-item index="/add">
          <el-icon><Plus /></el-icon>
          <template #title>新增记录</template>
        </el-menu-item>
        <!-- 收支明细：按月分组列表 -->
        <el-menu-item index="/list">
          <el-icon><List /></el-icon>
          <template #title>收支明细</template>
        </el-menu-item>
        <!-- 数据统计：图表可视化 -->
        <el-menu-item index="/stats">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>
        <!-- 分类管理：维护一/二级分类 -->
        <el-menu-item index="/categories">
          <el-icon><FolderOpened /></el-icon>
          <template #title>分类管理</template>
        </el-menu-item>
        <!-- 设置：应用配置与数据管理 -->
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>设置</template>
        </el-menu-item>
        <!-- 游戏彩蛋：贪吃蛇，加分隔线以示区分 -->
        <el-menu-item index="/snake" style="border-top: 1px solid #f0f0f0; margin-top: 4px;">
          <el-icon><MagicStick /></el-icon>
          <template #title>🎮 贪吃蛇</template>
        </el-menu-item>
      </el-menu>

      <!-- 侧栏底部：快捷记账入口按钮 -->
      <div class="sidebar-footer">
        <el-button
          type="primary"
          size="small"
          class="sidebar-btn"
          @click="$router.push('/add')"
        >
          <span class="btn-icon">↑</span>
          <span>记一笔支出</span>
        </el-button>
        <el-button
          type="success"
          size="small"
          class="sidebar-btn"
          @click="$router.push('/add?type=income')"
        >
          <span class="btn-icon">↑</span>
          <span>记一笔收入</span>
        </el-button>
      </div>
    </el-aside>

    <!-- ========== 主内容区域 ========== -->
    <el-main class="app-main">
      <div class="app-content">
        <!-- 路由出口：当前页面内容在此渲染 -->
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Odometer, Plus, List, DataAnalysis,
  FolderOpened, Setting, MagicStick
} from '@element-plus/icons-vue'

/**
 * 当前路由路径，用于高亮侧边栏对应的菜单项
 * 根据 URL 实时变化，绑定到 el-menu 的 :default-active 属性
 */
const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
/* 侧边栏容器：白色背景 + 右边框分隔线，flex 纵向排列便于撑满高度 */
.app-sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

/* 主内容区：去除默认内边距，使用浅灰背景，隐藏溢出以保持布局稳定 */
.app-main {
  padding: 0;
  background: #f5f7fa;
  overflow: hidden;
}

/* 内容容器：占满高度并启用纵向滚动，内边距为内容与边缘留出呼吸空间 */
.app-content {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

/* 侧栏底部按钮区域：横向排列两个快捷记账按钮 */
.sidebar-footer {
  padding: 10px 12px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  flex-direction: row;
  gap: 6px;
}

/* 快捷按钮：平均分配宽度，居中显示文字和图标 */
.sidebar-btn {
  flex: 1 !important;
  display: inline-flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 6px 4px !important;
  font-size: 12px !important;
}

/* 按钮图标：与文字保持间距 */
.btn-icon {
  margin-right: 3px;
  font-size: 13px;
}
</style>
