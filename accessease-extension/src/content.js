// Initial state variables
let currentColorFilter = 'none';
let currentDyslexiaFont = 'none';
let elementFocusModeActive = false;
let currentBackgroundColor = 'default';
let currentFontSize = 100;
let originalFontSizes = new Map();
let elementFocusOverlay = null;
let currentHighlightedElement = null;
let mutationObserver = null;
let dyslexiaModeActive = false;
let hoverThrottleTimeout = null;

// --- Utility Functions ---

const applyStylesToElement = (element) => {
  // Apply dyslexia-friendly fonts with enhanced readability
  if (currentDyslexiaFont !== 'none') {
    let fontFamily = '';
    switch (currentDyslexiaFont) {
      case 'OpenDyslexic':
        fontFamily = "'OpenDyslexic', sans-serif";
        break;
      case 'Lexend':
        fontFamily = "'Lexend Deca', sans-serif";
        break;
      case 'Atkinson':
        fontFamily = "'Atkinson Hyperlegible', sans-serif";
        break;
      case 'Arial':
        fontFamily = "Arial, sans-serif";
        break;
      default:
        fontFamily = `'${currentDyslexiaFont}', sans-serif`;
    }
    element.style.fontFamily = fontFamily;
    
    // Apply dyslexia-friendly spacing for better readability
    element.style.letterSpacing = '0.1em';
    element.style.wordSpacing = '0.15em';
    element.style.lineHeight = '1.6';
  } else {
    element.style.fontFamily = '';
    element.style.letterSpacing = '';
    element.style.wordSpacing = '';
    element.style.lineHeight = '';
  }

  // Apply font size scaling
  if (currentFontSize !== 100) {
    // Store original font size if not already stored
    if (!originalFontSizes.has(element)) {
      const computedStyle = window.getComputedStyle(element);
      const originalSize = computedStyle.fontSize;
      if (originalSize && originalSize !== '0px') {
        originalFontSizes.set(element, originalSize);
      }
    }
    
    // Apply scaling based on original size
    const originalSize = originalFontSizes.get(element);
    if (originalSize) {
      const baseSize = parseFloat(originalSize);
      element.style.fontSize = `${(baseSize * currentFontSize / 100)}px`;
    }
  } else {
    // Reset to original size
    const originalSize = originalFontSizes.get(element);
    if (originalSize) {
      element.style.fontSize = originalSize;
    } else {
      element.style.fontSize = '';
    }
  }

  // Apply background and contrast
  if (currentBackgroundColor !== 'default') {
    const { bgColor, textColor } = getBackgroundContrastColors(currentBackgroundColor);
    element.style.backgroundColor = bgColor;
    element.style.color = textColor;
  } else {
    element.style.backgroundColor = '';
    element.style.color = '';
  }
};

const applyStylesToAllElements = () => {
  document.querySelectorAll('body, body *').forEach(applyStylesToElement);
};

// --- Color Blindness Filters ---

const injectColorBlindnessFilters = () => {
  if (!document.getElementById('accessease-svg-filters')) {
    const svgFilters = document.createElement('div');
    svgFilters.id = 'accessease-svg-filters';
    svgFilters.style.display = 'none';
    svgFilters.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="display:none;">
        <filter id="protanopia">
          <feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="deuteranopia">
          <feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="tritanopia">
          <feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="monochromacy">
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"/>
        </filter>
      </svg>
    `;
    document.body.appendChild(svgFilters);
  }
};

const setColorFilter = (filterType) => {
  currentColorFilter = filterType;
  if (filterType === 'none') {
    document.documentElement.style.filter = 'none';
  } else {
    document.documentElement.style.filter = `url(#${filterType})`;
  }
};

// --- Dyslexia Mode ---

const injectDyslexiaFonts = () => {
  const fonts = {
    'OpenDyslexic': 'https://fonts.googleapis.com/css2?family=OpenDyslexic:wght@400;700&display=swap',
    'Lexend': 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;700&display=swap',
    'Atkinson': 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
    'Arial': null // Arial is a system font, no need to inject
  };

  for (const fontName in fonts) {
    if (fonts[fontName] && !document.getElementById(`accessease-font-${fontName}`)) {
      const link = document.createElement('link');
      link.id = `accessease-font-${fontName}`;
      link.href = fonts[fontName];
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }
};

const applyDyslexiaStyles = () => {
  applyStylesToAllElements();
};

const enableDyslexiaMode = () => {
  injectDyslexiaFonts();
  if (!mutationObserver) {
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              applyStylesToElement(node);
              node.querySelectorAll('*').forEach(applyStylesToElement);
            }
          });
        }
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }
  applyDyslexiaStyles();
};

