import { useEffect, useRef } from 'react'
import PlatformWorkspace from './PlatformWorkspace'

type Props = { isOpen: boolean; initialQuestion: string; onClose: () => void }
export default function WorkspaceModal({ isOpen, initialQuestion, onClose }: Props) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const elements = container.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), textarea:not(:disabled), a[href], summary, select:not(:disabled)')
      if (!elements?.length) return
      const first = elements[0], last = elements[elements.length - 1]
      if (!container.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKey)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', handleKey); previous?.focus() }
  }, [isOpen, onClose])
  if (!isOpen) return null
  return <div ref={container} className="workspace-overlay" role="dialog" aria-modal="true" aria-label="AskDB query workspace"><PlatformWorkspace initialQuestion={initialQuestion} onClose={onClose} /></div>
}
