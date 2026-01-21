/**
 * FamilyTree Data Module
 * Handles all data operations, storage, and relationships
 */

class FamilyTree {
    constructor() {
        this.people = new Map();
        this.storageKey = 'familyTree';
        this.load();
    }

    // Generate unique ID
    generateId() {
        return 'p_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Create a new person
    createPerson(data) {
        const person = {
            id: this.generateId(),
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            maidenName: data.maidenName || '',
            gender: data.gender || '',
            birthDate: data.birthDate || null,
            birthPlace: data.birthPlace || '',
            deathDate: data.deathDate || null,
            deathPlace: data.deathPlace || '',
            occupation: data.occupation || '',
            notes: data.notes || '',
            photo: data.photo || null,
            relationships: {
                parents: [],
                children: [],
                partners: []
            },
            splitLinks: [], // Array of split link configurations
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.people.set(person.id, person);
        this.save();
        return person;
    }

    // Get a person by ID
    getPerson(id) {
        return this.people.get(id) || null;
    }

    // Get all people
    getAllPeople() {
        return Array.from(this.people.values());
    }

    // Update a person
    updatePerson(id, data) {
        const person = this.people.get(id);
        if (!person) return null;

        // Update fields (preserve relationships)
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'relationships' && key !== 'createdAt') {
                person[key] = data[key];
            }
        });
        person.updatedAt = Date.now();

