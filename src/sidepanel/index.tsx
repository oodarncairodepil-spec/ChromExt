import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

// Initialize console logger to capture logs
import { initConsoleLogger } from '../utils/consoleLogger'
initConsoleLogger()

function init() {
  const rootContainer = document.querySelector('#__plasmo')
  if (!rootContainer) {
    throw new Error('Can\'t find Plasmo root element')
  }
  const root = createRoot(rootContainer)
  root.render(<App />)
}

init()

// Export App as default for Plasmo framework
export default App