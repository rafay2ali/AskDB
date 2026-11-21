import { useEffect, useRef, useState } from 'react'
import TerminalIcon from './TerminalIcon'
type Props = { onOpenWorkspace: () => void; paused: boolean; onToggleMotion: () => void; connected: boolean }
export default function Header({ onOpenWorkspace, paused, onToggleMotion, connected }: Props) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function outside(event: PointerEvent) { if (!menuRef.current?.contains(event.target as Node)) setMenu(false) }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') setMenu(false) }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  return <header className="topbar">
    <a className="brand" href="#top">ASKDB<span className="cursor">_</span> <small>v2 / PLATFORM</small></a>
    <nav aria-label="Main navigation"><a href="#architecture">[ HOW IT WORKS ]</a><a href="#security">[ SECURITY ]</a><a href="#demo">[ CONNECT ]</a><a href="#capabilities">[ FEATURES ]</a></nav>
    <div className="nav-actions"><button className="launch-small" onClick={onOpenWorkspace}>Launch app</button><div className="header-menu" ref={menuRef}><button className="avatar" aria-label="Workspace options" aria-expanded={menu} aria-controls="workspace-options" onClick={() => setMenu(value => !value)}><TerminalIcon name="user"/></button>{menu && <div className="header-dropdown" id="workspace-options"><span className="menu-status"><span className={connected ? 'dot' : 'offline-dot'}/>{connected ? 'BACKEND CONNECTED' : 'BACKEND UNAVAILABLE'}</span><button onClick={() => { setMenu(false); onOpenWorkspace() }}>Open query workspace <span>↗</span></button><a href="#demo" onClick={() => setMenu(false)}>Connect your database <span>↘</span></a><button onClick={onToggleMotion}>{paused ? 'Resume animations' : 'Pause animations'}<TerminalIcon name={paused ? 'play' : 'pause'}/></button><p>In the workspace:<br/>Ctrl + Enter to run · Esc to close</p></div>}</div></div>
  </header>
}
