import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'

/*
 * ===== 数据库模块 =====
 *
 * 本模块封装了应用的 SQLite 数据库操作，包括：
 * - 数据库初始化（建表、建索引、写入预置分类数据）
 * - 数据库连接管理（单例模式，整个应用只用一个 db 实例）
 * - 给主进程的其他模块（index.ts）提供数据接口
 *
 * 为什么用 SQLite 而不是 MySQL/PostgreSQL？
 * - 桌面应用没有网络服务端，SQLite 是零配置的本地文件数据库
 * - 数据存储在用户目录下的 billing.db 文件中，随用随开
 * - better-sqlite3 是同步 API，编程模型简单，不用处理异步回调
 */

let db: Database.Database | null = null

/**
 * 获取数据库文件的完整路径
 * 数据库文件存储在 Electron 的 userData 目录下
 * - 开发环境：一般在 %APPDATA%/Electron/billing.db（Windows）
 * - 打包后：在 %APPDATA%/熊猫记账/billing.db
 * 这样的好处是：卸载应用时数据库自动被清理，不会遗留垃圾文件
 * @returns 数据库文件的完整路径字符串
 */
export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'billing.db')
}

/**
 * 获取数据库连接实例
 * 采用单例模式——整个应用生命周期只创建一个 db 实例
 * 调用前必须确保 initDatabase() 已经被调用过（app ready 时调用）
 * @returns better-sqlite3 的 Database 实例
 * @throws 如果数据库未初始化，抛出错误提示调用者先调用 initDatabase()
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function initDatabase(): void {
  const dbPath = getDbPath()
  db = new Database(dbPath)

  // 启用 WAL 模式，提升并发性能
  db.pragma('journal_mode = WAL')

  // 创建/迁移表
  db.exec(`
    /*
     * categories（分类表）——支撑两级分类体系
     * - parent_id IS NULL → 一级大类；parent_id 有值 → 二级小类
     * - type = 'expense' → 支出分类；type = 'income' → 收入分类
     * - ON DELETE RESTRICT 防止删除仍有子分类或记录的父分类
     */
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      type TEXT DEFAULT 'expense',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    /*
     * expenses（花销记录表）
     * - CHECK(amount > 0) 从数据库层面禁止录入金额为负或零的记录
     * - category_id 关联二级分类（用户直接选小类记账）
     * - payment_method 记录支付渠道，方便用户按月统计各渠道消费
     */
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK(amount > 0),
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      payment_method TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    /*
     * incomes（收入记录表）
     * - 结构和 expenses 对称，但用 source（来源）代替 payment_method（支付方式）
     * - 收支分开两张表，因为各自有独特字段，分开查询性能更好
     */
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK(amount > 0),
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    /* 索引：加速按日期查询花销（列表页按日期排序/筛选要用到） */
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    /* 索引：加速按分类查询花销（按分类筛选时用到） */
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    /* 索引：加速按日期查询收入 */
    CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
    /* 索引：加速按分类查询收入 */
    CREATE INDEX IF NOT EXISTS idx_incomes_category ON incomes(category_id);
    /* 索引：加速按父分类查找子分类（渲染分类树时用到） */
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  `)

/*
 * 兼容旧表结构：确保 categories 表有 type 列
 * 早期版本没有收入功能，分类只有支出类型，所以没有 type 列
 * 这个 ALTER TABLE 是为了老用户升级时数据不丢失
 */
  // 兼容旧表：确保 type 列存在
  try {
    db.exec("ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'expense'")
  } catch {
    // 列已存在说明是新表或已迁移过，忽略重复添加的错误
  }

  // 在迁移之后创建 type 索引（避免旧表还没有 type 列就建索引）
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)")
  } catch {
    // 忽略
  }

  /*
   * 判断数据库是否为空，决定是否需要写入预置分类数据
   * - 首次运行：一张分类都没有 → 写入完整的支出 + 收入分类
   * - 已有旧数据但没有收入分类（早期版本用户） → 只补充收入分类
   * - 已有完整数据 → 什么也不做
   */
  // 检查是否需要初始化预置数据
  const count = db.prepare("SELECT COUNT(*) as count FROM categories WHERE parent_id IS NULL").get() as any
  if (count.count === 0) {
    seedData()
  } else {
    // 检查是否需要补充收入分类
    const incomeCount = db.prepare("SELECT COUNT(*) as count FROM categories WHERE type = 'income' AND parent_id IS NULL").get() as any
    if (incomeCount.count === 0) {
      seedIncomeData()
    }
  }
}

/**
 * 写入预置的支出分类数据
 *
 * 数据结构说明：
 * - 9 个一级大类（餐饮、交通、购物、居住、娱乐、医疗、教育、人情、其他）
 * - 每个大类下有若干二级小类（共 40+ 个）
 * - 所有一级分类的 type 默认为 expense（因为插入时没有指定 type，用了表默认值）
 * - 使用事务（transaction）保证：要么全部写入成功，要么全部回滚
 * - 一级分类的 id 是硬编码的（1-9），这样后续升级时数据稳定，不会错乱
 * - 二级分类的 sort_order 使用 (index + 1) * 10，中间留空位方便后续插入新分类
 */
function seedData(): void {
  const insertCategory = db.prepare('INSERT INTO categories (name, parent_id, icon, sort_order) VALUES (?, ?, ?, ?)')

  // 用事务包裹批量插入，减少磁盘写入次数（几十条插入合并为一次写入）
  const transaction = db.transaction(() => {
    /*
     * 支出分类数据定义
     * 数据结构：每个一级分类包含 id、name、icon、children（二级分类数组）
     * id 硬编码（1-9），确保跨版本升级时分类 ID 稳定
     * icon 使用 Element Plus 的图标名
     */
    const categories: { id: number; name: string; icon: string; children: { name: string; icon?: string }[] }[] = [
      {
        id: 1, name: '餐饮', icon: 'food', children: [
          { name: '早餐' }, { name: '午餐' }, { name: '晚餐' },
          { name: '外卖' }, { name: '零食' }, { name: '饮料' }
        ]
      },
      {
        id: 2, name: '交通', icon: 'car', children: [
          { name: '公交' }, { name: '地铁' }, { name: '打车' },
          { name: '加油' }, { name: '停车' }, { name: '火车' }, { name: '飞机' }
        ]
      },
      {
        id: 3, name: '购物', icon: 'shopping-bag', children: [
          { name: '日用' }, { name: '服饰' }, { name: '数码' },
          { name: '家居' }, { name: '美妆' }
        ]
      },
      {
        id: 4, name: '居住', icon: 'home', children: [
          { name: '房租' }, { name: '水电' }, { name: '物业' },
          { name: '维修' }, { name: '网费' }
        ]
      },
      {
        id: 5, name: '娱乐', icon: 'camera', children: [
          { name: '电影' }, { name: '游戏' }, { name: '旅游' },
          { name: '运动' }, { name: '健身' }
        ]
      },
      {
        id: 6, name: '医疗', icon: 'first-aid-kit', children: [
          { name: '门诊' }, { name: '药品' }, { name: '住院' }, { name: '体检' }
        ]
      },
      {
        id: 7, name: '教育', icon: 'reading', children: [
          { name: '书籍' }, { name: '课程' }, { name: '考证' }, { name: '培训' }
        ]
      },
      {
        id: 8, name: '人情', icon: 'chat-line-square', children: [
          { name: '聚餐' }, { name: '红包' }, { name: '礼物' }, { name: '随礼' }
        ]
      },
      {
        id: 9, name: '其他', icon: 'more', children: [
          { name: '快递' }, { name: '话费' }, { name: '其他支出' }
        ]
      }
    ]

  // 逐一遍历一级分类，先插入父分类，再插入它的所有子分类
  // 注意：必须先插入父分类获取自增 ID，子分类的 parent_id 指向父分类的 id
    for (const cat of categories) {
      insertCategory.run(cat.name, null, cat.icon, cat.id)
      cat.children.forEach((child, index) => {
        insertCategory.run(child.name, cat.id, child.icon || '', (index + 1) * 10)
      })
    }
  })

  transaction()
}

/**
 * 写入预置的收入分类数据
 *
 * 数据结构说明：
 * - 4 个一级大类（工资、理财、红包、其他）
 * - 每个大类下有若干二级小类（共 14 个）
 * - 与 seedData 不同，这里显式指定 type = 'income'
 * - 单独抽成一个函数而非合并到 seedData，是为了兼容老用户升级：
 *   老用户已经有支出分类了，只需补充收入分类，不需要重新初始化全部数据
 * - 一级分类的 id 由 SQLite 自动生成（不硬编码），因为和支出分类混合存储在同一个表中
 */
function seedIncomeData(): void {
  // 插入一级分类时额外指定 type 为 income
  const insertParent = db.prepare("INSERT INTO categories (name, parent_id, icon, sort_order, type) VALUES (?, ?, ?, ?, 'income')")
  // 插入二级子分类时同样指定 type 为 income（子分类从父分类继承 type，但显式指定更保险）
  const insertChild = db.prepare("INSERT INTO categories (name, parent_id, icon, sort_order, type) VALUES (?, ?, ?, ?, 'income')")

  const transaction = db.transaction(() => {
    /*
     * 收入分类数据定义
     * 与支出分类不同：①没有 id 硬编码（由数据库自增） ②所有分类 type = 'income'
     */
    const incomeCategories: { name: string; icon: string; children: { name: string; icon?: string }[] }[] = [
      {
        name: '工资', icon: 'money', children: [
          { name: '月薪' }, { name: '奖金' }, { name: '补贴' }, { name: '兼职' }
        ]
      },
      {
        name: '理财', icon: 'trend-charts', children: [
          { name: '利息' }, { name: '基金' }, { name: '股票' }, { name: '理财收益' }
        ]
      },
      {
        name: '红包', icon: 'present', children: [
          { name: '微信红包' }, { name: '节日红包' }, { name: '生日红包' }
        ]
      },
      {
        name: '其他', icon: 'more-filled', children: [
          { name: '退款' }, { name: '报销' }, { name: '其他收入' }
        ]
      }
    ]

    // 遍历一级收入分类：先插入父分类获取自增 ID，再插入所有子分类
    for (const cat of incomeCategories) {
      const result = insertParent.run(cat.name, null, cat.icon, cat.children.length)
      const parentId = result.lastInsertRowid as number
      cat.children.forEach((child, index) => {
        insertChild.run(child.name, parentId, child.icon || '', (index + 1) * 10)
      })
    }
  })

  transaction()
}

/**
 * 关闭数据库连接
 * 在应用退出时调用（目前主进程没有显式调用，但保留此函数供需要时使用）
 * 关闭后 db 置为 null，防止其他代码在数据库关闭后继续操作导致崩溃
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
