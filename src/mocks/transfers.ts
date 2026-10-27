// Fictional business data, independent of the AI's interpretation and real banking APIs.
export interface DemoTransfer {
  title: string
  recipient: string
  source: string
  destination: string
  amount: string
  day: number
}
export function initialDemoTransfer(): DemoTransfer {
  return { title: '엄마 생활비', recipient: '엄마', source: '우리은행 · •••• 1234', destination: '농협은행 · •••• 5678', amount: '300,000원', day: 20 }
}
