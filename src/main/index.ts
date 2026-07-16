import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initDatabase, getDb } from './database'

/*
 * ===== 主进程入口 =====
 * 这是 Electron 的主进程文件，负责：
 * - 创建和管理应用窗口
 * - 初始化和操作 SQLite 数据库
 * - 通过 IPC（进程间通信）暴露数据库能力给渲染进程
 * - 处理应用生命周期事件
 */

// 判断是否为开发环境：app.isPackaged 在生产模式下为 true，开发模式下为 false
// 用于区分加载开发服务器还是打包后的静态文件
const isDev = !app.isPackaged

/**
 * 设置 Windows 任务栏的应用模型 ID（AppUserModelID）
 * 作用是让 Windows 能把我们的应用正确分组到任务栏图标上，而不是和 Electron 默认图标混在一起
 * @param id 应用标识符，打包后使用传入的 id，开发环境下用进程路径
 */
function setAppUserModelId(id: string): void {
  if (process.platform === 'win32') app.setAppUserModelId(isDev ? process.execPath : id)
}

/**
 * 注册窗口快捷键（当前功能预留）
 * watchWindowShortcuts 钩子在每个新窗口创建时被调用
 * 未来可以在这里注册开发者工具快捷键、刷新等快捷操作
 * @param window 要注册快捷键的 BrowserWindow 实例
 */
function watchWindowShortcuts(window: BrowserWindow): void {
  // noop — 窗口快捷键功能可选的，暂时不实现具体逻辑
}

// ===== 函数实现区：窗口管理 =====

let mainWindow: BrowserWindow | null = null

/**
 * 创建应用主窗口
 * 配置窗口尺寸、标题、安全策略（关闭 nodeIntegration 开启 contextIsolation），
 * 以及加载渲染进程的页面（开发环境用 dev server URL，生产环境用打包后的文件）
 *
 * 安全设计说明：
 * - sandbox: false — 因为 better-sqlite3 是原生模块，渲染进程需要通过预加载脚本间接调用
 * - contextIsolation: true — 隔离渲染进程和 Node.js 上下文，防止 XSS 攻击直接操作系统
 * - nodeIntegration: false — 不让渲染进程直接 require Node.js API
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    // 先隐藏窗口，等页面 ready-to-show 再显示——避免白屏闪烁
    show: false,
    // 自动隐藏菜单栏，Windows 上按 Alt 键可以临时显示
    autoHideMenuBar: true,
    title: '熊猫记账',
    webPreferences: {
      // 预加载脚本路径，注意打包后目录结构会变化，所以用 __dirname 拼接
      preload: join(__dirname, '../preload/index.js'),
      // 关闭沙箱模式——因为 better-sqlite3 是原生模块，需要访问 Node.js API
      sandbox: false,
      // 开启上下文隔离，保证渲染进程不能直接访问 Node.js API，只能通过预加载脚本通信
      contextIsolation: true,
      // 禁止渲染进程直接使用 Node.js 能力，配合 contextIsolation 构建安全屏障
      nodeIntegration: false
    }
  })

  // 等页面渲染完成后显示窗口，给用户一个完整的界面而不是白屏
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 拦截新窗口打开请求（如 target="_blank"），改用系统默认浏览器打开外部链接
  // 这是安全措施——不让 Electron 窗口随意加载外部页面
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发模式下加载 Vite 开发服务器地址，生产模式加载打包后的 HTML 文件
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ===== 应用生命周期 =====

// app 就绪后的初始化流程：设置应用 ID、初始化数据库、注册 IPC 通道、创建窗口
app.whenReady().then(() => {
  // 设置 Windows 任务栏分组标识，让应用在任务栏中拥有正确的图标分组
  setAppUserModelId('com.panda.billing')

  // 监听窗口创建事件，后续可以在新窗口上注册快捷键
  app.on('browser-window-created', (_, window) => {
    watchWindowShortcuts(window)
  })

  // 初始化 SQLite 数据库（建表、写入预置分类数据）
  initDatabase()

  // 注册所有 IPC 处理器，让渲染进程可以调用主进程的数据库操作
  registerIpcHandlers()

  // 创建主窗口
  createWindow()

  // macOS 下点击 Dock 图标时，如果没有窗口则重新创建一个
  // 其他操作系统不需要这个行为，因为关闭窗口默认会退出应用
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时的处理：macOS 下不退出（符合 Mac 应用习惯），其他平台退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 注册所有 IPC 处理器
 * 这里把数据库 CRUD 操作封装成 IPC 通道，供渲染进程通过预加载脚本调用
 * 每个处理器对应一个"db:xxx"通道名，采用请求-响应模式（ipcMain.handle / ipcRenderer.invoke）
 */
