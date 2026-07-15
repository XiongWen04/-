<template>
  <div>
    <div class="page-header">
      <h2>新增花销</h2>
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
        <!-- 金额 -->
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

        <!-- 分类选择 -->
        <el-form-item label="分类" prop="category_id">
          <el-cascader
            v-model="selectedCategory"
            :options="categoryOptions"
            :props="{ expandTrigger: 'hover', label: 'label', value: 'value', children: 'children' }"
            placeholder="请选择分类"
            style="width: 100%"
            clearable
          />
        </el-form-item>

        <!-- 日期 -->
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <!-- 支付方式 -->
        <el-form-item label="支付方式" prop="payment_method">
          <el-select v-model="form.payment_method" placeholder="选择支付方式" clearable style="width: 100%">
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="银行卡" value="银行卡" />
            <el-option label="现金" value="现金" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <!-- 备注 -->
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

        <!-- 提交 -->
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit" style="width: 100%">
            确认记一笔
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useExpenseStore } from '@/stores/expenses'
import { useCategoryStore } from '@/stores/categories'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const expenseStore = useExpenseStore()
const categoryStore = useCategoryStore()

const formRef = ref()
const submitting = ref(false)

const categoryOptions = computed(() => categoryStore.getCategoryOptions())

const form = reactive({
  amount: undefined as number | undefined,
  date: dayjs().format('YYYY-MM-DD'),
  note: '',
  payment_method: ''
})

const selectedCategory = ref<number[]>([])

const rules = {
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择日期', trigger: 'change' }
  ]
}

async function handleSubmit() {
  // 验证分类是否选择了二级
  if (selectedCategory.value.length < 2) {
    ElMessage.warning('请选择完整的二级分类')
    return
  }

  await formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return

    submitting.value = true
    try {
      await expenseStore.addExpense({
        amount: form.amount!,
        category_id: selectedCategory.value[1],
        date: form.date,
        note: form.note,
        payment_method: form.payment_method
      })
      ElMessage.success('记录成功！')
      // 重置表单
      form.amount = undefined
      form.note = ''
      form.payment_method = ''
      form.date = dayjs().format('YYYY-MM-DD')
      selectedCategory.value = []
      formRef.value?.resetFields()
    } catch (e: any) {
      ElMessage.error(e.message || '添加失败')
    } finally {
      submitting.value = false
    }
  })
}

onMounted(async () => {
  await categoryStore.fetchCategories()
  // 如果有传参 parentId，自动选中
  const parentId = route.query.parentId
  if (parentId && categoryOptions.value.length > 0) {
    const parent = categoryOptions.value.find(c => c.value === Number(parentId))
    if (parent && parent.children && parent.children.length > 0) {
      selectedCategory.value = [parent.value, parent.children[0].value]
    }
  }
})
</script>
