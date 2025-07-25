# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4.3 application using React 19.1.0, TypeScript, and Tailwind CSS v4. The project follows the Next.js App Router architecture and was bootstrapped with `create-next-app`.

## Development Commands

- `npm run dev` - Start development server with Turbopack (opens on http://localhost:3000)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

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