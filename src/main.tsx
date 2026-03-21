import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeDataverse } from '@/data/dataverse'
import App from './App'

// Initialize Dataverse connection before rendering.
// Auto-detects Power Apps host — uses real data if available, mock data otherwise.
// Wrapped in catch so the app always renders even if init fails completely.
initializeDataverse()
  .catch((err) => {
    console.warn('[Dataverse] Init error, falling back to mock:', err)
  })
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
