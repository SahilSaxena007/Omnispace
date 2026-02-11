import { useState, useRef, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

function App() {
  // Test Supabase connection
  console.log("Supabase client initialized:", supabase);

  // State
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);

  // Refs (for values that don't need to trigger re-renders)
  const panStartRef = useRef(null); // { mouseX, mouseY, camX, camY }
  const spaceHeldRef = useRef(false);

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

  console.log("Camera:", camera);

  // Calculate dot grid that moves with camera
  const dotSize = 30 * camera.zoom; // Dots scale with zoom
  const offsetX = ((-camera.x * camera.zoom + window.innerWidth / 2) % dotSize);
  const offsetY = ((-camera.y * camera.zoom + window.innerHeight / 2) % dotSize);

  return (
    <div
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
        {/* Items will go here */}
      </div>
    </div>
  );
}

export default App;
