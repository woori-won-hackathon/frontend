import { createMockApi } from '../mocks/consultation'
import { createHttpApi } from './http'
export const isMock = (import.meta.env.VITE_API_MODE || 'mock') === 'mock'
if (!['mock', 'api'].includes(import.meta.env.VITE_API_MODE || 'mock')) throw new Error('VITE_API_MODE는 mock 또는 api여야 합니다.')
export const consultationApi = isMock ? createMockApi() : createHttpApi(import.meta.env.VITE_API_BASE_URL || '/api/v1')
