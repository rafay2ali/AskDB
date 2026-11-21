import { useState } from 'react'
const features = [
  ['Inspect the generated SQL', 'See the query and calculation explanation behind every result.', 'Open a question in the workspace, run it, and use Copy SQL. Every generated statement is visible before you export results.'],
  ['Explore charts & metrics', 'Turn returned rows into a chart and choose the values to compare.', 'The chart view lets you select a label column and a numeric metric. Choose a numeric column from your actual results.'],
  ['Search your query history', 'Find recent questions saved privately under your account.', 'Filter the recent questions in your account workspace, then reopen one to run it again.'],
  ['Browse the actual schema', 'Know which tables and columns are available to the query engine.', 'Choose tables from your own PostgreSQL schemas. Only those tables are available in your workspace and in generated SQL.'],
  ['Export useful results', 'Download sorted query results as a CSV file.', 'Run a question, choose the Table view, sort by a column heading, then select Export CSV. It exports every returned row, not just the current page.'],
]
export default function Capabilities({ onRunQuery }: { onRunQuery: (question: string) => void }) {
  const [active, setActive] = useState<number | null>(0)
  const [limits, setLimits] = useState(false)
  function toggle(index: number) { setActive(active === index ? null : index) }
  return <section id="capabilities" className="section capabilities"><div className="section-top"><div><div className="eyebrow">// 03_SYSTEM_CAPABILITIES</div><h2>Your Data. Your Command Center.</h2></div><span className="meta">CLICK A CAPABILITY TO EXPLORE</span></div><div className="features-grid"><div className="feature-list">{features.map(([title, text, detail], index) => <article key={title} className={active === index ? 'feature-expanded' : ''}><button className="feature-toggle" aria-expanded={active === index} aria-controls={'feature-' + index} onClick={() => toggle(index)}><span><strong>&gt; {title}</strong><span>{text}</span></span><b aria-hidden="true">{active === index ? '−' : '+'}</b></button>{active === index && <div className="feature-body" id={'feature-' + index}><p>{detail}</p><button className="text-action" onClick={() => onRunQuery('')}>OPEN YOUR WORKSPACE</button></div>}</article>)}</div>
    <div className="benchmark"><div className="meta">[ EXECUTION BOUNDARY ]</div><div className="percentage">1,000</div><h3>MAXIMUM ROWS.<br/>EVERY QUERY.</h3><p>Useful answers, bounded results.<br/>Explore your data with an enforced read-only execution path.</p><button className="text-action" aria-expanded={limits} onClick={() => setLimits(value => !value)}>{limits ? 'HIDE' : 'INSPECT'} QUERY LIMITS {limits ? '−' : '+'}</button>{limits && <ul className="limits-list"><li>1,000 returned rows per query</li><li>3-second execution deadline</li><li>4 concurrent queries maximum</li><li>15 requests per minute per IP</li><li>Your selected PostgreSQL connection</li></ul>}<div className="benchmark-footer"><span>ENFORCED BY THE BACKEND</span><span>READ-ONLY / LOCAL MVP</span></div></div></div>
  </section>
}
