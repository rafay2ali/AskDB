import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import QueryDemo from './components/QueryDemo'
import Architecture from './components/Architecture'
import Security from './components/Security'
import Capabilities from './components/Capabilities'
import CallToAction from './components/CallToAction'
import Footer from './components/Footer'
import WorkspaceModal from './components/WorkspaceModal'
import AnimatedBackground from './components/AnimatedBackground'
import { platformStatus } from './services/api'
import './App.css'
import './LandingEffects.css'

function App() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [initialQuestion, setInitialQuestion] = useState('')
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [connected, setConnected] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [databaseName, setDatabaseName] = useState('CONNECT YOUR DATABASE')
  const [walkthrough, setWalkthrough] = useState(0)
  const openWorkspace = useCallback(() => setWorkspaceOpen(true), [])
  const openQuery = (question: string) => { setInitialQuestion(question); setWorkspaceOpen(true) }
  const closeWorkspace = useCallback(() => setWorkspaceOpen(false), [])
  useEffect(() => {
    let active = true
    async function checkConnection() {
      try { const data = await platformStatus(); if (active) { setConnected(true); setAiConfigured(data.aiConfigured); setDatabaseName('YOUR POSTGRESQL') } }
      catch { if (active) { setConnected(false); setAiConfigured(false) } }
    }
    void checkConnection()
    const timer = setInterval(checkConnection, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setPaused(preference.matches)
    preference.addEventListener('change', change)
    return () => preference.removeEventListener('change', change)
  }, [])
  function watchArchitecture() {
    setWalkthrough(value => value + 1)
    document.getElementById('architecture')?.scrollIntoView({ behavior: paused ? 'instant' : 'smooth', block: 'start' })
  }
  return <div className={'landing-shell' + (paused ? ' motion-paused' : '')}>
    <AnimatedBackground paused={paused || workspaceOpen}/>
    <Header connected={connected} paused={paused} onToggleMotion={() => setPaused(value => !value)} onOpenWorkspace={openWorkspace}/>
    <main>
      <Hero databaseName={databaseName} onOpenWorkspace={openWorkspace} onWatchArchitecture={watchArchitecture} paused={paused || workspaceOpen} connected={connected} aiConfigured={aiConfigured}/>
      <QueryDemo onRunQuery={openQuery}/>
      <Architecture runKey={walkthrough} paused={paused || workspaceOpen} onRunQuery={openQuery}/>
      <Security onOpenWorkspace={openWorkspace}/>
      <Capabilities onRunQuery={openQuery}/>
      <CallToAction onOpenWorkspace={openWorkspace}/>
    </main>
    <Footer/>
    <WorkspaceModal initialQuestion={initialQuestion} isOpen={workspaceOpen} onClose={closeWorkspace}/>
  </div>
}
export default App
