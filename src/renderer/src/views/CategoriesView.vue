<template>
  <div>
    <div class="page-header">
      <h2>分类管理</h2>
      <div>
        <el-button type="primary" @click="showAddParentDialog()">
          <el-icon><Plus /></el-icon> 新增一级分类
        </el-button>
      </div>
    </div>

    <!-- 类型切换：支出/收入 -->
    <div class="page-card" style="margin-bottom: 16px;">
      <el-radio-group v-model="currentType" size="large" style="width: 100%; display: flex;">
        <el-radio-button value="expense" style="flex: 1; text-align: center;">
          <el-icon style="vertical-align: middle; margin-right: 4px;"><Top /></el-icon> 支出分类
        </el-radio-button>
        <el-radio-button value="income" style="flex: 1; text-align: center;">
          <el-icon style="vertical-align: middle; margin-right: 4px;"><Bottom /></el-icon> 收入分类
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="page-card">
      <div v-if="loading" style="text-align: center; padding: 40px;">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <p style="margin-top: 8px; color: #909399;">加载中...</p>
      </div>

      <div v-else-if="filteredCategories.length === 0" style="text-align: center; padding: 60px 0; color: #909399;">
        <el-icon :size="48" style="margin-bottom: 12px;"><FolderDelete /></el-icon>
        <p>暂无{{ currentType === 'expense' ? '支出' : '收入' }}分类</p>
        <el-button type="primary" size="small" @click="showAddParentDialog()" style="margin-top: 12px;">
          立即添加
        </el-button>
      </div>

      <div v-for="parent in filteredCategories" :key="parent.id" style="margin-bottom: 20px;">
        <!-- 一级分类标题 -->
        <div
          style="display: flex; align-items: center; padding: 10px 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 8px;"
        >
          <el-icon :size="18" style="margin-right: 8px; color: #409eff;">
            <component :is="getIconComponent(parent.icon)" />
          </el-icon>
          <span style="font-weight: 600; font-size: 14px; flex: 1;">{{ parent.name }}</span>
          <el-button text type="danger" size="small" @click="handleDeleteParent(parent)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>

        <!-- 二级分类列表 -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-left: 12px;">
          <el-tag
            v-for="child in parent.children"
            :key="child.id"
            closable
            :disable-transitions="false"
            @close="handleDeleteChild(child)"
            style="font-size: 13px; padding: 6px 10px;"
          >
            {{ child.name }}
          </el-tag>

          <!-- 添加二级分类 -->
          <el-button text type="primary" size="small" @click="showAddChildDialog(parent)">
            <el-icon><Plus /></el-icon> 添加子分类
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加分类对话框（通用：一级/二级） -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="420px">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="80px">
        <!-- 分类名称 -->
        <el-form-item label="名称" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入分类名称" maxlength="10" show-word-limit />
        </el-form-item>

        <!-- 图标选择（仅一级分类） -->
        <el-form-item v-if="dialogMode === 'parent'" label="图标" prop="icon">
          <el-select v-model="addForm.icon" placeholder="选择图标" style="width: 100%">
            <el-option v-for="icon in iconOptions" :key="icon.value" :label="icon.label" :value="icon.value">
              <span style="display: flex; align-items: center;">
                <el-icon style="margin-right: 8px;"><component :is="icon.component" /></el-icon>
                {{ icon.label }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 上级分类（仅二级分类） -->
        <el-form-item v-if="dialogMode === 'child'" label="上级">
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categories'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Loading, FolderDelete, Top, Bottom } from '@element-plus/icons-vue'
import * as icons from '@element-plus/icons-vue'

const categoryStore = useCategoryStore()
const loading = ref(false)
const currentType = ref<'expense' | 'income'>('expense')

// 根据当前类型筛选
const filteredCategories = computed(() => {
  return categoryStore.categories.filter(c => c.type === currentType.value)
})

// 图标选项
const iconOptions = computed(() => [
  { label: '餐饮', value: 'food', component: icons.ForkSpoon },
  { label: '交通', value: 'car', component: icons.Van },
  { label: '购物', value: 'shopping-bag', component: icons.ShoppingBag },
  { label: '居住', value: 'home', component: icons.House },
  { label: '娱乐', value: 'camera', component: icons.Camera },
  { label: '医疗', value: 'first-aid-kit', component: icons.FirstAidKit },
  { label: '教育', value: 'reading', component: icons.Reading },
  { label: '人情', value: 'chat-line-square', component: icons.ChatLineSquare },
  { label: '其他', value: 'more', component: icons.More },
  { label: '工资', value: 'money', component: icons.Money },
  { label: '理财', value: 'trend-charts', component: icons.TrendCharts },
  { label: '红包', value: 'present', component: icons.Present },
  { label: '更多', value: 'more-filled', component: icons.MoreFilled },
])

// 对话框
const dialogVisible = ref(false)
const addLoading = ref(false)
const dialogMode = ref<'parent' | 'child'>('parent')
const dialogTitle = computed(() => dialogMode.value === 'parent' ? '新增一级分类' : '添加子分类')
const currentParent = ref<any>(null)
const parentName = ref('')
const addFormRef = ref()
const addForm = reactive({ name: '', icon: 'more' })

const addRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 10, message: '名称不能超过10个字', trigger: 'blur' }
  ],
  icon: [
    { required: true, message: '请选择图标', trigger: 'change' }
  ]
}

