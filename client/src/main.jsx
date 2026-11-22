import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { LangProvider } from './i18n/index.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Join from './pages/Join.jsx'
import Status from './pages/Status.jsx'
import Reception from './pages/Reception.jsx'
import Barber from './pages/Barber.jsx'
import Display from './pages/Display.jsx'
import Admin from './pages/Admin.jsx'
import { NotFound } from './pages/pages.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/join" element={<Join />} />
            <Route path="/status/:id" element={<Status />} />
            <Route path="/reception" element={<Reception />} />
            <Route path="/barber/:name" element={<Barber />} />
            <Route path="/display" element={<Display />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LangProvider>
  </StrictMode>,
)
