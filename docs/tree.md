# tree.js - TreeView Class

## Scopo
Rendering visuale dell'albero: layout automatico, nodi, connessioni SVG, pan/zoom.

## Istanza
```javascript
// Creato in App.init()
this.treeView = new TreeView(container, canvas);

// container = #tree-container (area scrollabile)
// canvas = #tree-canvas (contenuto trasformabile)
```

---

## Stato Interno

```javascript
this.nodes = new Map();         // id → DOM element
this.positions = new Map();     // id → {x, y}
this.selectedId = null;         // id selezionato

// Pan & Zoom
this.scale = 1;                 // 0.25 - 2.0
this.translateX = 0;
this.translateY = 0;

// Layout Constants
this.nodeWidth = 180;
this.nodeHeight = 80;
this.horizontalGap = 60;
this.verticalGap = 80;
this.generationGap = 200;
```

---

## API Principale

### render(people, onNodeClick, onNodeContextMenu)
```javascript
render(
  people: Person[],
  onNodeClick: (person) => void,
  onNodeContextMenu: (event, person) => void
) → void

// Steps:
// 1. canvas.innerHTML = ''
// 2. calculateLayout(people)
// 3. Create SVG for connections
// 4. drawConnections()
// 5. Create DOM nodes for each person
// 6. Attach event listeners
```

### calculateLayout(people)
```javascript
calculateLayout(people: Person[]) → void
// Algoritmo:
// 1. Repair bidirectional relationships
// 2. Build generation map via BFS
// 3. Identify "roots" (generation 0)
// 4. Build tree structure with partners grouped
// 5. Calculate widths recursively
// 6. Position nodes top-down

// Output: this.positions = Map<id, {x, y}>
// 
// Algoritmo Dettagliato v2:
// 1. "Root Discovery": Trova radici e raggruppa alberi disgiunti (Components)
// 2. "Anchor Positioning":
//    - I componenti roots vengono ordinati e posizionati SX -> DX
//    - Se un componente ha un "Anchor" (link a un albero già piazzato), viene posizionato vicino ad esso.
// 3. "Tetris Placement" (Granular Collision):
//    - Ogni albero viene testato nella posizione target.
//    - Se collide (overlap di nodi, non bounding-box), viene spostato finché non fitta.
//    - "Push Direction": se collide con un nodo a sinistra, spinge a destra (e viceversa), mantenendo l'ordine dei partner.
// 4. "Sibling Sort" (Centripeto):
//    - Fratelli maschi (con partner) ordinati verso Destra (→ Sposa)
//    - Sorelle femmine (con partner) ordinate verso Sinistra (← Sposo)
//    - Single al centro.
// 5. "Ghost Nodes":
//    - Se una relazione è in `splitLinks`, non disegna la linea lunga.
//    - Crea un nodo duplicato (Ghost) vicino al parente locale.
```

### Algoritmo Generazioni
```javascript
// BFS bidirectional:
// - Partners: stessa generazione
// - Children: gen + 1
// - Parents: gen - 1
// - Normalize: min gen becomes 0

// Debug:
console.log('Generations:', Object.fromEntries(generations))
```

---

## Pan & Zoom API

### setupPanZoom()
```javascript
// Auto-setup in constructor:
// - Mouse wheel → zoom
// - Mouse drag → pan
// - Touch gestures → pinch zoom, pan
```

### zoom(delta, centerX, centerY)
```javascript
zoom(delta: number, centerX: number, centerY: number) → void
// delta: +0.1 zoom in, -0.1 zoom out
// Zooms towards cursor position
```

### setZoom(level)
```javascript
setZoom(level: number) → void
// level: 0.25 - 2.0
// Zooms towards center of viewport
```

### fitToView()
```javascript
fitToView() → void
// Calcola bounds di tutti i nodi
// Scala e trasla per fit viewport
// Usato dopo import o primo nodo
```

### centerOnNode(id)
```javascript
centerOnNode(id: string) → void
// Trasla viewport per centrare il nodo
// Mantiene scala corrente
```

---

## Node Management

### createNode(person, pos)
```javascript
createNode(person: Person, pos: {x, y}) → HTMLElement
// Template:
<div class="tree-node [male|female|other] [selected]">
  <div class="node-content">
    <div class="node-photo">[emoji o img]</div>
    <div class="node-info">
      <div class="node-name">Nome Cognome</div>
      <div class="node-dates">1990 (34 anni)</div>
    </div>
  </div>
</div>
```

### selectNode(id)
```javascript
selectNode(id: string) → void
// Rimuove .selected da tutti
// Aggiunge .selected al nodo
// Sets this.selectedId
```

### clearSelection()
```javascript
clearSelection() → void
// this.selectedId = null
// Rimuove .selected da tutti
```

### highlightNode(id)
```javascript
highlightNode(id: string) → void
// Trigger animazione CSS pulse
// Usato per risultati ricerca
```

---

## Connection Drawing

### drawConnections(svg, people)
```javascript
drawConnections(svg: SVGElement, people: Person[]) → void
// 1. Partner lines (horizontal, dashed pink)
// 2. Child lines (curved, vertical)
```

### drawLine(svg, x1, y1, x2, y2, type, relatedIds)
```javascript
drawLine(...) → void
// type: 'partner' | 'child'

// Partner: straight horizontal line
<path class="connection-line partner" d="M x1 y1 L x2 y2">

// Child: bezier curve
<path class="connection-line" d="M x1 y1 C x1 midY, x2 midY, x2 y2">

// Classes added: conn-p-{id} for each related person
// Enables highlight on hover
```

---

## CSS Considerations

```css
/* Nodi */
.tree-node { position: absolute; } /* posizionato da JS */
.tree-node.male { 
  border-left-color: #3b82f6; 
  border-radius: var(--radius-lg);
}
.tree-node.female { 
  border-left-color: #ec4899; 
  border-radius: 100px; /* Oval shape */
}

/* Connessioni */
.connection-line { stroke: var(--line-color); }
.connection-line.partner { stroke-dasharray: 5,5; stroke: pink; }
.connection-line.highlight { stroke: var(--accent-primary); stroke-width: 4; }

/* Canvas transform */
.tree-canvas {
  transform-origin: center center;
  transform: translate(Xpx, Ypx) scale(S);
}
```

---

## Event Handling

```javascript
// Node click
node.addEventListener('click', (e) => {
  this.selectNode(person.id);
  onNodeClick(person);  // → app.selectPerson()
});

// Node right-click
node.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  onNodeContextMenu(e, person);  // → UI.quickMenu.show()
});

// Hover highlight connections
node.addEventListener('mouseenter', () => {
  document.querySelectorAll(`.conn-p-${id}`).forEach(...)
});
```

---

## Debug Tips

```javascript
// Inspect positions
treeView.positions

// Log during layout
console.log('Roots:', roots.length);
console.log('Positions:', Object.fromEntries(this.positions));

// Force recalc
treeView.calculateLayout(familyTree.getAllPeople());
```
