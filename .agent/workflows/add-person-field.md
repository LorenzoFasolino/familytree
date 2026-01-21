---
description: How to add a new field to the Person data model
---

# Adding a New Person Field

Follow these steps in order to add a new field (e.g., `email`, `phoneNumber`, etc.) to the Person data model.

## 1. Update data.js - createPerson()

Add the default value in the `createPerson` method:

```javascript
// js/data.js - inside createPerson()
const person = {
  // ... existing fields
  yourNewField: data.yourNewField || '',  // Add this line
  // ...
};
```

## 2. Update index.html - Add form input

Add the input field inside `#person-form`:

```html
<!-- index.html - inside form#person-form -->
<div class="form-group">
  <label for="yourNewField">Label Text</label>
  <input type="text" id="yourNewField" name="yourNewField" autocomplete="off">
</div>
```

## 3. Update ui.js - modal.save()

Read the value from FormData:

```javascript
// js/ui.js - inside UI.modal.save()
const data = {
  // ... existing fields
  yourNewField: formData.get('yourNewField').trim(),
};
```

## 4. Update ui.js - modal.open() (for edit mode)

Populate the field when editing:

```javascript
// js/ui.js - inside UI.modal.open(), in the if(personData) block
document.getElementById('yourNewField').value = personData.yourNewField || '';
```

## 5. Update ui.js - panel.render() (optional, if displaying in detail panel)

Add to the fields array:

```javascript
// js/ui.js - inside UI.panel.render()
if (person.yourNewField) fields.push({ label: 'Label', value: person.yourNewField });
```

## 6. Test

- [ ] Create a new person with the field filled
- [ ] Edit an existing person and modify the field
- [ ] Verify the field persists after page reload
- [ ] Check the detail panel shows the field
- [ ] Export JSON and verify the field is included
- [ ] Import JSON with the field and verify it loads correctly
