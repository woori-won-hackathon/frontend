import { useEffect, useRef, useState } from 'react'
import type { DemoTransfer } from '../mocks/transfers'

type Step = 'list' | 'detail' | 'edit' | 'confirm' | 'complete'
interface Props {
  transfer: DemoTransfer
  onChange: (day: number) => void
  onBack: () => void
  onFinish: () => void
  finishing: boolean
  finishError?: string
}
export function TransferDemo({ transfer, onChange, onBack, onFinish, finishing, finishError }: Props) {
  const [step, setStep] = useState<Step>('list')
  const [tab, setTab] = useState('transfer')
  const [day, setDay] = useState(26)
  const [beforeDay, setBeforeDay] = useState(transfer.day)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus(); heading.current?.scrollIntoView?.({ block: 'start' }) }, [step])
  const title = { list: '등록된 자동이체', detail: '자동이체 상세', edit: '자동이체 변경', confirm: '변경 내용 확인', complete: '변경 완료 · 체험' }[step]
  function edit() { setBeforeDay(transfer.day); setDay(transfer.day === 26 ? 27 : 26); setStep('edit') }
  function commit() { onChange(day); setStep('complete') }
  const rows = <dl className="transfer-rows"><div><dt>받는 분</dt><dd>{transfer.recipient}</dd></div><div><dt>출금계좌</dt><dd>{transfer.source}</dd></div><div><dt>받는 계좌</dt><dd>{transfer.destination}</dd></div><div><dt>이체금액</dt><dd>{transfer.amount}</dd></div><div><dt>이체주기</dt><dd>매월</dd></div></dl>
  return <main className="page-content business-screen transfer-demo" aria-label="자동이체 메뉴 데모">
    {step === 'list' && <div className="business-tabs"><button aria-pressed={tab === 'transfer'} onClick={() => setTab('transfer')}>계좌 간 이체</button><button aria-pressed={tab === 'payment'} onClick={() => setTab('payment')}>자동납부</button></div>}
    <p className="eyebrow">가상 업무 체험</p>
    <h1 ref={heading} tabIndex={-1}>{step === 'list' ? '등록된 자동이체' : title}</h1>
    {step === 'list' ? <>
      <section className="transfer-account"><small>출금계좌 · 가상 데이터</small><strong>{transfer.source}</strong></section>
      {tab === 'transfer' ? <button className="transfer-select" onClick={() => setStep('detail')}><span><strong>생활비 자동이체</strong><span>{transfer.title} · {transfer.destination.split(' · ')[0]}</span><b>{transfer.amount}</b><small>매월 {transfer.day}일 · 시연용 내역</small></span><span aria-hidden="true">›</span></button> : <p className="empty-state">이 데모에는 자동납부 내역이 없어요.<br/>실제 등록 여부는 조회하지 않았어요.</p>}
      <p className="muted">변경할 자동이체를 선택해 주세요.</p>
      <button className="secondary-button return-chat" onClick={onBack}>상담으로 돌아가기</button>
    </> : step === 'detail' ? <>
      <section className="transfer-account"><strong>{transfer.title}</strong><span>매월 {transfer.day}일 · {transfer.amount}</span></section>{rows}
      <dl className="transfer-rows"><div><dt>이체일</dt><dd>{transfer.day}일</dd></div></dl>
      <button className="primary-button" onClick={edit}>자동이체 변경하기</button><button className="text-button" onClick={() => setStep('list')}>목록으로</button>
    </> : step === 'edit' ? <>
      <ol className="transfer-progress" aria-label="변경 단계"><li aria-current="step">1 정보 입력</li><li>2 내용 확인</li></ol>
      <section className="transfer-account"><strong>{transfer.title} · {transfer.amount}</strong><span>받는 분 {transfer.recipient} · {transfer.destination.split(' · ')[0]}</span></section>
      <label className="transfer-day" htmlFor="transfer-day">이체일<small>현재 매월 {beforeDay}일</small><select id="transfer-day" value={day} onChange={event => setDay(Number(event.target.value))}>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>매월 {index + 1}일</option>)}</select></label>
      <p className="muted">변경할 날짜를 선택해 주세요.</p><p className="notice">받는 분·계좌·금액은 가상 데이터로 고정돼요.</p>
      <div className="transfer-actions"><button className="secondary-button" onClick={() => setStep('detail')}>취소</button><button className="primary-button" disabled={day === beforeDay} onClick={() => setStep('confirm')}>다음</button></div>
    </> : step === 'confirm' ? <>
      <ol className="transfer-progress" aria-label="변경 단계"><li>1 정보 입력</li><li aria-current="step">2 내용 확인</li></ol><h2>이렇게 변경할까요?</h2>
      <section className="transfer-comparison"><small>이체일</small><strong>매월 {beforeDay}일 <span aria-hidden="true">→</span> <em>매월 {day}일</em></strong></section>{rows}
      <p className="notice">체험용 데이터만 변경돼요.</p><div className="transfer-actions"><button className="secondary-button" onClick={() => setStep('edit')}>이전</button><button className="primary-button" onClick={commit}>변경하기</button></div>
    </> : <>
      <section className="transfer-success"><span aria-hidden="true">✓</span><strong>목업 데이터의 이체일을 변경했어요.</strong></section>
      <section className="transfer-account"><strong>{transfer.title}</strong><dl className="transfer-rows"><div><dt>변경 전</dt><dd>매월 {beforeDay}일</dd></div><div><dt>변경 후</dt><dd>매월 {transfer.day}일</dd></div><div><dt>이체금액</dt><dd>{transfer.amount}</dd></div><div><dt>받는 분</dt><dd>{transfer.recipient}</dd></div></dl></section>
      <p className="notice">실제 계좌의 자동이체는 변경되지 않았어요.</p>
      {finishError && <div className="error" role="alert"><strong>상담 종료를 확인하지 못했어요</strong><p>{finishError}</p><p>아래 버튼으로 다시 시도해 주세요.</p></div>}
      <button className="primary-button" disabled={finishing} onClick={onFinish}>{finishing ? '상담을 종료하고 있어요…' : 'AI 상담 마무리하기'}</button>
      {finishing && <p role="status">상담 종료를 확인하고 있어요.</p>}
      <button className="text-button" disabled={finishing} onClick={() => setStep('detail')}>변경 내역 보기</button>
    </>}
    <p className="business-footnote">가상 데이터 체험 · 실제 금융거래 없음</p>
  </main>
}
