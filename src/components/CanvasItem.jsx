import './CanvasItem.css';

function CanvasItem({ item, zoom, onEditText }) {
  const handleClick = (e) => {
    e.stopPropagation();

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
