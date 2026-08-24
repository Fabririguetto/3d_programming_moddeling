import { jsPDF } from 'jspdf'
import type { PieceMeta } from '../store/useStore'

interface GroupedPiece extends PieceMeta {
  qty: number
}

const A4_W = 210
const MARGIN = 18
const COS30 = Math.cos(Math.PI / 6)
const SIN30 = Math.sin(Math.PI / 6)

// Isometric projection: JSCAD (x=Ancho, y=Prof, z=Alto) → 2D
function isoProject(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS30, (x + y) * SIN30 + z]
}

function isoExtents(W: number, D: number, H: number) {
  const corners = [
    [0,0,0],[W,0,0],[0,D,0],[W,D,0],
    [0,0,H],[W,0,H],[0,D,H],[W,D,H],
  ].map(([x,y,z]) => isoProject(x,y,z))
  return {
    minX: Math.min(...corners.map(c => c[0])),
    maxX: Math.max(...corners.map(c => c[0])),
    minY: Math.min(...corners.map(c => c[1])),
    maxY: Math.max(...corners.map(c => c[1])),
  }
}

function drawDimAnnotation(
  doc: jsPDF,
  p1: [number, number],
  p2: [number, number],
  label: string,
  offset: number,
  bCx: number, bCy: number,
  r: number, g: number, b: number
) {
  const [x1, y1] = p1, [x2, y2] = p2
  const len = Math.hypot(x2 - x1, y2 - y1)

  if (len < 0.8) {
    // Degenerate edge: show label inline
    doc.setFontSize(6.5)
    doc.setTextColor(r, g, b)
    doc.text(label, x1 - 2, y1 - 2, { align: 'right' })
    return
  }

  const dx = (x2 - x1) / len, dy = (y2 - y1) / len
  const n1x = -dy, n1y = dx

  // Perpendicular that points away from box center
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dot = n1x * (mx - bCx) + n1y * (my - bCy)
  const sign = dot >= 0 ? 1 : -1
  const ox = n1x * offset * sign, oy = n1y * offset * sign

  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.18)

  // Extension lines
  doc.line(x1, y1, x1 + ox, y1 + oy)
  doc.line(x2, y2, x2 + ox, y2 + oy)

  // Dimension line
  doc.setLineWidth(0.28)
  doc.line(x1 + ox, y1 + oy, x2 + ox, y2 + oy)

  // Arrow heads
  const realAng = Math.atan2(y2 + oy - (y1 + oy), x2 + ox - (x1 + ox))
  const arr = 1.8
  doc.setLineWidth(0.22)
  doc.line(x1+ox, y1+oy, x1+ox+Math.cos(realAng+0.45)*arr, y1+oy+Math.sin(realAng+0.45)*arr)
  doc.line(x1+ox, y1+oy, x1+ox+Math.cos(realAng-0.45)*arr, y1+oy+Math.sin(realAng-0.45)*arr)
  doc.line(x2+ox, y2+oy, x2+ox+Math.cos(realAng+Math.PI+0.45)*arr, y2+oy+Math.sin(realAng+Math.PI+0.45)*arr)
  doc.line(x2+ox, y2+oy, x2+ox+Math.cos(realAng+Math.PI-0.45)*arr, y2+oy+Math.sin(realAng+Math.PI-0.45)*arr)

  // Label
  doc.setFontSize(7)
  doc.setTextColor(r, g, b)
  doc.text(label, mx + ox, my + oy - 1.2, { align: 'center' })
}