const disableDyslexiaMode = () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  document.querySelectorAll('body, body *').forEach(element => {
    element.style.fontFamily = '';
    element.style.letterSpacing = '';
    element.style.wordSpacing = '';
    element.style.lineHeight = '';
  });
};

const setDyslexiaFont = (font) => {
  currentDyslexiaFont = font;
  if (font === 'none') {
    disableDyslexiaMode();
  } else {
    enableDyslexiaMode();
  }
};

// --- Element Focus (Advanced Hover Highlighting) ---

const toggleElementFocus = (active) => {
  elementFocusModeActive = active;
  
  if (active) {
    // Change cursor to pointer for the entire document
    document.body.style.cursor = "pointer";
    document.documentElement.style.cursor = "pointer";
    
    // Create overlay for dimming non-hovered elements
    if (!elementFocusOverlay) {
      elementFocusOverlay = document.createElement("div");
      elementFocusOverlay.id = "accessease-element-focus-overlay";
      Object.assign(elementFocusOverlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        zIndex: "999999998",
        transition: "opacity 0.2s ease"
      });
      document.body.appendChild(elementFocusOverlay);
    }

    // Add mouse move listener for hover detection
    document.addEventListener("mousemove", handleElementHover, { passive: true });
    document.addEventListener("mouseleave", clearElementHighlight, { passive: true });
    window.addEventListener("scroll", updateOverlayCutout, { passive: true });
    window.addEventListener("resize", updateOverlayCutout, { passive: true });
    
  } else {
    // Clean up when disabling
    clearElementHighlight();
    
    // Clear throttle timeout
    if (hoverThrottleTimeout) {
      clearTimeout(hoverThrottleTimeout);
      hoverThrottleTimeout = null;
    }
    
    // Restore normal cursor
    document.body.style.cursor = "";
    document.documentElement.style.cursor = "";
    
    if (elementFocusOverlay) {
      elementFocusOverlay.remove();
      elementFocusOverlay = null;
    }
    
    document.removeEventListener("mousemove", handleElementHover);
    document.removeEventListener("mouseleave", clearElementHighlight);
    window.removeEventListener("scroll", updateOverlayCutout);
    window.removeEventListener("resize", updateOverlayCutout);
  }
};

const handleElementHover = (e) => {
  if (!elementFocusModeActive) return;
  
  // Throttle hover events to prevent flickering
  if (hoverThrottleTimeout) {
    clearTimeout(hoverThrottleTimeout);
  }
  
  hoverThrottleTimeout = setTimeout(() => {
    // Get the element under the mouse cursor
    const element = document.elementFromPoint(e.clientX, e.clientY);
    
    if (!element || element === currentHighlightedElement) return;
    
    // Skip if hovering over our own overlay or extension elements
    if (element.id === "accessease-element-focus-overlay" || 
        element.closest("#accessease-element-focus-overlay")) {
      return;
    }
    
    // Clear previous highlight
    clearElementHighlight();
    
    // Find a suitable parent element to highlight (avoid highlighting tiny elements)
    const targetElement = findSuitableHighlightElement(element);
    
    if (targetElement) {
      highlightElement(targetElement);
    }
  }, 16); // ~60fps throttling
};

const findSuitableHighlightElement = (element) => {
  // Look for meaningful elements to highlight
  const meaningfulTags = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 
                         'nav', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                         'form', 'table', 'tr', 'td', 'th', 'button', 'a', 'span'];
  
  let current = element;
  let attempts = 0;
  const maxAttempts = 8; // Reduced to avoid going too far up the DOM
  
  while (current && current !== document.body && attempts < maxAttempts) {
    // Check if this element is suitable for highlighting
    if (meaningfulTags.includes(current.tagName.toLowerCase())) {
      const rect = current.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(current);
      
      // Only highlight elements that are reasonably sized and visible
      if (rect.width > 80 && rect.height > 30 && 
          computedStyle.display !== 'none' && 
          computedStyle.visibility !== 'hidden' &&
          computedStyle.opacity !== '0') {
        
        // Prefer elements that are not too nested (avoid very small nested elements)
        const parentRect = current.parentElement ? current.parentElement.getBoundingClientRect() : rect;
        const sizeRatio = (rect.width * rect.height) / (parentRect.width * parentRect.height);
        
        // If this element takes up a reasonable portion of its parent, it's good to highlight
        if (sizeRatio > 0.1 || attempts < 3) {
          return current;
        }
      }
    }
    current = current.parentElement;
    attempts++;
  }
  
  // Fallback to the original element if no suitable parent found
  return element;
};

