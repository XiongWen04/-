---
name: git-save
description: 更新 README、提交 Git、推送到 GitHub
---

# Git 保存三部曲

按照以下步骤完成：更新 README → 提交 Git → 推送到 GitHub。

## 1. 更新 README

读取 `package.json` 中的版本号和功能列表，结合 `src/` 目录下的实际代码，更新 `README.md` 以保证以下信息准确：

- **应用版本号** — 从 `package.json` 读取
- **✅ 已完成功能** — 检查 `src/views/` 和 `src/main/index.ts`（IPC 处理器），如实列出
- **🏗️ 技术栈** — 核对 `package.json` 中的依赖版本
- 文中出现的仓库地址：`https://github.com/XiongWen04/Panda-Billing.git`

## 2. 提交 Git

```bash
cd f:\项目\黑马记账APP
git add -A
git commit -m "<类型>: <简洁的改动说明>"
```

提交类型参考：`feat` / `fix` / `docs` / `refactor` / `chore`

## 3. 推送到 GitHub

```bash
git push origin main
```

## 注意事项

- 如果推送失败（网络问题），检查 GitHub 连接后重试
- 提交前确认没有遗留的调试代码
- **在终端手动执行相关命令**
