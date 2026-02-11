import './CanvasItem.css';

function CanvasItem({ item, zoom }) {
  const handleClick = (e) => {
    if (item.type === 'file') {
      e.stopPropagation();
      window.open(item.content, '_blank');
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
