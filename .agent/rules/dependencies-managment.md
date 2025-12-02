---
trigger: always_on
---

- Use npm as package manager
- Commit lockfile (package-lock.json / pnpm-lock.yaml / yarn.lock)
- Separate dependencies / devDependencies
- Use CI install via lockfile (npm ci / pnpm install --frozen-lockfile)
- Use dynamic imports and tree-shaking to reduce bundle size