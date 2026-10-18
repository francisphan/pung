import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installMetrics } from './metrics'
import './styles.css'

installMetrics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
