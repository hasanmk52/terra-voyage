---
description: Automatically update README, CLAUDE.md, and documentation files based on recent code changes
tags: [documentation, automation, maintenance]
---

You are an intelligent documentation updater for Claude Code. Your task is to analyze recent code changes and automatically update all relevant documentation files to reflect the current state of the codebase.

## Step 1: Parse Command Arguments

Parse the following flags from the user's command:
- `--scope [all|readme|claude|docs]` - Limit update scope (default: all)
- `--commits [n]` - Number of recent commits to analyze (default: 1)
- `--dry-run` - Preview changes without applying them
- `--force` - Force update all docs regardless of changes
- `--interactive` - Prompt for approval on each update

## Step 2: Detect Code Changes

**If NOT using --force flag:**

1. Check if we're in a git repository:
   ```bash
   git rev-parse --is-inside-work-tree
   ```

2. If in git repo, get recent changes:
   - For uncommitted changes: `git diff --name-only`
   - For recent commits: `git diff HEAD~{n}..HEAD --name-only` (where n = --commits value)
   - Get commit messages: `git log -n {n} --pretty=format:"%s%n%b"`

3. If NOT in git repo or git unavailable:
   - Skip change detection
   - Proceed with full documentation update

4. Analyze changed files:
   - Filter out non-code files (docs, configs unless significant)
   - Categorize by type: source code, config, dependencies, tests
   - Extract key changes from commit messages

**If using --force flag:**
- Skip change detection entirely
- Proceed to update all documentation

## Step 3: Discover Documentation Files

Use Glob tool to find all relevant documentation files based on --scope:

**For scope=all or scope=readme:**
- Find all README files: `**/README.md`
- Prioritize root README.md

**For scope=all or scope=claude:**
- Find CLAUDE.md files: `CLAUDE.md`, `.claude/CLAUDE.md`

**For scope=all or scope=docs:**
- Find documentation directory: `docs/**/*.md`
- Find other root-level docs: `*.md` (excluding README.md, CLAUDE.md)

Create a prioritized list of files to update.

## Step 4: Analyze Changes for Documentation Impact

For each changed file, determine documentation impact:

**Source Code Changes:**
- New files → Update architecture/structure, add feature documentation
- Modified files → Review for API changes, new functionality, breaking changes
- Deleted files → Remove from documentation, update architecture

**Configuration Changes:**
- package.json → Update dependencies, scripts, project setup
- tsconfig.json → Update TypeScript configuration notes
- tailwind.config → Update styling approach
- Environment files → Update configuration section

**Dependency Changes:**
- New dependencies → Add to tech stack, update installation
- Removed dependencies → Remove from documentation
- Version updates → Update version numbers

**Categorize changes:**
- 🆕 New Features: New functionality added
- 🔄 Updates: Existing functionality modified
- 🔧 Configuration: Setup/config changes
- 📦 Dependencies: Package updates
- 🏗️ Architecture: Structural changes
- 🐛 Bug Fixes: Error corrections (usually no doc update needed)
- 🎨 Styling: UI/styling changes

## Step 5: Update Documentation Files

For each documentation file in priority order:

### Updating README.md:

1. Read current README.md content
2. Identify sections to update:
   - **Features/Overview**: Add new features, update descriptions
   - **Installation**: Update dependencies, setup steps
   - **Usage**: Add new commands, update examples
   - **Technologies**: Update tech stack
   - **Architecture**: Update if structural changes

3. Generate updated content for affected sections:
   - Preserve existing formatting and style
   - Maintain bullet point structure
   - Keep examples up-to-date
   - Add new items to appropriate sections

4. Use Edit tool to make targeted updates to specific sections

### Updating CLAUDE.md:

1. Read current CLAUDE.md content
2. Identify sections to update:
   - **Project Overview**: Update description, versions
   - **Development Commands**: Add new scripts
   - **Architecture**: Update directory structure, key technologies
   - **Development Notes**: Add new patterns, approaches

3. Generate updated content preserving existing structure

4. Use Edit tool for targeted section updates

### Updating Other Documentation:

1. Match documentation file to change type:
   - API docs → API changes
   - Setup guides → Configuration changes
   - Architecture docs → Structural changes

2. Update relevant sections with new information

3. Maintain consistency with other docs

## Step 6: Quality Checks

Before applying updates:

1. **Validate Markdown syntax**: Ensure proper formatting
2. **Preserve user content**: Don't overwrite custom sections
3. **Maintain consistency**: Use existing terminology and style
4. **Check completeness**: Ensure all relevant changes are documented

## Step 7: Apply Updates or Show Preview

**If --dry-run flag is set:**
- Display preview of all changes
- Show old content → new content for each file
- Don't write any files
- End with summary of what would be updated

**If --interactive flag is set:**
- Show each proposed update
- Ask for user approval before applying
- Allow skipping individual updates

**Otherwise:**
- Apply all updates using Edit tool
- Track which files were updated

## Step 8: Generate Update Summary

Create a comprehensive summary:

```
📝 Documentation Update Summary

✅ Updated Files ({count}):
  - README.md
    → Updated "Features" section (added {feature})
    → Updated "Technologies" section (added {tech})

  - .claude/CLAUDE.md
    → Updated "Development Commands" section
    → Updated "Key Technologies" section

  - docs/api.md
    → Updated API endpoint examples

⚠️ Warnings ({count}):
  - {file}: {warning message}

💡 Suggestions:
  - {manual review suggestions}
  - {additional documentation recommendations}

📊 Change Analysis:
  - Files analyzed: {n}
  - Changes detected: {n}
  - Documentation files updated: {n}
```

## Step 9: Output Results

Present the summary to the user with:
- Clear indication of what was updated
- Any warnings or issues encountered
- Suggestions for manual review
- Next steps if needed

## Important Guidelines

1. **Be Conservative**: Only update documentation that's clearly affected by changes
2. **Preserve Structure**: Maintain existing markdown structure and formatting
3. **Stay Consistent**: Match existing writing style and terminology
4. **Be Specific**: Reference actual changes, don't use vague descriptions
5. **Safety First**: Use --dry-run by default if unsure about changes
6. **Context Aware**: Consider the project type and documentation style

## Error Handling

- If git is unavailable: Warn user and suggest --force flag
- If no changes detected: Inform user, suggest --force if they want to update anyway
- If documentation file doesn't exist: Ask if it should be created
- If Edit operation fails: Log error and continue with other files
- If markdown is malformed: Warn user and skip that file

## Examples

**Example 1: After adding a new feature**
```bash
/update-docs
```
Result: Updates README.md features section, CLAUDE.md architecture section

**Example 2: After dependency updates**
```bash
/update-docs --scope readme
```
Result: Updates only README.md installation and technologies sections

**Example 3: Preview mode**
```bash
/update-docs --dry-run
```
Result: Shows what would be updated without making changes

**Example 4: After multiple commits**
```bash
/update-docs --commits 5
```
Result: Analyzes last 5 commits and updates all relevant documentation

---

## Implementation Notes for Claude

- Use Bash tool for git commands
- Use Glob tool for finding markdown files
- Use Read tool to read current documentation
- Use Edit tool to make targeted updates (preserve structure)
- Use TodoWrite to track update progress
- Use Grep tool if you need to search for specific sections
- Be systematic: detect → discover → analyze → update → report
- Always provide clear feedback on what was done
