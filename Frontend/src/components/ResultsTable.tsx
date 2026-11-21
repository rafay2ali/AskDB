import { useMemo, useState } from 'react'
import type { QueryResult } from '../types/workspace'
type Props = { result: QueryResult }
export default function ResultsTable({ result }: Props) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ column: string; direction: 1 | -1 } | null>(null)
  const rows = useMemo(() => {
    if (!sort) return result.rows
    return [...result.rows].sort((a, b) => {
      const left = a[sort.column], right = b[sort.column]
      if (left === null) return right === null ? 0 : 1
      if (right === null) return -1
      return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))) * sort.direction
    })
  }, [result.rows, sort])
  const pages = Math.max(1, Math.ceil(rows.length / 25))
  const currentPage = Math.min(page, pages - 1)
  function exportCsv() {
    const cell = (value: unknown) => {
      let text = String(value ?? '')
      if (/^[\t\r]|^\s*[=+@-]/.test(text)) text = "'" + text
      return '"' + text.replaceAll('"', '""') + '"'
    }
    const csv = [result.columns, ...rows.map(row => result.columns.map(key => row[key]))].map(row => row.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = 'askdb-results.csv'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="workspace-results"><div className="workspace-result-heading"><h3>{result.title}</h3><button onClick={exportCsv}>Export CSV</button></div><div className="workspace-table-scroll"><table><caption>{result.rowCount} rows returned in {result.durationMs} ms. Click a column heading to sort.</caption><thead><tr>{result.columns.map(column => <th key={column} scope="col" aria-sort={sort?.column === column ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => { setPage(0); setSort({ column, direction: sort?.column === column && sort.direction === 1 ? -1 : 1 }) }}>{column}{sort?.column === column ? sort.direction === 1 ? ' [+]' : ' [-]' : ''}</button></th>)}</tr></thead><tbody>{rows.slice(currentPage * 25, (currentPage + 1) * 25).map((row, index) => <tr key={index}>{result.columns.map(column => <td key={column}>{row[column] === null ? 'NULL' : row[column]}</td>)}</tr>)}</tbody></table>{result.rows.length === 0 && <p>No matching rows. Try a different filter or date range.</p>}</div><div className="workspace-pagination"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage + 1} of {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></section>
}
