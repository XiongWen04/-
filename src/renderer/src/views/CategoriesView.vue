<template>
  <div>
    <div class="page-header">
      <h2>分类管理</h2>
    </div>

    <div class="page-card">
      <div v-if="loading" style="text-align: center; padding: 40px;">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <p style="margin-top: 8px; color: #909399;">加载中...</p>
      </div>

      <div v-for="parent in categoryStore.categories" :key="parent.id" style="margin-bottom: 20px;">
        <!-- 一级分类标题 -->
        <div style="display: flex; align-items: center; padding: 10px 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 8px;">
          <el-icon :size="18" style="margin-right: 8px; color: #409eff;">
            <component :is="getIconComponent(parent.icon)" />
          </el-icon>
          <span style="font-weight: 600; font-size: 14px; flex: 1;">{{ parent.name }}</span>
        </div>

        <!-- 二级分类列表 -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-left: 12px;">
          <el-tag
            v-for="child in parent.children"
            :key="child.id"
            closable
            :disable-transitions="false"
            @close="handleDelete(child)"
            style="font-size: 13px; padding: 6px 10px;"
          >
            {{ child.name }}
          </el-tag>

          <!-- 添加二级分类 -->
          <el-button
            text
            type="primary"
            size="small"
            @click="showAddDialog(parent)"
          >
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加分类对话框 -->
    <el-dialog v-model="dialogVisible" title="添加分类" width="400px">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入分类名称" maxlength="10" />
        </el-form-item>
        <el-form-item label="上级分类">
          <el-input :model-value="parentName" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="addLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categories'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Loading } from '@element-plus/icons-vue'
import * as icons from '@element-plus/icons-vue'

const categoryStore = useCategoryStore()
const loading = ref(false)

const dialogVisible = ref(false)
const addLoading = ref(false)
const currentParent = ref<any>(null)
const parentName = ref('')
const addForm = reactive({ name: '' })
const addFormRef = ref()
const addRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 10, message: '名称不能超过10个字', trigger: 'blur' }
  ]
}

function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    food: 'ForkSpoon', car: 'Van', 'shopping-bag': 'ShoppingBag',
    home: 'House', camera: 'Camera', 'first-aid-kit': 'FirstAidKit',
    reading: 'Reading', 'chat-line-square': 'ChatLineSquare', more: 'More'
  }
  const name = iconMap[iconName] || iconName
  return (icons as any)[name] || icons.Coin
}

function showAddDialog(parent: any) {
  currentParent.value = parent
  parentName.value = parent.name
  addForm.name = ''
  dialogVisible.value = true
}

async function handleAdd() {
  await addFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return
    addLoading.value = true
    try {
      await categoryStore.addCategory({
        name: addForm.name,
        parent_id: currentParent.value.id,
        icon: '',
        sort_order: (currentParent.value.children?.length || 0) * 10 + 10
      })
      ElMessage.success('添加成功')
      dialogVisible.value = false
    } catch (e: any) {
      ElMessage.error(e.message || '添加失败')
    } finally {
      addLoading.value = false
    }
  })
}

async function handleDelete(child: any) {
  try {
    await ElMessageBox.confirm(
      `确定删除分类「${child.name}」吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await categoryStore.deleteCategory(child.id)
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e.message && e.message !== 'cancel') {
      ElMessage.error(e.message)
    }
  }
}

onMounted(async () => {
  loading.value = true
  await categoryStore.fetchCategories()
  loading.value = false
})
</script>
