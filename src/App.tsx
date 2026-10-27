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
import { AnalysisScreen } from './components/AnalysisScreen'
import { initialDemoTransfer } from './mocks/transfers'
type View = 'home' | 'inquiry' | 'analysis' | 'recommendation' | 'chat' | 'business' | 'help' | 'ended'
export default function App({ api = consultationApi, mockMode = isMock }: { api?: ConsultationApi; mockMode?: boolean }) {
  const chat = useConsultation(api, false)
  const [view, setView] = useState<View>('home')
  const [hidden, setHidden] = useState(false)
  const [menu, setMenu] = useState<DemoMenu>('transfer')
  const [query, setQuery] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [transfer, setTransfer] = useState(initialDemoTransfer)
  const end = useRef<HTMLDivElement>(null)
  const main = useRef<HTMLDivElement>(null)
  const inquiryAttempt = useRef(0)
  const extras = mockMode ? getMockPresentation(chat.latest) : null
  const action = chat.latest?.actions?.[0]
  const actionLabel = selectedChannel === 'CHATBOT' ? action?.label ?? extras?.actionLabel : undefined
  const actionMenu = selectedChannel === 'CHATBOT' ? action?.menu ?? extras?.menu : undefined
  useEffect(() => { main.current?.focus(); main.current?.scrollTo?.(0, 0) }, [view])
  useEffect(() => { if (view === 'chat' && !hidden) end.current?.scrollIntoView({ block: 'nearest' }) }, [chat.messages, chat.pending, view, hidden])
  function enterConsultation() {
    setView(chat.messages.length > 1 ? 'chat' : 'inquiry')
    if (!chat.sessionId && !chat.pending) { setTransfer(initialDemoTransfer()); void chat.newConsultation() }
  }
  function reset() {
    inquiryAttempt.current++
    setHidden(false); setQuery(''); setSelectedChannel(null); setView('inquiry')
    setTransfer(initialDemoTransfer())
    void chat.newConsultation()
  }
  function fill(text: string) { chat.setDraft(text); document.getElementById('message')?.focus() }
  async function submitInquiry() {
    const submitted = chat.draft.trim()
    if (!submitted || chat.pending || !chat.sessionId) return
    const attempt = ++inquiryAttempt.current
    setView('analysis')
    const result = await chat.send()
    if (attempt !== inquiryAttempt.current) return
    if (result) { setQuery(submitted); setView(result.responseType === 'CHANNEL_RECOMMENDATION' ? 'recommendation' : 'chat') }
    else setView('inquiry')
  }
  async function submitChat() {
    if (!chat.draft.trim() || chat.pending) return
    const result = await chat.send()
    if (result) setSelectedChannel(null)
    if (result?.responseType === 'CHANNEL_RECOMMENDATION') setView('recommendation')
  }
  function openMenu(kind: DemoMenu) { setMenu(kind); setView('business') }
  async function finish() {
    if (await chat.finishConsultation()) { setSelectedChannel(null); setQuery(''); setView('ended') }
  }
  function goHome() { inquiryAttempt.current++; setView('home') }
  const heading = { home: '우리길', inquiry: '고객센터', analysis: '고객센터', recommendation: 'AI 추천 결과', chat: '우리길 AI 상담', business: menu === 'transfer' ? '자동이체' : '카드 분실 안내', help: '도움말', ended: '우리길 AI 상담' }[view]
  const errors = <>{chat.cleanupError && <div className="error" role="alert"><strong>이전 상담 종료 확인 필요</strong><p>{chat.cleanupError}</p></div>}{chat.error && <div className="error" role="alert"><strong>요청을 완료하지 못했어요</strong><p>{chat.error.message}</p><small>{chat.error.code} · 자동 재전송하지 않아요.</small>{!chat.sessionId && <button className="secondary-button" onClick={reset}>상담 다시 시작</button>}</div>}</>
  const loading = chat.pending && <div className="loading" role="status"><span aria-hidden="true">● ● ●</span><p>{chat.sessionId ? '문의 내용을 확인하고 있어요' : '새 상담을 준비하고 있어요'}</p></div>
  return <div className="workspace"><div className="app-shell">
    <a href="#screen" className="skip-link">본문으로 바로가기</a>
    {view !== 'home' && <header className="app-header"><button className="icon-button" disabled={view === 'business' && chat.pending} aria-label={view === 'business' ? '상담으로 돌아가기' : '홈으로 돌아가기'} onClick={view === 'business' ? enterConsultation : goHome}><Icon name="back"/></button><strong>{heading}</strong><span className="mode-badge">{view === 'business' ? '가상 업무 체험' : mockMode ? '가상 체험' : 'API 모드'}</span></header>}
    {view === 'chat' && <nav className="chat-toolbar" aria-label="상담 도구"><button aria-pressed={hidden} onClick={() => setHidden(!hidden)}>{hidden ? '대화 다시 보기' : '대화 숨기기'}</button><button onClick={reset}>↻ 새 상담</button></nav>}
    <div id="screen" className={`screen-view view-${view}`} ref={main} tabIndex={-1}>
      {view === 'home' && <HomeScreen onConsult={enterConsultation} onTransfer={() => mockMode ? openMenu('transfer') : enterConsultation()} onHelp={() => setView('help')}/>}
      {view === 'help' && <main className="page-content"><h1>무엇이 궁금하세요?</h1><HelpDock/><button className="primary-button" onClick={enterConsultation}>고객센터에서 문의하기</button></main>}
      {view === 'analysis' && <AnalysisScreen/>}
      {view === 'inquiry' && <main className="page-content inquiry-screen">
        <p className="eyebrow">우리길 AI 고객센터</p><h1>무엇을 도와드릴까요?</h1><p className="lead">상황을 알려주시면 상담 방법을 찾아드려요.</p>
        <Composer draft={chat.draft} setDraft={chat.setDraft} disabled={chat.pending || !chat.sessionId} send={submitInquiry} submitLabel="AI로 상담 방법 찾기" expanded/>
        {loading}{errors}
        {mockMode && <section className="example-options" aria-label="가상 문의 예시"><span>예시를 누르면 입력창에 채워져요</span><button disabled={chat.pending} onClick={() => fill(EXAMPLE)}>생활비 보내는 날짜 바꾸기 <span>↗</span></button><button disabled={chat.pending} onClick={() => fill(CARD_EXAMPLE)}>카드 분실 후 결제 문자 <span>↗</span></button><small>두 가지 예시와 자동이체 추가 질문만 지원하는 가상 응답이에요. 실제 AI 판단이 아니에요.</small></section>}
        <HelpDock/>
        <button className="text-button new-inquiry" onClick={reset}>새 상담 시작</button>
      </main>}
      {view === 'recommendation' && chat.latest && <RecommendationScreen reply={chat.latest} query={query} mockMode={mockMode} onContinue={channelId => { setSelectedChannel(channelId ?? null); setView('chat') }}/>}
      {view === 'chat' && <main className="chat-page">
        {hidden ? <section className="hidden-state"><h1>대화를 잠시 가렸어요</h1><p>상담 내용은 그대로 유지돼요.</p><button className="secondary-button" onClick={() => setHidden(false)}>대화 다시 보기</button></section> : <>
          <div role="log" aria-label="상담 메시지" aria-live="polite" aria-relevant="additions" className="conversation">
            {chat.messages.map(message => <ChatMessage key={message.id} message={message}/>)}
            {chat.pending && chat.pendingMessage !== null && <article className="message user"><div className="bubble">{chat.pendingMessage}</div></article>}
          </div>
          {loading}{errors}
          {!chat.pending && chat.latest?.responseType === 'CHANNEL_RECOMMENDATION' && selectedChannel && <><ResultCard key={`${chat.messages.at(-1)?.id}-${selectedChannel}`} reply={{ ...chat.latest, recommendations: chat.latest.recommendations.filter(item => item.channelId === selectedChannel) }} selected actionLabel={actionLabel} onAction={actionMenu ? () => openMenu(actionMenu) : undefined}/><button className="text-button" onClick={() => setView('recommendation')}>상담 방법 다시 선택하기</button></>}
          {mockMode && extras?.menu === 'transfer' && <button className="followup-example" disabled={chat.pending} onClick={() => fill(QUESTION)}>{QUESTION} <span aria-hidden="true">＋</span></button>}
          <HelpDock followup/>
          <div ref={end}/>
        </>}
      </main>}
      {view === 'business' && <BusinessMenu key={menu} menu={menu} transfer={transfer} onChange={day => setTransfer(previous => ({ ...previous, day }))} onBack={enterConsultation} onFinish={() => void finish()} finishing={chat.pending} finishError={chat.error?.message}/>}
      {view === 'ended' && <main className="page-content ended-screen"><span className="ended-icon" aria-hidden="true">✓</span><h1>상담을 마쳤어요</h1><p>자동이체 날짜 변경 체험을 완료했어요.<br/>도움이 필요하면 새 상담을 시작해 주세요.</p><section className="transfer-account"><small>이번 상담 · 가상 체험</small><strong>{transfer.title} 자동이체</strong><span>변경 후 이체일 · 매월 {transfer.day}일</span></section><p className="notice">실제 계좌의 자동이체는 변경되지 않았어요.</p><button className="primary-button" onClick={goHome}>홈으로</button><button className="secondary-button" onClick={reset}>새 상담 시작</button></main>}
    </div>
    {view === 'chat' && !hidden && <Composer draft={chat.draft} setDraft={chat.setDraft} disabled={chat.pending || !chat.sessionId} send={submitChat}/>}
    <footer className="app-footer">{view === 'home' && <span className="footer-mode">{mockMode ? '가상 체험 · ' : 'API 모드 · '}</span>}해커톤 프로토타입 · 우리은행 공식 서비스 아님</footer>
  </div></div>
}

