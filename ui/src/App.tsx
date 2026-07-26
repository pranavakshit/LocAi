import { useState, useRef, useEffect, type KeyboardEvent, type ReactNode } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'playground' | 'analysis' | 'files' | 'settings'
type NavSection = 'new-chat' | 'history' | 'models' | 'files' | 'analytics' | 'config'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  tokens?: number
}

interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  ext?: string
  size?: string
}

// ─── Sample data ───────────────────────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I am LocAi. How can I help you today?',
    time: 'Now',
  }
]

const FILE_TREE: FileNode[] = [
  {
    name: 'anomaly-detection',
    type: 'folder',
    children: [
      {
        name: 'data',
        type: 'folder',
        children: [
          { name: 'timeseries_q1.csv', type: 'file', ext: 'csv', size: '14.2 MB' },
          { name: 'timeseries_q2.csv', type: 'file', ext: 'csv', size: '16.8 MB' },
          { name: 'timeseries_q3.csv', type: 'file', ext: 'csv', size: '12.1 MB' },
          { name: 'anomaly_report.json', type: 'file', ext: 'json', size: '84 KB' },
        ],
      },
      {
        name: 'notebooks',
        type: 'folder',
        children: [
          { name: 'eda.ipynb', type: 'file', ext: 'ipynb', size: '2.4 MB' },
          { name: 'spectral_fft.ipynb', type: 'file', ext: 'ipynb', size: '1.8 MB' },
          { name: 'correlation.ipynb', type: 'file', ext: 'ipynb', size: '940 KB' },
        ],
      },
      {
        name: 'src',
        type: 'folder',
        children: [
          { name: 'detector.py', type: 'file', ext: 'py', size: '8.2 KB' },
          { name: 'pipeline.py', type: 'file', ext: 'py', size: '5.1 KB' },
          { name: 'fft_utils.py', type: 'file', ext: 'py', size: '3.7 KB' },
          { name: 'config.yaml', type: 'file', ext: 'yaml', size: '1.2 KB' },
        ],
      },
      { name: 'requirements.txt', type: 'file', ext: 'txt', size: '412 B' },
      { name: 'README.md', type: 'file', ext: 'md', size: '6.8 KB' },
    ],
  },
]

const HISTORY: { id: string, title: string, time: string }[] = []

// ─── Icons ─────────────────────────────────────────────────────────────────────

const Ic = {
  Chat: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 2.5a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H8L5 13.5v-3H2.5a1 1 0 01-1-1v-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Code: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M4.5 4L1.5 7.5l3 3.5M10.5 4l3 3.5-3 3.5M8.5 2.5l-2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Chart: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="9" width="3" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="6" y="6" width="3" height="7.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="10.5" y="2.5" width="3" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  Folder: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 3.5h4l1.5 1.5H13a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Cog: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 1.5v2M7.5 11.5v2M1.5 7.5h2M11.5 7.5h2M3.4 3.4l1.4 1.4M10.2 10.2l1.4 1.4M3.4 11.6l1.4-1.4M10.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2.5v10M2.5 7.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  History: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 4.5v3.5L10 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Model: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="11" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="4" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5.5 4h4M4 5.5v4M11 5.5v4M5.5 11h4M6 6.5l1.5 1 1.5-1M6 8.5l1.5-1 1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  ChevLeft: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevRight: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevDown: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Send: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 7.5L2 2.5l2.5 5-2.5 5L13 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Attach: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M11 8L6.5 12.5a3.182 3.182 0 01-4.5-4.5l6-6a2 2 0 012.8 2.8L5.3 10.3a.9.9 0 01-1.3-1.3L9.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Panel: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9.5 2v11" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 9V2.5a1 1 0 011-1H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M10.5 6.5a4 4 0 11-.8-2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M9.5 2l.2 2.1-2 .2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  FolderOpen: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 4.5H5L6 6h5.5a.5.5 0 01.48.65l-1.5 4.5a.5.5 0 01-.48.35H2a.5.5 0 01-.5-.5v-6a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  FolderClosed: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3.5h4l1 1.5H11.5a.5.5 0 01.5.5v5a.5.5 0 01-.5.5h-10a.5.5 0 01-.5-.5v-6a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  User: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 12c0-3.314 2.462-5 5.5-5s5.5 1.686 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1L7.8 5.2l4.2 1.3-4.2 1.3L6.5 12 5.2 7.8 1 6.5l4.2-1.3L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extColor(ext?: string) {
  const map: Record<string, string> = {
    py: '#4f8ef7', ipynb: '#f59e0b', csv: '#34d399',
    json: '#fbbf24', yaml: '#8b5cf6', md: '#7a85a0',
    txt: '#4a5266',
  }
  return map[ext ?? ''] ?? '#4a5266'
}

function formatContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} style={{ margin: '10px 0 4px', fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{line.slice(2, -2)}</p>
    }
    if (line.startsWith('- ')) {
      const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, (_, m) => `__BOLD__${m}__BOLD__`)
      const parts = content.split('__BOLD__')
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>·</span>
          <span style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6 }}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text-1)', fontWeight: 600 }}>{p}</strong> : p)}
          </span>
        </div>
      )
    }
    const hasBold = line.includes('**')
    if (hasBold) {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={i} style={{ margin: '3px 0', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.65 }}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text-1)', fontWeight: 600 }}>{p}</strong> : p)}
        </p>
      )
    }
    if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
    return <p key={i} style={{ margin: '3px 0', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.65, fontFamily: line.includes('→') || line.includes(':') && line.match(/^\w.*:.*\d/) ? 'var(--font-mono)' : undefined }}>{line}</p>
  })
}

