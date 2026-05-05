---
name: commit-message
description: Generate conventional commit messages. Use when asked to write or review commit messages.
---

# Commit Message Rules

GitHub Copilot がコミットメッセージを作成する場合は、次のルールに従う。

- Commit messages must be written in English.
- Use Conventional Commits.
- Format the subject as `<type>[optional scope]: <description>`.
- Use lowercase types, mainly `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`.
- Use `feat` for new features and `fix` for bug fixes.
- Add a scope only when it adds value; default to `fix: ...` for ordinary bug fixes.
- Use scopes like `feat(frontend): ...` or `fix(backend): ...` when appropriate.
- For breaking changes, use `type(scope)!: ...` and include `BREAKING CHANGE:` in the body or footer.
- Keep the description concise and do not end it with a period.
- Keep one commit focused on one intent; split commits when needed.

Examples:

- `feat(frontend): add loading overlay during planet initialization`
- `fix(backend): handle Horizons API retry failures`
- `docs: update Copilot commit message rules`
