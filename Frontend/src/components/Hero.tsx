import TypingLine from './TypingLine'
import TerminalIcon from './TerminalIcon'
type Props = { databaseName: string; onOpenWorkspace: () => void; onWatchArchitecture: () => void; paused: boolean; connected: boolean; aiConfigured: boolean }
export default function Hero({ databaseName, onOpenWorkspace, onWatchArchitecture, paused, connected, aiConfigured }: Props) {
  return <section id="top" className="hero" aria-labelledby="hero-title">
    <div className="hero-aura" aria-hidden="true"/>
    <div className="matrix" aria-hidden="true">{['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'LIMIT'].map((word, i) => <div key={word}><span>{word}</span><span>{['DATABASE', 'INNER_JOIN', 'POSTGRESQL', 'AST_CHECK', 'EXPLAIN', '1000'][i]}</span><span>{['SCHEMA', 'STRICT_MODE', 'READ_ONLY', 'SEMANTIC_LAYER', '', ''][i]}</span><span>{['QUERY_WORKER', 'VALIDATION', 'TOKEN_INTENT', 'GEMINI', 'ANALYTICS', ''][i]}</span><span>{['SELECT', 'SCHEMA', 'EXECUTION', 'RESULTS', 'READ_ONLY', ''][i]}</span></div>)}</div>
    <div className="hero-content"><div className="status-badge"><span className={connected ? 'dot' : 'offline-dot'}/>{connected ? 'SYSTEM ONLINE / READ-ONLY QUERY MODE' : 'LOCAL WORKSPACE / START BACKEND TO CONNECT'}</div>
      <h1 id="hero-title">ASK YOUR DATABASE.<br/>IN PLAIN ENGLISH<span className="cursor">_</span></h1>
      <p>No SQL. No waiting. Your questions, translated into insight.</p>
      <TypingLine paused={paused}/>
      <div className="hero-buttons"><button className="button primary" onClick={onOpenWorkspace}>TRY IT NOW <TerminalIcon name="arrow"/></button><button className="button secondary" onClick={onWatchArchitecture}><TerminalIcon name="play"/> WATCH ARCHITECTURE</button></div>
      <div className="system-strip"><span>ENGINE: <b>{aiConfigured ? 'GEMINI AI' : 'SAMPLE TEMPLATES'}</b></span><span>PERMISSIONS: <b>READ-ONLY</b></span><span>DATABASE: <strong>{databaseName}</strong></span></div>
      <a className="scroll-prompt" href="#demo"><span>SCROLL TO EXPLORE</span><span aria-hidden="true">↓</span></a>
    </div>
  </section>
}
