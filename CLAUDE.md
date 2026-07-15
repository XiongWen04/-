# 黑马记账 APP — 产品文档

## 📋 项目概述

**项目名称：** 黑马记账  
**目标平台：** Windows & Mac（跨平台桌面应用）  
**技术方案：** 方案 A — Electron + Vue 3 + SQLite  
**核心功能：** 记录用户每一次花销，支持两级分类管理（一级大类 → 二级小类）

---

## 🏗️ 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Vue 3 | ^3.5 | Composition API + `<script setup>` |
| **构建工具** | Vite + electron-vite | ^5.0 | 官方 Electron + Vite 集成 |
| **UI 组件库** | Element Plus | ^2.14 | 中文本地化好，组件丰富 |
| **桌面壳** | Electron | ^43 | 跨平台桌面应用 |
| **打包** | electron-builder | ^26 | 打包为 Windows(.exe) 和 Mac(.dmg) |
| **数据存储** | SQLite (better-sqlite3) | ^12 | 本地单文件数据库，零运维 |
| **CSS 方案** | SCSS | — | 全局样式管理 |
| **状态管理** | Pinia | ^2.3 | Vue 3 官方推荐状态管理 |
| **路由** | Vue Router | ^4.6 | 页面路由管理 |
| **图表** | ECharts + vue-echarts | ^6.1 | 数据可视化 |
| **日期处理** | dayjs | ^1.11 | 日期格式化与计算 |

---

## 🧩 功能需求

### 核心功能（MVP — 已完成 ✅）

1. **记录花销** ✅
   - 金额（必填）
   - 选择一级分类 & 二级分类（必填，级联选择器）
   - 日期（默认当天，可修改）
   - 备注（可选）
   - 支付方式（可选：微信/支付宝/银行卡/现金/其他）

2. **花销分类体系（两级）** ✅
   - 9 个一级大类：餐饮、交通、购物、居住、娱乐、医疗、教育、人情、其他
   - 40+ 个二级小类预置，用户可自定义添加/删除二级分类

3. **花销列表查看** ✅
   - 按时间倒序展示所有花销记录
   - 按月分组展示，显示每月合计
   - 支持按日期范围、分类筛选
   - 支持分页

4. **数据统计概览** ✅
   - 本月总支出卡片
   - 按分类的支出分布（饼图）
   - 每日支出趋势（折线图 + 面积图）
   - 每日明细列表

5. **首页概览** ✅
   - 本月总支出 + 笔数
   - 快捷记账按钮（8 个快捷入口）
   - 最近 5 条记录
   - 本月分类占比进度条

6. **分类管理** ✅
   - 查看所有分类（一/二级树形结构）
   - 自定义添加二级小类
   - 删除二级小类（有安全校验）

7. **设置** ✅
   - 应用信息展示
   - 数据库备份到文档目录

### 扩展功能（后期规划 — ⏳ 未开始）

8. **数据导出** — 导出为 CSV / Excel 格式
9. **预算管理** — 每月分大类设置预算上限
10. **备份与恢复** — 导入备份文件恢复数据

---

## 🎨 页面设计

| # | 页面名称 | 路由 | 说明 | 状态 |
|---|---------|------|------|:----:|
| 1 | 首页/概览 | `/home` | 本月支出概览、快捷记账入口 | ✅ |
| 2 | 新增记录 | `/add` | 填写花销信息的表单页 | ✅ |
| 3 | 花销列表 | `/list` | 所有历史记录列表，按月分组 | ✅ |
| 4 | 数据统计 | `/stats` | 图表展示支出分析（折线图+饼图） | ✅ |
| 5 | 分类管理 | `/categories` | 管理一/二级分类 | ✅ |
| 6 | 设置 | `/settings` | 应用设置、数据备份 | ✅ |

---

## 🗄️ 数据库设计

### 表结构

#### 1. `expenses` — 花销记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| amount | REAL | 金额 |
| category_id | INTEGER FK | 关联二级分类 ID |
| date | TEXT | 日期 (YYYY-MM-DD) |
| note | TEXT | 备注 |
| payment_method | TEXT | 支付方式 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 2. `categories` — 分类表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT | 分类名称 |
| parent_id | INTEGER FK | 上级分类 ID（null 为一级大类） |
| icon | TEXT | 分类图标 |
| sort_order | INTEGER | 排序号 |
| created_at | TEXT | 创建时间 |

### 预置分类数据

