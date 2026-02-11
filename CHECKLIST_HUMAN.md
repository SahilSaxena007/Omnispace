# Omnispace - Learning-Focused Implementation Guide

This guide explains each step in detail with the technical concepts and reasoning behind every decision.

---

## Step 1: Scaffold React + Vite Project ✓
**Status:** Complete

---

## Step 2: Create Supabase Client
**Goal:** Initialize a singleton instance of the Supabase JavaScript client.

### What you're building:
A small JavaScript module that exports a configured Supabase client. This client will be imported throughout your app whenever you need to interact with Supabase (database queries, storage operations).

### Why we need this:
- **Separation of concerns:** Keeping configuration in one place makes it easier to update credentials or add interceptors later
- **Singleton pattern:** We only want one instance of the Supabase client to avoid creating multiple connections
- **DRY principle:** Instead of initializing Supabase in every component, we import the same client everywhere

### Technical concepts:
- **ES6 modules:** Using `import`/`export` to share code between files
- **Environment separation:** In production apps, you'd use `.env` files for these credentials (we're hardcoding for simplicity)
- **Client library initialization:** The `createClient` function establishes a connection pool and configures authentication headers

### Implementation:
```javascript
// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://chjvnnrsmlxetuxmgjlc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoanZubnJzbWx4ZXR1eG1namxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1MzU1MjAsImV4cCI6MjA1NTExMTUyMH0.mXmfsUmWCi3AKY9dCPclPQ_DkuQrNmm'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

### Verification:
- Import and console.log the client in `App.jsx` to verify it's initialized
- No errors = success

---

## Step 3: Canvas Layout & Dot Grid
**Goal:** Create an infinite canvas viewport with a scalable dot grid background.

### What you're building:
A two-layer structure:
1. **Viewport layer** (fixed, fills screen) - the "window" you look through
2. **World layer** (infinite, transforms) - the actual canvas that moves and scales

### Why this architecture:
- **Viewport as a camera:** The viewport stays fixed while the world moves underneath (like looking through a camera viewfinder)
- **CSS transforms for performance:** Using `transform: translate() scale()` is GPU-accelerated and much faster than repositioning every element individually
- **Transform origin:** Setting `transform-origin: 0 0` ensures scaling happens from the top-left, making coordinate math predictable

### Technical concepts:
- **Coordinate systems:** World space (infinite, where items live) vs. screen space (your monitor pixels)
- **Affine transformations:** The combination of translation + scaling is called an affine transformation
- **React state management:** The camera position drives the entire UI through reactive updates
- **CSS background patterns:** Using `radial-gradient` to create repeating dots

### Implementation:

**App.jsx state:**
```javascript
const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
```

**Why these defaults?**
- `x: 0, y: 0` = camera starts at world origin
- `zoom: 1` = 1:1 scale (100%)

**JSX structure:**
```jsx
<div className="viewport">
  <div
    className="world"
    style={{
      transform: `translate(${-camera.x * camera.zoom + window.innerWidth/2}px, ${-camera.y * camera.zoom + window.innerHeight/2}px) scale(${camera.zoom})`,
      transformOrigin: '0 0'
    }}
  >
    {/* Items will go here */}
  </div>
</div>
```

**Transform formula breakdown:**
- `-camera.x * camera.zoom` = convert world position to screen offset
- `+ window.innerWidth/2` = center the canvas (so camera x:0 is in the middle)
- `scale(${camera.zoom})` = zoom level

**App.css:**
```css
.viewport {
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  position: relative;
  overflow: hidden;
  cursor: default;
}

.world {
  position: absolute;
  width: 100%;
  height: 100%;
}
```

**Dot grid (inline styles on viewport):**
```javascript
const dotSize = 30 * camera.zoom // dots scale with zoom
const offsetX = (-camera.x * camera.zoom + window.innerWidth/2) % dotSize
const offsetY = (-camera.y * camera.zoom + window.innerHeight/2) % dotSize

