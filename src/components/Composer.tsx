import { useRef, type FormEvent, type KeyboardEvent } from 'react'
interface Props { draft: string; setDraft: (value: string) => void; disabled: boolean; send: () => Promise<unknown>; submitLabel?: string; expanded?: boolean }
export function Composer({ draft, setDraft, disabled, send, submitLabel, expanded = false }: Props) {
  const composing = useRef(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (!disabled) void send() }
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); if (!disabled) void send() }
  }
  return <form className={`composer ${expanded ? 'composer-expanded' : ''}`} onSubmit={submit}>
    <label className="sr-only" htmlFor="message">상담 내용</label>
    <div className="input-row"><textarea id="message" placeholder="궁금한 내용을 입력해 주세요" value={draft} readOnly={disabled} rows={2} onChange={e => setDraft(e.target.value)} onKeyDown={keyDown} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} /><button className={`send-button ${submitLabel ? 'with-label' : ''}`} type="submit" disabled={disabled || !draft.trim()} aria-label="메시지 전송"><span className={submitLabel ? '' : 'send-label'}>{submitLabel || '전송'}</span><span aria-hidden="true">↑</span></button></div>
    <div className={`input-hint ${expanded ? 'tip-notice' : ''}`}><span>{expanded && <strong className="tip-label">TIP</strong>}주민등록번호, 계좌번호 등 민감정보는 입력하지 마세요.</span><span>Enter 전송 · Shift+Enter 줄바꿈</span></div>
  </form>
}
