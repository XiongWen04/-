<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="app-sidebar">
      <div class="sidebar-header">
        <h1 class="app-logo">🐴 黑马记账</h1>
        <p class="app-subtitle">记录每一笔花销</p>
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
          <template #title>花销列表</template>
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
  FolderOpened, Setting
} from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
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
</style>
