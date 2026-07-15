<template>
  <div>
    <div class="page-header">
      <h2>设置</h2>
    </div>

    <!-- 关于 -->
    <div class="page-card">
      <h3 style="font-size: 15px; color: #303133; margin-bottom: 16px;">关于熊猫记账</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="应用名称">熊猫记账</el-descriptions-item>
        <el-descriptions-item label="版本">v0.1.0</el-descriptions-item>
        <el-descriptions-item label="技术栈">Electron + Vue 3 + SQLite</el-descriptions-item>
        <el-descriptions-item label="说明">本地记账应用，数据存储在你的电脑上，无需联网，隐私安全。</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 数据操作 -->
    <div class="page-card">
      <h3 style="font-size: 15px; color: #303133; margin-bottom: 16px;">数据管理</h3>

      <el-alert
        title="所有数据存储在你的本地电脑上，不会上传到任何服务器。"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px;"
      />

      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <el-button type="primary" @click="handleBackup" :loading="backingUp">
          <el-icon><Download /></el-icon> 备份数据库
        </el-button>

        <el-button @click="handleExport">
          <el-icon><Document /></el-icon> 导出数据
        </el-button>
      </div>

      <div v-if="backupPath" style="margin-top: 12px;">
        <el-alert
          :title="`备份成功！文件已保存到：${backupPath}`"
          type="success"
          show-icon
          :closable="true"
          @close="backupPath = ''"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Document } from '@element-plus/icons-vue'

const backingUp = ref(false)
const backupPath = ref('')

async function handleBackup() {
  backingUp.value = true
  try {
    const result = await window.electronAPI.db.backup()
    backupPath.value = result
    ElMessage.success('备份成功！')
  } catch (e: any) {
    ElMessage.error(e.message || '备份失败')
  } finally {
    backingUp.value = false
  }
}

async function handleExport() {
  ElMessage.info('导出功能开发中，敬请期待！')
}
</script>
