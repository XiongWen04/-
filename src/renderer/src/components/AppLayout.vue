<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="app-sidebar">
      <div class="sidebar-header">
        <h1 class="app-logo">🐴 黑马记账</h1>
        <p class="app-subtitle">管好你的每一笔收支</p>
      </div>
      <el-menu
        :default-active="activeMenu"
        :router="true"
        :collapse="false"
      >
        <el-menu-item index="/home">
          <el-icon><Odometer /></el-icon>
          <template #title>首页概览</template>
        </el-menu-item>
        <el-menu-item index="/add">
          <el-icon><Plus /></el-icon>
          <template #title>新增记录</template>
        </el-menu-item>
        <el-menu-item index="/list">
          <el-icon><List /></el-icon>
          <template #title>收支明细</template>
        </el-menu-item>
        <el-menu-item index="/stats">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><FolderOpened /></el-icon>
          <template #title>分类管理</template>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>设置</template>
        </el-menu-item>
      </el-menu>

      <!-- 快捷入口 -->
      <div class="sidebar-footer">
        <el-button
          type="primary"
          size="small"
          style="width: 100%; margin-bottom: 8px;"
          @click="$router.push('/add')"
        >
          <el-icon><Top /></el-icon> 记一笔支出
        </el-button>
        <el-button
          type="success"
          size="small"
          style="width: 100%;"
          @click="$router.push('/add?type=income')"
        >
          <el-icon><Bottom /></el-icon> 记一笔收入
        </el-button>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <div class="app-content">
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
  FolderOpened, Setting, Top, Bottom
} from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.app-main {
  padding: 0;
  background: #f5f7fa;
  overflow: hidden;
}

.app-content {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e4e7ed;
}
</style>