// ─── Left Panel ────────────────────────────────────────────────────────────────

interface LeftPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeNav: NavSection
  setActiveNav: (n: NavSection) => void
}

const NAV_ITEMS: { id: NavSection; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'new-chat', label: 'New Chat', Icon: Ic.Plus },
  { id: 'history', label: 'History', Icon: Ic.History },
  { id: 'models', label: 'Models', Icon: Ic.Model },
  { id: 'files', label: 'Files', Icon: Ic.Folder },
  { id: 'analytics', label: 'Analytics', Icon: Ic.Chart },
  { id: 'config', label: 'Settings', Icon: Ic.Cog },
]

function LeftPanel({ collapsed, onToggle, activeNav, setActiveNav }: LeftPanelProps) {
  const w = collapsed ? 56 : 228

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        background: 'var(--panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 180ms cubic-bezier(0.4,0,0.2,1), min-width 180ms cubic-bezier(0.4,0,0.2,1)',
        borderRight: '1px solid var(--border)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo row */}
      <div style={{ padding: '14px 12px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-soft)', flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 0 12px var(--accent-glow)',
        }}>
          <Ic.Sparkle />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Nexus AI</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>v2.4.1 · Pro</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 8px 0', overflow: 'hidden' }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeNav === id
          return (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: collapsed ? '9px 0' : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 7, border: 'none', cursor: 'pointer',
                background: active ? 'var(--accent-glow)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                fontSize: 13, fontWeight: active ? 500 : 400,
                marginBottom: 1,
                transition: 'background 120ms, color 120ms',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ flexShrink: 0 }}><Icon /></span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
            </button>
          )
        })}

        {/* History list */}
        {!collapsed && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 10px 6px', fontFamily: 'var(--font-mono)' }}>Recent</div>
            {HISTORY.map(h => (
              <button
                key={h.id}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--text-2)', fontSize: 12, lineHeight: 1.4,
                  fontFamily: 'var(--font-sans)', marginBottom: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)' }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>{h.time}</div>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* User row */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d1b69 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)',
        }}>
          <Ic.User />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>You</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Local Developer</div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute', top: 14, right: -11,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-2)', zIndex: 20,
          transition: 'background 120ms, color 120ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)' }}
      >
        {collapsed ? <Ic.ChevRight /> : <Ic.ChevLeft />}
      </button>
    </aside>
  )
}

// ─── Tab Bar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'chat', label: 'Chat', Icon: Ic.Chat },
  { id: 'playground', label: 'Playground', Icon: Ic.Code },
  { id: 'analysis', label: 'Analysis', Icon: Ic.Chart },
  { id: 'files', label: 'Files', Icon: Ic.Folder },
  { id: 'settings', label: 'Settings', Icon: Ic.Cog },
]

