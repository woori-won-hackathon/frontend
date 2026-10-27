// Backend wire contract: /api/v1. Keep separate from the screen view model.
export interface ConsultationSessionResponse { sessionId: string }
export interface ConsultationMessageRequest { message: string }
export interface ChannelRecommendationResponse {
  channel: string
  score: number
  processable: boolean
  reasons: string[]
  officialPageUrl: string | null
}
export interface ConsultationMessageResponse {
  sessionId: string
  answer: string
  recommendations: ChannelRecommendationResponse[]
  consultationSummary: string | null
  officialPageUrl: string | null
}
