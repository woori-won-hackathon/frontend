import { ApiError, type ConsultationApi, type Reply } from '../types/consultation'

export const EXAMPLE = '월급날이 25일로 바뀌어서, 엄마한테 매달 20일에 생활비 보내던 걸 26일로 바꾸고 싶어.'
export const CARD_EXAMPLE = '카드 잃어버렸는데 결제 문자가 왔어.'
export const QUESTION = '변경 전에 뭘 확인하면 되나요?'
export type DemoMenu = 'transfer' | 'card'
interface MockPresentation { menu: DemoMenu; intent: string; detail: string; actionLabel: string }
// Only mock responses carry local menu metadata. The HTTP contract is unchanged.
const presentations = new WeakMap<Reply, MockPresentation>()
export const DEMO_MENUS: Record<DemoMenu, MockPresentation> = {
  transfer: { menu: 'transfer', intent: '생활비 이체일 변경', detail: '변경 희망 · 매달 20일 → 26일', actionLabel: '자동이체 메뉴 열기' },
  card: { menu: 'card', intent: '카드 분실 및 결제 문자 문의', detail: '고객 진술 · 카드 분실 후 결제 문자 수신', actionLabel: '카드 분실 안내 메뉴 열기' },
}
export const getMockPresentation = (reply: Reply | null) => reply ? presentations.get(reply) ?? null : null
const normalize = (text: string) => text.replace(/[.!?。,]/g, '').replace(/\s+/g, '').trim()
export function createMockApi(delay = 900): ConsultationApi {
  const sessions = new Map<string, DemoMenu | null>()
  const pause = (signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, delay)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
  return {
    async createSession(signal) {
      await pause(signal)
      const sessionId = crypto.randomUUID()
      sessions.set(sessionId, null)
      return { sessionId, welcomeMessage: '안녕하세요, 우리길이에요. 상황에 맞는 다음 단계를 안내해 드릴게요.' }
    },
    async endSession(sessionId) { sessions.delete(sessionId) },
    async sendMessage(sessionId, message, signal) {
      await pause(signal)
      if (!sessions.has(sessionId)) throw new ApiError('SESSION_NOT_FOUND', '새 상담을 시작해 주세요.')
      if (message.trim() === '/오류') throw new ApiError('MODEL_TIMEOUT', '답변이 지연되고 있어요. 입력을 확인한 뒤 직접 다시 전송해 주세요.', true)
      const base: Reply = { sessionId, responseType: 'UNRESOLVED', message: '이 가상 체험은 생활비 자동이체 날짜 변경과 카드 분실 예시만 지원해요. 예시 문장을 입력해 주세요. 실제 AI 판단이나 금융 업무는 실행하지 않아요.', recommendations: [], sources: [], summary: null }
      const scenario = normalize(message) === normalize(EXAMPLE) ? 'transfer' : normalize(message) === normalize(CARD_EXAMPLE) ? 'card' : null
      if (scenario) {
        sessions.set(sessionId, scenario)
        const transfer = scenario === 'transfer'
        const reason = transfer ? '생활비를 보내는 날짜를 바꾸려는 문의예요. AI 안내에서 자동이체 조회·변경 메뉴를 찾을 수 있어요.' : '카드를 잃어버리고 결제 문자를 받았다는 문의예요. 카드 분실 관련 메뉴를 확인하도록 안내해요.'
        const result: Reply = { ...base, responseType: 'CHANNEL_RECOMMENDATION',
          message: transfer ? '생활비를 보내는 날짜를 바꾸고 싶으시군요.\n아래 버튼으로 자동이체 메뉴를 열고, 등록 내역을 확인해 주세요. 변경 가능 여부와 적용 시점은 해당 업무 화면에서 확인해야 해요.' : '카드 분실 후 결제 문자를 받으셨다고 말씀하셨어요.\n아래 버튼으로 카드 분실 안내 메뉴를 확인할 수 있어요. 이 프로토타입은 실제 분실 신고나 결제 확인을 하지 않아요.',
          recommendations: [{ channelId: 'CHATBOT', name: '챗봇/채팅상담', score: 95, processable: true, reason, reasons: [reason] }],
          summary: transfer ? '월급날 변경으로 엄마에게 보내는 생활비 이체일을 매달 20일에서 26일로 변경하고 싶다는 고객 진술. 등록 내역, 변경 가능 여부와 적용 시점은 미확인. 자동이체 메뉴로 안내했으며 실제 변경은 하지 않음.' : '카드를 잃어버린 후 결제 문자를 받았다는 고객 진술. 카드 분실 안내 메뉴로 안내했으며 실제 신고·결제 조회는 하지 않음.',
        }
        presentations.set(result, DEMO_MENUS[scenario])
        return result
      }
      if (sessions.get(sessionId) === 'transfer' && normalize(message) === normalize(QUESTION)) {
        const result: Reply = { ...base, responseType: 'GUIDANCE', message: '업무 화면에서 확인해 주세요.\n• 변경하려는 자동이체 내역이 맞는지\n• 26일로 변경할 수 있는지\n• 변경한 날짜가 언제부터 적용되는지\n이 체험에서는 실제 조회나 변경을 하지 않아요.', summary: '자동이체 변경 전 확인할 내용을 문의한 고객 진술. 대상 내역·변경 가능 여부·적용 시점 확인이 필요함.' }
        presentations.set(result, DEMO_MENUS.transfer)
        return result
      }
      return base
    },
  }
}