function TabBar({ activeTab, setActiveTab, rightVisible, onToggleRight }: {
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  rightVisible: boolean
  onToggleRight: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '0 16px', height: 44, flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--panel)',
    }}>
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 500 : 400,
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--text-1)' : 'var(--text-3)',
                transition: 'background 100ms, color 100ms',
                fontFamily: 'var(--font-sans)',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)' }}
            >
              <Icon />
              {label}
              {active && (
                <span style={{
                  position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2, background: 'var(--accent)', borderRadius: '1px 1px 0 0',
                }} />
              )}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusPill label="claude-opus-4-8" color="var(--accent)" />
        <StatusPill label="● Live" color="var(--green)" />
        <button
          onClick={onToggleRight}
          title={rightVisible ? 'Hide context panel' : 'Show context panel'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: rightVisible ? 'var(--accent-dim)' : 'transparent',
            color: rightVisible ? 'var(--accent)' : 'var(--text-3)',
            cursor: 'pointer', transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = rightVisible ? 'var(--accent-dim)' : 'transparent' }}
        >
          <Ic.Panel />
        </button>
      </div>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      fontSize: 10.5, fontFamily: 'var(--font-mono)', color,
      background: `${color}14`, border: `1px solid ${color}28`,
      borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  )
}

// ─── Chat View ─────────────────────────────────────────────────────────────────

