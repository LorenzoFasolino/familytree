# ui.js - UI Module

## Scopo
Gestione interfaccia utente: modali, toast, pannello dettagli, menu contestuale.

## Struttura
```javascript
const UI = {
  dateToDisplay(isoDate),   // Helper
  dateToISO(displayDate),   // Helper
  modal: { ... },           // Modale persona
  linkModal: { ... },       // Modale collegamento
  toast: { ... },           // Notifiche
  quickMenu: { ... },       // Menu right-click
  panel: { ... },           // Pannello dettagli
  confirm: { ... },         // Dialog conferma
  init() { ... }            // Inizializzazione
};
```

---

## Date Helpers

```javascript
UI.dateToDisplay("1990-05-15") → "15/05/1990"
UI.dateToISO("15/05/1990")     → "1990-05-15"
UI.dateToISO("invalid")        → null
```

---

## UI.modal - Modale Persona

### Stato
```javascript
element: HTMLElement,      // #person-modal
form: HTMLElement,         // #person-form
isEditing: boolean,        // true = modifica, false = nuovo
editingId: string | null,  // ID se modifica
relationContext: object    // { personId, relationType } se aggiunta relativa
```

### API

#### init()
```javascript
init() → void
// Setup event listeners:
// - Close buttons
// - Click outside to close
// - Photo upload preview
// - Form submit
```

#### open(personData?, relationContext?)
```javascript
open(
  personData?: Person,      // null = nuova persona
  relationContext?: {
    personId: string,       // persona di riferimento
    relationType: 'parent' | 'child' | 'partner' | 'sibling'
  }
) → void

// Behavior:
// - Reset form
// - Se personData: popola campi (edit mode)
// - Se relationContext.relationType === 'child': mostra select "Secondo Genitore"
// - Titolo dinamico: "Nuova Persona" / "Modifica Persona" / "Nuovo Genitore" etc
```

#### close()
```javascript
close() → void
// element.classList.add('hidden')
// Reset state
```

#### save()
```javascript
save() → void
// Validation: firstName required
// 
// Se isEditing:
//   familyTree.updatePerson(editingId, data)
// Else:
//   familyTree.createPerson(data)
//   Se relationContext: familyTree.addRelationship(...)
//   Se otherParentId: familyTree.addRelationship(otherParent, child, 'child')
//
// window.app.refresh()
// window.app.selectPerson(person)
```

---

## UI.linkModal - Collegamento Persona Esistente

### Stato
```javascript
element: HTMLElement,     // #link-modal
form: HTMLElement,        // #link-form  
sourcePerson: Person      // Persona di origine
```

### API

#### init()
```javascript
init() → void
// Setup close buttons, form submit
```

#### open(person)
```javascript
open(person: Person) → void
// Popola select con tutte le persone tranne se stessa
// Format: "Nome Cognome (1990)" se ha anno nascita
```

#### save()
```javascript
save() → void
// familyTree.addRelationship(sourceId, targetId, type)
// familyTree.repairData()
// window.app.refresh()
```

---

## UI.toast - Notifiche

### API

#### init()
```javascript
init() → void
// this.container = #toast-container
```

#### show(message, type?, duration?)
```javascript
show(
  message: string,
  type: 'success' | 'error' | 'warning' = 'success',
  duration: number = 3000  // ms, 0 = persistent
) → void

// Template:
<div class="toast success|error|warning">
  <span class="toast-message">...</span>
  <button class="toast-close">×</button>
</div>
```

#### dismiss(toast)
```javascript
dismiss(toast: HTMLElement) → void
// Animate out + remove
```

---

## UI.quickMenu - Menu Contestuale

### Stato
```javascript
element: HTMLElement,      // #quick-menu
currentPerson: Person
```

### API

#### init()
```javascript
init() → void
// Setup action buttons
// Add "Collega Esistente" button dynamically
// Close on click outside
```

#### show(x, y, person)
```javascript
show(x: number, y: number, person: Person) → void
// Position at cursor (adjusted if off-screen)
// element.classList.remove('hidden')
```

#### hide()
```javascript
hide() → void
// element.classList.add('hidden')
```

#### handleAction(action)
```javascript
handleAction(
  action: 'add-parent' | 'add-child' | 'add-partner' | 'add-sibling' | 'link-existing'
) → void

// 'link-existing': UI.linkModal.open(currentPerson)
// Altri: UI.modal.open(null, { personId, relationType })
```

---

## UI.panel - Pannello Dettagli

### Stato
```javascript
element: HTMLElement,      // #detail-panel
contentEl: HTMLElement,    // #panel-content
currentPerson: Person
```

### API

#### init()
```javascript
init() → void
// Close button
// Edit button → UI.modal.open(currentPerson)
// Delete button → deletePerson()
```

#### open(person)
```javascript
open(person: Person) → void
// this.currentPerson = person
// render()
// element.classList.add('open')  // CSS slide-in
```

#### close()
```javascript
close() → void
// element.classList.remove('open')
// treeView.clearSelection()
```

#### render()
```javascript
render() → void
// Genera HTML dinamico:
// - Foto grande
// - Nome, date vita
// - Sezione info (maidenName, nascita, morte, professione)
// - Sezione note
// - Sezione relazioni (genitori, partner, figli, fratelli)
//   - Click su relazione → app.selectPerson(related)
//   - Click su relazione → app.selectPerson(related)
//   - Bottone × per rimuovere relazione
//   - Bottone ✂️ (Split) / 🔗 (Unsplit) per gestire Ghost Nodes
//     - Separa visivamente relazioni lunghe che attraversano l'albero
```

#### deletePerson()
```javascript
deletePerson() → void
// UI.confirm.show(..., () => {
//   familyTree.deletePerson(id)
//   this.close()
//   app.refresh()
// })
```

---

## UI.confirm - Dialog Conferma

### Stato
```javascript
element: HTMLElement,      // #confirm-modal
onConfirm: function
```

### API

#### init()
```javascript
init() → void
// Close buttons
// OK button → onConfirm() + hide()
```

#### show(message, onConfirm)
```javascript
show(message: string, onConfirm: () => void) → void
// Mostra dialog con messaggio
// Salva callback per conferma
```

#### hide()
```javascript
hide() → void
// element.classList.add('hidden')
// onConfirm = null
```

---

## UI.init()

```javascript
init() → void
// Chiamato in App.init()
// Inizializza tutti i sub-moduli:
this.modal.init();
this.linkModal.init();
this.toast.init();
this.quickMenu.init();
this.panel.init();
this.confirm.init();
```

---

## HTML IDs Reference

| ID | Modulo | Uso |
|----|--------|-----|
| `#person-modal` | UI.modal | Overlay modale |
| `#person-form` | UI.modal | Form persona |
| `#modal-title` | UI.modal | Titolo dinamico |
| `#other-parent-group` | UI.modal | Select secondo genitore |
| `#link-modal` | UI.linkModal | Overlay collegamento |
| `#link-form` | UI.linkModal | Form collegamento |
| `#toast-container` | UI.toast | Container notifiche |
| `#quick-menu` | UI.quickMenu | Menu right-click |
| `#detail-panel` | UI.panel | Pannello laterale |
| `#panel-content` | UI.panel | Contenuto pannello |
| `#confirm-modal` | UI.confirm | Dialog conferma |
