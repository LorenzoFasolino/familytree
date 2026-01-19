/**
 * Main Application Module
 * Initializes and coordinates all components
 */

class App {
    constructor() {
        this.treeView = null;
        this.searchInput = null;
        this.emptyState = null;

        this.init();
    }

    init() {
        // Load data and repair any inconsistencies
        familyTree.load();
        familyTree.repairData();

        // Initialize UI components
        UI.init();

        // Initialize tree view
        const container = document.getElementById('tree-container');
        const canvas = document.getElementById('tree-canvas');
        this.treeView = new TreeView(container, canvas);

        // Cache elements
        this.emptyState = document.getElementById('empty-state');
        this.searchInput = document.getElementById('search-input');

        // Setup event listeners
        this.setupEventListeners();
        this.setupKeyboardShortcuts();

        // Apply saved theme
        this.loadTheme();

        // Initial render
        this.refresh();

        console.log('🌳 Family Tree App initialized');
    }

    setupEventListeners() {
        // Add person buttons
        document.getElementById('btn-add-person').addEventListener('click', () => {
            UI.modal.open();
        });
        document.getElementById('btn-start').addEventListener('click', () => {
            UI.modal.open();
        });

        // Import/Export
        document.getElementById('btn-import').addEventListener('click', () => this.import());
        document.getElementById('btn-export').addEventListener('click', () => this.export());

        // File input for import
        document.getElementById('import-file').addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
            e.target.value = ''; // Reset for re-import
        });

        // Theme toggle
        document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());

        // Zoom controls
        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            this.treeView.setZoom(this.treeView.scale + 0.1);
        });
        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            this.treeView.setZoom(this.treeView.scale - 0.1);
        });
        document.getElementById('btn-zoom-fit').addEventListener('click', () => {
            this.treeView.fitToView();
        });

        // Search
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.search(e.target.value);
            }, 200);
        });

        // Close panel on canvas click
        document.getElementById('tree-canvas').addEventListener('click', (e) => {
            if (e.target.id === 'tree-canvas') {
                UI.panel.close();
                UI.quickMenu.hide();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            // Ctrl/Cmd shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        UI.modal.open();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.export();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.import();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.searchInput.focus();
                        break;
                }
                return;
            }

            // Other shortcuts
            switch (e.key) {
                case 'Escape':
                    UI.modal.close();
                    UI.panel.close();
                    UI.quickMenu.hide();
                    break;
                case 'Delete':
                case 'Backspace':
                    if (UI.panel.currentPerson) {
                        UI.panel.deletePerson();
                    }
                    break;
            }
        });
    }

    refresh() {
        const people = familyTree.getAllPeople();

        // Show/hide empty state
        if (people.length === 0) {
            this.emptyState.classList.remove('hidden');
        } else {
            this.emptyState.classList.add('hidden');
        }

        // Render tree
        this.treeView.render(
            people,
            (person) => this.selectPerson(person),
            (e, person) => UI.quickMenu.show(e.clientX, e.clientY, person)
        );

        // Center view if only one person
        if (people.length === 1) {
            setTimeout(() => this.treeView.fitToView(), 100);
        }
    }

    selectPerson(person) {
        this.treeView.selectNode(person.id);
        UI.panel.open(person);
        this.treeView.centerOnNode(person.id);
    }

    search(query) {
        const results = familyTree.search(query);

        if (query && results.length > 0) {
            // Highlight first result
            const first = results[0];
            this.selectPerson(first);
            this.treeView.highlightNode(first.id);
        } else if (query && results.length === 0) {
            UI.toast.show('Nessun risultato trovato', 'warning');
        }
    }

    export() {
        const json = familyTree.exportJSON();

        // Generate filename with date, time and timestamp
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = now.getTime();

        const filename = `albero-genealogico_${day}-${month}-${year}_${hours}-${minutes}-${seconds}_${timestamp}.json`;

        // Use data URL for better compatibility
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Cleanup after a short delay
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);

        const stats = familyTree.getStats();
        UI.toast.show(`Esportate ${stats.total} persone`, 'success');
    }


    import() {
        document.getElementById('import-file').click();
    }

    handleImportFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = familyTree.importJSON(e.target.result);

            if (result.success) {
                UI.toast.show(`Importate ${result.count} persone`, 'success');
                this.refresh();
                this.treeView.fitToView();
            } else {
                UI.toast.show(`Errore: ${result.error} `, 'error');
            }
        };
        reader.onerror = () => {
            UI.toast.show('Errore nella lettura del file', 'error');
        };
        reader.readAsText(file);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

    loadTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
