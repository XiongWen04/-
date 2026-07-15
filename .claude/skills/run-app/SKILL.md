---
name: run-app
description: 启动熊猫记账开发服务器（Electron + Vue 3 桌面应用）
---

# 启动应用

按照以下步骤启动熊猫记账应用的开发环境：

## 1. 在终端中手动执行

请在 PowerShell 或 CMD 终端中运行以下命令（不要通过聊天工具自动执行）：

### 清理旧进程（可选）

如果之前启动过，先确保旧进程已关闭：

```bash
taskkill /F /FI "WINDOWTITLE eq panda-billing*" 2>nul
taskkill /F /FI "WINDOWTITLE eq heima*" 2>nul
```

### 启动开发服务器

```bash
cd f:\项目\黑马记账APP
npm run dev
```

## 2. 确认启动

等待开发服务器就绪，Electron 窗口会自动弹出。确认：

- 无控制台错误输出
- Electron 窗口正常显示
- 应用界面能够正常交互（侧栏导航、页面路由可用）

## 注意事项

- 开发模式使用 `electron-vite dev`，支持热重载
- 首次启动可能需要几秒钟编译
- 数据存储在本地 SQLite 文件中，无需额外配置数据库
- **必须在本地终端手动运行**，不要通过 /run-app 让助手自动执行
