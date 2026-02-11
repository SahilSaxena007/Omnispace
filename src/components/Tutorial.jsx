import { useState, useEffect } from 'react';
import './Tutorial.css';

function Tutorial() {
  const [isOpen, setIsOpen] = useState(true);
  const [hasAutoClosedOnce, setHasAutoClosedOnce] = useState(false);

  // Auto-close after 10 seconds on first load
  useEffect(() => {
    if (!hasAutoClosedOnce) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasAutoClosedOnce(true);
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [hasAutoClosedOnce]);

  const toggleTutorial = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Help button (shows when tutorial is closed) */}
      {!isOpen && (
        <button className="tutorial-button" onClick={toggleTutorial}>
          <span className="help-icon">?</span>
          <span className="help-text">Controls</span>
        </button>
      )}

      {/* Tutorial overlay (shows when open) */}
      {isOpen && (
        <div className="tutorial-overlay">
          <div className="tutorial-header">
            <h2>🎮 Controls</h2>
            <button className="tutorial-close" onClick={toggleTutorial}>
              ✕
            </button>
          </div>

          <div className="tutorial-content">
            <div className="tutorial-section">
              <h3>🖱️ Navigation</h3>
              <div className="control-item">
                <kbd>Middle Click</kbd>
                <span>or</span>
                <kbd>Space</kbd> + <kbd>Left Click</kbd>
                <span className="control-desc">Pan around the canvas</span>
              </div>
              <div className="control-item">
                <kbd>Scroll Wheel</kbd>
                <span className="control-desc">Zoom in/out (centered on cursor)</span>
              </div>
            </div>

            <div className="tutorial-section">
              <h3>✏️ Content Creation</h3>
              <div className="control-item">
                <kbd>Double Click</kbd>
                <span className="control-desc">Create text note</span>
              </div>
              <div className="control-item">
                <kbd>Drag & Drop File</kbd>
                <span className="control-desc">Upload files from desktop</span>
              </div>
              <div className="control-item">
                <kbd>Click & Drag Item</kbd>
                <span className="control-desc">Move items around</span>
              </div>
            </div>

            <div className="tutorial-section">
              <h3>📦 Coming Soon</h3>
              <div className="control-item disabled">
                <kbd>R</kbd>
                <span className="control-desc">Draw rectangle dividers</span>
              </div>
            </div>
          </div>

          {!hasAutoClosedOnce && (
            <div className="tutorial-footer">
              <span className="auto-close-hint">This panel will auto-close in a few seconds...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default Tutorial;
