import { contextBridge, ipcRenderer } from 'electron'

/*
 * ===== 预加载脚本 =====
 *
 * 预加载脚本是 Electron 安全模型的关键一环，它运行在渲染进程和 Node.js 之间的桥梁层。
 *
 * 为什么要这样设计？
 * - 渲染进程的 contextIsolation = true，不能直接访问 Node.js API
 * - 预加载脚本可以访问 Node.js API（如 ipcRenderer），但运行在隔离的上下文中
 * - 通过 contextBridge.exposeInMainWorld 把需要的 API 安全地暴露给渲染进程
 * - 这样的好处是：即使渲染进程被 XSS 攻击，攻击者也只能调用我们限定的 API，不能执行任意 Node.js 代码
 *
 * 本文件定义了 ElectronAPI 接口并通过 window.electronAPI 暴露给渲染进程，
 * 渲染进程的所有数据库操作都通过这个桥接层发 IPC 请求到主进程。
 */

/**
 * 暴露给渲染进程的 API 类型定义
 *
 * 按功能分四大组：
 * 1. 分类管理（CRUD + 树形查询）
 * 2. 花销记录（CRUD + 分页查询 + 月度统计）
 * 3. 收入记录（CRUD + 分页查询 + 月度统计）
 * 4. 统计与备份（年度统计、分类占比、数据库备份）
 *
 * 每个方法本质上就是一行调用：ipcRenderer.invoke('通道名', 参数)
 * 之所以每个方法都显式定义，是因为 TypeScript 类型检查能让渲染进程获得完整的类型提示
 */
