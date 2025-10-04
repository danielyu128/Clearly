// Initial state variables
let currentColorFilter = 'none';
let currentDyslexiaFont = 'none';
let dyslexiaSpacingActive = false;
let lineFocusActive = false;
let currentBackgroundColor = 'default';
let ttsActive = false;
let lineFocusDiv = null;
let mutationObserver = null;
let ttsUtterance = null;

// --- Utility Functions ---

const applyStylesToElement = (element) => {
  // Apply dyslexia font and spacing
  if (currentDyslexiaFont !== 'none') {
    element.style.fontFamily = `'${currentDyslexiaFont}', sans-serif`;
  } else {
    element.style.fontFamily = '';
  }

  if (dyslexiaSpacingActive) {
    element.style.letterSpacing = '0.1em';
    element.style.wordSpacing = '0.25em';
    element.style.lineHeight = '1.6';
  } else {
    element.style.letterSpacing = '';
    element.style.wordSpacing = '';
    element.style.lineHeight = '';
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
    'OpenDyslexic': 'https://fonts.googleapis.com/css2?family=Open+Dyslexic&display=swap',
    'Lexend': 'https://fonts.googleapis.com/css2?family=Lexend&display=swap',
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
  if (font === 'none' && !dyslexiaSpacingActive) {
    disableDyslexiaMode();
  } else {
    enableDyslexiaMode();
  }
};

const toggleDyslexiaSpacing = (active) => {
  dyslexiaSpacingActive = active;
  if (active || currentDyslexiaFont !== 'none') {
    enableDyslexiaMode();
  } else {
    disableDyslexiaMode();
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

// --- Text-to-Speech (TTS) ---

const toggleTTS = (active) => {
  ttsActive = active;
  if (active) {
    document.addEventListener("mouseup", handleMouseUpForTTS);
  } else {
    document.removeEventListener("mouseup", handleMouseUpForTTS);
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
  }
};

const handleMouseUpForTTS = () => {
  if (ttsActive) {
    const selected = window.getSelection().toString().trim();
    if (selected) {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      ttsUtterance = new SpeechSynthesisUtterance(selected);
      ttsUtterance.rate = 1.0;
      speechSynthesis.speak(ttsUtterance);
    }
  }
};

// --- Initialization and Message Listener ---

const initializeSettings = () => {
  chrome.storage.sync.get(['colorFilter', 'dyslexiaFont', 'dyslexiaSpacing', 'lineFocus', 'backgroundColor', 'ttsActive'], (result) => {
    setColorFilter(result.colorFilter || 'none');
    setDyslexiaFont(result.dyslexiaFont || 'none');
    toggleDyslexiaSpacing(result.dyslexiaSpacing || false);
    toggleLineFocus(result.lineFocus || false);
    setBackgroundColor(result.backgroundColor || 'default');
    toggleTTS(result.ttsActive || false);
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
    case "TOGGLE_DYSLEXIA_SPACING":
      toggleDyslexiaSpacing(request.value);
      break;
    case "TOGGLE_LINE_FOCUS":
      toggleLineFocus(request.value);
      break;
    case "SET_BACKGROUND_COLOR":
      setBackgroundColor(request.value);
      break;
    case "TOGGLE_TTS":
      toggleTTS(request.value);
      break;
    default:
      break;
  }
});

// Initialize settings when the content script loads
initializeSettings();