```
餐饮        → 早餐 / 午餐 / 晚餐 / 外卖 / 零食 / 饮料
交通        → 公交 / 地铁 / 打车 / 加油 / 停车 / 火车 / 飞机
购物        → 日用 / 服饰 / 数码 / 家居 / 美妆
居住        → 房租 / 水电 / 物业 / 维修 / 网费
娱乐        → 电影 / 游戏 / 旅游 / 运动 / 健身
医疗        → 门诊 / 药品 / 住院 / 体检
教育        → 书籍 / 课程 / 考证 / 培训
人情        → 聚餐 / 红包 / 礼物 / 随礼
其他        → 快递 / 话费 / 其他支出
```

---

## 📐 项目目录结构

```
黑马记账APP/
├── electron.vite.config.ts          # electron-vite 配置
├── electron-builder.yml             # 打包配置
├── package.json                     # 项目配置
├── tsconfig.json                    # TS 配置（根）
├── tsconfig.node.json               # 主进程 TS 配置
├── tsconfig.web.json                # 渲染进程 TS 配置
├── CLAUDE.md                        # 产品文档（本文件）
├── src/
│   ├── main/                        # Electron 主进程
│   │   ├── index.ts                 # 主进程入口 + IPC 处理器
│   │   └── database/
│   │       └── index.ts             # 数据库初始化 + CRUD + 种子数据
│   ├── preload/
│   │   └── index.ts                 # IPC 桥接（contextBridge）
│   └── renderer/                    # Vue 渲染进程
│       ├── index.html
│       └── src/
│           ├── main.ts              # Vue 入口 + Element Plus 配置
│           ├── App.vue              # 根组件
│           ├── env.d.ts             # 类型声明
│           ├── router/
│           │   └── index.ts         # 路由配置
│           ├── stores/
│           │   ├── expenses.ts      # 花销 store
│           │   └── categories.ts    # 分类 store
│           ├── types/
│           │   └── index.ts         # TS 类型定义
│           ├── views/
│           │   ├── HomeView.vue     # 首页概览
│           │   ├── AddView.vue      # 新增记录
│           │   ├── ListView.vue     # 花销列表
│           │   ├── StatsView.vue    # 数据统计
│           │   ├── CategoriesView.vue # 分类管理
│           │   └── SettingsView.vue   # 设置
│           ├── components/
│           │   └── AppLayout.vue    # 侧栏布局
│           └── assets/
│               └── styles/
│                   └── global.scss  # 全局样式
└── resources/                       # 打包资源
```

---

## ⚙️ 开发计划

### Phase 0：产品设计（已完成）
- [x] 选择技术方案（方案 A：Electron + Vue 3 + SQLite）
- [x] 编写 CLAUDE.md 产品文档
- [x] 数据库表结构设计
- [x] 页面路由设计
- [x] 预置分类数据设计

### Phase 1：项目脚手架搭建（已完成 ✔️）
- [x] 创建项目目录结构
- [x] 安装全部依赖
- [x] 配置 electron-vite + TypeScript
- [x] 配置 Element Plus + 全局样式
- [x] 配置路由框架
- [x] 配置 electron-builder 打包参数
- [x] better-sqlite3 为 Electron 重新编译

### Phase 2：数据库层（已完成 ✔️）
- [x] 实现 better-sqlite3 连接与初始化
- [x] 创建 categories 表（含 parent_id 自关联实现两级分类）
- [x] 创建 expenses 表
- [x] 写入 9 个一级分类 + 40+ 个二级小类预置数据
- [x] 全部 CRUD 操作封装（含 IPC 通信）
- [x] 数据库备份功能

### Phase 3：前端基础设施（已完成 ✔️）
- [x] Vue Router 配置（6 个路由 + Hash 模式）
- [x] Pinia Store（expenses + categories）
- [x] AppLayout 侧栏导航布局
- [x] TypeScript 类型定义
- [x] Element Plus 中文语言包

### Phase 4：核心页面开发（已完成 ✔️）
- [x] 首页概览（统计卡片 + 快捷记账 + 最近记录 + 分类占比）
- [x] 新增记录（金额输入 + 级联分类 + 日期 + 支付方式 + 备注）
- [x] 花销列表（按月分组 + 筛选搜索 + 分页 + 删除）
- [x] 数据统计（ECharts 折线图 + 饼图 + 每日明细）
- [x] 分类管理（树形展示 + 添加/删除二级分类）
- [x] 设置（关于信息 + 数据库备份）

### Phase 5：打包发布（待完成 ⏳）
- [ ] 应用图标制作
- [ ] Windows 打包测试
- [ ] Mac 打包测试
- [ ] 安装包生成

---

## 📝 备注与决策记录

- **2026-07-15**：采用方案 A（Electron + Vue 3 + SQLite），理由——开发效率和生态成熟度优先于包体大小
- **技术栈决策者**：用户决定
- **产品文档版本**：v1.1

---

*本文档会随项目进展持续更新。*