// Add to viewport style prop:
style={{
  backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
  backgroundSize: `${dotSize}px ${dotSize}px`,
  backgroundPosition: `${offsetX}px ${offsetY}px`
}}
```

**Why modulo (%) for offset?**
- Background patterns repeat infinitely
- We only care about the offset within one tile
- `% dotSize` keeps the value between 0 and dotSize

### Verification:
- See dark background with subtle dot grid
- Temporarily change camera.x in state → dots should move
- Change camera.zoom → dots should scale

---

## Step 4: Pan Controls
**Goal:** Enable dragging the canvas with middle mouse button or spacebar + left click.

### What you're building:
Mouse event handlers that convert screen-space mouse movement into world-space camera movement.

### Why this approach:
- **Event delegation:** Listening on the viewport (not individual items) catches all mouse events
- **Ref for tracking:** Using `useRef` for drag state avoids re-renders during high-frequency mousemove events
- **Pointer capture:** Browser provides `setPointerCapture` for smooth dragging even if mouse leaves the element

### Technical concepts:
- **Event.button:** `0` = left, `1` = middle, `2` = right
- **ClientX/ClientY:** Mouse position in screen pixels (relative to viewport)
- **Delta calculation:** Current position - start position = how far mouse moved
- **Coordinate conversion:** Screen delta / zoom = world delta (because zoom affects scale)

### Implementation:

**State and refs:**
```javascript
const [isPanning, setIsPanning] = useState(false)
const panStartRef = useRef(null) // { mouseX, mouseY, camX, camY }
const spaceHeldRef = useRef(false)
```

**Keyboard listeners (in useEffect):**
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.code === 'Space') {
      e.preventDefault()
      spaceHeldRef.current = true
    }
  }

  const handleKeyUp = (e) => {
    if (e.code === 'Space') {
      spaceHeldRef.current = false
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }
}, [])
```

**Why preventDefault on Space?**
- Browsers scroll the page when space is pressed
- We want to use it as a modifier key instead

**Mouse handlers:**
```javascript
const handleMouseDown = (e) => {
  // Middle mouse OR (left mouse + space held)
  if (e.button === 1 || (e.button === 0 && spaceHeldRef.current)) {
    e.preventDefault()
    setIsPanning(true)
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      camX: camera.x,
      camY: camera.y
    }
  }
}

const handleMouseMove = (e) => {
  if (!isPanning || !panStartRef.current) return

  const deltaX = e.clientX - panStartRef.current.mouseX
  const deltaY = e.clientY - panStartRef.current.mouseY

  // Divide by zoom because screen movement represents different
  // world distances at different zoom levels
  setCamera({
    ...camera,
    x: panStartRef.current.camX - deltaX / camera.zoom,
    y: panStartRef.current.camY - deltaY / camera.zoom
  })
}

const handleMouseUp = () => {
  setIsPanning(false)
  panStartRef.current = null
}
```

**Why subtract deltaX instead of add?**
- When you drag right (+deltaX), the world should move left (-x)
- Like dragging a piece of paper on a desk

**Cursor styling:**
```css
.viewport {
  cursor: default;
}

.viewport.space-held {
  cursor: grab;
}

.viewport.panning {
  cursor: grabbing;
}
```

**Dynamic class application:**
```jsx
<div
  className={`viewport ${spaceHeldRef.current ? 'space-held' : ''} ${isPanning ? 'panning' : ''}`}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
>
```

### Verification:
- Middle-click drag → canvas moves
- Hold space → cursor changes to grab
- Spacebar + left-click drag → canvas moves
- Release → cursor returns to normal

---

## Step 5: Zoom Controls
**Goal:** Scroll wheel zooms in/out, centered on the cursor position.

### What you're building:
A wheel event handler that adjusts zoom while keeping the point under the cursor stationary.

### Why this is complex:
Simple zoom (just changing the zoom value) would zoom from the origin, causing the canvas to "jump." We want the point under your cursor to stay put, like zooming in Google Maps.

### Technical concepts:
- **Invariant point:** The world coordinate under the cursor must remain constant
- **Two-step transformation:**
  1. Find world point before zoom
  2. Adjust camera so same world point is under cursor after zoom
- **Event.preventDefault:** Required for `wheel` events to override browser scrolling

### Mathematical approach:

**Before zoom:** `worldPoint = (mousePos - viewportCenter) / oldZoom + oldCamera`

**After zoom:** `newCamera = worldPoint - (mousePos - viewportCenter) / newZoom`

### Implementation:

```javascript
const handleWheel = (e) => {
  e.preventDefault()

  const rect = e.currentTarget.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  // World point under cursor BEFORE zoom
  const worldX = (mouseX - window.innerWidth / 2) / camera.zoom + camera.x
  const worldY = (mouseY - window.innerHeight / 2) / camera.zoom + camera.y

  // Calculate new zoom (0.9 = zoom out, 1.1 = zoom in)
  const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomDelta))

  // Adjust camera to keep worldX, worldY under the cursor
  const newCamX = worldX - (mouseX - window.innerWidth / 2) / newZoom
  const newCamY = worldY - (mouseY - window.innerHeight / 2) / newZoom

  setCamera({ x: newCamX, y: newCamY, zoom: newZoom })
}
```

**Why clamp zoom to [0.1, 5]?**
- Too small = performance issues with huge world
- Too large = can't see individual pixels

**Add to viewport:**
```jsx
<div
  className="viewport"
  onWheel={handleWheel}
  // ... other handlers
>
```

**UseEffect for passive: false:**
```javascript
useEffect(() => {
  const viewport = viewportRef.current
  const handleWheelPassive = (e) => {
    e.preventDefault()
    handleWheel(e)
  }

  viewport.addEventListener('wheel', handleWheelPassive, { passive: false })

  return () => {
    viewport.removeEventListener('wheel', handleWheelPassive)
  }
}, [camera])
```

**Why passive: false?**
- React's synthetic events don't support preventDefault on wheel events
- We need native events with passive: false to override scroll behavior

### Verification:
- Scroll wheel → zooms in/out
- Point under cursor stays stationary
- Zoom percentage changes (check with console.log)
- Clamps at 10% and 500%

---

## Step 6: Load Items from Supabase
**Goal:** Fetch all items from the database on component mount.

### What you're building:
A React effect that runs once on mount to populate the initial state.

### Why useEffect with empty deps:
- **Lifecycle hook:** useEffect with `[]` runs once after first render
- **Async pattern:** Supabase queries are async, so we need async/await
- **State initialization:** Loading remote data into local state for fast reads

### Technical concepts:
- **REST API abstraction:** `supabase.from()` generates HTTP requests under the hood
- **SELECT query:** SQL SELECT * translated to JavaScript API
- **Optimistic UI:** We'll render from state, making UI updates instant

### Implementation:

```javascript
const [items, setItems] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading items:', error)
    } else {
      setItems(data || [])
    }

    setLoading(false)
  }

  loadItems()
}, []) // Empty deps = run once on mount
```

**Why order by created_at?**
- Consistent rendering order
- Newer items on top in DOM = higher z-index

**Loading state:**
```jsx
{loading ? (
  <div className="loading">Loading canvas...</div>
) : (
  <div className="world">
    {/* items will render here */}
  </div>
)}
```

### Verification:
- Check Network tab → should see POST to Supabase API
- Console.log items → should be an array (empty if no data yet)
- Add a test row in Supabase dashboard → refresh → should load

---

## Step 7: Render Items on Canvas
**Goal:** Display each item as a positioned element based on its type.

### What you're building:
A component that takes an item object and returns the appropriate JSX based on `item.type`.

### Why separate component:
- **Component composition:** Smaller, focused components are easier to test and maintain
- **Props pattern:** Parent controls data flow, child controls rendering
- **Conditional rendering:** Switch statement for different item types

### Technical concepts:
- **Absolute positioning:** Each item uses `position: absolute` with `left/top` in world coordinates
- **CSS transform inheritance:** Items inherit the parent's transform, so world coords "just work"
- **Event bubbling:** Child elements bubble events to parent (important for drag handling)

### Implementation:

**Create file:** `src/components/CanvasItem.jsx`

```javascript
import './CanvasItem.css'

function CanvasItem({ item, zoom }) {
  const handleClick = (e) => {
    if (item.type === 'file') {
      window.open(item.content, '_blank')
    }
  }

  return (
    <div
      className={`canvas-item canvas-item-${item.type}`}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height
      }}
      onClick={handleClick}
    >
      {item.type === 'file' && (
        <div className="file-card">
          <div className="file-icon">📄</div>
          <div className="file-name">{item.file_name}</div>
        </div>
      )}

      {item.type === 'text' && (
        <div className="text-note">
          {item.content}
        </div>
      )}

      {item.type === 'rectangle' && (
        <div className="rectangle-border" />
      )}
    </div>
  )
}

export default CanvasItem
```

**Create file:** `src/components/CanvasItem.css`

