import { useState, useRef, useEffect, type KeyboardEvent, type ReactNode } from 'react'
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

declare global {
  interface Window {
    pywebview?: any;
  }
}
// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'playground' | 'analysis' | 'files' | 'settings' | 'models'
type NavSection = 'new-chat' | 'history' | 'models' | 'files' | 'analytics' | 'config'

type DownloadState = {
  name: string
  status: 'idle' | 'downloading' | 'paused' | 'complete'
  progress: number
  completed: number
  total: number
  speed: number
  eta: number
  diskReadSpeed: number
  diskWriteSpeed: number
  history: { time: string, speed: number, diskRead: number, diskWrite: number }[]
  completeTimestamp: number | null
}

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 B'
    const k = 1000
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time?: string
  timestamp?: string
  tokens?: number
  artifacts?: { id: string, filename: string, type: string }[]
  status?: string
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
  Stop: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="4.5" y="4.5" width="6" height="6" fill="currentColor" rx="1"/>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Globe: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <ellipse cx="7.5" cy="7.5" rx="2.5" ry="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 7.5h13" stroke="currentColor" strokeWidth="1.2"/>
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
  Pen: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M9 1.5l2.5 2.5L3 12.5H.5v-2.5L9 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2.5 3h8M4.5 3V1.5h4V3m-4.5 8h5a1 1 0 001-1V4h-7v6a1 1 0 001 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
}

// ─── Helpers ───────────────────────────────────────────────────────────────────


