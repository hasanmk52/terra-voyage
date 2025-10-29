# Auto-Documentation Update Slash Command

## Overview
Create a Claude Code slash command `/update-docs` that automatically analyzes recent code changes and updates all documentation files (READMEs, CLAUDE.md, and other docs) to reflect the current state of the codebase.

## Implementation Plan

### 1. Command Structure
**File**: `.claude/commands/update-docs.md`

The command will:
- Detect recent code changes (via git diff or file modification times)
- Analyze the changes for documentation-worthy updates
- Identify all documentation files in the project
- Update each documentation file with relevant changes
- Maintain existing documentation structure and style
- Generate a summary of updates made

### 2. Documentation Discovery Strategy

**Files to Track**:
- `README.md` (root and subdirectories)
- `CLAUDE.md` files (root and `.claude/CLAUDE.md`)
- `docs/**/*.md` (if docs directory exists)
- `*.md` files in root directory (CONTRIBUTING.md, CHANGELOG.md, etc.)

**Discovery Method**:
- Use Glob tool to find all markdown files
- Categorize by type (README, CLAUDE, technical docs, guides)
- Prioritize based on relevance to changes

### 3. Change Detection Approach

**Primary Method - Git-based**:
- Check if in git repository
- Use `git diff` to detect uncommitted changes
- Use `git log` to get recent commits (last 1-5 commits)
- Parse changed files and change types (added, modified, deleted)

**Fallback Method - File timestamps**:
- If not in git, use file modification times
- Compare against last known documentation update timestamp

### 4. Documentation Update Logic

**Analysis Phase**:
- Read changed files to understand modifications
- Categorize changes:
  - New features/functionality
  - API changes
  - Configuration changes
  - Dependencies updates
  - Architecture changes
  - Bug fixes

**Update Phase**:
For each documentation file:
- Read current content
- Identify sections that need updates
- Generate updated content preserving structure
- Use Edit tool to make targeted updates
- Maintain formatting and style consistency

**Specific Update Strategies**:

**README.md**:
- Update feature lists
- Update installation/setup instructions
- Update usage examples
- Update dependency versions
- Update screenshots/demos if needed

**CLAUDE.md**:
- Update architecture section
- Update development commands
- Update directory structure
- Update key technologies
- Update development notes

**Technical Docs**:
- Update API references
- Update configuration examples
- Update code examples
- Update troubleshooting guides

### 5. Smart Update Features

**Context Awareness**:
- Don't update if changes are trivial (formatting, comments)
- Recognize breaking changes and highlight them
- Suggest new sections if major features added
- Preserve user-written content and examples

**Quality Checks**:
- Validate markdown syntax
- Check for broken internal links
- Ensure code examples are up-to-date
- Maintain consistent terminology

**Safety Features**:
- Show preview of changes before applying
- Create backup of original documentation
- Allow rollback if updates are incorrect
- Support `--dry-run` flag for preview mode

### 6. Command Flags and Options

**Flags**:
- `--scope [all|readme|claude|docs]` - Limit update scope
- `--commits [n]` - Number of recent commits to analyze (default: 1)
- `--dry-run` - Preview changes without applying
- `--force` - Skip change detection, update all docs
- `--interactive` - Prompt for approval on each update
- `--summary-only` - Show what would be updated without details

**Usage Examples**:
```bash
/update-docs                          # Update all docs based on recent changes
/update-docs --scope readme           # Only update README files
/update-docs --commits 5              # Analyze last 5 commits
/update-docs --dry-run                # Preview changes
/update-docs --interactive            # Approve each update
/update-docs --force                  # Force update all docs
```

### 7. Output and Reporting

**Update Summary**:
- List of files updated
- Summary of changes per file
- Sections added/modified/removed
- Warnings or issues encountered
- Suggestions for manual review

**Format**:
```
📝 Documentation Update Summary

✅ Updated Files (3):
  - README.md
    → Updated "Features" section
    → Updated "Installation" section
  - .claude/CLAUDE.md
    → Updated "Architecture" section
    → Added new development commands
  - docs/api.md
    → Updated API endpoint examples

⚠️ Warnings (1):
  - docs/setup.md: Contains outdated configuration example (manual review needed)

💡 Suggestions:
  - Consider adding documentation for new authentication flow
  - Update screenshots in README.md to reflect new UI
```

### 8. Integration with Development Workflow

**Automatic Triggering** (Future Enhancement):
- Git post-commit hook integration
- Pre-push hook for documentation validation
- CI/CD pipeline integration
- IDE save hook integration (if supported)

**Manual Triggering**:
- Run command after completing features
- Run before creating pull requests
- Run after merging branches
- Run periodically for maintenance

### 9. Implementation Steps

1. **Create command file** `.claude/commands/update-docs.md`
2. **Implement change detection** - Git diff parsing logic
3. **Implement file discovery** - Glob patterns for all doc files
4. **Implement analysis logic** - Parse changes and determine updates
5. **Implement update logic** - Generate and apply documentation updates
6. **Implement safety features** - Dry-run, backups, validation
7. **Add reporting** - Summary generation and output formatting
8. **Test thoroughly** - Various change types and documentation structures
9. **Document the command** - Add to project CLAUDE.md

