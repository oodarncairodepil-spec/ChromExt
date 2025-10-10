import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '../sidepanel/App'
import '../sidepanel/style.css'

function init() {
  const rootContainer = document.getElementById('root')
  if (!rootContainer) {
    throw new Error('Can\'t find root element')
  }
  const root = createRoot(rootContainer)
  root.render(<App />)
}

init()