import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'

export function LoadingScreen() {
  const { loaded, loadingProgress, loadingPhase } = useAppStore()
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loaded) {
      setFadeOut(true)
      const timer = setTimeout(() => setVisible(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [loaded])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050510',
        transition: 'opacity 1.5s ease-out',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      {/* Grid lines animation */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          opacity: 0.15,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '40%',
            left: 0,
            right: 0,
            height: '60%',
            background:
              'repeating-linear-gradient(90deg, transparent, transparent 59px, #00f0ff20 59px, #00f0ff20 60px), repeating-linear-gradient(0deg, transparent, transparent 59px, #00f0ff20 59px, #00f0ff20 60px)',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'top center',
            animation: 'gridPulse 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '2.5rem',
          fontWeight: 200,
          letterSpacing: '0.3em',
          color: '#00f0ff',
          textShadow: '0 0 40px #00f0ff60, 0 0 80px #00f0ff30',
          marginBottom: '3rem',
          animation: 'fadeInUp 1s ease-out',
        }}
      >
        DATAVERSE VIBE EXPLORER
      </h1>

      {/* Progress bar */}
      <div
        style={{
          width: '300px',
          height: '2px',
          background: '#ffffff10',
          borderRadius: '1px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            width: `${loadingProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00f0ff, #a855f7)',
            boxShadow: '0 0 20px #00f0ff80',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>

      {/* Loading phase text */}
      <p
        style={{
          fontFamily: "'Inter', monospace",
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          color: '#64748b',
          textTransform: 'uppercase',
        }}
      >
        {loadingPhase}
      </p>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