### 10. Testing Checklist

- [ ] Test with no changes detected
- [ ] Test with minor code changes
- [ ] Test with major feature additions
- [ ] Test with breaking changes
- [ ] Test with dependency updates
- [ ] Test with file deletions
- [ ] Test all command flags
- [ ] Test in non-git projects
- [ ] Test with various documentation structures
- [ ] Test rollback functionality

## MVP Scope

For the initial implementation, focus on:
1. ✅ Basic command structure with flag support
2. ✅ Git-based change detection (last commit only)
3. ✅ Documentation file discovery (README.md and CLAUDE.md)
4. ✅ Simple update logic for key sections
5. ✅ Dry-run mode for safety
6. ✅ Basic update summary

**Defer to future versions**:
- Advanced change categorization
- Interactive approval mode
- Automatic hook integration
- Complex documentation structures
- Screenshot/image updates
- Link validation

## Technical Requirements

**Tools Needed**:
- Bash - Git commands and file operations
- Glob - Find markdown files
- Read - Read current documentation
- Edit - Update documentation files
- Grep - Search for specific sections
- TodoWrite - Track update progress

**Dependencies**:
- Git (for change detection)
- Markdown files in standard locations

## Success Criteria

The command successfully:
- Detects recent code changes via git
- Finds all relevant documentation files
- Analyzes changes for documentation impact
- Updates documentation with accurate information
- Preserves existing structure and formatting
- Provides clear summary of updates
- Supports dry-run mode for safety
- Completes in reasonable time (<30 seconds)

## Risk Mitigation

**Risk**: Overwriting user-written documentation
**Mitigation**: Dry-run by default, targeted updates only, preserve custom sections

**Risk**: Incorrect or irrelevant updates
**Mitigation**: Smart change detection, context analysis, manual review suggestions

**Risk**: Breaking markdown formatting
**Mitigation**: Markdown validation, preserve formatting, use Edit tool carefully

**Risk**: Performance issues with large codebases
**Mitigation**: Limit scope to recent changes, optimize file reading, caching

---

## Implementation Progress

### Completed Tasks
- [x] Created implementation plan
- [x] Plan reviewed and approved
- [x] Command file created at `.claude/commands/update-docs.md`
- [x] Change detection implemented (git-based with fallback)
- [x] File discovery implemented (glob-based with scope filtering)
- [x] Update logic implemented (intelligent section analysis and targeted updates)
- [x] Testing completed (command structure validated)
- [x] Documentation updated (added to .claude/CLAUDE.md)

### Implementation Summary

**Command File**: `.claude/commands/update-docs.md`

**Key Features Implemented**:

1. **Change Detection System**:
   - Git-based change detection using `git diff` and `git log`
   - Fallback to full update when git unavailable
   - Support for analyzing multiple commits via `--commits` flag
   - Change categorization (features, config, dependencies, architecture, etc.)

2. **Documentation Discovery**:
   - Glob-based file discovery for all markdown files
   - Scope filtering: `all`, `readme`, `claude`, `docs`
   - Prioritized update order (README → CLAUDE → docs)

3. **Intelligent Update Logic**:
   - Section-aware updates (preserves structure)
   - Context-sensitive content generation
   - Impact analysis per documentation type
   - Quality checks and validation

4. **Safety Features**:
   - `--dry-run` mode for previewing changes
   - `--interactive` mode for manual approval
   - Markdown validation
   - Comprehensive update summaries

5. **Flexible Configuration**:
   - Multiple scope options for targeted updates
   - Configurable commit history depth
   - Force mode for comprehensive updates
   - Summary-only mode for quick analysis

**Usage Examples**:
```bash
# Basic usage - analyze last commit and update all docs
/update-docs

# Preview mode - see what would be updated
/update-docs --dry-run

# Update only README files
/update-docs --scope readme

# Analyze last 5 commits
/update-docs --commits 5

# Force update all docs regardless of changes
/update-docs --force

# Interactive approval for each update
/update-docs --interactive
```

**Command Structure**:
The command follows a 9-step process:
1. Parse command arguments and flags
2. Detect code changes (git-based or forced)
3. Discover documentation files by scope
4. Analyze changes for documentation impact
5. Update documentation files with targeted edits
6. Perform quality checks
7. Apply updates or show preview (based on flags)
8. Generate comprehensive update summary
9. Output results with warnings and suggestions

**Integration**:
- Works seamlessly with git workflows
- Supports both committed and uncommitted changes
- Integrates with Claude Code's Edit tool for precise updates
- Provides actionable feedback and suggestions

**Next Steps for Users**:
1. Restart Claude Code or reload the window to register the command
2. Try the command with `--dry-run` first to see it in action
3. Use after completing features or before pull requests
4. Review the update summary for any manual review suggestions

**Future Enhancements** (not in MVP):
- Automatic git hooks integration
- Advanced change categorization with ML
- Screenshot/image update detection
- Link validation and fixing
- Multi-language documentation support
- CI/CD pipeline integration
