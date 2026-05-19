# Portal Sunny — Diseño funcional y técnico

**Fecha:** 2026-05-19
**Estado:** Mockup escrito — pendiente aprobación Francisco antes de implementar
**Implementación:** Mañana miércoles 20-may (bloque trabajo enfocado)

---

## 1. Propósito

Portal exclusivo para **Sunny** (agente aéreo China) donde ella:
- Ve solicitudes de cotización aérea enviadas por Francisco/Luisa
- Llena la información técnica completa (precio FOB, medidas, peso, tarifa flete, Form F)
- Envía la respuesta de vuelta al admin con un click

El admin (Francisco/Luisa) recibe la respuesta y con el botón **🎯 Auto-margen 25%** (ya implementado en Paso 2) genera el precio venta cliente automáticamente.

**Diferencia clave vs PortalChina (Ling):** el PortalChina actual es 90% read-only. **Portal Sunny es captura activa** — Sunny llena, no solo consulta.

---

## 2. Identidad de Sunny en Supabase

| Campo | Valor |
|---|---|
| Email | `1793487782@qq.com` |
| Password inicial | `ZagaAereo2024` |
| Nombre | `Sunny` |
| Rol nuevo | `agente_aereo` |
| `cliente_nombre` | N/A (no aplica para agentes) |

### Cambios SQL necesarios

```sql
-- 1. Actualizar constraint de roles permitidos
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('admin', 'gestor', 'cliente', 'agente_china', 'agente_aereo'));

-- 2. RLS policy de SELECT — Sunny ve cotizaciones aéreas en estados específicos
CREATE POLICY "agente_aereo_select" ON cotizaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'agente_aereo'
    )
    AND datos->>'transporte' = 'aereo'
    AND datos->>'estado' IN (
      'enviado_china', 'respuesta_china', 're_testeando',
      'en_negociacion', 'enviada_cliente', 'aceptada',
      'pagada_china', 'en_camino', 'completada'
    )
  );

-- 3. RLS policy de UPDATE — Sunny solo puede actualizar (campos validados en app)
CREATE POLICY "agente_aereo_update" ON cotizaciones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'agente_aereo'
    )
    AND datos->>'transporte' = 'aereo'
  );
```

**Nota seguridad:** la validación fina de "qué campos puede tocar Sunny" se hace en el componente (igual que `persistirNotas` en PortalChina). El RLS solo restringe acceso a cotizaciones aéreas.

---

## 3. Flujo de estados

```
Francisco/Luisa crea solicitud aérea
   │
   ▼
[solicitud]
   │  → admin: "Enviar a Sunny"
   ▼
[enviado_china]  ◄── Sunny ve esto en tab "待报价 Pend. cotización"
   │  → Sunny llena info técnica y click "Enviar respuesta"
   ▼
[respuesta_china]  ◄── Admin ve esto en Tracker
   │  → admin: usa 🎯 Auto-margen 25% → genera precio venta
   │  → admin: "Enviar al cliente"
   ▼
[enviada_cliente]  ◄── Cliente ve esto en su ClientePortal
   │
   ▼ (flujo normal continúa: aceptada → pagada_china → en_camino → ...)
```

**Sin cambios al flujo de estados existente** — solo agregamos a Sunny como "ojos y manos" sobre el estado `enviado_china`.

---

## 4. Campos que Sunny llena (tab "Pend. cotización")

Por cada cotización en estado `enviado_china`, Sunny ve un card editable con:

| # | Campo en Supabase | Label chino | Label español | Tipo | Notas |
|---|---|---|---|---|---|
| 1 | `sku_china` | 中国SKU | SKU China | texto | Código interno del proveedor |
| 2 | `precio_china_rmb` (nuevo) | FOB价格 (RMB) | Precio FOB en RMB | número | Lo nuevo: Sunny piensa en RMB |
| 2b | `precio_china` (existente) | FOB价格 (USD) | Precio FOB en USD | número | Calculado automático con TC RMB→USD = 7.2 |
| 3 | `dim_largo`, `dim_ancho`, `dim_alto` | 箱尺寸 长×宽×高 | Medidas caja L×A×H | número × 3 | en cm — auto-calcula m³ |
| 4 | `dim_und_caja` | 箱装 | Und/caja | número | Para cálculo nº cajas |
| 5 | `peso_kg` | 单箱重量 | Peso por caja | número | en kg |
| 6 | `aer_modo_cobro_sunny` | 计费方式 | Modo de cobro | radio (3 opc) | Auto / 重量 Peso / 体积 Volumen |
| 7a | `aer_tarifa_sunny_kg` | USD/kg | Tarifa USD/kg | número | Solo si modo = auto o peso |
| 7b | `aer_tarifa_sunny_cbm` | USD/CBM | Tarifa USD/CBM | número | Solo si modo = auto o volumen |
| 8 | `form_f_incluido` | Form F 是否包含 | Form F incluido | checkbox | TLC Chile-China |
| 9 | `dias_estimados_china` (nuevo) | 预计生产时间 | Días producción | número | Cuántos días tarda producir |
| 10 | `notas_china_historial` | 备注 | Notas | textarea | Mismo formato Ling |

