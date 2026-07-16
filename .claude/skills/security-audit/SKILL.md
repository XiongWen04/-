---
name: security-audit
description: 检查代码安全漏洞：敏感信息泄露、SQL注入、配置泄露等安全隐患
---

# 安全审计检查

## 检查范围

执行全面的安全审计，覆盖以下四个维度：

---

## ① 敏感信息泄露检查

### 检查目标
代码中是否硬编码了密码、密钥、Token 等敏感信息。

### 检查清单

| 检查项 | 风险等级 | 检查内容 |
|--------|:--------:|---------|
| **API 密钥** | 🔴 高危 | `api_key`、`api-secret`、`apikey` 等直接写在代码中 |
| **数据库密码** | 🔴 高危 | `password=`、`pwd=` 等数据库连接字符串中的明文密码 |
| **JWT Secret** | 🔴 高危 | JWT 签名密钥硬编码在代码中 |
| **OAuth Token** | 🟠 中危 | `access_token`、`refresh_token` 写死在代码里 |
| **私钥文件** | 🔴 高危 | 私钥内容直接出现在代码中（`-----BEGIN.*PRIVATE KEY-----`） |
| **连接字符串** | 🟠 中危 | 包含用户名密码的数据库/服务连接串 |
| **内网地址泄露** | 🟡 低危 | 内网 IP、内网域名暴露在代码中 |

### 扫描模式
```regex
# API Key/Token 硬编码
(api[_-]?(key|secret|token)\s*[:=]\s*['"][^'"]+['"])

# 密码硬编码
(password|pwd|passwd)\s*[:=]\s*['"][^'"]{3,}['"]

# 私钥泄露
-----BEGIN\s+(RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----

# 连接字符串含密码
(mongodb|mysql|postgresql|redis)://[^:]+:[^@]+@

# JWT Secret
(jwt[_-]?(secret|key|token)\s*[:=]\s*['"][^'"]+['"])
```

---

## ② SQL 注入 & 代码注入风险检查

### SQL 注入

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| **字符串拼接 SQL** | 🔴 高危 | 使用 `+` 或模板字符串拼接 SQL 查询 |
| **缺少参数化查询** | 🔴 高危 | 直接拼接用户输入到 SQL 语句 |
| **ORM 原生查询** | 🟠 中危 | ORM 中使用了原生 SQL 且拼接了变量 |
| **LIKE 拼接** | 🟠 中危 | LIKE 查询中直接拼接用户输入（未转义 % 和 _） |
| **ORDER BY 拼接** | 🟠 中危 | ORDER BY 和 LIMIT 后直接拼接参数 |

```sql
-- ❌ 高危 — 字符串拼接 SQL
"SELECT * FROM users WHERE name = '" + userName + "'"

-- ✅ 安全 — 参数化查询
"SELECT * FROM users WHERE name = ?", userName
```

### 代码注入

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| **eval() 执行** | 🔴 高危 | 直接 eval() 用户输入 |
| **setTimeout/setInterval 字符串** | 🟠 中危 | 以字符串形式传入可执行代码 |
| **Function 构造器** | 🔴 高危 | `new Function(userInput)` |
| **shell 命令拼接** | 🔴 高危 | 拼接用户输入到 shell 命令 |
| **innerHTML 插入** | 🟠 中危 | 直接插入用户输入的 HTML（XSS 风险）|

```ts
// ❌ 高危 — shell 命令拼接
exec('rm -rf ' + userInput)

// ✅ 安全 — 参数化
exec('rm -rf ' + sanitizePath(userInput))
```

---

## ③ 配置文件安全

### 检查目标
配置文件中有无明文存储的敏感信息。

### 检查项

| 检查项 | 风险等级 | 检查内容 |
|--------|:--------:|---------|
| **.env 泄露** | 🔴 高危 | .env 文件是否被提交到 Git |
| **配置文件含密码** | 🔴 高危 | `config.json`、`config.yaml` 中含明文密码 |
| **硬编码 Token** | 🔴 高危 | 配置中直接写了 `accessToken: "xxx"` |
| **证书文件** | 🟠 中危 | `.pem`、`.key`、`.p12` 等证书文件是否在代码库中 |
| **npm token** | 🔴 高危 | `.npmrc` 中的 `//registry.npmjs.org/:_authToken` |
| **SSH 配置** | 🟠 中危 | SSH 私钥路径、known_hosts 泄露 |

