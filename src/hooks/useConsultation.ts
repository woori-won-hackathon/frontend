import { useCallback, useEffect, useRef, useState } from 'react'
import { consultationApi } from '../api'
import { ApiError, type ChatMessage, type ConsultationApi, type Reply } from '../types/consultation'
export function useConsultation(api: ConsultationApi = consultationApi, autoStart = true) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [latest, setLatest] = useState<Reply | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [cleanupError, setCleanupError] = useState<string | null>(null)
  const generation = useRef(0)
  const locked = useRef(false)
  const session = useRef<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const newConsultation = useCallback(async () => {
    const token = ++generation.current
    request.current?.abort()
    const previousSession = session.current
    session.current = null
    const controller = new AbortController(); request.current = controller
    locked.current = true
    setSessionId(null); setMessages([]); setLatest(null); setDraft(''); setError(null); setCleanupError(null); setPending(true)
    try {
      if (previousSession) {
        try { await api.endSession(previousSession) }
        catch {
          if (token === generation.current) setCleanupError('이전 상담의 서버 종료를 확인하지 못했어요. 이전 기록이 서버에 남아 있을 수 있어요.')
        }
      }
      if (token !== generation.current) return
      const result = await api.createSession(controller.signal)
      if (token !== generation.current) {
        // A successful but stale creation must not leak a session into the current chat.
        void api.endSession(result.sessionId).catch(() => {})
        return
      }
      session.current = result.sessionId; setSessionId(result.sessionId)
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', text: result.welcomeMessage }])
    } catch (err) { if (token === generation.current) setError(err instanceof ApiError ? err : new ApiError('UNKNOWN', '상담을 시작하지 못했어요. 새 상담을 눌러 다시 시도해 주세요.', true)) }
    finally { if (token === generation.current) { locked.current = false; setPending(false) } }
  }, [api])
  const cancelActive = useCallback(() => {
    generation.current++
    request.current?.abort()
    const previousSession = session.current
    session.current = null
    // Best effort on unmount. Browser/tab termination cannot guarantee delivery.
    if (previousSession) void api.endSession(previousSession).catch(() => {})
  }, [api])
  useEffect(() => {
    let disposed = false
    queueMicrotask(() => { if (!disposed && autoStart) void newConsultation() })
    return () => { disposed = true; cancelActive() }
  }, [autoStart, cancelActive, newConsultation])
  const send = async (message?: string): Promise<Reply | null> => {
    const text = (message ?? draft).trim()
    if (locked.current || !sessionId || !text) return null
    if (message !== undefined) setDraft(message)
    const token = generation.current
    locked.current = true; setPending(true); setError(null); setLatest(null)
    const controller = new AbortController(); request.current = controller
    // Commit both messages on success; a failed submission leaves its input editable without duplicate history.
    try {
      const result = await api.sendMessage(sessionId, text, controller.signal)
      if (token !== generation.current) return null
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', text }, { id: crypto.randomUUID(), role: 'assistant', text: result.message, reply: result }])
      setLatest(result); setDraft('')
      return result
    } catch (err) { if (token === generation.current) setError(err instanceof ApiError ? err : new ApiError('UNKNOWN', '요청을 처리하지 못했어요. 입력은 보관되어 있어요.', true)) }
    finally { if (token === generation.current) { locked.current = false; setPending(false) } }
    return null
  }
  return { sessionId, messages, latest, draft, setDraft, pending, error, cleanupError, send, newConsultation }
}
