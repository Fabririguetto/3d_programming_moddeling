import { useState } from 'react'
import styles from './PromptTab.module.css'

const PROMPT = `Sos un experto en diseño 3D con JSCAD (OpenJSCAD). Ayudame a modelar una pieza o mueble en 3D.

━━━ ENTORNO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• El código es JavaScript puro que se ejecuta en el navegador
• Debe definir una función main() que retorne la/las geometrías
• Unidades: milímetros (mm)
• Coordenadas: eje X = ancho, eje Y = profundidad, eje Z = altura (hacia arriba)

━━━ FORMATO DE RETORNO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Opción A: una sola pieza
function main() {
  return cuboid({ size: [100, 50, 20] })
}

// Opción B: múltiples piezas nombradas (recomendado — genera plano PDF automático)
function main() {
  return [
    { name: 'Tablero', geo: cuboid({ size: [1200, 600, 30] }) },
    { name: 'Pata',    geo: cuboid({ size: [50, 50, 720] }) },
  ]
}

━━━ API DISPONIBLE (objeto global \`jscad\`) ━━━━━━━━━━━━━━━━━
// Primitivas
const { cuboid, cylinder, sphere, torus, cylinderElliptic, roundedCuboid } = jscad.primitives
cuboid({ size: [ancho, prof, alto], center: [x, y, z] })
cylinder({ radius: r, height: h, center: [x, y, z], segments: 32 })
sphere({ radius: r, segments: 32 })
roundedCuboid({ size: [w, d, h], roundRadius: 5 })

// Formas 2D (para extrudir)
const { polygon, rectangle, circle, star, ellipse } = jscad.primitives
rectangle({ size: [w, h] })
circle({ radius: r })
polygon({ points: [[0,0],[10,0],[5,10]] })

// Booleanos
const { union, subtract, intersect } = jscad.booleans
union(geo1, geo2, ...)           // suma de volúmenes
subtract(base, herramienta)     // resta / vaciado
intersect(geo1, geo2)           // intersección

// Transformaciones
const { translate, rotate, scale, mirror, rotateX, rotateY, rotateZ } = jscad.transforms
translate([x, y, z], geo)
rotate([rx, ry, rz], geo)       // ángulos en radianes — usá Math.PI/2 para 90°
rotateX(Math.PI/2, geo)
scale([sx, sy, sz], geo)
mirror({ normal: [1, 0, 0] }, geo)

// Extrusiones
const { extrudeLinear, extrudeRotate, extrudeFromSlices } = jscad.extrusions
extrudeLinear({ height: 50 }, perfilCerrado)
extrudeRotate({ segments: 32, angle: Math.PI * 2 }, perfil2D)

// Expansiones
const { expand, shell, offset } = jscad.expansions
expand({ delta: 3, corners: 'round' }, geo)   // redondeo de aristas
shell({ thickness: 2 }, geo)                  // vaciado con espesor

// Colores (solo visual, no afectan STL/OBJ export)
const { colorize } = jscad.colors
colorize([r, g, b], geo)        // valores entre 0 y 1
colorize([0.6, 0.4, 0.2], madera)

// Mediciones
const { measureBoundingBox, measureVolume } = jscad.measurements

━━━ EJEMPLO COMPLETO: ESCRITORIO ━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { cuboid } = jscad.primitives
const { colorize } = jscad.colors
const { translate } = jscad.transforms

function main() {
  const tablero = colorize([0.6, 0.4, 0.2],
    cuboid({ size: [1200, 600, 30], center: [0, 0, 750] })
  )

  const pata = (x, y) => colorize([0.5, 0.35, 0.15],
    cuboid({ size: [50, 50, 720], center: [x, y, 360] })
  )

  return [
    { name: 'Tablero', geo: tablero },
    { name: 'Pata 1',  geo: pata(-550, -250) },
    { name: 'Pata 2',  geo: pata( 550, -250) },
    { name: 'Pata 3',  geo: pata(-550,  250) },
    { name: 'Pata 4',  geo: pata( 550,  250) },
  ]
}

━━━ NOTAS IMPORTANTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• No uses import/export ni require() — todo se accede via el objeto global \`jscad\`
• Para agujeros: subtract(pieza, cylinder({ ... }))
• Para uniones complejas: union() acepta arrays: union(...piezas)
• Los ángulos en rotate() son en radianes, no grados
• center: [x,y,z] ubica el centro de la primitiva en esas coordenadas

━━━ MI PEDIDO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DESCRIBÍ ACÁ LO QUE QUERÉS MODELAR — material, medidas, cantidad de piezas, etc.]
`.trim()

export function PromptTab() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>✦</span>
          <span className={styles.title}>Prompt para IA</span>
          <span className={styles.subtitle}>Copialo y pegalo en ChatGPT, Claude, Gemini u otra IA</span>
        </div>
        <button className={copied ? styles.copyBtnDone : styles.copyBtn} onClick={handleCopy}>
          {copied ? '✓ Copiado!' : 'Copiar prompt'}
        </button>
      </div>

      <div className={styles.instructions}>
        <strong>Cómo usarlo:</strong> Copiá este prompt → abrí una IA → pegalo → describí tu pieza al final → pegá el código generado en una pestaña de código.
      </div>

      <pre className={styles.prompt}>{PROMPT}</pre>
    </div>
  )
}