### 需要检查的文件

```
.env
.env.*
*.config.*
*.conf.*
docker-compose*.yml
.npmrc
.eslintrc.*
tsconfig*.json
electron-builder.yml
```

---

## ④ 其它安全隐患

### XSS（跨站脚本攻击）

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| `v-html` 使用 | 🟠 中危 | Vue 中直接渲染 HTML（Vue 默认转义文本） |
| `innerHTML` | 🟠 中危 | 直接插入 HTML 字符串 |
| URL 参数渲染 | 🟠 中危 | 直接将 URL 查询参数渲染到页面 |
| Markdown 渲染 | 🟡 低危 | 未经过滤的 Markdown 渲染可能有 XSS 风险 |

### 路径穿越（Path Traversal）

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| 用户输入作为文件路径 | 🔴 高危 | 未做路径合法性校验直接拼接文件路径 |
| `path.join` + 用户输入 | 🟠 中危 | join 后未校验是否在允许目录内 |
| 文件下载路径参数 | 🔴 高危 | 下载接口直接使用用户提供的文件名 |

```ts
// ❌ 高危 — 路径穿越
fs.readFileSync('/data/' + fileName)

// ✅ 安全 — 校验路径
const safePath = path.resolve('/data/', fileName)
if (!safePath.startsWith('/data/')) throw new Error('非法路径')
```

### CSRF / 权限绕过

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| IPC 无来源校验 | 🟠 中危 | Electron IPC 未校验 sender 来源 |
| webPreferences 配置 | 🟠 中危 | `nodeIntegration: true` 或 `contextIsolation: false` |

### 数据存储安全

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| 明文存储密码 | 🔴 高危 | 用户密码未哈希直接存数据库 |
| 日志泄露敏感信息 | 🟠 中危 | 日志中打印了密码、Token 等 |
| 备份文件未加密 | 🟡 低危 | 数据库备份文件未加密 |

### Electron 特有风险

| 检查项 | 风险等级 | 说明 |
|--------|:--------:|------|
| `nodeIntegration: true` | 🔴 高危 | 渲染进程可直接访问 Node.js API |
| `contextIsolation: false` | 🔴 高危 | 关闭上下文隔离，容易 XSS→RCE |
| `sandbox: false` | 🟠 中危 | preload 脚本有完整 Node.js 权限 |
| `shell.openExternal` | 🟡 低危 | 打开外部链接不做域名校验 |

---

## 检查流程

### 步骤 1：确定检查范围

用户指定要检查的文件或目录，例如：
- 整个项目目录
- `src/` 源代码目录
- 特定的配置文件

### 步骤 2：逐文件扫描

对每个文件执行检查：

1. **敏感信息扫描** — 匹配 API Key、密码、Token 等模式
2. **注入风险扫描** — 检查 SQL 拼接、eval、shell 命令拼接
3. **配置扫描** — 检查配置文件中的明文敏感信息
4. **其它风险扫描** — XSS、路径穿越、Electron 安全配置

### 步骤 3：输出审计报告

```markdown
## 🔐 安全审计报告

### 检查范围：xxx

| 检查维度 | 发现问题 | 风险等级 |
|---------|:--------:|:--------:|
| ① 敏感信息泄露 | X 处 | 🔴/🟠/🟡 |
| ② SQL/代码注入 | X 处 | 🔴/🟠/🟡 |
| ③ 配置安全 | X 处 | 🔴/🟠/🟡 |
| ④ 其它安全隐患 | X 处 | 🔴/🟠/🟡 |

### 详细问题

#### 🔴 高危 — 必须修复

1. **文件：xxx.ts 第 XX 行**
   - 问题：API Key 硬编码
   - 代码：`const key = "sk-xxxxx"`
   - 建议：移至 .env 环境变量，通过 process.env 读取

#### 🟠 中危 — 建议修复

#### 🟡 低危 — 留意观察

### 改进建议摘要

1. ...
2. ...
```

### 风险等级定义

| 等级 | 含义 | 建议行动 |
|:----:|------|---------|
| 🔴 高危 | 可被利用导致数据泄露或系统控制 | 立即修复 |
| 🟠 中危 | 在特定条件下可被利用 | 尽快修复 |
| 🟡 低危 | 信息泄露或最佳实践问题 | 后续改进 |
