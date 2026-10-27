import type { ChatMessage as Message, ResponseType } from '../types/consultation'
const labels: Record<ResponseType, string> = { FOLLOW_UP: '추가 질문', GUIDANCE: '일반 안내', CHANNEL_RECOMMENDATION: '채널 추천', UNRESOLVED: '안내 불가' }
export function ChatMessage({ message }: { message: Message }) {
  return <article className={`message ${message.role}`} aria-label={message.role === 'user' ? '고객 메시지' : 'AI 메시지'}>
    {message.role === 'assistant' && <span className="avatar" aria-hidden="true">W</span>}
    <div className="message-content">
      <div className="message-label">{message.role === 'user' ? '나' : '우리길 도우미'}{message.reply && <span>{labels[message.reply.responseType]}</span>}</div>
      <div className="bubble">{message.text}</div>
      {!!message.reply?.recommendations.length && <p className="history-note">당시 추천: {message.reply.recommendations.map(r => r.name).join(', ')} · 최신 결과는 아래 안내를 확인해 주세요.</p>}
    </div>
  </article>
}
