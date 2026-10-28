import { useEffect, useId, useRef, useState } from 'react'

export function TransferDayPicker({ day, beforeDay, onChange }: { day: number; beforeDay: number; onChange: (day: number) => void }) {
  const [open, setOpen] = useState(false)
  const [popup, setPopup] = useState({ above: false, height: 200 })
  const panelId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    selected.current?.focus({ preventScroll: true })
    if (list.current && selected.current) list.current.scrollTop = selected.current.offsetTop - popup.height / 2 + 22
    const dismiss = () => setOpen(false)
    window.addEventListener('resize', dismiss)
    return () => window.removeEventListener('resize', dismiss)
  }, [open, popup.height])
  function close() { setOpen(false); trigger.current?.focus() }
  function toggle() {
    if (open) { close(); return }
    const bounds = trigger.current?.getBoundingClientRect()
    const screen = trigger.current?.closest('.screen-view')?.getBoundingClientRect()
    if (bounds) {
      const below = Math.min(screen?.bottom ?? window.innerHeight, window.innerHeight) - bounds.bottom - 12
      const above = bounds.top - Math.max(screen?.top ?? 0, 0) - 12
      const useAbove = below < 180 && above > below
      setPopup({ above: useAbove, height: Math.max(44, Math.min(200, useAbove ? above : below)) })
    }
    setOpen(true)
  }

  // 목록을 겹쳐 띄워 레이아웃을 유지하고 화면의 남은 공간에 따라 위·아래로 연다.
  return <div className="transfer-day" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={event => {
    if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <span id={`${panelId}-label`}>이체일</span>
    <small id={`${panelId}-current`}>현재 매월 {beforeDay}일</small>
    <div className="transfer-day-select">
    <button type="button" ref={trigger} className="transfer-day-trigger" aria-label={`이체일 매월 ${day}일`} aria-describedby={`${panelId}-current`} aria-haspopup="listbox" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
      <span>매월 {day}일</span><span className="transfer-day-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div ref={list} id={panelId} className={`transfer-day-options${popup.above ? ' opens-above' : ''}`} style={{ maxHeight: popup.height }} role="listbox" aria-labelledby={`${panelId}-label`}>
      {Array.from({ length: 31 }, (_, index) => index + 1).map(value => <button type="button" role="option" key={value} ref={value === day ? selected : undefined} aria-selected={value === day} onKeyDown={event => {
        const target = event.key === 'ArrowDown' ? Math.min(31, value + 1) : event.key === 'ArrowUp' ? Math.max(1, value - 1) : event.key === 'Home' ? 1 : event.key === 'End' ? 31 : null
        if (target !== null) { event.preventDefault(); (list.current?.children[target - 1] as HTMLElement)?.focus({ preventScroll: true }); (list.current?.children[target - 1] as HTMLElement)?.scrollIntoView?.({ block: 'nearest' }) }
      }} onClick={() => { onChange(value); close() }}>매월 {value}일<span aria-hidden="true">{value === day ? '✓' : ''}</span></button>)}
    </div>}
    </div>
  </div>
}
