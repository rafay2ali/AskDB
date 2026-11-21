import DatabaseIcon from './DatabaseIcon'
export default function CallToAction({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  return <section className="cta section"><div className="database-icon"><DatabaseIcon/></div><h2>INITIALIZE YOUR PRIVATE QUERY WORKSPACE.</h2><p>Ask Gemini a question, inspect the SQL, and explore your real database results.<br/>Sign in and connect your read-only PostgreSQL database.</p><button className="button primary" onClick={onOpenWorkspace}>LAUNCH ASKDB [ $ start ]</button><div className="stack">[ REACT 19 ] <span>·</span> [ NODE 22+ ] <span>·</span> [ SQL ANALYTICS ] <span>·</span> [ GEMINI AI ]</div><div className="caution">STRICT PROTOCOL: USE QUERY DATABASES YOU ARE EXPLICITLY AUTHORIZED TO ACCESS.</div></section>
}
