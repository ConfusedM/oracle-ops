import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'

const WallPage = React.lazy(() => import('./wall/WallPage'))
const GmPage = React.lazy(() => import('./gm/GmPage'))
const LeadPage = React.lazy(() => import('./lead/LeadPage'))

const router = createHashRouter([
  { path: '/wall', element: <WallPage /> },
  { path: '/gm', element: <GmPage /> },
  { path: '/lead', element: <LeadPage /> },
  { path: '*', element: <Navigate to="/gm" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.Suspense fallback={<div className="loading">ORACLE OPS</div>}>
    <RouterProvider router={router} />
  </React.Suspense>,
)
