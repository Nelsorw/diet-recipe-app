import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getChatSessions, createChatSession, renameChatSession,
  deleteChatSession, getSessionMessages, sendChatMessage
} from '../services/api'

interface Message  { id?: number; role: 'user' | 'assistant'; content: string; pending?: boolean }
interface Session  { id: number; title: string; last_message: string; message_count: number; updated_at: string }

type View = 'sessions' | 'chat'

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    const t = line.trim()
    if (t.startsWith('- ') || t.startsWith('• ')) {
      return <li key={i} className="ml-3 list-disc text-xs leading-relaxed">{renderInline(t.slice(2))}</li>
    }
    if (!t) return <div key={i} className="h-1" />
    return <p key={i} className="text-xs leading-relaxed">{renderInline(t)}</p>
  })
}
function renderInline(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : p
  )
}

const QUICK_PROMPTS = [
  { label: '🥗 What should I eat?',      text: 'What should I eat today based on my profile?' },
  { label: '📊 How am I doing today?',   text: 'How am I doing with my nutrition goals today?' },
  { label: '🍳 Recipe from ingredients', text: 'I have ' },
  { label: '💪 High protein meals',      text: 'Suggest some high protein meal ideas for me.' },
]

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'Just now'
}

export default function ChatWidget() {
  const { user }                          = useAuth()
  const activeProfileId                   = user?.active_profile_id

  const [open, setOpen]                   = useState(false)
  const [view, setView]                   = useState<View>('sessions')
  const [sessions, setSessions]           = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [sessionsLoaded, setSessionsLoaded] = useState(false)

  // rename state
  const [renamingId, setRenamingId]       = useState<number | null>(null)
  const [renameVal, setRenameVal]         = useState('')
  // delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  // reload sessions when profile switches or widget opens
  useEffect(() => {
    if (open) {
      setSessions([])
      setActiveSession(null)
      setMessages([])
      setView('sessions')
      setSessionsLoaded(false)
    }
  }, [activeProfileId])

  useEffect(() => {
    // also reset when widget is opened fresh
    if (!open) {
      setSessionsLoaded(false)
    }
  }, [open])

  useEffect(() => {
    if (open && !sessionsLoaded) {
      getChatSessions()
        .then(res => { setSessions(res.data.sessions || []); setSessionsLoaded(true) })
        .catch(() => setSessionsLoaded(true))
    }
  }, [open, sessionsLoaded])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 100) }, [view])
  useEffect(() => { if (renamingId) setTimeout(() => renameRef.current?.focus(), 50) }, [renamingId])

  const openSession = async (session: Session) => {
    setActiveSession(session)
    setMessages([])
    setView('chat')
    try {
      const res = await getSessionMessages(session.id)
      setMessages((res.data.messages || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })))
    } catch (_) {}
  }

  const handleNewChat = async () => {
    try {
      const res     = await createChatSession()
      const session = res.data.session
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      setMessages([])
      setView('chat')
    } catch (_) {}
  }

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '', pending: true }
    ])
    setLoading(true)

    try {
      const res   = await sendChatMessage(msg, activeSession?.id)
      const reply = res.data.reply
      const updatedSession = res.data.session

      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: reply }])

      // update session in list (title may have changed, updated_at changed)
      if (updatedSession) {
        setActiveSession(updatedSession)
        setSessions(prev => {
          const exists = prev.find(s => s.id === updatedSession.id)
          if (exists) return prev.map(s => s.id === updatedSession.id ? updatedSession : s)
          return [updatedSession, ...prev]
        })
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, I could not connect. Please try again.' }
      ])
    } finally { setLoading(false) }
  }

  const handleRename = async (id: number) => {
    const title = renameVal.trim()
    if (!title) { setRenamingId(null); return }
    try {
      const res = await renameChatSession(id, title)
      setSessions(prev => prev.map(s => s.id === id ? res.data.session : s))
      if (activeSession?.id === id) setActiveSession(res.data.session)
    } catch (_) {}
    setRenamingId(null)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteChatSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession?.id === id) { setActiveSession(null); setView('sessions') }
    } catch (_) {}
    setConfirmDeleteId(null)
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

      {open && (
        <div className="fixed bottom-40 right-4 z-50 w-[340px] sm:w-[380px] max-h-[72vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* ── SESSIONS VIEW ── */}
          {view === 'sessions' && (
            <>
              <div className="bg-primary-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">🥗</div>
                  <div>
                    <p className="text-white font-bold text-sm leading-none">NutriGuide AI</p>
                    <p className="text-primary-200 text-[10px] mt-0.5">Your nutrition assistant</p>
                  </div>
                </div>
                <button onClick={handleNewChat}
                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {!sessionsLoaded ? (
                  <div className="flex justify-center py-12">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-gray-700 font-semibold text-sm">No conversations yet</p>
                    <p className="text-gray-400 text-xs mt-1 mb-4">Start a new chat to ask about nutrition, recipes, or your health goals.</p>
                    <button onClick={handleNewChat}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors">
                      Start First Chat
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {sessions.map(s => (
                      <div key={s.id} className="group flex items-center gap-2 px-3 py-3 hover:bg-gray-50 transition-colors">
                        {renamingId === s.id ? (
                          <input
                            ref={renameRef}
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRename(s.id)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            onBlur={() => handleRename(s.id)}
                            className="flex-1 text-xs border border-primary-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary-400"
                          />
                        ) : (
                          <button onClick={() => openSession(s)} className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{s.title}</p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                              {s.last_message || 'No messages yet'} · {timeAgo(s.updated_at)}
                            </p>
                          </button>
                        )}

                        {renamingId !== s.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => { setRenamingId(s.id); setRenameVal(s.title) }}
                              className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"
                              title="Rename">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(s.id)}
                              className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
                              title="Delete">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete confirm */}
              {confirmDeleteId && (
                <div className="border-t border-gray-100 bg-red-50 px-4 py-3 flex-shrink-0">
                  <p className="text-xs text-red-700 font-semibold mb-2">Delete this conversation?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 text-xs border border-gray-200 text-gray-500 font-semibold py-1.5 rounded-lg">Cancel</button>
                    <button onClick={() => handleDelete(confirmDeleteId)}
                      className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 rounded-lg">Delete</button>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 px-4 py-2 flex-shrink-0">
                <p className="text-[10px] text-gray-300 text-center">Powered by Groq · English & Kinyarwanda</p>
              </div>
            </>
          )}

          {/* ── CHAT VIEW ── */}
          {view === 'chat' && (
            <>
              <div className="bg-primary-600 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setView('sessions')}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-xs leading-none truncate">
                    {activeSession?.title || 'New Chat'}
                  </p>
                  <p className="text-primary-200 text-[10px] mt-0.5">NutriGuide AI</p>
                </div>
                <button
                  onClick={() => { setRenamingId(activeSession?.id ?? null); setRenameVal(activeSession?.title ?? ''); setView('sessions') }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-primary-200 hover:text-white transition-colors flex-shrink-0"
                  title="Rename">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.length === 0 && (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">👋</div>
                    <p className="text-gray-700 font-semibold text-sm">Hi! I'm NutriGuide.</p>
                    <p className="text-gray-400 text-xs mt-1">Ask me anything about nutrition, recipes, or your health goals.</p>
                    <p className="text-gray-400 text-xs mt-0.5">Ndashobora no gusubiza mu Kinyarwanda!</p>
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
                            {[0, 150, 300].map(d => (
                              <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
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
                  <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                    className="w-7 h-7 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
