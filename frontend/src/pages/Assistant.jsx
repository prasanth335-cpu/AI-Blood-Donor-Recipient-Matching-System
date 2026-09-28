import React, { useEffect, useState, useRef } from "react";
import { MessageSquareCode, Send, Cpu, Bot, User, CornerDownLeft, Sparkles } from "lucide-react";
import api from "../services/api";

const Assistant = () => {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "### Welcome to AegisPredict AI Assistant\n\nI am your industrial maintenance advisor. Choose an equipment context above or ask general questions such as *'Show factory status summary'* or *'How do I troubleshoot high vibration alerts?'* to get started.",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await api.get("/machines");
        setMachines(response.data);
      } catch (err) {
        console.error("Failed to load machines in assistant:", err);
      }
    };
    fetchMachines();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend = inputText) => {
    if (!textToSend.trim()) return;

    const userMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setSending(true);

    try {
      const response = await api.post("/assistant/chat", {
        message: textToSend,
        machine_id: selectedMachine || null
      });

      const botMessage = {
        sender: "bot",
        text: response.data.response,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ **System Communication Error**: Failed to fetch a diagnostic response from the expert advisor. Ensure the backend server is reachable.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // Convert markdown-style bold and bullet highlights to basic HTML representation securely
  const formatMessageText = (text) => {
    let formatted = text
      .replace(/### (.*)/g, "<h4 class='text-sm font-extrabold text-blue-400 mt-2 mb-1'>$1</h4>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code class='bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono text-xs text-red-400'>$1</code>")
      .replace(/- (.*)/g, "<li class='ml-4 list-disc text-xs my-0.5'>$1</li>")
      .replace(/\n/g, "<br />");
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col justify-between">
      {/* Title & Context Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500 fill-blue-500/10" />
            AI Maintenance Copilot
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Diagnose and resolve hardware anomalies</p>
        </div>

        {/* Machine Context Selector */}
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 text-xs focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-350"
          >
            <option value="">General AI Context</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name} (Context)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Message Feed view */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-y-auto space-y-4 min-h-0">
        {messages.map((msg, index) => {
          const isBot = msg.sender === "bot";
          return (
            <div
              key={index}
              className={`flex items-start gap-3 max-w-[85%] ${
                isBot ? "mr-auto text-left" : "ml-auto flex-row-reverse text-left"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg mt-0.5 flex-shrink-0 ${
                isBot ? "bg-blue-600/10 text-blue-500" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                isBot 
                  ? "bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/40 text-slate-700 dark:text-slate-300"
                  : "bg-blue-600 text-white shadow-md shadow-blue-500/10"
              }`}>
                {formatMessageText(msg.text)}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex items-start gap-3 max-w-[80%] mr-auto">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex-shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 text-slate-400 text-xs italic">
              AI Copilot is processing diagnostics...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Clickable quick prompts */}
      {messages.length === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            "Show factory status summary",
            "How do I troubleshoot high vibration alerts?",
            "What checkups are due for CNC Milling Center A?"
          ].map(p => (
            <button
              key={p}
              onClick={() => handleSendMessage(p)}
              className="p-3 text-left border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-500 hover:text-blue-500 dark:text-slate-400 transition"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input controls */}
      <div className="relative">
        <input
          type="text"
          placeholder="Ask AI Copilot for troubleshooting advice or diagnostic playbooks..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="w-full pl-6 pr-14 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 text-slate-800 dark:text-white"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || sending}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Assistant;
