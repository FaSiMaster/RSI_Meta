# Branch Convention — FaSiMaster

## Main branches
- `main` — stable, reviewed code only. No direct commits.
- `dev` — active development branch. Default working branch.

## Feature branches
- Pattern: `feature/<short-description>`
- Example: `feature/nsm-pass5-komplex`

## Bugfix branches
- Pattern: `fix/<short-description>`

## Rules
- Claude Code always commits to `dev` or a feature branch.
- Merges to `main` require explicit confirmation by the developer.
- Commit messages follow the pattern:
  `<type>(<scope>): <short description>`
  Types: init | feat | fix | refactor | test | docs | chore
  Example: `feat(nsm): add Pass-5 KOMPLEX element resolution`
