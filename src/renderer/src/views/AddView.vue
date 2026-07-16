<template>
  <div>
    <!-- ====== 页面标题，根据当前类型动态切换 ====== -->
    <div class="page-header">
      <h2>{{ isIncome ? '新增收入' : '新增花销' }}</h2>
    </div>

    <!-- ====== 类型切换：支出/收入双按钮切换，切换后表单分类级联跟随变化 ====== -->
    <div class="page-card" style="margin-bottom: 16px;">
      <el-radio-group v-model="recordType" size="large" style="width: 100%; display: flex;">
        <el-radio-button value="expense" style="flex: 1; text-align: center;">
          <el-icon style="vertical-align: middle; margin-right: 4px;"><Top /></el-icon> 支出
        </el-radio-button>
        <el-radio-button value="income" style="flex: 1; text-align: center;">
          <el-icon style="vertical-align: middle; margin-right: 4px;"><Bottom /></el-icon> 收入
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="page-card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        label-position="left"
        size="large"
      >
        <!-- ====== 金额输入：必须大于 0 的数值，默认带 ¥ 前缀 ====== -->
        <el-form-item label="金额" prop="amount">
          <el-input
            v-model.number="form.amount"
            type="number"
            placeholder="请输入金额"
            min="0.01"
            step="0.01"
            style="width: 100%"
          >
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>

        <!-- ====== 级联分类选择：一级→二级联动，根据支出/收入切换数据源 ====== -->
        <el-form-item label="分类" prop="category_id">
          <el-cascader
            v-model="selectedCategory"
            :options="categoryOptions"
            :props="{ expandTrigger: 'hover', label: 'label', value: 'value', children: 'children' }"
            :placeholder="isIncome ? '请选择收入分类' : '请选择支出分类'"
            style="width: 100%"
            clearable
          />
        </el-form-item>

        <!-- ====== 日期：默认当天，支持修改 ====== -->
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <!-- ====== 支付方式：仅在支出模式下显示 ====== -->
        <el-form-item v-if="isExpense" label="支付方式" prop="payment_method">
          <el-select v-model="form.payment_method" placeholder="选择支付方式" clearable style="width: 100%">
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="银行卡" value="银行卡" />
            <el-option label="现金" value="现金" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <!-- ====== 收入来源：仅在收入模式下显示 ====== -->
        <el-form-item v-if="isIncome" label="来源" prop="source">
          <el-select v-model="form.source" placeholder="选择收入来源" clearable style="width: 100%">
            <el-option label="工资" value="工资" />
            <el-option label="兼职" value="兼职" />
            <el-option label="投资" value="投资" />
            <el-option label="红包" value="红包" />
            <el-option label="退款" value="退款" />
            <el-option label="报销" value="报销" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <!-- ====== 备注：可选文本，限制 200 字 ====== -->
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            placeholder="可选，添加备注信息"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <!-- ====== 提交按钮，加 loading 防重复提交 ====== -->
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit" style="width: 100%">
            {{ isIncome ? '确认记一笔收入' : '确认记一笔' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Top, Bottom } from '@element-plus/icons-vue'
import { useExpenseStore } from '@/stores/expenses'
import { useIncomeStore } from '@/stores/incomes'
import { useCategoryStore } from '@/stores/categories'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const expenseStore = useExpenseStore()
const incomeStore = useIncomeStore()
const categoryStore = useCategoryStore()

const formRef = ref()
/** 提交中标记：防止重复提交，同时在按钮上显示 loading */
const submitting = ref(false)
/** 当前记录类型：expense（支出）或 income（收入） */
const recordType = ref<'expense' | 'income'>('expense')

/** 是否处于支出模式 */
const isExpense = computed(() => recordType.value === 'expense')
/** 是否处于收入模式 */
const isIncome = computed(() => recordType.value === 'income')

/**
 * 级联选择器的选项数据：根据当前记录类型动态筛选分类
 * @description 将 store 中扁平的分类列表转为 el-cascader 需要的嵌套结构：
 * 一级分类作为父节点，二级分类作为 children。切换类型时自动重建。
 */
const categoryOptions = computed(() => {
  const type = recordType.value
  return categoryStore.categories
    .filter(c => c.type === type)
    .map(parent => ({
      value: parent.id,
      label: parent.name,
      children: (parent.children || []).map(child => ({
        value: child.id,
        label: child.name
      }))
    }))
})

// 表单数据结构：金额、日期、备注固定存在；支付方式/来源根据类型切换选择性提交
const form = reactive({
  amount: undefined as number | undefined,
  date: dayjs().format('YYYY-MM-DD'),
  note: '',
  payment_method: '',
  source: ''
})

/** 级联选择器选中值：[一级分类ID, 二级分类ID] */
const selectedCategory = ref<number[]>([])

/**
 * 表单验证规则
 * @description amount 需要是 >0 的数字；date 必填；
 * 支付方式和来源的验证由后端或提交前逻辑保证，前端不强制
 */
const rules = {
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择日期', trigger: 'change' }
  ]
}

/**
 * 监听类型切换：切换后重置级联分类选中值
 * @description 否则会出现"支出模式下选中了收入分类"的显示错乱
 */
watch(recordType, () => {
  selectedCategory.value = []
})

/**
 * 提交表单：校验 → 根据类型调用对应 store → 成功提示 → 重置
 * @description 先手动校验级联选择器是否选到了二级（el-cascader 本身对两级未做必填），
 * 再用 Element Plus 的 form.validate 触发其他字段校验
 */
async function handleSubmit() {
  // 级联选择器未选择完整（只选了一级或空）时拦截并提示
  if (selectedCategory.value.length < 2) {
    ElMessage.warning('请选择完整的二级分类')
    return
  }

  await formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return

    submitting.value = true
    try {
      if (isExpense.value) {
        await expenseStore.addExpense({
          amount: form.amount!,
          category_id: selectedCategory.value[1], // 存储二级分类ID
          date: form.date,
          note: form.note,
          payment_method: form.payment_method
        })
      } else {
        await incomeStore.addIncome({
          amount: form.amount!,
          category_id: selectedCategory.value[1],
          date: form.date,
          note: form.note,
          source: form.source
        })
      }
      ElMessage.success('记录成功！')
      resetForm()
    } catch (e: any) {
      ElMessage.error(e.message || '添加失败')
    } finally {
      submitting.value = false
    }
  })
}

/**
 * 重置表单到初始状态
 * @description 清空所有输入字段，日期回到当天，分类清空，Element Plus 内部校验状态也重置
 */
function resetForm() {
  form.amount = undefined
  form.note = ''
  form.payment_method = ''
  form.source = ''
  form.date = dayjs().format('YYYY-MM-DD')
  selectedCategory.value = []
  formRef.value?.resetFields()
}

/**
 * 页面挂载时加载分类数据并处理路由参数预填充
 * @description 路由 query 可传入：
 * - type=income 预切换到收入模式
 * - parentId=xx 预选一级分类并自动选择其第一个子分类
 */
onMounted(async () => {
  await categoryStore.fetchCategories()
  // 如果有传参 type，切换到对应类型（首页快捷记账目前只传支出，但预留收入入口）
  const typeParam = route.query.type
  if (typeParam === 'income') {
    recordType.value = 'income'
  }
  // 如果有传参 parentId，自动选中对应一级分类的第一个二级分类
  const parentId = route.query.parentId
  if (parentId && categoryOptions.value.length > 0) {
    const parent = categoryOptions.value.find(c => c.value === Number(parentId))
    if (parent && parent.children && parent.children.length > 0) {
      selectedCategory.value = [parent.value, parent.children[0].value]
    }
  }
})
</script>