function ChatView({ messages, input, setInput, onSend, onKeyDown, messagesEndRef }: {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0 24px 20px', flexShrink: 0 }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 0 0 1px transparent',
          transition: 'border-color 150ms',
        }}
          onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'}
          onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message Nexus AI… (⏎ send, ⇧⏎ newline)"
            rows={3}
            style={{
              display: 'block', width: '100%', padding: '14px 16px 8px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-1)', fontSize: 13.5, fontFamily: 'var(--font-sans)',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 10px', gap: 6 }}>
            <button style={{ ...iconBtnStyle() }}>
              <Ic.Attach />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {input.length > 0 ? `${input.length} chars` : 'Model: opus-4-8'}
            </span>
            <button
              onClick={onSend}
              disabled={!input.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: input.trim() ? 'var(--accent)' : 'var(--surface-2)',
                color: input.trim() ? '#fff' : 'var(--text-3)',
                fontSize: 12.5, fontWeight: 500, cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-sans)', transition: 'background 120ms',
              }}
            >
              <Ic.Send /> Send
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10.5, color: 'var(--text-3)' }}>
          Nexus AI can make mistakes. Verify important outputs.
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      maxWidth: 780, margin: '0 auto', padding: '6px 24px',
    }}>
      <div style={{ display: 'flex', gap: 12, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 2,
          background: isUser
            ? 'linear-gradient(135deg, #1e3a5f, #2d1b69)'
            : 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)',
          boxShadow: isUser ? 'none' : '0 0 10px var(--accent-glow)',
        }}>
          {isUser ? <Ic.User /> : <Ic.Sparkle />}
        </div>

        {/* Bubble */}
        <div style={{ flex: 1, maxWidth: 'calc(100% - 40px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexDirection: isUser ? 'row-reverse' : 'row' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: isUser ? 'var(--text-2)' : 'var(--accent)' }}>
              {isUser ? 'You' : 'LocAi'}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{msg.time}</span>
            {msg.tokens && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>{msg.tokens} tok</span>}
          </div>
          <div style={{
            background: isUser ? 'var(--surface)' : 'transparent',
            border: isUser ? '1px solid var(--border-soft)' : 'none',
            borderRadius: isUser ? 10 : 0, padding: isUser ? '10px 14px' : 0,
          }}>
            {formatContent(msg.content)}
          </div>
          {!isUser && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <MsgAction label="Copy"><Ic.Copy /></MsgAction>
              <MsgAction label="Regenerate"><Ic.Refresh /></MsgAction>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MsgAction({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button title={label} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px',
      borderRadius: 5, border: '1px solid transparent', cursor: 'pointer',
      background: 'transparent', color: 'var(--text-3)', fontSize: 11,
      fontFamily: 'var(--font-sans)', transition: 'all 100ms',
    }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--surface)'; b.style.color = 'var(--text-2)'; b.style.borderColor = 'var(--border)' }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.color = 'var(--text-3)'; b.style.borderColor = 'transparent' }}
    >
      {children} {label}
    </button>
  )
}

// ─── Playground View ───────────────────────────────────────────────────────────

const PLAYGROUND_CODE = `import numpy as np
from scipy import signal
import pandas as pd

def detect_anomalies(
    ts: np.ndarray,
    threshold: float = 3.0,
    window: int = 200,
) -> dict:
    """
    Z-score based anomaly detection with
    rolling baseline normalization.
    """
    mu = pd.Series(ts).rolling(window, center=True).mean()
    sigma = pd.Series(ts).rolling(window, center=True).std()
    z_scores = (ts - mu) / sigma

    spikes = np.where(z_scores > threshold)[0]
    valleys = np.where(z_scores < -threshold)[0]

    return {
        "spikes": spikes.tolist(),
        "valleys": valleys.tolist(),
        "max_z": float(z_scores.max()),
        "min_z": float(z_scores.min()),
    }


def spectral_analysis(ts: np.ndarray, fs: float = 1.0) -> dict:
    freqs, psd = signal.periodogram(ts, fs=fs)
    dominant_idx = np.argmax(psd[1:]) + 1
    return {
        "dominant_freq": float(freqs[dominant_idx]),
        "dominant_period": float(1 / freqs[dominant_idx]),
        "noise_floor_db": float(10 * np.log10(np.percentile(psd, 5))),
    }
`

function PlaygroundView() {
  const [code, setCode] = useState(PLAYGROUND_CODE)
  const [output, setOutput] = useState(`>>> detect_anomalies(ts, threshold=3.0)
{
  "spikes":  [847, 1048, 1253],
  "valleys": [1203],
  "max_z":   3.24,
  "min_z":  -2.81
}

>>> spectral_analysis(ts, fs=1/3600)
{
  "dominant_freq":   0.00481,
  "dominant_period": 208.0,
  "noise_floor_db": -42.3
}`)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try {
      const res = await fetch("http://localhost:8000/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      setOutput(data.output || "No output returned.")
    } catch (e) {
      setOutput("Execution failed. Ensure LocAi backend is running.")
    }
    setRunning(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>detector.py</span>
          <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-mono)', background: `${String('var(--green)')}14`, border: '1px solid #34d39924', padding: '1px 6px', borderRadius: 4 }}>python</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={run}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: running ? 'var(--surface)' : 'var(--accent)',
              color: running ? 'var(--text-2)' : '#fff',
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
              transition: 'background 120ms',
            }}
          >
            {running ? '● Running…' : '▶  Run'}
          </button>
        </div>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1, padding: '16px 20px', background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: '#c9d1e0', fontSize: 13, lineHeight: 1.7,
            fontFamily: 'var(--font-mono)',
          }}
        />
      </div>

      {/* Output */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>Output</span>
        </div>
        <pre style={{
          flex: 1, margin: 0, padding: '16px 18px',
          color: '#a8b9cf', fontSize: 12.5, lineHeight: 1.7,
          fontFamily: 'var(--font-mono)', overflowY: 'auto',
          background: 'var(--surface)',
        }}>
          {running ? 'Executing…' : output}
        </pre>
      </div>
    </div>
  )
}

// ─── Analysis View ─────────────────────────────────────────────────────────────

const BAR_DATA = [
  { label: 'Mar 28', value: 87, anomaly: true },
  { label: 'Apr 4', value: 62, anomaly: false },
  { label: 'Apr 11', value: 58, anomaly: false },
  { label: 'Apr 17', value: 14, anomaly: true },
  { label: 'Apr 25', value: 71, anomaly: false },
  { label: 'May 2', value: 68, anomaly: false },
  { label: 'May 9', value: 55, anomaly: false },
  { label: 'May 16', value: 89, anomaly: true },
  { label: 'May 23', value: 60, anomaly: false },
  { label: 'Jun 1', value: 52, anomaly: false },
]

