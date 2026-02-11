import { useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

function App() {
  // Test Supabase connection
  console.log("Supabase client initialized:", supabase);

  // State
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  // 4. FUNCTIONS (event handlers, helpers)
  const handleMouseMove = (e) => {
    // ...
  };

  console.log("Camera:", camera);

  // Calculate dot grid that moves with camera
  const dotSize = 30 * camera.zoom; // Dots scale with zoom
  const offsetX = ((-camera.x * camera.zoom + window.innerWidth / 2) % dotSize);
  const offsetY = ((-camera.y * camera.zoom + window.innerHeight / 2) % dotSize);

  return (
    <div
      className="viewport"
      style={{
        backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
        backgroundSize: `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`
      }}
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
