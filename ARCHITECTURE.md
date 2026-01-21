# 🤖 LLM Context - Family Tree App

> **Documento ottimizzato per LLM** - Contesto completo per modificare questa codebase

---

## 🎯 TL;DR per LLM

**Cosa è**: App web client-side per alberi genealogici  
**Stack**: Pure HTML + CSS + JavaScript (no framework, no build)  
**Persistenza**: localStorage  
**Lingua UI**: Italiano  
**Lingua codice**: Inglese

---

## 📐 Architettura Critica

```
index.html
    ↓ carica in ordine
data.js  → familyTree (singleton globale, Map<id, Person>)
tree.js  → TreeView (layout, rendering SVG, pan/zoom)
ui.js    → UI object (modal, toast, panel, quickMenu, confirm, linkModal)
app.js   → window.app (controller, init su DOMContentLoaded)
```

### Pattern di Comunicazione

```javascript
// MODIFICA DATI → REFRESH UI
familyTree.createPerson(data);  // modifica Map + localStorage
window.app.refresh();           // re-render completo
window.app.selectPerson(person); // opzionale: centra e apri panel
```

---

## 🗂 Modello Dati - Person Object

```javascript
// Campi OBBLIGATORI
id: string,           // "p_" + timestamp + random
firstName: string,    // Validato in UI.modal.save()
lastName: string,

// Campi OPZIONALI  
maidenName: string,
gender: "M" | "F" | "O" | "",
birthDate: string | null,      // ISO "YYYY-MM-DD"
birthPlace: string,
deathDate: string | null,      // ISO "YYYY-MM-DD"
deathPlace: string,
occupation: string,
notes: string,
photo: string | null,          // base64 data URL

// RELAZIONI - bidirectional, auto-managed
relationships: {
  parents: string[],   // IDs
  children: string[],  // IDs
  partners: string[]   // IDs (espliciti e impliciti via co-parenting)
},

// VISUALIZZAZIONE SPECIALE
splitLinks: {          // Collapsed links (Ghost Nodes)
  type: string,        // 'parent' | 'child' | 'partner'
  linkedPersonId: string,
  ghostContext: string // 'parent' | 'child' | 'partner' (visual role)
}[]
```

### ⚠️ Invarianti Relazioni

1. Se `A.relationships.parents.includes(B.id)` → `B.relationships.children.includes(A.id)`
2. Se `A.relationships.partners.includes(B.id)` → `B.relationships.partners.includes(A.id)`
3. `repairData()` garantisce consistenza bidirezionale

---

## 🔧 Come Fare Modifiche Comuni

### Aggiungere un Campo a Person

1. **data.js** - `createPerson()`: aggiungi default
2. **data.js** - `updatePerson()`: già gestito via Object.keys loop
3. **ui.js** - `UI.modal.open()`: popola campo nel form
4. **ui.js** - `UI.modal.save()`: leggi da FormData
5. **ui.js** - `UI.panel.render()`: mostra nel pannello dettagli
6. **index.html** - Aggiungi input nel form `#person-form`

```javascript
// Esempio: aggiungere campo "email"

// 1. data.js - createPerson()
email: data.email || '',

// 2. ui.js - modal.save()
email: formData.get('email').trim(),

// 3. index.html
<div class="form-group">
  <label for="email">Email</label>
  <input type="email" id="email" name="email">
</div>
```

### Aggiungere Nuovo Tipo di Relazione

1. **data.js** - `relationships` object: aggiungi array
2. **data.js** - `addRelationship()`: nuovo case
3. **data.js** - `removeRelationship()`: nuovo case
4. **data.js** - `deletePerson()`: cleanup
5. **tree.js** - `drawConnections()`: nuova linea SVG
6. **ui.js** - `quickMenu.handleAction()`: nuova azione
7. **index.html** - `#quick-menu`: nuovo button

### Modificare Layout Albero

Il layout è in `tree.js`:

```javascript
// Costanti layout (constructor TreeView)
this.nodeWidth = 180;      // Larghezza nodo
this.nodeHeight = 80;      // Altezza nodo
this.horizontalGap = 60;   // Gap orizzontale tra nodi
this.verticalGap = 80;     // Gap verticale
this.verticalGap = 80;     // Gap verticale
this.generationGap = 200;  // Gap tra generazioni

// Algoritmo "Tetris" + Anchor-Based
// 1. Identifica "Root Components" (alberi disgiunti)
// 2. Piazza Roots SX -> DX basandosi su connessioni (Anchors)
// 3. Collision Detection Granulare (Tetris) per compattare
// 4. "Ghost Nodes" per link molto lunghi (splitLinks)

// Entry point: calculateLayout(people)
// Output: this.positions = Map<id, {x, y}>
```

### Modificare Stile Nodi

```css
/* style.css */
.tree-node { ... }
.tree-node.male { border-left: 4px solid #3b82f6; }
.tree-node.female { border-left: 4px solid #ec4899; }
.tree-node.selected { ... }
```

---

## 📍 Punti di Ingresso Critici

