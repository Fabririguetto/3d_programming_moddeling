<div align="center">

# Forma3D

**Editor CAD paramétrico en el navegador · Parametric 3D CAD editor in the browser**

[🇦🇷 Español](#español) · [🇬🇧 English](#english)

[![Deploy](https://github.com/Fabririguetto/3d_programming_moddeling/actions/workflows/deploy.yml/badge.svg)](https://github.com/Fabririguetto/3d_programming_moddeling/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://3d-programming-moddeling.vercel.app/)

</div>

---

## Español

Forma3D es un editor CAD paramétrico que corre completamente en el navegador. Escribís código JavaScript usando la librería [JSCAD](https://github.com/jscad/OpenJSCAD.org) y el modelo 3D se genera en tiempo real en un viewport interactivo.

### Características

- **Editor de código** Monaco (el mismo que VS Code) con resaltado de sintaxis JavaScript
- **Compilación en tiempo real** mediante un Web Worker — la UI nunca se bloquea
- **Viewport 3D interactivo** con órbita, zoom y paneo (Three.js + React Three Fiber)
- **Bounding box con medidas** — caja de alambre azul con etiquetas X / Y / Z en milímetros
- **Panel de estado** — muestra dimensiones del objeto y cantidad de triángulos
- **Importar archivos** STL y OBJ para visualizarlos en el viewport
- **Exportar** a STL (binario) y OBJ directamente desde el navegador
- **Gestión de proyectos** — múltiples proyectos guardados en `localStorage`
- **Historial de versiones** — hasta 50 snapshots por proyecto, restaurables con un click
- **Sin servidor** — todo funciona offline, no se envía ningún dato a internet

### Tecnologías

| Capa | Tecnología |
|------|-----------|
| UI | React 19 + TypeScript |
| 3D | Three.js · React Three Fiber · Drei |
| Editor | Monaco Editor |
| CAD kernel | JSCAD Modeling (Web Worker) |
| Estado | Zustand |
| Bundler | Vite 8 |
| Deploy | GitHub Pages + GitHub Actions |

### Uso rápido

La función `main()` debe retornar un array de objetos `{ name, geo }`. El valor de `geo` es cualquier geometría JSCAD (`cuboid`, `sphere`, `union`, `subtract`, etc.).

```js
const { cuboid, sphere } = jscad.primitives
const { subtract } = jscad.booleans
const { colorize } = jscad.colors

function main() {
  const cuerpo = sphere({ radius: 50 })
  const agujero = cuboid({ size: [40, 40, 120] })

  return [
    { name: 'Pieza', geo: colorize([0.4, 0.6, 0.9], subtract(cuerpo, agujero)) }
  ]
}
```

**Atajos de teclado**

| Atajo | Acción |
|-------|--------|
| `Ctrl + Enter` | Compilar código |
| Click en nombre | Renombrar proyecto |

### Correr localmente

```bash
git clone https://github.com/Fabririguetto/3d_programming_moddeling.git
cd 3d_programming_moddeling/client
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

### Build de producción

```bash
npm run build   # genera client/dist/
npm run preview # sirve el build localmente
```

---

## English

Forma3D is a parametric CAD editor that runs entirely in the browser. You write JavaScript using the [JSCAD](https://github.com/jscad/OpenJSCAD.org) library and the 3D model is generated in real time inside an interactive viewport.

### Features

- **Monaco code editor** (same engine as VS Code) with JavaScript syntax highlighting
- **Real-time compilation** via a Web Worker — the UI never freezes
- **Interactive 3D viewport** with orbit, zoom, and pan (Three.js + React Three Fiber)
- **Bounding box with dimensions** — blue wireframe with X / Y / Z labels in millimetres
- **Status panel** — displays object dimensions and triangle count
- **Import STL and OBJ files** to visualise them in the viewport
- **Export to STL** (binary) and **OBJ** directly from the browser
- **Project management** — multiple projects persisted in `localStorage`
- **Version history** — up to 50 snapshots per project, one-click restore
- **No server required** — works fully offline, no data is ever sent anywhere

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + TypeScript |
| 3D | Three.js · React Three Fiber · Drei |
| Editor | Monaco Editor |
| CAD kernel | JSCAD Modeling (Web Worker) |
| State | Zustand |
| Bundler | Vite 8 |
| Deploy | GitHub Pages + GitHub Actions |

### Quick start

The `main()` function must return an array of `{ name, geo }` objects. `geo` can be any JSCAD geometry (`cuboid`, `sphere`, `union`, `subtract`, etc.).

```js
const { cuboid, sphere } = jscad.primitives
const { subtract } = jscad.booleans
const { colorize } = jscad.colors

function main() {
  const body = sphere({ radius: 50 })
  const hole = cuboid({ size: [40, 40, 120] })

  return [
    { name: 'Part', geo: colorize([0.4, 0.6, 0.9], subtract(body, hole)) }
  ]
}
```

**Keyboard shortcuts**

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Compile code |
| Click on name | Rename project |

### Run locally

```bash
git clone https://github.com/Fabririguetto/3d_programming_moddeling.git
cd 3d_programming_moddeling/client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production build

```bash
npm run build   # outputs to client/dist/
npm run preview # serves the build locally
```

### Live demo

[https://3d-programming-moddeling.vercel.app/](https://3d-programming-moddeling.vercel.app/)

---

<div align="center">
Hecho con ♥ por <a href="https://github.com/Fabririguetto">Fabririguetto</a>
</div>
