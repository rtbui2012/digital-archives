# AGENT.md — OpenClaw Agent Playbook (digital-archives)

This repo is intended to be workable by automated agents.

## Repo layout
- `backend/` — Python backend
- `frontend/` — Next.js frontend

## Operating rules (agent)
1) **You must satisfy the issue’s acceptance criteria.**
   - Copy the acceptance criteria checklist into the PR description and check items off as you implement.
   - If you cannot satisfy an item, stop and ask for clarification before opening a PR.
2) **Start with a plan**: restate the goal, list assumptions, and propose a short plan.
3) **No drive-by refactors or tooling churn** unless explicitly required by the issue.
   - Do not add deps/config files “just because”.
4) **Ask when unclear**: if acceptance criteria or reproduction steps are missing, comment on the issue and apply label `needs:clarification`.
5) **Prefer small PRs**: keep changes focused to the issue.
6) **Safe-by-default**: do not delete data; avoid breaking API changes unless explicitly requested.
7) **CI/workflows allowed**: you may add/modify GitHub Actions and tooling (ruff, pytest, eslint, etc.) when it helps verify the change.

## Local dev quickstart (assumptions; adjust if repo differs)
### Backend
- Python 3.12+ recommended
- Create venv and install deps (if requirements exist):
  - `python -m venv .venv`
  - `pip install -r requirements.txt` (or `pip install -e .` if using pyproject)

### Frontend
- Node 18+ (or 20+)
- `cd frontend`
- `npm ci` (or `npm install`)
- `npm run dev`

## Branch + PR conventions
- Branch name: `agent/issue-<number>-<slug>`
- PR title: `[Agent] <issue title>`
- PR must include:
  - `Closes #<issue>`
  - Summary of changes
  - Acceptance criteria checklist (copied from issue + checked off)
  - Test plan / verification steps

## Definition of done
- Acceptance criteria satisfied.
- Minimal CI added/updated if appropriate:
  - Backend: `ruff` + `pytest` (even 1–2 smoke/regression tests is better than none)
  - Frontend: `npm run lint` and `npm run build` (or `next lint` / `next build`)
- No secrets committed.

## When to add tests
- **Bug fix**: add at least one regression test OR a clearly described manual verification script.
- **Feature**: add at least one happy-path test where feasible.
