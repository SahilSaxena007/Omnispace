import { useState, useRef, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import Tutorial from "./components/Tutorial";
import CanvasItem from "./components/CanvasItem";

function App() {
  // Test Supabase connection
  console.log("Supabase client initialized:", supabase);

  // State
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingText, setEditingText] = useState(null); // { x, y, itemId, width, height } or null
  const [textValue, setTextValue] = useState('');
  const [textDimensions, setTextDimensions] = useState({ width: 200, height: 60 });

  // Refs (for values that don't need to trigger re-renders)
  const panStartRef = useRef(null); // { mouseX, mouseY, camX, camY }
  const spaceHeldRef = useRef(false);
  const viewportRef = useRef(null); // Reference to viewport DOM element
  const textInputRef = useRef(null); // Reference to text input for auto-focus

  // Keyboard listeners for spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture space if typing in text input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        spaceHeldRef.current = true;
      }
    };

    const handleKeyUp = (e) => {
      // Don't capture space if typing in text input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        spaceHeldRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup listeners when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty array = run once on mount

  // Load items from Supabase on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading items:', error);
        } else {
          setItems(data || []);
        }
      } catch (err) {
        console.error('Failed to load items:', err);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []); // Run once on mount

  // Mouse handlers for panning
  const handleMouseDown = (e) => {
    // Middle mouse (button 1) OR left mouse (button 0) + space held
    if (e.button === 1 || (e.button === 0 && spaceHeldRef.current)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        camX: camera.x,
        camY: camera.y
      };
    }
  };

  const handleMouseMove = (e) => {
    if (!isPanning || !panStartRef.current) return;

    // Calculate how far mouse moved in screen pixels
    const deltaX = e.clientX - panStartRef.current.mouseX;
    const deltaY = e.clientY - panStartRef.current.mouseY;

    // Convert screen delta to world delta (divide by zoom)
    // Subtract because dragging right should move world left
    setCamera({
      ...camera,
      x: panStartRef.current.camX - deltaX / camera.zoom,
      y: panStartRef.current.camY - deltaY / camera.zoom
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  // File drop handlers
  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'copy'; // Show copy cursor
  };

  const handleDrop = async (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      // Convert screen coordinates to world coordinates
      const rect = viewportRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x;
      const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y;

      // Upload file to Supabase Storage
      const filePath = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload file: ' + uploadError.message);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Create database record
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
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        alert('Failed to save file to database: ' + dbError.message);
        return;
      }

      // Add to local state
      setItems([...items, newItem]);
      console.log('File uploaded successfully:', file.name);

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Failed to upload file');
    }
  };

  // Wheel handler for zooming (centered on cursor)
  const handleWheel = (e) => {
    e.preventDefault(); // Prevent page scroll

    // Get mouse position relative to viewport
    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate world point under cursor BEFORE zoom
    const worldX = (mouseX - window.innerWidth / 2) / camera.zoom + camera.x;
    const worldY = (mouseY - window.innerHeight / 2) / camera.zoom + camera.y;

    // Calculate new zoom (0.9 = zoom out, 1.1 = zoom in)
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomDelta));

    // Adjust camera so the world point stays under the cursor
    const newCamX = worldX - (mouseX - window.innerWidth / 2) / newZoom;
    const newCamY = worldY - (mouseY - window.innerHeight / 2) / newZoom;

    setCamera({ x: newCamX, y: newCamY, zoom: newZoom });
  };

  // Attach wheel listener with passive: false (needed for preventDefault)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [camera]); // Re-attach when camera changes (needed for closure)

  // Auto-focus text input when editing starts
  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingText]);

  // Double-click handler for creating text notes
  const handleDoubleClick = (e) => {
    // Only create text if clicking on the world layer (not on existing items)
    if (e.target.classList.contains('world') || e.target.classList.contains('viewport')) {
      const rect = viewportRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x;
      const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y;

      setEditingText({ x: worldX, y: worldY });
      setTextValue('');
    }
  };

  // Handler for editing existing text notes
  const handleEditText = (item) => {
    setEditingText({
      x: item.x,
      y: item.y,
      itemId: item.id,
      width: item.width,
      height: item.height
    });
    setTextValue(item.content);
    setTextDimensions({ width: item.width, height: item.height });
  };

  // Save text note to database
  const saveTextNote = async () => {
    if (!textValue.trim() || !editingText) {
      setEditingText(null);
      setTextValue('');
      return;
    }

    try {
      // Get current textarea dimensions
      const currentWidth = textInputRef.current?.offsetWidth || textDimensions.width;
      const currentHeight = textInputRef.current?.offsetHeight || textDimensions.height;

      // Enforce max dimensions
      const maxWidth = 600;
      const maxHeight = 400;
      const finalWidth = Math.min(currentWidth, maxWidth);
      const finalHeight = Math.min(currentHeight, maxHeight);

      if (editingText.itemId) {
        // Updating existing item
        const { error } = await supabase
          .from('items')
          .update({
            content: textValue,
            width: finalWidth,
            height: finalHeight
          })
          .eq('id', editingText.itemId);

        if (error) {
          console.error('Error updating text note:', error);
          alert('Failed to update text note: ' + error.message);
          return;
        }

        // Update local state
        setItems(items.map(item =>
          item.id === editingText.itemId
            ? { ...item, content: textValue, width: finalWidth, height: finalHeight }
            : item
        ));
        console.log('Text note updated successfully');

      } else {
        // Creating new item
        const { data: newItem, error } = await supabase
          .from('items')
          .insert({
            type: 'text',
            x: editingText.x,
            y: editingText.y,
            width: finalWidth,
            height: finalHeight,
            content: textValue
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving text note:', error);
          alert('Failed to save text note: ' + error.message);
          return;
        }

        setItems([...items, newItem]);
        console.log('Text note created successfully');
      }

      setEditingText(null);
      setTextValue('');
      setTextDimensions({ width: 200, height: 60 }); // Reset to default

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Failed to save text note');
    }
  };

  // Handle keyboard input while editing text
  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter without Shift = Save
      e.preventDefault();
      saveTextNote();
    } else if (e.key === 'Escape') {
      // Escape = Cancel
      setEditingText(null);
      setTextValue('');
    }
    // Shift+Enter = Allow default (new line)
  };

  console.log("Camera:", camera);
  console.log("Items loaded:", items.length);

  // Calculate dot grid that moves with camera
  const dotSize = 30 * camera.zoom; // Dots scale with zoom
  const offsetX = ((-camera.x * camera.zoom + window.innerWidth / 2) % dotSize);
  const offsetY = ((-camera.y * camera.zoom + window.innerHeight / 2) % dotSize);

  return (
    <>
      <div
        ref={viewportRef}
        className={`viewport ${spaceHeldRef.current ? 'space-held' : ''} ${isPanning ? 'panning' : ''}`}
        style={{
          backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
          backgroundSize: `${dotSize}px ${dotSize}px`,
          backgroundPosition: `${offsetX}px ${offsetY}px`,
          cursor: isPanning ? 'grabbing' : (spaceHeldRef.current ? 'grab' : 'default')
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="world"
          style={{
            transform: `translate(${-camera.x * camera.zoom + window.innerWidth / 2}px, ${-camera.y * camera.zoom + window.innerHeight / 2}px) scale(${camera.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Loading indicator */}
          {loading && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: '18px',
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '20px 40px',
              borderRadius: '12px',
              border: '2px solid #4a9eff',
              zIndex: 100
            }}>
              Loading canvas...
            </div>
          )}

          {/* Render all items on the canvas */}
          {!loading && items.map(item => (
            <CanvasItem
              key={item.id}
              item={item}
              zoom={camera.zoom}
              onEditText={handleEditText}
            />
          ))}

          {/* Text input for creating/editing text notes */}
          {editingText && (
            <textarea
              ref={textInputRef}
              className="text-input"
              style={{
                position: 'absolute',
                left: editingText.x,
                top: editingText.y,
                width: textDimensions.width,
                height: textDimensions.height,
                minHeight: 60,
                maxWidth: 600,
                maxHeight: 400,
                padding: '8px',
                fontSize: '14px',
                border: '2px solid #4a9eff',
                borderRadius: '4px',
                background: '#2a2a2a',
                color: 'white',
                outline: 'none',
                zIndex: 1000,
                resize: 'both',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                boxSizing: 'border-box'
              }}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={saveTextNote}
              onKeyDown={handleTextKeyDown}
              placeholder="Type your note... (Shift+Enter for new line)"
            />
          )}
        </div>
      </div>

      {/* Tutorial/Help Overlay */}
      <Tutorial />
    </>
  );
}

export default App;
