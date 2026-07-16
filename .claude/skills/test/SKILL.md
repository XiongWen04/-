---
name: test
description: 运行单元测试，查看测试报告
---

# 运行单元测试

## 文件位置

测试文件位于 `src/renderer/src/__tests__/` 目录下：

| 文件 | 测试内容 |
|------|---------|
| `category-store.spec.ts` | 分类 Store（获取分类、层级选项、查找父分类、添加分类） |
| `expense-store.spec.ts` | 花销 Store（获取月度数据、分页列表、添加/删除花销） |

## 在终端中手动执行

请在终端中运行以下命令：

### 运行所有测试

```bash
cd f:\项目\黑马记账APP
npx vitest run
```

### 运行测试并查看覆盖率报告

```bash
cd f:\项目\黑马记账APP
npx vitest run --coverage
```

### 监听模式（开发时自动重跑）

```bash
cd f:\项目\黑马记账APP
npx vitest
```

## 输出说明

终端执行后会看到类似输出：

```
 ✓ src/renderer/src/__tests__/category-store.spec.ts (5 tests) 12ms
 ✓ src/renderer/src/__tests__/expense-store.spec.ts (4 tests) 8ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
```

如果使用了 `--coverage`，还会在终端显示覆盖率，同时生成 HTML 报告：

- 终端：直接显示代码覆盖率百分比
- HTML：`coverage/index.html`（浏览器打开可查看详情）
