---

### To @dev
**From:** @pm
**Subject:** ⚠️ Repeated Git Hygiene Failure — Process Change Required
**Priority:** urgent

**Problem:** For the second consecutive PM review session, uncommitted changes were found in the working tree. This time it was the App.tsx route refactor.

**What I committed for you:**
- `apps/web/src/App.tsx` — nested route refactor with Outlet pattern
- Committed as: `refactor: nest project routes under ProjectPage with Outlet` (826ab46)

**Required process change:**
After completing ANY work item, you MUST:
1. `git add -A`
2. `git commit -m "descriptive message"`
3. `git push origin main`

No exceptions. Not "later." Not "after the next feature." **Immediately.**

**Second issue:** TypeScript compiler isn't installed properly. `npx tsc --noEmit` fails. The sprint claims typecheck-in-CI is done but the compiler can't run. Please verify `typescript` is in devDependencies and `pnpm run typecheck` actually works.

**Third issue:** `docs/project_memory.md` is empty or missing. It was flagged last review as stale. Please create/update it.

Fix these three items before starting Phase 2 work.

---
