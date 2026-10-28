// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TransferDayPicker } from './TransferDayPicker'
import { useState } from 'react'

afterEach(cleanup)

function Picker() {
  const [day, setDay] = useState(26)
  return <TransferDayPicker day={day} beforeDay={20} onChange={setDay}/>
}

it('선택 패널에서 월말 날짜를 선택하면 값과 포커스를 갱신하고 닫는다', () => {
  render(<Picker/>)
  const trigger = screen.getByRole('button', { name: '이체일 매월 26일' })
  fireEvent.click(trigger)
  expect(screen.getAllByRole('option', { name: /^매월 \d+일$/ })).toHaveLength(31)
  expect(document.activeElement).toBe(screen.getByRole('option', { name: '매월 26일' }))
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(screen.getByRole('option', { name: '매월 27일' }))
  fireEvent.click(screen.getByRole('option', { name: '매월 31일' }))
  expect(screen.getByRole('button', { name: '이체일 매월 31일' })).toBe(trigger)
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})

it('Escape로 닫으면 날짜를 유지하고 다시 열어도 선택 상태가 유지된다', () => {
  render(<Picker/>)
  const trigger = screen.getByRole('button', { name: '이체일 매월 26일' })
  fireEvent.click(trigger)
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(trigger)
  fireEvent.click(trigger)
  expect(screen.getByRole('option', { name: '매월 26일' }).getAttribute('aria-selected')).toBe('true')
})
