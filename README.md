# 🐼 熊猫记账

> 跨平台桌面记账应用 — 记录每一笔收支，管好你的钱

![Electron](https://img.shields.io/badge/Electron-43-blue?logo=electron)
![Vue](https://img.shields.io/badge/Vue-3.5-4fc08d?logo=vue.js)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003b57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 功能截图

| 首页概览 | 新增记录 |
|---------|---------|
| 收支双卡片 + 快捷记账 | 支出/收入切换统一表单 |

| 收支明细 | 数据统计 |
|---------|---------|
| 统一列表 + 多维度筛选 | 双折线图 + 双饼图 + 年度对比 |

## ✨ 核心功能

### ✅ 已完成

- **💰 记录花销** — 金额、两级分类、日期、支付方式、备注
- **📈 记录收入** — 金额、两级分类、日期、来源、备注
- **🔄 收支一体表单** — 支出/收入一键切换，分类和字段自动变化
- **📋 收支明细** — 支出收入统一列表，按月分组，支持日期/分类/类型筛选
- **📊 数据统计** — 每日收支趋势折线图、支出/收入分类占比饼图、年度月度收支柱状对比
- **🏠 首页概览** — 本月收支卡片、月度结余、快捷记账入口、最近记录
- **📂 分类管理** — 两级分类体系，支持自定义添加/删除一级大类及二级小类，自动防重名校验
- **⚙️ 设置** — 应用信息、数据库备份
- **🐍 贪吃蛇** — 工作间隙小游戏，Canvas 渲染，键盘控制，自动记录最高分

### ⏳ 规划中

- 数据导出（CSV/Excel）
- 预算管理
- 备份与恢复

## 🗄️ 分类体系

### 支出分类（9 个一级大类）
```
餐饮 → 早餐 / 午餐 / 晚餐 / 外卖 / 零食 / 饮料
交通 → 公交 / 地铁 / 打车 / 加油 / 停车 / 火车 / 飞机
购物 → 日用 / 服饰 / 数码 / 家居 / 美妆
居住 → 房租 / 水电 / 物业 / 维修 / 网费
娱乐 → 电影 / 游戏 / 旅游 / 运动 / 健身
医疗 → 门诊 / 药品 / 住院 / 体检
教育 → 书籍 / 课程 / 考证 / 培训
人情 → 聚餐 / 红包 / 礼物 / 随礼
其他 → 快递 / 话费 / 其他支出
```

### 收入分类（4 个一级大类）
```
工资 → 月薪 / 奖金 / 补贴 / 兼职
理财 → 利息 / 基金 / 股票 / 理财收益
红包 → 微信红包 / 节日红包 / 生日红包
其他 → 退款 / 报销 / 其他收入
```

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 43 |
| 前端框架 | Vue 3.5 + TypeScript |
| UI 组件 | Element Plus 2.14 |
| 构建工具 | electron-vite 5 |
| 数据存储 | SQLite (better-sqlite3) |
| 状态管理 | Pinia 2 |
| 路由 | Vue Router 4 |
| 图表 | ECharts 6 + vue-echarts |
| 打包 | electron-builder 26 |

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/XiongWen04/Panda-Billing.git
cd 熊猫记账APP

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建生产版本
npm run build

# 打包 Windows 安装包
npm run build:win
```

## 📦 下载安装

从 [Releases](https://github.com/XiongWen04/Panda-Billing/releases) 页面下载最新版本的安装包：

- **Windows**: `熊猫记账 Setup x.x.x.exe`
- **免安装版**: `win-unpacked/` 目录

## 📝 技术说明

- 数据存储在本地 SQLite 文件，无需联网
- 所有数据均在本地，不会上传到任何服务器
- 支持数据库备份到文档目录
- 内置贪吃蛇小游戏，高分自动保存在本地浏览器存储

## 📄 License

MIT
