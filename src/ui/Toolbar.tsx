import { useCallback, useState } from 'react'

interface AccessibilityState {
  highContrast: boolean
  reducedMotion: boolean
}

export function Toolbar() {
  const [a11y, setA11y] = useState<AccessibilityState>({
    highContrast: false,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  })
  const [expanded, setExpanded] = useState(false)

  const toggleHighContrast = useCallback(() => {
    setA11y((prev) => {
      const next = { ...prev, highContrast: !prev.highContrast }
      document.documentElement.setAttribute('data-high-contrast', String(next.highContrast))
      return next
    })
  }, [])

  const toggleReducedMotion = useCallback(() => {
    setA11y((prev) => {
      const next = { ...prev, reducedMotion: !prev.reducedMotion }
      document.documentElement.setAttribute('data-reduced-motion', String(next.reducedMotion))
      return next
    })
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={toolbarBtnStyle}
        title="Settings"
        aria-label="Toggle settings panel"
      >
        &#x2699;
      </button>

      {expanded && (
        <div
          style={{
            background: 'rgba(8, 8, 24, 0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
            minWidth: '140px',
          }}
        >
          <ToggleOption
            label="High Contrast"
            enabled={a11y.highContrast}
            onToggle={toggleHighContrast}
          />
          <ToggleOption
            label="Reduce Motion"
            enabled={a11y.reducedMotion}
            onToggle={toggleReducedMotion}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function ToggleOption({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        color: '#e2e8f0',
        cursor: 'pointer',
        fontSize: '0.7rem',
        padding: '4px 2px',
        textAlign: 'left',
      }}
      role="switch"
      aria-checked={enabled}
    >
      <span
        style={{
          width: '28px',
          height: '14px',
          borderRadius: '7px',
          background: enabled ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255,255,255,0.1)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '14px' : '2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: enabled ? '#00f0ff' : '#64748b',
            transition: 'left 0.2s, background 0.2s',
          }}
        />
      </span>
      {label}
    </button>
  )
}

const toolbarBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'rgba(8, 8, 24, 0.7)',
  border: '1px solid rgba(0, 240, 255, 0.12)',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
