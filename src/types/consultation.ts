export type ResponseType = 'FOLLOW_UP' | 'GUIDANCE' | 'CHANNEL_RECOMMENDATION' | 'UNRESOLVED'
export interface Recommendation {
  channelId: string
  name: string
  reason: string
  reasons?: string[]
  score?: number
  rank?: number
  processable?: boolean
  officialPageUrl?: string | null
}
export interface Source { title: string; url: string }
export interface BusinessAction { menu: 'transfer' | 'card'; label: string; demo: true }
export interface Reply {
  sessionId: string
  responseType: ResponseType
  message: string
  recommendations: Recommendation[]
  sources: Source[]
  summary: string | null
  actions?: BusinessAction[]
  guidance?: string | null
}
export interface Session { sessionId: string; welcomeMessage: string }
export interface ConsultationApi {
  createSession(signal?: AbortSignal): Promise<Session>
  sendMessage(sessionId: string, message: string, signal?: AbortSignal): Promise<Reply>
  endSession(sessionId: string, signal?: AbortSignal): Promise<void>
}
export interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; reply?: Reply }
export class ApiError extends Error {
  constructor(public code: string, message: string, public retryable = false, public status?: number) { super(message); this.name = 'ApiError' }
}
