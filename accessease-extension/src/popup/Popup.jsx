import React from 'react';

const Popup = () => {
  const sendMessageToContentScript = (action) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action });
      }
    });
  };

  return (
    <div style={{ width: '200px', padding: '10px' }}>
      <h3>AccessEase Controls</h3>
      <button onClick={() => sendMessageToContentScript("TOGGLE_COLOR_FILTER")}>
        Toggle Color Blind Filter
      </button>
      <br /><br />
      <button onClick={() => sendMessageToContentScript("TOGGLE_DYSLEXIA_FONT")}>
        Toggle Dyslexia Font
      </button>
      <br /><br />
      <button onClick={() => sendMessageToContentScript("TOGGLE_FOCUS_MODE")}>
        Toggle Focus Mode
      </button>
    </div>
  );
};

export default Popup;