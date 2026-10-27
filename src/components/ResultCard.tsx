import { useState } from 'react'
import { officialUrl } from '../api/adapter'
import type { Reply } from '../types/consultation'
interface Props { reply: Reply; actionLabel?: string; onAction?: () => void }
export function ResultCard({ reply, actionLabel, onAction }: Props) {
  const [copyStatus, setCopyStatus] = useState('')
  async function copy() {
    try { await navigator.clipboard.writeText(reply.summary!); setCopyStatus('상담 요약을 복사했어요.') }
    catch { setCopyStatus('복사하지 못했어요. 아래 요약을 직접 선택해 복사해 주세요.') }
  }
  return <><section className={`result-card ${actionLabel || reply.recommendations.length ? 'result-card-action' : ''}`} aria-label="최신 응답 결과">
    <div className="result-heading"><span className="card-icon" aria-hidden="true">↗</span><h3>{actionLabel ? '업무 메뉴 안내' : reply.recommendations.length ? '우리길의 추천' : reply.responseType === 'UNRESOLVED' ? '이 문의는 안내하기 어려워요' : reply.responseType === 'FOLLOW_UP' ? '한 가지만 더 확인할게요' : '이렇게 확인해 보세요'}</h3></div>
    {!actionLabel && reply.recommendations.map((r, index) => <div className="recommendation" key={`${r.channelId}-${index}`}>
      <span className="small-label">추천 {r.score !== undefined ? '상담 채널' : '업무'}</span><h4>{r.name}</h4>
      {r.score !== undefined && <p>추천 점수: {r.score}</p>}
      {r.processable !== undefined && <p>서버가 제공한 처리 가능 여부: <strong>{r.processable ? '가능' : '불가'}</strong></p>}
      {r.reasons ? r.reasons.length ? <ul className="recommendation-reasons">{r.reasons.map((reason, reasonIndex) => <li key={reasonIndex}>{reason}</li>)}</ul> : <p>추천 근거가 제공되지 않았어요.</p> : <p>{r.reason}</p>}
      {r.officialPageUrl && officialUrl(r.officialPageUrl) && <a className="source-link" href={officialUrl(r.officialPageUrl)!} target="_blank" rel="noopener noreferrer">채널 공식 안내 보기<span aria-hidden="true">↗</span><span className="sr-only"> (새 창)</span></a>}
    </div>)}
    {!reply.recommendations.length && <p className="no-result">현재 응답에는 추천 채널이 없어요.{reply.responseType === 'FOLLOW_UP' ? ' 추가 질문에 답해 주세요.' : reply.responseType === 'UNRESOLVED' ? ' 지원하는 예시 입력을 확인해 주세요.' : ' 위 대화의 일반 안내를 확인해 주세요.'}</p>}
    {actionLabel && onAction && <><button className="primary-button" onClick={onAction}>{actionLabel}<span aria-hidden="true">↗</span></button><p className="action-note">메뉴 이동 데모 · 실제 조회 / 변경 없음</p></>}
    {reply.sources.map(source => {
      const href = officialUrl(source.url)
      return href ? <a className="source-link" key={href} href={href} target="_blank" rel="noopener noreferrer"><span><small>공식 출처</small>{source.title}</span><span aria-hidden="true">↗</span><span className="sr-only"> (새 창)</span></a> : null
    })}
    {reply.summary && <details className="summary"><summary>상담 요약 확인</summary><p>{reply.summary}</p><button type="button" className="text-button" onClick={() => void copy()}>요약 복사 <span aria-hidden="true">⧉</span></button><p className="copy-status" role="status">{copyStatus}</p></details>}
  </section>
    {actionLabel && onAction && <p className="business-tip tip-notice"><strong className="tip-label">TIP</strong><span>업무 가능 여부와 진행 절차는 해당 공식 화면에서 확인해 주세요.</span></p>}
  </>
}

