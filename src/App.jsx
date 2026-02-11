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

  // Refs (for values that don't need to trigger re-renders)
  const panStartRef = useRef(null); // { mouseX, mouseY, camX, camY }
  const spaceHeldRef = useRef(false);
  const viewportRef = useRef(null); // Reference to viewport DOM element

  // Keyboard listeners for spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        spaceHeldRef.current = true;
      }
    };

    const handleKeyUp = (e) => {
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
            />
          ))}
        </div>
      </div>

      {/* Tutorial/Help Overlay */}
      <Tutorial />
    </>
  );
}

export default App;
