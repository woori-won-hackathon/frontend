// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { createMockApi, EXAMPLE, CARD_EXAMPLE, QUESTION, getMockPresentation } from './mocks/consultation'
import { useConsultation } from './hooks/useConsultation'
import { adaptReply, adaptSession, officialUrl } from './api/adapter'
import { createHttpApi } from './api/http'
import { ApiError, type ConsultationApi, type Reply } from './types/consultation'
import { Composer } from './components/Composer'
import { ResultCard } from './components/ResultCard'
import App from './App'
import { RecommendationScreen } from './components/RecommendationScreen'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const reply = (sessionId: string): Reply => ({ sessionId, responseType: 'GUIDANCE', message: '늦은 응답', recommendations: [], sources: [], summary: null })
describe('가상 상담', () => {
  it('추천 → 동일 세션 일반 안내, 다른 세션은 독립 진행한다', async () => {
    const api = createMockApi(0)
    const first = await api.createSession(), second = await api.createSession()
    expect(first.sessionId).not.toBe(second.sessionId)
    expect((await api.sendMessage(second.sessionId, QUESTION)).responseType).toBe('UNRESOLVED')
    const recommendation = await api.sendMessage(first.sessionId, EXAMPLE)
    expect(recommendation.responseType).toBe('CHANNEL_RECOMMENDATION')
    expect(recommendation.recommendations[0].channelId).toBe('CHATBOT')
    expect(getMockPresentation(recommendation)?.menu).toBe('transfer')
    expect(recommendation.sources).toEqual([])
    expect(recommendation.summary).toContain('고객 진술')
    const guidance = await api.sendMessage(first.sessionId, QUESTION)
    expect(guidance.responseType).toBe('GUIDANCE')
    expect(guidance.recommendations).toEqual([])
    expect(guidance.message).toContain('변경한 날짜가 언제부터 적용되는지')
    expect((await api.sendMessage(first.sessionId, '다른 문의')).responseType).toBe('UNRESOLVED')
  })
  it('카드 문의는 별도 메뉴로 안내하고 세션 종료 후 요청을 거부한다', async () => {
    const api = createMockApi(0), session = await api.createSession()
    const result = await api.sendMessage(session.sessionId, CARD_EXAMPLE)
    expect(result.responseType).toBe('CHANNEL_RECOMMENDATION')
    expect(getMockPresentation(result)?.menu).toBe('card')
    await api.endSession(session.sessionId)
    await expect(api.sendMessage(session.sessionId, CARD_EXAMPLE)).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' })
  })
  it('오류는 성공으로 바꾸지 않고 시나리오 진행을 유지한다', async () => {
    const api = createMockApi(0), session = await api.createSession()
    await expect(api.sendMessage(session.sessionId, '/오류')).rejects.toMatchObject({ code: 'MODEL_TIMEOUT' })
    expect((await api.sendMessage(session.sessionId, EXAMPLE)).responseType).toBe('CHANNEL_RECOMMENDATION')
  })
})
describe('상담 상태 경계', () => {
  it('새 상담 이후 도착한 이전 응답을 무시하고 대화·입력·오류를 초기화한다', async () => {
    let resolveOld!: (value: Reply) => void
    let count = 0
    const api: ConsultationApi = { createSession: async () => ({ sessionId: `session-${++count}`, welcomeMessage: '환영' }), sendMessage: () => new Promise(resolve => { resolveOld = resolve }), endSession: vi.fn().mockResolvedValue(undefined) }
    const { result } = renderHook(() => useConsultation(api))
    await waitFor(() => expect(result.current.sessionId).toBe('session-1'))
    act(() => result.current.setDraft('이전 문의'))
    let sending!: Promise<Reply | null>
    act(() => { sending = result.current.send() })
    await act(async () => { await result.current.newConsultation() })
    await act(async () => { resolveOld(reply('session-1')); await sending })
    expect(result.current.sessionId).toBe('session-2')
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.latest).toBeNull()
    expect(result.current.draft).toBe('')
    expect(result.current.error).toBeNull()
    expect(api.endSession).toHaveBeenCalledWith('session-1')
  })
  it('동기 중복 전송 방지, 오류 입력 보존, 공백 차단', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new ApiError('MODEL_TIMEOUT', '지연', true))
    const api: ConsultationApi = { createSession: async () => ({ sessionId: 'test', welcomeMessage: '환영' }), sendMessage, endSession: async () => {} }
    const { result } = renderHook(() => useConsultation(api))
    await waitFor(() => expect(result.current.pending).toBe(false))
    act(() => result.current.setDraft('   '))
    await act(async () => { await result.current.send() })
    expect(sendMessage).not.toHaveBeenCalled()
    act(() => result.current.setDraft('문의 보존'))
    await act(async () => { await Promise.all([result.current.send(), result.current.send()]) })
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(result.current.draft).toBe('문의 보존')
    expect(result.current.error?.code).toBe('MODEL_TIMEOUT')
    expect(result.current.messages).toHaveLength(1)
    await act(async () => { await result.current.newConsultation() })
    expect(result.current.error).toBeNull()
  })
  it('이전 세션 종료 실패를 알리면서 새 세션은 독립적으로 생성한다', async () => {
    let count = 0
    const api: ConsultationApi = {
      createSession: async () => ({ sessionId: `session-${++count}`, welcomeMessage: '환영' }),
      sendMessage: async id => reply(id),
      endSession: vi.fn().mockRejectedValue(new ApiError('HTTP_503', '종료 실패', true, 503)),
    }
    const { result } = renderHook(() => useConsultation(api))
    await waitFor(() => expect(result.current.sessionId).toBe('session-1'))
    await act(async () => { await result.current.newConsultation() })
    expect(api.endSession).toHaveBeenCalledWith('session-1')
    expect(result.current.sessionId).toBe('session-2')
    expect(result.current.cleanupError).toContain('서버 종료를 확인하지 못했어요')
    expect(result.current.messages).toHaveLength(1)
  })
  it('늦게 생성된 이전 세션과 언마운트된 활성 세션을 종료한다', async () => {
    let resolveOld!: (value: { sessionId: string; welcomeMessage: string }) => void
    const api: ConsultationApi = {
      createSession: vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValue({ sessionId: 'current', welcomeMessage: '환영' }),
      sendMessage: async id => reply(id), endSession: vi.fn().mockResolvedValue(undefined),
    }
    const { result, unmount } = renderHook(() => useConsultation(api))
    await waitFor(() => expect(api.createSession).toHaveBeenCalledTimes(1))
    await act(async () => { await result.current.newConsultation() })
    await act(async () => { resolveOld({ sessionId: 'stale', welcomeMessage: '이전 환영' }) })
    expect(result.current.sessionId).toBe('current')
    expect(api.endSession).toHaveBeenCalledWith('stale')
    unmount()
    expect(api.endSession).toHaveBeenCalledWith('current')
  })
})
describe('입력과 결과 표시', () => {
  it('IME Enter와 Shift+Enter는 전송하지 않고 일반 Enter만 전송한다', () => {
    const send = vi.fn().mockResolvedValue(undefined)
    render(<Composer draft="입력" setDraft={() => {}} disabled={false} send={send}/>)
    const input = screen.getByRole('textbox', { name: '상담 내용' })
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(send).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('추천 없음과 안내 불가를 표시하고 요약을 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<ResultCard reply={{ ...reply('test'), responseType: 'UNRESOLVED', summary: '고객 진술 요약' }}/>)
    expect(screen.getByText('이 문의는 안내하기 어려워요')).toBeTruthy()
    expect(screen.getByText(/현재 응답에는 추천 채널이 없어요/)).toBeTruthy()
    fireEvent.click(screen.getByText('상담 요약 확인'))
    fireEvent.click(screen.getByRole('button', { name: /요약 복사/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('복사했어요'))
    expect(writeText).toHaveBeenCalledWith('고객 진술 요약')
  })
})
describe('앱 시연 흐름', () => {
  it('홈 → 문의 → 별도 추천 화면 → 채팅 → 메뉴 → 같은 대화 → 새 상담', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    const api = createMockApi(0)
    const send = vi.spyOn(api, 'sendMessage')
    const create = vi.spyOn(api, 'createSession')
    render(<App api={api} mockMode/>)
    expect(screen.getByText('우리길 입출금')).toBeTruthy()
    expect(create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /우리길 AI 고객센터/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /생활비 보내는 날짜/ }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: /생활비 보내는 날짜/ }))
    expect((screen.getByRole('textbox', { name: '상담 내용' }) as HTMLTextAreaElement).value).toBe(EXAMPLE)
    expect(screen.queryByRole('button', { name: /빠른 도움말도 볼까요/ })).toBeNull()
    expect(screen.getByRole('button', { name: '자주 묻는 질문' })).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }))
    expect(await screen.findByRole('heading', { name: 'AI로 해결할 수 있어요' })).toBeTruthy()
    expect(screen.queryByRole('log')).toBeNull()
    expect(screen.queryByRole('button', { name: '자동이체 메뉴 열기' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 해결하기' }))
    expect(screen.getByRole('log').textContent).toContain(EXAMPLE)
    expect(send).toHaveBeenCalledTimes(1)
    const helpTrigger = screen.getByRole('button', { name: /빠른 도움말도 볼까요/ })
    expect(screen.getByRole('main').contains(helpTrigger)).toBe(true)
    expect(helpTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: '자주 묻는 질문' })).toBeNull()
    fireEvent.click(helpTrigger)
    expect(helpTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: '자주 묻는 질문' })).toBeTruthy()
    fireEvent.click(helpTrigger)
    fireEvent.click(screen.getByRole('button', { name: /자동이체 메뉴 열기/ }))
    expect(screen.getByRole('main', { name: '자동이체 메뉴 데모' })).toBeTruthy()
    expect(screen.getByText('매월 20일 · 시연용 내역')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByText('매달 26일')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '자동납부' }))
    expect(screen.getByText(/이 데모에는 자동납부 내역이 없어요/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: '상담으로 돌아가기' })[0])
    expect(screen.getByRole('log').textContent).toContain(EXAMPLE)
    fireEvent.click(screen.getByRole('button', { name: /대화 숨기기/ }))
    expect(screen.queryByRole('log')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: '대화 다시 보기' })[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: QUESTION } })
    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }))
    await screen.findByText(/현재 응답에는 추천 채널이 없어요/)
    expect(screen.getByRole('log').textContent).toContain(EXAMPLE)
    expect(send.mock.calls[0][0]).toBe(send.mock.calls[1][0])
    fireEvent.click(screen.getByRole('button', { name: /새 상담/ }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('log')).toBeNull()
    expect(screen.queryByRole('button', { name: /자동이체 메뉴 열기/ })).toBeNull()
  })
  it('카드 문의도 추천 화면을 거친 뒤 분실 안내 메뉴만 표시한다', async () => {
    render(<App api={createMockApi(0)} mockMode/>)
    fireEvent.click(screen.getByRole('button', { name: /우리길 AI 고객센터/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /카드 분실 후 결제 문자/ }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: /카드 분실 후 결제 문자/ }))
    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }))
    fireEvent.click(await screen.findByRole('button', { name: 'AI로 해결하기' }))
    fireEvent.click(screen.getByRole('button', { name: /카드 분실 안내 메뉴 열기/ }))
    expect(screen.getByText('실제 분실 신고·이용 정지를 하지 않았어요.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '신고하기' })).toBeNull()
  })
  it('API 모드에서 메뉴·처리 가능 여부를 추측하지 않고 공식 URL만 표시한다', async () => {
    const api: ConsultationApi = {
      createSession: async () => ({ sessionId: 'server', welcomeMessage: '환영' }),
      sendMessage: async () => adaptReply({ sessionId: 'server', answer: '공식 페이지를 확인하세요.', recommendations: [{ channel: 'CHATBOT', score: 95, processable: false, reasons: ['개별 확인 필요'], officialPageUrl: 'https://spot.wooribank.com/' }], consultationSummary: '고객 진술' }, 'server'),
      endSession: async () => {},
    }
    render(<App api={api} mockMode={false}/>)
    fireEvent.click(screen.getByRole('button', { name: /우리길 AI 고객센터/ }))
    await waitFor(() => expect(screen.getByRole('textbox').hasAttribute('readonly')).toBe(false))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: EXAMPLE } })
    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }))
    fireEvent.click(await screen.findByRole('button', { name: '답변 확인하기' }))
    expect(screen.queryByRole('button', { name: /자동이체 메뉴 열기/ })).toBeNull()
    expect(screen.queryByText('AI로 해결할 수 있어요')).toBeNull()
    expect(screen.getByRole('link', { name: /채널 공식 안내 보기/ }).getAttribute('href')).toBe('https://spot.wooribank.com/')
  })
})