function drawIsoBox(
  doc: jsPDF,
  cx: number, cy: number,   // center of drawing area in PDF mm
  areaW: number, areaH: number,
  W: number, D: number, H: number
) {
  const ext = isoExtents(W, D, H)
  const isoW = (ext.maxX - ext.minX) || 1
  const isoH = (ext.maxY - ext.minY) || 1

  // Use 72% of area for the box, leaving 28% for dimension annotations
  const scale = Math.min((areaW * 0.72) / isoW, (areaH * 0.72) / isoH)

  function toPDF(ix: number, iy: number): [number, number] {
    return [
      cx + (ix - ext.minX - isoW / 2) * scale,
      cy - (iy - ext.minY - isoH / 2) * scale,  // flip Y for PDF
    ]
  }

  function corner(x: number, y: number, z: number): [number, number] {
    const [ix, iy] = isoProject(x, y, z)
    return toPDF(ix, iy)
  }

  const c000 = corner(0,0,0), c100 = corner(W,0,0)
  const c010 = corner(0,D,0), c110 = corner(W,D,0)
  const c001 = corner(0,0,H), c101 = corner(W,0,H)
  const c011 = corner(0,D,H), c111 = corner(W,D,H)

  // Box center in PDF (average of all 8 corners)
  const bCx = (c000[0]+c100[0]+c010[0]+c110[0]+c001[0]+c101[0]+c011[0]+c111[0]) / 8
  const bCy = (c000[1]+c100[1]+c010[1]+c110[1]+c001[1]+c101[1]+c011[1]+c111[1]) / 8

  // Draw faces with subtle fill to help readability
  // Top face (brightest)
  doc.setFillColor(230, 225, 215)
  doc.setDrawColor(60, 55, 50)
  doc.setLineWidth(0)
  drawPolygon(doc, [c001, c101, c111, c011], true)

  // Right face
  doc.setFillColor(200, 195, 185)
  drawPolygon(doc, [c100, c110, c111, c101], true)

  // Front face
  doc.setFillColor(215, 210, 200)
  drawPolygon(doc, [c000, c100, c101, c001], true)

  // Edges
  doc.setDrawColor(40, 35, 30)
  doc.setLineWidth(0.35)
  const edges: [[number,number],[number,number]][] = [
    [c000,c100],[c000,c010],[c100,c110],[c010,c110],
    [c001,c101],[c001,c011],[c101,c111],[c011,c111],
    [c000,c001],[c100,c101],[c010,c011],[c110,c111],
  ]
  for (const [a, b] of edges) doc.line(a[0], a[1], b[0], b[1])

  // Dimension annotations
  const dimOff = Math.max(7, Math.min(isoW, isoH) * scale * 0.12 + 5)
  drawDimAnnotation(doc, c000, c100, `${W} mm`, dimOff, bCx, bCy, 180, 40, 40)   // W red
  drawDimAnnotation(doc, c100, c101, `${H} mm`, dimOff, bCx, bCy, 40, 130, 40)   // H green
  drawDimAnnotation(doc, c000, c010, `${D} mm`, dimOff, bCx, bCy, 40, 80, 200)   // D blue
}

function drawPolygon(doc: jsPDF, pts: [number,number][], fill: boolean) {
  if (pts.length < 2) return
  // jsPDF lines() / triangle fill approach using moveTo / lineTo via internal path
  // Use rect-style drawing via triangle pairs
  const style = fill ? 'F' : 'S'
  // Build path manually by drawing lines and closing
  doc.setLineWidth(0)
  // Use the polygon via multiple triangles (fan triangulation from first vertex)
  for (let i = 1; i < pts.length - 1; i++) {
    const tri = [pts[0], pts[i], pts[i+1]] as [number,number][]
    drawFilledTriangle(doc, tri, style)
  }
}

function drawFilledTriangle(doc: jsPDF, pts: [number,number][], style: string) {
  // jsPDF triangle via lines() method doesn't exist, use the internal path trick:
  // We can use doc.triangle or just lines with fill
  const [p0, p1, p2] = pts
  ;(doc as jsPDF & { triangle: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, style: string) => void })
    .triangle(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], style)
}

function commonPrefix(names: string[]): string {
  if (names.length === 1) return names[0]
  let prefix = names[0]
  for (let i = 1; i < names.length; i++) {
    let j = 0
    while (j < prefix.length && j < names[i].length && prefix[j] === names[i][j]) j++
    prefix = prefix.slice(0, j)
  }
  // Strip trailing non-letter characters (e.g. "Pata " → "Pata")
  const trimmed = prefix.trimEnd().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/, '').trim()
  return trimmed || names[0]
}

function groupPieces(pieces: PieceMeta[]): GroupedPiece[] {
  // Key by dimensions only — pieces with the same size are the same cut
  const map = new Map<string, { names: string[]; piece: GroupedPiece }>()
  for (const p of pieces) {
    const key = `${p.w}|${p.d}|${p.h}`
    const ex = map.get(key)
    if (ex) {
      ex.names.push(p.name)
      ex.piece.qty++
    } else {
      map.set(key, { names: [p.name], piece: { ...p, qty: 1 } })
    }
  }
  return Array.from(map.values()).map(({ names, piece }) => ({
    ...piece,
    name: commonPrefix(names),
  }))
}

