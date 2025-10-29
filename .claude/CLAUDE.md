# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan and Review

Before you begin, write a detailed implementation plan in a file named `claude/tasks/TASK_NAME.md`.

This plan should include:

- A clear, detailed breakdown of the implementation steps.
- The reasoning behind your approach.
- A list of specific tasks.

Focus on a **Minimum Viable Product (MVP)** to avoid over-planning. Once the plan is ready, please ask me to review it.  
**Do not proceed with implementation until I have approved the plan.**

### While Implementing

As you work, keep the plan updated. After you complete a task, append a detailed description of the changes you've made to the plan. This ensures that the progress and next steps are clear and can be easily handed over to other engineers if needed.

DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY
MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY.

---

## Project Overview

This is a Next.js 15.4.3 application using React 19.1.0, TypeScript, and Tailwind CSS v4. The project follows the Next.js App Router architecture and was bootstrapped with `create-next-app`.

## Development Commands

- `npm run dev` - Start development server with Turbopack (opens on http://localhost:3000)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Custom Slash Commands

### /update-docs

Automatically updates documentation files (README.md, CLAUDE.md, and docs/) based on recent code changes.

**Usage:**

```bash
/update-docs                    # Update all docs based on recent changes
/update-docs --scope readme     # Only update README files
/update-docs --scope claude     # Only update CLAUDE.md files
/update-docs --scope docs       # Only update docs/ directory
/update-docs --dry-run          # Preview changes without applying
/update-docs --commits 5        # Analyze last 5 commits
/update-docs --force            # Force update all docs
/update-docs --interactive      # Approve each update individually
```

**Features:**

- Git-based change detection (analyzes commits and diffs)
- Intelligent documentation impact analysis
- Targeted section updates (preserves structure)
- Dry-run mode for safe previewing
- Comprehensive update summary with warnings

**Best Practices:**

- Run after completing features or making significant changes
- Use `--dry-run` first to preview changes
- Use `--scope` to limit updates to specific documentation
- Review the summary for any manual updates needed

## Architecture

### Directory Structure

- `src/app/` - Next.js App Router directory containing pages and layouts
- `src/app/layout.tsx` - Root layout with Geist font configuration
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global Tailwind CSS styles
- `public/` - Static assets (SVG icons and images)

### Key Technologies

- **Next.js 15.4.3** with App Router
- **React 19.1.0** with TypeScript
- **Tailwind CSS v4** for styling
- **Geist fonts** (sans and mono) from next/font/google
- **ESLint** with Next.js config for code quality

### TypeScript Configuration

- Path alias: `@/*` maps to `./src/*`
- Strict mode enabled
- Next.js plugin configured for optimal development experience

### Styling Approach

- Tailwind CSS v4 with PostCSS configuration
- Dark mode support built into components
- Responsive design patterns using Tailwind breakpoints
- Font variables defined in layout: `--font-geist-sans` and `--font-geist-mono`

## Development Notes

- The project uses Turbopack for faster development builds
- All components use TypeScript with strict typing
- CSS classes follow Tailwind utility-first approach
- Images are optimized using Next.js Image component
- The app supports both light and dark themes

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
