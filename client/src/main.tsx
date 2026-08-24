import { ClerkProvider } from '@clerk/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WorkerProvider } from './lib/WorkerContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
        proxyUrl={`${window.location.origin}/__clerk`}
        clerkJSUrl="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
        afterSignOutUrl="/"
      >
      <WorkerProvider>
        <App />
      </WorkerProvider>
    </ClerkProvider>
  </StrictMode>,
)