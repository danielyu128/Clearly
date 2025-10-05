// AI Assistant functionality using Gemini API with automatic model detection
import { CONFIG } from './config.js';

// API key from config file (for demo) or user storage (for production)
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

// Function to get API key from config file or storage
async function getApiKey() {
  if (GEMINI_API_KEY) {
    return GEMINI_API_KEY;
  }
  
  // First try to use API key from config file (for demo purposes)
  if (CONFIG.GEMINI_API_KEY) {
    GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;
    console.log('Using API key from config file');
    return GEMINI_API_KEY;
  }
  
  // Fallback to user storage (for production)
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
  
  // Check for safety issues
  if (data?.candidates?.[0]?.finishReason === "SAFETY") {
    console.warn("⚠️ Response blocked due to safety filters");
    return "Response was blocked due to content safety filters. Please try rephrasing your request.";
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
        if (part.text && part.text.trim()) {
          return part.text;
        }
      }
    }
    
    // Check if content exists but is empty or has no text
    if (candidate.content) {
      if (!candidate.content.parts) {
        console.warn("⚠️ Content exists but no parts found");
      } else {
        console.warn("⚠️ Content parts exist but no text found");
        console.log("Parts:", candidate.content.parts);
      }
      
      // Try to provide a helpful response based on finish reason
      if (candidate.finishReason === "STOP") {
        return "The AI generated a response but no text content was found. This might be due to content filtering or an unexpected response format.";
      } else if (candidate.finishReason === "MAX_TOKENS") {
        return "The response was cut off due to length limits. Please try a shorter request.";
      } else if (candidate.finishReason === "SAFETY") {
        return "The response was blocked due to content safety filters. Please try rephrasing your request.";
      } else {
        return `Response generated but content is empty. Finish reason: ${candidate.finishReason || 'unknown'}`;
      }
    }
  }
  
  console.error("❌ Could not extract text from response structure");
  return "Unable to extract response from the AI. Please try again.";
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
        
        // Smart page type detection and adaptive prompting
        let prompt = "";
        if (request.action === "summarizePage") {
          // Clean and analyze the page text for type detection
          // Note: pageText should already be clean text from content script
          const rawText = pageText
            .replace(/\s+/g, " ")
            .replace(/(\n\s*){2,}/g, "\n")
            .trim()
            .slice(0, 8000);

          // Detect if it's a text-heavy article or structured page
          const wordCount = rawText.split(/\s+/).length;
          const sentences = rawText.split(/[.!?]/).filter(s => s.trim().length > 0);
          const avgSentenceLength = sentences.length > 0 ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length : 0;
          
          // Simple and reliable detection: default to article unless clearly structured
          // Only treat as structured page if it's extremely obvious (ads, iframes, very short content)
          const isStructuredPage = wordCount < 50 || 
                                 (wordCount < 100 && avgSentenceLength < 3) ||
                                 rawText.toLowerCase().includes('ad frame') ||
                                 rawText.toLowerCase().includes('advertisement') ||
                                 rawText.toLowerCase().includes('iframe') ||
                                 rawText.toLowerCase().includes('syndication') ||
                                 rawText.toLowerCase().includes('tpc.googlesyndication') ||
                                 rawText.toLowerCase().includes('tags.crwdcntrl') ||
                                 (rawText.length < 200 && !rawText.includes('.')); // Very short content with no sentences
          
          const finalIsArticleLike = !isStructuredPage;

          console.log(`Page analysis: ${wordCount} words, ${avgSentenceLength.toFixed(1)} avg sentence length`);
          console.log(`Structured page detected: ${isStructuredPage}`);
          console.log(`Final article detection: ${finalIsArticleLike}`);
          console.log(`Raw text preview: ${rawText.substring(0, 200)}...`);

          if (finalIsArticleLike) {
            // Enhanced article summarization with better structure
            prompt = `You are an accessibility assistant helping users quickly understand online articles.

Analyze this webpage and provide a structured summary. Look for and extract specific information:

WEBPAGE CONTENT:
${rawText}

Please provide:
1. MAIN TOPIC: What is this article/page about? (1-2 sentences)
2. AUTHOR: Who wrote this? (if mentioned, otherwise say "Not specified")
3. PUBLISH DATE: When was this published? (if mentioned, otherwise say "Not specified")
4. KEY POINTS: What are the main points? (3-4 bullet points)
5. SOURCE: What website/publication is this from?

ACCESSIBILITY REQUIREMENTS:
- Use natural, conversational language that's easy to understand
- Format dates in human-readable ways (e.g., "January 15, 2024" not "2024-01-15T00:00:00Z")
- Convert technical information into friendly, accessible language
- Write as if speaking to someone who needs clear, accessible information
- DO NOT use markdown formatting like **bold** or *italic* - use plain text only
- DO NOT use asterisks, underscores, or other formatting symbols
- For author and date, only include information that is explicitly stated
- For the main topic and key points, provide helpful analysis based on the content
- If specific information is not available, say "Not specified" rather than guessing`;
          } else {
            // Adaptive behavior for structured or dynamic pages
            prompt = `You are an accessibility assistant helping users understand the purpose and structure of a webpage.

The following content was extracted from a webpage that might not be an article (could be a dashboard, profile page, document editor, search page, etc.).

Please:
- Identify what kind of page it likely is (profile page, dashboard, document editor, search page, social media, etc.)
- Explain what the user might be seeing and what they can do here
- Mention key visible elements or functions (like buttons, tabs, forms, navigation) in a clear and natural way
- Keep the explanation smooth, natural, and friendly — avoid robotic phrasing
- Focus on the main purpose and functionality, not technical details
- Do NOT repeat HTML, code, or unrelated text
- DO NOT use markdown formatting like **bold** or *italic* - use plain text only
- DO NOT use asterisks, underscores, or other formatting symbols

Content:
${rawText}`;
          }
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
          } else           if (question.includes('date') || question.includes('published') || question.includes('when')) {
            prompt = `Find the PUBLISH DATE in this webpage content. Look for:
- Publication dates
- "Published on", "Posted on", "Updated on"
- Date stamps
- Timestamps

WEBPAGE CONTENT:
${pageText}

IMPORTANT: Format your response in a natural, human-readable way. If you find a date, convert it to a friendly format like "January 15, 2024" or "yesterday" or "last week" rather than technical timestamps. If not found, say "The publication date is not mentioned on this page."`;
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

IMPORTANT ACCESSIBILITY INSTRUCTIONS:
- Use natural, conversational language that's easy to understand
- Format dates in human-readable ways (e.g., "January 15, 2024" not "2024-01-15T00:00:00Z")
- Convert technical information into friendly, accessible language
- DO NOT use markdown formatting like **bold** or *italic* - use plain text only
- DO NOT use asterisks, underscores, or other formatting symbols
- Be helpful and provide the best answer you can based on the content
- For specific facts (like exact quotes, names, dates), only use information explicitly stated
- For general questions about topics or concepts, provide helpful analysis based on the content
- If specific information is not available, say "This information is not mentioned on this page"
- Write as if speaking to someone who needs clear, accessible information`;
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
              temperature: 0.8, // Higher for more natural, less robotic responses
              topK: 40,
              topP: 0.9, // Slightly lower for more focused responses
              maxOutputTokens: 2048, // Increased to prevent truncation
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