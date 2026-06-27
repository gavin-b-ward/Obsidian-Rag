import React, { useMemo, useRef, useState } from 'react';

const API_URL = 'http://localhost:8000/chat';

const starterMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Ask a question about your notes. I will send it to the backend chat endpoint and append the reply here.',
    sources: [],
  },
];

function App() {
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const nextId = useRef(1);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  async function handleSubmit(event) {
    event.preventDefault();
    const query = input.trim();

    if (!query || isLoading) {
      return;
    }

    const userMessage = {
      id: `user-${nextId.current++}`,
      role: 'user',
      text: query,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          top_k: 5,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload?.detail?.msg || payload?.error || 'Request failed');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${nextId.current++}`,
          role: 'assistant',
          text: payload.answer || 'No response returned.',
          sources: payload.sources || [],
        },
      ]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unknown error';
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${nextId.current++}`,
          role: 'assistant',
          text: 'I could not reach the backend chat endpoint.',
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Obsidian RAG</div>
        <div className="sidebar-note">Current vault is assumed to already be configured.</div>
      </aside>

      <main className="chat-layout">
        <header className="chat-header">
          <h1>Notes Chat</h1>
          <p>Super basic chat UI for asking questions against your indexed vault.</p>
        </header>

        <section className="messages" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`message-row ${message.role}`}>
              <div className="avatar">{message.role === 'user' ? 'U' : 'AI'}</div>
              <div className="message-card">
                <p>{message.text}</p>
                {message.role === 'assistant' && message.sources?.length > 0 ? (
                  <div className="sources">
                    {message.sources.slice(0, 3).map((source, index) => (
                      <span key={`${message.id}-source-${index}`} className="source-pill">
                        {source.file_name || source.file_path || 'Unknown source'}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}

          {isLoading ? (
            <article className="message-row assistant">
              <div className="avatar">AI</div>
              <div className="message-card typing">Thinking...</div>
            </article>
          ) : null}
        </section>

        <form className="composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="chat-input">
            Ask a question
          </label>
          <textarea
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your notes..."
            rows={1}
          />
          <button type="submit" disabled={!canSend}>
            Send
          </button>
        </form>

        {error ? <p className="error-banner">Backend error: {error}</p> : null}
      </main>
    </div>
  );
}

export default App;
