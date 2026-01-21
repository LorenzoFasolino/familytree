---
description: How to understand the codebase for Family Tree app
---

# Understanding the Codebase

Quick-start guide for new developers or LLMs working on this project.

## 1. Read Main Documentation

```
# Start here
view_file /home/lorenzo/projects/tree/README.md
view_file /home/lorenzo/projects/tree/ARCHITECTURE.md
```

## 2. File Structure

```
tree/
├── index.html          # Entry point, all HTML
├── css/style.css       # Design system, themes
└── js/
    ├── data.js         # FamilyTree class - data model
    ├── tree.js         # TreeView class - rendering
    ├── ui.js           # UI module - modals, panels
    └── app.js          # App class - controller
```

## 3. Script Load Order (important!)

```html
<script src="js/data.js"></script>   <!-- 1st - creates familyTree singleton -->
<script src="js/tree.js"></script>   <!-- 2nd - TreeView class -->
<script src="js/ui.js"></script>     <!-- 3rd - UI module -->
<script src="js/app.js"></script>    <!-- 4th - creates window.app on DOMContentLoaded -->
```

## 4. Key Globals

| Variable | Type | Source |
|----------|------|--------|
| `familyTree` | FamilyTree | data.js (singleton) |
| `window.app` | App | app.js (on DOMContentLoaded) |
| `UI` | Object | ui.js |

## 5. Data Flow Pattern

```
User Action
    ↓
familyTree.create/update/delete()  # Modify data
    ↓
window.app.refresh()               # Re-render tree
    ↓
Optional: window.app.selectPerson(person)  # Focus
```

## 6. Read Module Documentation

```
view_file /home/lorenzo/projects/tree/docs/data.md    # Data model API
view_file /home/lorenzo/projects/tree/docs/tree.md    # Visualization API
view_file /home/lorenzo/projects/tree/docs/ui.md      # UI components API
view_file /home/lorenzo/projects/tree/docs/app.md     # Controller API
```

## 7. Quick Debug Commands

```javascript
familyTree.getAllPeople()    // All data
familyTree.getStats()        // Statistics
familyTree.repairData()      // Fix relationships
window.app.refresh()         // Force re-render
```
