import { useState } from 'react'
import LOGO_WHITE from "./logo-white.png"

export default function Login({ supabase }) {
  const [email, setEmail]       = useState('')
  const [pass, setPass]         = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setError('Ingresa tu email y contrasena'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError('Email o contrasena incorrectos'); setLoading(false) }
  }

  return (
    <div style={{
      background: '#040c18',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Inter','Segoe UI',sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Fondo decorativo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 10%, #c9a05510 0%, transparent 65%)',
      }}/>
      <div style={{
        position: 'fixed', bottom: -120, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, #c9a05506 0%, transparent 70%)',
      }}/>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src={LOGO_WHITE}
            alt="ZAGA IMP"
            style={{ height: 56, width: 'auto', display: 'block', margin: '0 auto 14px', objectFit: 'contain' }}
          />
          <div style={{
            fontSize: 10, color: '#c9a055', letterSpacing: 4,
            textTransform: 'uppercase', opacity: 0.7, fontWeight: 500,
          }}>
            Gestion de Importaciones
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#071428',
          border: '1px solid #c9a05530',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px #c9a05510',
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e8e0d0', marginBottom: 4 }}>
              Iniciar sesion
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Ingresa con tu cuenta ZAGA</div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 10, color: '#c9a055',
                marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700,
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '13px 16px',
                  background: '#0a1a2e',
                  border: '1.5px solid #c9a05528',
                  borderRadius: 10, color: '#e8e0d0', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#c9a05580'}
                onBlur={e => e.target.style.borderColor = '#c9a05528'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 10, color: '#c9a055',
                marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700,
              }}>Contrasena</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '13px 44px 13px 16px',
                    background: '#0a1a2e',
                    border: '1.5px solid #c9a05528',
                    borderRadius: 10, color: '#e8e0d0', fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#c9a05580'}
                  onBlur={e => e.target.style.borderColor = '#c9a05528'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#c9a05560', fontSize: 15, padding: 4, lineHeight: 1,
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#e05a5a12', border: '1px solid #e05a5a40',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 12, color: '#e07878',
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Boton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                width: '100%', padding: '14px',
                background: loading ? '#8a6a30' : 'linear-gradient(135deg, #c9a055 0%, #a8823c 100%)',
                border: 'none', borderRadius: 10,
                color: '#040c18', fontWeight: 800, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: 0.3,
                boxShadow: loading ? 'none' : '0 4px 20px #c9a05535',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#c9a05530' }}>
          zagaimp.com · Plataforma interna
        </div>
      </div>
    </div>
  )
}
