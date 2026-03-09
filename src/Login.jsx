import { useState } from 'react'
import LOGO_WHITE from './logo-white.png'

export default function Login({ supabase }) {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setError('Ingresa tu email y contraseña'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError('Email o contraseña incorrectos'); setLoading(false) }
  }

  return (
    <div style={{background:'#f1f5f9',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .li{width:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;color:#0f172a;padding:12px 16px;font-size:14px;outline:none;transition:border .2s;font-family:inherit;box-sizing:border-box;}
        .li:focus{border-color:#c9a055;box-shadow:0 0 0 3px rgba(201,160,85,0.12);}
        .li::placeholder{color:#94a3b8;}
        .lb{width:100%;background:linear-gradient(135deg,#c9a055,#a07840);color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s;font-family:inherit;}
        .lb:hover:not(:disabled){opacity:.9;}
        .lb:disabled{opacity:.6;cursor:not-allowed;}
      `}</style>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{background:'#040c18',borderRadius:20,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'16px 32px',marginBottom:18,boxShadow:'0 8px 32px rgba(4,12,24,0.18)'}}>
            <img src={LOGO_WHITE} alt="ZAGA" style={{height:36,width:'auto'}}/>
          </div>
          <div style={{fontSize:11,color:'#94a3b8',letterSpacing:3,textTransform:'uppercase'}}>Gestión de Importaciones</div>
        </div>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'36px 32px',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:4}}>Iniciar sesión</div>
          <div style={{fontSize:13,color:'#94a3b8',marginBottom:28}}>Ingresa con tu cuenta ZAGA</div>
          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{display:'block',fontSize:11,color:'#040c18',marginBottom:6,textTransform:'uppercase',letterSpacing:1,fontWeight:600}}>Email</label>
              <input className="li" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email"/>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,color:'#040c18',marginBottom:6,textTransform:'uppercase',letterSpacing:1,fontWeight:600}}>Contraseña</label>
              <input className="li" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password"/>
            </div>
            {error&&<div style={{background:'#fff1f2',border:'1px solid #fecdd3',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#e11d48'}}>⚠ {error}</div>}
            <button className="lb" type="submit" disabled={loading} style={{marginTop:8}}>
              {loading?'Ingresando...':'Ingresar →'}
            </button>
          </form>
        </div>
        <div style={{textAlign:'center',marginTop:24,fontSize:11,color:'#94a3b8'}}>zagaimp.com · Plataforma interna</div>
      </div>
    </div>
  )
}
