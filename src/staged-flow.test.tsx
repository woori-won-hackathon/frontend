// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { adaptReply } from './api/adapter'
import type { ConsultationApi } from './types/consultation'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('모든 추천을 펼쳐 보여주고 첫 채널만 활성화하며 업무 카드는 요약과 버튼만 보여준다', async () => {
  Element.prototype.scrollIntoView = vi.fn()
  const response = adaptReply({
    sessionId: 'staged', responseType: 'CHANNEL_RECOMMENDATION',
    answer: '상담 방법을 선택해 주세요.', consultationSummary: '생활비 자동이체 날짜 변경',
    guidance: '공식 자동이체 화면에서 등록된 내역을 선택하세요.',
    recommendations: [
      { channel: 'CHATBOT', rank: 1, score: 87, processable: true, reasons: ['이용 방법과 메뉴 안내 가능'] },
      { channel: 'EMAIL', rank: 2, score: 76, processable: true, reasons: ['나중에 답변받기 가능'] },
      { channel: 'PHONE', rank: 3, score: 74, processable: true, reasons: ['상담원과 통화 가능'] },
    ], actions: [{ menuId: 'AUTO_TRANSFER', label: '자동이체 메뉴 열기', demo: true }],
  }, 'staged')
  const sendMessage = vi.fn(async () => response)
  const api: ConsultationApi = {
    createSession: async () => ({ sessionId: 'staged', welcomeMessage: '안녕하세요' }),
    sendMessage, endSession: async () => {},
  }
  render(<App api={api} mockMode={false}/> )
  fireEvent.click(screen.getByRole('button', { name: /우리길 AI 고객센터/ }))
  await waitFor(() => expect(screen.getByRole('textbox').hasAttribute('readonly')).toBe(false))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '자동이체 날짜 바꾸는 방법' } })
  fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }))
  await screen.findByRole('button', { name: 'AI로 해결하기' })
  expect(screen.queryByText(/공식 자동이체 화면에서/)).toBeNull()
  expect(screen.queryByRole('button', { name: /자동이체 메뉴 열기/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /다른 상담 방법 선택하기/ })).toBeNull()
  expect(screen.getByText('2순위 · 참고')).toBeTruthy()
  expect(screen.getByText('3순위 · 참고')).toBeTruthy()
  expect((screen.getByRole('button', { name: '전화 상담 선택하기' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: '이메일 상담 선택하기' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'AI로 해결하기' }))
  expect(screen.getByRole('button', { name: /자동이체 메뉴 열기/ })).toBeTruthy()
  expect(screen.queryByText(/공식 자동이체 화면에서/)).toBeNull()
  expect(screen.getByText('생활비 자동이체 날짜 변경')).toBeTruthy()
  expect(screen.queryByText(/추천 점수/)).toBeNull()
  expect(sendMessage).toHaveBeenCalledTimes(1)
})

it('동점 순위는 서버 값을 유지하고 잘못된 순위는 거부한다', () => {
  const payload = { sessionId: 's', answer: '선택', recommendations: [
    { channel: 'PHONE', rank: 1, score: 80, processable: true, reasons: [] },
    { channel: 'EMAIL', rank: 1, score: 80, processable: true, reasons: [] },
  ] }
  expect(adaptReply(payload, 's').recommendations.map(item => item.rank)).toEqual([1, 1])
  expect(() => adaptReply({ ...payload, recommendations: [{ ...payload.recommendations[0], rank: -1 }] }, 's')).toThrow()
})
