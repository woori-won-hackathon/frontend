import { useId, useState } from 'react'
const content = {
  faq: [
    ['자동이체 날짜는 어떻게 바꾸나요?', '상황을 입력해 상담 안내를 확인한 뒤, 제공되는 업무 메뉴에서 등록 내역과 변경 가능 여부를 확인해 주세요. 이 프로토타입에서는 실제 변경하지 않아요.'],
    ['상담 내용은 어디에 저장되나요?', '이 화면은 상담 내용을 브라우저 영구 저장소에 저장하지 않아요. API 모드에서는 상담 요청이 서버로 전송되며, 새 상담을 시작할 때 이전 세션의 종료를 요청해요.'],
  ],
  support: [
    ['수수료 · 이용시간 안내', '이 체험은 수수료나 운영시간을 확정해 안내하지 않아요. 상담 응답에 제공된 공식 페이지에서 확인해 주세요.'],
    ['다른 상담 방법은 어떻게 찾나요?', '문의에 대한 추천 결과에서 서버가 제공한 상담 채널과 이유를 확인할 수 있어요. 이 프로토타입은 실제 전화 연결·이메일 발송·예약을 하지 않아요.'],
  ],
}
export function HelpDock({ followup = false }: { followup?: boolean }) {
  const [tab, setTab] = useState<'faq' | 'support'>('faq')
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const body = <div className="help-body">
      <div className="help-tabs" aria-label="도움말 분류">
        <button aria-pressed={tab === 'faq'} onClick={() => setTab('faq')}>자주 묻는 질문</button>
        <button aria-pressed={tab === 'support'} onClick={() => setTab('support')}>안내 / 지원</button>
      </div>
      {content[tab].map(([title, text]) => <details className="help-item" key={title}><summary>{title}<span aria-hidden="true">›</span></summary><p>{text}</p></details>)}
    </div>
  // Chat help follows the answer in the scrollable conversation, rather than occupying the input area.
  if (followup) return <section className="followup-help" aria-label="상담 후속 도움말">
    <button className="followup-help-trigger" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>빠른 도움말도 볼까요? <span aria-hidden="true">{expanded ? '−' : '＋'}</span></button>
    <div id={panelId} hidden={!expanded} className="followup-help-panel"><p className="followup-help-title">빠른 도움말</p>{body}</div>
  </section>
  return <details className="help-dock" open>
    <summary>빠른 도움말 <span>자주 묻는 질문 · 안내 / 지원</span></summary>
    {body}
  </details>
}