const highlightElement = (element) => {
  currentHighlightedElement = element;
  
  // Add highlight styles to the element
  element.style.setProperty('box-shadow', '0 0 0 3px #007bff, 0 0 20px rgba(0, 123, 255, 0.5)', 'important');
  element.style.setProperty('position', 'relative', 'important');
  element.style.setProperty('z-index', '999999999', 'important');
  
  // Create a cutout in the overlay for this element
  createOverlayCutout(element);
};

const createOverlayCutout = (element) => {
  if (!elementFocusOverlay) return;
  
  const rect = element.getBoundingClientRect();
  
  // Ensure overlay is visible and properly positioned
  elementFocusOverlay.style.display = 'block';
  elementFocusOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  elementFocusOverlay.style.zIndex = '999999998';
  
  // Create a cutout that reveals the element (everything else gets dimmed)
  // We want to cover everything EXCEPT the highlighted element
  const clipPath = `polygon(
    0% 0%, 
    0% 100%, 
    ${rect.left}px 100%, 
    ${rect.left}px ${rect.top}px, 
    ${rect.right}px ${rect.top}px, 
    ${rect.right}px ${rect.bottom}px, 
    ${rect.left}px ${rect.bottom}px, 
    ${rect.left}px 100%, 
    100% 100%, 
    100% 0%
  )`;
  
  elementFocusOverlay.style.clipPath = clipPath;
  
  // Reset any fallback styles
  elementFocusOverlay.style.backgroundImage = 'none';
  elementFocusOverlay.style.backgroundSize = 'auto';
  elementFocusOverlay.style.backgroundPosition = 'auto';
  elementFocusOverlay.style.backgroundRepeat = 'auto';
};

const updateOverlayCutout = () => {
  if (currentHighlightedElement && elementFocusOverlay) {
    createOverlayCutout(currentHighlightedElement);
  }
};

const clearElementHighlight = () => {
  if (currentHighlightedElement) {
    // Remove highlight styles
    currentHighlightedElement.style.removeProperty('box-shadow');
    currentHighlightedElement.style.removeProperty('position');
    currentHighlightedElement.style.removeProperty('z-index');
    currentHighlightedElement = null;
  }
  
  // Hide overlay completely when no element is highlighted
  if (elementFocusOverlay) {
    elementFocusOverlay.style.display = 'none';
    elementFocusOverlay.style.clipPath = 'none';
    elementFocusOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    elementFocusOverlay.style.backgroundImage = 'none';
    elementFocusOverlay.style.backgroundSize = 'auto';
    elementFocusOverlay.style.backgroundPosition = 'auto';
    elementFocusOverlay.style.backgroundRepeat = 'auto';
  }
};

// --- Background & Contrast Adjustments ---

const getBackgroundContrastColors = (preset) => {
  switch (preset) {
    case 'lightyellow': return { bgColor: '#000000', textColor: '#ffffff' }; // Hi-Contrast
    case 'darkmode': return { bgColor: '#1a1a1a', textColor: '#e0e0e0' }; // Dark Mode
    case 'softgray': return { bgColor: '#f5f5f5', textColor: '#333333' };
    case 'pastelblue': return { bgColor: '#e3f2fd', textColor: '#333333' }; // Calm
    case 'beige': return { bgColor: '#f5f5dc', textColor: '#333333' }; // Reading Mode
    case 'default':
    default: return { bgColor: '', textColor: '' };
  }
};

const setBackgroundColor = (colorPreset) => {
  currentBackgroundColor = colorPreset;
  if (colorPreset === 'default') {
    document.querySelectorAll('body, body *').forEach(element => {
      element.style.backgroundColor = '';
      element.style.color = '';
    });
  } else {
    applyStylesToAllElements();
  }
};

// --- Font Size Scaling ---

const setFontSize = (size) => {
  currentFontSize = size;
  // Clear original font sizes when resetting to 100%
  if (size === 100) {
    originalFontSizes.clear();
  }
  applyStylesToAllElements();
};

// --- Dyslexia Mode ---

