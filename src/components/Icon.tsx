import type { CSSProperties } from 'react'
type Name = 'home' | 'chat' | 'arrow' | 'back' | 'calendar' | 'file' | 'menu' | 'bell' | 'headset' | 'accounts'
const paths: Record<Name, string> = {
  home: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  chat: 'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0ZM7 11h.01M12 11h.01M17 11h.01',
  arrow: 'm9 5 7 7-7 7', back: 'm15 5-7 7 7 7',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2ZM7 2v6M17 2v6M3 11h18M7 15h2M13 15h2',
  file: 'M6 2h8l4 4v16H6ZM14 2v5h4M9 11h6M9 15h6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  bell: 'M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3ZM10 21h4',
  headset: 'M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v7h4v-7ZM20 12h2v7h-4v-7ZM20 19q0 3-7 3',
  accounts: 'M3 7h18v14H3ZM8 7V3h8v4M8 12h8M8 16h4',
}
export function Icon({ name, style }: { name: Name; style?: CSSProperties }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]}/></svg>
}

