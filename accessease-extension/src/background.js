// AI Assistant functionality using Gemini API with automatic model detection
// API key should be set by the user in the extension settings
let GEMINI_API_KEY = null;

// List of possible model endpoints to try
const POSSIBLE_MODELS = [
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", 
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent",
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
];

// Cache for working model URL
let workingModelUrl = null;
let availableModels = [];

// Track active requests to prevent duplicates
const activeRequests = new Set();

// Function to get API key from storage
async function getApiKey() {
  if (GEMINI_API_KEY) {
    return GEMINI_API_KEY;
  }
  
  try {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    GEMINI_API_KEY = result.geminiApiKey;
    return GEMINI_API_KEY;
  } catch (error) {
    console.error('Failed to get API key from storage:', error);
    return null;
  }
}

// Function to set API key in storage
async function setApiKey(apiKey) {
  try {
    await chrome.storage.sync.set({ geminiApiKey: apiKey });
    GEMINI_API_KEY = apiKey;
    console.log('API key saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save API key:', error);
    return false;
  }
}

// Function to test API key and find working model
async function findWorkingModel() {
  if (workingModelUrl) {
    return workingModelUrl;
  }

  console.log("🔍 Testing API key and finding working model...");
  
  // Get API key from storage
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("No API key found. Please set your Gemini API key in the extension settings.");
  }
  
  // First, test API key with models list
  try {
    const modelsUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    console.log("Testing API key with models list...");
    
    const response = await fetch(modelsUrl);
    if (response.ok) {
      const data = await response.json();
      availableModels = data.models || [];
      console.log("✅ API key is valid! Available models:");
      availableModels.forEach(model => {
        console.log(`  - ${model.name} (${model.displayName || 'No display name'})`);
      });
      
      // Try to find a working model from the available models
      for (const model of availableModels) {
        if (model.name && model.name.includes('gemini') && !model.name.includes('embedding')) {
          // Fix: model.name is already "models/gemini-2.5-flash", so we need to construct the URL correctly
          const modelUrl = `https://generativelanguage.googleapis.com/v1/${model.name}:generateContent`;
          console.log(`🧪 Testing available model: ${modelUrl}`);
          
          try {
            const testUrl = `${modelUrl}?key=${apiKey}`;
            const testResponse = await fetch(testUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }],
                generationConfig: { maxOutputTokens: 10 }
              })
            });

            if (testResponse.ok) {
              console.log(`✅ Found working model from API list: ${modelUrl}`);
              workingModelUrl = modelUrl;
              return workingModelUrl;
            } else {
              const errorText = await testResponse.text();
              console.log(`❌ Available model failed: ${testResponse.status} - ${errorText.substring(0, 100)}...`);
            }
          } catch (error) {
            console.log(`❌ Available model error: ${error.message}`);
          }
        }
      }
    } else {
      console.error("❌ API key test failed:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Failed to test API key:", error);
  }

  // If no model from API list worked, try our predefined list
  console.log("🔄 Trying predefined model list...");
  for (const modelUrl of POSSIBLE_MODELS) {
    try {
      console.log(`🧪 Testing predefined model: ${modelUrl}`);
      
      const testUrl = `${modelUrl}?key=${apiKey}`;
      const response = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (response.ok) {
        console.log(`✅ Found working predefined model: ${modelUrl}`);
        workingModelUrl = modelUrl;
        return workingModelUrl;
      } else {
        const errorText = await response.text();
        console.log(`❌ Predefined model failed: ${response.status} - ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ Predefined model error: ${error.message}`);
    }
  }

  throw new Error("No working Gemini model found. Please check your API key and try again.");
}

