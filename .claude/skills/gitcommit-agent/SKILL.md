---
name: gitcommit-agent
description: Git 提交质量门禁 — 运行测试+质量检查，通过后提交推送
---

# Git 提交质量门禁

在允许 git commit 之前，自动执行以下步骤：

1. **并行运行测试** — 通过 tester 子代理执行 `npx vitest run`
2. **并行执行质量检查** — 通过 quality-engineer 子代理执行安全审计 + 注释检查 + 代码质量评估
3. **判定** — 两者都通过才允许提交
4. **通过后** — 自动调用 git-save（更新 README → git add → git commit → git push）

## 使用方式

在终端直接输入：

```
/gitcommit-agent
```

## 正常流程示例

```
/gitcommit-agent
  → tester: 5/5 tests passed ✅
  → quality-engineer: Grade A ✅
  → 全部通过 → 执行 git-save
  → 提交完成 🎉
```

## 失败流程示例

```
/gitcommit-agent
  → tester: 3/5 tests passed ❌
  → quality-engineer: Grade A ✅
  → 测试未通过 → 拒绝提交
  → 输出失败详情
```

## 注意事项

- 确保你在项目根目录下执行
- 如果测试或质量检查失败，修复后重新执行 `/gitcommit-agent`
- 提交 message 会根据实际改动内容自动生成