**Campos nuevos a agregar al modelo** (no rompen lo existente):
- `precio_china_rmb` (number) — opcional, default vacío
- `dias_estimados_china` (number) — opcional, default vacío

### Validaciones front-end
- Si modo = "peso" → tarifa USD/kg requerida
- Si modo = "volumen" → tarifa USD/CBM requerida
- Si modo = "auto" → al menos una de las dos tarifas
- Precio FOB > 0
- Dimensiones todas > 0
- Peso > 0
- Caja con und/caja > 0

### Cálculo en vivo en el card de Sunny (read-only display)
Mientras Sunny llena, el portal le muestra calculado en vivo:
- 体积 m³ por caja
- 体积 m³ total (nº cajas × m³/caja)
- ⚠️ Alerta `<1 m³` (mismo que admin)
- 计费重量 Peso cobrable (max peso real, peso volumétrico)
- 总运费 Flete total estimado USD (según modo de cobro elegido)
- 总FOB Total FOB USD (precio × unidades)

Esto le ayuda a validar antes de enviar.

---

## 5. UI / estructura visual

### Header
```
┌─────────────────────────────────────────────────────────────┐
│ [LOGO ZAGA]  ✈️ 航空货运 Cotizador Aéreo · Sunny  [👋 Salir]│
└─────────────────────────────────────────────────────────────┘
```

Fondo navy `#040c18` + logo blanco (mismo sistema "Maritime Luxury").
Acento naranja `#c47830` para tabs aéreo activos (en lugar del oro del admin).

### Tabs (mismo formato Ling — chino + español)

| # | Tab chino | Tab español | Estados que muestra |
|---|---|---|---|
| 1 | 待报价 | Pend. cotización | `enviado_china`, `re_testeando` |
| 2 | 待客户 | Pend. cliente | `respuesta_china`, `enviada_cliente`, `en_negociacion` |
| 3 | 已确认 | Confirmadas | `aceptada`, `pagada_china` |
| 4 | 运输中 | En camino | `en_camino` |
| 5 | 已完成 | Completadas | `completada` |
| 6 | 📊 数据 | Dashboard | KPIs propios de Sunny |

Cada tab muestra el contador `(N)` al lado del nombre.

### Card en tab "Pend. cotización" (la más importante)

```
┌─────────────────────────────────────────────────────────────────┐
│ COT-115 · 待报价 Pendiente cotización                            │
│ ─────────────────────────────────────────────────────────────── │
│ 📦 INFO DEL ADMIN (read-only)                                    │
│   产品 Producto:   Aretes con perlas                            │
│   数量 Cantidad:   5,000 und                                    │
│   链接 Link:       alibaba.com/...                              │
│   图片 Imagen:     [thumbnail]                                  │
│   规格 Variantes:  Rosado / Blanco / Negro                      │
│   备注 admin:      Cliente quiere envío urgente                 │
│                                                                 │
│ 📋 请填写 Por favor llenar:                                      │
│ ─────────────────────────────────────────────────────────────── │
│   中国SKU SKU China:        [SK-EAR-2940-A]                     │
│   FOB价格:                  [12.5] RMB  →  [1.74] USD (auto)    │
│   箱长×宽×高 Caja L×A×H:    [45] [30] [25] cm                   │
│   箱装 Und/caja:            [200]                               │
│   单箱重量 Peso/caja:       [8.5] kg                            │
│   ─── 实时计算 Cálculo en vivo ───                               │
│   ▸ 单箱体积: 0.0338 m³                                          │
│   ▸ 总体积: 0.845 m³  ⚠️ <1 m³ debe consolidar                 │
│   ▸ 计费重量: 211.4 kg (volumétrico manda)                       │
│   ▸ 总FOB: 8,700 USD                                            │
│                                                                 │
│   计费方式 Modo cobro: ( ) 自动 (•) 重量 ( ) 体积                 │
│   航空运费:           [9.55] USD/kg                              │
│                       [____] USD/CBM (no aplica en peso)         │
│   ▸ 估算运费: 2,019 USD (211.4 kg × $9.55)                       │
│                                                                 │
│   Form F (TLC Chile-China): (•) 是 Sí  ( ) 否 No                │
│   预计生产时间 Producción: [15] días                              │
│   备注 Notas para admin:                                         │
│   [_________________________________________________]            │
│                                                                  │
│   [ 💾 保存草稿 Guardar borrador ]                                │
│   [ ✅ 发送给管理员 Enviar respuesta a admin → ]                  │
└─────────────────────────────────────────────────────────────────┘
```