        this.people.set(id, person);
        this.save();
        return person;
    }

    // Delete a person and cleanup relationships
    deletePerson(id) {
        const person = this.people.get(id);
        if (!person) return false;

        // Remove from parents' children list
        person.relationships.parents.forEach(parentId => {
            const parent = this.people.get(parentId);
            if (parent) {
                parent.relationships.children = parent.relationships.children.filter(cId => cId !== id);
            }
        });

        // Remove from children's parents list
        person.relationships.children.forEach(childId => {
            const child = this.people.get(childId);
            if (child) {
                child.relationships.parents = child.relationships.parents.filter(pId => pId !== id);
            }
        });

        // Remove from partners' partners list
        person.relationships.partners.forEach(partnerId => {
            const partner = this.people.get(partnerId);
            if (partner) {
                partner.relationships.partners = partner.relationships.partners.filter(pId => pId !== id);
            }
        });

        this.people.delete(id);
        this.save();
        return true;
    }

    // Add relationship between two people
    addRelationship(personId, relatedId, type) {
        const person = this.people.get(personId);
        const related = this.people.get(relatedId);

        if (!person || !related) return false;

        switch (type) {
            case 'parent':
                // personId is the child, relatedId is the parent
                if (!person.relationships.parents.includes(relatedId)) {
                    person.relationships.parents.push(relatedId);
                }
                if (!related.relationships.children.includes(personId)) {
                    related.relationships.children.push(personId);
                }
                break;

            case 'child':
                // personId is the parent, relatedId is the child
                if (!person.relationships.children.includes(relatedId)) {
                    person.relationships.children.push(relatedId);
                }
                if (!related.relationships.parents.includes(personId)) {
                    related.relationships.parents.push(personId);
                }
                break;

            case 'partner':
                if (!person.relationships.partners.includes(relatedId)) {
                    person.relationships.partners.push(relatedId);
                }
                if (!related.relationships.partners.includes(personId)) {
                    related.relationships.partners.push(personId);
                }
                break;

            case 'sibling':
                // Share parents - add the first parent to the sibling if exists
                const sharedParents = person.relationships.parents;
                sharedParents.forEach(parentId => {
                    if (!related.relationships.parents.includes(parentId)) {
                        related.relationships.parents.push(parentId);
                    }
                    const parent = this.people.get(parentId);
                    if (parent && !parent.relationships.children.includes(relatedId)) {
                        parent.relationships.children.push(relatedId);
                    }
                });
                break;
        }

        this.save();
        return true;
    }

    // Remove relationship between two people
    removeRelationship(personId, relatedId, type) {
        const person = this.people.get(personId);
        const related = this.people.get(relatedId);

        if (!person || !related) return false;

        switch (type) {
            case 'parent':
                // personId is the child, relatedId is the parent
                person.relationships.parents = person.relationships.parents.filter(id => id !== relatedId);
                related.relationships.children = related.relationships.children.filter(id => id !== personId);
                break;

            case 'child':
                // personId is the parent, relatedId is the child
                person.relationships.children = person.relationships.children.filter(id => id !== relatedId);
                related.relationships.parents = related.relationships.parents.filter(id => id !== personId);
                break;

            case 'partner':
                person.relationships.partners = person.relationships.partners.filter(id => id !== relatedId);
                related.relationships.partners = related.relationships.partners.filter(id => id !== personId);
                break;
        }

        this.save();
        return true;
    }

    getSiblings(personId) {
        const person = this.people.get(personId);
        if (!person || person.relationships.parents.length === 0) return [];

        const siblings = new Set();
        person.relationships.parents.forEach(parentId => {
            const parent = this.people.get(parentId);
            if (parent) {
                parent.relationships.children.forEach(childId => {
                    if (childId !== personId) {
                        siblings.add(childId);
                    }
                });
            }
        });

        return Array.from(siblings).map(id => this.people.get(id)).filter(Boolean);
    }

    // Split a link - creates a "ghost node" effect where a person appears in multiple locations
    // type: 'parent' (split from parents) or 'partner' (split from a partner)
    // linkedPersonId: the ID of the person on the other end of the split link
    // ghostContext: 'partner' or 'child' - where the ghost will appear instead
    splitLink(personId, type, linkedPersonId, ghostContext) {
        const person = this.people.get(personId);
        if (!person) return false;

        // Initialize splitLinks if not exists
        if (!person.splitLinks) {
            person.splitLinks = [];
        }

        // Check if this split already exists
        const existingSplit = person.splitLinks.find(s =>
            s.type === type && s.linkedPersonId === linkedPersonId
        );
        if (existingSplit) return false;

        // Add the split configuration
        person.splitLinks.push({
            type: type,
            linkedPersonId: linkedPersonId,
            ghostContext: ghostContext,
            createdAt: Date.now()
        });

        person.updatedAt = Date.now();
        this.save();
        return true;
    }

    // Remove a split link
    unsplitLink(personId, type, linkedPersonId) {
        const person = this.people.get(personId);
        if (!person || !person.splitLinks) return false;

        const initialLength = person.splitLinks.length;
        person.splitLinks = person.splitLinks.filter(s =>
            !(s.type === type && s.linkedPersonId === linkedPersonId)
        );

        if (person.splitLinks.length < initialLength) {
            person.updatedAt = Date.now();
            this.save();
            return true;
        }
        return false;
    }

    // Check if a relationship is split
    isLinkSplit(personId, type, linkedPersonId) {
        const person = this.people.get(personId);
        if (!person || !person.splitLinks) return false;

        return person.splitLinks.some(s =>
            s.type === type && s.linkedPersonId === linkedPersonId
        );
    }

    // Get all split links for a person
    getSplitLinks(personId) {
        const person = this.people.get(personId);
        if (!person) return [];
        return person.splitLinks || [];
    }

    // Get all partners (explicit and implicit from children)
    getPartners(personId) {
        const person = this.people.get(personId);
        if (!person) return [];

        const partnerIds = new Set(person.relationships.partners || []);

        // Implicit: check co-parents of children
        person.relationships.children.forEach(childId => {
            const child = this.people.get(childId);
            if (child) {
                child.relationships.parents.forEach(parentId => {
                    if (parentId !== personId) {
                        partnerIds.add(parentId);
                    }
                });
            }
        });

        return Array.from(partnerIds)
            .map(id => this.people.get(id))
            .filter(Boolean);
    }

    // Get full name
    getFullName(person) {
        if (!person) return '';
        let name = person.firstName;
        if (person.lastName) name += ' ' + person.lastName;
        return name;
    }

    // Format date for display (DD/MM/YYYY)
    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    }

    // Get life dates string for cards (shows age)
    getLifeDates(person) {
        if (!person) return '';
        const age = this.getAge(person);

        if (!person.birthDate && !person.deathDate) return '';

        const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
        const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : '';

        let result = '';
        if (deathYear) {
            result = `${birthYear} - ${deathYear}`;
        } else {
            result = String(birthYear);
        }

        // Add age
        if (age !== null) {
            if (person.deathDate) {
                result += ` (†${age})`;
            } else {
                result += ` (${age} anni)`;
            }
        }

        return result;
    }

    // Calculate age
    getAge(person) {
        if (!person || !person.birthDate) return null;
        const birthDate = new Date(person.birthDate);
        const endDate = person.deathDate ? new Date(person.deathDate) : new Date();

        let age = endDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = endDate.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }

    // Get gender emoji
    getGenderEmoji(person) {
        if (!person) return '👤';
        switch (person.gender) {
            case 'M': return '👨';
            case 'F': return '👩';
            default: return '🧑';
        }
    }

    // Save to localStorage
    save() {
        try {
            const data = Array.from(this.people.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }

    // Load from localStorage
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const entries = JSON.parse(data);
                this.people = new Map(entries);
                this.repairData(); // Auto-repair on load
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            this.people = new Map();
        }
    }

    // Export to JSON
    exportJSON() {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            people: Array.from(this.people.values())
        };
        return JSON.stringify(data, null, 2);
    }

    // Import from JSON
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.people || !Array.isArray(data.people)) {
                throw new Error('Invalid format: missing people array');
            }

            // Clear existing data
            this.people.clear();

            // Import people
            data.people.forEach(person => {
                // Ensure required fields
                if (!person.id || !person.firstName) {
                    console.warn('Skipping invalid person:', person);
                    return;
                }

                // Ensure relationships structure
                if (!person.relationships) {
                    person.relationships = { parents: [], children: [], partners: [] };
                }

                this.people.set(person.id, person);
            });

            this.repairData(); // Ensure consistency
            this.save();
            return { success: true, count: this.people.size };
        } catch (e) {
            console.error('Import error:', e);
            return { success: false, error: e.message };
        }
    }

    // Repair data inconsistencies
    repairData() {
        let changed = false;
        const personMap = this.people;

        // 1. Ensure bidirectional relationships
        for (const [id, person] of personMap) {
            // Parents <-> Children
            if (person.relationships.parents) {
                person.relationships.parents = [...new Set(person.relationships.parents)]; // Dedup
                person.relationships.parents.forEach(parentId => {
                    const parent = personMap.get(parentId);
                    if (parent) {
                        if (!parent.relationships.children) parent.relationships.children = [];
                        if (!parent.relationships.children.includes(id)) {
                            parent.relationships.children.push(id);
                            changed = true;
                            console.log(`Repaired link: ${parent.firstName} is parent of ${person.firstName}`);
                        }
                    }
                });
            }

            // Children <-> Parents
            if (person.relationships.children) {
                person.relationships.children = [...new Set(person.relationships.children)]; // Dedup
                person.relationships.children.forEach(childId => {
                    const child = personMap.get(childId);
                    if (child) {
                        if (!child.relationships.parents) child.relationships.parents = [];
                        if (!child.relationships.parents.includes(id)) {
                            child.relationships.parents.push(id);
                            changed = true;
                            console.log(`Repaired link: ${child.firstName} has parent ${person.firstName}`);
                        }
                    }
                });
            }

            // Partners <-> Partners
            if (person.relationships.partners) {
                person.relationships.partners = [...new Set(person.relationships.partners)]; // Dedup
                person.relationships.partners.forEach(partnerId => {
                    const partner = personMap.get(partnerId);
                    if (partner) {
                        if (!partner.relationships.partners) partner.relationships.partners = [];
                        if (!partner.relationships.partners.includes(id)) {
                            partner.relationships.partners.push(id);
                            changed = true;
                            console.log(`Repaired link: ${partner.firstName} is partner of ${person.firstName}`);
                        }
                    }
                });
            }
        }

        if (changed) {
            this.save();
            console.log('Data repaired and saved.');
        }
        return changed;
    }

    // Clear all data
    clear() {
        this.people.clear();
        this.save();
    }

    // Get statistics
    getStats() {
        const people = this.getAllPeople();
        return {
            total: people.length,
            males: people.filter(p => p.gender === 'M').length,
            females: people.filter(p => p.gender === 'F').length,
            living: people.filter(p => !p.deathDate).length,
            withPhotos: people.filter(p => p.photo).length
        };
    }

    // Search people
    search(query) {
        if (!query) return this.getAllPeople();

        const lowerQuery = query.toLowerCase();
        return this.getAllPeople().filter(person => {
            return (
                person.firstName.toLowerCase().includes(lowerQuery) ||
                person.lastName.toLowerCase().includes(lowerQuery) ||
                (person.maidenName && person.maidenName.toLowerCase().includes(lowerQuery)) ||
                (person.birthPlace && person.birthPlace.toLowerCase().includes(lowerQuery)) ||
                (person.occupation && person.occupation.toLowerCase().includes(lowerQuery))
            );
        });
    }
}

// Export singleton instance
const familyTree = new FamilyTree();
