import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, ArrowUp, ArrowLeft } from 'lucide-react';

const ChatWindow = ({ isOpen, onClose, pageText, initialQuestion = '' }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize with welcome message or handle initial question
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      if (initialQuestion) {
        // If there's an initial question, add it as user message and get AI response
        const userMessage = {
          id: Date.now(),
          type: 'user',
          content: initialQuestion,
          timestamp: new Date()
        };
        
        setMessages([userMessage]);
        handleSendMessage(initialQuestion);
      } else {
        // Normal welcome message
        setMessages([
          {
            id: Date.now(),
            type: 'bot',
            content: "Hi! I'm your AI assistant. I can help you understand this webpage, answer questions about its content, or provide summaries. What would you like to know?",
            timestamp: new Date()
          }
        ]);
      }
    }
  }, [isOpen, messages.length, initialQuestion]);

  const handleSendMessage = async (messageText = null) => {
    const message = messageText || inputValue.trim();
    if (!message || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInputValue(''); // Only clear input if not using messageText
    setIsLoading(true);

    try {
      // Send message to background script for AI processing
      chrome.runtime.sendMessage({
        action: 'askQuestion',
        query: message,
        pageText: pageText
      }, (response) => {
        setIsLoading(false);
        
        if (response && response.success) {
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: response.text,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
        } else {
          const errorMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: `Sorry, I encountered an error: ${response?.error || 'Unknown error'}. Please try again.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      });
    } catch (error) {
      setIsLoading(false);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm pr-4">
      <div className="relative w-[350px] h-[450px] bg-[#0a0f1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Animated gradient blobs */}
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-[60%] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-40 blur-xl animate-pulse" />
        <div className="absolute top-20 -right-16 w-40 h-40 rounded-[70%] bg-gradient-to-bl from-pink-500 via-purple-600 to-blue-600 opacity-30 blur-xl animate-pulse delay-1000" />
        <div className="absolute bottom-10 left-1/4 w-36 h-36 rounded-[65%] bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-400 opacity-25 blur-xl animate-pulse delay-500" />
        <div className="absolute -bottom-16 -right-10 w-48 h-48 rounded-[75%] bg-gradient-to-tl from-purple-500 via-blue-500 to-pink-600 opacity-35 blur-xl animate-pulse delay-700" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Assistant</h2>
              <p className="text-xs text-white/60">Ask me anything about this page</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-3 px-6 py-3 text-base font-bold bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-500 hover:to-red-600 text-white border-2 border-red-400/50 hover:border-red-300 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            EXIT CHAT
          </button>
        </div>

        {/* Messages */}
        <div 
          className="relative z-10 flex-1 overflow-y-auto p-4 pt-12 space-y-4 bg-gradient-to-b from-transparent to-black/20 min-h-0 chat-scroll"
          style={{
            scrollbarWidth: 'auto',
            scrollbarColor: 'rgba(255, 255, 255, 0.5) rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Extra spacing at top to prevent cutoff */}
          <div className="h-4"></div>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-3 max-w-[80%] ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-green-400 to-blue-500'
                      : 'bg-gradient-to-br from-blue-400 to-purple-500'
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`glass-reflection p-3 rounded-2xl backdrop-blur-xl ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-green-400/20 to-blue-500/20 border border-green-400/30'
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="glass-reflection p-3 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-white/60 text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="relative z-10 p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about this page..."
                className="glass-reflection w-full px-4 py-3 pr-12 bg-white/15 backdrop-blur-xl border border-white/20 text-white placeholder-white/50 text-sm rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                rows="1"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                inputValue.trim() && !isLoading
                  ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white hover:from-blue-500 hover:to-purple-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-white/50 text-xs mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