// Function to extract text from Gemini response
function extractTextFromResponse(data) {
  console.log("🔍 Parsing response data:", JSON.stringify(data, null, 2));
  
  // Check for truncated response
  if (data?.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    console.warn("⚠️ Response was truncated due to token limit");
  }
  
  // Try different possible response structures
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  
  // Alternative structure for newer models
  if (data?.candidates?.[0]?.text) {
    return data.candidates[0].text;
  }
  
  // Another possible structure
  if (data?.text) {
    return data.text;
  }
  
  // Check if there's any text in the response
  if (data?.candidates?.[0]) {
    const candidate = data.candidates[0];
    console.log("🔍 Candidate structure:", JSON.stringify(candidate, null, 2));
    
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          return part.text;
        }
      }
    }
    
    // Check if content exists but is empty
    if (candidate.content && !candidate.content.parts) {
      console.warn("⚠️ Content exists but no parts found");
      return "Response was generated but content is empty. This might be due to content filtering or token limits.";
    }
  }
  
  console.error("❌ Could not extract text from response structure");
  return null;
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request.action, "from:", sender.tab?.id);
  
  // Handle async operations properly
  (async () => {
    try {
      if (request.action === "setApiKey") {
        // Handle API key setting
        const success = await setApiKey(request.apiKey);
        sendResponse({ success, message: success ? "API key saved successfully" : "Failed to save API key" });
      } else if (request.action === "getApiKey") {
        // Handle API key retrieval (for checking if it's set)
        const apiKey = await getApiKey();
        sendResponse({ success: true, hasApiKey: !!apiKey });
      } else if (request.action === "summarizePage" || request.action === "askQuestion") {
        // Create a unique request ID to prevent duplicates
        const requestId = `${request.action}_${sender.tab?.id || 'popup'}_${Date.now()}`;
        
        if (activeRequests.has(requestId)) {
          console.log("Duplicate request detected, ignoring:", requestId);
          sendResponse({ success: false, error: "Duplicate request" });
          return;
        }
        
        activeRequests.add(requestId);
        console.log("Processing AI request:", request.action, "ID:", requestId);
        
        // Get API key and find working model
        const apiKey = await getApiKey();
        if (!apiKey) {
          sendResponse({ success: false, error: "No API key found. Please set your Gemini API key in the extension settings." });
          return;
        }
        
        const apiUrl = await findWorkingModel();
        const fullUrl = `${apiUrl}?key=${apiKey}`;
        
        // Limit page text to avoid API limits (reduce from 50k to 10k for better performance)
        const pageText = request.pageText ? request.pageText.substring(0, 10000) : "";
        
        console.log("Making API request to working model:", fullUrl.substring(0, 100) + "...");
        
        // Create more accurate, structured prompts
        let prompt = "";
        if (request.action === "summarizePage") {
          prompt = `Analyze this webpage and provide a structured summary. Look for and extract specific information:

WEBPAGE CONTENT:
${pageText}

Please provide:
1. MAIN TOPIC: What is this article/page about? (1-2 sentences)
2. AUTHOR: Who wrote this? (if mentioned)
3. PUBLISH DATE: When was this published? (if mentioned)
4. KEY POINTS: What are the main points? (3-4 bullet points)
5. SOURCE: What website/publication is this from?

Be precise and only include information that is explicitly stated in the content. If information is not available, say "Not specified" rather than guessing.`;
        } else {
          // Enhanced Q&A with better context
          const question = request.query.toLowerCase();
          
          if (question.includes('author') || question.includes('writer') || question.includes('byline')) {
            prompt = `Find the AUTHOR information in this webpage content. Look for:
- Author names (byline, "by [name]", "written by", etc.)
- Journalist names
- Reporter names
- Editor names

WEBPAGE CONTENT:
${pageText}

Answer: Who is the author? If not found, say "Author not specified in the content."`;
          } else if (question.includes('date') || question.includes('published') || question.includes('when')) {
            prompt = `Find the PUBLISH DATE in this webpage content. Look for:
- Publication dates
- "Published on", "Posted on", "Updated on"
- Date stamps
- Timestamps

WEBPAGE CONTENT:
${pageText}

Answer: When was this published? If not found, say "Publication date not specified in the content."`;
          } else if (question.includes('title') || question.includes('headline')) {
            prompt = `Find the TITLE/HEADLINE of this webpage. Look for:
- Main heading (h1)
- Article title
- Page title

WEBPAGE CONTENT:
${pageText}

Answer: What is the title/headline?`;
          } else {
            prompt = `Answer this question about the webpage: "${request.query}"

WEBPAGE CONTENT:
${pageText}

Instructions:
- Be precise and factual
- Only use information explicitly stated in the content
- If the information is not available, say "This information is not specified in the content"
- Quote specific text when relevant`;
          }
        }
        
        const response = await fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048, // Increased from 1024
            }
          })
        });

        console.log("API response status:", response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log("API response data:", data);
        
        // Extract text using improved parsing
        const output = extractTextFromResponse(data);
        
        if (output) {
          console.log("AI response generated successfully, length:", output.length);
          console.log("AI response text:", output);
          sendResponse({ success: true, text: output });
        } else {
          console.error("Failed to extract text from response");
          sendResponse({ success: false, error: "Could not parse AI response - the response may have been truncated or filtered" });
        }
      } else {
        console.warn("Unknown message action:", request.action);
        sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({ 
        success: false, 
        error: error.message,
        text: "Sorry, I'm having trouble connecting to the AI service. Please try again later."
      });
    } finally {
      // Clean up request tracking
      if (request.action === "summarizePage" || request.action === "askQuestion") {
        const requestId = `${request.action}_${sender.tab?.id || 'popup'}_${Date.now()}`;
        activeRequests.delete(requestId);
      }
    }
  })();
  
  // Always return true for async responses to keep message channel open
  return true;
});