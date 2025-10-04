// Initial state variables
let currentColorFilter = 'none';
let currentDyslexiaFont = 'none';
let lineFocusActive = false;
let currentBackgroundColor = 'default';
let currentFontSize = 100;
let originalFontSizes = new Map();
let lineFocusDiv = null;
let mutationObserver = null;
let dyslexiaModeActive = false;

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

// --- Line Focus (Reading Ruler) ---

const toggleLineFocus = (active) => {
  lineFocusActive = active;
  if (active) {
    if (!lineFocusDiv) {
      lineFocusDiv = document.createElement("div");
      lineFocusDiv.id = "accessease-line-focus";
      Object.assign(lineFocusDiv.style, {
        position: "fixed",
        width: "100%",
        height: "2em",
        pointerEvents: "none",
        background: "rgba(255, 255, 0, 0.3)",
        transition: "top 0.1s ease",
        zIndex: "999999999"
      });
      document.body.appendChild(lineFocusDiv);

      document.addEventListener("mousemove", (e) => {
        if (lineFocusActive && lineFocusDiv) {
          lineFocusDiv.style.top = `${e.clientY - lineFocusDiv.offsetHeight / 2}px`;
        }
      });
    }
  } else {
    if (lineFocusDiv) {
      lineFocusDiv.remove();
      lineFocusDiv = null;
    }
  }
};

// --- Background & Contrast Adjustments ---

const getBackgroundContrastColors = (preset) => {
  switch (preset) {
    case 'lightyellow': return { bgColor: '#fff9c4', textColor: '#333333' };
    case 'softgray': return { bgColor: '#f5f5f5', textColor: '#333333' };
    case 'pastelblue': return { bgColor: '#e3f2fd', textColor: '#333333' };
    case 'beige': return { bgColor: '#f5f5dc', textColor: '#333333' };
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

// --- Initialization and Message Listener ---

const initializeSettings = () => {
  chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'lineFocus', 'backgroundColor', 'fontSize', 'dyslexiaMode'], (result) => {
    setColorFilter(result.colorFilter || 'none');
    setDyslexiaFont(result.dyslexiaFont || 'none');
    toggleLineFocus(result.lineFocus || false);
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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "SET_COLOR_FILTER":
      setColorFilter(request.value);
      break;
    case "SET_DYSLEXIA_FONT":
      setDyslexiaFont(request.value);
      break;
    case "TOGGLE_LINE_FOCUS":
      toggleLineFocus(request.value);
      break;
    case "SET_BACKGROUND_COLOR":
      setBackgroundColor(request.value);
      break;
    case "SET_FONT_SIZE":
      setFontSize(request.value);
      break;
    case "enableDyslexia":
      applyDyslexiaMode();
      chrome.storage.sync.set({ dyslexiaMode: true });
      break;
    case "disableDyslexia":
      removeDyslexiaMode();
      chrome.storage.sync.set({ dyslexiaMode: false });
      break;
    default:
      break;
  }
});

// Initialize settings when the content script loads
initializeSettings();