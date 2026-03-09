# ZAGA Import — Guía de instalación

## PASO 1 — Supabase: Crear las tablas

1. Ve a tu proyecto en **supabase.com**
2. Menú izquierdo → **SQL Editor** → **New Query**
3. Copia y pega TODO el contenido del archivo `PASO1_ejecutar_en_supabase.sql`
4. Presiona **Run** (botón verde)
5. Deberías ver "Success" ✓

---

## PASO 2 — Supabase: Crear usuarios (Francisco, Luisa y clientes)

### Crear Francisco y Luisa:
1. Supabase → **Authentication** → **Users** → **Add User**
2. Ingresa email y contraseña para Francisco (ej: francisco@zagaimp.com)
3. Repite para Luisa (ej: luisa@zagaimp.com)
4. Copia el **UUID** de cada usuario (columna User UID)

### Registrar sus perfiles en la base de datos:
Ve a **SQL Editor** y ejecuta (reemplazando los UUIDs reales):

```sql
-- Francisco (admin)
insert into public.perfiles (id, email, nombre, rol)
values ('UUID-DE-FRANCISCO', 'francisco@zagaimp.com', 'Francisco', 'admin');

-- Luisa (admin)
insert into public.perfiles (id, email, nombre, rol)
values ('UUID-DE-LUISA', 'luisa@zagaimp.com', 'Luisa', 'admin');
```

### Crear un cliente:
1. **Authentication** → **Users** → **Add User**
2. Email del cliente (ej: maria@empresa.cl) + contraseña temporal
3. Copia su UUID y ejecuta:

```sql
-- Cliente (reemplaza TODO lo que está en mayúsculas)
insert into public.perfiles (id, email, nombre, rol, cliente_nombre)
values (
  'UUID-DEL-CLIENTE',
  'maria@empresa.cl',
  'María González',   -- nombre para mostrar
  'cliente',
  'María González'    -- debe ser EXACTAMENTE igual al campo "cliente" en las cotizaciones
);
```

⚠️ El campo `cliente_nombre` debe coincidir exactamente con el nombre que usas en el cotizador.

---

## PASO 3 — Vercel: Publicar la app

1. Ve a **vercel.com** → crea cuenta con GitHub/Google
2. **Add New Project** → **Deploy**
3. Arrastra la carpeta `zaga-import` (esta carpeta) o sube el ZIP
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = `https://ohehdoeysmwllppmtstp.supabase.co`
   - `VITE_SUPABASE_KEY` = `sb_publishable_uZRmer6U3V7P4QUmdShrHA_J6zMwe0e`
5. Presiona **Deploy**
6. Tu app quedará en una URL como `zaga-import-xxx.vercel.app`

---

## PASO 4 — Dominio: Conectar app.zagaimp.com

1. En Vercel → tu proyecto → **Settings** → **Domains**
2. Agrega `app.zagaimp.com`
3. Vercel te dará un registro DNS (tipo CNAME)
4. En Shopify → **Online Store** → **Domains** → **DNS Settings**
5. Agrega el registro CNAME que te dio Vercel

---

## PASO 5 — Migrar datos actuales

1. Abre el cotizador actual (versión vieja)
2. Presiona **⬇ Exportar** y guarda el JSON
3. Abre la nueva app en Vercel, inicia sesión como Francisco
4. Presiona **⬆ Importar** y pega el JSON
5. Listo — todos los datos migrados ✓

---

## Resumen de accesos

| Usuario   | URL                  | Acceso               |
|-----------|----------------------|----------------------|
| Francisco | app.zagaimp.com      | Todo el cotizador    |
| Luisa     | app.zagaimp.com      | Todo el cotizador    |
| Clientes  | app.zagaimp.com      | Solo sus importaciones |

---

¿Dudas? Consulta a tu equipo técnico o al asistente ZAGA.
