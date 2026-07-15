# 黑马记账 APP — 产品文档

## 📋 项目概述

**项目名称：** 黑马记账  
**目标平台：** Windows & Mac（跨平台桌面应用）  
**技术方案：** 方案 A — Electron + Vue 3 + SQLite  
**核心功能：** 记录用户每一次花销和收入，支持两级分类管理（一级大类 → 二级小类），收支一体展示与统计

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

### 核心功能 ✅

1. **记录花销** ✅
   - 金额（必填）
   - 选择一级分类 & 二级分类（必填，级联选择器）
   - 日期（默认当天，可修改）
   - 备注（可选）
   - 支付方式（可选：微信/支付宝/银行卡/现金/其他）

2. **记录收入** ✅
   - 金额（必填）
   - 选择一级分类 & 二级分类（必填，级联选择器）
   - 日期（默认当天，可修改）
   - 备注（可选）
   - 来源（可选：工资/兼职/投资/红包/退款/报销/其他）

3. **收支一体表单** ✅
   - 支出/收入切换开关
   - 根据类型切换分类选项（支出分类 / 收入分类）
   - 根据类型切换附加字段（支付方式 / 来源）

4. **支出分类体系（两级）** ✅
   - 9 个一级大类：餐饮、交通、购物、居住、娱乐、医疗、教育、人情、其他
   - 40+ 个二级小类预置，用户可自定义添加/删除二级分类

5. **收入分类体系（两级）** ✅
   - 4 个一级大类：工资、理财、红包、其他
   - 14 个二级小类预置

6. **收支明细列表** ✅
   - 支出和收入统一列表展示，按月分组
   - 显示每月支出合计和收入合计
   - 支持按类型（全部/支出/收入）、日期范围、分类筛选
   - 支持分页

7. **数据统计概览** ✅
   - 本月支出卡片 + 本月收入卡片
   - 月度结余展示（盈余/超支）
   - 每日收支趋势对比（双折线图）
   - 支出分类占比饼图 + 收入分类占比饼图
   - 年度月度收支对比（柱状图）
   - 每日明细列表

8. **首页概览** ✅
   - 本月支出 + 本月收入双卡片
   - 月度结余
   - 快捷记账按钮（8 个快捷入口）
   - 最近 5 条支出记录
   - 本月支出分类占比进度条

9. **分类管理** ✅
   - 查看所有分类（一/二级树形结构）
   - 自定义添加二级小类
   - 删除二级小类（有安全校验）

10. **设置** ✅
    - 应用信息展示
    - 数据库备份到文档目录

### 扩展功能（后期规划 — ⏳ 未开始）

11. **数据导出** — 导出为 CSV / Excel 格式
12. **预算管理** — 每月分大类设置预算上限
13. **备份与恢复** — 导入备份文件恢复数据

---

## 🎨 页面设计

| # | 页面名称 | 路由 | 说明 | 状态 |
|---|---------|------|------|:----:|
| 1 | 首页/概览 | `/home` | 本月收支概览、结余、快捷记账入口 | ✅ |
| 2 | 新增记录 | `/add` | 收支一体表单，支出/收入切换 | ✅ |
| 3 | 收支明细 | `/list` | 全部记录列表，按类型/日期/分类筛选 | ✅ |
| 4 | 数据统计 | `/stats` | 收支趋势图、分类占比图、年度对比 | ✅ |
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

#### 2. `incomes` — 收入记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| amount | REAL | 金额 |
| category_id | INTEGER FK | 关联二级分类 ID |
| date | TEXT | 日期 (YYYY-MM-DD) |
| note | TEXT | 备注 |
| source | TEXT | 收入来源 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 3. `categories` — 分类表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT | 分类名称 |
| parent_id | INTEGER FK | 上级分类 ID（null 为一级大类） |
| icon | TEXT | 分类图标 |
| sort_order | INTEGER | 排序号 |
| type | TEXT | 分类类型（expense/income） |
| created_at | TEXT | 创建时间 |

### 预置分类数据

#### 支出分类
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

#### 收入分类
```
工资        → 月薪 / 奖金 / 补贴 / 兼职
理财        → 利息 / 基金 / 股票 / 理财收益
红包        → 微信红包 / 节日红包 / 生日红包
其他        → 退款 / 报销 / 其他收入
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
│           │   ├── incomes.ts       # 收入 store
│           │   └── categories.ts    # 分类 store
│           ├── types/
│           │   └── index.ts         # TS 类型定义
│           ├── views/
│           │   ├── HomeView.vue     # 首页概览
│           │   ├── AddView.vue      # 新增记录（收支一体）
│           │   ├── ListView.vue     # 收支明细
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
- [x] 创建 expenses / incomes / categories 表
- [x] categories 表增加 type 字段（expense/income）
- [x] 写入支出分类 + 收入分类预置数据
- [x] 全部 CRUD 操作封装（含 IPC 通信）
- [x] 数据库备份功能

### Phase 3：前端基础设施（已完成 ✔️）
- [x] Vue Router 配置（6 个路由 + Hash 模式）
- [x] Pinia Store（expenses + incomes + categories）
- [x] AppLayout 侧栏导航布局
- [x] TypeScript 类型定义
- [x] Element Plus 中文语言包

### Phase 4：核心页面开发（已完成 ✔️）
- [x] 首页概览（收支双卡片 + 结余 + 快捷记账 + 最近记录 + 分类占比）
- [x] 新增记录（收支一体表单，支出/收入切换 + 级联分类 + 日期 + 支付方式/来源 + 备注）
- [x] 收支明细（支出收入统一列表 + 按类型/日期/分类筛选 + 分页 + 删除）
- [x] 数据统计（收支双折线图 + 支出饼图 + 收入饼图 + 年度柱状对比 + 每日明细）
- [x] 分类管理（树形展示 + 添加/删除二级分类）
- [x] 设置（关于信息 + 数据库备份）

### Phase 5：打包发布（已完成 ✔️）
- [x] 应用图标制作
- [x] Windows 打包测试
- [x] 安装包生成（NSIS setup.exe + win-unpacked）

---

## 📝 备注与决策记录

- **2026-07-15**：采用方案 A（Electron + Vue 3 + SQLite），理由——开发效率和生态成熟度优先于包体大小
- **2026-07-15**：增加收入功能，采用「收支一体」设计——新增记录页面加支出/收入切换开关，不单独搞两套页面
- **技术栈决策者**：用户决定
- **产品文档版本**：v1.2

---

*本文档会随项目进展持续更新。*
