import { useEffect, useRef } from 'react'
export default function AnimatedBackground({ paused = false }: { paused?: boolean }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    let frameId = 0
    function handlePointerMove(event: PointerEvent) {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        frameRef.current?.contentWindow?.postMessage({ type: 'askdb-pointer', x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 }, '*')
      })
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => { window.removeEventListener('pointermove', handlePointerMove); cancelAnimationFrame(frameId) }
  }, [])
  useEffect(() => { frameRef.current?.contentWindow?.postMessage({ type: 'askdb-motion', paused }, '*') }, [paused])
  return <div className="animated-background" aria-hidden="true"><iframe ref={frameRef} onLoad={() => frameRef.current?.contentWindow?.postMessage({ type: 'askdb-motion', paused }, '*')} src="/database-background.html" title="Decorative animated database background" sandbox="allow-scripts" tabIndex={-1}/></div>
}
