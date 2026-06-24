# Engineering Decision Log

<!-- Entry template — copy for each new entry, newest on top:
## <YYYY-MM-DD> — <task title>
- **Agent:** Claude Code / Codex (model)
- **Prompt:** <one-line summary of what was asked>
- **Did:** <what changed>
- **Why:** <the tradeoff considered>
- **Decision changed:** <prior choice revised + why>   (omit if none)
- **Mistake & fix:** <what broke, how it was resolved>  (omit if none)
- **Commit:** <hash>
-->

## 2026-06-24 — Document Git cleanup process
- **Agent:** Codex (GPT-5)
- **Prompt:** Add the Git cleanup process explanation to `docs/DECISIONS.md`.
- **Did:** Documented the Git logic used after the failed push: create a backup branch, stash unrelated working-tree edits, run `git reset --soft origin/main`, unstage generated/sensitive files, add ignore rules, recommit the cleaned changes, restore the stash, and push.
- **Why:** The key tradeoff was rewriting only unpushed local history instead of preserving bad commits and adding a later fix. Because the commits had not reached GitHub, rebuilding them locally produced a cleaner public history and prevented `node_modules/`, `.env`, and build output from ever being pushed.
- **Decision changed:** None.
- **Mistake & fix:** None.
- **Commit:** d4bf176

## 2026-06-24 — Clean unpushed history before GitHub push
- **Agent:** Codex (GPT-5)
- **Prompt:** Push to GitHub, then proceed with cleaning the failed push.
- **Did:** Rebuilt the unpushed commits from `origin/main` so generated `wallet-backend/node_modules/` files and `wallet-backend/.env` stay out of Git, added ignore rules for those paths, and kept the real backend source/config files staged for a clean push.
- **Why:** The first push failed because the unpushed history contained large generated dependency artifacts and a local environment file. Rewriting the still-local commits is safer than pushing that history and trying to repair it afterward.
- **Decision changed:** Replaced the earlier unpushed commit stack with a cleaned commit because it had not reached GitHub and included files that should never be versioned.
- **Mistake & fix:** Initial push attempt failed with an HTTP 400 transport error after Git tried to send large dependency content; fixed by unstaging generated/sensitive paths and adding ignore rules before rebuilding the commit.
- **Commit:** 4761d35

## 2026-06-24 — Ignore local editor settings
- **Agent:** Codex (GPT-5)
- **Prompt:** Add files that are to be added to gitignore.
- **Did:** Added `.vscode/` to `.gitignore` and removed the duplicate existing `docs/devlog/prompts.log # optional` line.
- **Why:** `.vscode/settings.json` is local editor configuration, so ignoring the directory prevents user-specific IDE settings from becoming repository noise. Kept the existing devlog ignore rule but deduplicated it to make the ignore file clearer.
- **Mistake & fix:** None.
- **Commit:** 4761d35

## 2026-06-24 — Fix deprecated moduleResolution in tsconfig.json
- **Agent:** Claude Code (claude-opus-4-8)
- **Prompt:** Solve the error in tsconfig.json.
- **Did:** Changed `moduleResolution` from `"node"` (legacy node10) and `module` from `"CommonJS"` to `"node16"` for both. `tsc --noEmit` passes.
- **Why:** TS reported `moduleResolution=node10` deprecated (removed in TS 7.0). `node16` is the modern, supported algorithm for a CommonJS Node backend; pairing `module` with it keeps emit as CommonJS (no `"type":"module"` in package.json) while resolving correctly. Chose this over silencing via `ignoreDeprecations` so the fix is durable rather than postponed.
- **Mistake & fix:** None.
- **Commit:** 4761d35

## 2026-06-20 — Add test text file
- **Agent:** Claude Code (claude-opus-4-8)
- **Prompt:** Create a file `test.txt` containing the word "test".
- **Did:** Added `test.txt` with the content `test`.
- **Why:** Single plain-text artifact requested; kept it minimal with a trailing newline.
- **Mistake & fix:** None.
- **Commit:** pending

## 2026-06-20 — Add hello text file
- **Agent:** Codex (GPT-5)
- **Prompt:** Create a file `hello.txt` containing the word "test".
- **Did:** Added `hello.txt` with the requested `test` content.
- **Why:** Kept the change minimal because the request only needed a single plain text artifact.
- **Mistake & fix:** None.
- **Commit:** pending