export function exportPDF(projectName: string, pieces: PieceMeta[]) {
  if (!pieces.length) {
    alert('No hay piezas para exportar. El código debe retornar un array con { name, geo }.')
    return
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const grouped = groupPieces(pieces)
  const totalUnits = pieces.length

  // ── Página 1: Header + Lista de piezas ───────────────────────────────────
  // Header bar
  doc.setFillColor(20, 22, 40)
  doc.rect(0, 0, A4_W, 24, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(190, 205, 255)
  doc.text('PLANO DE FABRICACIÓN', A4_W / 2, 11, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(140, 155, 200)
  doc.text(projectName, A4_W / 2, 18, { align: 'center' })

  let y = 30

  // Meta row
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 110)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, MARGIN, y)
  doc.text(
    `${grouped.length} pieza${grouped.length !== 1 ? 's' : ''} única${grouped.length !== 1 ? 's' : ''}  ·  ${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''} en total`,
    A4_W - MARGIN, y, { align: 'right' }
  )
  y += 7

  // Table header
  const COL_NAME = MARGIN + 2
  const COL_W = MARGIN + 65
  const COL_H = MARGIN + 100
  const COL_D = MARGIN + 133
  const COL_QTY = MARGIN + 163
  const TABLE_RIGHT = A4_W - MARGIN

  doc.setFillColor(35, 40, 75)
  doc.rect(MARGIN, y, TABLE_RIGHT - MARGIN, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(180, 195, 255)
  doc.text('Nombre', COL_NAME, y + 5.5)
  doc.text('Ancho X (mm)', COL_W, y + 5.5)
  doc.text('Alto Z (mm)', COL_H, y + 5.5)
  doc.text('Prof. Y (mm)', COL_D, y + 5.5)
  doc.text('Cant.', COL_QTY, y + 5.5)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  for (let i = 0; i < grouped.length; i++) {
    const p = grouped[i]
    if (i % 2 === 0) {
      doc.setFillColor(246, 247, 252)
      doc.rect(MARGIN, y, TABLE_RIGHT - MARGIN, 7, 'F')
    }
    doc.setTextColor(25, 25, 35)
    doc.text(p.name, COL_NAME, y + 4.8)
    doc.setTextColor(160, 35, 35)
    doc.text(String(p.w), COL_W, y + 4.8)
    doc.setTextColor(35, 120, 35)
    doc.text(String(p.h), COL_H, y + 4.8)
    doc.setTextColor(35, 70, 185)
    doc.text(String(p.d), COL_D, y + 4.8)
    doc.setTextColor(60, 60, 70)
    doc.text(String(p.qty), COL_QTY, y + 4.8)
    y += 7
  }

  // Table border
  const tableStartY = 37
  doc.setDrawColor(140, 145, 175)
  doc.setLineWidth(0.25)
  doc.rect(MARGIN, tableStartY, TABLE_RIGHT - MARGIN, y - tableStartY)

  // Color legend
  y += 5
  doc.setFontSize(7.5)
  doc.setTextColor(160, 35, 35)
  doc.text('■ Ancho = dimensión en eje X', MARGIN, y)
  doc.setTextColor(35, 120, 35)
  doc.text('■ Alto = dimensión en eje Z', MARGIN + 58, y)
  doc.setTextColor(35, 70, 185)
  doc.text('■ Prof. = dimensión en eje Y', MARGIN + 116, y)

  // ── Páginas 2+: una por pieza única ──────────────────────────────────────
  for (const piece of grouped) {
    doc.addPage()

    // Header
    doc.setFillColor(20, 22, 40)
    doc.rect(0, 0, A4_W, 20, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(190, 205, 255)
    doc.text(piece.name.toUpperCase(), A4_W / 2, 12, { align: 'center' })

    let py = 26

    // Dimensions summary
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(55, 55, 75)
    doc.text(
      `${piece.w} × ${piece.h} × ${piece.d} mm   (Ancho × Alto × Prof.)`,
      A4_W / 2, py, { align: 'center' }
    )
    py += 6

    if (piece.qty > 1) {
      doc.setTextColor(110, 75, 30)
      doc.text(`Cantidad: ${piece.qty} piezas iguales`, A4_W / 2, py, { align: 'center' })
      py += 6
    }

    // Separator
    doc.setDrawColor(170, 172, 195)
    doc.setLineWidth(0.25)
    doc.line(MARGIN, py, A4_W - MARGIN, py)
    py += 4

    // ISO drawing area
    const drawAreaW = A4_W - MARGIN * 2 - 4
    const drawAreaH = 185
    const drawCx = A4_W / 2
    const drawCy = py + drawAreaH / 2

    // Light background for drawing area
    doc.setFillColor(252, 252, 255)
    doc.rect(MARGIN + 2, py, drawAreaW, drawAreaH, 'F')
    doc.setDrawColor(200, 200, 215)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN + 2, py, drawAreaW, drawAreaH, 'S')

    drawIsoBox(doc, drawCx, drawCy, drawAreaW, drawAreaH, piece.w, piece.d, piece.h)

    py += drawAreaH + 5

    // Color-coded dimension summary below drawing
    doc.setFontSize(8.5)
    const col1 = MARGIN + 5, col2 = MARGIN + 65, col3 = MARGIN + 125

    doc.setTextColor(160, 35, 35)
    doc.setFont('helvetica', 'bold')
    doc.text('Ancho (X):', col1, py)
    doc.setFont('helvetica', 'normal')
    doc.text(`${piece.w} mm`, col1 + 26, py)

    doc.setTextColor(35, 120, 35)
    doc.setFont('helvetica', 'bold')
    doc.text('Alto (Z):', col2, py)
    doc.setFont('helvetica', 'normal')
    doc.text(`${piece.h} mm`, col2 + 22, py)

    doc.setTextColor(35, 70, 185)
    doc.setFont('helvetica', 'bold')
    doc.text('Prof. (Y):', col3, py)
    doc.setFont('helvetica', 'normal')
    doc.text(`${piece.d} mm`, col3 + 24, py)
  }

  const safeName = projectName.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '_').trim()
  doc.save(`${safeName}_plano.pdf`)
}
