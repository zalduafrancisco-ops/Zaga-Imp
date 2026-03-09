import { useState } from 'react'

export default function Login({ supabase }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setError('Ingresa tu email y contraseña'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#040c18',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'DM Sans','Segoe UI',sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .login-input { width:100%; background:#070e1b; border:1px solid #1a2d45; border-radius:10px; color:#dce8f0; padding:12px 16px; font-size:14px; outline:none; transition:border .2s; font-family:inherit; }
        .login-input:focus { border-color:#c9a05566; }
        .login-input::placeholder { color:#3a4a5a; }
        .login-btn { width:100%; background:linear-gradient(135deg,#c9a055,#8a6a30); color:#05100e; border:none; border-radius:10px; padding:14px; font-size:14px; font-weight:700; cursor:pointer; transition:opacity .2s; letter-spacing:.5px; }
        .login-btn:hover:not(:disabled) { opacity:.9; }
        .login-btn:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#c9a055,#8a6a30)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 4px 30px #c9a05530', marginBottom: 16 }}>🌏</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, fontWeight: 800, color: '#dce8f0', letterSpacing: 1.5 }}>ZAGA Import</div>
          <div style={{ fontSize: 11, color: '#c9a05570', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>Gestión de Importaciones</div>
        </div>

        {/* Card */}
        <div style={{ background: '#0a1525', border: '1px solid #1a2d45', borderRadius: 20, padding: '36px 32px', boxShadow: '0 20px 60px #00000050' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#dce8f0', marginBottom: 6 }}>Iniciar sesión</div>
          <div style={{ fontSize: 12, color: '#4a5a6a', marginBottom: 28 }}>Ingresa con tu cuenta ZAGA</div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#c9a055', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Email</label>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#c9a055', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Contraseña</label>
              <input
                className="login-input"
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ background: '#c0392b18', border: '1px solid #c0392b44', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e74c3c' }}>
                ⚠ {error}
              </div>
            )}

            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#2a3a4a' }}>
          zagaimp.com · Plataforma interna
        </div>
      </div>
    </div>
  )
}
