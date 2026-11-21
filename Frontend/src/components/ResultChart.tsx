import { useState } from 'react'
import type { QueryResult } from '../types/workspace'
export default function ResultChart({ result }: { result: QueryResult }) {
  const labels = result.columns.filter(key => result.rows.some(row => typeof row[key] === 'string'))
  const metrics = result.columns.filter(key => result.rows.some(row => typeof row[key] === 'number'))
  const [labelChoice, setLabelChoice] = useState('')
  const [metricChoice, setMetricChoice] = useState('')
  const labelKey = labels.includes(labelChoice) ? labelChoice : labels[0]
  const valueKey = metrics.includes(metricChoice) ? metricChoice : metrics.find(key => key !== 'id') || metrics[0]
  if (!labelKey || !valueKey) return <p>No chartable rows were returned.</p>
  const rows = result.rows.slice(0, 30)
  const max = Math.max(1, ...rows.map(row => Math.abs(Number(row[valueKey])) || 0))
  return <section className="workspace-chart" aria-label={valueKey + ' by ' + labelKey}><h3>{valueKey.replaceAll('_', ' ')} by {labelKey}</h3><div className="workspace-chart-controls"><label>Labels<select value={labelKey} onChange={event => setLabelChoice(event.target.value)}>{labels.map(key => <option key={key}>{key}</option>)}</select></label><label>Metric<select value={valueKey} onChange={event => setMetricChoice(event.target.value)}>{metrics.map(key => <option key={key}>{key}</option>)}</select></label></div><p className="workspace-chart-note">First {rows.length} result rows. Bar lengths represent magnitude; signed values appear beside each label.</p>{rows.map((row, i) => <div className="workspace-chart-row" key={i}><div><span>{row[labelKey] ?? 'NULL'}</span><strong>{row[valueKey] === null ? 'NULL' : Number(row[valueKey]).toLocaleString()}</strong></div><div className="bar-track"><div style={{ width: Math.abs(Number(row[valueKey])) / max * 100 + '%' }} /></div></div>)}</section>
}
