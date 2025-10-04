let colorFilterActive = false;
let dyslexiaFontActive = false;
let focusModeActive = false;

const toggleColorFilter = () => {
  colorFilterActive = !colorFilterActive;
  if (colorFilterActive) {
    document.body.style.filter = "grayscale(100%) sepia(100%) hue-rotate(180deg)";
  } else {
    document.body.style.filter = "none";
  }
};

const toggleDyslexiaFont = () => {
  dyslexiaFontActive = !dyslexiaFontActive;
  if (dyslexiaFontActive) {
    document.body.style.fontFamily = "'OpenDyslexic', sans-serif";
    // Inject OpenDyslexic font if not already present
    if (!document.getElementById('opendyslexic-font')) {
      const link = document.createElement('link');
      link.id = 'opendyslexic-font';
      link.href = 'https://fonts.googleapis.com/css2?family=Open+Dyslexic&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  } else {
    document.body.style.fontFamily = ""; // Reset to default
  }
};

const toggleFocusMode = () => {
  focusModeActive = !focusModeActive;
  if (focusModeActive) {
    const style = document.createElement('style');
    style.id = 'focus-mode-style';
    style.textContent = `
      body > *:not(.focus-highlight) {
        opacity: 0.3;
      }
      *:hover {
        opacity: 1 !important;
        outline: 2px solid blue;
      }
    `;
    document.head.appendChild(style);
  } else {
    const style = document.getElementById('focus-mode-style');
    if (style) {
      style.remove();
    }
    document.body.style.opacity = ""; // Reset body opacity
    const hoveredElements = document.querySelectorAll('*:hover');
    hoveredElements.forEach(el => {
      el.style.outline = "";
    });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TOGGLE_COLOR_FILTER") {
    toggleColorFilter();
  } else if (request.action === "TOGGLE_DYSLEXIA_FONT") {
    toggleDyslexiaFont();
  } else if (request.action === "TOGGLE_FOCUS_MODE") {
    toggleFocusMode();
  }
});