# Engineering Decision Log

## Template

- Date:
- Agent:
- Model:
- What was asked:
- What changed:
- Why / tradeoff:
- Reversed decision:
- Mistake / fix:

## 2026-07-08 - Backend source structure refactor

- Date: 2026-07-08
- Agent: Codex
- Model: GPT-5
- What was asked: Reorganize the wallet backend code toward industry-standard structure without changing code logic, because this is a practice and learning project.
- What changed: Split the single Express entry file into an app factory, server bootstrap, route modules, controller modules, shared Prisma client module, and transfer request hash utility. Updated `dev` and `start` scripts to point at the new server entry.
- Why / tradeoff: Separating bootstrap, route registration, request handlers, and shared utilities makes the project easier to navigate and extend while keeping the existing endpoint behavior and validation flow intact. The tradeoff is more files in a very small project, but the structure now scales better as features grow.
- Reversed decision: None.
- Mistake / fix: Moving inline account route handlers into standalone controller functions removed Express route parameter inference, which caused `req.params.id` to compile as a wider type. Fixed it with an explicit `AccountParams` request type only; runtime logic stayed unchanged.
