import { useState } from 'react'
import { Icon } from './Icon'
import wonwayLogo from '../assets/wonway-logo.png'
export function HomeScreen({ onConsult, onTransfer, onHelp }: { onConsult: () => void; onTransfer: () => void; onHelp: () => void }) {
  const [easy, setEasy] = useState(false)
  const [notice, setNotice] = useState(false)
  return <>
    <header className="home-header">
      <button className="mode-toggle" onClick={() => setEasy(!easy)} aria-pressed={easy}><span className={!easy ? 'selected' : ''}>일반</span><span className={easy ? 'selected' : ''}>쉬운</span></button>
      <img className="home-logo" src={wonwayLogo} alt="우리길" width="108" height="72"/>
      <button className="icon-button" aria-label="프로토타입 알림" aria-expanded={notice} onClick={() => setNotice(!notice)}><Icon name="bell"/></button>
    </header>
    <main className={`home-content ${easy ? 'easy' : ''}`}>
      {notice && <p className="notice">시연용 계좌와 메뉴예요. 실제 잔액 조회·이체는 실행하지 않아요.</p>}
      <div className="season-scene" aria-hidden="true">
        <svg viewBox="0 0 440 150" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#f0f8ff"/><stop offset="1" stopColor="#fff1d8"/></linearGradient></defs>
          <path fill="url(#sky)" d="M0 0h440v150H0z"/><circle cx="335" cy="36" r="21" fill="#ffe9b4"/>
          <path fill="#f2d9c4" d="M0 100 70 40 140 102 210 60 290 101 350 70 440 105v45H0z"/>
          <path fill="#e1d5ba" d="m0 117 115-40 100 40 100-28 125 25v36H0z"/>
          <path fill="#b5dae6" d="M165 120h120l90 30H80z"/><path fill="#f5ce77" d="m0 112 155 8-45 30H0zm440 0-160 8 55 30h105z"/>
          <path stroke="#a3978b" strokeWidth="5" fill="none" d="M142 113h165M157 113v14m25-14v14m25-14v14m25-14v14m25-14v14m25-14v14"/>
          {[25, 65, 102, 355, 398, 430].map((x, i) => <g key={x} transform={`translate(${x},${80 + i % 3 * 9})`}><path stroke="#a07549" strokeWidth="3" d="M0-10v52"/><ellipse rx={i % 2 ? 14 : 20} ry="28" fill={['#efa443', '#f4c35e', '#df8749'][i % 3]}/><path stroke="#a07549" strokeWidth="2" d="M0-10v48m0-15-9-8m9 0 9-9"/></g>)}
        </svg>
      </div>
      <section className="account-card">
        <div className="account-title"><span className="account-mark"><Icon name="accounts"/></span><div><strong>우리길 입출금</strong><small>데모 계좌 · 실제 정보 아님</small></div></div>
        <div className="balance-row"><strong>•••••• 원</strong><button className="primary-button small" onClick={() => setNotice(true)}>이체</button></div>
        <button className="account-shortcut" onClick={onTransfer}><Icon name="calendar"/>이번 달 자동이체 확인하기<Icon name="arrow"/></button>
      </section>
      <button className="secondary-button all-accounts" onClick={() => setNotice(!notice)}>전체계좌 보기</button>
      <button className="ai-entry" onClick={onConsult}><span className="headset-icon"><Icon name="headset"/></span><span><small>은행 업무가 막막할 때</small><strong>우리길 AI 고객센터</strong></span><Icon name="arrow"/></button>
      <h2 className="section-title">추천 서비스</h2>
      <div className="service-grid"><button onClick={onTransfer}><Icon name="calendar"/><span>자동이체 관리</span><span aria-hidden="true">›</span></button><button onClick={onHelp}><Icon name="file"/><span>자주 묻는 질문</span><span aria-hidden="true">›</span></button></div>
      <p className="home-note">복잡한 은행 업무, 어디서 시작할지 함께 찾아요.</p>
    </main>
    <nav className="bottom-nav" aria-label="주 메뉴"><button onClick={() => setNotice(!notice)}><Icon name="accounts"/>전체계좌</button><button className="active" aria-current="page"><Icon name="home"/>홈</button><button onClick={onConsult}><Icon name="headset"/>고객센터</button><button onClick={onHelp}><Icon name="menu"/>도움말</button></nav>
  </>
}

