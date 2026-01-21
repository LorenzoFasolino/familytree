# 🌳 Albero Genealogico - Family Tree App

Un'applicazione web client-side per creare e gestire alberi genealogici, con interfaccia moderna e persistenza locale.

## 📋 Indice

- [Quick Start](#-quick-start)
- [Caratteristiche](#-caratteristiche)
- [Architettura](#-architettura)
- [Struttura File](#-struttura-file)
- [Guida per Sviluppatori](#-guida-per-sviluppatori)
- [API Reference](#-api-reference)
- [Scorciatoie da Tastiera](#-scorciatoie-da-tastiera)

---

## 🚀 Quick Start

```bash
# Nessuna installazione richiesta! Basta aprire:
open index.html

# Oppure con un server locale:
python -m http.server 8000
# Poi vai su http://localhost:8000
```

L'app funziona interamente nel browser e salva i dati in `localStorage`.

---

## ✨ Caratteristiche

- **Creazione persone**: Nome, cognome, date nascita/morte, foto, professione, note
- **Relazioni familiari**: Genitori, figli, partner, fratelli
- **Ghost Nodes 👻**: Gestione intelligente di connessioni lunghe/complesse (Split Links)
- **Visualizzazione ad albero**: Layout automatico "Tetris" compatto

- **Pan & Zoom**: Navigazione fluida con mouse/touch
- **Tema chiaro/scuro**: Persistente tra sessioni
- **Import/Export JSON**: Backup e condivisione dati
- **Ricerca**: Trova persone per nome, cognome, luogo, professione
- **100% Client-side**: Nessun server, privacy totale

---

## 🏗 Architettura

```
┌─────────────────────────────────────────────────────────┐
│                        App (app.js)                      │
│         Controller principale - coordina tutto           │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  FamilyTree   │ │   TreeView    │ │      UI       │
│   (data.js)   │ │  (tree.js)    │ │   (ui.js)     │
│               │ │               │ │               │
│ • Data Model  │ │ • Rendering   │ │ • Modali      │
│ • CRUD        │ │ • Layout      │ │ • Toast       │
│ • localStorage│ │ • Pan/Zoom    │ │ • Pannelli    │
│ • Relazioni   │ │ • Connessioni │ │ • Form        │
└───────────────┘ └───────────────┘ └───────────────┘
```

### Pattern Architetturali

- **Singleton**: `familyTree` (istanza globale di FamilyTree)
- **Module Pattern**: `UI` object con sub-moduli
- **Observer-like**: `window.app.refresh()` per trigger re-render
- **Data-First**: Modifiche dati → poi UI refresh

---

## 📁 Struttura File

```
tree/
├── index.html          # Entry point, struttura HTML completa
├── css/
│   └── style.css       # CSS Variables, componenti, temi
└── js/
    ├── data.js         # FamilyTree class - modello dati
    ├── tree.js         # TreeView class - visualizzazione
    ├── ui.js           # UI module - interfaccia utente
    └── app.js          # App class - controller principale
```

### Ordine di Caricamento Scripts

```html
<script src="js/data.js"></script>   <!-- 1° - Modello dati -->
<script src="js/tree.js"></script>   <!-- 2° - Rendering -->
<script src="js/ui.js"></script>     <!-- 3° - Componenti UI -->
<script src="js/app.js"></script>    <!-- 4° - Controller -->
```

---

## 👨‍💻 Guida per Sviluppatori

### Variabili Globali

| Variabile    | Tipo       | Descrizione                     |
|--------------|------------|---------------------------------|
| `familyTree` | FamilyTree | Singleton per gestione dati    |
| `window.app` | App        | Controller applicazione         |
| `UI`         | Object     | Moduli interfaccia utente      |

### Modello Dati: Person

```javascript
{
  id: "p_abc123",              // string - ID univoco auto-generato
  firstName: "Mario",          // string - Required
  lastName: "Rossi",           // string - Required
  maidenName: "",              // string - Cognome da nubile
  gender: "M",                 // "M" | "F" | "O" | ""
  birthDate: "1990-05-15",     // ISO string | null
  birthPlace: "Roma",          // string
  deathDate: null,             // ISO string | null
  deathPlace: "",              // string
  occupation: "Ingegnere",     // string
  notes: "Note varie...",      // string
  photo: "data:image/...",     // base64 | null
  relationships: {
    parents: ["p_parent1"],    // array di ID
    children: ["p_child1"],    // array di ID
    partners: ["p_partner1"]   // array di ID
  },
  createdAt: 1705123456789,    // timestamp
  updatedAt: 1705123456789     // timestamp
}
```

### localStorage Key

```javascript
const STORAGE_KEY = 'familyTree';
// Formato: JSON.stringify(Array.from(map.entries()))
```

---

## 📚 API Reference

### FamilyTree Class (`data.js`)

```javascript
// CRUD Operations
familyTree.createPerson(data)          // → Person
familyTree.getPerson(id)               // → Person | null
familyTree.getAllPeople()              // → Person[]
familyTree.updatePerson(id, data)      // → Person | null
familyTree.deletePerson(id)            // → boolean

// Relationships
familyTree.addRelationship(personId, relatedId, type)
// type: 'parent' | 'child' | 'partner' | 'sibling'

familyTree.removeRelationship(personId, relatedId, type)
familyTree.getSiblings(personId)       // → Person[]
familyTree.getPartners(personId)       // → Person[]

// Utils
familyTree.getFullName(person)         // → string
familyTree.getAge(person)              // → number | null
familyTree.getLifeDates(person)        // → string (es: "1990 - 2020 (†30)")
familyTree.search(query)               // → Person[]

// Persistence
familyTree.save()                      // → void (to localStorage)
familyTree.load()                      // → void (from localStorage)
familyTree.exportJSON()                // → string (JSON)
familyTree.importJSON(jsonString)      // → {success, count?, error?}
familyTree.repairData()                // → boolean (fix inconsistencies)
familyTree.clear()                     // → void
familyTree.getStats()                  // → {total, males, females, living, withPhotos}
```

### TreeView Class (`tree.js`)

```javascript
// Rendering
treeView.render(people, onNodeClick, onNodeContextMenu)
treeView.calculateLayout(people)

// Navigation
treeView.zoom(delta, centerX, centerY)
treeView.setZoom(level)                // 0.25 - 2.0
treeView.fitToView()
treeView.centerOnNode(id)

// Selection
treeView.selectNode(id)
treeView.clearSelection()
treeView.highlightNode(id)
```

### UI Module (`ui.js`)

```javascript
// Modal persona
UI.modal.open(personData?, relationContext?)
UI.modal.close()

// Modal collegamento
UI.linkModal.open(person)
UI.linkModal.close()

// Toast notifications
UI.toast.show(message, type, duration)
// type: 'success' | 'error' | 'warning'

// Quick menu (right-click)
UI.quickMenu.show(x, y, person)
UI.quickMenu.hide()

// Detail panel
UI.panel.open(person)
UI.panel.close()

// Confirm dialog
UI.confirm.show(message, onConfirm)
UI.confirm.hide()
```

### App Class (`app.js`)

```javascript
window.app.refresh()                   // Re-render albero
window.app.selectPerson(person)        // Seleziona e centra
window.app.search(query)               // Cerca persone
window.app.export()                    // Download JSON
window.app.import()                    // Upload JSON
window.app.toggleTheme()               // Light/Dark
```

---

## ⌨️ Scorciatoie da Tastiera

| Shortcut       | Azione                    |
|----------------|---------------------------|
| `Ctrl/⌘ + N`   | Nuova persona             |
| `Ctrl/⌘ + E`   | Esporta JSON              |
| `Ctrl/⌘ + I`   | Importa JSON              |
| `Ctrl/⌘ + F`   | Focus su ricerca          |
| `Escape`       | Chiudi modale/pannello    |
| `Delete`       | Elimina persona selezionata|
| `Click destro` | Menu rapido aggiunta      |
| `Mouse wheel`  | Zoom in/out               |
| `Drag`         | Pan della vista           |

---

## 🎨 CSS Design Tokens

```css
/* Colori principali */
--accent-primary: #6366f1;    /* Indigo - azioni principali */
--accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);

/* Generi */
--male: #3b82f6;              /* Blu */
--female: #ec4899;            /* Rosa */
--other: #8b5cf6;             /* Viola */

/* Connessioni */
--line-color: #cbd5e1;        /* Linee parent-child */
--line-partner: #f472b6;      /* Linee partner (dashed) */
```

---

## 🔄 JSON Export Format

```json
{
  "version": "1.0",
  "exportedAt": "2024-01-20T12:00:00.000Z",
  "people": [
    {
      "id": "p_abc123",
      "firstName": "Mario",
      "lastName": "Rossi",
      "relationships": {
        "parents": [],
        "children": ["p_child1"],
        "partners": ["p_partner1"]
      }
      // ... altri campi
    }
  ]
}
```

---

## 🐛 Debug Tips

```javascript
// Console - Visualizza tutte le persone
familyTree.getAllPeople()

// Console - Statistiche
familyTree.getStats()

// Console - Repair data inconsistencies
familyTree.repairData()

// Console - Clear all data
familyTree.clear()
window.app.refresh()
```

---

## 📝 Note per Contribuire

1. **Non servono build tools** - Pure HTML/CSS/JS
2. **Stile codice** - Naming in inglese, UI in italiano
3. **Test** - Aprire `index.html` e testare manualmente
4. **Temi** - Modificare CSS variables in `:root` e `[data-theme="dark"]`

---

## 📄 Licenza

Questo progetto è per uso personale/familiare.