### Card en tab "Pend. cliente" / "Confirmadas" / "En camino" (read-only)

Mismo formato que PortalChina actual (Ling) — Sunny ve estado actual pero no edita.

### Tab Dashboard (tab 6)

KPIs personales de Sunny (no del negocio completo):
- 待报价 Pendientes de cotizar (count)
- 本月已报价 Cotizadas este mes
- 已发货 Despachadas este mes
- 平均回复时间 Tiempo promedio de respuesta (días desde `enviado_china` a `respuesta_china`)
- 平均运费 Tarifa promedio USD/kg histórica

---

## 6. Vista admin después de respuesta Sunny

Cuando Sunny envía respuesta (cambia estado a `respuesta_china`):

1. **Notificación en Tracker admin** — alerta con `alertKey` único: "✈️ COT-115 Sunny respondió"
2. **Click en cotización → Calculadora abierta** con:
   - Todos los campos de Sunny ya llenos (precio China, dimensiones, peso, modo cobro, tarifas, Form F)
   - Bloque "✈️ Configuración aérea" listo
   - Botón 🎯 **Auto-margen 25%** ya visible (Paso 2 hecho)
3. **Admin click "Calcular precio"** → precio venta cliente listo
4. **Admin click "Enviar al cliente"** → estado → `enviada_cliente`

**Sin cambios al ClientePortal** — el cliente sigue viendo lo de siempre.

---

## 7. Arquitectura técnica

### Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `src/PortalSunny.jsx` | **Crear** — basado en PortalChina.jsx pero con captura editable |
| `src/App.jsx` | Modificar — agregar `rol === "agente_aereo"` → `<PortalSunny />` |
| `src/cotizador_importaciones.jsx` | Modificar — agregar 2 campos al modelo: `precio_china_rmb`, `dias_estimados_china` |

### Estructura de `PortalSunny.jsx` (esqueleto)

```jsx
import React, { useState, useEffect, useCallback } from "react";
import LOGO_WHITE from "./logo-white.png";

const TC_RMB_USD = 7.2; // TC fijo (igual que PortalChina dashboard)

export default function PortalSunny({ supabase, perfil, onLogout }) {
  const [tab, setTab] = useState("pendiente");
  const [cotizaciones, setCotizaciones] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [borrador, setBorrador] = useState({});

  // Carga inicial + suscripción real-time
  useEffect(() => {
    // SELECT cotizaciones donde transporte=aereo Y estado en lista permitida
    // RLS hace el filtro server-side
  }, []);

  // Función crítica: persistirRespuestaSunny
  // Igual que persistirNotas en PortalChina pero para múltiples campos
  async function persistirRespuestaSunny(cotId, datosSunny) {
    // 1. SELECT fresco de Supabase
    // 2. Merge: SOLO actualizar los campos de Sunny en el JSONB datos
    // 3. UPDATE con datos completos + cambio de estado opcional
  }

  // Render: header, tabs, cards según tab activa
}
```

### Reuso de código
- Sub-componentes pueden importarse de `cotizador_importaciones.jsx` (BLOCK, ROW, etc.) — refactorizar a archivo compartido si es muy reutilizable
- O duplicar inline (más simple, mantiene PortalSunny independiente)

### Función crítica `persistirRespuestaSunny` (anti-race condition)

Igual lección que el bug del `persist()` destructivo:

