import { useEffect, useState } from 'react'
const prompts = ['What changed in our business this month?', 'Which categories generate the most revenue?', 'Help me understand the trends in my data.']
export default function TypingLine({ paused }: { paused: boolean }) {
  const [frame, setFrame] = useState({ index: 0, length: 0, deleting: false })
  useEffect(() => {
    if (paused) return
    const text = prompts[frame.index]
    const complete = frame.length === text.length
    const timer = setTimeout(() => {
      if (complete && !frame.deleting) setFrame({ ...frame, deleting: true })
      else if (frame.deleting && frame.length === 0) setFrame({ index: (frame.index + 1) % prompts.length, length: 0, deleting: false })
      else setFrame({ ...frame, length: frame.length + (frame.deleting ? -1 : 1) })
    }, complete && !frame.deleting ? 2400 : frame.deleting ? 25 : 58)
    return () => clearTimeout(timer)
  }, [frame, paused])
  return <div className="typing-console"><span aria-hidden="true"><b>askdb &gt;</b> {paused ? prompts[frame.index] : prompts[frame.index].slice(0, frame.length)}<span className="typing-caret">▌</span></span><span className="sr-only">Ask questions such as: Which product sold the most in December?</span></div>
}
