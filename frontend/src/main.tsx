import React from 'react'
import ReactDOM from 'react-dom/client'
import { SWRConfig } from 'swr'
import { Dashboard } from './pages/Dashboard'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then(res => res.json()),
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
      }}
    >
      <Dashboard />
    </SWRConfig>
  </React.StrictMode>,
)