function AnalysisView() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Anomalies detected', value: '4', delta: '+1 this week', color: 'var(--red)' },
          { label: 'Dominant period', value: '208 u', delta: '8.67 days', color: 'var(--accent)' },
          { label: 'Max Z-score', value: '3.24σ', delta: 'index 847', color: 'var(--amber)' },
          { label: 'SNR', value: '18.4 dB', delta: 'noise −42 dB', color: 'var(--green)' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>System Telemetry</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Resource usage · anomaly events highlighted</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
            <Legend color="var(--accent)" label="Normal" />
            <Legend color="var(--red)" label="Anomaly" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
          {BAR_DATA.map(d => (
            <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div
                title={`${d.label}: ${d.value}`}
                style={{
                  width: '100%', borderRadius: '3px 3px 0 0',
                  height: `${d.value}%`,
                  background: d.anomaly
                    ? 'linear-gradient(to top, var(--red), #f8717180)'
                    : 'linear-gradient(to top, var(--accent), #4f8ef760)',
                  transition: 'opacity 150ms',
                  cursor: 'pointer',
                  boxShadow: d.anomaly ? '0 0 8px #f8717140' : '0 0 8px #4f8ef730',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
              />
              <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', transform: 'rotate(-40deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Frequency table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>FFT Frequency Components</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--panel)' }}>
              {['Rank', 'Frequency (Hz)', 'Period (units)', 'Power (dB)', 'Category'].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { rank: 1, freq: '0.00481', period: '208', power: '−18.2', cat: 'Dominant', color: 'var(--accent)' },
              { rank: 2, freq: '0.01667', period: '60', power: '−24.7', cat: 'Secondary', color: 'var(--purple)' },
              { rank: 3, freq: '0.03333', period: '30', power: '−31.4', cat: 'Harmonic', color: 'var(--text-3)' },
              { rank: 4, freq: '0.08333', period: '12', power: '−38.9', cat: 'Noise', color: 'var(--text-3)' },
            ].map(row => (
              <tr key={row.rank} style={{ borderTop: '1px solid var(--border-soft)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-3)' }}>#{row.rank}</td>
                <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-1)' }}>{row.freq}</td>
                <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-1)' }}>{row.period}</td>
                <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-2)' }}>{row.power}</td>
                <td style={{ padding: '9px 16px' }}>
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: row.color, background: `${row.color}18`, border: `1px solid ${row.color}30`, padding: '2px 7px', borderRadius: 4 }}>{row.cat}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

// ─── Files View ────────────────────────────────────────────────────────────────

function FilesView() {
  const [docs, setDocs] = useState<string[]>([])
  const [newDoc, setNewDoc] = useState('')
  const [indexing, setIndexing] = useState(false)

  const fetchDocs = () => {
    fetch("http://localhost:8000/rag/list")
      .then(res => res.json())
      .then(data => setDocs(data.documents || []))
      .catch(console.error)
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleAdd = async () => {
    if (!newDoc.trim()) return
    setIndexing(true)
    try {
      const res = await fetch("http://localhost:8000/rag/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: newDoc.trim() })
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else {
        setNewDoc('')
        fetchDocs()
      }
    } catch (e) {
      alert("Failed to index document.")
    }
    setIndexing(false)
  }

  return (
    <div style={{ padding: 24, background: 'var(--bg)', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20 }}>RAG Knowledge Base</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 600 }}>
        <input 
          value={newDoc} onChange={e => setNewDoc(e.target.value)}
          placeholder="Enter absolute file path (e.g., C:\docs\manual.pdf)"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }}
        />
        <button onClick={handleAdd} disabled={indexing} style={{ padding: '0 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: indexing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
          {indexing ? 'Indexing...' : 'Add to Knowledge'}
        </button>
      </div>
      <div>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indexed Documents ({docs.length})</h3>
        {docs.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No documents indexed yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
            {docs.map(doc => (
              <div key={doc} style={{ padding: '12px 16px', background: 'var(--panel)', borderRadius: 8, border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'var(--accent)' }}><Ic.Folder /></span>
                <span style={{ fontSize: 13, color: 'var(--text-2)', wordBreak: 'break-all' }}>{doc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings View ─────────────────────────────────────────────────────────────

function SettingsView() {
  const [apiKey, setApiKey] = useState('sk-ant-••••••••••••••••••••••••••••••••')
  const [systemPrompt, setSystemPrompt] = useState('You are a senior data scientist specializing in time series analysis and anomaly detection. Provide precise, technically rigorous answers with supporting evidence.')

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20, letterSpacing: '-0.01em' }}>Configuration</h2>

        {[
          {
            section: 'API', fields: [
              { label: 'API Key', value: apiKey, onChange: setApiKey, mono: true, type: 'password' },
            ]
          },
          {
            section: 'Model defaults', fields: [
              { label: 'System prompt', value: systemPrompt, onChange: setSystemPrompt, mono: false, multiline: true },
            ]
          }
        ].map(group => (
          <div key={group.section} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{group.section}</div>
            {group.fields.map(field => (
              <div key={field.label} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>{field.label}</label>
                {(field as any).multiline ? (
                  <textarea
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 8, outline: 'none', color: 'var(--text-1)',
                      fontSize: 12.5, fontFamily: field.mono ? 'var(--font-mono)' : 'var(--font-sans)',
                      lineHeight: 1.6,
                    }}
                    onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--accent)'}
                    onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--border)'}
                  />
                ) : (
                  <input
                    type={(field as any).type || 'text'}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 8, outline: 'none', color: 'var(--text-1)',
                      fontSize: 12.5, fontFamily: field.mono ? 'var(--font-mono)' : 'var(--font-sans)',
                    }}
                    onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--accent)'}
                    onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)'}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <button style={{
          padding: '8px 18px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          Save changes
        </button>
      </div>
    </div>
  )
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ model, setModel, temperature, setTemperature, maxTokens, setMaxTokens, totalTokens, localModels, recommendedModels }: {
  model: string; setModel: (m: string) => void
  temperature: number; setTemperature: (v: number) => void
  maxTokens: number; setMaxTokens: (v: number) => void
  totalTokens: number
  localModels: string[]
  recommendedModels: string[]
}) {
  const [downloadInput, setDownloadInput] = useState('')
  const [downloading, setDownloading] = useState(false)

  const downloadModel = async (modelName: string) => {
    if (!modelName.trim()) return
    setDownloading(true)
    try {
      await fetch("http://localhost:8000/model/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName })
      })
      alert(`Successfully downloaded ${modelName}`)
    } catch (e) {
      alert(`Failed to download ${modelName}`)
    }
    setDownloading(false)
    setDownloadInput('')
  }

  return (
    <aside style={{
      width: 268, flexShrink: 0,
      background: 'var(--panel)', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Model selector */}
      <Section title="Local Models">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {localModels.length === 0 && <div style={{fontSize: 11, color: 'var(--text-3)'}}>No models found.</div>}
          {localModels.map(opt => (
            <button
              key={opt}
              onClick={() => setModel(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 7, border: 'none',
                background: model === opt ? 'var(--accent-dim)' : 'transparent',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 100ms',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { if (model !== opt) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
              onMouseLeave={e => { if (model !== opt) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: model === opt ? 'var(--accent)' : 'var(--text-3)',
                boxShadow: model === opt ? '0 0 6px var(--accent)' : 'none',
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: model === opt ? 500 : 400, color: model === opt ? 'var(--text-1)' : 'var(--text-2)' }}>{opt}</div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Download New Models */}
      <Section title="Download Model">
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input 
            value={downloadInput} onChange={e => setDownloadInput(e.target.value)}
            placeholder="e.g. mistral"
            style={{flex: 1, width: 0, padding: '6px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)'}}
          />
          <button onClick={() => downloadModel(downloadInput)} disabled={downloading} style={{padding: '6px 10px', fontSize: 12, borderRadius: 4, border: 'none', background: 'var(--accent)', color: 'white', cursor: downloading ? 'not-allowed' : 'pointer'}}>
            {downloading ? '...' : 'Get'}
          </button>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>RECOMMENDED</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {recommendedModels.map(opt => (
            <button key={opt} onClick={() => downloadModel(opt)} style={{display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--surface-2)', border: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--text-2)'}}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)' }}
            >
              <span style={{fontSize: 11}}>{opt}</span>
              <span style={{fontSize: 11, color: 'var(--accent)'}}>↓</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Parameters */}
      <Section title="Parameters">
        <RangeParam label="Temperature" value={temperature} min={0} max={2} step={0.01} onChange={setTemperature} format={v => v.toFixed(2)} />
        <RangeParam label="Max tokens" value={maxTokens} min={256} max={8192} step={256} onChange={setMaxTokens} format={v => v.toLocaleString()} />
      </Section>

      {/* Usage */}
      <Section title="Session usage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Total tokens', value: totalTokens.toLocaleString(), color: 'var(--accent)' },
            { label: 'Messages', value: '4', color: 'var(--text-1)' },
            { label: 'Context used', value: `${((totalTokens / 200000) * 100).toFixed(2)}%`, color: 'var(--green)' },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{stat.label}</span>
              <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: stat.color, fontWeight: 500 }}>{stat.value}</span>
            </div>
          ))}
          {/* Usage bar */}
          <div style={{ marginTop: 4 }}>
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((totalTokens / 200000) * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </Section>

      {/* Context */}
      <Section title="Context">
        <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Active context: time series anomaly detection task with Q1–Q3 2024 hourly sensor data from Seattle facility.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {['timeseries', 'fft', 'anomaly', 'python', 'seattle'].map(tag => (
            <span key={tag} style={{
              fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '2px 7px', borderRadius: 4,
            }}>#{tag}</span>
          ))}
        </div>
      </Section>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '16px 16px', borderBottom: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function RangeParam({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

// ─── Misc ──────────────────────────────────────────────────────────────────────

function iconBtnStyle() {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: 'none',
    background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
  } as const
}

// ─── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [activeNav, setActiveNav] = useState<NavSection>('history')
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightVisible, setRightVisible] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('locai_chat_history')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) {}
    }
    return INITIAL_MESSAGES
  })
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['anomaly-detection', 'data', 'src'])
  )
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-8')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [localModels, setLocalModels] = useState<string[]>([])
  const [recommendedModels, setRecommendedModels] = useState<string[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    localStorage.setItem('locai_chat_history', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    fetch("http://localhost:8000/models")
      .then(res => res.json())
      .then(data => {
        setLocalModels(data.models || [])
        if (data.models && data.models.length > 0 && selectedModel === 'claude-opus-4-8') {
          setSelectedModel(data.models[0])
        }
      })
      .catch(console.error)

    fetch("http://localhost:8000/models/recommended")
      .then(res => res.json())
      .then(data => setRecommendedModels(data.models || []))
      .catch(console.error)
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const userContent = input.trim()
    const newMessage = { id: Date.now().toString(), role: 'user' as const, content: userContent, time: now }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId, role: 'assistant',
      content: "",
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }]);

    try {
      const backendMessages = messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: "user", content: userContent }]);
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: backendMessages })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
            ));
          }
        }
      }
    } catch (error) {
      console.error("Error communicating with LocAi:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId ? { ...msg, content: msg.content + "\n\n**Error:** Could not connect to LocAi engine." } : msg
      ));
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleNavSelect = (nav: NavSection) => {
    setActiveNav(nav)
    const tabMap: Partial<Record<NavSection, Tab>> = {
      files: 'files', analytics: 'analysis', config: 'settings',
    }
    if (tabMap[nav]) setActiveTab(tabMap[nav]!)
    else if (nav === 'new-chat' || nav === 'history') setActiveTab('chat')
  }

  const totalTokens = messages.reduce((s, m) => s + (m.tokens ?? 0), 0)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <LeftPanel collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(p => !p)} activeNav={activeNav} setActiveNav={handleNavSelect} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} rightVisible={rightVisible} onToggleRight={() => setRightVisible(p => !p)} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'chat' && (
            <ChatView
              messages={messages} input={input} setInput={setInput}
              onSend={sendMessage} onKeyDown={handleKeyDown}
              messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            />
          )}
          {activeTab === 'playground' && <PlaygroundView />}
          {activeTab === 'analysis' && <AnalysisView />}
          {activeTab === 'files' && (
            <FilesView />
          )}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>
      {rightVisible && (
        <RightPanel
          model={selectedModel} setModel={setSelectedModel}
          temperature={temperature} setTemperature={setTemperature}
          maxTokens={maxTokens} setMaxTokens={setMaxTokens}
          totalTokens={totalTokens}
          localModels={localModels}
          recommendedModels={recommendedModels}
        />
      )}
    </div>
  )
}