function registerIpcHandlers(): void {
  const db = getDb()

  /*
   * 以下所有 IPC 处理器均遵循统一模式：
   * 1. 渲染进程通过 preload 脚本中的 electronAPI.db.xxx 调用
   * 2. preload 通过 ipcRenderer.invoke('db:xxx', ...) 发送请求
   * 3. 这里通过 ipcMain.handle('db:xxx', ...) 处理请求
   * 4. 处理结果通过 Promise 返回给渲染进程
   *
   * 这种 IPC 模式（invoke/handle）是双向的且支持异步返回结果，
   * 相比 send/on 模式更适合数据库 CRUD 的请求-响应场景
   */

  // ==================== 分类相关 ====================

  /**
   * 获取所有分类，返回树形结构（一级分类嵌套二级分类）
   * 可选参数 type 可以筛选支出分类（expense）或收入分类（income）
   * @param type 分类类型：'expense' | 'income'，不传则返回全部
   * @returns 一级分类数组，每个元素包含 children 属性
   */
  ipcMain.handle('db:getCategories', (_event, type?: string) => {
    // 构建基础查询语句：按 sort_order 排序确保分类显示顺序可控
    let sql = 'SELECT * FROM categories ORDER BY sort_order ASC, id ASC'
    const params: any[] = []
    if (type) {
      // 如果传了 type 参数，加上 WHERE 筛选条件
      sql = 'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC, id ASC'
      params.push(type)
    }
    // 一次性查出所有分类数据，然后在内存中组装成树形结构
    // 这样做比多次查询数据库效率更高（一次查询 vs N+1 次查询）
    const rows = db.prepare(sql).all(...params)
    // 先筛选出一级分类（parent_id 为空）
    const parents = rows.filter((r: any) => !r.parent_id)
    // 为每个一级分类挂载其子分类（children）
    return parents.map((p: any) => ({
      ...p,
      children: rows.filter((r: any) => r.parent_id === p.id)
    }))
  })

  /**
   * 获取所有一级分类（parent_id 为空的顶级分类）
   * @returns 一级分类列表
   */
  ipcMain.handle('db:getParentCategories', () => {
    return db.prepare('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC').all()
  })

  /**
   * 根据父分类 ID 获取其下的二级分类
   * @param parentId 父分类的 ID
   * @returns 二级分类列表
   */
  ipcMain.handle('db:getChildCategories', (_event, parentId: number) => {
    return db.prepare('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC').all(parentId)
  })

  /**
   * 添加分类（支持添加一级分类和二级分类）
   * 自动处理类型继承：二级分类从父分类继承 type，一级分类默认为 expense
   * 同时做同名校验，避免同一级别下出现重复名称
   * @param category 分类信息对象
   * @returns 新创建的分类对象（包含数据库生成的 id）
   */
  ipcMain.handle('db:addCategory', (_event, category: { name: string; parent_id: number | null; icon: string; sort_order: number; type?: string }) => {
    // 如果没有传入 type，从父分类继承 type，默认为 expense
    let type = category.type || 'expense'
    if (!category.type && category.parent_id) {
      const parent = db.prepare('SELECT type FROM categories WHERE id = ?').get(category.parent_id) as any
      type = parent?.type || 'expense'
    }

    // 同名校验：防止同一层级下出现同名分类，避免用户混淆
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

  /**
   * 更新分类信息（名称、图标、排序号）
   * 只更新传入了的字段，其他字段保持不变——这叫"部分更新"
   * @param id 分类 ID
   * @param data 要更新的字段对象
   */
  ipcMain.handle('db:updateCategory', (_event, id: number, data: { name?: string; icon?: string; sort_order?: number }) => {
    // 动态拼接 SET 子句：只更新有值的字段
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon) }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order) }
    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  })

  /**
   * 删除分类（含安全校验）
   * - 删除一级分类前，会先检查其下所有二级分类是否有关联的花销/收入记录
   * - 如果有记录，禁止删除并提示用户先删除相关记录
   * - 删除一级分类会连带删除其下的所有二级分类
   * @param id 要删除的分类 ID
   */
  ipcMain.handle('db:deleteCategory', (_event, id: number) => {
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any
    if (!cat) throw new Error('分类不存在')

    if (!cat.parent_id) {
      // 一级分类：先检查所有子分类是否关联了记录
      const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(id) as any[]
      for (const child of children) {
        const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(child.id) as any
        if (expenseCount.count > 0) throw new Error('该分类下有子分类关联了花销记录，请先删除相关记录')
        const incomeCount = db.prepare('SELECT COUNT(*) as count FROM incomes WHERE category_id = ?').get(child.id) as any
        if (incomeCount.count > 0) throw new Error('该分类下有子分类关联了收入记录，请先删除相关记录')
      }
      // 先删除所有子分类（外键约束要求先删除子记录），再删除一级分类
      db.prepare('DELETE FROM categories WHERE parent_id = ?').run(id)
      db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    } else {
      // 二级分类：检查自身是否有记录关联，有则禁止删除
      const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(id) as any
      if (expenseCount.count > 0) throw new Error('该分类下有花销记录，无法删除')
      const incomeCount = db.prepare('SELECT COUNT(*) as count FROM incomes WHERE category_id = ?').get(id) as any
      if (incomeCount.count > 0) throw new Error('该分类下有收入记录，无法删除')
      db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    }
  })

  // ==================== 花销相关 ====================

  /**
   * 添加一笔花销记录
   * @param expense 花销数据对象（金额、分类、日期、备注、支付方式）
   * @returns 新创建的花销记录（包含数据库生成的 id）
   */
  ipcMain.handle('db:addExpense', (_event, expense: { amount: number; category_id: number; date: string; note?: string; payment_method?: string }) => {
    const stmt = db.prepare('INSERT INTO expenses (amount, category_id, date, note, payment_method) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(expense.amount, expense.category_id, expense.date, expense.note || '', expense.payment_method || '')
    return { id: result.lastInsertRowid, ...expense }
  })

  /**
   * 获取花销列表（支持分页、按日期范围筛选、按分类筛选）
   * 同时返回总记录数，供前端做分页组件使用
   * 用 LEFT JOIN 关联分类表，方便前端直接展示分类名称和图标
   * @param options 查询参数（页码、每页条数、开始日期、结束日期、分类 ID）
   * @returns 包含 list、total、page、pageSize 的分页结果
   */
  ipcMain.handle('db:getExpenses', (_event, options: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; category_id?: number }) => {
    // 主查询语句：关联二级分类和一级分类，一次性查出需要的展示字段
    let sql = `
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             p.name as parent_category_name, p.id as parent_category_id
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    // 动态拼接筛选条件：满足所有传入的条件（AND 关系）
    if (options.dateFrom) { sql += ' AND e.date >= ?'; params.push(options.dateFrom) }
    if (options.dateTo) { sql += ' AND e.date <= ?'; params.push(options.dateTo) }
    if (options.category_id) { sql += ' AND (e.category_id = ? OR c.parent_id = ?)'; params.push(options.category_id, options.category_id) }

    // 总记录数查询——独立 SQL 避免拼接 LIMIT/OFFSET 后影响 COUNT 结果
    let countSql = 'SELECT COUNT(*) as total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id LEFT JOIN categories p ON c.parent_id = p.id WHERE 1=1'
    const countParams: any[] = []
    if (options.dateFrom) { countSql += ' AND e.date >= ?'; countParams.push(options.dateFrom) }
    if (options.dateTo) { countSql += ' AND e.date <= ?'; countParams.push(options.dateTo) }
    if (options.category_id) { countSql += ' AND (e.category_id = ? OR c.parent_id = ?)'; countParams.push(options.category_id, options.category_id) }
    const countResult = db.prepare(countSql).get(...countParams) as any

    // 按日期降序排列，最新的记录排在最前面
    sql += ' ORDER BY e.date DESC, e.created_at DESC'

    // 分页处理：计算偏移量并拼接到 SQL 语句
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

  /**
   * 获取某个月的所有花销记录（按天分组）
   * 同时返回月度汇总统计（总金额、一级分类汇总）
   * 前端统计页用到这个接口来展示月度详情
   * @param year 年份（如 2026）
   * @param month 月份（1-12）
   * @returns 包含 daily（按天分组）、totalAmount、categoryTotal（分类汇总）、count
   */
  ipcMain.handle('db:getExpensesByMonth', (_event, year: number, month: number) => {
    // 用 LIKE 匹配当月所有日期：如 '2026-07%' 匹配 7 月的所有记录
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const rows = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, p.name as parent_category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE e.date LIKE ?
      ORDER BY e.date DESC, e.created_at DESC
    `).all(`${monthStr}%`) as any[]

    // 按日分组：把同一天的所有记录放到同一个数组里
    const dailyMap: Record<string, any[]> = {}
    rows.forEach(row => {
      if (!dailyMap[row.date]) dailyMap[row.date] = []
      dailyMap[row.date].push(row)
    })

    // 计算月度统计：总金额 + 每个一级分类的汇总
    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0)
    const categoryTotal: Record<number, { name: string; icon: string; total: number }> = {}
    rows.forEach(r => {
      // 用一级分类 ID 做聚合键——因为饼图展示的是大类占比
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

  /**
   * 更新花销记录（部分更新，只修改传入了的字段）
   * 同时自动更新 updated_at 时间戳
   * @param id 记录 ID
   * @param data 要更新的字段对象
   */
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

  /**
   * 删除花销记录
   * @param id 要删除的记录 ID
   */
  ipcMain.handle('db:deleteExpense', (_event, id: number) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
  })

  // ==================== 收入相关 ====================

  /**
   * 添加一笔收入记录
   * @param income 收入数据对象（金额、分类、日期、备注、来源）
   * @returns 新创建的收入记录（包含数据库生成的 id）
   */
  ipcMain.handle('db:addIncome', (_event, income: { amount: number; category_id: number; date: string; note?: string; source?: string }) => {
    const stmt = db.prepare('INSERT INTO incomes (amount, category_id, date, note, source) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(income.amount, income.category_id, income.date, income.note || '', income.source || '')
    return { id: result.lastInsertRowid, ...income }
  })

  /**
   * 获取收入列表（支持分页、按日期范围筛选、按分类筛选）
   * 结构和花销列表接口一致，前端可以统一处理逻辑
   * @param options 查询参数（页码、每页条数、开始日期、结束日期、分类 ID）
   * @returns 包含 list、total、page、pageSize 的分页结果
   */
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

    // 独立 COUNT 查询，和主查询分离——避免 LIMIT/OFFSET 影响总数统计
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

  /**
   * 获取某个月的收入记录（按天分组）
   * @param year 年份
   * @param month 月份（1-12）
   * @returns 包含 daily（按天分组）、totalAmount、categoryTotal（分类汇总）、count
   */
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

    // 按天分组：前端展示每日收入明细更方便
    const dailyMap: Record<string, any[]> = {}
    rows.forEach(row => {
      if (!dailyMap[row.date]) dailyMap[row.date] = []
      dailyMap[row.date].push(row)
    })

    // 月度汇总统计
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

  /**
   * 更新收入记录（部分更新）
   * @param id 记录 ID
   * @param data 要更新的字段对象
   */
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

  /**
   * 删除收入记录
   * @param id 要删除的记录 ID
   */
  ipcMain.handle('db:deleteIncome', (_event, id: number) => {
    db.prepare('DELETE FROM incomes WHERE id = ?').run(id)
  })

  // ==================== 统计相关 ====================

  /**
   * 获取某一年的月度支出统计
   * 用 SQL 的 strftime 函数按月份分组统计，效率高于查询全部后在 JS 中分组
   * @param year 年份（如 2026）
   * @returns 每月汇总数据：[{ month: '01', total: 123.45, count: 5 }, ...]
   */
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

  /**
   * 获取某一年的月度收入统计
   * @param year 年份
   * @returns 每月汇总数据
   */
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

  /**
   * 获取某个月份的支出分类统计（饼图数据）
   * 按一级分类汇总支出金额，按 total 降序排列
   * @param year 年份
   * @param month 月份
   * @returns [{ name: '餐饮', value: 123.45 }, ...] 格式的饼图数据
   */
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
    // 转成 ECharts 饼图需要的格式：name + value
    return rows.map(r => ({
      name: r.parent_name || '未分类',
      value: r.total
    }))
  })

  /**
   * 获取某个月份的收入分类统计（饼图数据）
   * @param year 年份
   * @param month 月份
   * @returns [{ name: '工资', value: 123.45 }, ...] 格式的饼图数据
   */
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

  /**
   * 备份数据库文件到用户文档目录
   * 备份文件名带时间戳，避免覆盖之前的备份
   * 备份目录为 "文档/熊猫记账备份/"
   * @returns 备份文件的完整路径
   */
  ipcMain.handle('db:backup', () => {
    const fs = require('fs')
    const path = require('path')
    const { app: app2 } = require('electron')
    // 获取数据库文件的实际路径
    const dbPath = path.join(app2.getPath('userData'), 'billing.db')
    // 备份目录：用户的"文档"文件夹下
    const backupDir = path.join(app2.getPath('documents'), '熊猫记账备份')
    // 确保备份目录存在（不存在则创建）
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    // 用时间戳命名备份文件，避免文件名冲突
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `billing-backup-${timestamp}.db`)
    // 简单拷贝即可——SQLite 在 WAL 模式下文件可以被安全拷贝
    fs.copyFileSync(dbPath, backupPath)
    return backupPath
  })
}
