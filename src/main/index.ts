import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, getDb } from './database'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: '熊猫记账',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.panda.billing')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化数据库
  initDatabase()

  // 注册 IPC 处理器
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers(): void {
  const db = getDb()

  // === 分类相关 ===

  // 获取所有分类（含层级结构），可选按类型筛选
  ipcMain.handle('db:getCategories', (_event, type?: string) => {
    let sql = 'SELECT * FROM categories ORDER BY sort_order ASC, id ASC'
    const params: any[] = []
    if (type) {
      sql = 'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC, id ASC'
      params.push(type)
    }
    const rows = db.prepare(sql).all(...params)
    const parents = rows.filter((r: any) => !r.parent_id)
    return parents.map((p: any) => ({
      ...p,
      children: rows.filter((r: any) => r.parent_id === p.id)
    }))
  })

  // 获取所有一级分类
  ipcMain.handle('db:getParentCategories', () => {
    return db.prepare('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC').all()
  })

  // 根据父分类 ID 获取二级分类
  ipcMain.handle('db:getChildCategories', (_event, parentId: number) => {
    return db.prepare('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC').all(parentId)
  })

  // 添加分类
  ipcMain.handle('db:addCategory', (_event, category: { name: string; parent_id: number | null; icon: string; sort_order: number; type?: string }) => {
    // 如果没有传入 type，从父分类继承 type，默认为 expense
    let type = category.type || 'expense'
    if (!category.type && category.parent_id) {
      const parent = db.prepare('SELECT type FROM categories WHERE id = ?').get(category.parent_id) as any
      type = parent?.type || 'expense'
    }

    // 同名校验
    if (category.parent_id) {
      // 二级分类：同级下名称不能重复
      const sibling = db.prepare('SELECT id FROM categories WHERE parent_id = ? AND name = ?').get(category.parent_id, category.name) as any
      if (sibling) {
        throw new Error(`子分类「${category.name}」已存在`)
      }
    } else {
      // 一级分类：同类型下名称不能重复
      const sameName = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL AND name = ? AND type = ?').get(category.name, type) as any
      if (sameName) {
        throw new Error(`一级分类「${category.name}」已存在`)
      }
    }

    const stmt = db.prepare('INSERT INTO categories (name, parent_id, icon, sort_order, type) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(category.name, category.parent_id, category.icon, category.sort_order, type)
    return { id: result.lastInsertRowid, ...category, type }
  })

  // 更新分类
  ipcMain.handle('db:updateCategory', (_event, id: number, data: { name?: string; icon?: string; sort_order?: number }) => {
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon) }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order) }
    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  })

  // 删除分类
  ipcMain.handle('db:deleteCategory', (_event, id: number) => {
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any
    if (!cat) throw new Error('分类不存在')

    if (!cat.parent_id) {
      // 一级分类：检查所有子分类是否有关联记录
      const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(id) as any[]
      for (const child of children) {
        const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(child.id) as any
        if (expenseCount.count > 0) throw new Error('该分类下有子分类关联了花销记录，请先删除相关记录')
        const incomeCount = db.prepare('SELECT COUNT(*) as count FROM incomes WHERE category_id = ?').get(child.id) as any
        if (incomeCount.count > 0) throw new Error('该分类下有子分类关联了收入记录，请先删除相关记录')
      }
      // 先删除所有子分类，再删除自己
      db.prepare('DELETE FROM categories WHERE parent_id = ?').run(id)
      db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    } else {
      // 二级分类：检查是否有记录
      const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(id) as any
      if (expenseCount.count > 0) throw new Error('该分类下有花销记录，无法删除')
      const incomeCount = db.prepare('SELECT COUNT(*) as count FROM incomes WHERE category_id = ?').get(id) as any
      if (incomeCount.count > 0) throw new Error('该分类下有收入记录，无法删除')
      db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    }
  })

  // === 花销相关 ===

  // 添加花销记录
  ipcMain.handle('db:addExpense', (_event, expense: { amount: number; category_id: number; date: string; note?: string; payment_method?: string }) => {
    const stmt = db.prepare('INSERT INTO expenses (amount, category_id, date, note, payment_method) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(expense.amount, expense.category_id, expense.date, expense.note || '', expense.payment_method || '')
    return { id: result.lastInsertRowid, ...expense }
  })

  // 获取花销列表（支持分页和筛选）
  ipcMain.handle('db:getExpenses', (_event, options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => {
    let sql = `
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             p.name as parent_category_name, p.id as parent_category_id
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    if (options.dateFrom) { sql += ' AND e.date >= ?'; params.push(options.dateFrom) }
    if (options.dateTo) { sql += ' AND e.date <= ?'; params.push(options.dateTo) }
    if (options.category_id) { sql += ' AND (e.category_id = ? OR c.parent_id = ?)'; params.push(options.category_id, options.category_id) }

    // 总记录数 — 独立 SQL 避免 replace 匹配问题
    let countSql = 'SELECT COUNT(*) as total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id LEFT JOIN categories p ON c.parent_id = p.id WHERE 1=1'
    const countParams: any[] = []
    if (options.dateFrom) { countSql += ' AND e.date >= ?'; countParams.push(options.dateFrom) }
    if (options.dateTo) { countSql += ' AND e.date <= ?'; countParams.push(options.dateTo) }
    if (options.category_id) { countSql += ' AND (e.category_id = ? OR c.parent_id = ?)'; countParams.push(options.category_id, options.category_id) }
    const countResult = db.prepare(countSql).get(...countParams) as any

    sql += ' ORDER BY e.date DESC, e.created_at DESC'

    const page = options.page || 1
    const pageSize = options.pageSize || 50
    const offset = (page - 1) * pageSize
    sql += ' LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const rows = db.prepare(sql).all(...params)

    return {
      list: rows,
      total: countResult.total,
      page,
      pageSize
    }
  })

  // 获取某个月的花销（按天分组）
  ipcMain.handle('db:getExpensesByMonth', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const rows = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, p.name as parent_category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE e.date LIKE ?
      ORDER BY e.date DESC, e.created_at DESC
    `).all(`${monthStr}%`) as any[]

    // 按日分组
    const dailyMap: Record<string, any[]> = {}
    rows.forEach(row => {
      if (!dailyMap[row.date]) dailyMap[row.date] = []
      dailyMap[row.date].push(row)
    })

    // 计算月度统计
    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0)
    const categoryTotal: Record<number, { name: string; icon: string; total: number }> = {}
    rows.forEach(r => {
      const pid = r.parent_category_id || r.category_id
      const pname = r.parent_category_name || r.category_name
      if (!categoryTotal[pid]) {
        categoryTotal[pid] = { name: pname, icon: r.category_icon, total: 0 }
      }
      categoryTotal[pid].total += r.amount
    })

    return {
      daily: dailyMap,
      totalAmount,
      categoryTotal: Object.entries(categoryTotal).map(([id, val]) => ({ id: Number(id), ...val })),
      count: rows.length
    }
  })

  // 更新花销记录
  ipcMain.handle('db:updateExpense', (_event, id: number, data: { amount?: number; category_id?: number; date?: string; note?: string; payment_method?: string }) => {
    const fields: string[] = []
    const values: any[] = []
    if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount) }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id) }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
    if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note) }
    if (data.payment_method !== undefined) { fields.push('payment_method = ?'); values.push(data.payment_method) }
    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE expenses SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...values)
  })

  // 删除花销记录
  ipcMain.handle('db:deleteExpense', (_event, id: number) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
  })

  // === 收入相关 ===

  // 添加收入记录
  ipcMain.handle('db:addIncome', (_event, income: { amount: number; category_id: number; date: string; note?: string; source?: string }) => {
    const stmt = db.prepare('INSERT INTO incomes (amount, category_id, date, note, source) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(income.amount, income.category_id, income.date, income.note || '', income.source || '')
    return { id: result.lastInsertRowid, ...income }
  })

  // 获取收入列表（支持分页和筛选）
  ipcMain.handle('db:getIncomes', (_event, options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => {
    let sql = `
      SELECT i.*, c.name as category_name, c.icon as category_icon,
             p.name as parent_category_name, p.id as parent_category_id
      FROM incomes i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    if (options.dateFrom) { sql += ' AND i.date >= ?'; params.push(options.dateFrom) }
    if (options.dateTo) { sql += ' AND i.date <= ?'; params.push(options.dateTo) }
    if (options.category_id) { sql += ' AND (i.category_id = ? OR c.parent_id = ?)'; params.push(options.category_id, options.category_id) }

    let countSql = 'SELECT COUNT(*) as total FROM incomes i LEFT JOIN categories c ON i.category_id = c.id LEFT JOIN categories p ON c.parent_id = p.id WHERE 1=1'
    const countParams: any[] = []
    if (options.dateFrom) { countSql += ' AND i.date >= ?'; countParams.push(options.dateFrom) }
    if (options.dateTo) { countSql += ' AND i.date <= ?'; countParams.push(options.dateTo) }
    if (options.category_id) { countSql += ' AND (i.category_id = ? OR c.parent_id = ?)'; countParams.push(options.category_id, options.category_id) }
    const countResult = db.prepare(countSql).get(...countParams) as any

    sql += ' ORDER BY i.date DESC, i.created_at DESC'

    const page = options.page || 1
    const pageSize = options.pageSize || 50
    const offset = (page - 1) * pageSize
    sql += ' LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const rows = db.prepare(sql).all(...params)

    return {
      list: rows,
      total: countResult.total,
      page,
      pageSize
    }
  })

  // 获取某个月的收入（按天分组）
  ipcMain.handle('db:getIncomesByMonth', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const rows = db.prepare(`
      SELECT i.*, c.name as category_name, c.icon as category_icon, p.name as parent_category_name
      FROM incomes i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE i.date LIKE ?
      ORDER BY i.date DESC, i.created_at DESC
    `).all(`${monthStr}%`) as any[]

    const dailyMap: Record<string, any[]> = {}
    rows.forEach(row => {
      if (!dailyMap[row.date]) dailyMap[row.date] = []
      dailyMap[row.date].push(row)
    })

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0)
    const categoryTotal: Record<number, { name: string; icon: string; total: number }> = {}
    rows.forEach(r => {
      const pid = r.parent_category_id || r.category_id
      const pname = r.parent_category_name || r.category_name
      if (!categoryTotal[pid]) {
        categoryTotal[pid] = { name: pname, icon: r.category_icon, total: 0 }
      }
      categoryTotal[pid].total += r.amount
    })

    return {
      daily: dailyMap,
      totalAmount,
      categoryTotal: Object.entries(categoryTotal).map(([id, val]) => ({ id: Number(id), ...val })),
      count: rows.length
    }
  })

  // 更新收入记录
  ipcMain.handle('db:updateIncome', (_event, id: number, data: { amount?: number; category_id?: number; date?: string; note?: string; source?: string }) => {
    const fields: string[] = []
    const values: any[] = []
    if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount) }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id) }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
    if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note) }
    if (data.source !== undefined) { fields.push('source = ?'); values.push(data.source) }
    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE incomes SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...values)
  })

  // 删除收入记录
  ipcMain.handle('db:deleteIncome', (_event, id: number) => {
    db.prepare('DELETE FROM incomes WHERE id = ?').run(id)
  })

  // === 统计相关 ===

  // 获取年度月度支出统计
  ipcMain.handle('db:getYearlyStats', (_event, year: number) => {
    const rows = db.prepare(`
      SELECT strftime('%m', date) as month, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE strftime('%Y', date) = ?
      GROUP BY strftime('%m', date)
      ORDER BY month ASC
    `).all(String(year)) as any[]
    return rows
  })

  // 获取年度月度收入统计
  ipcMain.handle('db:getYearlyIncomeStats', (_event, year: number) => {
    const rows = db.prepare(`
      SELECT strftime('%m', date) as month, SUM(amount) as total, COUNT(*) as count
      FROM incomes
      WHERE strftime('%Y', date) = ?
      GROUP BY strftime('%m', date)
      ORDER BY month ASC
    `).all(String(year)) as any[]
    return rows
  })

  // 获取月度分类统计（饼图数据）
  ipcMain.handle('db:getCategoryStats', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const rows = db.prepare(`
      SELECT c.parent_id, p.name as parent_name, SUM(e.amount) as total
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE e.date LIKE ?
      GROUP BY c.parent_id
      ORDER BY total DESC
    `).all(`${monthStr}%`) as any[]
    return rows.map(r => ({
      name: r.parent_name || '未分类',
      value: r.total
    }))
  })

  // 获取月度收入分类统计（饼图数据）
  ipcMain.handle('db:getIncomeCategoryStats', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const rows = db.prepare(`
      SELECT c.parent_id, p.name as parent_name, SUM(i.amount) as total
      FROM incomes i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE i.date LIKE ?
      GROUP BY c.parent_id
      ORDER BY total DESC
    `).all(`${monthStr}%`) as any[]
    return rows.map(r => ({
      name: r.parent_name || '未分类',
      value: r.total
    }))
  })

  // 数据库备份
  ipcMain.handle('db:backup', () => {
    const fs = require('fs')
    const path = require('path')
    const { app: app2 } = require('electron')
    const dbPath = path.join(app2.getPath('userData'), 'billing.db')
    const backupDir = path.join(app2.getPath('documents'), '熊猫记账备份')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `billing-backup-${timestamp}.db`)
    fs.copyFileSync(dbPath, backupPath)
    return backupPath
  })
}
