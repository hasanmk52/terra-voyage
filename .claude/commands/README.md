# Custom Slash Commands

This directory contains custom slash commands for Claude Code specific to this project.

## Available Commands

### /update-docs

Automatically updates documentation files (README.md, CLAUDE.md, and docs/) based on recent code changes.

**Location**: `.claude/commands/update-docs.md`

**Quick Start**:
```bash
# Preview what would be updated
/update-docs --dry-run

# Update all documentation
/update-docs

# Update only README files
/update-docs --scope readme
```

See [.claude/CLAUDE.md](./../CLAUDE.md) for complete usage documentation.

## Adding New Commands

To add a new custom slash command:

1. Create a new `.md` file in this directory
2. Add YAML frontmatter with `description` and optional `tags`
3. Write the command prompt/instructions
4. Document it in `.claude/CLAUDE.md`
5. Restart Claude Code to register the command

**Example Structure**:
```markdown
---
description: "Brief description of what the command does"
tags: [category1, category2]
---

Your command prompt/instructions here...
```

## Command Registration

Claude Code automatically discovers slash commands from:
- `.claude/commands/*.md` (project-specific)
- `~/.claude/commands/*.md` (global)
- `~/.claude/commands/sc/*.md` (SuperClaude framework)

After adding or modifying commands, restart Claude Code or reload the window.
