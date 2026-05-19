import { useEffect, useRef, useState } from 'react'
import { getChatHistory, sendChatMessage, clearChatHistory } from '../services/api'

interface Message {
  id?      : number
  role     : 'user' | 'assistant'
  content  : string
  pending? : boolean
}

// Simple markdown-like renderer: bold **text**, bullet lines starting with -
function renderContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.trim()
    // bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.slice(2)
      return (
        <li key={i} className="ml-3 list-disc text-xs leading-relaxed">
          {renderInline(content)}
        </li>
      )
    }
    if (!trimmed) return <div key={i} className="h-1" />
    return <p key={i} className="text-xs leading-relaxed">{renderInline(trimmed)}</p>
  })
}

function renderInline(text: string) {
  // bold: **text**
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

const QUICK_PROMPTS = [
  { label: '🥗 What should I eat?',       text: 'What should I eat today based on my profile?' },
  { label: '📊 How am I doing today?',    text: 'How am I doing with my nutrition goals today?' },
  { label: '🍳 Recipe from ingredients',  text: 'I have ' },
  { label: '💪 High protein meals',       text: 'Suggest some high protein meal ideas for me.' },
]

export default function ChatWidget() {
  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  // load history when first opened
  useEffect(() => {
    if (open && !historyLoaded) {
      getChatHistory()
        .then(res => {
          const msgs = res.data.messages || []
          setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content })))
          setHistoryLoaded(true)
        })
        .catch(() => setHistoryLoaded(true))
    }
  }, [open])

  // scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg }
    const pendingMsg: Message = { role: 'assistant', content: '', pending: true }
    setMessages(prev => [...prev, userMsg, pendingMsg])
    setLoading(true)

    try {
      const res   = await sendChatMessage(msg)
      const reply = res.data.reply
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: reply }
      ])
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, I could not connect. Please try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await clearChatHistory()
      setMessages([])
      setShowClear(false)
    } catch (_) {}
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open ? 'bg-gray-700 rotate-45' : 'bg-primary-600 hover:bg-primary-700 hover:scale-110'
        }`}
        aria-label="Open NutriGuide chat"
      >
        {open
          ? <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          : <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 right-4 z-50 w-[340px] sm:w-[380px] max-h-[70vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="bg-primary-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">🥗</div>
              <div>
                <p className="text-white font-bold text-sm leading-none">NutriGuide AI</p>
                <p className="text-primary-200 text-[10px] mt-0.5">Your nutrition assistant</p>
              </div>
            </div>
            <button onClick={() => setShowClear(true)}
              className="text-primary-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Clear conversation">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Clear confirm */}
          {showClear && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
              <p className="text-xs text-amber-700 font-semibold">Clear all messages?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowClear(false)}
                  className="text-xs text-gray-500 font-semibold px-2 py-1 rounded-lg hover:bg-gray-100">Cancel</button>
                <button onClick={handleClear}
                  className="text-xs text-white font-bold px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600">Clear</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">👋</div>
                <p className="text-gray-700 font-semibold text-sm">Hi! I'm NutriGuide.</p>
                <p className="text-gray-400 text-xs mt-1">Ask me anything about nutrition, recipes, or your health goals.</p>
                <p className="text-gray-400 text-xs mt-0.5">Ndashobora no gusubiza mu Kinyarwanda!</p>
                {/* Quick prompts */}
                <div className="mt-4 space-y-1.5">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button key={i} onClick={() => {
                      if (q.text.endsWith(' ')) { setInput(q.text); inputRef.current?.focus() }
                      else handleSend(q.text)
                    }}
                      className="w-full text-left text-xs bg-gray-50 hover:bg-primary-50 border border-gray-100 hover:border-primary-200 text-gray-600 hover:text-primary-700 font-medium px-3 py-2 rounded-xl transition-all">
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-1.5">🥗</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.pending
                    ? <div className="flex gap-1 items-center py-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    : msg.role === 'user'
                    ? <p className="text-xs leading-relaxed">{msg.content}</p>
                    : <div className="space-y-0.5">{renderContent(msg.content)}</div>
                  }
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex-shrink-0">
            <div className="flex gap-2 items-center bg-gray-50 rounded-xl border border-gray-200 focus-within:border-primary-400 focus-within:bg-white transition-all px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-300 text-center mt-1.5">Powered by Google Gemini · English & Kinyarwanda</p>
          </div>
        </div>
      )}
    </>
  )
}
