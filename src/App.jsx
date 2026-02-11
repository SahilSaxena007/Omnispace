import { useState, useRef, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import Tutorial from "./components/Tutorial";
import CanvasItem from "./components/CanvasItem";
import ContextMenu from "./components/ContextMenu";
import ConfirmModal from "./components/ConfirmModal";
import Toolbar from "./components/Toolbar";

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
  const [editingRectangleTitle, setEditingRectangleTitle] = useState(null); // { itemId, x, y } or null
  const [rectangleTitleValue, setRectangleTitleValue] = useState('');
  const [draggingItem, setDraggingItem] = useState(null); // { id, startX, startY, originalX, originalY } or null
  const [tool, setTool] = useState('select'); // 'select' or 'rectangle'
  const [drawStart, setDrawStart] = useState(null); // { x, y } world coordinates
  const [drawCurrent, setDrawCurrent] = useState(null); // { x, y } world coordinates for preview
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item } or null
  const [resizingItem, setResizingItem] = useState(null); // { id, startX, startY, originalWidth, originalHeight, direction } or null
  const [confirmDelete, setConfirmDelete] = useState(null); // item to delete or null

  // Refs (for values that don't need to trigger re-renders)
  const panStartRef = useRef(null); // { mouseX, mouseY, camX, camY }
  const spaceHeldRef = useRef(false);
  const viewportRef = useRef(null); // Reference to viewport DOM element
  const textInputRef = useRef(null); // Reference to text input for auto-focus
  const rectangleTitleInputRef = useRef(null); // Reference to rectangle title input for auto-focus

  // Keyboard listeners for spacebar and tool shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture keys if typing in text input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        spaceHeldRef.current = true;
      }

      // 'R' key to activate rectangle tool
      if (e.key === 'r' || e.key === 'R') {
        setTool('rectangle');
      }

      // 'Escape' key to return to select tool
      if (e.key === 'Escape') {
        setTool('select');
        setDrawStart(null);
        setDrawCurrent(null);
      }
    };

    const handleKeyUp = (e) => {
      // Don't capture keys if typing in text input
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

  // Mouse handlers for panning and drawing
  const handleMouseDown = (e) => {
    // Rectangle drawing mode
    if (tool === 'rectangle' && e.button === 0) {
      const rect = viewportRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x;
      const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y;

      setDrawStart({ x: worldX, y: worldY });
      setDrawCurrent({ x: worldX, y: worldY });
      return;
    }

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
    // Update rectangle preview while drawing
    if (drawStart && tool === 'rectangle') {
      const rect = viewportRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldX = (screenX - window.innerWidth / 2) / camera.zoom + camera.x;
      const worldY = (screenY - window.innerHeight / 2) / camera.zoom + camera.y;

      setDrawCurrent({ x: worldX, y: worldY });
      return;
    }

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

  const handleMouseUp = async () => {
    // Complete rectangle drawing
    if (drawStart && drawCurrent && tool === 'rectangle') {
      // Calculate rectangle bounds
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);

      // Only create rectangle if it has some size (avoid accidental clicks)
      if (width > 10 && height > 10) {
        try {
          const { data: newItem, error } = await supabase
            .from('items')
            .insert({
              type: 'rectangle',
              x: x,
              y: y,
              width: width,
              height: height
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating rectangle:', error);
            alert('Failed to create rectangle: ' + error.message);
          } else {
            setItems([...items, newItem]);
            console.log('Rectangle created successfully');
          }
        } catch (err) {
          console.error('Unexpected error:', err);
          alert('Failed to create rectangle');
        }
      }

      // Reset drawing state and return to select tool
      setDrawStart(null);
      setDrawCurrent(null);
      setTool('select');
      return;
    }

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

  // Auto-focus rectangle title input when editing starts
  useEffect(() => {
    if (editingRectangleTitle && rectangleTitleInputRef.current) {
      rectangleTitleInputRef.current.focus();
      rectangleTitleInputRef.current.select();
    }
  }, [editingRectangleTitle]);

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

  // Handler for editing rectangle titles
  const handleEditRectangleTitle = (item) => {
    setEditingRectangleTitle({
      itemId: item.id,
      x: item.x,
      y: item.y - 24 // Position above the rectangle
    });
    setRectangleTitleValue(item.content || '');
  };

  // Context menu handler
  const handleContextMenu = (e, item) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item
    });
  };

  // Show delete confirmation modal
  const handleDeleteItem = (item) => {
    setConfirmDelete(item);
  };

  // Execute delete after confirmation
  const executeDelete = async (item) => {
    try {
      // If it's a file, delete from storage first
      if (item.type === 'file' && item.content) {
        const urlParts = item.content.split('/');
        const fileName = urlParts[urlParts.length - 1];

        const { error: storageError } = await supabase.storage
          .from('files')
          .remove([fileName]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item: ' + error.message);
        return;
      }

      // Remove from local state
      setItems(items.filter(i => i.id !== item.id));
      console.log('Item deleted successfully');

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Failed to delete item');
    } finally {
      setConfirmDelete(null);
    }
  };

  // Drag handlers for repositioning items
  const handleItemDragStart = (itemId, mouseX, mouseY) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setDraggingItem({
      id: itemId,
      startX: mouseX,
      startY: mouseY,
      originalX: item.x,
      originalY: item.y
    });
  };

  // Resize handlers
  const handleItemResizeStart = (itemId, mouseX, mouseY, direction) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setResizingItem({
      id: itemId,
      startX: mouseX,
      startY: mouseY,
      originalWidth: item.width,
      originalHeight: item.height,
      direction: direction
    });
  };

  const handleItemResizeMove = (e) => {
    if (!resizingItem) return;

    const deltaX = e.clientX - resizingItem.startX;
    const deltaY = e.clientY - resizingItem.startY;

    // Convert screen delta to world delta (divide by zoom)
    const worldDeltaX = deltaX / camera.zoom;
    const worldDeltaY = deltaY / camera.zoom;

    // Calculate new dimensions based on resize direction
    let newWidth = resizingItem.originalWidth;
    let newHeight = resizingItem.originalHeight;

    if (resizingItem.direction === 'se') {
      newWidth = Math.max(100, resizingItem.originalWidth + worldDeltaX);
      newHeight = Math.max(60, resizingItem.originalHeight + worldDeltaY);
    }

    // Update item dimensions in local state (immediate feedback)
    setItems(items.map(item =>
      item.id === resizingItem.id
        ? { ...item, width: newWidth, height: newHeight }
        : item
    ));
  };

  const handleItemResizeEnd = async () => {
    if (!resizingItem) return;

    const item = items.find(i => i.id === resizingItem.id);
    if (!item) return;

    // Save final dimensions to database
    try {
      const { error } = await supabase
        .from('items')
        .update({ width: item.width, height: item.height })
        .eq('id', resizingItem.id);

      if (error) {
        console.error('Error updating item dimensions:', error);
      } else {
        console.log('Item dimensions updated successfully');
      }
    } catch (err) {
      console.error('Failed to update dimensions:', err);
    }

    setResizingItem(null);
  };

  const handleItemDragMove = (e) => {
    if (!draggingItem) return;

    const deltaX = e.clientX - draggingItem.startX;
    const deltaY = e.clientY - draggingItem.startY;

    // Convert screen delta to world delta (divide by zoom)
    const worldDeltaX = deltaX / camera.zoom;
    const worldDeltaY = deltaY / camera.zoom;

    // Update item position in local state (immediate feedback)
    setItems(items.map(item =>
      item.id === draggingItem.id
        ? {
            ...item,
            x: draggingItem.originalX + worldDeltaX,
            y: draggingItem.originalY + worldDeltaY
          }
        : item
    ));
  };

  const handleItemDragEnd = async () => {
    if (!draggingItem) return;

    const item = items.find(i => i.id === draggingItem.id);
    if (!item) return;

    // Calculate how much the item moved
    const deltaX = item.x - draggingItem.originalX;
    const deltaY = item.y - draggingItem.originalY;

    // If this is a rectangle, find all items inside it and move them too
    let itemsToUpdate = [{ id: item.id, x: item.x, y: item.y }];

    if (item.type === 'rectangle') {
      // Find items inside the rectangle (using ORIGINAL rectangle position)
      const insideItems = items.filter(i => {
        if (i.id === item.id || i.type === 'rectangle') return false;

        // Check if item center is inside the original rectangle bounds
        const itemCenterX = i.x + (i.width || 0) / 2;
        const itemCenterY = i.y + (i.height || 0) / 2;

        const rectLeft = draggingItem.originalX;
        const rectRight = draggingItem.originalX + item.width;
        const rectTop = draggingItem.originalY;
        const rectBottom = draggingItem.originalY + item.height;

        return itemCenterX >= rectLeft && itemCenterX <= rectRight &&
               itemCenterY >= rectTop && itemCenterY <= rectBottom;
      });

      // Add these items to the update list with their new positions
      insideItems.forEach(insideItem => {
        const newX = insideItem.x + deltaX;
        const newY = insideItem.y + deltaY;
        itemsToUpdate.push({ id: insideItem.id, x: newX, y: newY });

        // Update local state immediately
        setItems(prevItems => prevItems.map(prevItem =>
          prevItem.id === insideItem.id
            ? { ...prevItem, x: newX, y: newY }
            : prevItem
        ));
      });
    }

    // Save all positions to database
    try {
      for (const updateItem of itemsToUpdate) {
        const { error } = await supabase
          .from('items')
          .update({ x: updateItem.x, y: updateItem.y })
          .eq('id', updateItem.id);

        if (error) {
          console.error('Error updating item position:', error);
        }
      }

      console.log(`Updated ${itemsToUpdate.length} item(s) successfully`);
    } catch (err) {
      console.error('Failed to update positions:', err);
    }

    setDraggingItem(null);
  };

  // Attach drag move/end listeners when dragging
  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('mousemove', handleItemDragMove);
      window.addEventListener('mouseup', handleItemDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleItemDragMove);
        window.removeEventListener('mouseup', handleItemDragEnd);
      };
    }
  }, [draggingItem, camera.zoom, items]);

  // Attach resize move/end listeners when resizing
  useEffect(() => {
    if (resizingItem) {
      window.addEventListener('mousemove', handleItemResizeMove);
      window.addEventListener('mouseup', handleItemResizeEnd);

      return () => {
        window.removeEventListener('mousemove', handleItemResizeMove);
        window.removeEventListener('mouseup', handleItemResizeEnd);
      };
    }
  }, [resizingItem, camera.zoom, items]);

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

  // Save rectangle title to database
  const saveRectangleTitle = async () => {
    if (!editingRectangleTitle) {
      return;
    }

    const title = rectangleTitleValue.trim();

    try {
      const { error } = await supabase
        .from('items')
        .update({ content: title || null })
        .eq('id', editingRectangleTitle.itemId);

      if (error) {
        console.error('Error updating rectangle title:', error);
        alert('Failed to update rectangle title: ' + error.message);
        return;
      }

      // Update local state
      setItems(items.map(item =>
        item.id === editingRectangleTitle.itemId
          ? { ...item, content: title || null }
          : item
      ));
      console.log('Rectangle title updated successfully');

      setEditingRectangleTitle(null);
      setRectangleTitleValue('');

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Failed to update rectangle title');
    }
  };

  // Handle keyboard input while editing rectangle title
  const handleRectangleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRectangleTitle();
    } else if (e.key === 'Escape') {
      setEditingRectangleTitle(null);
      setRectangleTitleValue('');
    }
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
        className={`viewport ${spaceHeldRef.current ? 'space-held' : ''} ${isPanning ? 'panning' : ''} ${tool === 'rectangle' ? 'rectangle-mode' : ''}`}
        style={{
          backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
          backgroundSize: `${dotSize}px ${dotSize}px`,
          backgroundPosition: `${offsetX}px ${offsetY}px`
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

          {/* Render all items on the canvas - rectangles first, then others on top */}
          {!loading && (
            <>
              {/* Render rectangles first (bottom layer) */}
              {items.filter(item => item.type === 'rectangle').map(item => (
                <CanvasItem
                  key={item.id}
                  item={item}
                  zoom={camera.zoom}
                  onEditText={handleEditText}
                  onDragStart={handleItemDragStart}
                  onEditRectangleTitle={handleEditRectangleTitle}
                  onContextMenu={handleContextMenu}
                  onResizeStart={handleItemResizeStart}
                />
              ))}

              {/* Render other items on top */}
              {items.filter(item => item.type !== 'rectangle').map(item => (
                <CanvasItem
                  key={item.id}
                  item={item}
                  zoom={camera.zoom}
                  onEditText={handleEditText}
                  onDragStart={handleItemDragStart}
                  onEditRectangleTitle={handleEditRectangleTitle}
                  onContextMenu={handleContextMenu}
                  onResizeStart={handleItemResizeStart}
                />
              ))}
            </>
          )}

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

          {/* Rectangle drawing preview */}
          {drawStart && drawCurrent && tool === 'rectangle' && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(drawStart.x, drawCurrent.x),
                top: Math.min(drawStart.y, drawCurrent.y),
                width: Math.abs(drawCurrent.x - drawStart.x),
                height: Math.abs(drawCurrent.y - drawStart.y),
                border: '2px dashed #4a9eff',
                pointerEvents: 'none',
                boxSizing: 'border-box'
              }}
            />
          )}

          {/* Rectangle title input */}
          {editingRectangleTitle && (
            <input
              ref={rectangleTitleInputRef}
              type="text"
              style={{
                position: 'absolute',
                left: editingRectangleTitle.x,
                top: editingRectangleTitle.y,
                padding: '4px 12px',
                fontSize: '14px',
                border: '2px solid #4a9eff',
                borderRadius: '4px',
                background: '#2a2a2a',
                color: 'white',
                outline: 'none',
                zIndex: 1000,
                fontWeight: 500,
                minWidth: '150px'
              }}
              value={rectangleTitleValue}
              onChange={(e) => setRectangleTitleValue(e.target.value)}
              onBlur={saveRectangleTitle}
              onKeyDown={handleRectangleTitleKeyDown}
              placeholder="Enter folder name..."
            />
          )}
        </div>
      </div>

      {/* Tutorial/Help Overlay */}
      <Tutorial />

      {/* Toolbar */}
      <Toolbar tool={tool} zoom={camera.zoom} />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onRename={(item) => {
            if (item.type === 'rectangle') {
              handleEditRectangleTitle(item);
            } else if (item.type === 'text') {
              handleEditText(item);
            }
          }}
          onDelete={handleDeleteItem}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Item"
          message={`Are you sure you want to delete this ${confirmDelete.type === 'rectangle' ? 'folder' : confirmDelete.type}? This action cannot be undone.`}
          onConfirm={() => executeDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

export default App;
