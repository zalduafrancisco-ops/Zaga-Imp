# ZAGA Import — Sitio público

Landing page pública de ZAGA Import (marketing / ventas).

## Qué es

Un sitio estático de un solo archivo (`index.html`) con todo inline: CSS, estructura y scripts. **No requiere build**, no depende de Node ni de React. Se puede abrir haciendo doble click o servir desde cualquier static host.

Es intencionalmente independiente del SPA interno (`src/`) que corre en `app.zagaimp.com`. Esa app no se tocó.

## Secciones

1. **Header** — logo + nav + botón "Ingresar" → `app.zagaimp.com`
2. **Hero** — titular, CTAs, stats, tarjetas decorativas flotantes
3. **Servicios** — dos cards: Importación llave en mano + Fulfillment
4. **Proceso** — 4 pasos numerados con línea conectora
5. **Por qué ZAGA** — 6 ventajas (transparencia, QC, tracking, agente China, bodega, respuesta)
6. **CTA contacto** — email + WhatsApp
7. **Footer** — brand + columnas (servicios, empresa, contacto)

## Cómo abrirlo local

```bash
# Opción 1: doble click en site/index.html
# Opción 2: servirlo con cualquier server estático
npx serve site
# o
python -m http.server 8000 --directory site
```

## TODO antes de publicar

- [ ] Reemplazar el número de WhatsApp (`56900000000`) por el real en `index.html` (2 lugares)
- [ ] Confirmar el email `contacto@zagaimp.com` o cambiarlo por el de Francisco/Luisa
- [ ] Ajustar los stats del hero (+150 importaciones, 45 días, 24/7) a números reales
- [ ] Decidir dónde desplegar:
  - Vercel como proyecto separado apuntando a la carpeta `site/`
  - Netlify drag-and-drop
  - GitHub Pages sirviendo desde `site/`
- [ ] Configurar DNS: `zagaimp.com` → landing, `app.zagaimp.com` → SPA (ya apuntado)
- [ ] Opcional: cambiar los emojis del logo (🌏) y los iconos decorativos por SVGs propios

## Diseño

Usa los mismos tokens visuales del SPA interno:
- Dorado primario: `#c9a055`
- Dorado oscuro gradiente: `#8a6a30`
- Navy fondo: `#040c18`
- Navy secundario: `#071524`
- Texto principal: `#e8eef7`
- Texto secundario: `#b7c2d3` / `#8b97a8`

Tipografía: **Inter** (Google Fonts). Responsive con breakpoints en 900px y 640px.
