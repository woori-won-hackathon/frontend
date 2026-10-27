import type { Reply } from '../types/consultation'
import { getMockPresentation } from '../mocks/consultation'
import { Icon } from './Icon'
export function RecommendationScreen({ reply, query, mockMode, onContinue }: { reply: Reply; query: string; mockMode: boolean; onContinue: (channelId?: string) => void }) {
  const first = reply.recommendations[0]
  const ai = first?.channelId === 'CHATBOT' && first.processable === true
  const presentation = mockMode ? getMockPresentation(reply) : null
  return <main className="page-content recommendation-screen">
    <p className="eyebrow">AI 상담 분석 결과</p>
    <h1>{ai ? 'AI로 해결할 수 있어요' : first ? '이 상담 방법을 추천해요' : reply.responseType === 'UNRESOLVED' ? '이 문의는 안내하기 어려워요' : reply.responseType === 'FOLLOW_UP' ? '조금 더 알려 주세요' : '안내 내용을 확인해 주세요'}</h1>
    <section className="request-summary" aria-label="문의 요약"><small>{presentation ? '말씀하신 내용 · 가상 요약' : reply.summary ? '상담 요약' : '입력하신 문의'}</small><strong>{presentation?.intent ?? reply.summary ?? query}</strong>{presentation && <span>{presentation.detail}</span>}</section>
    {first ? <section className="featured-recommendation featured-recommendation-primary" aria-label="추천 상담 방법">
      <span className="eyebrow">{first.rank ?? 1}순위 · 추천</span>
      <h2><span className="bot-symbol" aria-hidden="true"><Icon name="chat"/></span>{first.name}</h2>
      {(first.reasons ?? [first.reason]).map((reason, index) => <p key={index}>{reason}</p>)}
      {first.processable === false && <p className="notice">이 채널에서는 처리할 수 없다고 안내되었어요.</p>}
      <button className="primary-button" onClick={() => onContinue(first.channelId)}>{ai ? 'AI로 해결하기' : `${first.name} 선택하기`}</button>
      <small className="action-note">{ai ? 'AI 챗봇에서 안내를 이어가요.' : '같은 상담에서 답변을 확인해요.'}</small>
    </section> : <section className="featured-recommendation"><p className="preserve-lines">{reply.message}</p><p className="muted">현재 응답에는 추천 채널이 없어요.</p><button className="primary-button" onClick={() => onContinue()}>대화 이어가기</button></section>}
    {first && <section className="other-channels ranked-alternatives" aria-label="다른 상담 방법">{reply.recommendations.slice(1).map((item, index) => <article key={item.channelId}><span className="eyebrow">{item.rank ?? index + 2}순위 · 참고</span><h2>{item.name}</h2>{(item.reasons ?? [item.reason]).map((reason, i) => <p key={i}>{reason}</p>)}<button className="secondary-button" disabled>{item.name} 선택하기</button></article>)}{Array.from({ length: Math.max(0, 3 - reply.recommendations.length) }, (_, index) => <article key={`empty-${index}`}><span className="eyebrow">{reply.recommendations.length + index + 1}순위 · 추천 없음</span><h2>추가 추천 채널 없음</h2><p>현재 응답에는 이 순위에 해당하는 추천 채널이 없어요.</p><button className="secondary-button" disabled>추천 채널 미확정</button></article>)}</section>}
    <p className="notice recommendation-note tip-notice"><strong className="tip-label">TIP</strong><span>AI는 메뉴와 상담 방법을 안내해요. 실제 업무 처리는 해당 공식 화면에서 확인해 주세요.</span></p>
  </main>
}