function getIconComponent(iconName: string) {
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

// 显示新增一级分类对话框
function showAddParentDialog() {
  dialogMode.value = 'parent'
  parentName.value = ''
  addForm.name = ''
  addForm.icon = 'more'
  dialogVisible.value = true
}

// 显示新增子分类对话框
function showAddChildDialog(parent: any) {
  dialogMode.value = 'child'
  currentParent.value = parent
  parentName.value = parent.name
  addForm.name = ''
  addForm.icon = ''
  dialogVisible.value = true
}

async function handleAdd() {
  // 前端校验：同名检查
  if (dialogMode.value === 'parent') {
    const exists = filteredCategories.value.some(c => c.name === addForm.name)
    if (exists) {
      ElMessage.warning(`一级分类「${addForm.name}」已存在`)
      addLoading.value = false
      return
    }
  } else {
    const exists = currentParent.value.children?.some((c: any) => c.name === addForm.name)
    if (exists) {
      ElMessage.warning(`子分类「${addForm.name}」已存在于「${parentName.value}」中`)
      addLoading.value = false
      return
    }
  }

  await addFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return
    addLoading.value = true
    try {
      if (dialogMode.value === 'parent') {
        await categoryStore.addCategory({
          name: addForm.name,
          parent_id: null,
          icon: addForm.icon,
          sort_order: (filteredCategories.value.length || 0) * 10 + 10,
          type: currentType.value
        })
      } else {
        await categoryStore.addCategory({
          name: addForm.name,
          parent_id: currentParent.value.id,
          icon: addForm.icon || currentParent.value.icon || '',
          sort_order: (currentParent.value.children?.length || 0) * 10 + 10
        })
      }
      ElMessage.success('添加成功')
      dialogVisible.value = false
    } catch (e: any) {
      ElMessage.error(e.message || '添加失败')
    } finally {
      addLoading.value = false
    }
  })
}

// 删除二级分类
async function handleDeleteChild(child: any) {
  try {
    await ElMessageBox.confirm(
      `确定删除子分类「${child.name}」吗？删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await categoryStore.deleteCategory(child.id)
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

// 删除一级分类（级联删除子分类）
async function handleDeleteParent(parent: any) {
  const childCount = parent.children?.length || 0
  const msg = childCount > 0
    ? `确定删除一级分类「${parent.name}」及其 ${childCount} 个子分类吗？删除后不可恢复。`
    : `确定删除一级分类「${parent.name}」吗？删除后不可恢复。`
  try {
    await ElMessageBox.confirm(msg, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await categoryStore.deleteCategory(parent.id)
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

onMounted(async () => {
  loading.value = true
  await categoryStore.fetchCategories()
  loading.value = false
})
</script>
