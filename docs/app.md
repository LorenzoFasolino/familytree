# app.js - App Controller

## Scopo
Controller principale: inizializzazione, coordinamento, gestione eventi globali.

## Istanza Globale
```javascript
// Creata su DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
```

---

## Stato

```javascript
this.treeView = TreeView;     // Istanza TreeView
this.searchInput = Element;    // #search-input
this.emptyState = Element;     // #empty-state
```

---

## Lifecycle

### constructor()
```javascript
constructor() → void
// Chiama this.init()
```

### init()
```javascript
init() → void
// Sequenza:
// 1. familyTree.load()       - Carica da localStorage
// 2. familyTree.repairData() - Fix inconsistenze
// 3. UI.init()               - Setup componenti UI
// 4. new TreeView(...)       - Setup visualizzazione
// 5. Cache elements
// 6. setupEventListeners()
// 7. setupKeyboardShortcuts()
// 8. loadTheme()
// 9. refresh()               - Primo render
```

---

## API Principale

### refresh()
```javascript
refresh() → void
// Entry point per re-render dopo modifiche dati

const people = familyTree.getAllPeople();

// 1. Toggle empty state
if (people.length === 0) {
  emptyState.classList.remove('hidden');
} else {
  emptyState.classList.add('hidden');
}

// 2. Render tree
treeView.render(
  people,
  (person) => this.selectPerson(person),      // onClick
  (e, person) => UI.quickMenu.show(...)       // onContextMenu
);

// 3. Fit to view if single person
if (people.length === 1) {
  treeView.fitToView();
}
```

### selectPerson(person)
```javascript
selectPerson(person: Person) → void
// 1. treeView.selectNode(person.id)
// 2. UI.panel.open(person)
// 3. treeView.centerOnNode(person.id)
```

### search(query)
```javascript
search(query: string) → void
// const results = familyTree.search(query)
// if results: selectPerson(first) + highlightNode
// if no results: toast warning
```

---

## Import/Export

### export()
```javascript
export() → void
// 1. familyTree.exportJSON()
// 2. Generate filename: albero-genealogico_DD-MM-YYYY_HH-MM-SS_timestamp.json
// 3. Create data URL
// 4. Trigger download via <a> click
// 5. Toast success con count
```

### import()
```javascript
import() → void
// Trigger click su #import-file (hidden input)
```

### handleImportFile(file)
```javascript
handleImportFile(file: File) → void
// FileReader.readAsText()
// familyTree.importJSON(result)
// if success: toast + refresh + fitToView
// if error: toast error
```

---

## Theme

### toggleTheme()
```javascript
toggleTheme() → void
// Get current: document.documentElement.getAttribute('data-theme')
// Toggle: 'dark' ↔ 'light'
// Set: document.documentElement.setAttribute('data-theme', next)
// Persist: localStorage.setItem('theme', next)
```

### loadTheme()
```javascript
loadTheme() → void
// 1. Check localStorage.getItem('theme')
// 2. Fallback: check prefers-color-scheme media query
// 3. Apply via data-theme attribute
```

---

## Event Listeners (setupEventListeners)

| Element | Event | Handler |
|---------|-------|---------|
| `#btn-add-person` | click | `UI.modal.open()` |
| `#btn-start` | click | `UI.modal.open()` |
| `#btn-import` | click | `this.import()` |
| `#btn-export` | click | `this.export()` |
| `#import-file` | change | `handleImportFile(files[0])` |
| `#btn-theme` | click | `toggleTheme()` |
| `#btn-zoom-in` | click | `treeView.setZoom(+0.1)` |
| `#btn-zoom-out` | click | `treeView.setZoom(-0.1)` |
| `#btn-zoom-fit` | click | `treeView.fitToView()` |
| `#search-input` | input | `search(value)` (debounced 200ms) |
| `#tree-canvas` | click | `UI.panel.close(); UI.quickMenu.hide()` |

---

## Keyboard Shortcuts (setupKeyboardShortcuts)

### Con Ctrl/Cmd
| Key | Action |
|-----|--------|
| `N` | `UI.modal.open()` |
| `E` | `this.export()` |
| `I` | `this.import()` |
| `F` | `searchInput.focus()` |

### Senza modificatori
| Key | Action |
|-----|--------|
| `Escape` | Close modal, panel, quickMenu |
| `Delete` / `Backspace` | `UI.panel.deletePerson()` (se persona selezionata) |

### Note
- Shortcuts disabilitati in input/textarea/select (tranne Escape per blur)

---

## Debug

```javascript
// Accesso globale
window.app.treeView.positions   // Posizioni nodi
window.app.refresh()            // Force re-render

// Inspect state
console.log(window.app);
```

---

## Integration Points

```
App
 ├─→ familyTree (data.js)
 │    ├─ load(), save()
 │    ├─ getAllPeople()
 │    └─ search()
 │
 ├─→ TreeView (tree.js)
 │    ├─ render()
 │    ├─ selectNode()
 │    ├─ centerOnNode()
 │    ├─ fitToView()
 │    └─ setZoom()
 │
 └─→ UI (ui.js)
      ├─ modal.open()
      ├─ panel.open(), close()
      ├─ quickMenu.show(), hide()
      └─ toast.show()
```
