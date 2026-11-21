import { useEffect, useState } from 'react'
import TerminalIcon from './TerminalIcon'
const stages = [
  { title: 'ASK', icon: 'user' as const, summary: 'Describe the insight you need in your own words.', detail: 'Your question and the active database schema are sent to Gemini. Result rows are not included in that request.', log: '> your question + selected schema', status: 'INTENT_RECEIVED' },
  { title: 'AI WRITES SQL', icon: 'code' as const, summary: 'Gemini translates your question into a structured query.', detail: 'The response contains a title, a SELECT statement, a chart suggestion, and an explanation. The backend checks its structure before continuing.', log: '> PostgreSQL SELECT generated for your selected tables', status: 'SQL_GENERATED' },
  { title: 'SAFETY CHECK', icon: 'shield' as const, summary: 'SQL is parsed before it can reach the database.', detail: 'Only one SELECT is accepted. Tables and functions must be allowlisted. The query runs in a PostgreSQL READ ONLY transaction with a 3-second deadline and a 1,000-row cap.', log: '> AST: SELECT / tables: selected-only / read-only', status: 'READ_ONLY_VERIFIED' },
  { title: 'ANSWER', icon: 'chart' as const, summary: 'Inspect the SQL, sort your results, or explore a chart.', detail: 'Results return as a table with sorting, pagination, CSV export, and selectable chart metrics. Your recent questions are saved privately under your account.', log: '> actual database rows / table / chart / CSV', status: 'RESULTS_READY' },
]
export default function Architecture({ runKey, paused, onRunQuery }: { runKey: number; paused: boolean; onRunQuery: (question: string) => void }) {
  const [selected, setSelected] = useState(2)
  const [playing, setPlaying] = useState(false)
  useEffect(() => { if (runKey > 0) { setSelected(0); setPlaying(true) } }, [runKey])
  useEffect(() => {
    if (!playing || paused) return
    const timer = setTimeout(() => { if (selected === stages.length - 1) setPlaying(false); else setSelected(selected + 1) }, 1900)
    return () => clearTimeout(timer)
  }, [playing, paused, selected])
  return <section id="architecture" className="section architecture"><div className="section-top"><div><div className="eyebrow">// 02_PIPELINE_ARCHITECTURE</div><h2>Deterministic 4-Stage Execution Vector</h2><p className="section-description">Follow a question from natural language to a checked, read-only result.</p></div><button className="text-action" onClick={() => { if (playing) setPlaying(false); else { setSelected(0); setPlaying(true) } }} disabled={paused}>{playing ? 'PAUSE WALKTHROUGH' : 'PLAY WALKTHROUGH'} <TerminalIcon name={playing ? 'pause' : 'play'}/></button></div>
    <div className="stages">{stages.map((stage, index) => <button type="button" className={'stage stage-button ' + (index === selected ? 'active' : '')} key={stage.title} aria-pressed={selected === index} aria-controls="stage-explanation" onClick={() => { setSelected(index); setPlaying(false) }}><span className="stage-top"><span>[ STAGE_0{index + 1} ]</span><TerminalIcon name={stage.icon}/></span><span className="stage-title">0{index + 1}. {stage.title}</span><span className="stage-copy">{stage.summary}</span><span className="stage-status">&gt; {stage.status}</span></button>)}</div>
    <div className="stage-explanation" id="stage-explanation" aria-live="polite"><div><span className="eyebrow">[ WALKTHROUGH / 0{selected + 1} ]</span><h3>{stages[selected].title}</h3><p>{stages[selected].detail}</p><code>{stages[selected].log}</code><small>Pipeline walkthrough. Connect your database to run a question.</small></div><button className="text-action" onClick={() => onRunQuery('')}>TRY THIS QUESTION ↗</button></div>
  </section>
}
