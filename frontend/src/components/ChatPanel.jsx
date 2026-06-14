import { useState, useRef, useEffect } from "react";
import { SAMPLE_QUESTIONS } from "../config/site";
import "./ChatPanel.css";

function ChatPanel({ sessionId, fileName, onError }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendQuestion = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to get an answer.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.data.answer,
          sources: data.data.sources || [],
        },
      ]);
    } catch (err) {
      onError(err.message || "Something went wrong.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <section className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-header-text">
          <h2>Chat with your document</h2>
          <p>Every response is grounded in <strong>{fileName}</strong></p>
        </div>
        <div className="chat-header-badge">PDF-only answers</div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Start a conversation</h3>
            <p>Ask anything about your PDF. Pick a suggestion or type your own question.</p>
            <div className="sample-questions">
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} type="button" onClick={() => sendQuestion(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-row ${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === "user" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              )}
            </div>
            <div className={`chat-bubble ${msg.role}`}>
              <p>{msg.text}</p>
              {msg.sources && msg.sources.length > 0 && (
                <details className="sources">
                  <summary>View {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} from PDF</summary>
                  <ul>
                    {msg.sources.map((src, j) => (
                      <li key={j}>
                        <span className="source-meta">
                          Section {src.chunk} · {Math.round(src.score * 100)}% relevance
                        </span>
                        {src.excerpt}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-row assistant">
            <div className="chat-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="chat-bubble assistant typing">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrap">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here…"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send question">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}

export default ChatPanel;
