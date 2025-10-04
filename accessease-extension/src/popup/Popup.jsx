import React, { useState, useEffect } from 'react';

const Popup = () => {
  const [colorFilter, setColorFilter] = useState('none');
  const [dyslexiaFont, setDyslexiaFont] = useState('none');
  const [lineFocus, setLineFocus] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('default');
  const [fontSize, setFontSize] = useState(100);
  const [dyslexiaMode, setDyslexiaMode] = useState(false);

  // AI Assistant states
  const [aiResponse, setAiResponse] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('accessibility'); // 'accessibility' or 'ai'
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'lineFocus', 'backgroundColor', 'fontSize', 'dyslexiaMode'], (result) => {
      setColorFilter(result.colorFilter || 'none');
      setDyslexiaFont(result.dyslexiaFont || 'none');
      setLineFocus(result.lineFocus || false);
      setBackgroundColor(result.backgroundColor || 'default');
      setFontSize(result.fontSize || 100);
      setDyslexiaMode(result.dyslexiaMode || false);
    });
    
    // Check if API key is set (hide UI if config key is available)
    sendMessageToBackground("getApiKey", {}, (response) => {
      if (response && response.success) {
        setHasApiKey(response.hasApiKey);
        // Only show API key input if no key is available at all
        if (!response.hasApiKey) {
          setShowApiKeyInput(true);
        }
      }
    });
  }, []);

  // Robust messaging helper with content script injection
  const ensureContentScript = async (tabId) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: "EXT_PING" }, (res) => {
        if (!chrome.runtime.lastError && res && res.ok) {
          console.log("Content script already present");
          return resolve();
        }
        
        // Try injecting content script
        console.log("Content script not found, injecting...");
        chrome.scripting.executeScript({ 
          target: { tabId }, 
          files: ["content.js"] 
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to inject content script:", chrome.runtime.lastError.message || chrome.runtime.lastError);
            // Don't reject immediately, try to continue anyway
            console.log("Continuing without content script injection...");
            return resolve(); // Resolve instead of reject to allow fallback
          }
          
          // Give the script time to register its message handler
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { type: "EXT_PING" }, (res2) => {
              if (!chrome.runtime.lastError && res2 && res2.ok) {
                console.log("Content script injected successfully");
                resolve();
              } else {
                const errorMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : "No response after injecting content script";
                console.error("No response after injecting content script:", errorMsg);
                // Don't reject, just resolve to allow fallback
                console.log("Continuing without content script...");
                resolve();
              }
            });
          }, 200);
        });
      });
    });
  };

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) {
      alert("Please enter your Gemini API key");
      return;
    }
    
    await sendMessageToBackground("setApiKey", { apiKey: apiKey.trim() }, (response) => {
      if (response && response.success) {
        setHasApiKey(true);
        setShowApiKeyInput(false);
        setApiKey('');
        alert("API key saved successfully!");
      } else {
        alert("Failed to save API key. Please try again.");
      }
    });
  };

  const sendMessageToContentScript = async (action, value = null, callback = null) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.error("No active tab found");
        if (callback) callback({ success: false, error: "No active tab found" });
        return;
      }

      console.log("Attempting to ensure content script for tab:", tab.id, "URL:", tab.url);
      await ensureContentScript(tab.id);
      
      chrome.tabs.sendMessage(tab.id, { action, value }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("sendMessage failed:", chrome.runtime.lastError.message || chrome.runtime.lastError);
          if (callback) callback({ success: false, error: chrome.runtime.lastError.message || "Failed to send message" });
        } else {
          console.log("Message sent successfully:", response);
          if (callback) callback(response);
        }
      });
    } catch (err) {
      console.error("Could not ensure content script:", err.message || err);
      if (callback) callback({ success: false, error: err.message || "Failed to ensure content script" });
    }
  };

  // Direct communication with background script for AI requests
  const sendMessageToBackground = (action, data, callback) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Background message failed:", chrome.runtime.lastError.message);
        if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Background response:", response);
        if (callback) callback(response);
      }
    });
  };

  // AI Assistant functions
  const handleSummarizePage = async () => {
    if (isLoading) {
      console.log("Already processing, ignoring duplicate request");
      return;
    }
    
    setIsLoading(true);
    setAiResponse('');
    
    // Get page text from content script first
    await sendMessageToContentScript("GET_PAGE_TEXT", null, (pageResponse) => {
      if (pageResponse && pageResponse.success) {
        // Send to background script for AI processing
        sendMessageToBackground("summarizePage", { pageText: pageResponse.pageText }, (aiResponse) => {
          setIsLoading(false);
          if (aiResponse && aiResponse.success) {
            setAiResponse(aiResponse.text);
          } else {
            const errorMsg = aiResponse?.error || "Failed to summarize the page. Please try again.";
            setAiResponse(`Error: ${errorMsg}. Make sure you're on a webpage and try refreshing the page.`);
          }
        });
      } else {
        setIsLoading(false);
        setAiResponse("Error: Could not extract page text. Please make sure you're on a webpage.");
      }
    });
  };

  const handleAskQuestion = async () => {
    if (!userQuestion.trim() || isLoading) {
      console.log("Question empty or already processing, ignoring request");
      return;
    }
    
    setIsLoading(true);
    setAiResponse('');
    
    // Get page text from content script first
    await sendMessageToContentScript("GET_PAGE_TEXT", null, (pageResponse) => {
      if (pageResponse && pageResponse.success) {
        // Send to background script for AI processing
        sendMessageToBackground("askQuestion", { query: userQuestion, pageText: pageResponse.pageText }, (aiResponse) => {
          setIsLoading(false);
          if (aiResponse && aiResponse.success) {
            setAiResponse(aiResponse.text);
          } else {
            const errorMsg = aiResponse?.error || "Failed to get an answer. Please try again.";
            setAiResponse(`Error: ${errorMsg}. Make sure you're on a webpage and try refreshing the page.`);
          }
        });
      } else {
        setIsLoading(false);
        setAiResponse("Error: Could not extract page text. Please make sure you're on a webpage.");
      }
    });
  };

  const handleFindAndHighlight = async (searchTerm) => {
    await sendMessageToContentScript("FIND_AND_HIGHLIGHT", searchTerm, (response) => {
      if (response && response.success) {
        if (response.found) {
          setAiResponse(`Found and highlighted "${searchTerm}" on the page.`);
        } else {
          setAiResponse(`Could not find "${searchTerm}" on this page.`);
        }
      } else {
        setAiResponse(`Error finding "${searchTerm}": ${response?.error || "Unknown error"}`);
      }
    });
  };

  const handleColorFilterChange = async (e) => {
    const newFilter = e.target.value;
    setColorFilter(newFilter);
    chrome.storage.sync.set({ colorFilter: newFilter });
    await sendMessageToContentScript("SET_COLOR_FILTER", newFilter);
  };

  const handleDyslexiaFontChange = async (e) => {
    const newFont = e.target.value;
    setDyslexiaFont(newFont);
    chrome.storage.sync.set({ dyslexiaFont: newFont });
    await sendMessageToContentScript("SET_DYSLEXIA_FONT", newFont);
  };

  const handleLineFocusToggle = async () => {
    const newState = !lineFocus;
    setLineFocus(newState);
    chrome.storage.sync.set({ lineFocus: newState });
    await sendMessageToContentScript("TOGGLE_LINE_FOCUS", newState);
  };

  const handleBackgroundColorChange = async (e) => {
    const newColor = e.target.value;
    setBackgroundColor(newColor);
    chrome.storage.sync.set({ backgroundColor: newColor });
    await sendMessageToContentScript("SET_BACKGROUND_COLOR", newColor);
  };

  const handleFontSizeChange = async (e) => {
    const newSize = parseInt(e.target.value);
    if (!isNaN(newSize) && newSize >= 60 && newSize <= 140) {
      setFontSize(newSize);
      chrome.storage.sync.set({ fontSize: newSize });
      await sendMessageToContentScript("SET_FONT_SIZE", newSize);
    }
  };

  const handleFontSizeIncrease = async () => {
    const newSize = Math.min(fontSize + 1, 140);
    setFontSize(newSize);
    chrome.storage.sync.set({ fontSize: newSize });
    await sendMessageToContentScript("SET_FONT_SIZE", newSize);
  };

  const handleFontSizeDecrease = async () => {
    const newSize = Math.max(fontSize - 1, 60);
    setFontSize(newSize);
    chrome.storage.sync.set({ fontSize: newSize });
    await sendMessageToContentScript("SET_FONT_SIZE", newSize);
  };

  const handleDyslexiaModeToggle = async () => {
    const newState = !dyslexiaMode;
    setDyslexiaMode(newState);
    chrome.storage.sync.set({ dyslexiaMode: newState });
    await sendMessageToContentScript(newState ? "enableDyslexia" : "disableDyslexia");
  };

  return (
    <div style={{ width: '350px', padding: '15px' }}>
      <h3>AccessEase</h3>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', marginBottom: '15px', borderBottom: '1px solid #ccc' }}>
        <button
          onClick={() => setActiveTab('accessibility')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            backgroundColor: activeTab === 'accessibility' ? '#007bff' : '#f5f5f5',
            color: activeTab === 'accessibility' ? 'white' : 'black',
            cursor: 'pointer',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }}
        >
          Accessibility
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            backgroundColor: activeTab === 'ai' ? '#007bff' : '#f5f5f5',
            color: activeTab === 'ai' ? 'white' : 'black',
            cursor: 'pointer',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }}
        >
          AI Assistant
        </button>
      </div>

      {/* Accessibility Tab */}
      {activeTab === 'accessibility' && (
        <div>
          <h4>Accessibility Controls</h4>

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
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'ai' && (
        <div>
          <h4>AI Assistant</h4>
          
          {/* API Key Management */}
          {showApiKeyInput && (
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '4px' 
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6c757d' }}>
                🔑 Enter your Gemini API key to use AI features:
              </p>
              <input
                type="password"
                placeholder="Your Gemini API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <button
                onClick={handleSetApiKey}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Save API Key
              </button>
              <p style={{ margin: '8px 0 0 0', fontSize: '10px', color: '#6c757d' }}>
                Get your free API key at: <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
              </p>
            </div>
          )}
          
          
          {/* Quick Actions */}
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={handleSummarizePage}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Processing...' : '📄 Summarize Page'}
            </button>
          </div>
          
          {/* Question Input */}
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Ask a question about this page..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAskQuestion();
                }
              }}
            />
            <button
              onClick={handleAskQuestion}
              disabled={isLoading || !userQuestion.trim()}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading || !userQuestion.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !userQuestion.trim() ? 0.6 : 1
              }}
            >
              {isLoading ? 'Thinking...' : '🤖 Ask AI'}
            </button>
          </div>
          
          {/* AI Response */}
          {aiResponse && (
            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              <strong>AI Response:</strong>
              <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                {aiResponse}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Popup;