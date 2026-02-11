import { useEffect } from 'react';
import './ContextMenu.css';

function ContextMenu({ x, y, item, onClose, onRename, onDelete }) {
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.context-menu')) return;
      onClose();
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleRename = () => {
    onRename(item);
    onClose();
  };

  const handleDelete = () => {
    onDelete(item);
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000
      }}
    >
      <div className="context-menu-content">
        {(item.type === 'text' || item.type === 'rectangle') && (
          <button className="context-menu-item" onClick={handleRename}>
            <span className="context-menu-icon">✏️</span>
            Rename
          </button>
        )}
        <button className="context-menu-item delete" onClick={handleDelete}>
          <span className="context-menu-icon">🗑️</span>
          Delete
        </button>
      </div>
    </div>
  );
}

export default ContextMenu;
