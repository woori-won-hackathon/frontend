import type { DemoMenu } from '../mocks/consultation'
import type { DemoTransfer } from '../mocks/transfers'
import { TransferDemo } from './TransferDemo'

interface Props {
  menu: DemoMenu
  onBack: () => void
  transfer: DemoTransfer
  onChange: (day: number) => void
  onFinish: () => void
  finishing: boolean
  finishError?: string
}
export function BusinessMenu({ menu, ...props }: Props) {
  if (menu === 'transfer') return <TransferDemo {...props}/>
  return <main className="page-content business-screen" aria-label="카드 분실 안내 데모">
    <p className="eyebrow">가상 업무 메뉴</p><h1>카드 분실 안내</h1>
    <section className="demo-account"><strong>데모 카드</strong><p>카드 정보 · 결제 내역 미조회</p></section>
    <p className="notice">실제 분실 신고·이용 정지를 하지 않았어요.</p><p>이 화면은 카드 분실 안내 목업이에요. 실제 업무는 상담 응답에 공식 페이지가 제공된 경우 해당 페이지에서 확인해 주세요.</p>
    <button className="secondary-button return-chat" onClick={props.onBack}>상담으로 돌아가기</button>
  </main>
}
