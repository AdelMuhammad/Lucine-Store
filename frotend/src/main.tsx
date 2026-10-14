import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { useLocaleStore } from './store/useLocaleStore.ts'

/**
 * A `?lang=ar` (or `?lang=en`) query parameter wins over the stored preference.
 * This is the address search engines use as the Arabic alternate in the
 * `hreflang` annotations, so the page has to honour it on a cold load.
 */
const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
if (requestedLanguage === 'ar' || requestedLanguage === 'en') {
  useLocaleStore.getState().setLanguage(requestedLanguage)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
