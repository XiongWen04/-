---
name: rebuild-app
description: 重新打包熊猫记账为 Windows 安装程序（NSIS）
---

# 重新打包应用

按照以下步骤将熊猫记账重新打包为可安装的 Windows 程序：

## 1. 在终端中手动执行

请在 PowerShell 或 CMD 终端中运行以下命令（不要通过聊天工具自动执行）：

### 重新打包

如果网络正常（能直连 GitHub）：

```bash
cd f:\项目\黑马记账APP
npm run build:win
```

如果下载 Electron 超时（国内网络常见问题），请先设置镜像源再打包：

```bash
cd f:\项目\黑马记账APP
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm run build:win
```

或者在 PowerShell 中单行执行：

```bash
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"; npm run build:win
```

### 永久配置镜像源（推荐）

在 `~/.npmrc` 中添加以下行，以后打包就不用每次设环境变量了：

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

这个命令会依次执行：

1. `electron-vite build` — 构建前端 + 主进程 + preload 代码
2. `electron-builder --win` — 打包为 Windows NSIS 安装程序

## 2. 确认打包结果

打包成功后，产物在 `dist/` 目录下：

| 文件 | 说明 |
|------|------|
| `dist/熊猫记账 Setup x.x.x.exe` | NSIS 安装包（推荐） |
| `dist/win-unpacked/` | 免安装绿色版文件夹 |

## 3. 版本更新

如需更新版本号，修改 `package.json` 中的 `version` 字段，然后再执行打包。

## 注意事项

- 耗时较长，请耐心等待（尤其是 `electron-builder` 下载依赖时）
- **必须在本地终端手动运行**，不要通过 /rebuild-app 让助手自动执行
- 打包后安装包约 80-120 MB