type Props = { name: 'user' | 'arrow' | 'shield' | 'code' | 'chart' | 'lock' | 'play' | 'pause'; className?: string }
export default function TerminalIcon({ name, className = '' }: Props) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>,
    chart: <><path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    play: <path d="m8 4 12 8-12 8V4Z"/>,
    pause: <path d="M8 4v16M16 4v16"/>,
  }
  return <svg className={'terminal-icon ' + className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
