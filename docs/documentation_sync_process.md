# Documentation Sync Process

This document defines the mandatory process for keeping project documentation in sync with code changes.

## Purpose

Documentation drift is a common problem where docs become stale and misleading. This process ensures that `docs/project_memory.md` and other documentation files are updated consistently with every release.

## When to Update Documentation

### Mandatory Triggers
Documentation MUST be updated when:
1. **Version bump** - VERSION.json is changed
2. **Milestone completion** - A sprint phase is marked complete
3. **New feature added** - Significant user-facing features are shipped
4. **Critical bug fixed** - Issues blocking core functionality are resolved
5. **Architecture changes** - Major refactoring or structural changes

### Optional But Recommended
- Minor bug fixes
- Code quality improvements
- Non-breaking enhancements

## Documentation Checklist

Before committing a release, verify:

### project_memory.md
- [ ] Current Version updated to match VERSION.json
- [ ] Milestone status reflects current progress
- [ ] Known Issues section is accurate (fixed bugs removed, new issues added)
- [ ] Recent Milestones section includes latest release notes
- [ ] Last Updated timestamp is current (YYYY-MM-DD)
- [ ] Key Learnings section updated with any new insights

### CHANGELOG.md
- [ ] New version entry added at top
- [ ] Date in format: YYYY-MM-DD
- [ ] Added, Changed, Fixed sections populated
- [ ] Links to issues or PRs if applicable
- [ ] No duplicate entries

### VERSION.json
- [ ] Version number bumped (patch/minor/major per semver)
- [ ] Codename updated for significant releases
- [ ] Milestone number accurate
- [ ] MilestoneName describes current milestone
- [ ] ReleaseDate is current
- [ ] Status is accurate (in-progress/complete)

### current_sprint.md
- [ ] Phase statuses updated (completed/in-progress/future)
- [ ] Task statuses reflect current reality
- [ ] Technical Debt Tracker includes new debt
- [ ] Definition of Done checkboxes match actual completion

## Release Workflow

```bash
# 1. Verify code builds
cd /root/projects/clawgame
pnpm install
pnpm build
pnpm run typecheck

# 2. Update VERSION.json
# Manually edit VERSION.json with new version
# Bump rules:
#   - Patch (0.x.x): Bug fixes, small features
#   - Minor (0.x.0): Milestone completion
#   - Major (x.0.0): Production release

# 3. Update CHANGELOG.md
cat >> CHANGELOG.md << 'EOF'

### [version] - $(date -u +"%Y-%m-%d")

#### Added
- [new features]

#### Changed
- [changes]

#### Fixed
- [bug fixes]
EOF

# 4. Update project_memory.md
# - Update Current Version
# - Update milestone status
# - Update Known Issues
# - Add release notes to Recent Milestones
# - Update Last Updated timestamp
# - Add any Key Learnings

# 5. Update current_sprint.md
# - Update phase statuses
# - Update task statuses
# - Update technical debt tracker

# 6. Commit and push
git add -A
git commit -m "release: v[version] - [short description]"
git push origin main
```

## Pre-Commit Hook (Optional)

To enforce documentation updates, add a pre-commit hook:

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check if VERSION.json was modified
if git diff --cached --name-only | grep -q "VERSION.json"; then
    echo "⚠️ VERSION.json was modified"
    echo "⚠️ Did you update:"
    echo "   - docs/project_memory.md"
    echo "   - CHANGELOG.md"
    echo "   - docs/tasks/current_sprint.md"
    echo ""
    echo "Press Enter to continue or Ctrl+C to abort..."
    read
fi
```

## Documentation Sync Script (Future Automation)

For future automation, consider creating a script that:

1. Reads VERSION.json
2. Prompts for release notes
3. Updates CHANGELOG.md with template
4. Updates project_memory.md version and timestamp
5. Prompts for sprint/task updates
6. Commits everything with proper message

Example script location: `scripts/sync-docs.sh`

## Common Issues and Solutions

### Issue: Forgot to update project_memory.md
**Solution**: Add it to the release checklist above. Consider the pre-commit hook.

### Issue: CHANGELOG has wrong version number
**Solution**: Always verify VERSION.json before writing CHANGELOG entry.

### Issue: Known Issues section is stale
**Solution**: After fixing a bug, remove it from Known Issues. Add new blockers as they're discovered.

### Issue: Sprint docs don't match reality
**Solution**: Update sprint docs at the end of each phase, not just at releases.

## Documentation Quality Standards

### Accuracy
- All dates and versions must be correct
- Status indicators must reflect actual state
- No "TODO" items left in production docs

### Clarity
- Use clear, concise language
- Explain technical decisions briefly
- Link to relevant code or resources

### Completeness
- Don't skip the "optional" updates
- Better to over-document than under-document
- Keep project_memory.md comprehensive

## Review Process

After updating documentation:

1. Read through all changed files
2. Verify all numbers and dates are correct
3. Ensure internal consistency (e.g., version matches across all files)
4. Test that build still passes
5. Commit and push

## Enforcement

This is a **mandatory** part of the release process. Skipping documentation sync is considered a process violation and should be flagged in sprint reviews.

## References

- Semantic Versioning: https://semver.org/
- Keep a Changelog: https://keepachangelog.com/
- Git hooks: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
