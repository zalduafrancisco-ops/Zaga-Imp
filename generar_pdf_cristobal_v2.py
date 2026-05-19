# -*- coding: utf-8 -*-
"""Propuesta Cristóbal v2 — 5 productos, margen 25%, costos optimizados con nuevo proveedor."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)

FONT_REG = "MSYaHei"
FONT_BOLD = "MSYaHeiBold"
try:
    pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/msyh.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/msyhbd.ttc", subfontIndex=0))
except Exception:
    pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/simsun.ttc"))
    FONT_BOLD = FONT_REG

NAVY = colors.HexColor("#040c18")
GOLD = colors.HexColor("#c9a055")
LIGHT_BG = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#e2e8f0")
GRAY = colors.HexColor("#64748b")
DARK = colors.HexColor("#0f172a")
GOLD_LIGHT = colors.HexColor("#fef3c7")
BLUE_LIGHT = colors.HexColor("#dbeafe")

S_TITLE = ParagraphStyle("t", fontName=FONT_BOLD, fontSize=18, textColor=NAVY,
                        alignment=TA_LEFT, spaceAfter=2, leading=22)
S_SUB = ParagraphStyle("s", fontName=FONT_REG, fontSize=10, textColor=GOLD,
                       alignment=TA_LEFT, spaceAfter=10, leading=13)
S_H1 = ParagraphStyle("h1", fontName=FONT_BOLD, fontSize=13, textColor=NAVY,
                      spaceBefore=10, spaceAfter=6, leading=16)
S_H2 = ParagraphStyle("h2", fontName=FONT_BOLD, fontSize=10, textColor=GOLD,
                      spaceBefore=8, spaceAfter=4, leading=13)
S_BODY = ParagraphStyle("b", fontName=FONT_REG, fontSize=9, leading=12.5, textColor=DARK,
                        spaceAfter=5, alignment=TA_JUSTIFY)
S_SMALL = ParagraphStyle("sm", fontName=FONT_REG, fontSize=8, textColor=GRAY,
                          leading=11, spaceAfter=3)
S_HIGHLIGHT = ParagraphStyle("hl", fontName=FONT_REG, fontSize=9.5, leading=13.5,
                              textColor=NAVY, leftIndent=10, rightIndent=10,
                              spaceBefore=6, spaceAfter=6, borderPadding=8,
                              backColor=GOLD_LIGHT, alignment=TA_LEFT)
S_BLUE = ParagraphStyle("bl", fontName=FONT_REG, fontSize=9.5, leading=13.5,
                          textColor=NAVY, leftIndent=10, rightIndent=10,
                          spaceBefore=6, spaceAfter=6, borderPadding=8,
                          backColor=BLUE_LIGHT, alignment=TA_LEFT)

S_TH = ParagraphStyle("th", fontName=FONT_BOLD, fontSize=8, textColor=GOLD,
                      leading=10, alignment=TA_LEFT)
S_TD = ParagraphStyle("td", fontName=FONT_REG, fontSize=8, textColor=DARK,
                      leading=10.5, alignment=TA_LEFT)
S_TD_R = ParagraphStyle("td_r", fontName=FONT_REG, fontSize=8, textColor=DARK,
                        leading=10.5, alignment=TA_RIGHT)
S_TD_B = ParagraphStyle("td_b", fontName=FONT_BOLD, fontSize=8.5, textColor=DARK,
                        leading=10.5, alignment=TA_LEFT)
S_TD_BR = ParagraphStyle("td_br", fontName=FONT_BOLD, fontSize=8.5, textColor=DARK,
                          leading=10.5, alignment=TA_RIGHT)

def th(text): return Paragraph(text, S_TH)
def td(text, bold=False, right=False):
    if bold and right: return Paragraph(text, S_TD_BR)
    if bold: return Paragraph(text, S_TD_B)
    if right: return Paragraph(text, S_TD_R)
    return Paragraph(text, S_TD)

def estilo_tabla():
    return TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("INNERGRID", (0,0), (-1,-1), 0.3, BORDER),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ])

OUT = r"C:\Users\zaldu\OneDrive\Documentos\2. ZAGA\02. Importaciones\Propuesta_Cristobal_v2_2026-05-15.pdf"
doc = SimpleDocTemplate(OUT, pagesize=A4,
                        rightMargin=1.8*cm, leftMargin=1.8*cm,
                        topMargin=1.6*cm, bottomMargin=1.6*cm,
                        title="Propuesta ZAGA v2 — Socio Logístico Integral · Cristóbal")
story = []

# ═══════════════════════════════════════════
# PORTADA
# ═══════════════════════════════════════════
story.append(Paragraph("ZAGA Logística", S_TITLE))
story.append(Paragraph("Propuesta Comercial v2 — Socio Logístico Integral", S_SUB))
story.append(HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceBefore=2, spaceAfter=8))

ident = [
    [td("<b>Para:</b>"), td("Cristóbal Chicharro"),
     td("<b>Fecha:</b>"), td("15 de mayo de 2026")],
    [td("<b>De:</b>"), td("Francisco Zaldúa · Fundador ZAGA"),
     td("<b>Cotizaciones:</b>"), td("COT-096, 097, 098, 099 + Aretes")],
]
t = Table(ident, colWidths=[1.5*cm, 7*cm, 2.5*cm, 6.5*cm])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
]))
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Resumen ejecutivo
story.append(Paragraph("Lo que le ofrezco en pocas palabras", S_H1))
story.append(Paragraph(
    "Estimado Cristóbal, esta es la propuesta actualizada con las cantidades confirmadas y el "
    "quinto producto agregado (aretes con circonita rosa). Mi rol es ser su <b>socio logístico "
    "integral en la ruta China-Chile</b>: compra, flete, aduana, despacho y entrega final — "
    "todo bajo una sola gestión profesional con apoyo en cada paso de la cadena.",
    S_BODY
))
story.append(Paragraph(
    "Sé que realiza <b>10 a 15 importaciones por mes</b> y que busca un partner que le dé "
    "<b>seguridad en todo el proceso</b>. Eso es exactamente lo que diseñé en este programa.",
    S_HIGHLIGHT
))

# Por qué un socio logístico
story.append(Paragraph("¿Por qué un socio logístico integral?", S_H1))
beneficios_socio = [
    [th("Aspecto"), th("Operar solo"), th("Con ZAGA como socio")],
    [td("Negociación con proveedores", bold=True), td("Sin apoyo"), td("Apoyo y validación")],
    [td("Compra y coordinación China", bold=True), td("Manual"), td("Agente China gestiona")],
    [td("Consolidación múltiples modelos", bold=True), td("Despachos separados"), td("1 despacho consolidado")],
    [td("Gestión aduanera", bold=True), td("Entrada informal"), td("Despacho formal certificado")],
    [td("Resolución de problemas", bold=True), td("Solo automático"), td("Línea directa <24 hs")],
    [td("Fulfillment integrado", bold=True), td("Aparte"), td("$1.000 + IVA por entregado · tasa entrega >80%")],
    [td("Soporte continuo", bold=True), td("Limitado"), td("Reunión mensual + WhatsApp")],
    [td("Plataforma tecnológica", bold=True), td("Manual / planillas"), td("App ZAGA + portal integrado en desarrollo")],
]
t = Table(beneficios_socio, colWidths=[5*cm, 5.5*cm, 7*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)

# ═══════════════════════════════════════════
# GESTIÓN ADUANERA PROFESIONAL
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Gestión aduanera profesional", S_H1))
story.append(Paragraph(
    "ZAGA trabaja con <b>agente de aduana certificada</b> para todo el proceso de internación "
    "en Chile. Esto le entrega varios beneficios concretos en cada operación:",
    S_BODY
))

beneficios_aduana = [
    [th("Beneficio"), th("Detalle")],
    [td("Despacho formal", bold=True),
     td("Internación profesional con documentación completa (DUS, packing list, commercial invoice).")],
    [td("Consolidación de modelos", bold=True),
     td("Los 5 productos en un solo despacho aduanero, evitando duplicación de costos fijos.")],
    [td("Trazabilidad completa", bold=True),
     td("Seguimiento desde llegada al aeropuerto hasta la entrega final en bodega.")],
    [td("Documentación contable", bold=True),
     td("Factura electrónica con desglose para fines tributarios y respaldo F29.")],
    [td("Cumplimiento normativo", bold=True),
     td("Aplicación correcta de tratados internacionales y aranceles preferenciales cuando corresponde.")],
    [td("Respaldo profesional", bold=True),
     td("Agente con experiencia y registro vigente ante el Servicio Nacional de Aduanas.")],
]
t = Table(beneficios_aduana, colWidths=[4.5*cm, 13*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "Todos los costos asociados a la gestión aduanera están <b>incluidos en el precio "
    "integral</b> de cada cotización. El cliente recibe un precio único todo incluido, sin "
    "sorpresas ni costos adicionales el día del despacho.",
    S_HIGHLIGHT
))

# ═══════════════════════════════════════════
# PRECIOS COTIZACIONES
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Propuesta de precios — 5 cotizaciones consolidadas", S_H1))
story.append(Paragraph(
    "Los siguientes son precios <b>integrales todo incluido</b> por unidad. Como cliente "
    "preferente inaugural, estos precios consideran el margen más ajustado que permite "
    "mantener el estándar profesional del servicio integral. Todos los productos consolidados "
    "en un solo despacho aéreo.",
    S_BODY
))

precios = [
    [th("Cotización"), th("Producto"), th("Unidades"), th("Precio c/IVA por und"), th("Total c/IVA")],
    [td("COT-096", bold=True), td("Pulsera de cadena con dijes"),
     td("4.000", right=True), td("$1.260", bold=True, right=True), td("$5.040.000", right=True)],
    [td("COT-097", bold=True), td("Pulsera de trébol 4 hojas"),
     td("4.000", right=True), td("$840", bold=True, right=True), td("$3.360.000", right=True)],
    [td("COT-098", bold=True), td("Pulsera cuentas redondas"),
     td("4.000", right=True), td("$795", bold=True, right=True), td("$3.180.000", right=True)],
    [td("COT-099", bold=True), td("Collar alas ángel personalizado"),
     td("1.000", right=True), td("$2.190", bold=True, right=True), td("$2.190.000", right=True)],
    [td("Aretes", bold=True), td("Aretes trébol circonita rosa"),
     td("3.000", right=True), td("$1.150", bold=True, right=True), td("$3.450.000", right=True)],
    [td("", bold=True), td("", bold=True), td("<b>16.000 und</b>", bold=True, right=True),
     td("<b>TOTAL c/IVA</b>", bold=True, right=True), td("<b>$17.220.000</b>", bold=True, right=True)],
]
t = Table(precios, colWidths=[2*cm, 6*cm, 2*cm, 3.5*cm, 4*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.25*cm))

story.append(Paragraph("¿Qué incluye el precio integral?", S_H2))
incluye = [
    "Producto fabricado por la proveedora china con control de calidad básico.",
    "Flete aéreo CIP Santiago desde China hasta aeropuerto SCL.",
    "Gestión completa con agente de aduana certificada en Chile.",
    "Todos los impuestos y aranceles correspondientes a la importación.",
    "Retiro de mercadería del aeropuerto y entrega final en bodega del cliente.",
    "Soporte permanente durante todo el proceso (línea directa con Francisco).",
    "Documentación aduanera y contable completa para fines tributarios.",
]
for i in incluye:
    story.append(Paragraph(f"• {i}", S_BODY))

story.append(Spacer(1, 0.15*cm))
story.append(Paragraph(
    "Precios válidos por 15 días corridos. Pago 100% anticipado al confirmar la operación.",
    S_SMALL
))

# ═══════════════════════════════════════════
# VISIÓN MARÍTIMO
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Visión estratégica: marítimo como complemento al aéreo", S_H1))
story.append(Paragraph(
    "Estas 5 cotizaciones son aéreas debido a la urgencia. Sin embargo, para volúmenes "
    "recurrentes como el suyo (10-15 ops/mes), el <b>transporte marítimo es una alternativa "
    "estratégica que vale la pena evaluar a futuro</b>.",
    S_BODY
))

story.append(Paragraph("Por qué marítimo puede ser una buena opción", S_H2))
story.append(Paragraph(
    "Las proveedoras chinas con las que trabajo tienen contenedores saliendo regularmente y "
    "optimizan la consolidación de carga, lo que permite un mejor aprovechamiento del espacio "
    "y un costo de flete más eficiente comparado con aéreo.",
    S_BODY
))

story.append(Paragraph(
    "<b>Plazos:</b> el tránsito marítimo desde China hasta Santiago es de aproximadamente "
    "<b>60 a 90 días</b>, dependiendo de la ruta del contenedor y los tiempos en aduana. "
    "Requiere planificación con anticipación.",
    S_BODY
))

story.append(Paragraph(
    "<b>Mi propuesta estratégica:</b> mantenemos el aéreo para urgencias y productos nuevos a "
    "testear, y evaluamos planificar por marítimo las reposiciones de productos ganadores. "
    "Una vez completado el primer despacho aéreo, podemos analizar juntos qué referencias "
    "califican para marítimo y armar un plan de reposición con tiempos adecuados.",
    S_BLUE
))

story.append(Paragraph("¿Qué se mantiene igual en marítimo?", S_H2))
mantiene = [
    "Mi rol como socio logístico integral: misma gestión, mismo nivel de soporte.",
    "Agente de aduana profesional para el despacho.",
    "Línea directa con Francisco durante todo el proceso.",
    "Trazabilidad completa.",
]
for m in mantiene:
    story.append(Paragraph(f"• {m}", S_BODY))

story.append(Spacer(1, 0.15*cm))
story.append(Paragraph(
    "El precio integral de cada operación marítima se cotiza por separado según el volumen, "
    "el contenedor disponible y los modelos consolidados.",
    S_SMALL
))

# ═══════════════════════════════════════════
# PLATAFORMA TECNOLÓGICA
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Plataforma tecnológica ZAGA", S_H1))
story.append(Paragraph(
    "Un diferencial importante de ZAGA frente a operadores logísticos tradicionales es que "
    "trabajamos sobre una <b>plataforma tecnológica propia</b>, diseñada específicamente para "
    "importadores y operadores de fulfillment en Chile.",
    S_BODY
))

story.append(Paragraph("Disponible hoy: App de seguimiento de importaciones", S_H2))
story.append(Paragraph(
    "Cada cliente cuenta con acceso a una <b>aplicación web personalizada</b> donde puede:",
    S_BODY
))
app_actual = [
    "Ver el estado en tiempo real de todas sus importaciones activas (producción, embarque, tránsito, aduana, despacho).",
    "Consultar el historial completo de operaciones anteriores.",
    "Revisar precios, plazos y trazabilidad de cada cotización.",
    "Comunicarse directamente con el equipo ZAGA por mensajería integrada.",
    "Recibir notificaciones de avances y alertas operativas.",
]
for a in app_actual:
    story.append(Paragraph(f"• {a}", S_BODY))

story.append(Spacer(1, 0.15*cm))
story.append(Paragraph("En desarrollo: Portal integral de operaciones", S_H2))
story.append(Paragraph(
    "Estamos construyendo un <b>portal de control completo</b> que ampliará las capacidades "
    "actuales para entregar una solución end-to-end de importación + fulfillment:",
    S_BODY
))

portal_futuro = [
    [th("Funcionalidad"), th("Detalle")],
    [td("Inventario en tiempo real", bold=True),
     td("Control de stock por SKU, por bodega y por marca, con actualización automática en cada movimiento.")],
    [td("Integración Mercado Libre", bold=True),
     td("Sincronización de stock, gestión de órdenes y procesos automatizados.")],
    [td("Integración Shopify", bold=True),
     td("Vinculación directa con tiendas Shopify para fulfillment automático.")],
    [td("Integración Bsale", bold=True),
     td("Facturación electrónica integrada al flujo operativo.")],
    [td("Fulfillment multimarca", bold=True),
     td("Diseñado tanto para importadores Dropi como para marcas propias que externalizan su fulfillment.")],
    [td("Reportes y métricas", bold=True),
     td("KPIs operativos, tasas de entrega, márgenes y rentabilidad por canal de venta.")],
]
t = Table(portal_futuro, colWidths=[4.5*cm, 13*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Como cliente preferente inaugural</b>, tendrá acceso temprano al portal una vez "
    "liberado, con la posibilidad de aportar feedback durante el desarrollo y conseguir "
    "configuraciones a la medida de su operación.",
    S_HIGHLIGHT
))

# ═══════════════════════════════════════════
# PROGRAMA PARTNER + COMPROMISO
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Programa ZAGA Partner — Cliente Preferente Inaugural", S_H1))
story.append(Paragraph(
    "Como <b>cliente preferente inaugural</b>, le ofrezco condiciones especiales pensadas para "
    "construir una alianza de largo plazo. Mi compromiso con usted es entregarle siempre el "
    "<b>margen más ajustado posible</b> que pueda mantener el estándar de servicio profesional.",
    S_HIGHLIGHT
))

beneficios = [
    [th("Beneficio"), th("Detalle")],
    [td("Margen preferente", bold=True),
     td("Los precios más ajustados que ZAGA puede ofrecer manteniendo el estándar profesional del servicio. Se mantiene este beneficio en todas las operaciones futuras.")],
    [td("Consolidación aduanera", bold=True),
     td("Múltiples modelos en un solo despacho aduanero — eficiencia operativa y ahorro real en costos fijos.")],
    [td("Gestión profesional completa", bold=True),
     td("Compra, flete, aduana, despacho y entrega — todo bajo una sola gestión, sin que el cliente se ocupe de detalles.")],
    [td("Línea directa Francisco", bold=True),
     td("WhatsApp y llamada directa para cualquier consulta operativa, sin intermediarios.")],
    [td("Soporte prioritario", bold=True),
     td("Resolución activa de cualquier problema dentro de 24 horas hábiles.")],
    [td("Fulfillment integrado", bold=True),
     td("$1.000 + IVA por pedido entregado, sujeto a mantener una tasa de entrega superior al 80%.")],
    [td("Plataforma tecnológica", bold=True),
     td("App ZAGA con seguimiento e historial de importaciones + acceso temprano al portal integrado (en desarrollo) con inventario en tiempo real e integraciones ML, Shopify, Bsale.")],
    [td("Reunión mensual estratégica", bold=True),
     td("30 minutos al mes para planificar próximos pedidos, revisar rendimiento y mejorar el servicio.")],
    [td("Visión integral aéreo + marítimo", bold=True),
     td("Asesoría para combinar transporte aéreo (urgencias) y marítimo (reposiciones) según conveniencia.")],
]
t = Table(beneficios, colWidths=[4.5*cm, 13*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Compromiso final
story.append(Paragraph("Mi compromiso con usted", S_H1))
story.append(Paragraph(
    "Cristóbal, le tengo respeto y reconocimiento por su trayectoria. Esto no es una venta — "
    "es una <b>alianza de largo plazo</b>. Para que quede claro, mi compromiso concreto:",
    S_BODY
))

compromisos = [
    "<b>Servicio integral premium</b>: gestión completa desde China hasta su bodega, sin que se ocupe de detalles operativos.",
    "<b>Apoyo en toda la cadena</b>: desde la negociación con proveedores hasta la entrega final.",
    "<b>Seguridad de procesos</b>: agente de aduana certificada y documentación impecable en cada operación.",
    "<b>Línea directa</b>: cualquier duda o problema se atiende directamente conmigo, sin call center.",
    "<b>Escalabilidad</b>: estructurado para soportar sus 10-15 operaciones mensuales y crecer juntos.",
    "<b>Visión integral</b>: aéreo para urgencias y marítimo para reposiciones — el balance correcto según cada operación.",
]
for c in compromisos:
    story.append(Paragraph(f"• {c}", S_BODY))

story.append(Spacer(1, 0.25*cm))
story.append(Paragraph(
    "Quedo atento a su confirmación para coordinar una reunión por video durante esta semana "
    "y conversar la propuesta en detalle.",
    S_BODY
))

story.append(Spacer(1, 0.3*cm))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=4, spaceAfter=8))
story.append(Paragraph("<b>Francisco Zaldúa</b>", S_BODY))
story.append(Paragraph("Fundador — ZAGA Logística · Zaldúa y Gajardo SpA · RUT 77.874.968-8", S_SMALL))
story.append(Paragraph("Cerrillos, Santiago, Chile · ventas@zagaimp.com · zaga-imp.vercel.app", S_SMALL))

def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REG, 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0]/2, 0.8*cm,
        f"ZAGA Logística  ·  Propuesta v2 Socio Logístico — Cristóbal  ·  Página {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
print(f"PDF generado: {OUT}")
print(f"Tamaño: {os.path.getsize(OUT):,} bytes")
