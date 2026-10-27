import { ApiError, type Reply, type Session, type Source, type Recommendation } from '../types/consultation'

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('INVALID_RESPONSE', '서버 응답 형식을 확인할 수 없어요.')
  return value as Record<string, unknown>
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError('INVALID_RESPONSE', '서버 응답에 필요한 정보가 없어요.')
  return value
}
function optionalString(value: unknown): string | null {
  if (value == null || value === '') return null
  return string(value)
}
function list<T>(value: unknown, convert: (item: unknown) => T): T[] {
  if (value == null) return []
  if (!Array.isArray(value)) throw new ApiError('INVALID_RESPONSE', '서버 목록 형식이 올바르지 않아요.')
  return value.map(convert)
}
export function officialUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['www.wooribank.com', 'spot.wooribank.com'].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null
  } catch { return null }
}
function safeOfficialUrl(value: unknown): string | null {
  const candidate = optionalString(value)
  return candidate ? officialUrl(candidate) : null
}
export function adaptSession(value: unknown): Session {
  const data = record(value)
  // The API returns only sessionId. This greeting belongs to the frontend UI.
  return { sessionId: string(data.sessionId), welcomeMessage: '어떤 상황인지 편하게 말씀해 주세요. 필요한 안내와 상담 방법을 함께 확인할게요.' }
}
export function adaptReply(value: unknown, sessionId: string): Reply {
  const data = record(value)
  if (string(data.sessionId) !== sessionId) throw new ApiError('INVALID_RESPONSE', '요청한 상담과 응답의 세션이 일치하지 않아요.')
  const recommendations = list<Recommendation>(data.recommendations, item => {
    const r = record(item)
    const channel = string(r.channel)
    if (typeof r.score !== 'number' || !Number.isFinite(r.score) || typeof r.processable !== 'boolean') {
      throw new ApiError('INVALID_RESPONSE', '추천 채널의 점수나 처리 가능 여부를 확인할 수 없어요.')
    }
    const reasons = list(r.reasons, string)
    return {
      channelId: channel,
      // Only CHATBOT is specified so far. Unknown channel identifiers remain visible unchanged.
      name: channel === 'CHATBOT' ? '챗봇/채팅상담' : channel,
      reason: reasons.join('\n'), reasons, score: r.score, processable: r.processable,
      officialPageUrl: safeOfficialUrl(r.officialPageUrl),
    }
  })
  const url = safeOfficialUrl(data.officialPageUrl)
  const sources: Source[] = url ? [{ title: '공식 안내 페이지', url }] : []
  return {
    sessionId,
    // The backend does not provide responseType. Do not guess follow-up/unresolved from answer text.
    responseType: recommendations.length ? 'CHANNEL_RECOMMENDATION' : 'GUIDANCE',
    message: string(data.answer), recommendations, sources,
    summary: optionalString(data.consultationSummary),
  }
}
