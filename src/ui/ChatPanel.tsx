import { useState, useRef, useEffect } from 'react'
import { useAppStore, type ChatMessage } from '@/store/appStore'
import { processAgentMessage } from '@/agent/agentService'

const SUGGESTED_PROMPTS = [
  'Give me a tour',
  'Describe Account',
  'Which table has the most records?',
  'How is Contact related to Case?',
  'Show me Opportunities',
]

export function ChatPanel() {
  const { chatOpen, setChatOpen, chatMessages, addChatMessage, agentThinking } = useAppStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Tab key to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        // Only intercept if not in an input
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault()
          setChatOpen(!chatOpen)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [chatOpen, setChatOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (chatOpen && chatMessages.length === 0) {
      // Welcome message
      addChatMessage({
        id: 'welcome',
        role: 'agent',
        content:
          "Hello! I'm your Dataverse guide. I can help you explore tables, understand relationships, and even build new apps. What would you like to discover?",
        timestamp: Date.now(),
      })
    }
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [chatOpen])

  const handleSend = async (message: string) => {
    if (!message.trim() || agentThinking) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    }
    addChatMessage(userMsg)
    setInput('')

    const response = await processAgentMessage(message)

    const agentMsg: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: response,
      timestamp: Date.now(),
    }
    addChatMessage(agentMsg)
  }

  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        style={{
          position: 'fixed',
          bottom: '5rem',
          right: '1rem',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          color: '#00f0ff',
          cursor: 'pointer',
          fontSize: '1.3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)',
          transition: 'all 0.2s',
        }}
        title="AI Agent (Tab)"
      >
        &#x2726;
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        width: '380px',
        height: '500px',
        background: 'rgba(8, 8, 24, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(0, 240, 255, 0.15)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 80,
        boxShadow: '0 0 60px rgba(0, 240, 255, 0.08), 0 24px 48px rgba(0, 0, 0, 0.4)',
        animation: 'chatSlideIn 0.3s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: agentThinking ? '#f59e0b' : '#10b981',
            boxShadow: `0 0 8px ${agentThinking ? '#f59e0b80' : '#10b98180'}`,
            animation: agentThinking ? 'pulse 1s ease-in-out infinite' : 'none',
          }}
        />
        <span
          style={{
            flex: 1,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#e2e8f0',
          }}
        >
          Dataverse Guide
        </span>
        <button
          onClick={() => setChatOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '2px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background:
                msg.role === 'user'
                  ? 'rgba(0, 240, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${
                msg.role === 'user' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'
              }`,
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderMarkdownLight(msg.content)}
          </div>
        ))}

        {agentThinking && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 18px',
              borderRadius: '12px 12px 12px 4px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.8rem',
              color: '#64748b',
            }}
          >
            <span style={{ animation: 'dotPulse 1.4s infinite' }}>Thinking</span>
            <span style={{ animation: 'dotPulse 1.4s 0.2s infinite' }}>.</span>
            <span style={{ animation: 'dotPulse 1.4s 0.4s infinite' }}>.</span>
            <span style={{ animation: 'dotPulse 1.4s 0.6s infinite' }}>.</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts (only show if few messages) */}
      {chatMessages.length <= 2 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '0 12px 8px',
          }}
        >
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              style={{
                padding: '5px 10px',
                borderRadius: '16px',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.12)',
                color: '#94a3b8',
                fontSize: '0.65rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                ;(e.target as HTMLElement).style.background = 'rgba(0, 240, 255, 0.1)'
                ;(e.target as HTMLElement).style.color = '#e2e8f0'
              }}
              onMouseOut={(e) => {
                ;(e.target as HTMLElement).style.background = 'rgba(0, 240, 255, 0.05)'
                ;(e.target as HTMLElement).style.color = '#94a3b8'
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend(input)
          }}
          placeholder="Ask about your Dataverse..."
          disabled={agentThinking}
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '9px 14px',
            color: '#e2e8f0',
            fontSize: '0.8rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || agentThinking}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            background: input.trim()
              ? 'rgba(0, 240, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            color: input.trim() ? '#00f0ff' : '#475569',
            cursor: input.trim() ? 'pointer' : 'default',
            fontSize: '0.85rem',
          }}
        >
          &#x27A4;
        </button>
      </div>

      <style>{`
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes dotPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </div>
  )
}

/** Very lightweight markdown renderer for agent messages */
function renderMarkdownLight(text: string) {
  // Handle bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#00f0ff' }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}
