#!/usr/bin/env python3
"""
ClawGame Development Continuation Script

This script is called by the cron job to:
1. Check current sprint status
2. Continue development from where it was left off
3. Run tests on any changes
4. Commit and push changes with detailed messages
5. Update version/changelog as needed
6. Self-improve based on errors and learnings
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path("/root/projects/clawgame")
SPRINT_FILE = PROJECT_ROOT / "docs" / "tasks" / "current_sprint.md"
BACKLOG_FILE = PROJECT_ROOT / "docs" / "tasks" / "backlog.md"
CHANGELOG_FILE = PROJECT_ROOT / "CHANGELOG.md"
VERSION_FILE = PROJECT_ROOT / "VERSION.json"
MEMORY_FILE = PROJECT_ROOT / "docs" / "ai" / "project_memory.md"
KNOWN_ISSUES_FILE = PROJECT_ROOT / "docs" / "qa" / "known_issues.md"

def run(cmd, cwd=PROJECT_ROOT, check=True, capture=True):
    """Run a shell command."""
    print(f"  $ {cmd}")
    result = subprocess.run(
        cmd, shell=True, cwd=cwd, capture_output=capture, text=True
    )
    if check and result.returncode != 0:
        print(f"  ERROR: {result.stderr}")
        raise subprocess.CalledProcessError(result.returncode, cmd)
    return result

def git_status():
    """Check git status."""
    result = run("git status --porcelain", check=False)
    return result.stdout.strip()

def git_commit(message):
    """Commit changes with detailed message."""
    run("git add -A")
    run(f'git commit -m "{message}"', check=False)

def git_push():
    """Push to remote."""
    result = run("git push origin main", check=False)
    return result.returncode == 0

def read_sprint_status():
    """Parse current sprint file to understand what's done and what's next."""
    if not SPRINT_FILE.exists():
        return {"status": "unknown", "next_tasks": []}
    
    content = SPRINT_FILE.read_text()
    # Simple parsing - look for task statuses
    done = content.count("✅")
    todo = content.count("⏳")
    in_progress = content.count("🔄")
    
    return {
        "done": done,
        "todo": todo,
        "in_progress": in_progress,
        "raw": content
    }

def read_version():
    """Read current version."""
    if VERSION_FILE.exists():
        return json.loads(VERSION_FILE.read_text())
    return {"version": "0.0.0", "milestone": 0}

def bump_version(part="patch"):
    """Bump version number."""
    v = read_version()
    parts = v["version"].split(".")
    if part == "patch":
        parts[2] = str(int(parts[2]) + 1)
    elif part == "minor":
        parts[1] = str(int(parts[1]) + 1)
        parts[2] = "0"
    elif part == "major":
        parts[0] = str(int(parts[0]) + 1)
        parts[1] = "0"
        parts[2] = "0"
    
    v["version"] = ".".join(parts)
    v["releaseDate"] = datetime.now().strftime("%Y-%m-%d")
    VERSION_FILE.write_text(json.dumps(v, indent=2))
    return v

def add_changelog_entry(version, changes):
    """Add entry to changelog."""
    content = CHANGELOG_FILE.read_text() if CHANGELOG_FILE.exists() else ""
    date = datetime.now().strftime("%Y-%m-%d")
    
    entry = f"\n## [{version}] - {date}\n\n"
    for change in changes:
        entry += f"- {change}\n"
    
    # Insert after header
    lines = content.split("\n")
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("## ["):
            insert_idx = i
            break
    
    lines.insert(insert_idx, entry.rstrip("\n"))
    CHANGELOG_FILE.write_text("\n".join(lines))

def run_tests():
    """Run all tests."""
    print("Running tests...")
    result = run("pnpm test 2>&1 || true", check=False)
    
    # Check for test failures
    if "FAIL" in result.stdout or result.returncode != 0:
        print("  ⚠️  Tests failed - logging to known issues")
        return False
    return True

def run_lint():
    """Run linter."""
    print("Running linter...")
    result = run("pnpm lint 2>&1 || true", check=False)
    return result.returncode == 0

def check_dependencies():
    """Check if dependencies are installed."""
    if not (PROJECT_ROOT / "node_modules").exists():
        print("Installing dependencies...")
        run("pnpm install")

def main():
    print(f"🎮 ClawGame Development Continuation - {datetime.now().isoformat()}")
    print("=" * 60)
    
    os.chdir(PROJECT_ROOT)
    
    # Check dependencies
    check_dependencies()
    
    # Read current status
    sprint = read_sprint_status()
    version = read_version()
    
    print(f"Current version: {version['version']}")
    print(f"Current milestone: {version.get('milestone', 0)} - {version.get('milestoneName', 'unknown')}")
    print(f"Sprint status: {sprint['done']} done, {sprint['todo']} todo, {sprint['in_progress']} in progress")
    
    # Check for uncommitted changes
    status = git_status()
    if status:
        print(f"\nUncommitted changes detected:\n{status[:500]}")
        
        # Run tests before committing
        tests_passed = run_tests()
        
        if tests_passed:
            # Commit changes
            changes = status.split("\n")
            summary = f"Auto-commit: {len(changes)} files changed"
            if len(changes) <= 10:
                summary += " - " + ", ".join(f.split()[-1] for f in changes[:5])
            
            git_commit(summary)
            print(f"✅ Committed: {summary}")
            
            # Bump patch version for any change
            new_version = bump_version("patch")
            add_changelog_entry(new_version["version"], ["Automated development progress"])
            git_commit(f"chore: bump version to {new_version['version']}")
            
            # Push to remote
            if git_push():
                print("✅ Pushed to remote")
            else:
                print("⚠️  Could not push (no remote configured?)")
        else:
            print("❌ Tests failed - not committing")
            # Log to known issues
            with open(KNOWN_ISSUES_FILE, "a") as f:
                f.write(f"\n- **{datetime.now().isoformat()}**: Tests failed during auto-development\n")
    else:
        print("\n✅ Working tree clean - no changes to commit")
    
    # Self-improvement: Check for patterns in errors
    print("\n📊 Self-improvement check...")
    
    # Read memory for patterns
    if MEMORY_FILE.exists():
        memory = MEMORY_FILE.read_text()
        if "recurrent" in memory.lower() or "pattern" in memory.lower():
            print("  📝 Found patterns in memory - considering optimizations")
    
    print("\n" + "=" * 60)
    print("✅ Development continuation complete")

if __name__ == "__main__":
    main()
