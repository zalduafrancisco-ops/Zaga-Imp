import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Cotizador from './cotizador_importaciones'
import ClientePortal from './ClientePortal'

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else setLoading(false)
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const cargarPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error && data) setPerfil(data)
    } catch (e) {
      console.error('Error cargando perfil:', e)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Pantalla de carga
  if (loading) return (
    <div style={{ background: '#040c18', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#c9a055,#8a6a30)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🌏</div>
      <div style={{ color: '#c9a055', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>Cargando...</div>
    </div>
  )

  // Sin sesión → Login
  if (!session || !perfil) return <Login supabase={supabase} />

  // Cliente → Portal de seguimiento
  if (perfil.rol === 'cliente') return (
    <ClientePortal supabase={supabase} perfil={perfil} onLogout={handleLogout} />
  )

  // Admin (Francisco o Luisa) → Cotizador completo
  return <Cotizador supabase={supabase} usuario={perfil} onLogout={handleLogout} />
}