```css
.canvas-item {
  cursor: pointer;
  user-select: none;
}

/* File cards */
.file-card {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.1s;
}

.file-card:hover {
  transform: scale(1.05);
}

.file-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.file-name {
  font-size: 12px;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* Text notes */
.text-note {
  width: 100%;
  height: 100%;
  background: #2a2a2a;
  color: white;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

/* Rectangles */
.rectangle-border {
  width: 100%;
  height: 100%;
  border: 2px solid white;
  pointer-events: none; /* Don't block clicks */
  border-radius: 4px;
}

.canvas-item-rectangle {
  cursor: default;
  pointer-events: none;
}
```

**Use in App.jsx:**
```javascript
import CanvasItem from './components/CanvasItem'

// Inside the world div:
{items.map(item => (
  <CanvasItem
    key={item.id}
    item={item}
    zoom={camera.zoom}
  />
))}
```

**Why pass zoom prop?**
- Items might need to adjust stroke width at extreme zooms
- Currently unused but good for future enhancements

### Verification:
- If items array is empty, nothing renders (expected)
- Add test items via Supabase dashboard
- Refresh → items should appear at their x,y coordinates

---

## Step 8: File Drop Upload
**Goal:** Drag files from desktop, upload to Supabase Storage, create item record.

### What you're building:
Event handlers for drag-and-drop that convert screen coordinates to world coordinates and handle async file upload.

### Why this is interesting:
- **Browser File API:** Accessing files from drag events
- **Coordinate transformation:** Drop position needs converting from screen → world
- **Async operations chain:** Get file → upload → get URL → insert DB → update state

### Technical concepts:
- **DataTransfer API:** `e.dataTransfer.files` contains dropped files
- **FormData:** Supabase Storage expects File objects (which we have)
- **Public URL:** Storage returns a path, we convert to full URL
- **Optimistic updates:** Could add to state immediately, then handle errors

### Implementation:

```javascript
const handleDragOver = (e) => {
  e.preventDefault() // Required to allow drop
  e.dataTransfer.dropEffect = 'copy' // Cursor indicates copy operation
}

const handleDrop = async (e) => {
  e.preventDefault()

  const file = e.dataTransfer.files[0]
  if (!file) return

  // Convert screen coords to world coords
  const rect = e.currentTarget.getBoundingClientRect()
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top

  const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x
  const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y

  try {
    // 1. Upload to Storage
    const filePath = `${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(filePath)

    // 3. Insert DB record
    const { data: newItem, error: dbError } = await supabase
      .from('items')
      .insert({
        type: 'file',
        x: worldX,
        y: worldY,
        width: 180,
        height: 120,
        content: urlData.publicUrl,
        file_name: file.name
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 4. Update local state
    setItems([...items, newItem])

  } catch (error) {
    console.error('Upload failed:', error)
    alert('Failed to upload file')
  }
}
```

**Add to viewport:**
```jsx
<div
  className="viewport"
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  // ... other handlers
>
```

**Why timestamp in filename?**
- Ensures uniqueness (prevents overwrites)
- Avoids conflicts with same-named files
- Simple alternative to UUIDs

**Why .single()?**
- INSERT returns an array by default
- `.single()` unwraps to just the object
- Cleaner for state updates

### Verification:
- Drag an image file from desktop → drops on canvas
- Check Supabase Storage → file appears in "files" bucket
- Check Supabase Table Editor → new row in "items"
- White card appears at drop location
- Click card → opens file in new tab

---

## Step 9: Text Notes (Double-Click)
**Goal:** Double-click empty space to create a text note.

### What you're building:
A modal input that appears at the click location, saves to DB on blur/Enter.

### Why double-click:
- **Prevents accidents:** Single-click would interfere with other interactions
- **Standard pattern:** Text tools in Figma, Miro, etc. use double-click

### Technical concepts:
- **Conditional rendering:** Input only exists in DOM when editing
- **Controlled component:** Input value tied to state
- **Event.stopPropagation:** Prevents triggering parent handlers
- **Auto-focus:** `useRef` + `useEffect` to focus input on mount

### Implementation:

**State:**
```javascript
const [editingText, setEditingText] = useState(null) // { x, y } or null
const [textValue, setTextValue] = useState('')
const textInputRef = useRef(null)
```

**Double-click handler:**
```javascript
const handleDoubleClick = (e) => {
  // Only if clicking empty space (not an item)
  if (e.target.classList.contains('world') || e.target.classList.contains('viewport')) {
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x
    const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y

    setEditingText({ x: worldX, y: worldY })
    setTextValue('')
  }
}
```

**Save handler:**
```javascript
const saveTextNote = async () => {
  if (!textValue.trim() || !editingText) {
    setEditingText(null)
    return
  }

  try {
    const { data: newItem, error } = await supabase
      .from('items')
      .insert({
        type: 'text',
        x: editingText.x,
        y: editingText.y,
        width: 200,
        height: 40,
        content: textValue
      })
      .select()
      .single()

    if (error) throw error

    setItems([...items, newItem])
    setEditingText(null)
    setTextValue('')
  } catch (error) {
    console.error('Failed to save text:', error)
  }
}

const handleTextKeyDown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveTextNote()
  } else if (e.key === 'Escape') {
    setEditingText(null)
    setTextValue('')
  }
}
```

**Auto-focus effect:**
```javascript
useEffect(() => {
  if (editingText && textInputRef.current) {
    textInputRef.current.focus()
  }
}, [editingText])
```

**Render input in world:**
```jsx
<div className="world" onDoubleClick={handleDoubleClick}>
  {items.map(item => <CanvasItem key={item.id} item={item} />)}

  {editingText && (
    <input
      ref={textInputRef}
      type="text"
      className="text-input"
      style={{
        position: 'absolute',
        left: editingText.x,
        top: editingText.y,
        width: 200
      }}
      value={textValue}
      onChange={e => setTextValue(e.target.value)}
      onBlur={saveTextNote}
      onKeyDown={handleTextKeyDown}
    />
  )}
