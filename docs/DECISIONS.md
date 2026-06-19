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
