import { useRef } from 'react';
import './CanvasItem.css';

function CanvasItem({ item, zoom, onEditText, onDragStart, onEditRectangleTitle, onContextMenu, onResizeStart }) {
  const mouseDownPosRef = useRef(null);
  const wasResizingRef = useRef(false);

  const handleMouseDown = (e) => {
    // Don't trigger drag if clicking on resize handle
    if (e.target.classList.contains('resize-handle')) {
      return;
    }

    // Allow dragging for text, file, and rectangle items
    if (item.type === 'text' || item.type === 'file' || item.type === 'rectangle') {
      e.stopPropagation(); // Prevent canvas panning

      // Record initial position to detect drag vs click
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      if (onDragStart) {
        onDragStart(item.id, e.clientX, e.clientY);
      }
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onContextMenu) {
      onContextMenu(e, item);
    }
  };

  const handleResizeMouseDown = (e, direction) => {
    e.stopPropagation();

    wasResizingRef.current = true;

    if (onResizeStart) {
      onResizeStart(item.id, e.clientX, e.clientY, direction);
    }

    // Reset flag after a short delay
    setTimeout(() => {
      wasResizingRef.current = false;
    }, 100);
  };

  const handleClick = (e) => {
    e.stopPropagation();

    // Don't trigger click if we were just resizing
    if (wasResizingRef.current) {
      return;
    }

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

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Double-click on rectangle to edit title
    if (item.type === 'rectangle' && onEditRectangleTitle) {
      onEditRectangleTitle(item);
    } else if (item.type === 'text' && onEditText) {
      // Double-click on text to edit
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
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* File card */}
      {item.type === 'file' && (
        <>
          <div className="file-card">
            <div className="file-icon">📄</div>
            <div className="file-name">{item.file_name}</div>
          </div>
          <div
            className="resize-handle resize-se"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
        </>
      )}

      {/* Text note */}
      {item.type === 'text' && (
        <div className="text-note">
          {item.content}
        </div>
      )}

      {/* Rectangle border with title */}
      {item.type === 'rectangle' && (
        <>
          <div className="rectangle-border" />
          <div className="rectangle-title">
            {item.content || 'Untitled'}
          </div>
          <div
            className="resize-handle resize-se"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
        </>
      )}
    </div>
  );
}

export default CanvasItem;