</div>
```

**CSS:**
```css
.text-input {
  padding: 8px;
  font-size: 14px;
  border: 2px solid #4a9eff;
  border-radius: 4px;
  background: #2a2a2a;
  color: white;
  outline: none;
}
```

### Verification:
- Double-click canvas → input appears
- Type text → press Enter → text note appears
- Double-click again → new input appears
- Press Escape → input cancels without saving
- Empty text → doesn't save

---

## Step 10: Drag Items to Reposition
**Goal:** Click and drag text/file items to move them, persist new position.

### What you're building:
Mouse handlers on items that track drag delta and update item position, both locally (instant feedback) and in DB (persistence).

### Why this is complex:
- **Nested interaction:** Items are inside a transforming world div
- **Event propagation:** Must stopPropagation to prevent canvas panning
- **State update strategy:** Update local state immediately, debounce DB update
- **Zoom compensation:** Mouse delta in screen pixels needs dividing by zoom

### Technical concepts:
- **Event.stopPropagation():** Stops event from bubbling to parent
- **Window event listeners:** Track mouse even outside the element
- **Cleanup pattern:** Remove listeners on unmount/end
- **Optimistic UI:** UI updates before DB confirms

### Implementation:

**In CanvasItem.jsx:**
```javascript
function CanvasItem({ item, zoom, onDragStart, onDrag, onDragEnd }) {
  const handleMouseDown = (e) => {
    if (item.type === 'rectangle') return // Rectangles not draggable

    e.stopPropagation() // Don't trigger canvas pan
    onDragStart(item.id, e.clientX, e.clientY)
  }

  return (
    <div
      className={`canvas-item canvas-item-${item.type}`}
      style={{ /* ... */ }}
      onMouseDown={handleMouseDown}
    >
      {/* ... */}
    </div>
  )
}
```

**In App.jsx:**
```javascript
const [draggingItem, setDraggingItem] = useState(null)
// { id, startX, startY, originalX, originalY }

const handleDragStart = (itemId, mouseX, mouseY) => {
  const item = items.find(i => i.id === itemId)
  if (!item) return

  setDraggingItem({
    id: itemId,
    startX: mouseX,
    startY: mouseY,
    originalX: item.x,
    originalY: item.y
  })
}

const handleDragMove = (e) => {
  if (!draggingItem) return

  const deltaX = e.clientX - draggingItem.startX
  const deltaY = e.clientY - draggingItem.startY

  // Convert screen delta to world delta
  const worldDeltaX = deltaX / camera.zoom
  const worldDeltaY = deltaY / camera.zoom

  // Update item position in state
  setItems(items.map(item =>
    item.id === draggingItem.id
      ? {
          ...item,
          x: draggingItem.originalX + worldDeltaX,
          y: draggingItem.originalY + worldDeltaY
        }
      : item
  ))
}

