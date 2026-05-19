# -*- coding: utf-8 -*-
"""Generador de PDF para mensaje a Ling — alianza aérea ZAGA."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
)

# ── Registrar fuente china (Microsoft YaHei viene con Windows) ──
FONT_REGULAR = "MSYaHei"
FONT_BOLD = "MSYaHeiBold"
try:
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, "C:/Windows/Fonts/msyh.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/msyhbd.ttc", subfontIndex=0))
except Exception:
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, "C:/Windows/Fonts/simsun.ttc", subfontIndex=0))
    FONT_BOLD = FONT_REGULAR

# ── Colores ZAGA ──
NAVY = colors.HexColor("#040c18")
GOLD = colors.HexColor("#c9a055")
LIGHT_BG = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#e2e8f0")
ACCENT_RED = colors.HexColor("#c0392b")
ACCENT_GREEN = colors.HexColor("#15803d")
GRAY = colors.HexColor("#64748b")

# ── Estilos ──
styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    "title", parent=styles["Title"],
    fontName=FONT_BOLD, fontSize=20, textColor=NAVY,
    spaceAfter=4, alignment=TA_LEFT,
)
style_subtitle = ParagraphStyle(
    "subtitle", parent=styles["Normal"],
    fontName=FONT_REGULAR, fontSize=11, textColor=GOLD,
    spaceAfter=18, alignment=TA_LEFT,
)
style_h2 = ParagraphStyle(
    "h2", parent=styles["Heading2"],
    fontName=FONT_BOLD, fontSize=13, textColor=NAVY,
    spaceBefore=14, spaceAfter=8,
)
style_h3 = ParagraphStyle(
    "h3", parent=styles["Heading3"],
    fontName=FONT_BOLD, fontSize=11, textColor=GOLD,
    spaceBefore=10, spaceAfter=6,
)
style_body = ParagraphStyle(
    "body", parent=styles["Normal"],
    fontName=FONT_REGULAR, fontSize=10, leading=15,
    textColor=colors.HexColor("#0f172a"),
    spaceAfter=8, alignment=TA_JUSTIFY,
)
style_body_zh = ParagraphStyle(
    "body_zh", parent=style_body,
    fontName=FONT_REGULAR, fontSize=11, leading=18,
)
style_small = ParagraphStyle(
    "small", parent=styles["Normal"],
    fontName=FONT_REGULAR, fontSize=9, textColor=GRAY,
    spaceAfter=6,
)
style_footer = ParagraphStyle(
    "footer", parent=styles["Normal"],
    fontName=FONT_REGULAR, fontSize=8, textColor=GRAY, alignment=TA_CENTER,
)

# ── Estilo común de tabla ──
def tbl_style(header_bg=NAVY, header_fg=GOLD, body_size=9):
    return TableStyle([
        ("BACKGROUND", (0,0), (-1,0), header_bg),
        ("TEXTCOLOR", (0,0), (-1,0), header_fg),
        ("FONTNAME", (0,0), (-1,0), FONT_BOLD),
        ("FONTSIZE", (0,0), (-1,0), 9),
        ("FONTNAME", (0,1), (-1,-1), FONT_REGULAR),
        ("FONTSIZE", (0,1), (-1,-1), body_size),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("INNERGRID", (0,0), (-1,-1), 0.4, BORDER),
        ("BOX", (0,0), (-1,-1), 0.6, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ])

# ── Documento ──
OUT = r"C:\Users\zaldu\OneDrive\Documentos\2. ZAGA\02. Importaciones\Propuesta_Ling_Alianza_Aerea_2026-05-12.pdf"

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    rightMargin=2*cm, leftMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm,
    title="Propuesta Alianza Aérea — ZAGA",
)

story = []

# ── HEADER ──
story.append(Paragraph("ZAGA Logística", style_title))
story.append(Paragraph("Propuesta de Alianza para Envíos Aéreos China → Chile", style_subtitle))
story.append(Paragraph("Para: Ling — Agente China  |  De: Francisco Zaldúa — ZAGA  |  Fecha: 12 mayo 2026", style_small))
story.append(Spacer(1, 0.4*cm))

# ─────────────────────────────────────────────────────────────
# VERSIÓN EN CHINO
# ─────────────────────────────────────────────────────────────
story.append(Paragraph("中文版本", style_h2))
story.append(Paragraph(
    "<b>主题：四款空运报价分析 — 寻求合作透明化（COT-096 ~ 099）</b>",
    style_body_zh
))
story.append(Paragraph("亲爱的 Ling，", style_body_zh))
story.append(Paragraph(
    "非常感谢您发来的四款产品报价单（COT-096, 097, 098, 099）。我们的客户 Cristóbal "
    "是一位认真的进口商，他之前曾自己从中国直接进口，对该类产品的 FOB 价格相当熟悉。",
    style_body_zh
))
story.append(Paragraph(
    "为了能够顺利成交并建立长期合作关系，我希望与您分享一些数据，看看我们是否可以"
    "一起找到更具竞争力的方案。",
    style_body_zh
))

# Tabla 1 — Precio esperado por cliente
story.append(Paragraph("<b>客户期望价（含智利 IVA 19%）</b>", style_h3))
tabla_zh_1 = [
    ["报价号", "产品", "客户期望最终价/件 (CLP)"],
    ["COT-096", "链条手链带挂饰", "$1,300"],
    ["COT-097", "四叶草手链", "$1,000"],
    ["COT-098", "圆珠手链", "$635"],
    ["COT-099", "天使翅膀项链（定制）", "$2,200"],
]
t = Table(tabla_zh_1, colWidths=[2.5*cm, 7*cm, 5.5*cm])
t.setStyle(tbl_style())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Tabla 2 — FOB vs CIP
story.append(Paragraph("<b>FOB 中国参考成本 vs 您的 CIP 圣地亚哥</b>", style_h3))
tabla_zh_2 = [
    ["报价号", "FOB 中国参考", "您的 CIP 圣地亚哥", "差额（运费+服务）"],
    ["COT-096", "$732", "$1,250", "$518/件"],
    ["COT-097", "$412", "$790", "$378/件"],
    ["COT-098", "$320", "$525", "$205/件"],
    ["COT-099", "$1,100", "$1,890", "$790/件"],
]
t = Table(tabla_zh_2, colWidths=[2.5*cm, 3.5*cm, 4.5*cm, 4.5*cm])
t.setStyle(tbl_style())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Tabla 3 - Mis costos en Chile
story.append(Paragraph("<b>我在智利的固定成本（透明化）</b>", style_h3))
tabla_zh_3 = [
    ["项目", "金额 (CLP)"],
    ["报关服务（4 个报价合并清关）", "$331,000"],
    ["智利海关 IVA 19%", "按 CIF 计算"],
    ["我司服务费", "6% 销售价"],
]
t = Table(tabla_zh_3, colWidths=[10*cm, 5*cm])
t.setStyle(tbl_style())
story.append(t)
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph(
    "<b>问题：</b>合并所有成本后，最终客户支付价比他的期望价高出约 25%。"
    "我们必须缩小这个差距，否则订单可能无法成交。",
    style_body_zh
))

story.append(Paragraph("<b>我的请求：拆分每个报价</b>", style_h3))
story.append(Paragraph(
    "为了一起优化方案，能否请您把每个报价拆分为以下几项？",
    style_body_zh
))
desglose_zh = [
    "1. 产品 FOB 成本",
    "2. 中国国内运输（义乌 → 广州/出口口岸）",
    "3. 采购、检验与协调服务费",
    "4. 空运费（义乌 → SCL）",
    "5. 保险",
    "6. 您作为代理的佣金",
]
for item in desglose_zh:
    story.append(Paragraph(item, style_body_zh))

story.append(Spacer(1, 0.2*cm))
story.append(Paragraph("<b>长期愿景</b>", style_h3))
story.append(Paragraph(
    "Cristóbal 这次有 4 个款，未来还会有更多订单。如果我们能在空运方面建立"
    "<b>透明、公平的合作机制</b>，我希望把您作为我司在中国市场空运的"
    "<b>核心合作伙伴</b>。",
    style_body_zh
))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph("期待您的回复。非常感谢。", style_body_zh))
story.append(Paragraph("Francisco Zaldúa — ZAGA Logística", style_small))

# ─────────────────────────────────────────────────────────────
# VERSIÓN EN ESPAÑOL
# ─────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Versión en Español", style_h2))
story.append(Paragraph(
    "<b>Asunto: Análisis de 4 cotizaciones aéreas — Propuesta de transparencia para alianza (COT-096 a 099)</b>",
    style_body
))
story.append(Paragraph("Hola Ling,", style_body))
story.append(Paragraph(
    "Muchas gracias por las 4 cotizaciones que me enviaste (COT-096, 097, 098, 099). "
    "Nuestro cliente Cristóbal es un importador serio que <b>antes hacía importaciones por su cuenta "
    "directamente desde China</b>, por eso conoce muy bien los precios FOB de este tipo de productos.",
    style_body
))
story.append(Paragraph(
    "Para poder cerrar esta operación y construir una relación de largo plazo, quería compartir contigo "
    "algunos datos y ver si juntos podemos encontrar una mejor propuesta.",
    style_body
))

# Tabla 1 ES — precio esperado cliente
story.append(Paragraph("Lo que el cliente espera pagar en Chile (con IVA 19%)", style_h3))
tabla_es_1 = [
    ["Cotización", "Producto", "Precio esperado/und (CLP c/IVA)"],
    ["COT-096", "Pulsera cadena con dijes", "$1.300"],
    ["COT-097", "Pulsera trébol 4 hojas", "$1.000"],
    ["COT-098", "Pulsera cuentas redondas", "$635"],
    ["COT-099", "Collar alas ángel personalizado", "$2.200"],
]
t = Table(tabla_es_1, colWidths=[2.7*cm, 7.3*cm, 5*cm])
t.setStyle(tbl_style())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Tabla 2 ES — FOB vs CIP
story.append(Paragraph("Costos FOB China del cliente vs tu CIP Santiago", style_h3))
tabla_es_2 = [
    ["COT", "FOB China (referencia)", "Tu CIP Santiago", "Diferencia (flete + servicio)"],
    ["096", "$732", "$1.250", "$518/und"],
    ["097", "$412", "$790", "$378/und"],
    ["098", "$320", "$525", "$205/und  ← razonable"],
    ["099", "$1.100", "$1.890", "$790/und  ← el más alto"],
]
t = Table(tabla_es_2, colWidths=[2*cm, 4*cm, 4*cm, 5*cm])
t.setStyle(tbl_style())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Tabla 3 ES — Mis costos en Chile
story.append(Paragraph("Mis costos fijos en Chile (totalmente transparentes)", style_h3))
tabla_es_3 = [
    ["Concepto", "Monto (CLP)"],
    ["Agente de aduana (4 cotizaciones consolidadas en 1 despacho)", "$331.000"],
    ["IVA aduana SII (sobre CIF declarado)", "19% × CIF"],
    ["Servicio de gestión ZAGA", "6% sobre venta"],
]
t = Table(tabla_es_3, colWidths=[10*cm, 5*cm])
t.setStyle(tbl_style())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# El problema
story.append(Paragraph("El problema", style_h3))
story.append(Paragraph(
    "Sumando todos los costos, el precio final al cliente queda aproximadamente "
    "<b>25% por encima</b> de lo que él espera pagar. Si no acercamos esa brecha, "
    "la operación no se concreta.",
    style_body
))

# Pedido
story.append(Paragraph("Mi pedido: desglosá cada cotización en estas líneas", style_h3))
desglose_es = [
    "1. Costo FOB del producto",
    "2. Transporte interno en China (Yiwu → puerto/aeropuerto de salida)",
    "3. Servicio de compra, revisión y coordinación",
    "4. Flete aéreo (Yiwu → SCL)",
    "5. Seguro",
    "6. Tu comisión como agente",
]
for item in desglose_es:
    story.append(Paragraph(item, style_body))
story.append(Paragraph(
    "Así puedo ver dónde podemos negociar y dónde no.", style_body
))

# Visión
story.append(Paragraph("Visión a largo plazo", style_h3))
story.append(Paragraph(
    "Cristóbal arranca con 4 modelos pero va a tener más pedidos. Si logramos establecer "
    "un <b>modelo transparente y competitivo para envíos aéreos</b>, mi intención es "
    "<b>formalizarte como mi socia principal para todas las operaciones aéreas China → Chile</b>.",
    style_body
))
story.append(Paragraph(
    "Confío en que podemos encontrar un punto en común que beneficie a las tres partes.",
    style_body
))

story.append(Spacer(1, 0.4*cm))
story.append(Paragraph("Quedo atento a tu respuesta.", style_body))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph("<b>Francisco Zaldúa</b>", style_body))
story.append(Paragraph("ZAGA Logística — Zaldúa y Gajardo SpA", style_small))
story.append(Paragraph("RUT 77.874.968-8  ·  Cerrillos, Santiago, Chile", style_small))
story.append(Paragraph("contacto.zagastore@gmail.com  ·  zaga-imp.vercel.app", style_small))

# Footer
def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(
        A4[0]/2, 1*cm,
        f"ZAGA Logística  ·  Documento interno  ·  Página {doc.page}"
    )
    canvas.restoreState()

doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)

print(f"PDF generado: {OUT}")
print(f"Tamaño: {os.path.getsize(OUT):,} bytes")