const applyDyslexiaMode = () => {
  dyslexiaModeActive = true;
  
  // Inject dyslexia-friendly fonts
  injectDyslexiaFonts();
  
  // Remove existing dyslexia styles if any
  const existingStyle = document.getElementById('accessease-dyslexia-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Create and inject dyslexia styles
  const style = document.createElement('style');
  style.id = 'accessease-dyslexia-styles';
  style.textContent = `
    body, body * {
      font-family: 'OpenDyslexic', 'Lexend Deca', 'Atkinson Hyperlegible', Arial, sans-serif !important;
      font-size: 18px !important;
      letter-spacing: 0.1em !important;
      line-height: 1.6em !important;
      text-align: left !important;
    }
    
    p, li, span, div {
      text-align: left !important;
      margin-bottom: 0.75em !important;
    }
    
    p:last-child, li:last-child, div:last-child {
      margin-bottom: 0 !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-family: 'OpenDyslexic', 'Lexend Deca', 'Atkinson Hyperlegible', Arial, sans-serif !important;
      font-size: 18px !important;
      letter-spacing: 0.1em !important;
      line-height: 1.6em !important;
      text-align: left !important;
    }
    
    /* Ensure minimum font size for better readability */
    * {
      font-size: max(18px, 1em) !important;
    }
  `;
  
  document.head.appendChild(style);
};

const removeDyslexiaMode = () => {
  dyslexiaModeActive = false;
  
  // Remove dyslexia styles
  const style = document.getElementById('accessease-dyslexia-styles');
  if (style) {
    style.remove();
  }
  
  // Remove injected fonts
  const fontNames = ['OpenDyslexic', 'Lexend', 'Atkinson'];
  fontNames.forEach(fontName => {
    const fontLink = document.getElementById(`accessease-font-${fontName}`);
    if (fontLink) {
      fontLink.remove();
    }
  });
};

// --- AI Assistant Functions ---

const extractPageText = () => {
  // Extract structured metadata first
  const metadata = extractStructuredMetadata();
  
  // Remove script and style elements
  const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside');
  elementsToRemove.forEach(el => el.remove());
  
  // Get main content areas
  const mainContent = document.querySelector('main') || document.querySelector('article') || document.querySelector('.content') || document.body;
  
  // Extract text content
  let text = mainContent.innerText || mainContent.textContent || '';
  
  // Clean up the text
  text = text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
  
  // Combine metadata with content for better AI analysis
  const structuredText = `PAGE METADATA:
Title: ${metadata.title}
Author: ${metadata.author}
Published Date: ${metadata.publishedDate}
Website: ${metadata.website}
URL: ${metadata.url}

MAIN CONTENT:
${text}`;
  
  // Limit text length to avoid API limits (approximately 100k characters)
  if (structuredText.length > 100000) {
    return structuredText.substring(0, 100000) + '...';
  }
  
  return structuredText;
};

const extractStructuredMetadata = () => {
  const metadata = {
    title: '',
    author: '',
    publishedDate: '',
    website: '',
    url: window.location.href
  };
  
  // Extract title
  metadata.title = document.title || 
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('[data-testid="headline"]')?.textContent?.trim() ||
    document.querySelector('.headline')?.textContent?.trim() ||
    'Not specified';
  
  // Extract author (look for common patterns)
  const authorSelectors = [
    '[data-testid="author"]',
    '.author',
    '.byline',
    '.writer',
    '[rel="author"]',
    '.article-author',
    '.post-author',
    '.entry-author',
    'meta[name="author"]',
    'meta[property="article:author"]'
  ];
  
  for (const selector of authorSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      metadata.author = element.textContent?.trim() || element.content || '';
      if (metadata.author) break;
    }
  }
  
  // If no author found, look for "by [name]" patterns in text
  if (!metadata.author) {
    const textContent = document.body.textContent || '';
    const bylineMatch = textContent.match(/(?:by|By|BY)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (bylineMatch) {
      metadata.author = bylineMatch[1];
    }
  }
  
  // Extract published date
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[name="publication_date"]',
    '.published-date',
    '.post-date',
    '.article-date',
    '.entry-date',
    '[data-testid="timestamp"]',
    'time[datetime]'
  ];
  
  for (const selector of dateSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      metadata.publishedDate = element.content || element.textContent?.trim() || element.getAttribute('datetime') || '';
      if (metadata.publishedDate) break;
    }
  }
  
  // Extract website name
  metadata.website = document.querySelector('meta[property="og:site_name"]')?.content ||
    document.querySelector('meta[name="application-name"]')?.content ||
    window.location.hostname ||
    'Not specified';
  
  // Clean up extracted data
  metadata.author = metadata.author || 'Not specified';
  metadata.publishedDate = metadata.publishedDate || 'Not specified';
  
  return metadata;
};

