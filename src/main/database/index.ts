import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'billing.db')
}

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

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

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

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  `)

  // 检查是否需要初始化预置数据
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as any
  if (count.count === 0) {
    seedData()
  }
}

function seedData(): void {
  const insertCategory = db.prepare('INSERT INTO categories (name, parent_id, icon, sort_order) VALUES (?, ?, ?, ?)')

  const transaction = db.transaction(() => {
    // 一级分类
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

    for (const cat of categories) {
      insertCategory.run(cat.name, null, cat.icon, cat.id)
      cat.children.forEach((child, index) => {
        insertCategory.run(child.name, cat.id, child.icon || '', (index + 1) * 10)
      })
    }
  })

  transaction()
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