```jsx
async function persistirRespuestaSunny(cotId, datosNuevos) {
  // 1. Leer datos FRESCOS de Supabase
  const { data: fresca } = await supabase
    .from("cotizaciones")
    .select("datos")
    .eq("id", cotId)
    .single();

  if (!fresca) throw new Error("Cotización no encontrada");

  // 2. Merge: solo los campos de Sunny
  const camposSunny = [
    "sku_china", "precio_china", "precio_china_rmb",
    "dim_largo", "dim_ancho", "dim_alto", "dim_und_caja", "dim_tipo",
    "peso_kg",
    "aer_modo_cobro_sunny", "aer_tarifa_sunny_kg", "aer_tarifa_sunny_cbm",
    "form_f_incluido",
    "dias_estimados_china",
    "notas_china_historial",
  ];

  const datosMerged = { ...fresca.datos };
  for (const k of camposSunny) {
    if (datosNuevos[k] !== undefined) datosMerged[k] = datosNuevos[k];
  }

  // 3. Si Sunny presiona "Enviar a admin", cambiar estado
  if (datosNuevos._enviar) datosMerged.estado = "respuesta_china";

  // 4. UPDATE con datos completos
  const { error } = await supabase
    .from("cotizaciones")
    .update({ datos: datosMerged, updated_at: new Date().toISOString() })
    .eq("id", cotId)
    .select("id");

  if (error) throw error;
}
```

**Nunca borrar nada que Sunny no llenó.** Solo escribir lo que viene del form.

---

## 8. Plan de implementación mañana (miércoles 20-may)

| Bloque | Tarea | Estimado |
|---|---|---|
| **10:30 – 12:00** | 1. SQL: actualizar constraint roles + RLS policies. 2. Crear cuenta Supabase Sunny `1793487782@qq.com`. 3. Crear perfil con rol `agente_aereo`. 4. Agregar campos `precio_china_rmb` y `dias_estimados_china` a makeDefaultForm | 1,5h |
| **15:00 – 17:30** | 5. Crear `src/PortalSunny.jsx` con esqueleto + tab 1 (Pend. cotización) editable + persistirRespuestaSunny. 6. Modificar `App.jsx` con routing del nuevo rol. 7. Build + push + validar con login de Sunny en preview | 2,5h |
| **20:00 – 21:00** *(opcional)* | 8. Tabs 2-5 (read-only) y tab Dashboard de Sunny | 1h |

Si no alcanza, el resto se acumula al sábado.

---

## 9. Pendientes que esto NO resuelve (anotados para después)

- **Notificación push/email a Sunny** cuando se envía nueva cotización — fase 2
- **Histórico de tarifas de Sunny** (USD/kg promedio últimos 30 días) — útil para dashboard admin pero no MVP
- **Comparativa de proveedores** (Sunny vs Darlan backup) — Fase 4 del proyecto operaciones
- **Multi-idioma config** (Sunny puede cambiar a solo chino si quiere) — fase 2

---

## 10. Decisiones tomadas (validadas Francisco 2026-05-19)

- ✅ Margen objetivo: **25% sobre venta** (gross margin, no markup sobre costo)
- ✅ Email Sunny: `1793487782@qq.com`, cuenta nueva
- ✅ Bilingüe **chino + español**, formato Ling actual
- ✅ Rol nuevo: `agente_aereo` (no reusar `agente_china`)
- ✅ Sunny puede llenar info técnica completa (precio, dimensiones, peso, tarifas, Form F)

---

## 11. Preguntas abiertas (no bloquean — defaults razonables aplicados)

1. **TC RMB → USD:** uso 7.2 fijo (igual que PortalChina). Si Sunny necesita actualizar el TC mensualmente, agregar campo configurable después.
2. **Idioma del label admin que ve la respuesta de Sunny:** español. No traducir nada del lado admin.
3. **Permisos exactos para escribir en Supabase:** RLS hace el filtro grueso (solo aéreas), pero la validación fina de campos la hace el componente front. Riesgo aceptable (Sunny no es adversaria, solo evitamos errores accidentales).
4. **Logo / branding:** mismo que el sistema (navy + oro + Inter). Acento naranja `#c47830` para tabs aéreo activos.

---

*Documento listo para implementación. Si Francisco aprueba, mañana arrancamos por SQL/Supabase y luego React.*
