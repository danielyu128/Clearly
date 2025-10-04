import React, { useState, useEffect } from 'react';

const Popup = () => {
  const [colorFilter, setColorFilter] = useState('none');
  const [dyslexiaFont, setDyslexiaFont] = useState('none');
  const [dyslexiaSpacing, setDyslexiaSpacing] = useState(false);
  const [lineFocus, setLineFocus] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('default');
  const [ttsActive, setTtsActive] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'dyslexiaSpacing', 'lineFocus', 'backgroundColor', 'ttsActive'], (result) => {
      setColorFilter(result.colorFilter || 'none');
      setDyslexiaFont(result.dyslexiaFont || 'none');
      setDyslexiaSpacing(result.dyslexiaSpacing || false);
      setLineFocus(result.lineFocus || false);
      setBackgroundColor(result.backgroundColor || 'default');
      setTtsActive(result.ttsActive || false);
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

  const handleDyslexiaSpacingToggle = () => {
    const newState = !dyslexiaSpacing;
    setDyslexiaSpacing(newState);
    chrome.storage.sync.set({ dyslexiaSpacing: newState });
    sendMessageToContentScript("TOGGLE_DYSLEXIA_SPACING", newState);
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

  const handleTtsToggle = () => {
    const newState = !ttsActive;
    setTtsActive(newState);
    chrome.storage.sync.set({ ttsActive: newState });
    sendMessageToContentScript("TOGGLE_TTS", newState);
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

      <h4>Dyslexia Mode</h4>
      <select value={dyslexiaFont} onChange={handleDyslexiaFontChange}>
        <option value="none">Default Font</option>
        <option value="OpenDyslexic">OpenDyslexic</option>
        <option value="Lexend">Lexend</option>
        <option value="Arial">Arial</option>
      </select>
      <br />
      <button onClick={handleDyslexiaSpacingToggle}>
        {dyslexiaSpacing ? "Disable Spacing" : "Enable Spacing"}
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

      <h4>Text-to-Speech</h4>
      <button onClick={handleTtsToggle}>
        {ttsActive ? "Disable TTS" : "Enable TTS"}
      </button>
    </div>
  );
};

export default Popup;