const handleDragEnd = async () => {
  if (!draggingItem) return

  const item = items.find(i => i.id === draggingItem.id)
  if (!item) return

  // Persist to DB
  await supabase
    .from('items')
    .update({ x: item.x, y: item.y })
    .eq('id', item.id)

  setDraggingItem(null)
}

// Window listeners
useEffect(() => {
  if (draggingItem) {
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)

    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }
}, [draggingItem, camera.zoom, items])
```

**Pass handlers to CanvasItem:**
```jsx
<CanvasItem
  key={item.id}
  item={item}
  zoom={camera.zoom}
  onDragStart={handleDragStart}
/>
```

**Cursor styling:**
```css
.canvas-item-file:hover,
.canvas-item-text:hover {
  cursor: move;
}
```

### Verification:
- Click and drag file card → moves smoothly
- Release → stays at new position
- Refresh → position persists
- Drag text note → works
- Try dragging rectangle → doesn't move (correct)
- Drag while zoomed in/out → still accurate

---

## Step 11: Rectangle Drawing Tool
**Goal:** Press 'R' to enter rectangle mode, click-drag to draw borders.

### What you're building:
A state machine that switches between 'select' and 'rectangle' modes, with a preview rectangle during drawing.

### Why state machine pattern:
- **Clear modes:** Tool state is explicit, not implicit
- **Easy to extend:** Adding more tools just means more states
- **Predictable:** Each mode has defined behavior

### Technical concepts:
- **Keyboard shortcuts:** Global key listener switches tools
- **Preview pattern:** Show temporary visual during drag, commit on release
- **Bounding box math:** Calculate x, y, width, height from two points

### Implementation:

**State:**
```javascript
const [tool, setTool] = useState('select') // 'select' or 'rectangle'
const [rectStart, setRectStart] = useState(null) // { x, y } or null
const [rectEnd, setRectEnd] = useState(null) // { x, y } or null
```

**Keyboard handler:**
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.code === 'KeyR' && !editingText) {
      setTool(tool === 'rectangle' ? 'select' : 'rectangle')
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [tool, editingText])
```

**Why check !editingText?**
- Don't switch tools while typing (R would trigger mid-sentence)

**Mouse handlers (modify existing ones):**
```javascript
const handleMouseDown = (e) => {
  if (tool === 'rectangle' && e.target.classList.contains('world')) {
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x
    const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y

    setRectStart({ x: worldX, y: worldY })
    setRectEnd({ x: worldX, y: worldY })
  }
  // ... existing pan logic
}

const handleMouseMove = (e) => {
  if (rectStart) {
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x
    const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y

    setRectEnd({ x: worldX, y: worldY })
  }
  // ... existing drag logic
}

const handleMouseUp = async () => {
  if (rectStart && rectEnd) {
    // Calculate bounding box
    const x = Math.min(rectStart.x, rectEnd.x)
    const y = Math.min(rectStart.y, rectEnd.y)
    const width = Math.abs(rectEnd.x - rectStart.x)
    const height = Math.abs(rectEnd.y - rectStart.y)

    if (width > 5 && height > 5) { // Minimum size
      const { data: newItem } = await supabase
        .from('items')
        .insert({
          type: 'rectangle',
          x, y, width, height,
          content: '', // Unused for rectangles
          file_name: null
        })
        .select()
        .single()

      setItems([...items, newItem])
    }

    setRectStart(null)
    setRectEnd(null)
    setTool('select') // Auto-return to select mode
  }
  // ... existing logic
}
```

**Preview rectangle (in world div):**
```jsx
{rectStart && rectEnd && (
  <div
    className="rectangle-preview"
    style={{
      position: 'absolute',
      left: Math.min(rectStart.x, rectEnd.x),
      top: Math.min(rectStart.y, rectEnd.y),
      width: Math.abs(rectEnd.x - rectStart.x),
      height: Math.abs(rectEnd.y - rectStart.y),
      border: '2px dashed white',
      pointerEvents: 'none'
    }}
  />
)}
```

**Cursor change:**
```css
.viewport.tool-rectangle {
  cursor: crosshair;
}
```

```jsx
<div className={`viewport tool-${tool}`}>
```

### Verification:
- Press 'R' → cursor changes to crosshair
- Click-drag → dashed rectangle preview appears
- Release → solid rectangle saved, tool returns to select
- Refresh → rectangle persists
- Press 'R' again → toggles back off

---

## Step 12: Toolbar
**Goal:** Fixed UI showing current tool and zoom level.

