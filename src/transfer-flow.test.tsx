// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import App from './App'
import { createMockApi } from './mocks/consultation'
import { useConsultation } from './hooks/useConsultation'
import { ApiError } from './types/consultation'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

async function openTransfer(api = createMockApi(0)) {
  Element.prototype.scrollIntoView = vi.fn()
  render(<App api={api} mockMode/>)
  fireEvent.click(screen.getByRole('button', { name: /WON길 AI 고객센터/ }))
  await waitFor(() => expect((screen.getByRole('button', { name: /생활비 보내는 날짜/ }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: /생활비 보내는 날짜/ }))
  fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }))
  fireEvent.click(await screen.findByRole('button', { name: 'AI로 해결하기' }))
  fireEvent.click(screen.getByRole('button', { name: /자동이체 메뉴 열기/ }))
  fireEvent.click(screen.getByRole('button', { name: /생활비 자동이체/ }))
}
function completeDemo() {
  fireEvent.click(screen.getByRole('button', { name: '자동이체 변경하기' }))
  fireEvent.change(screen.getByLabelText(/이체일/), { target: { value: '26' } })
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  fireEvent.click(screen.getByRole('button', { name: '변경하기' }))
}

it('목업 변경은 API 요청 없이 진행하고 상담 종료 후 새 세션은 초기화한다', async () => {
  const api = createMockApi(0)
  const send = vi.spyOn(api, 'sendMessage'), close = vi.spyOn(api, 'endSession'), create = vi.spyOn(api, 'createSession')
  await openTransfer(api)
  fireEvent.click(screen.getByRole('button', { name: '자동이체 변경하기' }))
  fireEvent.change(screen.getByLabelText(/이체일/), { target: { value: '20' } })
  expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText(/이체일/), { target: { value: '25' } })
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  fireEvent.click(screen.getByRole('button', { name: '이전' }))
  expect((screen.getByLabelText(/이체일/) as HTMLSelectElement).value).toBe('25')
  fireEvent.click(screen.getByRole('button', { name: '취소' }))
  expect(screen.getByText('매월 20일 · 300,000원')).toBeTruthy()
  completeDemo()
  expect(screen.getByRole('heading', { name: '변경 완료' })).toBeTruthy()
  expect(screen.getByText('매월 26일')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '변경 내역 보기' }))
  expect(screen.getByRole('heading', { name: '자동이체 상세' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '자동이체 변경하기' })).toBeNull()
  expect(screen.getByText('매월 26일 · 300,000원')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '목록으로' })).toBeNull()
  expect(send).toHaveBeenCalledTimes(1)
  expect(close).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'AI 상담 마무리하기' }))
  await screen.findByRole('heading', { name: '상담을 마쳤어요' })
  expect(close).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByRole('log')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '새 상담 시작' }))
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2))
  expect(close).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('매월 26일')).toBeNull()
})

it('종료 실패 시 완료 화면을 유지하고 명시적으로 재시도하며 중복 종료를 막는다', async () => {
  const api = createMockApi(0)
  const close = vi.spyOn(api, 'endSession').mockRejectedValueOnce(new ApiError('CONNECTION_ERROR', '연결을 확인해 주세요.'))
  await openTransfer(api); completeDemo()
  fireEvent.click(screen.getByRole('button', { name: 'AI 상담 마무리하기' }))
  await screen.findByRole('alert')
  expect(screen.queryByRole('heading', { name: '상담을 마쳤어요' })).toBeNull()
  expect(screen.getByText('매월 26일')).toBeTruthy()
  expect(close).toHaveBeenCalledTimes(1)
  let resolve!: () => void
  close.mockImplementationOnce(() => new Promise<void>(done => { resolve = done }))
  fireEvent.click(screen.getByRole('button', { name: 'AI 상담 마무리하기' }))
  fireEvent.click(screen.getByRole('button', { name: '상담을 종료하고 있어요…' }))
  expect(close).toHaveBeenCalledTimes(2)
  expect((screen.getByRole('button', { name: '상담으로 돌아가기' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => { resolve() })
  await screen.findByRole('heading', { name: '상담을 마쳤어요' })
})

it('이전 세션의 늦은 종료 응답이 새 상담을 지우지 않는다', async () => {
  const api = createMockApi(0)
  let resolve!: () => void
  const { result } = renderHook(() => useConsultation(api, false))
  await act(async () => { await result.current.newConsultation() })
  vi.spyOn(api, 'endSession').mockImplementationOnce(() => new Promise<void>(done => { resolve = done }))
  let finishing!: Promise<boolean>
  act(() => { finishing = result.current.finishConsultation() })
  await act(async () => { await result.current.newConsultation() })
  const current = result.current.sessionId
  await act(async () => { resolve(); expect(await finishing).toBe(false) })
  expect(result.current.sessionId).toBe(current)
  expect(result.current.messages).toHaveLength(1)
})