const findAndHighlightElement = (searchTerm) => {
  // Search for elements containing the search term
  const searchTerms = searchTerm.toLowerCase().split(' ');
  const allElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, span, a, button, li');
  
  for (const element of allElements) {
    const text = element.textContent.toLowerCase();
    if (searchTerms.some(term => text.includes(term))) {
      // Highlight the element
      element.style.backgroundColor = 'yellow';
      element.style.border = '2px solid orange';
      element.style.borderRadius = '4px';
      
      // Scroll to the element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove highlight after 5 seconds
      setTimeout(() => {
        element.style.backgroundColor = '';
        element.style.border = '';
        element.style.borderRadius = '';
      }, 5000);
      
      return true;
    }
  }
  return false;
};

const sendToAI = async (action, query = null) => {
  const pageText = extractPageText();
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: action,
      query: query,
      pageText: pageText
    }, (response) => {
      resolve(response);
    });
  });
};

// --- Initialization and Message Listener ---

const initializeSettings = () => {
  chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'elementFocusMode', 'backgroundColor', 'fontSize', 'dyslexiaMode'], (result) => {
    setColorFilter(result.colorFilter || 'none');
    setDyslexiaFont(result.dyslexiaFont || 'none');
    toggleElementFocus(result.elementFocusMode || false);
    setBackgroundColor(result.backgroundColor || 'default');
    setFontSize(result.fontSize || 100);
    
    // Initialize dyslexia mode
    if (result.dyslexiaMode) {
      applyDyslexiaMode();
    }
  });
  injectColorBlindnessFilters();
  injectDyslexiaFonts(); // Pre-inject fonts for faster loading
};

// Listen for messages from the popup and background
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  try {
    switch (request.type || request.action) {
      case "EXT_PING":
        // Ping handler for content script detection
        console.log("Content script ping received");
        sendResponse({ ok: true, timestamp: Date.now() });
        return false; // Synchronous response
      
      case "GET_PAGE_TEXT":
        // Extract and return page text
        try {
          console.log("Extracting page text...");
          const pageText = extractPageText();
          console.log("Page text extracted, length:", pageText.length);
          sendResponse({ success: true, pageText: pageText });
        } catch (error) {
          console.error("Page text extraction error:", error);
          sendResponse({ success: false, error: error.message });
        }
        return false; // Synchronous response
      
    case "SET_COLOR_FILTER":
      setColorFilter(request.value);
        sendResponse({ success: true });
        return false;
      
    case "SET_DYSLEXIA_FONT":
      setDyslexiaFont(request.value);
        sendResponse({ success: true });
        return false;
      
      case "TOGGLE_ELEMENT_FOCUS":
        toggleElementFocus(request.value);
        sendResponse({ success: true });
        return false;
      
    case "SET_BACKGROUND_COLOR":
      setBackgroundColor(request.value);
        sendResponse({ success: true });
        return false;
      
    case "SET_FONT_SIZE":
      setFontSize(request.value);
        sendResponse({ success: true });
        return false;
      
    case "enableDyslexia":
      applyDyslexiaMode();
      chrome.storage.sync.set({ dyslexiaMode: true });
        sendResponse({ success: true });
        return false;
      
    case "disableDyslexia":
      removeDyslexiaMode();
      chrome.storage.sync.set({ dyslexiaMode: false });
        sendResponse({ success: true });
        return false;
      
      case "SUMMARIZE_PAGE":
        try {
          console.log("Starting page summarization...");
          const response = await sendToAI("summarizePage");
          console.log("Summarization response:", response);
          sendResponse(response);
        } catch (error) {
          console.error("Summarization error:", error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // Keep message channel open for async response
      
      case "ASK_QUESTION":
        try {
          console.log("Processing question:", request.query);
          const response = await sendToAI("askQuestion", request.query);
          console.log("Question response:", response);
          sendResponse(response);
        } catch (error) {
          console.error("Question error:", error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // Keep message channel open for async response
      
      case "FIND_AND_HIGHLIGHT":
        try {
          console.log("Finding and highlighting:", request.searchTerm);
          const found = findAndHighlightElement(request.searchTerm);
          sendResponse({ success: true, found: found });
        } catch (error) {
          console.error("Find and highlight error:", error);
          sendResponse({ success: false, error: error.message });
        }
        return false; // Synchronous response
      
    default:
        console.warn("Unknown message type:", request.type || request.action);
        sendResponse({ success: false, error: "Unknown message type" });
        return false;
    }
  } catch (error) {
    console.error("Content script message handler error:", error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// Initialize settings when the content script loads
initializeSettings();