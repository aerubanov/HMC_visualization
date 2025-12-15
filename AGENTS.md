## Dependencies Management

- Use npm as package manager
- Commit lockfile (package-lock.json / pnpm-lock.yaml / yarn.lock)
- Separate dependencies / devDependencies
- Use CI install via lockfile (npm ci / pnpm install --frozen-lockfile)
- Use dynamic imports and tree-shaking to reduce bundle size

## Project Workflow

Here is a prefered way to develope new features in this project. Ask user review after each step.

- Step 1. Start from selecting interfaces - class, method, or function and it input and outputs. Not write real implementation for now.
- Step2. Select test cases to cover main scenarious and edge cases.
- Step 3. Implement test cases.
- Step 4. Now create actual feature implementation.
