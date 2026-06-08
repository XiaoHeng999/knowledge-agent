# Contributing to AgentClaw

Thank you for your interest in contributing! This guide covers the basics.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/XiaoHeng999/knowledge-agent.git
cd agentclaw

# Install dependencies
pnpm install

# Start development mode
pnpm run dev
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run checks before committing:
   ```bash
   pnpm run typecheck
   pnpm run lint
   ```
4. Commit with conventional messages:
   - `feat: add ...` — new features
   - `fix: resolve ...` — bug fixes
   - `refactor: ...` — code refactoring
   - `docs: ...` — documentation changes
   - `chore: ...` — maintenance tasks
5. Open a pull request

## Code Style

- **TypeScript**: Strict mode, no `any` types (except generics)
- **React**: Functional components with hooks, state via Zustand stores
- **Electron**: IPC via `contextBridge`, never use Node.js APIs in renderer
- **IPC channels**: Named `module:action` (e.g., `knowledge:import`)
- **File size**: Split files over 700 lines that handle multiple concerns

## Project Structure

- `electron/` — Electron main process
- `server/` — Main process services (DB, AI, workers)
- `src/` — Renderer (Next.js pages, components, stores)
- `docs/` — Design specs and implementation history

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Update `docs/file-map.md` if you add/remove/rename files
- Run `pnpm run typecheck` and `pnpm run lint` before submitting
- Include a clear description of what changed and why

## Reporting Issues

- Include steps to reproduce
- Specify your OS and Node.js version
- Include relevant console output or screenshots

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
