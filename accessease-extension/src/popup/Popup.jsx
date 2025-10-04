import React, { useState, useEffect } from 'react';

const Popup = () => {
  const [colorFilter, setColorFilter] = useState('none');
  const [dyslexiaFont, setDyslexiaFont] = useState('none');
  const [lineFocus, setLineFocus] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('default');
  const [fontSize, setFontSize] = useState(100);
  const [dyslexiaMode, setDyslexiaMode] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'lineFocus', 'backgroundColor', 'fontSize', 'dyslexiaMode'], (result) => {
      setColorFilter(result.colorFilter || 'none');
      setDyslexiaFont(result.dyslexiaFont || 'none');
      setLineFocus(result.lineFocus || false);
      setBackgroundColor(result.backgroundColor || 'default');
      setFontSize(result.fontSize || 100);
      setDyslexiaMode(result.dyslexiaMode || false);
    });
  }, []);

  const sendMessageToContentScript = (action, value = null) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action, value });
      }
    });
  };

  const handleColorFilterChange = (e) => {
    const newFilter = e.target.value;
    setColorFilter(newFilter);
    chrome.storage.sync.set({ colorFilter: newFilter });
    sendMessageToContentScript("SET_COLOR_FILTER", newFilter);
  };

  const handleDyslexiaFontChange = (e) => {
    const newFont = e.target.value;
    setDyslexiaFont(newFont);
    chrome.storage.sync.set({ dyslexiaFont: newFont });
    sendMessageToContentScript("SET_DYSLEXIA_FONT", newFont);
  };

  const handleLineFocusToggle = () => {
    const newState = !lineFocus;
    setLineFocus(newState);
    chrome.storage.sync.set({ lineFocus: newState });
    sendMessageToContentScript("TOGGLE_LINE_FOCUS", newState);
  };

  const handleBackgroundColorChange = (e) => {
    const newColor = e.target.value;
    setBackgroundColor(newColor);
    chrome.storage.sync.set({ backgroundColor: newColor });
    sendMessageToContentScript("SET_BACKGROUND_COLOR", newColor);
  };

  const handleFontSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    if (!isNaN(newSize) && newSize >= 60 && newSize <= 140) {
      setFontSize(newSize);
      chrome.storage.sync.set({ fontSize: newSize });
      sendMessageToContentScript("SET_FONT_SIZE", newSize);
    }
  };

  const handleFontSizeIncrease = () => {
    const newSize = Math.min(fontSize + 1, 140);
    setFontSize(newSize);
    chrome.storage.sync.set({ fontSize: newSize });
    sendMessageToContentScript("SET_FONT_SIZE", newSize);
  };

  const handleFontSizeDecrease = () => {
    const newSize = Math.max(fontSize - 1, 60);
    setFontSize(newSize);
    chrome.storage.sync.set({ fontSize: newSize });
    sendMessageToContentScript("SET_FONT_SIZE", newSize);
  };

  const handleDyslexiaModeToggle = () => {
    const newState = !dyslexiaMode;
    setDyslexiaMode(newState);
    chrome.storage.sync.set({ dyslexiaMode: newState });
    sendMessageToContentScript(newState ? "enableDyslexia" : "disableDyslexia");
  };

  return (
    <div style={{ width: '250px', padding: '15px' }}>
      <h3>AccessEase Controls</h3>

      <h4>Color Blind Filters</h4>
      <select value={colorFilter} onChange={handleColorFilterChange}>
        <option value="none">Off</option>
        <option value="protanopia">Protanopia (Red-Blind)</option>
        <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
        <option value="tritanopia">Tritanopia (Blue-Blind)</option>
        <option value="monochromacy">Monochromacy (No Color)</option>
      </select>
      <br /><br />

      <h4>Dyslexia-Friendly Fonts</h4>
      <select value={dyslexiaFont} onChange={handleDyslexiaFontChange}>
        <option value="none">Default Font</option>
        <option value="OpenDyslexic">OpenDyslexic</option>
        <option value="Lexend">Lexend Deca</option>
        <option value="Atkinson">Atkinson Hyperlegible</option>
        <option value="Arial">Arial</option>
      </select>
      <br /><br />

      <h4>Font Size</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        <button 
          onClick={handleFontSizeDecrease}
          style={{ 
            padding: '5px 10px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f5f5f5',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            min="60"
            max="140"
            value={fontSize}
            onChange={handleFontSizeChange}
            style={{ 
              width: '70px', 
              textAlign: 'right', 
              padding: '5px 20px 5px 5px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <span style={{ 
            position: 'absolute', 
            right: '8px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            fontSize: '14px',
            pointerEvents: 'none',
            color: '#666'
          }}>%</span>
        </div>
        <button 
          onClick={handleFontSizeIncrease}
          style={{ 
            padding: '5px 10px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f5f5f5',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
      <br />

      <h4>Dyslexia Mode</h4>
      <button onClick={handleDyslexiaModeToggle}>
        {dyslexiaMode ? "Disable Dyslexia Mode" : "Enable Dyslexia Mode"}
      </button>
      <br /><br />

      <h4>Line Focus</h4>
      <button onClick={handleLineFocusToggle}>
        {lineFocus ? "Disable Line Focus" : "Enable Line Focus"}
      </button>
      <br /><br />

      <h4>Background & Contrast</h4>
      <select value={backgroundColor} onChange={handleBackgroundColorChange}>
        <option value="default">Default (White)</option>
        <option value="lightyellow">Light Yellow</option>
        <option value="softgray">Soft Gray</option>
        <option value="pastelblue">Pastel Blue</option>
        <option value="beige">Beige</option>
      </select>
      <br /><br />

    </div>
  );
};

export default Popup;