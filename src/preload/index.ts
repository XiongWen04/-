import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给渲染进程的 API 类型
export interface ElectronAPI {
  db: {
    // 分类
    getCategories: (type?: string) => Promise<any[]>
    getParentCategories: () => Promise<any[]>
    getChildCategories: (parentId: number) => Promise<any[]>
    addCategory: (category: { name: string; parent_id: number | null; icon: string; sort_order: number }) => Promise<any>
    updateCategory: (id: number, data: { name?: string; icon?: string; sort_order?: number }) => Promise<void>
    deleteCategory: (id: number) => Promise<void>
    // 花销
    addExpense: (expense: { amount: number; category_id: number; date: string; note?: string; payment_method?: string }) => Promise<any>
    getExpenses: (options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => Promise<any>
    getExpensesByMonth: (year: number, month: number) => Promise<any>
    updateExpense: (id: number, data: { amount?: number; category_id?: number; date?: string; note?: string; payment_method?: string }) => Promise<void>
    deleteExpense: (id: number) => Promise<void>
    // 收入
    addIncome: (income: { amount: number; category_id: number; date: string; note?: string; source?: string }) => Promise<any>
    getIncomes: (options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => Promise<any>
    getIncomesByMonth: (year: number, month: number) => Promise<any>
    updateIncome: (id: number, data: { amount?: number; category_id?: number; date?: string; note?: string; source?: string }) => Promise<void>
    deleteIncome: (id: number) => Promise<void>
    // 统计
    getYearlyStats: (year: number) => Promise<any[]>
    getYearlyIncomeStats: (year: number) => Promise<any[]>
    getCategoryStats: (year: number, month: number) => Promise<any[]>
    getIncomeCategoryStats: (year: number, month: number) => Promise<any[]>
    // 备份
    backup: () => Promise<string>
  }
}

const api: ElectronAPI = {
  db: {
    getCategories: (type?: string) => ipcRenderer.invoke('db:getCategories', type),
    getParentCategories: () => ipcRenderer.invoke('db:getParentCategories'),
    getChildCategories: (parentId: number) => ipcRenderer.invoke('db:getChildCategories', parentId),
    addCategory: (category) => ipcRenderer.invoke('db:addCategory', category),
    updateCategory: (id, data) => ipcRenderer.invoke('db:updateCategory', id, data),
    deleteCategory: (id) => ipcRenderer.invoke('db:deleteCategory', id),
    addExpense: (expense) => ipcRenderer.invoke('db:addExpense', expense),
    getExpenses: (options) => ipcRenderer.invoke('db:getExpenses', options),
    getExpensesByMonth: (year, month) => ipcRenderer.invoke('db:getExpensesByMonth', year, month),
    updateExpense: (id, data) => ipcRenderer.invoke('db:updateExpense', id, data),
    deleteExpense: (id) => ipcRenderer.invoke('db:deleteExpense', id),
    addIncome: (income) => ipcRenderer.invoke('db:addIncome', income),
    getIncomes: (options) => ipcRenderer.invoke('db:getIncomes', options),
    getIncomesByMonth: (year, month) => ipcRenderer.invoke('db:getIncomesByMonth', year, month),
    updateIncome: (id, data) => ipcRenderer.invoke('db:updateIncome', id, data),
    deleteIncome: (id) => ipcRenderer.invoke('db:deleteIncome', id),
    getYearlyStats: (year) => ipcRenderer.invoke('db:getYearlyStats', year),
    getYearlyIncomeStats: (year) => ipcRenderer.invoke('db:getYearlyIncomeStats', year),
    getCategoryStats: (year, month) => ipcRenderer.invoke('db:getCategoryStats', year, month),
    getIncomeCategoryStats: (year, month) => ipcRenderer.invoke('db:getIncomeCategoryStats', year, month),
    backup: () => ipcRenderer.invoke('db:backup')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
