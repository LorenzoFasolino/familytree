/**
 * UI Module
 * Handles modals, toasts, and UI interactions
 */

const UI = {
    // Date format helpers
    dateToDisplay(isoDate) {
        if (!isoDate) return '';
        try {
            const [year, month, day] = isoDate.split('-');
            return `${day}/${month}/${year}`;
        } catch {
            return isoDate;
        }
    },

    dateToISO(displayDate) {
        if (!displayDate) return null;
        const match = displayDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            return `${match[3]}-${match[2]}-${match[1]}`;
        }
        return null;
    },

    // Modal management
    modal: {
        element: null,
        form: null,
        isEditing: false,
        editingId: null,
        relationContext: null, // { personId, relationType }

        init() {
            this.element = document.getElementById('person-modal');
            this.form = document.getElementById('person-form');
            this.titleEl = document.getElementById('modal-title');

            // Close buttons
            document.getElementById('btn-close-modal').addEventListener('click', () => this.close());
            document.getElementById('btn-cancel-modal').addEventListener('click', () => this.close());

            // Click outside to close
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) this.close();
            });

            // Photo upload
            const photoUpload = document.getElementById('photo-upload');
            const photoInput = document.getElementById('photo');
            const photoPreview = document.getElementById('photo-preview');

            photoUpload.addEventListener('click', () => photoInput.click());

            photoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        photoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                        photoPreview.classList.add('has-photo');
                        photoPreview.dataset.photo = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Form submission
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        },

        open(personData, relationContext) {
            this.isEditing = !!personData;
            this.editingId = personData ? personData.id : null;
            this.relationContext = relationContext;

            // Reset form
            this.form.reset();
            const photoPreview = document.getElementById('photo-preview');
            photoPreview.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            photoPreview.classList.remove('has-photo');
            delete photoPreview.dataset.photo;

            // Handle Other Parent field
            const otherParentGroup = document.getElementById('other-parent-group');
            const otherParentSelect = document.getElementById('otherParent');
            if (otherParentGroup) {
                otherParentGroup.classList.add('hidden');
                otherParentSelect.innerHTML = '<option value="">Nessuno (Genitore singolo)</option>';
                otherParentSelect.value = '';

                // If adding a child, check if the parent has partners to select from
                if (!personData && relationContext && relationContext.relationType === 'child') {
                    const partners = familyTree.getPartners(relationContext.personId);
                    if (partners.length > 0) {
                        partners.forEach(p => {
                            const option = document.createElement('option');
                            option.value = p.id;
                            option.textContent = familyTree.getFullName(p);
                            otherParentSelect.appendChild(option);
                        });
                        otherParentGroup.classList.remove('hidden');
                    }
                }
            }

            // Update title
            if (this.isEditing) {
                this.titleEl.textContent = 'Modifica Persona';
            } else if (relationContext) {
                const labels = {
                    'parent': 'Nuovo Genitore',
                    'child': 'Nuovo Figlio/a',
                    'partner': 'Nuovo Partner',
                    'sibling': 'Nuovo Fratello/Sorella'
                };
                this.titleEl.textContent = labels[relationContext.relationType] || 'Nuova Persona';
            } else {
                this.titleEl.textContent = 'Nuova Persona';
            }

            // Fill form if editing
            if (personData) {
                document.getElementById('firstName').value = personData.firstName || '';
                document.getElementById('lastName').value = personData.lastName || '';
                document.getElementById('maidenName').value = personData.maidenName || '';
                document.getElementById('gender').value = personData.gender || '';
                document.getElementById('birthDate').value = UI.dateToDisplay(personData.birthDate);
                document.getElementById('birthPlace').value = personData.birthPlace || '';
                document.getElementById('deathDate').value = UI.dateToDisplay(personData.deathDate);
                document.getElementById('deathPlace').value = personData.deathPlace || '';
                document.getElementById('occupation').value = personData.occupation || '';
                document.getElementById('notes').value = personData.notes || '';

                if (personData.photo) {
                    photoPreview.innerHTML = `<img src="${personData.photo}" alt="Preview">`;
                    photoPreview.classList.add('has-photo');
                    photoPreview.dataset.photo = personData.photo;
                }
            }

            this.element.classList.remove('hidden');
            document.getElementById('firstName').focus();
        },

        close() {
            this.element.classList.add('hidden');
            this.isEditing = false;
            this.editingId = null;
            this.relationContext = null;
        },

        save() {
            const formData = new FormData(this.form);
            const photoPreview = document.getElementById('photo-preview');

            const data = {
                firstName: formData.get('firstName').trim(),
                lastName: formData.get('lastName').trim(),
                maidenName: formData.get('maidenName').trim(),
                gender: formData.get('gender'),
                birthDate: UI.dateToISO(formData.get('birthDate').trim()),
                birthPlace: formData.get('birthPlace').trim(),
                deathDate: UI.dateToISO(formData.get('deathDate').trim()),
                deathPlace: formData.get('deathPlace').trim(),
                occupation: formData.get('occupation').trim(),
                notes: formData.get('notes').trim(),
                photo: photoPreview.dataset.photo || null
            };

            const otherParentId = formData.get('otherParent');

            if (!data.firstName) {
                UI.toast.show('Il nome è obbligatorio', 'error');
                return;
            }

            let person;
            if (this.isEditing) {
                person = familyTree.updatePerson(this.editingId, data);
                UI.toast.show('Persona aggiornata', 'success');
            } else {
                person = familyTree.createPerson(data);

                // Handle relationship if any
                if (this.relationContext) {
                    familyTree.addRelationship(
                        this.relationContext.personId,
                        person.id,
                        this.relationContext.relationType
                    );

                    // Add second parent relationship if selected
                    if (this.relationContext.relationType === 'child' && otherParentId) {
                        // relationContext.personId is the first parent
                        // otherParentId is the second parent
                        // person.id is the child
                        familyTree.addRelationship(
                            otherParentId,
                            person.id,
                            'child'
                        );
                    }
                }

                UI.toast.show('Persona aggiunta', 'success');
            }

            this.close();

            // Trigger refresh
            if (window.app) {
                window.app.refresh();
                if (person) {
                    window.app.selectPerson(person);
                }
            }
        }
    },

    // Toast notifications
    toast: {
        container: null,

        init() {
            this.container = document.getElementById('toast-container');
        },

        show(message, type = 'success', duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Chiudi">
          <svg class="icon" viewBox="0 0 24 24" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

            toast.querySelector('.toast-close').addEventListener('click', () => {
                this.dismiss(toast);
            });

            this.container.appendChild(toast);

            if (duration > 0) {
                setTimeout(() => this.dismiss(toast), duration);
            }
        },

        dismiss(toast) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    },

    // Notes Modal (Rich Text Editor)
    notesModal: {
        element: null,
        editor: null,
        currentPersonId: null,

        init() {
            this.element = document.getElementById('notes-modal');
            this.editor = document.getElementById('notes-editor');
            this.titleEl = document.getElementById('notes-modal-title');

            // Close buttons
            document.getElementById('btn-close-notes').addEventListener('click', () => this.close());
            document.getElementById('btn-cancel-notes').addEventListener('click', () => this.close());

            // Save button
            document.getElementById('btn-save-notes').addEventListener('click', () => this.save());

            // Click outside to close
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) this.close();
            });

            // Toolbar buttons
            this.element.querySelectorAll('.toolbar-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const cmd = btn.dataset.cmd;
                    this.execCommand(cmd);
                    this.editor.focus();
                });
            });

            // Font size select
            const fontSizeSelect = this.element.querySelector('.toolbar-select[data-cmd="fontSize"]');
            if (fontSizeSelect) {
                fontSizeSelect.addEventListener('change', (e) => {
                    this.execCommand('fontSize', e.target.value);
                    this.editor.focus();
                });
            }

            // Keyboard shortcuts in editor
            this.editor.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key.toLowerCase()) {
                        case 'b':
                            e.preventDefault();
                            this.execCommand('bold');
                            break;
                        case 'i':
                            e.preventDefault();
                            this.execCommand('italic');
                            break;
                        case 'u':
                            e.preventDefault();
                            this.execCommand('underline');
                            break;
                    }
                }
            });
        },

        open(person) {
            this.currentPersonId = person.id;
            this.titleEl.textContent = `Note - ${familyTree.getFullName(person)}`;

            // Load existing notes (HTML or plain text)
            this.editor.innerHTML = person.notes || '';

            // Reset font size select to default
            const fontSizeSelect = this.element.querySelector('.toolbar-select[data-cmd="fontSize"]');
            if (fontSizeSelect) fontSizeSelect.value = '3';

            this.element.classList.remove('hidden');
            this.editor.focus();
        },

        close() {
            this.element.classList.add('hidden');
            this.currentPersonId = null;
            this.editor.innerHTML = '';
        },

        save() {
            if (!this.currentPersonId) return;

            const notesHtml = this.editor.innerHTML.trim();

            // Clean up empty content
            const cleanNotes = notesHtml === '<br>' || notesHtml === '<div><br></div>' ? '' : notesHtml;

            familyTree.updatePerson(this.currentPersonId, { notes: cleanNotes });

            UI.toast.show('Note salvate', 'success');
            this.close();

            // Refresh panel if open
            if (UI.panel.currentPerson && UI.panel.currentPerson.id === this.currentPersonId) {
                UI.panel.currentPerson = familyTree.getPerson(this.currentPersonId);
                UI.panel.render();
            }
        },

        execCommand(cmd, value = null) {
            document.execCommand(cmd, false, value);
        }
    },

    // Link Existing Person Modal
    linkModal: {
        element: null,
        form: null,
        sourcePerson: null,

        init() {
            this.element = document.getElementById('link-modal');
            this.form = document.getElementById('link-form');

            document.getElementById('btn-close-link-modal').addEventListener('click', () => this.close());
            document.getElementById('btn-cancel-link-modal').addEventListener('click', () => this.close());

            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) this.close();
            });

            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        },

        open(person) {
            this.sourcePerson = person;
            document.getElementById('link-source-id').value = person.id;

            // Populate person select
            const select = document.getElementById('linkPersonId');
            select.innerHTML = '';

            const people = familyTree.getAllPeople()
                .filter(p => p.id !== person.id) // Exclude self
                .sort((a, b) => a.firstName.localeCompare(b.firstName));

            people.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = familyTree.getFullName(p) + (p.birthDate ? ` (${p.birthDate.split('-')[0]})` : '');
                select.appendChild(option);
            });

            this.element.classList.remove('hidden');
        },

        close() {
            this.element.classList.add('hidden');
            this.sourcePerson = null;
            this.form.reset();
        },

        save() {
            const formData = new FormData(this.form);
            const targetId = formData.get('linkPersonId');
            const relationType = formData.get('linkType');

            if (!this.sourcePerson || !targetId) return;

            try {
                let p1 = this.sourcePerson.id;
                let p2 = targetId;

                // familyTree.addRelationship(personId, relatedId, type)
                // 'parent': personId is Child, relatedId is Parent
                // 'child': personId is Parent, relatedId is Child

                // Form logic: "Select [relationType] for Person"
                // If relationType is "parent" -> Target is Parent of Source
                // So calling addRelationship(Source, Target, 'parent') is correct.

                familyTree.addRelationship(p1, p2, relationType);

                // Force layout repair instantly to fix "???" or disconnected nodes
                familyTree.repairData();

                UI.toast.show('Relazione collegata con successo', 'success');
                this.close();

                if (window.app) {
                    window.app.refresh();
                }
            } catch (e) {
                console.error(e);
                UI.toast.show('Errore nel collegamento', 'error');
            }
        }
    },

    // Quick add menu
    quickMenu: {
        element: null,
        currentPerson: null,

        init() {
            this.element = document.getElementById('quick-menu');

            // Action buttons
            this.element.querySelectorAll('.quick-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    this.handleAction(action);
                });
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.element.contains(e.target)) {
                    this.hide();
                }
            });

            // Create "Link Existing" button if not exists (dynamic add for safety)
            if (!this.element.querySelector('[data-action="link-existing"]')) {
                const separator = document.createElement('div');
                separator.style.borderTop = '1px solid var(--border-color)';
                separator.style.margin = '4px 0';
                this.element.appendChild(separator);

                const linkBtn = document.createElement('button');
                linkBtn.className = 'quick-btn';
                linkBtn.dataset.action = 'link-existing';
                linkBtn.innerHTML = '<span class="quick-icon">🔗</span><span class="quick-label">Collega Esistente...</span>';
                linkBtn.addEventListener('click', () => this.handleAction('link-existing'));
                this.element.appendChild(linkBtn);
            }
        },

        show(x, y, person) {
            this.currentPerson = person;

            // Position menu
            const rect = this.element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let posX = x;
            let posY = y;

            // Adjust if off screen
            if (x + rect.width > viewportWidth) {
                posX = x - rect.width;
            }
            if (y + rect.height > viewportHeight) {
                posY = y - rect.height;
            }

            this.element.style.left = posX + 'px';
            this.element.style.top = posY + 'px';
            this.element.classList.remove('hidden');
        },

        hide() {
            this.element.classList.add('hidden');
            this.currentPerson = null;
        },

        handleAction(action) {
            if (!this.currentPerson) return;

            if (action === 'link-existing') {
                UI.linkModal.open(this.currentPerson);
                this.hide();
                return;
            }

            const relationTypes = {
                'add-parent': 'parent',
                'add-child': 'child',
                'add-partner': 'partner',
                'add-sibling': 'sibling'
            };

            const relationType = relationTypes[action];
            if (relationType) {
                UI.modal.open(null, {
                    personId: this.currentPerson.id,
                    relationType: relationType
                });
            }

            this.hide();
        }
    },

    // Detail panel
    panel: {
        element: null,
        currentPerson: null,

        init() {
            this.element = document.getElementById('detail-panel');
            this.contentEl = document.getElementById('panel-content');

            document.getElementById('btn-close-panel').addEventListener('click', () => this.close());
            document.getElementById('btn-edit-person').addEventListener('click', () => {
                if (this.currentPerson) {
                    UI.modal.open(this.currentPerson);
                }
            });
            document.getElementById('btn-delete-person').addEventListener('click', () => {
                if (this.currentPerson) {
                    this.deletePerson();
                }
            });
        },

        open(person) {
            this.currentPerson = person;
            this.render();
            this.element.classList.add('open');
        },

        close() {
            this.element.classList.remove('open');
            this.currentPerson = null;
            if (window.app) {
                window.app.treeView.clearSelection();
            }
        },

        render() {
            const person = this.currentPerson;
            if (!person) return;

            document.getElementById('panel-title').textContent = familyTree.getFullName(person);

            const photoContent = person.photo
                ? `<img src="${person.photo}" alt="${familyTree.getFullName(person)}">`
                : familyTree.getGenderEmoji(person);

            let html = `
        <div class="detail-photo">${photoContent}</div>
        <h3 class="detail-name">${familyTree.getFullName(person)}</h3>
        <p class="detail-dates-main">${familyTree.getLifeDates(person)}</p>
      `;

            // Info section
            const fields = [];
            if (person.maidenName) fields.push({ label: 'Cognome da nubile', value: person.maidenName });
            if (person.birthDate) fields.push({ label: 'Nascita', value: `${familyTree.formatDate(person.birthDate)}${person.birthPlace ? ', ' + person.birthPlace : ''}` });
            if (person.deathDate) fields.push({ label: 'Morte', value: `${familyTree.formatDate(person.deathDate)}${person.deathPlace ? ', ' + person.deathPlace : ''}` });
            if (person.occupation) fields.push({ label: 'Professione', value: person.occupation });

            if (fields.length > 0) {
                html += `<div class="detail-section">
          <div class="detail-section-title">Informazioni</div>
          ${fields.map(f => `
            <div class="detail-field">
              <span class="detail-label">${f.label}</span>
              <span class="detail-value">${f.value}</span>
            </div>
          `).join('')}
        </div>`;
            }

            // Notes section (always show with edit button)
            html += `<div class="detail-section">
          <div class="detail-section-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Note</span>
            <button class="btn btn-icon" id="btn-edit-notes" title="Modifica note" style="padding: 4px;">
              <svg class="icon" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          <div class="notes-content" style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
            ${person.notes ? person.notes : '<em style="color: var(--text-muted);">Nessuna nota. Clicca per aggiungere.</em>'}
          </div>
        </div>`;

            // Relationships
            const renderRelations = (title, ids, type) => {
                const people = ids.map(id => familyTree.getPerson(id)).filter(Boolean);
                if (people.length === 0) return '';

                return `<div class="detail-section">
          <div class="detail-section-title">${title}</div>
          <div class="relation-list">
            ${people.map(p => {
                    // Check if this relationship is split
                    const isSplit = familyTree.isLinkSplit(person.id, type, p.id);
                    const ghostBadge = isSplit ? '<span class="ghost-badge" title="Nodo duplicato - clicca per vedere">👻</span>' : '';
                    const splitBtn = type ? (isSplit
                        ? `<button class="relation-unsplit" data-type="${type}" data-related="${p.id}" title="Riunisci (mostra collegamento)">🔗</button>`
                        : `<button class="relation-split" data-type="${type}" data-related="${p.id}" title="Separa (nascondi collegamento)">✂️</button>`)
                        : '';

                    return `
              <div class="relation-item ${isSplit ? 'is-ghost' : ''}" data-id="${p.id}">
                <div class="relation-avatar">${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : familyTree.getGenderEmoji(p)}</div>
                <span class="relation-name">${familyTree.getFullName(p)}${ghostBadge}</span>
                <div class="relation-actions">
                  ${splitBtn}
                  ${type ? `<button class="relation-remove" data-type="${type}" title="Rimuovi relazione">×</button>` : ''}
                </div>
              </div>
            `;
                }).join('')}
          </div>
        </div>`;
            };

            html += renderRelations('Genitori', person.relationships.parents, 'parent');
            html += renderRelations('Partner', person.relationships.partners, 'partner');
            html += renderRelations('Figli', person.relationships.children, 'child');

            const siblings = familyTree.getSiblings(person.id);
            if (siblings.length > 0) {
                html += renderRelations('Fratelli/Sorelle', siblings.map(s => s.id), null); // No split/delete for siblings
            }

            this.contentEl.innerHTML = html;

            // Add click handlers for relations
            // Add click handlers for relations
            this.contentEl.querySelectorAll('.relation-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Ignore if clicked on remove button
                    if (e.target.closest('.relation-remove')) return;

                    const id = item.dataset.id;
                    const relatedPerson = familyTree.getPerson(id);
                    if (relatedPerson && window.app) {
                        window.app.selectPerson(relatedPerson);
                    }
                });
            });

            // Add click handlers for remove buttons
            this.contentEl.querySelectorAll('.relation-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = btn.closest('.relation-item');
                    const relatedId = item.dataset.id;
                    const type = btn.dataset.type;

                    UI.confirm.show(
                        `Vuoi rimuovere questa relazione?`,
                        () => {
                            if (familyTree.removeRelationship(person.id, relatedId, type)) {
                                UI.toast.show('Relazione rimossa', 'success');
                                this.render(); // Re-render panel
                                if (window.app) window.app.refresh(); // Refresh tree view
                            }
                        }
                    );
                });
            });

            // Add click handlers for split buttons
            this.contentEl.querySelectorAll('.relation-split').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const relatedId = btn.dataset.related;
                    const type = btn.dataset.type;
                    const relatedPerson = familyTree.getPerson(relatedId);
                    const relatedName = relatedPerson ? familyTree.getFullName(relatedPerson) : 'questa persona';

                    if (familyTree.splitLink(person.id, type, relatedId, type)) {
                        UI.toast.show(`Collegamento con ${relatedName} separato`, 'success');
                        this.render();
                        if (window.app) window.app.refresh();
                    }
                });
            });

            // Add click handlers for unsplit buttons
            this.contentEl.querySelectorAll('.relation-unsplit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const relatedId = btn.dataset.related;
                    const type = btn.dataset.type;
                    const relatedPerson = familyTree.getPerson(relatedId);
                    const relatedName = relatedPerson ? familyTree.getFullName(relatedPerson) : 'questa persona';

                    if (familyTree.unsplitLink(person.id, type, relatedId)) {
                        UI.toast.show(`Collegamento con ${relatedName} ripristinato`, 'success');
                        this.render();
                        if (window.app) window.app.refresh();
                    }
                });
            });

            // Add click handler for edit notes button
            const editNotesBtn = this.contentEl.querySelector('#btn-edit-notes');
            if (editNotesBtn) {
                editNotesBtn.addEventListener('click', () => {
                    UI.notesModal.open(person);
                });
            }

            // Also allow clicking on notes content to edit
            const notesContent = this.contentEl.querySelector('.notes-content');
            if (notesContent) {
                notesContent.style.cursor = 'pointer';
                notesContent.addEventListener('click', () => {
                    UI.notesModal.open(person);
                });
            }
        },

        deletePerson() {
            const person = this.currentPerson;
            if (!person) return;

            UI.confirm.show(
                `Sei sicuro di voler eliminare ${familyTree.getFullName(person)}?`,
                () => {
                    familyTree.deletePerson(person.id);
                    this.close();
                    UI.toast.show('Persona eliminata', 'success');
                    if (window.app) {
                        window.app.refresh();
                    }
                }
            );
        }
    },

    // Confirm modal
    confirm: {
        element: null,
        onConfirm: null,

        init() {
            this.element = document.getElementById('confirm-modal');

            document.getElementById('btn-close-confirm').addEventListener('click', () => this.hide());
            document.getElementById('btn-confirm-cancel').addEventListener('click', () => this.hide());
            document.getElementById('btn-confirm-ok').addEventListener('click', () => {
                if (this.onConfirm) {
                    this.onConfirm();
                }
                this.hide();
            });

            // Click outside to close
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) this.hide();
            });
        },

        show(message, onConfirm) {
            document.getElementById('confirm-message').textContent = message;
            this.onConfirm = onConfirm;
            this.element.classList.remove('hidden');
        },

        hide() {
            this.element.classList.add('hidden');
            this.onConfirm = null;
        }
    },

    // Initialize all UI components
    init() {
        this.modal.init();
        this.linkModal.init();
        this.toast.init();
        this.notesModal.init();
        this.quickMenu.init();
        this.panel.init();
        this.confirm.init();
    }
};
