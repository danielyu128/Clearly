# 🪞 Clearly

**An AI-powered accessibility Chrome extension**  
Built with ❤️ at **Hack The Valley 2025** by Daniel, Azfar, and Jose

---

## 🌟 Overview

**Clearly** is a Chrome extension designed to make the web more accessible, inclusive, and easier to understand.  
It empowers users with **visual impairments, dyslexia, ADHD**, or other accessibility needs to browse any website with clarity and comfort.

Clearly combines **AI-powered summarization** and **custom visual tools** to help users focus on what truly matters — the content.

---

## 🚀 Inspiration

The web is full of information — but not everyone experiences it equally.  
Our team was inspired by the everyday challenges people face when reading cluttered or complex web pages.  

We wanted to create a single, universal tool that **simplifies digital content** and makes online reading more human-friendly.

---

## 🧠 What It Does

Clearly enhances web accessibility with a combination of intelligent and visual features:

### ✨ Core Features
- **AI Summarizer & Q&A** – Powered by **Google Gemini API**, Clearly intelligently summarizes webpage content and answers user questions in a natural, flowing tone.  
- **Reading Modes** – Switch between *Night Mode*, *Reading Mode*, and *Calm Mode* (blue-tinted) to match your environment and preferences.  
- **Font & Contrast Tools** – Adjust font size, contrast, and typeface (including **dyslexia-friendly** options).  
- **Element Focus Mode** – Highlight text and images with a soft **silver aura** while blurring out distractions.  
- **Smart Line Focus** – Helps readers track text line by line for improved comprehension.

---

## 🏗️ How We Built It

### 🖥️ Frontend
- **React + Tailwind CSS** for the popup UI  
- Dynamic UI components optimized for accessibility  

### 🧩 Chrome Extension (Manifest V3)
- Content scripts for injecting and modifying page styles  
- Background service worker for handling API calls  
- Secure messaging between popup and content scripts  

### 🧠 AI Integration
- **Google Gemini API** for natural summarization and intelligent Q&A  
- Custom prompt engineering for smoother, context-aware responses  

### ♿ Accessibility & Design
- ARIA labels and screen reader compatibility  
- Keyboard navigation support  
- Custom color contrast and reading comfort settings  

---

## 💪 Challenges We Ran Into
- Maintaining **cross-website consistency** across varied page structures (e.g. news, social, dynamic sites)  
- Tuning AI responses to feel **natural and empathetic**  
- Balancing **UI performance** with real-time API calls  
- Detecting meaningful elements for Focus Mode without visual clutter  
- Designing for **simplicity and inclusivity** simultaneously  

---

## 🏆 Accomplishments We’re Proud Of
- Built a fully functional Chrome extension in **under 36 hours** at Hack The Valley 2025  
- Successfully integrated **AI to enhance accessibility**  
- Created a **visually appealing, glassy UI**  
- Developed a unique **“Element Focus” system** with silver aura highlights  
- Learned and implemented **Manifest V3** from scratch  

---

## 📚 What We Learned
- In-depth understanding of **Chrome Extension APIs** and architecture  
- Integrating **Google Gemini API** for generative AI tasks  
- **Accessibility best practices** (ARIA, contrast, keyboard nav)  
- Effective **prompt engineering** for natural AI tone  
- Designing for **neurodiverse** and **visually impaired** users  

---

## 🔮 What’s Next for Clearly
- Add **voice control** and **text-to-speech** capabilities  
- Improve AI **context awareness** for complex web apps (e.g. Google Docs, LinkedIn)  
- Introduce **user profiles** for persistent preferences  
- Expand to **Firefox** and **Edge**  
- Contribute open-source tools to the **accessibility community**

---

## ⚙️ Tech Stack

| Category | Technologies |
|-----------|---------------|
| **Frontend** | React, Tailwind CSS |
| **Chrome Extension** | Manifest V3, JavaScript |
| **AI** | Google Gemini API |
| **Tools** | HTML, CSS, Node.js |
| **Design** | Figma |

---

## 💬 Feedback

At Hack The Valley 2025, we explored **Google Gemini** for the first time.  
Its flexibility and contextual understanding made it ideal for accessibility use cases.  

The biggest challenge was tuning prompt phrasing to sound natural and empathetic — but once configured, it worked beautifully.

---

## 🪄 Try It Yourself
*(Coming soon — stay tuned for our Chrome Web Store release!)*

---

**Clearly — Bringing clarity and inclusivity to every corner of the web.**

