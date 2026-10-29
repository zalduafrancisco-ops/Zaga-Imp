import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 29-oct-2026: el panel pasó a zagahub.cl. Para volver al panel antiguo,
// cambiar Redireccion por App (import App from './App').
import Redireccion from './Redireccion'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Redireccion />
  </StrictMode>
)
