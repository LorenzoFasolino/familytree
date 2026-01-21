# data.js - FamilyTree Class

## Scopo
Modello dati centrale dell'app. Gestisce CRUD persone, relazioni e persistenza localStorage.

## Singleton Globale
```javascript
const familyTree = new FamilyTree();
// Accessibile ovunque dopo caricamento script
```

## Struttura Interna
- `this.people = new Map()` - Storage in-memory
- `this.storageKey = 'familyTree'` - Chiave localStorage

---

## API Completa

### generateId()
```javascript
generateId() → string
// Returns: "p_" + timestamp(base36) + random(9 chars)
// Example: "p_lxyq47v2mf9k3hj"
```

### createPerson(data)
```javascript
createPerson({ 
  firstName: string,      // Required
  lastName: string,       // Required (UI)
  maidenName?: string,
  gender?: "M"|"F"|"O",
  birthDate?: string,     // ISO format
  birthPlace?: string,
  deathDate?: string,
  deathPlace?: string,
  occupation?: string,
  notes?: string,
  notes?: string,
  photo?: string,         // base64
  splitLinks?: object[]   // array di link splittati (Ghost Nodes)
}) → Person


// Auto-sets: id, relationships: {parents:[], children:[], partners:[]}, createdAt, updatedAt
// Calls: this.save()
```

### getPerson(id)
```javascript
getPerson(id: string) → Person | null
```

### getAllPeople()
```javascript
getAllPeople() → Person[]
// Returns array from Map values
```

### updatePerson(id, data)
```javascript
updatePerson(id: string, data: object) → Person | null
// Updates all fields except: id, relationships, createdAt
// Sets: updatedAt = Date.now()
// Calls: this.save()
```

### deletePerson(id)
```javascript
deletePerson(id: string) → boolean
// Cleanup:
// - Removes from parents' children arrays
// - Removes from children's parents arrays  
// - Removes from partners' partners arrays
// Calls: this.save()
```

---

## Relationship Management

### addRelationship(personId, relatedId, type)
```javascript
addRelationship(
  personId: string,    // "soggetto"
  relatedId: string,   // "oggetto"
  type: 'parent' | 'child' | 'partner' | 'sibling'
) → boolean

// Logica:
// 'parent': personId è figlio, relatedId è genitore
//   person.parents.push(relatedId)
//   related.children.push(personId)

// 'child': personId è genitore, relatedId è figlio
//   person.children.push(relatedId)
//   related.parents.push(personId)

// 'partner': bidirezionale
//   person.partners.push(relatedId)
//   related.partners.push(personId)

// 'sibling': condivide genitori
//   Per ogni parent di person:
//     related.parents.push(parentId)
//     parent.children.push(relatedId)
```

### removeRelationship(personId, relatedId, type)
```javascript
removeRelationship(personId, relatedId, type) → boolean
// Inverso di addRelationship
// Rimuove da entrambi i lati
```

### getSiblings(personId)
```javascript
getSiblings(personId: string) → Person[]
// Trova tutti i figli degli stessi genitori
// Esclude la persona stessa
```

### getPartners(personId)
```javascript
getPartners(personId: string) → Person[]
// Include:
// 1. Partner espliciti (relationships.partners)
// 1. Partner espliciti (relationships.partners)
// 2. Partner impliciti (co-genitori dei figli)
```

### splitLink(personId, targetId, type)
```javascript
splitLink(personId, targetId, type) → void
// Crea un record in person.splitLinks
// La connessione visiva diventa un "Ghost Node"
```

### unsplitLink(personId, targetId, type)
```javascript
unsplitLink(personId, targetId, type) → void
// Rimuove record da person.splitLinks
// Ripristina la linea di connessione intera
```

---

## Utility Methods

### getFullName(person)
```javascript
getFullName(person) → string
// "Mario Rossi"
```

### formatDate(dateStr)
```javascript
formatDate(isoDate: string) → string
// "1990-05-15" → "15/05/1990"
```

### getLifeDates(person)
```javascript
getLifeDates(person) → string
// Esempi:
// "1990 (34 anni)"        - vivente
// "1950 - 2020 (†70)"     - deceduto
// ""                      - nessuna data
```

### getAge(person)
```javascript
getAge(person) → number | null
// Calcola età a oggi o a data morte
```

### getGenderEmoji(person)
```javascript
getGenderEmoji(person) → string
// "M" → "👨", "F" → "👩", altro → "🧑"
```

---

## Persistence

### save()
```javascript
save() → void
// localStorage.setItem('familyTree', JSON.stringify(entries))
// entries = Array.from(this.people.entries())
```

### load()
```javascript
load() → void
// Carica da localStorage
// Chiama repairData() automaticamente
```

### exportJSON()
```javascript
exportJSON() → string
// Returns:
{
  "version": "1.0",
  "exportedAt": "ISO timestamp",
  "people": [Person, Person, ...]
}
```

### importJSON(jsonString)
```javascript
importJSON(jsonString: string) → { success: boolean, count?: number, error?: string }
// Clear + import + repairData + save
```

### repairData()
```javascript
repairData() → boolean (true if changes made)
// Garantisce consistenza bidirezionale:
// - Deduplica arrays
// - Se A.parents includes B, assicura B.children includes A
// - Vice versa per tutti i tipi
```

### clear()
```javascript
clear() → void
// this.people.clear() + save()
```

### getStats()
```javascript
getStats() → {
  total: number,
  males: number,
  females: number,
  living: number,
  withPhotos: number
}
```

### search(query)
```javascript
search(query: string) → Person[]
// Cerca in: firstName, lastName, maidenName, birthPlace, occupation
// Case-insensitive
```
