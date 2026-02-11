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
- [x] Zoom controls (Step 5 ✓)
- [x] Load items from Supabase (Step 6 ✓)
- [x] Render items on canvas (Step 7 ✓)
- [x] File drop upload (Step 8 ✓)
- [x] Text notes (double-click) (Step 9 ✓)
- [x] Drag items to reposition (Step 10 ✓)
- [x] Rectangle drawing tool (Step 11 ✓)
- [x] Toolbar (Step 12 ✓)
- [x] Final polish (Step 13 ✓)

**🎉 ALL CORE FEATURES COMPLETE! 🎉**

## Instructions:

- **IMPORTANT:** Update `CHECKLIST.md` after completing an ENTIRE step (when all sub-tasks are done). Mark the step's title with ✓ and check all sub-task boxes [x].

## Files:
- **CHECKLIST.md** - Quick reference checklist
- **CHECKLIST_HUMAN.md** - Detailed learning guide with technical explanations
