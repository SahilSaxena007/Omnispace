# Omnispace - Implementation Checklist

Each step below is self-contained. You can execute them in order manually or ask Claude to do them.

---

## Step 1: Scaffold React + Vite Project ✓
**Goal:** Get a working React app running locally.

- [x] Set up project manually (due to non-empty directory)
- [x] Run `npm install`
- [x] Run `npm install @supabase/supabase-js`
- [x] Created basic React structure with minimal boilerplate
- [x] Verified with `npm run dev` — shows dark page with "Omnispace" heading

---

## Step 2: Create Supabase Client ✓
**Goal:** A reusable module that exports the Supabase client.

- [x] Create `src/supabaseClient.js`
- [x] Import `createClient` from `@supabase/supabase-js`
- [x] Initialize with URL and anon key from environment variables
- [x] Export the client as named export
- [x] Created `.env` file with Vite-prefixed env vars
- [x] Added `.env` to `.gitignore`
- [x] Created `.env.example` for reference
- [x] Verified client initializes correctly

**Code pattern:**
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

---

## Step 3: Canvas Layout & Dot Grid ✓
**Goal:** Dark canvas with a dot grid that responds to pan/zoom.

- [x] In `App.jsx`, create state: `const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })`
- [x] Create the viewport div (`className="viewport"`) — full screen, `overflow: hidden`
- [x] Inside it, create the world div (`className="world"`) — gets the CSS transform
- [x] CSS transform formula: `translate(${-camera.x * camera.zoom + window.innerWidth/2}px, ${-camera.y * camera.zoom + window.innerHeight/2}px) scale(${camera.zoom})`
- [x] Set `transform-origin: 0 0` on the world div
- [x] In `App.css`, style viewport: `width: 100vw; height: 100vh; background: #1a1a1a; position: relative`
- [x] Add dot grid using CSS on viewport with radial-gradient
- [x] Set dot grid background-size and background-position as inline styles (calculated from camera state)
- [x] Body margin/padding already set to 0 in `index.css`, overflow hidden
- [x] Added missing `useState` import from React

---

## Step 4: Pan Controls ✓
**Goal:** Drag to pan the canvas.

- [x] Track `spaceHeld` in a ref (keydown/keyup listeners for spacebar)
- [x] On `mousedown` in viewport: if middle button (button===1) or (left button + space held), start panning
- [x] Store pan start state in a ref: `{ startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y }`
- [x] On `mousemove` while panning: compute delta, update camera
- [x] On `mouseup`, stop panning
- [x] Set cursor to `grab` when space is held, `grabbing` while actively panning

---

## Step 5: Zoom Controls ✓
**Goal:** Scroll wheel zooms centered on the cursor position.

- [x] Listen for `wheel` event on viewport (use `{ passive: false }` and `e.preventDefault()`)
- [x] Compute world point under cursor BEFORE zoom
- [x] Compute new zoom: `newZoom = oldZoom * (e.deltaY > 0 ? 0.9 : 1.1)`, clamp to [0.1, 5]
- [x] Adjust camera so the same world point stays under cursor
- [x] Update camera state with new x, y, zoom
- [x] Added viewportRef for native event listener
- [x] Added useEffect to attach wheel listener with passive: false

---

## Step 6: Load Items from Supabase ✓
**Goal:** Fetch all existing items on page load.

- [x] Create state: `const [items, setItems] = useState([])`
- [x] Create loading state: `const [loading, setLoading] = useState(true)`
- [x] In `useEffect` (run once on mount):
  - Fetch items with `supabase.from('items').select('*')`
  - Order by `created_at` ascending
  - Handle errors with try/catch
  - Set loading to false when done
- [x] Added loading indicator overlay
- [x] Added temporary items count display
- [x] Items will be rendered in the next step

---

## Step 7: Render Items on Canvas ✓
**Goal:** Display file cards, text notes, and rectangles on the canvas.

- [x] Create `src/components/CanvasItem.jsx`
- [x] Receives props: `item`, `zoom`
- [x] Position with: `style={{ position: 'absolute', left: item.x, top: item.y }}`
- [x] **File items** (`type='file'`):
  - White background, rounded corners, 180x120px
  - Show `item.file_name` truncated (CSS `text-overflow: ellipsis`)
  - `onClick` → `window.open(item.content, '_blank')`