export interface ElectronAPI {
  /** 所有数据库操作都挂在 db 属性下，方便渲染进程统一调用：window.electronAPI.db.xxx() */
  db: {
    // ==================== 分类操作 ====================

    /** 获取所有分类（树形结构），可选按类型筛选支出/收入 */
    getCategories: (type?: string) => Promise<any[]>
    /** 获取所有一级分类（parent_id 为空的顶级分类） */
    getParentCategories: () => Promise<any[]>
    /** 根据父分类 ID 获取其下的二级分类 */
    getChildCategories: (parentId: number) => Promise<any[]>
    /** 添加分类（自动处理一/二级，含同名校验） */
    addCategory: (category: { name: string; parent_id: number | null; icon: string; sort_order: number; type?: string }) => Promise<any>
    /** 更新分类信息（名称、图标、排序号） */
    updateCategory: (id: number, data: { name?: string; icon?: string; sort_order?: number }) => Promise<void>
    /** 删除分类（含安全校验：有记录关联时禁止删除） */
    deleteCategory: (id: number) => Promise<void>

    // ==================== 花销操作 ====================

    /** 添加一笔花销记录 */
    addExpense: (expense: { amount: number; category_id: number; date: string; note?: string; payment_method?: string }) => Promise<any>
    /** 获取花销列表（支持分页、按日期/分类筛选） */
    getExpenses: (options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => Promise<any>
    /** 获取某月的花销记录（按天分组，含月度统计） */
    getExpensesByMonth: (year: number, month: number) => Promise<any>
    /** 更新花销记录（部分更新） */
    updateExpense: (id: number, data: { amount?: number; category_id?: number; date?: string; note?: string; payment_method?: string }) => Promise<void>
    /** 删除花销记录 */
    deleteExpense: (id: number) => Promise<void>

    // ==================== 收入操作 ====================

    /** 添加一笔收入记录 */
    addIncome: (income: { amount: number; category_id: number; date: string; note?: string; source?: string }) => Promise<any>
    /** 获取收入列表（支持分页、按日期/分类筛选） */
    getIncomes: (options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => Promise<any>
    /** 获取某月的收入记录（按天分组，含月度统计） */
    getIncomesByMonth: (year: number, month: number) => Promise<any>
    /** 更新收入记录（部分更新） */
    updateIncome: (id: number, data: { amount?: number; category_id?: number; date?: string; note?: string; source?: string }) => Promise<void>
    /** 删除收入记录 */
    deleteIncome: (id: number) => Promise<void>

    // ==================== 统计与备份 ====================

    /** 获取年度支出统计（按月分组） */
    getYearlyStats: (year: number) => Promise<any[]>
    /** 获取年度收入统计（按月分组） */
    getYearlyIncomeStats: (year: number) => Promise<any[]>
    /** 获取某月支出分类统计（饼图数据） */
    getCategoryStats: (year: number, month: number) => Promise<any[]>
    /** 获取某月收入分类统计（饼图数据） */
    getIncomeCategoryStats: (year: number, month: number) => Promise<any[]>
    /** 备份数据库文件到用户文档目录 */
    backup: () => Promise<string>
  }
}

/*
 * 创建 API 实现对象
 * 每个方法对应一个 IPC 调用，通道名和主进程的 ipcMain.handle 一一对应
 * 渲染进程通过 window.electronAPI.db.xxx() 调用时，实际上发送了一个 IPC 请求到主进程，
 * 主进程处理完后再把结果通过 Promise 返回给渲染进程
 */
const api: ElectronAPI = {
  db: {
    // --- 分类 ---
    getCategories: (type?: string) => ipcRenderer.invoke('db:getCategories', type),
    getParentCategories: () => ipcRenderer.invoke('db:getParentCategories'),
    getChildCategories: (parentId: number) => ipcRenderer.invoke('db:getChildCategories', parentId),
    addCategory: (category) => ipcRenderer.invoke('db:addCategory', category),
    updateCategory: (id, data) => ipcRenderer.invoke('db:updateCategory', id, data),
    deleteCategory: (id) => ipcRenderer.invoke('db:deleteCategory', id),

    // --- 花销 ---
    addExpense: (expense) => ipcRenderer.invoke('db:addExpense', expense),
    getExpenses: (options) => ipcRenderer.invoke('db:getExpenses', options),
    getExpensesByMonth: (year, month) => ipcRenderer.invoke('db:getExpensesByMonth', year, month),
    updateExpense: (id, data) => ipcRenderer.invoke('db:updateExpense', id, data),
    deleteExpense: (id) => ipcRenderer.invoke('db:deleteExpense', id),

    // --- 收入 ---
    addIncome: (income) => ipcRenderer.invoke('db:addIncome', income),
    getIncomes: (options) => ipcRenderer.invoke('db:getIncomes', options),
    getIncomesByMonth: (year, month) => ipcRenderer.invoke('db:getIncomesByMonth', year, month),
    updateIncome: (id, data) => ipcRenderer.invoke('db:updateIncome', id, data),
    deleteIncome: (id) => ipcRenderer.invoke('db:deleteIncome', id),

    // --- 统计 ---
    getYearlyStats: (year) => ipcRenderer.invoke('db:getYearlyStats', year),
    getYearlyIncomeStats: (year) => ipcRenderer.invoke('db:getYearlyIncomeStats', year),
    getCategoryStats: (year, month) => ipcRenderer.invoke('db:getCategoryStats', year, month),
    getIncomeCategoryStats: (year, month) => ipcRenderer.invoke('db:getIncomeCategoryStats', year, month),

    // --- 备份 ---
    backup: () => ipcRenderer.invoke('db:backup')
  }
}

/*
 * 把 API 对象注入到渲染进程的 window 对象上
 * 渲染进程可以通过 window.electronAPI 来访问所有数据库操作
 * 注意：这里用的不是普通的 window.electronAPI = api，而是 contextBridge.exposeInMainWorld
 * 区别在于：contextBridge 会在隔离的上下文中复制一份 API 给渲染进程，
 * 渲染进程拿到的不是原始对象，而是安全的"代理"，防止原型链污染攻击
 */
contextBridge.exposeInMainWorld('electronAPI', api)
