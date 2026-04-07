#!/bin/bash
# ClawGame Git Watchdog - Ensures no uncommitted changes

cd /root/projects/clawgame

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️ Uncommitted changes detected in ClawGame!"
    echo ""
    echo "=== Uncommitted files ==="
    git status --short
    
    # Auto-commit with timestamp
    git add -A
    git commit -m "chore: auto-commit uncommitted changes (watchdog) - $(date -u +"%Y-%m-%d %H:%M UTC")"
    git push origin main
    
    echo ""
    echo "✅ Auto-committed and pushed"
    exit 0
fi

echo "✅ Git hygiene check passed - no uncommitted changes"
exit 0