- [x] **Text items** (`type='text'`):
  - Light gray background (#2a2a2a), padding, rounded corners
  - Show `item.content` as text (supports multi-line with pre-wrap)
- [x] **Rectangle items** (`type='rectangle'`):
  - `border: 2px solid white`, no background
  - Set `width` and `height` from item
  - `pointer-events: none` so they don't block clicking
- [x] Map over `items` array in App.jsx, render `<CanvasItem>` inside the world div
- [x] Created CanvasItem.css with styles for all item types
- [x] Added hover effects for better UX
- [x] Removed temporary "items loaded" message

---

## Step 8: File Drop Upload ✓
**Goal:** Drag files from desktop, upload to Supabase, show on canvas.

- [x] Add `onDragOver={e => e.preventDefault()}` to viewport
- [x] Add `onDrop` handler to viewport with complete pipeline:
  - Get file from `e.dataTransfer.files[0]`
  - Convert drop position to world coords using camera transform
  - Generate unique path: `${Date.now()}_${file.name}`
  - Upload to Supabase Storage: `supabase.storage.from('files').upload(path, file)`
  - Get public URL from storage
  - Insert database record with type='file', position, URL, and filename
  - Add returned item to local state for immediate UI update
- [x] Added error handling with user alerts
- [x] Added console logging for debugging
- [x] File cards appear at exact drop location (world coordinates)
- [x] Works correctly with pan and zoom

---

## Step 9: Text Notes (Double-Click) ✓
**Goal:** Double-click canvas to create a text note.

- [x] Create state: `editingText` (holds position) and `textValue` (input content)
- [x] On `dblclick` on viewport (not on an item):
  - Convert screen coordinates to world coordinates
  - Set `editingText = { x: worldX, y: worldY }`
  - Clear textValue for new input
- [x] Render `<input>` inside world div at editingText position
- [x] On blur or Enter key:
  - Validate: only save if text is non-empty
  - Insert into Supabase with type='text', position, and content
  - Add to items state for immediate UI update
  - Clear editingText
- [x] On Escape key: Cancel editing without saving
- [x] Auto-focus input when it appears (useEffect + ref)
- [x] Added placeholder text "Type your note..."
- [x] Styled input with blue border and dark background

---

## Step 10: Drag Items to Reposition ✓
**Goal:** Drag text notes and file cards to move them, save new position.

- [x] In `CanvasItem`, on `mousedown` (for file/text types only):
  - `e.stopPropagation()` to prevent canvas pan
  - Record start: `{ mouseX: e.clientX, mouseY: e.clientY, itemX: item.x, itemY: item.y }`
- [x] On `mousemove` (attach to `window`):
  ```js
  newX = start.itemX + (e.clientX - start.mouseX) / zoom
  newY = start.itemY + (e.clientY - start.mouseY) / zoom
  ```
- [x] Update item position in local state for immediate feedback
- [x] On `mouseup`:
  - Detach listeners
  - Call `supabase.from('items').update({ x: newX, y: newY }).eq('id', item.id)`

---

## Step 11: Rectangle Drawing Tool
**Goal:** Press R to enter rectangle mode, click-drag to draw.

- [ ] Create state: `const [tool, setTool] = useState('select')` — 'select' or 'rectangle'
- [ ] Listen for 'r' keypress → set tool to 'rectangle'
- [ ] Create state for drawing: `const [drawStart, setDrawStart] = useState(null)`
- [ ] In rectangle mode, on `mousedown` on viewport:
  - Convert to world coords, store as `drawStart`
- [ ] On `mousemove` while drawing:
  - Track current world position in state for preview
  - Render a dashed rectangle from drawStart to current position
- [ ] On `mouseup`:
  - Compute x, y (top-left), width, height from start and end points:
    ```js
    x = Math.min(start.x, end.x)
    y = Math.min(start.y, end.y)
    width = Math.abs(end.x - start.x)
    height = Math.abs(end.y - start.y)
    ```
  - Insert into Supabase with type='rectangle'
  - Add to items, reset tool to 'select'
- [ ] Set cursor to `crosshair` when in rectangle mode

---

## Step 12: Toolbar
**Goal:** Fixed UI showing current tool and zoom level.

- [ ] Create `src/components/Toolbar.jsx`
- [ ] Props: `tool`, `zoom`
- [ ] Position: `position: fixed; top: 16px; left: 16px; z-index: 100`
- [ ] Style: dark semi-transparent background, white text, rounded, padding
- [ ] Display: tool name ("Select" / "Rectangle") and zoom percentage (`Math.round(zoom * 100) + '%'`)

---

## Step 13: Final Polish
**Goal:** Make everything feel tight.

- [ ] Ensure `body { margin: 0; overflow: hidden; }` is set
- [ ] Cursor states: default → `grab` (space held) → `grabbing` (panning) → `crosshair` (rectangle mode)
- [ ] Prevent default on scroll so page doesn't bounce
- [ ] Test: refresh page, all items reload from Supabase
- [ ] Test: all features work together without conflicts

---

## Verification
After completing all steps, verify:
1. `npm run dev` — app loads with dark canvas and dot grid
2. Middle-click drag or spacebar+click to pan
3. Scroll wheel zooms centered on cursor
4. Drag a file from desktop → card appears, file uploads to Supabase
5. Click a file card → opens file URL in new tab
6. Double-click canvas → type text → note appears
7. Drag a text note or file card → repositions, persists
8. Press R → draw rectangle → white border appears
9. Refresh → all items still there
