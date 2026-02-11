import { useRef } from 'react';
import './CanvasItem.css';

function CanvasItem({ item, zoom, onEditText, onDragStart }) {
  const mouseDownPosRef = useRef(null);

  const handleMouseDown = (e) => {
    // Only allow dragging for text and file items (not rectangles)
    if (item.type === 'text' || item.type === 'file') {
      e.stopPropagation(); // Prevent canvas panning

      // Record initial position to detect drag vs click
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      if (onDragStart) {
        onDragStart(item.id, e.clientX, e.clientY);
      }
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();

    // Check if this was a drag or a click
    if (mouseDownPosRef.current) {
      const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If mouse moved more than 5px, consider it a drag, not a click
      if (distance > 5) {
        mouseDownPosRef.current = null;
        return; // Don't trigger click actions
      }
    }

    mouseDownPosRef.current = null;

    // Only trigger click actions if it was a true click (not a drag)
    if (item.type === 'file') {
      window.open(item.content, '_blank');
    } else if (item.type === 'text' && onEditText) {
      // Trigger edit mode for text notes
      onEditText(item);
    }
  };

  return (
    <div
      className={`canvas-item canvas-item-${item.type}`}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* File card */}
      {item.type === 'file' && (
        <div className="file-card">
          <div className="file-icon">📄</div>
          <div className="file-name">{item.file_name}</div>
        </div>
      )}

      {/* Text note */}
      {item.type === 'text' && (
        <div className="text-note">
          {item.content}
        </div>
      )}

      {/* Rectangle border */}
      {item.type === 'rectangle' && (
        <div className="rectangle-border" />
      )}
    </div>
  );
}

export default CanvasItem;