describe('실제 연동 준비', () => {
  it('추천이 세 개면 첫 채널을 강조하고 나머지는 펼친 뒤 응답 순서대로 표시한다', () => {
    const recommendations = ['챗봇/채팅상담', '전화상담', '영업점'].map((name, index) => ({ channelId: `channel-${index}`, name, reason: `${name} 근거`, score: 90 - index, processable: true }))
    const result: Reply = { ...reply('test'), responseType: 'CHANNEL_RECOMMENDATION', recommendations }
    render(<RecommendationScreen reply={result} query="문의" mockMode={false} onContinue={() => {}}/>)
    expect(screen.getByRole('heading', { name: '챗봇/채팅상담' })).toBeTruthy()
    expect(screen.queryByText('전화상담')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /다른 상담 방법 선택하기/ }))
    const others = screen.getByRole('region', { name: '다른 상담 방법' })
    expect([...others.querySelectorAll('article strong')].map(node => node.textContent)).toEqual(['전화상담', '영업점'])
    fireEvent.click(screen.getByRole('button', { name: /다른 상담 방법 선택하기/ }))
    expect(screen.queryByRole('region', { name: '다른 상담 방법' })).toBeNull()
  })
  it('누락된 선택 필드를 정규화하고 응답 세션·출처를 검증한다', () => {
    const raw = { sessionId: 'test', answer: '안내' }
    expect(adaptReply(raw, 'test')).toMatchObject({ recommendations: [], sources: [], summary: null })
    expect(() => adaptReply(raw, 'other')).toThrow()
    for (const url of ['javascript:alert(1)', 'http://spot.wooribank.com', 'https://spot.wooribank.com.evil.com', 'https://user:pass@spot.wooribank.com', 'https://spot.wooribank.com:444']) expect(officialUrl(url)).toBeNull()
    expect(adaptReply({ ...raw, officialPageUrl: 'https://evil.com' }, 'test').sources).toEqual([])
  })
  it('HTTP 실패를 mock으로 대체하지 않고 v1 계약대로 요청한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'MODEL_TIMEOUT', message: '답변이 지연되고 있습니다.', retryable: true }), { status: 504 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(createHttpApi().sendMessage('session-a', '문의')).rejects.toMatchObject({ code: 'MODEL_TIMEOUT', retryable: true })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/consultations/session-a/messages')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ message: '문의' }))
  })
  it('세션 생성은 본문 없이 201, 종료는 본문 없이 DELETE 204로 처리한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sessionId: 'test' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const api = createHttpApi()
    expect(await api.createSession()).toMatchObject({ sessionId: 'test' })
    await expect(api.endSession('test')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/consultations')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/consultations/test')
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined()
    expect(adaptSession({ sessionId: 'test' }).welcomeMessage).toBeTruthy()
  })
  it('answer·채널 메타데이터·요약·공식 URL을 변환하고 화면에 표시한다', async () => {
    const raw = {
      sessionId: 'test', answer: '채널 안내',
      recommendations: [{ channel: 'CHATBOT', score: 95, processable: false, reasons: ['서버에서 제공한 근거', '별도 확인 필요'], officialPageUrl: 'https://spot.wooribank.com/' }],
      consultationSummary: '고객 진술 요약', officialPageUrl: 'https://www.wooribank.com/',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(raw), { status: 200 })))
    const result = await createHttpApi().sendMessage('test', '문의')
    expect(result).toMatchObject({ message: raw.answer, responseType: 'CHANNEL_RECOMMENDATION', summary: raw.consultationSummary })
    expect(result.recommendations[0]).toMatchObject({ channelId: 'CHATBOT', score: 95, processable: false, reasons: raw.recommendations[0].reasons })
    render(<ResultCard reply={result}/>)
    expect(screen.getByText('챗봇/채팅상담')).toBeTruthy()
    expect(screen.getByText('불가')).toBeTruthy()
    expect(screen.getByText('추천 점수: 95')).toBeTruthy()
    expect(screen.getByText('별도 확인 필요')).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(2)
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })
  it('서버에 없는 응답 분류·알 수 없는 채널 이름·처리 가능 여부를 추측하지 않는다', () => {
    const raw = { sessionId: 'test', answer: '추가 질문처럼 보이는 문장인가요?' }
    expect(adaptReply(raw, 'test').responseType).toBe('GUIDANCE')
    const recommendation = { channel: 'UNCONFIRMED_CHANNEL', score: 1, processable: false, reasons: [], officialPageUrl: null }
    const result = adaptReply({ ...raw, recommendations: [recommendation] }, 'test')
    expect(result.recommendations[0]).toMatchObject({ name: 'UNCONFIRMED_CHANNEL', processable: false, officialPageUrl: null })
    expect(() => adaptReply({ ...raw, recommendations: [{ ...recommendation, processable: 'true' }] }, 'test')).toThrow()
    expect(() => adaptReply({ ...raw, recommendations: [{ ...recommendation, score: '95' }] }, 'test')).toThrow()
  })
  it.each([400, 404, 409, 500, 502, 503])('오류 본문이 JSON이 아니어도 HTTP %i를 보존한다', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not JSON', { status })))
    await expect(createHttpApi().sendMessage('test', '문의')).rejects.toMatchObject({ code: `HTTP_${status}`, status, retryable: status >= 500 })
  })
  it('성공 응답의 잘못된 JSON과 네트워크 실패를 구분한다', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('Not JSON', { status: 200 })).mockRejectedValueOnce(new TypeError('Network error'))
    vi.stubGlobal('fetch', fetchMock)
    const api = createHttpApi()
    await expect(api.sendMessage('test', '문의')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(api.sendMessage('test', '문의')).rejects.toMatchObject({ code: 'CONNECTION_ERROR' })
  })
})

