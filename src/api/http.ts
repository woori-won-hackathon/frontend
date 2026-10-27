import { ApiError, type ConsultationApi } from '../types/consultation'
import type { ConsultationMessageRequest } from '../types/api'
import { adaptReply, adaptSession } from './adapter'

const statusMessages: Record<number, string> = {
  400: '입력 내용을 확인한 뒤 다시 보내 주세요.',
  404: '상담 세션을 찾을 수 없어요. 새 상담을 시작해 주세요.',
  409: '종료된 상담이에요. 새 상담을 시작해 주세요.',
  502: 'AI 또는 외부 서비스 응답에 문제가 있어요. 잠시 후 직접 다시 시도해 주세요.',
  503: 'AI 또는 외부 서비스를 일시적으로 이용할 수 없어요. 잠시 후 직접 다시 시도해 주세요.',
  500: '서버에서 요청을 처리하지 못했어요. 잠시 후 직접 다시 시도해 주세요.',
}
export function createHttpApi(base = '/api/v1'): ConsultationApi {
  const request = async (path: string, method: 'POST' | 'DELETE', expectedStatus: number, body?: ConsultationMessageRequest, signal?: AbortSignal): Promise<unknown> => {
    const controller = new AbortController()
    const cancel = () => controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) controller.abort()
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 20000)
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        method, signal: controller.signal,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      })
      if (!response.ok) {
        // Error body is not specified by the contract; preserve status even for empty/non-JSON bodies.
        const data: unknown = await response.json().catch(() => null)
        const error = data && typeof data === 'object' ? data as Record<string, unknown> : null
        throw new ApiError(
          typeof error?.code === 'string' ? error.code : `HTTP_${response.status}`,
          typeof error?.message === 'string' && error.message.trim() ? error.message : statusMessages[response.status] || '요청을 처리하지 못했어요.',
          response.status >= 500, response.status,
        )
      }
      if (response.status !== expectedStatus) throw new ApiError('INVALID_RESPONSE', '서버 응답 상태가 합의된 API 계약과 달라요.')
      if (expectedStatus === 204) return undefined
      try { return await response.json() }
      catch { throw new ApiError('INVALID_RESPONSE', '서버에서 올바른 JSON 응답을 받지 못했어요.') }
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      throw new ApiError(timedOut ? 'TIMEOUT' : 'CONNECTION_ERROR', timedOut ? '응답 시간이 초과되었어요. 입력을 확인한 뒤 직접 다시 시도해 주세요.' : '서버에 연결하지 못했어요. 입력을 확인한 뒤 직접 다시 시도해 주세요.', true)
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel) }
  }
  return {
    createSession: async signal => adaptSession(await request('/consultations', 'POST', 201, undefined, signal)),
    sendMessage: async (sessionId, message, signal) => adaptReply(await request(`/consultations/${encodeURIComponent(sessionId)}/messages`, 'POST', 200, { message }, signal), sessionId),
    endSession: async (sessionId, signal) => { await request(`/consultations/${encodeURIComponent(sessionId)}`, 'DELETE', 204, undefined, signal) },
  }
}
