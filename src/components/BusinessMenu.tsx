import { useState } from 'react'
import type { DemoMenu } from '../mocks/consultation'
export function BusinessMenu({ menu, onBack }: { menu: DemoMenu; onBack: () => void }) {
  const [tab, setTab] = useState('transfer')
  return <main className="page-content business-screen" aria-label={menu === 'transfer' ? '자동이체 메뉴 데모' : '카드 분실 안내 데모'}>
    {menu === 'transfer' ? <>
      <div className="business-tabs"><button aria-pressed={tab === 'transfer'} onClick={() => setTab('transfer')}>계좌 간 이체</button><button aria-pressed={tab === 'payment'} onClick={() => setTab('payment')}>자동납부</button></div>
      <details className="demo-account"><summary><strong>데모 출금계좌</strong><small>계좌 정보 미조회</small></summary><p>실제 계좌를 조회하지 않은 시연용 화면이에요.</p></details>
      <h2>{tab === 'transfer' ? '등록된 자동이체' : '자동납부 등록 내역'}</h2>
      {tab === 'transfer' ? <details className="transfer-item"><summary><span><strong>생활비 자동이체</strong><small>매월 20일 · 시연용 내역</small></span><span aria-hidden="true">›</span></summary><p>예시 대상: 엄마 생활비<br/>실제 등록 여부는 확인하지 않았어요.<br/>날짜 변경은 실제 업무 화면에서 진행해 주세요.</p></details> : <p className="empty-state">이 데모에는 자동납부 내역이 없어요.<br/>실제 등록 여부는 조회하지 않았어요.</p>}
      <p className="muted">변경할 내역을 확인하는 메뉴 예시예요.</p>
    </> : <>
      <p className="eyebrow">가상 업무 메뉴</p><h1>카드 분실 안내</h1>
      <section className="demo-account"><strong>데모 카드</strong><p>카드 정보 · 결제 내역 미조회</p></section>
      <p className="notice">실제 분실 신고·이용 정지를 하지 않았어요.</p><p>이 화면은 카드 분실 안내 목업이에요. 실제 업무는 상담 응답에 공식 페이지가 제공된 경우 해당 페이지에서 확인해 주세요.</p>
    </>}
    <button className="secondary-button return-chat" onClick={onBack}>상담으로 돌아가기</button>
    <p className="business-footnote">메뉴 이동 데모 · 실제 조회 / 변경 없음</p>
  </main>
}

