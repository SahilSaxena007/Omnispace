import './Toolbar.css';

function Toolbar({ tool, zoom }) {
  const toolName = tool === 'rectangle' ? 'Rectangle' : 'Select';
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Tool:</span>
        <span className="toolbar-value tool-indicator">
          {tool === 'rectangle' ? '✏️' : '🖱️'} {toolName}
        </span>
      </div>
      <div className="toolbar-divider"></div>
      <div className="toolbar-section">
        <span className="toolbar-label">Zoom:</span>
        <span className="toolbar-value">{zoomPercent}%</span>
      </div>
    </div>
  );
}

export default Toolbar;
