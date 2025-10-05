import React, { useState, useEffect } from 'react';

const Popup = () => {
  const [colorFilter, setColorFilter] = useState('none');
  const [dyslexiaFont, setDyslexiaFont] = useState('none');
  const [elementFocusMode, setElementFocusMode] = useState(false);
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
    chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'elementFocusMode', 'backgroundColor', 'fontSize', 'dyslexiaMode'], (result) => {
      setColorFilter(result.colorFilter || 'none');
      setDyslexiaFont(result.dyslexiaFont || 'none');
      setElementFocusMode(result.elementFocusMode || false);
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

  const handleElementFocusToggle = async () => {
    const newState = !elementFocusMode;
    setElementFocusMode(newState);
    chrome.storage.sync.set({ elementFocusMode: newState });
    await sendMessageToContentScript("TOGGLE_ELEMENT_FOCUS", newState);
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
    <div className="relative w-[400px] h-[600px] overflow-hidden bg-[#0a0f1a] rounded-2xl">
      {/* Animated gradient blobs */}
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-[60%] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-40 blur-xl animate-pulse" />
      <div className="absolute top-20 -right-16 w-40 h-40 rounded-[70%] bg-gradient-to-bl from-pink-500 via-purple-600 to-blue-600 opacity-30 blur-xl animate-pulse delay-1000" />
      <div className="absolute bottom-10 left-1/4 w-36 h-36 rounded-[65%] bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-400 opacity-25 blur-xl animate-pulse delay-500" />
      <div className="absolute -bottom-16 -right-10 w-48 h-48 rounded-[75%] bg-gradient-to-tl from-purple-500 via-blue-500 to-pink-600 opacity-35 blur-xl animate-pulse delay-700" />

      {/* Main glassmorphic card */}
      <div className="relative z-10 m-4 p-4 rounded-xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-blue-500/20">
        {/* Header */}
        <h1 className="text-2xl font-bold text-white mb-4 tracking-tight">Clearly</h1>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'accessibility'
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                : "bg-white/5 text-white/70 hover:bg-white/10 backdrop-blur-sm"
            }`}
          >
            Accessibility
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'ai'
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                : "bg-white/5 text-white/70 hover:bg-white/10 backdrop-blur-sm"
            }`}
          >
            AI Assistant
          </button>
        </div>

        {/* Accessibility Controls */}
        {activeTab === 'accessibility' && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            <h2 className="text-lg font-bold text-white">Accessibility Controls</h2>

            {/* Color Blind Filters */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Color Blind Filters</h3>
              <select 
                value={colorFilter} 
                onChange={handleColorFilterChange}
                className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white text-sm py-2 rounded-lg hover:bg-white/15 transition-colors px-3"
              >
                <option value="none" className="text-white text-sm">Off</option>
                <option value="protanopia" className="text-white text-sm">Protanopia</option>
                <option value="deuteranopia" className="text-white text-sm">Deuteranopia</option>
                <option value="tritanopia" className="text-white text-sm">Tritanopia</option>
                <option value="monochromacy" className="text-white text-sm">Monochromacy</option>
              </select>
            </div>

            {/* Dyslexia-Friendly Fonts */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Dyslexia-Friendly Fonts</h3>
              <select 
                value={dyslexiaFont} 
                onChange={handleDyslexiaFontChange}
                className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white text-sm py-2 rounded-lg hover:bg-white/15 transition-colors px-3"
              >
                <option value="none" className="text-white text-sm">Default Font</option>
                <option value="OpenDyslexic" className="text-white text-sm">OpenDyslexic</option>
                <option value="Lexend" className="text-white text-sm">Lexend Deca</option>
                <option value="Atkinson" className="text-white text-sm">Atkinson Hyperlegible</option>
                <option value="Arial" className="text-white text-sm">Arial</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Font Size</h3>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleFontSizeDecrease}
                  className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white transition-all flex items-center justify-center"
                >
                  <span className="text-lg font-bold">-</span>
                </button>
                <div className="flex items-center justify-center min-w-[120px] h-8 px-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                  <span className="text-sm font-semibold text-white">{fontSize} %</span>
                </div>
                <button
                  onClick={handleFontSizeIncrease}
                  className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white transition-all flex items-center justify-center"
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
              <input
                type="range"
                min="60"
                max="140"
                value={fontSize}
                onChange={handleFontSizeChange}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((fontSize - 60) / (140 - 60)) * 100}%, rgba(255,255,255,0.1) ${((fontSize - 60) / (140 - 60)) * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>

            {/* Dyslexia Mode */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Dyslexia Mode</h3>
              <button
                onClick={handleDyslexiaModeToggle}
                className="w-full px-4 py-2 text-sm rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all shadow-lg hover:shadow-blue-500/30"
              >
                {dyslexiaMode ? "Disable Dyslexia Mode" : "Enable Dyslexia Mode"}
              </button>
            </div>

            {/* Element Focus */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Element Focus</h3>
              <button
                onClick={handleElementFocusToggle}
                className="w-full px-4 py-2 text-sm rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all shadow-lg hover:shadow-blue-500/30"
              >
                {elementFocusMode ? "Disable Element Focus" : "Enable Element Focus"}
              </button>
            </div>

            {/* Background & Contrast */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Background & Contrast</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleBackgroundColorChange({ target: { value: 'default' } })}
                  className={`py-2 px-3 text-xs rounded-lg transition-all shadow-lg font-semibold ${
                    backgroundColor === 'default'
                      ? "bg-blue-500 text-white shadow-blue-500/50"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                  }`}
                >
                  Default
                </button>
                <button
                  onClick={() => handleBackgroundColorChange({ target: { value: 'lightyellow' } })}
                  className={`py-2 px-3 text-xs rounded-lg transition-all shadow-lg font-semibold ${
                    backgroundColor === 'lightyellow'
                      ? "bg-blue-500 text-white shadow-blue-500/50"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                  }`}
                >
                  Hi-Contrast
                </button>
                <button
                  onClick={() => handleBackgroundColorChange({ target: { value: 'darkmode' } })}
                  className={`py-2 px-3 text-xs rounded-lg transition-all shadow-lg font-semibold ${
                    backgroundColor === 'darkmode'
                      ? "bg-blue-500 text-white shadow-blue-500/50"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                  }`}
                >
                  Dark Mode
                </button>
                <button
                  onClick={() => handleBackgroundColorChange({ target: { value: 'pastelblue' } })}
                  className={`py-2 px-3 text-xs rounded-lg transition-all shadow-lg font-semibold ${
                    backgroundColor === 'pastelblue'
                      ? "bg-blue-500 text-white shadow-blue-500/50"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                  }`}
                >
                  Calm
                </button>
                <button
                  onClick={() => handleBackgroundColorChange({ target: { value: 'beige' } })}
                  className={`py-2 px-3 text-xs rounded-lg transition-all shadow-lg font-semibold ${
                    backgroundColor === 'beige'
                      ? "bg-blue-500 text-white shadow-blue-500/50"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                  }`}
                >
                  Reading Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">AI Assistant</h2>
            
            {/* API Key Management */}
            {showApiKeyInput && (
              <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/20">
                <p className="text-white/70 text-sm mb-2">
                  🔑 Enter your Gemini API key to use AI features:
                </p>
                <input
                  type="password"
                  placeholder="Your Gemini API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-2 mb-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 text-sm"
                />
                <button
                  onClick={handleSetApiKey}
                  className="w-full py-2 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-sm shadow-lg shadow-blue-500/50"
                >
                  Save API Key
                </button>
                <p className="text-white/50 text-xs mt-2">
                  Get your free API key at: <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Google AI Studio</a>
                </p>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={handleSummarizePage}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold text-sm shadow-lg shadow-green-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : '📄 Summarize Page'}
              </button>
            </div>
            
            {/* Question Input */}
            <div className="space-y-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask a question about this page..."
                className="w-full p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAskQuestion();
                  }
                }}
              />
              <button
                onClick={handleAskQuestion}
                disabled={isLoading || !userQuestion.trim()}
                className="w-full py-2 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-sm shadow-lg shadow-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Thinking...' : '🤖 Ask AI'}
              </button>
            </div>
            
            {/* AI Response */}
            {aiResponse && (
              <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/20 max-h-40 overflow-y-auto">
                <strong className="text-white text-sm">AI Response:</strong>
                <div className="mt-2 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                  {aiResponse}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;