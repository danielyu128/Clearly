🪞 Clearly

An AI-powered accessibility Chrome extension
Built with ❤️ at Hack The Valley 2025 by Daniel, Azfar, and Jose

🌟 Overview

Clearly is a Chrome extension designed to make the web more accessible, inclusive, and easier to understand.
It empowers users with visual impairments, dyslexia, ADHD, or other accessibility needs to browse any website with clarity and comfort.

Clearly combines AI-powered summarization and custom visual tools to help users focus on what truly matters — the content.

🚀 Inspiration

The web is full of information — but not everyone experiences it equally.
Our team was inspired by the everyday challenges people face when reading cluttered or complex web pages.
We wanted to create a single, universal tool that simplifies digital content and makes online reading more human-friendly.

🧠 What It Does

Clearly enhances web accessibility with a combination of intelligent and visual features:

✨ Core Features

AI Summarizer & Q&A – Powered by Google Gemini API, Clearly intelligently summarizes webpage content and answers user questions in a natural, flowing tone.

Reading Modes – Change between Night Mode, Reading Mode, and Calm Mode (blue-tinted) to match your environment and preferences.

Font & Contrast Tools – Adjust font size, contrast, and typeface (including dyslexia-friendly options).

Element Focus Mode – Highlight text and images with a soft silver aura while blurring out distractions around them.

Smart Line Focus – Helps readers track text line by line for better reading comprehension.

🏗️ How We Built It

Frontend:

React + Tailwind CSS for the popup UI

Dynamic UI components optimized for accessibility

Chrome Extension (Manifest V3):

Content scripts for injecting and modifying page styles

Background service worker for handling API calls

Secure messaging between popup and content scripts

AI Integration:

Google Gemini API for natural summarization and intelligent Q&A

Optimized prompt engineering for smoother, contextually aware responses

Accessibility & Design:

ARIA labels and screen reader compatibility

Keyboard navigation support

Custom color contrast and reading comfort settings

💪 Challenges We Ran Into

Cross-Website Consistency: Ensuring the extension worked seamlessly across diverse webpage structures (news sites, social media, dynamic content).

AI Tuning: Making Gemini’s responses feel natural and flowing while staying informative.

Performance: Balancing smooth UI transitions with fast API response times.

Element Detection: Refining focus mode to highlight only meaningful elements like text and images (not parent <div>s).

Accessibility Testing: Designing for inclusivity while maintaining simplicity.

🏆 Accomplishments We’re Proud Of

Built a fully functional Chrome extension in under 36 hours at Hack The Valley 2025

Successfully integrated AI to enhance accessibility

Created a visually appealing and accessible design

Developed a unique “Element Focus” system with silver aura highlights

Learned and implemented Chrome Extension Manifest V3 from scratch

📚 What We Learned

Deep understanding of Chrome Extension APIs and Manifest V3 architecture

How to integrate Google Gemini API for dynamic, generative tasks

Accessibility best practices (ARIA, color contrast, keyboard navigation)

Prompt engineering for natural, human-like AI responses

UI/UX design for neurodiverse and visually impaired users

🔮 What’s Next for Clearly

Add voice control and text-to-speech capabilities

Improve AI context awareness for complex sites (e.g., Google Docs, LinkedIn)

Introduce custom user profiles for persistent preferences

Expand to Firefox and Edge support

Open-source accessibility contributions for the community

⚙️ Tech Stack
Category	Technologies
Frontend	React, Tailwind CSS
Chrome Extension	Manifest V3, JavaScript
AI	Google Gemini API
Tools	HTML, CSS, Node.js
Design	Figma (UI Planning)
💬 Feedback

At Hack The Valley 2025, we explored Google Gemini for the first time. Its flexibility and contextual understanding made it ideal for accessibility use cases. The only challenge was tuning prompt phrasing to make responses sound natural and empathetic — but once configured, it worked beautifully.