| Azione Utente | File | Funzione/Punto |
|---------------|------|----------------|
| Clicca "Nuova Persona" | app.js | `UI.modal.open()` |
| Submit form persona | ui.js | `UI.modal.save()` |
| Clicca nodo | tree.js | `node.addEventListener('click')` → app.selectPerson |
| Right-click nodo | tree.js | `node.addEventListener('contextmenu')` → UI.quickMenu |
| Zoom | tree.js | `container.addEventListener('wheel')` |
| Import JSON | app.js | `handleImportFile()` |
| Export JSON | app.js | `export()` |
| Cambia tema | app.js | `toggleTheme()` |
| Caricamento app | app.js | `DOMContentLoaded` → `new App()` |

---

## 🧪 Test Manuale Checklist

```
[ ] Crea prima persona
[ ] Aggiungi genitore (right-click → Genitore)
[ ] Aggiungi figlio con 2 genitori
[ ] Aggiungi partner
[ ] Modifica persona
[ ] Elimina persona
[ ] Verifica linee connessione corrette
[ ] Export JSON
[ ] Clear localStorage + Import JSON
[ ] Zoom in/out/fit
[ ] Pan con drag
[ ] Ricerca
[ ] Tema chiaro/scuro
[ ] Collega persona esistente
```

---

## ⚠️ Gotchas & Pitfalls

### 1. Date Format
```javascript
// UI: DD/MM/YYYY (italiano)
// Storage: YYYY-MM-DD (ISO)
UI.dateToDisplay(isoDate)  // ISO → display
UI.dateToISO(displayDate)  // display → ISO
```

### 2. Photo Storage
```javascript
// Le foto sono base64 in localStorage
// Attenzione: può raggiungere limite ~5MB
person.photo = "data:image/jpeg;base64,..."
```

### 3. Refresh Pattern
```javascript
// SEMPRE dopo modifiche dati:
// 1. Modifica tramite familyTree
// 2. Chiama window.app.refresh()
familyTree.updatePerson(id, data);
window.app.refresh();
```

### 4. Relazioni Bidirezionali
```javascript
// NON modificare relationships direttamente!
// Usa SEMPRE familyTree.addRelationship() / removeRelationship()
// altrimenti si rompe la consistenza bidirezionale
```

### 5. ID Generation
```javascript
// IDs sono "p_" + timestamp base36 + random
// Es: "p_lxyz123abc456"
// NON assumere formato specifico, usa solo per riferimento
```

---

## 🔍 Debug Console Commands

```javascript
// Tutte le persone
familyTree.getAllPeople()

// Statistiche
familyTree.getStats()

// Persona specifica
familyTree.getPerson("p_...")

// Fix inconsistenze
familyTree.repairData()

// Clear tutto
familyTree.clear(); window.app.refresh();

// Force re-render
window.app.refresh()

// Log generazioni (in calculateLayout)
console.log('Generations:', Object.fromEntries(generations))
```

---

## 📦 Dipendenze

**NESSUNA DIPENDENZA ESTERNA**

- No npm, no node_modules
- No framework JS
- No preprocessor CSS
- No build step

Aprire `index.html` nel browser = funziona.

---

## 🎨 CSS Variables (per theming)

```css
/* Modifica in :root (light) e [data-theme="dark"] */
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary, --text-muted
--accent-primary, --accent-hover, --accent-light
--border-color, --border-light
--shadow-sm, --shadow-md, --shadow-lg
```

---

## 📁 File Summary

| File | LOC | Responsabilità |
|------|-----|----------------|
| `index.html` | ~350 | Struttura HTML, modali, form |
| `css/style.css` | ~1100 | Design system, temi, componenti |
| `js/data.js` | ~485 | FamilyTree class, CRUD, localStorage |
| `js/tree.js` | ~740 | TreeView, layout, SVG, pan/zoom |
| `js/ui.js` | ~650 | Modal, toast, panel, quickMenu |
| `js/app.js` | ~270 | App controller, events, shortcuts |

---

## 🔄 Flusso Tipico: Aggiunta Persona

```
1. User clicks "Nuova Persona" button
   └─ app.js: UI.modal.open()

2. UI.modal.open() shows modal
   └─ ui.js: element.classList.remove('hidden')

3. User fills form, clicks "Salva"
   └─ ui.js: form submit → UI.modal.save()

4. UI.modal.save() creates person
   └─ data.js: familyTree.createPerson(data)
   └─ data.js: this.people.set(id, person)
   └─ data.js: this.save() → localStorage

5. UI.modal.save() triggers refresh
   └─ app.js: window.app.refresh()

6. App.refresh() re-renders tree
   └─ tree.js: treeView.render(people, ...)
   └─ tree.js: calculateLayout() → positions Map
   └─ tree.js: createNode() for each person
   └─ tree.js: drawConnections() SVG paths
```

---

## 🌐 Localizzazione

Tutte le stringhe UI sono hardcoded in italiano in:
- `index.html` - Labels, placeholder, buttons
- `ui.js` - Toast messages, modal titles

Per tradurre: cerca stringhe italiane e sostituisci.
