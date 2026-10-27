import { useEffect, useRef, useState } from 'react'
import { consultationApi, isMock } from './api'
import type { ConsultationApi } from './types/consultation'
import { EXAMPLE, CARD_EXAMPLE, QUESTION, getMockPresentation, type DemoMenu } from './mocks/consultation'
import { useConsultation } from './hooks/useConsultation'
import { ChatMessage } from './components/ChatMessage'
import { Composer } from './components/Composer'
import { ResultCard } from './components/ResultCard'
import { HomeScreen } from './components/HomeScreen'
import { RecommendationScreen } from './components/RecommendationScreen'
import { BusinessMenu } from './components/BusinessMenu'
import { HelpDock } from './components/HelpDock'
import { Icon } from './components/Icon'
type View = 'home' | 'inquiry' | 'recommendation' | 'chat' | 'business' | 'help'
export default function App({ api = consultationApi, mockMode = isMock }: { api?: ConsultationApi; mockMode?: boolean }) {
  const chat = useConsultation(api, false)
  const [view, setView] = useState<View>('home')
  const [hidden, setHidden] = useState(false)
  const [menu, setMenu] = useState<DemoMenu>('transfer')
  const [query, setQuery] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const main = useRef<HTMLDivElement>(null)
  const extras = mockMode ? getMockPresentation(chat.latest) : null
  useEffect(() => { main.current?.focus(); main.current?.scrollTo?.(0, 0) }, [view])
  useEffect(() => { if (view === 'chat' && !hidden) end.current?.scrollIntoView({ block: 'nearest' }) }, [chat.messages, chat.pending, view, hidden])
  function enterConsultation() {
    setView(chat.messages.length > 1 ? 'chat' : 'inquiry')
    if (!chat.sessionId && !chat.pending) void chat.newConsultation()
  }
  function reset() {
    setHidden(false); setQuery(''); setView('inquiry')
    void chat.newConsultation()
  }
  function fill(text: string) { chat.setDraft(text); document.getElementById('message')?.focus() }
  async function submitInquiry() {
    const submitted = chat.draft.trim()
    const result = await chat.send()
    if (result) { setQuery(submitted); setView('recommendation') }
  }
  function openMenu(kind: DemoMenu) { setMenu(kind); setView('business') }
  const heading = { home: '우리길', inquiry: '고객센터', recommendation: 'AI 추천 결과', chat: '우리길 AI 상담', business: menu === 'transfer' ? '자동이체' : '카드 분실 안내', help: '도움말' }[view]
  const errors = <>{chat.cleanupError && <div className="error" role="alert"><strong>이전 상담 종료 확인 필요</strong><p>{chat.cleanupError}</p></div>}{chat.error && <div className="error" role="alert"><strong>요청을 완료하지 못했어요</strong><p>{chat.error.message}</p><small>{chat.error.code} · 자동 재전송하지 않아요.</small>{!chat.sessionId && <button className="secondary-button" onClick={reset}>상담 다시 시작</button>}</div>}</>
  const loading = chat.pending && <div className="loading" role="status"><span aria-hidden="true">● ● ●</span><p>{chat.sessionId ? '문의 내용을 확인하고 있어요' : '새 상담을 준비하고 있어요'}</p></div>
  return <div className="workspace"><div className="app-shell">
    <a href="#screen" className="skip-link">본문으로 바로가기</a>
    {view !== 'home' && <header className="app-header"><button className="icon-button" aria-label={view === 'business' ? '상담으로 돌아가기' : '홈으로 돌아가기'} onClick={view === 'business' ? enterConsultation : () => setView('home')}><Icon name="back"/></button><strong>{heading}</strong><span className="mode-badge">{mockMode ? view === 'business' ? '가상 업무 메뉴' : '가상 체험' : 'API 모드'}</span></header>}
    {view === 'chat' && <nav className="chat-toolbar" aria-label="상담 도구"><button aria-pressed={hidden} onClick={() => setHidden(!hidden)}>{hidden ? '대화 다시 보기' : '대화 숨기기'}</button><button onClick={reset}>↻ 새 상담</button></nav>}
    <div id="screen" className={`screen-view view-${view}`} ref={main} tabIndex={-1}>
      {view === 'home' && <HomeScreen onConsult={enterConsultation} onTransfer={() => mockMode ? openMenu('transfer') : enterConsultation()} onHelp={() => setView('help')}/>}
      {view === 'help' && <main className="page-content"><h1>무엇이 궁금하세요?</h1><HelpDock/><button className="primary-button" onClick={enterConsultation}>고객센터에서 문의하기</button></main>}
      {view === 'inquiry' && <main className="page-content inquiry-screen">
        <p className="eyebrow">우리길 AI 고객센터</p><h1>무엇을 도와드릴까요?</h1><p className="lead">상황을 알려주시면 상담 방법을 찾아드려요.</p>
        <Composer draft={chat.draft} setDraft={chat.setDraft} disabled={chat.pending || !chat.sessionId} send={submitInquiry} submitLabel="AI로 상담 방법 찾기" expanded/>
        {loading}{errors}
        {mockMode && <section className="example-options" aria-label="가상 문의 예시"><span>예시를 누르면 입력창에 채워져요</span><button disabled={chat.pending} onClick={() => fill(EXAMPLE)}>생활비 보내는 날짜 바꾸기 <span>↗</span></button><button disabled={chat.pending} onClick={() => fill(CARD_EXAMPLE)}>카드 분실 후 결제 문자 <span>↗</span></button><small>두 가지 예시와 자동이체 추가 질문만 지원하는 가상 응답이에요. 실제 AI 판단이 아니에요.</small></section>}
        <HelpDock/>
        <button className="text-button new-inquiry" onClick={reset}>새 상담 시작</button>
      </main>}
      {view === 'recommendation' && chat.latest && <RecommendationScreen reply={chat.latest} query={query} mockMode={mockMode} onContinue={() => setView('chat')}/>}
      {view === 'chat' && <main className="chat-page">
        {hidden ? <section className="hidden-state"><h1>대화를 잠시 가렸어요</h1><p>상담 내용은 그대로 유지돼요.</p><button className="secondary-button" onClick={() => setHidden(false)}>대화 다시 보기</button></section> : <>
          <div role="log" aria-label="상담 메시지" aria-live="polite" aria-relevant="additions" className="conversation">
            {chat.messages.map(message => <ChatMessage key={message.id} message={message}/>)}
            {chat.pending && chat.sessionId && <article className="message user"><div className="bubble">{chat.draft}</div></article>}
          </div>
          {loading}{errors}
          {chat.latest && <ResultCard key={chat.messages.at(-1)?.id} reply={chat.latest} actionLabel={extras?.actionLabel} onAction={extras ? () => openMenu(extras.menu) : undefined}/>}
          {mockMode && extras?.menu === 'transfer' && <button className="followup-example" disabled={chat.pending} onClick={() => fill(QUESTION)}>{QUESTION} <span aria-hidden="true">＋</span></button>}
          <HelpDock followup/>
          <div ref={end}/>
        </>}
      </main>}
      {view === 'business' && <BusinessMenu key={menu} menu={menu} onBack={enterConsultation}/>}
    </div>
    {view === 'chat' && !hidden && <Composer draft={chat.draft} setDraft={chat.setDraft} disabled={chat.pending || !chat.sessionId} send={chat.send}/>}
    <footer className="app-footer">{view === 'home' && <span className="footer-mode">{mockMode ? '가상 체험 · ' : 'API 모드 · '}</span>}해커톤 프로토타입 · 우리은행 공식 서비스 아님</footer>
  </div></div>
}