### What you're building:
A simple HUD component with read-only state display.

### Why separate component:
- **UI separation:** Canvas logic vs. UI chrome
- **Reusability:** Toolbar pattern used in many apps
- **Fixed positioning:** Lives outside the world transform

### Technical concepts:
- **Fixed positioning:** Stays in place regardless of scroll/pan
- **Z-index:** Ensures it's above canvas elements
- **Props down:** Read-only display of parent state

### Implementation:

**Create file:** `src/components/Toolbar.jsx`

```javascript
import './Toolbar.css'

function Toolbar({ tool, zoom }) {
  return (
    <div className="toolbar">
      <div className="toolbar-item">
        <span className="label">Tool:</span>
        <span className="value">{tool === 'select' ? 'Select' : 'Rectangle'}</span>
      </div>
      <div className="toolbar-item">
        <span className="label">Zoom:</span>
        <span className="value">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  )
}

export default Toolbar
```

**Create file:** `src/components/Toolbar.css`

```css
.toolbar {
  position: fixed;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  gap: 24px;
  font-size: 14px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.toolbar-item {
  display: flex;
  gap: 8px;
}

.label {
  color: #888;
}

.value {
  font-weight: 600;
}
```

**Use in App.jsx:**
```javascript
import Toolbar from './components/Toolbar'

return (
  <>
    <Toolbar tool={tool} zoom={camera.zoom} />
    <div className="viewport">
      {/* ... */}
    </div>
  </>
)
```

### Verification:
- Toolbar appears top-left
- Shows "Select" by default
- Press 'R' → shows "Rectangle"
- Zoom in/out → percentage updates
- Stays fixed when panning

---

## Step 13: Final Polish
**Goal:** Fix edge cases and improve UX.

### What you're polishing:
1. **Body styles:** Prevent accidental scrolling
2. **User selection:** Prevent text selection during drag
3. **Touch support:** (Optional) Add touch event handlers
4. **Error states:** Show user feedback on failures

### Technical details:

**index.css additions:**
```css
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

* {
  user-select: none; /* Prevent text selection during drag */
}

input, textarea {
  user-select: text; /* Re-enable for inputs */
}
```

**Loading states:**
```jsx
{loading && (
  <div className="loading-overlay">
    <div className="spinner"></div>
    <p>Loading canvas...</p>
  </div>
)}
```

**Error toasts:**
```javascript
const [error, setError] = useState(null)

// In error cases:
setError('Failed to upload file')
setTimeout(() => setError(null), 3000)

// Render:
{error && (
  <div className="error-toast">{error}</div>
)}
```

**Performance optimization:**
```javascript
// Debounce drag updates to DB
const debouncedUpdate = useCallback(
  debounce((id, x, y) => {
    supabase.from('items').update({ x, y }).eq('id', id)
  }, 500),
  []
)
```

### Final verification checklist:
- [ ] No scroll bars appear
- [ ] Can't accidentally select text while dragging
- [ ] All interactions work smoothly
- [ ] Refresh → all data persists
- [ ] No console errors
- [ ] Works at different zoom levels
- [ ] Items don't disappear off-canvas

---

## Bonus: Understanding the Math

### Coordinate Transformation Deep Dive

**The fundamental equation:**
```
screenX = (worldX - cameraX) * zoom + viewportCenterX
```

**Inverting it:**
```
worldX = (screenX - viewportCenterX) / zoom + cameraX
```

**Why?**
- `(worldX - cameraX)` = position relative to camera
- `* zoom` = scale it
- `+ viewportCenterX` = center it on screen

**Example:**
- Camera at world (100, 100), zoom 2x
- Item at world (150, 150)
- Relative position: (150-100, 150-100) = (50, 50)
- Scaled: (50*2, 50*2) = (100, 100)
- Centered: (100 + 960, 100 + 540) = (1060, 640) on a 1920x1080 screen

This is the core concept powering the entire infinite canvas!

---

## Next Steps After Completion

1. **Add authentication:** Supabase Auth for user accounts
2. **Real-time collaboration:** Supabase Realtime for multiplayer
3. **Undo/redo:** Command pattern with history stack
4. **Keyboard shortcuts:** More tools (text, shapes, etc.)
5. **Export:** Save canvas as image/JSON
6. **Search:** Find items by name/content
7. **Layers:** Z-index control, grouping
8. **Mobile support:** Touch gestures for pan/zoom

Happy building! 🚀