function formatContent(text: string) {
  // First, separate code blocks
  const blockParts = text.split(/(```[\s\S]*?```)/g);
  
  return blockParts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // It's a code block
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim();
      const code = lines.slice(1).join('\n');
      
      return (
        <div key={`cb-${i}`} style={{ margin: '12px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {lang && (
            <div style={{ background: 'var(--panel)', padding: '4px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{lang}</span>
              <button onClick={() => {
                const evt = new CustomEvent('canvas:open', { detail: { content: code } })
                window.dispatchEvent(evt)
              }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}>Open in Canvas ↗</button>
            </div>
          )}
          <pre style={{ margin: 0, padding: 12, background: 'var(--surface)', color: 'var(--text-2)', fontSize: 12.5, fontFamily: 'var(--font-mono)', overflowX: 'auto', lineHeight: 1.6 }}>
            {code}
          </pre>
        </div>
      )
    }

    // Process normal text lines
    const lines = part.split('\n');
    return lines.map((line, j) => {
      if (line.trim() === '') return <div key={`empty-${i}-${j}`} style={{ height: 6 }} />;
      
      // Inline formatting logic: bold (**) and inline code (`)
      // Simple parser for both by splitting
      let tokens: any[] = [line];
      
      // Process bold
      tokens = tokens.flatMap((t: any) => {
        if (typeof t !== 'string') return [t];
        if (!t.includes('**')) return [t];
        const pieces = t.split(/\*\*(.*?)\*\*/g);
        return pieces.map((p, k) => k % 2 === 1 ? <strong key={`b-${k}`} style={{ color: 'var(--text-1)', fontWeight: 600 }}>{p}</strong> : p);
      });

      // Process inline code
      tokens = tokens.flatMap((t: any) => {
        if (typeof t !== 'string') return [t];
        if (!t.includes('`')) return [t];
        const pieces = t.split(/`(.*?)`/g);
        return pieces.map((p, k) => k % 2 === 1 ? <code key={`c-${k}`} style={{ color: 'var(--accent)', background: 'var(--surface)', padding: '2px 4px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '0.9em' }}>{p}</code> : p);
      });

      if (line.startsWith('# ')) {
        return <h1 key={`line-${i}-${j}`} style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: '16px 0 8px' }}>{tokens[0] === '# ' ? tokens.slice(1) : tokens}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={`line-${i}-${j}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: '14px 0 6px' }}>{tokens[0] === '## ' ? tokens.slice(1) : tokens}</h2>
      }
      if (line.startsWith('- ')) {
        const adjustedTokens = [...tokens];
        if (typeof adjustedTokens[0] === 'string') {
          adjustedTokens[0] = adjustedTokens[0].substring(2);
        }
        return (
          <div key={`line-${i}-${j}`} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>·</span>
            <span style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6 }}>
              {adjustedTokens}
            </span>
          </div>
        )
      }
      return <p key={`line-${i}-${j}`} style={{ margin: '3px 0', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.65 }}>{tokens}</p>
    })
  })
}

// ─── Left Panel ────────────────────────────────────────────────────────────────

interface LeftPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeNav: NavSection
  setActiveNav: (n: NavSection) => void
  sessions: any[]
  activeSessionId: string | null
  onSessionSelect: (id: string) => void
  onSessionDelete: (id: string) => void
  onSessionRename: (id: string, newTitle: string) => void
}

const NAV_ITEMS: { id: NavSection; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'new-chat', label: 'New Chat', Icon: Ic.Plus },
  { id: 'history', label: 'History', Icon: Ic.History },
  { id: 'models', label: 'Models', Icon: Ic.Model },
  { id: 'files', label: 'Files', Icon: Ic.Folder },
  { id: 'analytics', label: 'Analytics', Icon: Ic.Chart },
  { id: 'config', label: 'Settings', Icon: Ic.Cog },
]

function LeftPanel({ collapsed, onToggle, activeNav, setActiveNav, sessions, activeSessionId, onSessionSelect, onSessionDelete, onSessionRename }: LeftPanelProps) {
  const w = collapsed ? 56 : 228
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)

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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>LocAi</div>
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
            {sessions.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 6, border: 'none',
                  background: activeSessionId === s.id ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                  color: activeSessionId === s.id ? 'var(--text-1)' : 'var(--text-2)',
                  fontSize: 12, lineHeight: 1.4,
                  fontFamily: 'var(--font-sans)', marginBottom: 1,
                }}
                onMouseEnter={e => { 
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; 
                  (e.currentTarget as HTMLDivElement).style.color = 'var(--text-1)';
                  setHoveredSession(s.id);
                }}
                onMouseLeave={e => { 
                  (e.currentTarget as HTMLDivElement).style.background = activeSessionId === s.id ? 'var(--surface-2)' : 'transparent'; 
                  (e.currentTarget as HTMLDivElement).style.color = activeSessionId === s.id ? 'var(--text-1)' : 'var(--text-2)';
                  setHoveredSession(null);
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }} onClick={() => onSessionSelect(s.id)}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || s.name || 'Untitled Session'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>
                    {new Date(typeof (s.updated_at || s.created_at) === 'string' ? (s.updated_at || s.created_at) : (s.updated_at || s.created_at || 0) * 1000).toLocaleDateString()}
                  </div>
                </div>
                {(activeSessionId === s.id || hoveredSession === s.id) && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); const t = prompt("Rename to:", s.title); if(t) onSessionRename(s.id, t); }} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }} title="Rename">
                      <Ic.Pen />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm("Delete this conversation?")) onSessionDelete(s.id); }} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }} title="Delete">
                      <Ic.Trash />
                    </button>
                  </div>
                )}
              </div>
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
          background: 'var(--avatar-user)', color: 'var(--avatar-icon)',
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
          position: 'absolute', top: 14, right: -15,
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-1)', zIndex: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'background 120ms, color 120ms, transform 120ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
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

function TabBar({ activeTab, setActiveTab, rightVisible, onToggleRight, selectedModel, onGitCommand }: {
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  rightVisible: boolean
  onToggleRight: () => void
  selectedModel: string
  onGitCommand: (cmd: string) => void
}) {
  const [gitMenuOpen, setGitMenuOpen] = useState(false)
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        <button
          onClick={() => setGitMenuOpen(p => !p)}
          title="Git Menu"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
            borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-1)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
          }}
        >
          <Ic.Sparkle /> Git ▾
        </button>
        {gitMenuOpen && (
          <div style={{
            position: 'absolute', top: 32, right: 70, width: 180,
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 100, padding: 4,
            display: 'flex', flexDirection: 'column'
          }}>
            <button onClick={() => { onGitCommand('commit'); setGitMenuOpen(false) }} style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>Ask AI to Commit</button>
            <button onClick={() => { onGitCommand('push'); setGitMenuOpen(false) }} style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>Ask AI to Push</button>
            <button onClick={() => { onGitCommand('status'); setGitMenuOpen(false) }} style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>Ask AI for Status</button>
          </div>
        )}
        <StatusPill label={selectedModel || 'No Model'} color="var(--accent)" />
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

function Skeleton({ width = '100%', height = '100%', borderRadius = 6, style = {} }: { width?: number | string, height?: number | string, borderRadius?: number | string, style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width, height, borderRadius, ...style }} />
}

// ─── Chat View ─────────────────────────────────────────────────────────────────

function ChatView({ messages, input, setInput, onSend, onKeyDown, messagesEndRef, selectedModel, webSearch, setWebSearch, isStreaming, onStop }: {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  selectedModel: string
  webSearch: boolean
  setWebSearch: (v: boolean) => void
  isStreaming: boolean
  onStop: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Messages */}
      <div style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} msg={msg} isStreaming={isStreaming} isLast={i === messages.length - 1} />
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
            placeholder="Message LocAi… (⏎ send, ⇧⏎ newline)"
            rows={3}
            style={{
              display: 'block', width: '100%', padding: '14px 16px 8px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-1)', fontSize: 13.5, fontFamily: 'var(--font-sans)',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 10px', gap: 6 }}>
            <button onClick={async () => {
              if (window.pywebview) {
                const path = await (window as any).pywebview.api.open_file_dialog()
                if (path) setInput(input + `\n[Attached: ${path}]\n`)
              } else {
                alert("Native pywebview API not found.")
              }
            }} style={{ ...iconBtnStyle() }}>
              <Ic.Attach />
            </button>
            <button 
              onClick={() => setWebSearch(!webSearch)}
              style={{ ...iconBtnStyle(), background: webSearch ? 'var(--accent-dim)' : 'transparent', color: webSearch ? 'var(--accent)' : 'var(--text-3)' }}
              title={webSearch ? "Web Search: ON" : "Web Search: OFF"}
            >
              <Ic.Globe />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {input.length > 0 ? `${input.length} chars` : `Model: ${selectedModel || 'None'}`}
            </span>
            {isStreaming ? (
              <button
                onClick={onStop}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  background: '#ef4444', color: '#fff',
                  fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', transition: 'background 120ms',
                }}
              >
                <Ic.Stop /> Stop
              </button>
            ) : (
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
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10.5, color: 'var(--text-3)' }}>
          LocAi can make mistakes. Verify important outputs.
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, isStreaming, isLast }: { msg: Message, isStreaming?: boolean, isLast?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      maxWidth: 780, margin: '0 auto', padding: '6px 24px',
    }}>
      <div style={{ display: 'flex', gap: 12, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 2,
          background: isUser ? 'var(--avatar-user)' : 'var(--avatar-ai)',
          color: 'var(--avatar-icon)',
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
            <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {msg.time || (msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now')}
            </span>
            {msg.tokens && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>{msg.tokens} tok</span>}
          </div>
          <div style={{
            background: isUser ? 'var(--surface)' : 'transparent',
            border: isUser ? '1px solid var(--border-soft)' : 'none',
            borderRadius: isUser ? 10 : 0, padding: isUser ? '10px 14px' : 0,
          }}>
            {formatContent(msg.content)}
            {isLast && isStreaming && !msg.content && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, width: '100%', maxWidth: 400 }}>
                <Skeleton height={14} width="85%" />
                <Skeleton height={14} width="95%" />
                <Skeleton height={14} width="60%" />
              </div>
            )}
            {msg.artifacts && msg.artifacts.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {msg.artifacts.map(art => (
                  <div key={art.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--accent)' }}><Ic.Code /></span>
                    <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{art.filename}</span>
                  </div>
                ))}
              </div>
            )}
            {msg.status && (
              <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 11, fontWeight: 500, padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} className="skeleton" />
                {msg.status}
              </div>
            )}
          </div>
          {!isUser && (!isStreaming || !isLast) && (
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


function PlaygroundView() {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
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
            onClick={() => {
               // Assuming a global context or event, we could trigger a chat message here.
               // For this mock we'll just alert or if we had access to setActiveTab we'd jump to Chat.
               const evt = new CustomEvent('playground:debug', { detail: { code, output } })
               window.dispatchEvent(evt)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 6, border: '1px solid var(--accent)', cursor: 'pointer',
              background: 'transparent',
              color: 'var(--accent)',
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            }}
          >
            <Ic.Sparkle /> Ask AI
          </button>
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

function AnalysisView() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--text-3)' }}>
        <Ic.Chart />
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>No Data Available</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        Analytics and telemetry data will appear here once you run analysis tasks on your projects.
      </div>
    </div>
  )
}


// ─── Projects View ─────────────────────────────────────────────────────────────

function ProjectsView() {
  const [projects, setProjects] = useState<any[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  const fetchProjects = () => {
    fetch("http://localhost:8000/projects")
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreate = async () => {
    try {
      let folderPath = ""
      if (window.pywebview) {
        folderPath = await (window as any).pywebview.api.open_folder_dialog()
      } else {
        folderPath = prompt("Enter absolute folder path (Native API not found):") || ""
      }
      if (!folderPath) return
      
      const name = prompt("Enter project name:") || "New Project"
      
      const res = await fetch("http://localhost:8000/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, root_path: folderPath })
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else fetchProjects()
    } catch (e) {
      alert("Failed to create project")
    }
  }

  return (
    <div style={{ padding: 24, background: 'var(--bg)', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20 }}>Projects & Workspaces</h2>
      <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 24 }}>
        + Create Project
      </button>
      <div>
        {projects.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No projects found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
            {projects.map(proj => (
              <div key={proj.id} onClick={() => setActiveProjectId(proj.id)} style={{ padding: '12px 16px', background: activeProjectId === proj.id ? 'var(--accent-dim)' : 'var(--panel)', borderRadius: 8, border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <span style={{ color: 'var(--accent)' }}><Ic.Folder /></span>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{proj.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{proj.root_path}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Models View ─────────────────────────────────────────────────────────────

function ModelsView({ 
  localModels, 
  recommendedModels, 
  downloadState, 
  downloadModel, 
  pauseDownload, 
  cancelDownload,
  deleteModel 
}: { 
  localModels: string[], 
  recommendedModels: string[],
  downloadState: DownloadState,
  downloadModel: (m: string) => void,
  pauseDownload: () => void,
  cancelDownload: () => void,
  deleteModel: (m: string) => Promise<void>
}) {
  const [downloadInput, setDownloadInput] = useState('')
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('locai_searchQuery') || '')
  const [searchResults, setSearchResults] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('locai_searchResults')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isSearching, setIsSearching] = useState(false)
  const [deletingModel, setDeletingModel] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('locai_searchQuery', searchQuery)
    localStorage.setItem('locai_searchResults', JSON.stringify(searchResults))
  }, [searchQuery, searchResults])

  const handleDelete = async (model: string) => {
    setDeletingModel(model)
    await deleteModel(model)
    setDeletingModel(null)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`http://localhost:8000/models/search?q=${searchQuery}`)
      const data = await res.json()
      setSearchResults(data.models || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 1000, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.01em' }}>Model Manager</h2>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Manage downloaded models and discover new ones.</div>

        <div style={{ display: 'flex', gap: 24, flex: 1 }}>
          {/* Left Column: Downloaded Models */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>Downloaded Models</div>
            {localModels.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} height={52} />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {localModels.map(model => (
                <div key={model} style={{ padding: '16px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>{model}</div>
                  </div>
                  <button 
                    onClick={() => handleDelete(model)} 
                    disabled={deletingModel === model}
                    className={`btn-delete ${deletingModel === model ? 'shimmering' : ''}`}
                    style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid transparent', borderRadius: 6, color: 'var(--text-3)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                  >
                    {deletingModel === model ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Download New */}
          <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 20, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12 }}>Direct Download</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. gemma:2b"
                  value={downloadInput}
                  onChange={e => setDownloadInput(e.target.value)}
                  disabled={downloadState.status !== 'idle'}
                  style={{
                    flex: 1, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 6, outline: 'none', color: 'var(--text-1)', fontSize: 12.5,
                  }}
                />
                <button
                  onClick={() => downloadModel(downloadInput)}
                  disabled={downloadState.status !== 'idle' || !downloadInput.trim()}
                  style={{
                    padding: '8px 16px', background: downloadState.status !== 'idle' ? 'var(--surface-2)' : 'var(--accent)', border: 'none',
                    borderRadius: 6, color: downloadState.status !== 'idle' ? 'var(--text-3)' : '#fff', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 500
                  }}
                >
                  Pull
                </button>
              </div>
            </div>

            <div style={{ padding: 20, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12 }}>Search Registry</div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 6, outline: 'none', color: 'var(--text-1)', fontSize: 12.5,
                  }}
                />
                <button type="submit" disabled={isSearching} style={{
                    padding: '8px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--text-1)', cursor: 'pointer', fontSize: 12.5, fontWeight: 500
                }}>
                  {isSearching ? '...' : 'Search'}
                </button>
              </form>

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400 }}>
                {isSearching ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={42} style={{ marginBottom: 4 }} />
                  ))
                ) : (
                  searchResults.map(model => (
                     <div key={model} style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{model}</span>
                       <button onClick={() => { setDownloadInput(model); downloadModel(model); }} disabled={downloadState.status !== 'idle'} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                         Download
                       </button>
                     </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Download Banner */}
        {downloadState.status !== 'idle' && (
          <div style={{ marginTop: 24, padding: 20, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Downloading {downloadState.name}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {downloadState.status === 'downloading' && (
                  <button onClick={pauseDownload} style={{ padding: '6px 12px', background: 'var(--surface-2)', border: 'none', borderRadius: 6, color: 'var(--text-1)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Pause</button>
                )}
                {downloadState.status === 'paused' && (
                  <button onClick={() => downloadModel(downloadState.name)} style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Resume</button>
                )}
                {downloadState.status !== 'complete' && (
                  <button onClick={cancelDownload} style={{ padding: '6px 12px', background: 'var(--surface-2)', border: 'none', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Cancel</button>
                )}
                {downloadState.status === 'complete' && (
                  <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500, padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>Download Complete</div>
                )}
              </div>
            </div>
            
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: downloadState.status === 'complete' ? 'var(--green)' : 'var(--accent)', width: `${downloadState.progress}%`, transition: 'width 0.2s linear' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
              <span>{formatBytes(downloadState.completed)} / {formatBytes(downloadState.total)}</span>
              <span>
                <span style={{ color: 'var(--accent)' }}>Download: {formatBytes(downloadState.speed)}/s</span> • 
                <span style={{ color: 'var(--green)' }}>Disk Write: {formatBytes(downloadState.diskWriteSpeed)}/s</span> • 
                ETA: {Math.ceil(downloadState.eta)}s
              </span>
            </div>

            {downloadState.history && downloadState.history.length > 0 && (
              <div style={{ height: 120, width: '100%', marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={downloadState.history}>
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                      itemStyle={{ color: 'var(--text-1)' }}
                      labelStyle={{ color: 'var(--text-3)', marginBottom: 4 }}
                      formatter={(val: number) => formatBytes(val) + '/s'}
                    />
                    <Area type="monotone" dataKey="speed" name="Network" stroke="var(--accent)" fillOpacity={1} fill="url(#colorNet)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="diskWrite" name="Disk Write" stroke="var(--green)" fillOpacity={1} fill="url(#colorDisk)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings View ─────────────────────────────────────────────────────────────

function SettingsView() {
  // Personalization State
  const [personality, setPersonality] = useState('Standard')
  const [customInstructions, setCustomInstructions] = useState('')
  const [enableMemories, setEnableMemories] = useState(true)
  const [allowToolMemory, setAllowToolMemory] = useState(false)

  // Git State
  const [branchPrefix, setBranchPrefix] = useState('locai/')
  const [prMergeMethod, setPrMergeMethod] = useState('Squash')
  const [alwaysForcePush, setAlwaysForcePush] = useState(false)
  const [draftPrs, setDraftPrs] = useState(false)
  const [reviewDelivery, setReviewDelivery] = useState('Inline')
  const [commitInstructions, setCommitInstructions] = useState('')
  const [prInstructions, setPrInstructions] = useState('')
  // Updates State
  const [updateFreq, setUpdateFreq] = useState(() => localStorage.getItem('locai_update_frequency') || 'monthly')

  // Theme State
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    fetch("http://localhost:8000/config")
      .then(res => res.json())
      .then(data => {
        if (data.personality) setPersonality(data.personality)
        if (data.customInstructions) setCustomInstructions(data.customInstructions)
        if (data.enableMemories !== undefined) setEnableMemories(data.enableMemories)
        if (data.allowToolMemory !== undefined) setAllowToolMemory(data.allowToolMemory)
        if (data.branchPrefix) setBranchPrefix(data.branchPrefix)
        if (data.prMergeMethod) setPrMergeMethod(data.prMergeMethod)
        if (data.alwaysForcePush !== undefined) setAlwaysForcePush(data.alwaysForcePush)
        if (data.draftPrs !== undefined) setDraftPrs(data.draftPrs)
        if (data.reviewDelivery) setReviewDelivery(data.reviewDelivery)
        if (data.commitInstructions) setCommitInstructions(data.commitInstructions)
        if (data.prInstructions) setPrInstructions(data.prInstructions)
        if (data.theme) setTheme(data.theme)
      })
      .catch(console.error)
  }, [])

  const handleSave = async () => {
    localStorage.setItem('locai_update_frequency', updateFreq)
    const config = {
      personality, customInstructions, enableMemories, allowToolMemory,
      branchPrefix, prMergeMethod, alwaysForcePush, draftPrs, reviewDelivery,
      commitInstructions, prInstructions, theme
    }
    
    // Apply theme immediately
    if (theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    
    try {
      await fetch("http://localhost:8000/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: config })
      })
      alert("Settings saved!")
    } catch(e) {
      console.error(e)
      alert("Failed to save settings.")
    }
  }

  const resetMemories = () => {
    if (confirm("Are you sure you want to reset all memories?")) alert("Memories reset.")
  }

  const Checkbox = ({ label, checked, onChange }: any) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--text-1)', cursor: 'pointer', marginBottom: 12 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
      {label}
    </label>
  )

  const Select = ({ label, value, onChange, options }: any) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, outline: 'none', color: 'var(--text-1)', fontSize: 12.5, fontFamily: 'var(--font-sans)' }}>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )

  const Input = ({ label, value, onChange, mono = false }: any) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, outline: 'none', color: 'var(--text-1)', fontSize: 12.5, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)' }} />
    </div>
  )

  const Textarea = ({ label, value, onChange }: any) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, outline: 'none', color: 'var(--text-1)', fontSize: 12.5, fontFamily: 'var(--font-sans)', lineHeight: 1.6, resize: 'vertical' }} />
    </div>
  )

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 16, marginTop: 28, borderBottom: '1px solid var(--border-soft)', paddingBottom: 8 }}>{title}</div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.01em' }}>Settings</h2>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Configure your LocAi environment and integrations.</div>

        <SectionTitle title="Personalization" />
        <Select label="Personality" value={personality} onChange={setPersonality} options={['Standard', 'Concise', 'Detailed', 'Creative']} />
        <Textarea label="Custom instructions" value={customInstructions} onChange={setCustomInstructions} />
        <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12 }}>Memory</div>
          <Checkbox label="Enable memories" checked={enableMemories} onChange={setEnableMemories} />
          <Checkbox label="Allow memory generation from tool-assisted chats" checked={allowToolMemory} onChange={setAllowToolMemory} />
          <button onClick={resetMemories} style={{ marginTop: 8, padding: '6px 12px', background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Reset all memories</button>
        </div>

        <SectionTitle title="Git" />
        <Input label="Branch prefix" value={branchPrefix} onChange={setBranchPrefix} mono={true} />
        <Select label="Pull request merge method" value={prMergeMethod} onChange={setPrMergeMethod} options={['Merge', 'Squash', 'Rebase']} />
        <Checkbox label="Always force push" checked={alwaysForcePush} onChange={setAlwaysForcePush} />
        <Checkbox label="Create draft pull requests" checked={draftPrs} onChange={setDraftPrs} />
        <Select label="Review delivery" value={reviewDelivery} onChange={setReviewDelivery} options={['Inline', 'Detached']} />
        <Textarea label="Commit instructions" value={commitInstructions} onChange={setCommitInstructions} />
        <Textarea label="Pull request instructions" value={prInstructions} onChange={setPrInstructions} />

        <SectionTitle title="Updates" />
        <Select label="Check for updates" value={updateFreq} onChange={setUpdateFreq} options={['1 day', '3 days', '5 days', 'weekly', 'fortnightly', 'monthly']} />

        <SectionTitle title="Appearance" />
        <Select label="Theme" value={theme} onChange={setTheme} options={['system', 'dark', 'light']} />

        <SectionTitle title="Legal & About" />
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <a href="https://github.com/pranavakshit/LocAi/blob/main/docs/legal/EULA.md" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>End User License Agreement</a>
          <a href="https://github.com/pranavakshit/LocAi/blob/main/docs/legal/TERMS.md" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>Terms & Conditions</a>
          <a href="https://github.com/pranavakshit/LocAi/blob/main/docs/legal/PRIVACY.md" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a>
        </div>

        <button onClick={handleSave} style={{
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

function RightPanel({ model, setModel, temperature, setTemperature, maxTokens, setMaxTokens, systemPrompt, setSystemPrompt, totalTokens, messageCount, localModels, recommendedModels, activeContext, downloadState, downloadModel, pauseDownload, cancelDownload }: {
  model: string; setModel: (m: string) => void
  temperature: number; setTemperature: (v: number) => void
  maxTokens: number; setMaxTokens: (v: number) => void
  systemPrompt: string; setSystemPrompt: (v: string) => void
  totalTokens: number
  messageCount: number
  localModels: string[]
  recommendedModels: string[]
  activeContext: string[]
  downloadState: DownloadState
  downloadModel: (m: string) => void
  pauseDownload: () => void
  cancelDownload: () => void
}) {
  const [downloadInput, setDownloadInput] = useState('')
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
          <button onClick={() => downloadModel(downloadInput)} disabled={downloadState.status !== 'idle'} style={{padding: '6px 10px', fontSize: 12, borderRadius: 4, border: 'none', background: 'var(--accent)', color: 'white', cursor: downloadState.status !== 'idle' ? 'not-allowed' : 'pointer'}}>
            {downloadState.status !== 'idle' ? '...' : 'Get'}
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
        
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>System Prompt</div>
          <textarea 
            value={systemPrompt} 
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="You are LocAi..."
            style={{ 
              width: '100%', height: 80, resize: 'vertical', 
              background: 'var(--surface-2)', color: 'var(--text-2)', 
              border: '1px solid var(--border)', borderRadius: 6, 
              padding: '8px', fontSize: 12, fontFamily: 'var(--font-sans)' 
            }}
          />
        </div>
      </Section>

      {/* Usage */}
      <Section title="Session usage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Total tokens', value: totalTokens.toLocaleString(), color: 'var(--accent)' },
            { label: 'Messages', value: messageCount.toString(), color: 'var(--text-1)' },
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
          {activeContext.length === 0 ? "No active context." : "Active context provided to the model:"}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {activeContext.map(tag => (
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
  const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [activeNav, setActiveNav] = useState<NavSection>('history')
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightVisible, setRightVisible] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)

  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [webSearch, setWebSearch] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [canvasContent, setCanvasContent] = useState('')
  const [legalConsent, setLegalConsent] = useState(() => localStorage.getItem('locai_legal_consent'))
  const [selectedModel, setSelectedModel] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const [localModels, setLocalModels] = useState<string[]>([])
  const [recommendedModels, setRecommendedModels] = useState<string[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const [downloadState, setDownloadState] = useState<DownloadState>(() => {
    try {
      const saved = localStorage.getItem('locai_downloadState')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.status === 'downloading') {
          parsed.status = 'paused'
          parsed.speed = 0
          parsed.diskReadSpeed = 0
          parsed.diskWriteSpeed = 0
        }
        return parsed
      }
    } catch (e) {
      console.error(e)
    }
    return { name: '', status: 'idle', progress: 0, completed: 0, total: 0, speed: 0, eta: 0, diskReadSpeed: 0, diskWriteSpeed: 0, history: [], completeTimestamp: null }
  })

  useEffect(() => {
    localStorage.setItem('locai_downloadState', JSON.stringify(downloadState))
  }, [downloadState])
  const downloadAbortRef = useRef<AbortController | null>(null)
  const lastChunkTimeRef = useRef<number>(0)
  const lastChunkCompletedRef = useRef<number>(0)

  const fetchLocalModels = () => {
    fetch("http://localhost:8000/models")
      .then(res => res.json())
      .then(data => {
        setLocalModels(data.models || [])
        if (data.models && data.models.length > 0 && !selectedModel) {
          setSelectedModel(data.models[0])
        }
      })
      .catch(console.error)
  }

  const downloadModel = async (modelName: string) => {
    if (!modelName.trim()) return
    setActiveTab('models')
    
    setDownloadState(prev => prev.name !== modelName ? {
      name: modelName, status: 'downloading', progress: 0, completed: 0, total: 0, speed: 0, eta: 0, diskReadSpeed: 0, diskWriteSpeed: 0, history: [], completeTimestamp: null
    } : { ...prev, status: 'downloading' })

    const abortController = new AbortController()
    downloadAbortRef.current = abortController
    lastChunkTimeRef.current = Date.now()
    lastChunkCompletedRef.current = downloadState.name === modelName ? downloadState.completed : 0

    try {
      const res = await fetch("http://localhost:8000/model/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName }),
        signal: abortController.signal
      })

      if (!res.body) throw new Error("No readable stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        
        let boundary = buffer.indexOf('\n')
        while (boundary !== -1) {
          const chunkStr = buffer.slice(0, boundary).trim()
          buffer = buffer.slice(boundary + 1)
          boundary = buffer.indexOf('\n')

          if (!chunkStr) continue

          try {
            const chunk = JSON.parse(chunkStr)
            if (chunk.completed && chunk.total) {
              const now = Date.now()
              const dt = (now - lastChunkTimeRef.current) / 1000
              if (dt >= 0.5) {
                const bytesDiff = chunk.completed - lastChunkCompletedRef.current
                const speed = bytesDiff / dt
                const remaining = chunk.total - chunk.completed
                const eta = speed > 0 ? remaining / speed : 0
                
                setDownloadState(prev => {
                  const nowStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  const newHistory = [...prev.history, { 
                    time: nowStr, 
                    speed: speed, 
                    diskRead: chunk.disk_read_speed !== undefined ? chunk.disk_read_speed : prev.diskReadSpeed, 
                    diskWrite: chunk.disk_write_speed !== undefined ? chunk.disk_write_speed : prev.diskWriteSpeed 
                  }].slice(-30) // keep last 30 data points for the graph

                  return {
                    ...prev,
                    progress: (chunk.completed / chunk.total) * 100,
                    completed: chunk.completed,
                    total: chunk.total,
                    speed: speed,
                    eta: eta,
                    diskReadSpeed: chunk.disk_read_speed !== undefined ? chunk.disk_read_speed : prev.diskReadSpeed,
                    diskWriteSpeed: chunk.disk_write_speed !== undefined ? chunk.disk_write_speed : prev.diskWriteSpeed,
                    history: newHistory
                  }
                })
                
                lastChunkTimeRef.current = now
                lastChunkCompletedRef.current = chunk.completed
              } else {
                setDownloadState(prev => ({
                  ...prev,
                  progress: (chunk.completed / chunk.total) * 100,
                  completed: chunk.completed,
                  total: chunk.total
                }))
              }
            }
          } catch (e) {}
        }
      }

      setDownloadState(prev => ({ ...prev, status: 'complete', progress: 100, completeTimestamp: Date.now() }))
      alert(`Successfully downloaded ${modelName}`)
      fetchLocalModels()
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setDownloadState(prev => ({ ...prev, status: 'idle' }))
      alert(`Failed to download ${modelName}`)
    }
  }

  const pauseDownload = () => {
    downloadAbortRef.current?.abort()
    setDownloadState(prev => ({ ...prev, status: 'paused', speed: 0, eta: 0 }))
  }

  const cancelDownload = () => {
    downloadAbortRef.current?.abort()
    setDownloadState({ name: '', status: 'idle', progress: 0, completed: 0, total: 0, speed: 0, eta: 0, diskReadSpeed: 0, diskWriteSpeed: 0, history: [], completeTimestamp: null })
  }

  const deleteModel = async (modelName: string) => {
    try {
      const res = await fetch("http://localhost:8000/models/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName })
      })
      const data = await res.json()
      if (data.status === "success") {
        fetchLocalModels()
        if (selectedModel === modelName) setSelectedModel('')
      } else {
        alert(`Failed to delete model: ${data.error}`)
      }
    } catch (e) {
      alert(`Error deleting model: ${e}`)
    }
  }

  useEffect(() => {
    let timer: any;
    if (downloadState.status === 'complete' && downloadState.completeTimestamp) {
      const remaining = 15000 - (Date.now() - downloadState.completeTimestamp)
      if (remaining > 0) {
        timer = setTimeout(() => {
          setDownloadState(prev => ({ ...prev, status: 'idle', completeTimestamp: null, history: [] }))
        }, remaining)
      } else {
        setDownloadState(prev => ({ ...prev, status: 'idle', completeTimestamp: null, history: [] }))
      }
    }
    return () => clearTimeout(timer)
  }, [downloadState.status, downloadState.completeTimestamp])

  useEffect(() => {
    fetch("http://localhost:8000/v2/conversations")
      .then(res => res.json())
      .then(data => setSessions(data.conversations || data.sessions || []))
      .catch(console.error)
      
    fetch("http://localhost:8000/update/check")
      .then(res => res.json())
      .then(data => {
        if (data.update_available) {
          setUpdateAvailable({ version: data.latest_version, url: data.url })
        }
      })
      .catch(console.error)
  }, [])

  const loadSession = async (id: string) => {
    setActiveSessionId(id)
    setActiveTab('chat')
    try {
      const res = await fetch(`http://localhost:8000/v2/conversations/${id}`)
      const data = await res.json()
      if (data.messages) {
        const artifacts = data.artifacts || [];
        const msgs = data.messages.map((m: any) => ({ ...m, artifacts: artifacts.filter((a: any) => a.message_id === m.id) }));
        setMessages(msgs)
      }
    } catch(e) {
      console.error(e)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleDebug = (e: any) => {
      const { code, output } = e.detail;
      setActiveTab('chat');
      const prompt = `Please help me debug this code:\n\n\`\`\`python\n${code}\n\`\`\`\n\nOutput/Error:\n\`\`\`\n${output}\n\`\`\``;
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const newMessage = { id: Date.now().toString(), role: 'user' as const, content: prompt, time: now };
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => {
        setInput(prompt); // Mocks the API trigger for now without refactoring sendMessage completely.
      }, 100);
    }
    const handleCanvasOpen = (e: any) => {
      setCanvasContent(e.detail.content);
      setCanvasOpen(true);
    }
    window.addEventListener('playground:debug', handleDebug)
    window.addEventListener('canvas:open', handleCanvasOpen)
    return () => {
      window.removeEventListener('playground:debug', handleDebug)
      window.removeEventListener('canvas:open', handleCanvasOpen)
    }
  }, [])

  useEffect(() => {
    fetch("http://localhost:8000/config")
      .then(res => res.json())
      .then(data => {
        const t = data.theme || 'system'
        if (t === 'light' || (t === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
          document.documentElement.setAttribute('data-theme', 'light')
        } else {
          document.documentElement.removeAttribute('data-theme')
        }
      })
      .catch(console.error)
      
    fetch("http://localhost:8000/model")
      .then(res => res.json())
      .then(data => setSelectedModel(data.model))
      .catch(console.error)

    fetch("http://localhost:8000/models")
      .then(res => res.json())
      .then(data => {
        setLocalModels(data.models || [])
        // If for some reason selectedModel wasn't set, default to first available
        if (data.models && data.models.length > 0 && !selectedModel) {
          setSelectedModel(data.models[0])
        }
      })
      .catch(console.error)

    fetch("http://localhost:8000/models/recommended")
      .then(res => res.json())
      .then(data => setRecommendedModels(data.models || []))
      .catch(console.error)
  }, [])

  const deleteSession = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/v2/conversations/${id}`, { method: "DELETE" })
      if (activeSessionId === id) {
        setActiveSessionId(null)
        setMessages([{ id: '1', role: 'assistant', content: 'Hello! I am LocAi. How can I help you today?', time: 'Now' }])
      }
      fetch("http://localhost:8000/v2/conversations").then(r => r.json()).then(d => setSessions(d.conversations || d.sessions || []))
    } catch(e) {}
  }
  
  const renameSession = async (id: string, newTitle: string) => {
    try {
      await fetch(`http://localhost:8000/v2/conversations/${id}/title`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      })
      fetch("http://localhost:8000/v2/conversations").then(r => r.json()).then(d => setSessions(d.conversations || d.sessions || []))
    } catch(e) {}
  }

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return
    setIsStreaming(true)
    abortControllerRef.current = new AbortController()
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const userContent = input.trim()
    const newMessage = { id: Date.now().toString(), role: 'user' as const, content: userContent, time: now }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    
    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      // Create a new session with the first user message as title (truncated)
      const title = userContent.substring(0, 25) + (userContent.length > 25 ? "..." : "")
      try {
        const res = await fetch("http://localhost:8000/v2/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title })
        })
        const data = await res.json()
        if (data.metadata && data.metadata.id) {
          currentSessionId = data.metadata.id
          setActiveSessionId(currentSessionId)
          // Also fetch updated sessions list to populate sidebar
          fetch("http://localhost:8000/v2/conversations").then(r => r.json()).then(d => setSessions(d.conversations || d.sessions || []))
        }
      } catch (e) { console.error("Failed to create session", e) }
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId, role: 'assistant',
      content: "",
      status: "Connecting...",
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }]);

    try {
      const backendMessages = messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: "user", content: userContent }]);
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({ 
          messages: backendMessages,
          session_id: currentSessionId,
          temperature,
          max_tokens: maxTokens,
          system_prompt: systemPrompt,
          web_search: webSearch
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let done = false;
        let buffer = '';
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.type === 'token') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantId ? { ...msg, content: msg.content + data.content } : msg
                  ));
                } else if (data.type === 'status') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantId ? { ...msg, status: data.content || undefined } : msg
                  ));
                } else if (data.type === 'usage') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantId ? { ...msg, tokens: data.content } : msg
                  ));
                }
              } catch(e) {
                console.error("Parse error on line:", line, e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Fetch aborted");
      } else {
        console.error("Error communicating with LocAi:", error);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId ? { ...msg, content: msg.content + "\n\n**Error:** Could not connect to LocAi engine." } : msg
        ));
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleNavSelect = (nav: NavSection) => {
    setActiveNav(nav)
    const tabMap: Partial<Record<NavSection, Tab>> = {
      files: 'files', analytics: 'analysis', config: 'settings', models: 'models',
    }
    if (tabMap[nav]) setActiveTab(tabMap[nav]!)
    else if (nav === 'new-chat') {
      setActiveTab('chat')
      setActiveSessionId(null)
      setMessages([{ id: '1', role: 'assistant', content: 'Hello! I am LocAi. How can I help you today?', time: 'Now' }])
    }
    else if (nav === 'history') {
      setActiveTab('chat')
      if (sessions.length > 0) {
        const sorted = [...sessions].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
        loadSession(sorted[0].id)
      }
    }
  }

  const totalTokens = messages.reduce((s, m) => s + (m.tokens ?? 0), 0)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <LeftPanel 
        collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(p => !p)} 
        activeNav={activeNav} setActiveNav={handleNavSelect} 
        sessions={sessions} activeSessionId={activeSessionId} onSessionSelect={loadSession}
        onSessionDelete={deleteSession} onSessionRename={renameSession}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TabBar 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          rightVisible={rightVisible} onToggleRight={() => setRightVisible(p => !p)} 
          selectedModel={selectedModel}
          onGitCommand={(cmd) => {
            setActiveTab('chat');
            const prompt = `Please ${cmd} the changes in the current project using the configured git credentials.`;
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const newMessage = { id: Date.now().toString(), role: 'user' as const, content: prompt, time: now };
            setMessages(prev => [...prev, newMessage]);
            
            // Wait for state to update, then trigger send
            setTimeout(() => {
              // We'd ideally call sendMessage with the prompt, but we can just use the state approach.
              // To avoid refactoring sendMessage completely, we can setInput and submit.
              // For a robust app we'd pass the prompt to sendMessage.
              setInput(prompt);
              // Note: A true trigger would call the backend here.
            }, 100);
          }}
        />
        {updateAvailable && (
          <div style={{ background: 'var(--accent)', color: 'white', padding: '8px 16px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span>A new version <strong>{updateAvailable.version}</strong> is available!</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => { if(window.pywebview) (window as any).pywebview.api.open_url(updateAvailable.url) }} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', fontSize: 12 }}>Download</button>
              <button onClick={() => setUpdateAvailable(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 12, padding: 0 }} aria-label="Dismiss">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'chat' && (
            <ChatView
              messages={messages} input={input} setInput={setInput}
              onSend={sendMessage} onKeyDown={handleKeyDown}
              messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
              selectedModel={selectedModel}
              webSearch={webSearch} setWebSearch={setWebSearch}
              isStreaming={isStreaming} onStop={stopGeneration}
            />
          )}
          {activeTab === 'playground' && <PlaygroundView />}
          {activeTab === 'analysis' && <AnalysisView />}
          {activeTab === 'files' && (
            <ProjectsView />
          )}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'models' && <ModelsView localModels={localModels} recommendedModels={recommendedModels} downloadState={downloadState} downloadModel={downloadModel} pauseDownload={pauseDownload} cancelDownload={cancelDownload} deleteModel={deleteModel} />}
        </div>
      </main>

      {/* Canvas Pane */}
      {canvasOpen && (
        <aside style={{
          width: '45%', minWidth: 400, flexShrink: 0,
          background: 'var(--panel)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', zIndex: 5,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic.Sparkle />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Artifact Canvas</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                // Submit canvas edits to context
                setActiveTab('chat');
                const prompt = `I've updated the canvas. Please review my edits:\n\n\`\`\`\n${canvasContent}\n\`\`\``;
                const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: prompt, time: now }]);
                setTimeout(() => setInput(prompt), 100);
              }} style={{ padding: '4px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>Sync to Chat</button>
              <button onClick={() => setCanvasOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
          <textarea
            value={canvasContent}
            onChange={e => setCanvasContent(e.target.value)}
            style={{
              flex: 1, padding: 20, background: 'transparent', color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6, border: 'none', outline: 'none', resize: 'none'
            }}
          />
        </aside>
      )}

      {rightVisible && (
        <RightPanel
          model={selectedModel} setModel={setSelectedModel}
          temperature={temperature} setTemperature={setTemperature}
          maxTokens={maxTokens} setMaxTokens={setMaxTokens}
          systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
          totalTokens={totalTokens}
          messageCount={messages.length}
          localModels={localModels}
          recommendedModels={recommendedModels}
          activeContext={[]}
          downloadState={downloadState}
          downloadModel={downloadModel}
          pauseDownload={pauseDownload}
          cancelDownload={cancelDownload}
        />
      )}
      
      {/* Legal Consent Overlay */}
      {legalConsent === null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
            width: 480, maxWidth: '90%', padding: 32, boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Welcome to LocAi</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              Before you start, please review our legal terms. LocAi offers powerful offline AI capabilities along with optional online features (like model downloads and updates).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0', borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
              <a href="https://github.com/pranavakshit/LocAi/blob/main/docs/legal/EULA.md" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>End User License Agreement</a>
              <a href="https://github.com/pranavakshit/LocAi/blob/main/docs/legal/TERMS.md" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Terms & Conditions</a>
              <a href="https://github.com/pranavakshit/LocAi/blob/main/docs/legal/PRIVACY.md" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
              By accepting, you agree to these terms. If you decline, all online capabilities will be disabled and LocAi will run in offline-only mode.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => { localStorage.setItem('locai_legal_consent', 'false'); setLegalConsent('false') }}
                style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Decline (Offline Only)
              </button>
              <button
                onClick={() => { localStorage.setItem('locai_legal_consent', 'true'); setLegalConsent('true') }}
                style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Accept Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
