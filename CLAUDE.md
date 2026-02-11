# Omnispace - Project Guide

## Overview

Infinite canvas web app built with React + Vite + Supabase. Users can pan/zoom a canvas, drop files, create text notes, and draw rectangle dividers. All items persist to Supabase.

## Tech Stack

- **Frontend:** React 18+ with Vite
- **Backend:** Supabase (Postgres DB + Storage)
- **Styling:** Plain CSS (no frameworks)

## Supabase Config

- URL: `https://chjvnnrsmlxetuxmgjlc.supabase.co`
- Anon key: `sb_publishable_mXmfsUmWCi3AKY9dCPclPQ_DkuQrNmm`
- Storage bucket: `files`
- Table: `items` (id uuid, type text, x float, y float, width float, height float, content text, file_name text, created_at timestamp)

## Project Structure

```
src/
  main.jsx          — React entry point
  supabaseClient.js — Supabase client init
  App.jsx           — Main canvas logic, state, event handlers
  App.css           — All styles
  components/
    CanvasItem.jsx  — Renders individual items (file/text/rectangle)
    Toolbar.jsx     — Top-left toolbar (tool name + zoom %)
```

## Architecture

- Camera state `{x, y, zoom}` drives a CSS `transform: translate() scale()` on a world container
- Items are positioned absolutely in world coordinates inside the transformed container
- Screen-to-world conversion: `worldX = (screenX - viewportCenter) / zoom + cameraX`
- Dot grid uses CSS `radial-gradient` with background-position tied to camera

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build

## Current Status

- [x] Project scaffolded (Step 1 ✓)
- [x] Supabase client created (Step 2 ✓)
- [x] Canvas layout & dot grid (Step 3 ✓)
- [x] Pan controls (Step 4 ✓)
- [ ] Zoom controls
- [ ] Load items from Supabase
- [ ] Render items on canvas
- [ ] File drop upload
- [ ] Text notes (double-click)
- [ ] Drag items to reposition
- [ ] Rectangle drawing tool
- [ ] Toolbar
- [ ] Final polish

## Instructions:

- Update '/CHECKLIST.md' after each task completed.

## Files:
- **CHECKLIST.md** - Quick reference checklist
- **CHECKLIST_HUMAN.md** - Detailed learning guide with technical explanations
