/**
 * Tree Visualization Module
 * Handles tree layout, rendering, and connections
 */

class TreeView {
    constructor(container, canvas) {
        this.container = container;
        this.canvas = canvas;
        this.nodes = new Map();
        this.positions = new Map();
        this.selectedId = null;

        // Pan and zoom state
        this.scale = 1;
        this.minScale = 0.25;
        this.maxScale = 2;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Layout constants
        this.nodeWidth = 180;
        this.nodeHeight = 80;
        this.horizontalGap = 60;
        this.verticalGap = 80;
        this.generationGap = 200;

        this.setupPanZoom();
    }

    setupPanZoom() {
        // Mouse wheel zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom(delta, e.clientX, e.clientY);
        }, { passive: false });

        // Pan with mouse drag
        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container || e.target === this.canvas) {
                this.isDragging = true;
                this.dragStartX = e.clientX - this.translateX;
                this.dragStartY = e.clientY - this.translateY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.translateX = e.clientX - this.dragStartX;
                this.translateY = e.clientY - this.dragStartY;
                this.updateTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.container.style.cursor = 'grab';
        });

        // Touch support
        let lastTouchDistance = 0;
        let lastTouchX = 0;
        let lastTouchY = 0;

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                lastTouchDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches[0].clientX - lastTouchX;
                const dy = e.touches[0].clientY - lastTouchY;
                this.translateX += dx;
                this.translateY += dy;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
                this.updateTransform();
            } else if (e.touches.length === 2) {
                const distance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = (distance - lastTouchDistance) * 0.01;
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                this.zoom(delta, centerX, centerY);
                lastTouchDistance = distance;
            }
        }, { passive: true });

        this.container.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    zoom(delta, centerX, centerY) {
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));

        if (this.scale !== oldScale) {
            // Adjust translation to zoom towards cursor
            const rect = this.container.getBoundingClientRect();
            const x = centerX - rect.left;
            const y = centerY - rect.top;

            this.translateX = x - (x - this.translateX) * (this.scale / oldScale);
            this.translateY = y - (y - this.translateY) * (this.scale / oldScale);

            this.updateTransform();
            this.updateZoomLevel();
        }
    }

    setZoom(level) {
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, level));

        // Zoom towards center
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        this.translateX = centerX - (centerX - this.translateX) * (this.scale / oldScale);
        this.translateY = centerY - (centerY - this.translateY) * (this.scale / oldScale);

        this.updateTransform();
        this.updateZoomLevel();
    }

    updateTransform() {
        this.canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }

    updateZoomLevel() {
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.scale * 100) + '%';
        }
    }

    fitToView() {
        if (this.positions.size === 0) return;

        // Find bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.positions.forEach((pos) => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + this.nodeWidth);
            maxY = Math.max(maxY, pos.y + this.nodeHeight);
        });

        const padding = 50;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;

        const rect = this.container.getBoundingClientRect();
        const scaleX = rect.width / contentWidth;
        const scaleY = (rect.height - 100) / contentHeight;

        this.scale = Math.min(1, Math.min(scaleX, scaleY));
        this.translateX = (rect.width - contentWidth * this.scale) / 2 - minX * this.scale + padding;
        this.translateY = (rect.height - contentHeight * this.scale) / 2 - minY * this.scale + padding;

        this.updateTransform();
        this.updateZoomLevel();
    }

    // Calculate tree layout using Recursive Box Layout (Tidy Tree)
    calculateLayout(people) {
        this.positions.clear();
        this.nodes.clear();

        if (people.length === 0) return;

        const personMap = new Map(people.map(p => [p.id, p]));

        // PRE-PROCESSING: Repair Relationship Inconsistencies
        // Ensure strictly bidirectional parent-child links
        people.forEach(p => {
            // 1. If p lists child C, ensure C lists p as parent
            if (p.relationships.children) {
                p.relationships.children.forEach(childId => {
                    const child = personMap.get(childId);
                    if (child) {
                        if (!child.relationships.parents.includes(p.id)) {
                            child.relationships.parents.push(p.id);
                        }
                    }
                });
            }

            // 2. If p lists parent P, ensure P lists p as child
            if (p.relationships.parents) {
                p.relationships.parents.forEach(parentId => {
                    const parent = personMap.get(parentId);
                    if (parent) {
                        if (!parent.relationships.children.includes(p.id)) {
                            console.warn(`Repaired parent link: ${parent.firstName} -> ${p.firstName}`);
                            parent.relationships.children.push(p.id);
                        }
                    }
                });
            }
        });

        // Debug Logs
        people.forEach(p => {
            console.log(`Person: ${p.firstName}, Parents: ${p.relationships.parents}, Children: ${p.relationships.children}`);
        });

        const visited = new Set();

        // ... (rest of function)



        // Helper to get connected potential partners (shared children)
        const getFullPartners = (p) => {
            const partners = new Set(p.relationships.partners || []);
            if (p.relationships.children) {
                p.relationships.children.forEach(cid => {
                    const child = personMap.get(cid);
                    if (child) {
                        child.relationships.parents.forEach(pid => {
                            if (pid !== p.id) partners.add(pid);
                        });
                    }
                });
            }
            return Array.from(partners).map(id => personMap.get(id)).filter(Boolean);
        };

        // Data structure for layout
        // Node: { person, partners: [], children: [Node], width, height, x, y }
        const buildTree = (personId) => {
            if (visited.has(personId)) return null;
            visited.add(personId);

            const person = personMap.get(personId);
            if (!person) return null;

            const partners = getFullPartners(person).filter(p => !visited.has(p.id));
            partners.forEach(p => visited.add(p.id)); // Mark partners as visited immediately

            const node = {
                person: person,
                partners: partners,
                children: [],
                width: 0,
                totalWidth: 0 // Width including children
            };

            // Calculate width of the "Couples Block"
            const couplesCount = 1 + partners.length;
            node.coupleWidth = couplesCount * this.nodeWidth + (couplesCount - 1) * this.horizontalGap;

            // Find all children
            const childIds = new Set();
            if (person.relationships.children) person.relationships.children.forEach(id => childIds.add(id));
            partners.forEach(p => {
                if (p.relationships.children) p.relationships.children.forEach(id => childIds.add(id));
            });

            // Build children nodes
            // Start with birthdate sorting if available
            const sortedChildIds = Array.from(childIds).sort((a, b) => {
                const pA = personMap.get(a);
                const pB = personMap.get(b);
                if (pA && pB && pA.birthDate && pB.birthDate) {
                    return new Date(pA.birthDate) - new Date(pB.birthDate);
                }
                return 0;
            });

            sortedChildIds.forEach(cid => {
                const childNode = buildTree(cid);
                if (childNode) {
                    node.children.push(childNode);
                }
            });

            // Calculate Totals
            const childrenWidth = node.children.reduce((sum, child) => sum + child.totalWidth, 0)
                + Math.max(0, node.children.length - 1) * this.horizontalGap;

            node.totalWidth = Math.max(node.coupleWidth, childrenWidth);

            return node;
        };

        // 3. Identify Roots (Generation-Based)
        // Calculate Generations (Bidirectional Wave Propagation)
        const generations = new Map();
        const queue = [];

        // Seed: Iterate all to ensure disconnected clusters are handled
        people.forEach(seed => {
            if (generations.has(seed.id)) return;
            queue.push({ id: seed.id, gen: 0 });
            generations.set(seed.id, 0);

            while (queue.length > 0) {
                const { id, gen } = queue.shift();
                const person = personMap.get(id);
                if (!person) continue;

                // Partners (Same Gen)
                const partners = new Set(person.relationships.partners || []);
                if (person.relationships.children) {
                    person.relationships.children.forEach(cid => {
                        const child = personMap.get(cid);
                        if (child && child.relationships.parents) {
                            child.relationships.parents.forEach(pid => { if (pid !== id) partners.add(pid); });
                        }
                    });
                }
                partners.forEach(pid => {
                    if (!generations.has(pid)) {
                        generations.set(pid, gen);
                        queue.push({ id: pid, gen: gen });
                    }
                });

                // Children (Gen + 1)
                if (person.relationships.children) {
                    person.relationships.children.forEach(cid => {
                        if (!generations.has(cid)) {
                            generations.set(cid, gen + 1);
                            queue.push({ id: cid, gen: gen + 1 });
                        }
                    });
                }

                // Parents (Gen - 1)
                if (person.relationships.parents) {
                    person.relationships.parents.forEach(pid => {
                        if (!generations.has(pid)) {
                            generations.set(pid, gen - 1);
                            queue.push({ id: pid, gen: gen - 1 });
                        }
                    });
                }
            }
        });

        // Normalize Generations (Shift min to 0)
        let minGen = Infinity;
        generations.forEach(g => minGen = Math.min(minGen, g));
        if (minGen !== Infinity && minGen !== 0) {
            generations.forEach((g, id) => generations.set(id, g - minGen));
        }

        console.log('Normalized Generations:', Object.fromEntries(generations));

        // Roots are strictly nodes at calculated Generation 0
        const roots = [];
        const potentialRoots = people.filter(p => generations.get(p.id) === 0);

        // Sort deterministically
        potentialRoots.sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || ''));

        potentialRoots.forEach(p => {
            if (!visited.has(p.id)) {
                const node = buildTree(p.id);
                if (node) roots.push(node);
            }
        });

        // Pick up any disconnected components (cycles or detached)
        people.forEach(p => {
            if (!visited.has(p.id)) {
                const node = buildTree(p.id);
                if (node) roots.push(node);
            }
        });

        // Recursive Placement
        const setPosition = (node, x, y) => {
            // Center the couple block within the total width
            const coupleX = x + (node.totalWidth - node.coupleWidth) / 2;

            // Layout person and partners
            this.positions.set(node.person.id, { x: coupleX, y: y });

            let currentPartnerX = coupleX + this.nodeWidth + this.horizontalGap;
            node.partners.forEach(p => {
                this.positions.set(p.id, { x: currentPartnerX, y: y });
                currentPartnerX += this.nodeWidth + this.horizontalGap;
            });

            // Layout children
            let childX = x + (node.totalWidth - node.children.reduce((sum, c) => sum + c.totalWidth, 0) - (node.children.length - 1) * this.horizontalGap) / 2;
            // Align children center to couple center?
            // Actually, standard tree usually just centers the block of children under the parent.
            // The logic: `x + (totalWidth - childrenBlockWidth) / 2`

            // Correction: if childrenWidth > coupleWidth, x is start.
            // if coupleWidth > childrenWidth, x shifts children right.
            const childrenBlockWidth = node.children.reduce((sum, c) => sum + c.totalWidth, 0)
                + Math.max(0, node.children.length - 1) * this.horizontalGap;

            childX = x + (node.totalWidth - childrenBlockWidth) / 2;

            if (node.children.length > 0) {
                node.children.forEach(child => {
                    setPosition(child, childX, y + this.generationGap);
                    childX += child.totalWidth + this.horizontalGap;
                });
            }
        };

        const containerRect = this.container.getBoundingClientRect();
        // Calculate total forest width to center it
        const totalForestWidth = roots.reduce((sum, r) => sum + r.totalWidth, 0)
            + Math.max(0, roots.length - 1) * (this.horizontalGap * 3); // Extra gap between trees

        let currentX = (containerRect.width / 2); // Start centered? No, map is infinite. 
        // Just start at some point. Pan/Zoom handles verification.
        // Let's perform centering based on 0.
        // If we want initial view centered, we rely on existing scroll logic or just 0,0.
        // Let's start at a reasonable margin.

        currentX = 100;

        roots.forEach(root => {
            setPosition(root, currentX, 100);
            currentX += root.totalWidth + this.horizontalGap * 3;
        });
    }

    groupPartners(people, getPartnersFn) {
        const groups = [];
        const visited = new Set();
        const personMap = new Map(people.map(p => [p.id, p]));

        people.forEach(p => {
            if (visited.has(p.id)) return;

            const group = [p];
            visited.add(p.id);

            // Use provided getter or fallback to explicit
            const partners = getPartnersFn ? getPartnersFn(p.id) : p.relationships.partners;

            partners.forEach(partnerId => {
                const partner = personMap.get(partnerId);
                // Ensure partner is in this generation group before adding
                if (partner && !visited.has(partnerId)) {
                    group.push(partner);
                    visited.add(partnerId);
                }
            });

            groups.push(group);
        });
        return groups;
    }

    arrangeWithPartners(genPeople, allPeople) {
        return this.groupPartners(genPeople).flat();
    }

    // Render the tree
    render(people, onNodeClick, onNodeContextMenu) {
        this.canvas.innerHTML = '';
        this.nodes.clear();

        if (people.length === 0) {
            return;
        }

        this.calculateLayout(people);

        // Create SVG for connections
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('tree-connections');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.overflow = 'visible';
        this.canvas.appendChild(svg);

        // Draw connections
        this.drawConnections(svg, people);

        // Create nodes
        people.forEach(person => {
            const pos = this.positions.get(person.id);
            if (!pos) return;

            const node = this.createNode(person, pos);

            node.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectNode(person.id);
                if (onNodeClick) onNodeClick(person);
            });

            node.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onNodeContextMenu) onNodeContextMenu(e, person);
            });

            node.addEventListener('mouseenter', () => {
                const lines = this.container.querySelectorAll(`.conn-p-${person.id}`);
                lines.forEach(line => line.classList.add('highlight'));
            });

            node.addEventListener('mouseleave', () => {
                const lines = this.container.querySelectorAll(`.conn-p-${person.id}`);
                lines.forEach(line => line.classList.remove('highlight'));
            });

            this.canvas.appendChild(node);
            this.nodes.set(person.id, node);
        });
    }

    createNode(person, pos) {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.dataset.id = person.id;

        if (person.gender) {
            node.classList.add(person.gender === 'M' ? 'male' : person.gender === 'F' ? 'female' : 'other');
        }

        if (person.id === this.selectedId) {
            node.classList.add('selected');
        }

        node.style.left = pos.x + 'px';
        node.style.top = pos.y + 'px';

        const photoContent = person.photo
            ? `<img src="${person.photo}" alt="${familyTree.getFullName(person)}">`
            : familyTree.getGenderEmoji(person);

        const dates = familyTree.getLifeDates(person);

        node.innerHTML = `
      <div class="node-content">
        <div class="node-photo">${photoContent}</div>
        <div class="node-info">
          <div class="node-name">${familyTree.getFullName(person)}</div>
          ${dates ? `<div class="node-dates">${dates}</div>` : ''}
        </div>
      </div>
    `;

        return node;
    }

    drawConnections(svg, people) {
        const drawnPartnerLines = new Set();
        const personMap = new Map(people.map(p => [p.id, p]));
        const drawnChildLines = new Set();

        // Helper to get connected partners (explicit + implicit via shared children)
        const getConnectedPartners = (p) => {
            const partners = new Set(p.relationships.partners || []);
            if (p.relationships.children) {
                p.relationships.children.forEach(cid => {
                    const child = personMap.get(cid);
                    if (child) {
                        child.relationships.parents.forEach(pid => {
                            if (pid !== p.id) partners.add(pid);
                        });
                    }
                });
            }
            return Array.from(partners);
        };

        // 1. Draw Partner Lines
        people.forEach(p => {
            const pPos = this.positions.get(p.id);
            if (!pPos) return;

            const partners = getConnectedPartners(p);

            partners.forEach(partnerId => {
                const partnerPos = this.positions.get(partnerId);
                if (!partnerPos) return;

                // Only draw once per pair
                const key = [p.id, partnerId].sort().join('-');
                if (drawnPartnerLines.has(key)) return;
                drawnPartnerLines.add(key);

                // Draw horizontal line between partners
                const y = pPos.y + this.nodeHeight / 2;

                // Determine left/right order
                let x1, x2;
                if (pPos.x < partnerPos.x) {
                    x1 = pPos.x + this.nodeWidth;
                    x2 = partnerPos.x;
                } else {
                    x1 = partnerPos.x + this.nodeWidth;
                    x2 = pPos.x;
                }

                this.drawLine(svg, x1, y, x2, y, 'partner', [p.id, partnerId]);
            });
        });

        // 2. Draw Child Lines
        people.forEach(child => {
            const childPos = this.positions.get(child.id);
            const parentIds = child.relationships.parents;
            if (!childPos || !parentIds || parentIds.length === 0) return;

            // Get visible parents positions
            const parentsPos = parentIds
                .map(id => this.positions.get(id))
                .filter(pos => pos !== undefined);

            if (parentsPos.length === 0) return;

            // Calculate start point (center of parents)
            let startX, startY;

            if (parentsPos.length === 1) {
                startX = parentsPos[0].x + this.nodeWidth / 2;
                startY = parentsPos[0].y + this.nodeHeight;
            } else {
                // Find bounding box of parents to center the line
                let minX = Infinity, maxX = -Infinity;
                let avgY = 0;

                parentsPos.forEach(pos => {
                    minX = Math.min(minX, pos.x);
                    maxX = Math.max(maxX, pos.x + this.nodeWidth);
                    avgY += pos.y;
                });

                startX = (minX + maxX) / 2;
                startY = (avgY / parentsPos.length) + this.nodeHeight / 2; // Center of node height (partner line level)
            }

            const endX = childPos.x + this.nodeWidth / 2;
            const endY = childPos.y;

            // Combine child id and ALL parent ids as related
            const relatedIds = [child.id, ...parentIds];
            this.drawLine(svg, startX, startY, endX, endY, 'child', relatedIds);
        });
    }

    drawLine(svg, x1, y1, x2, y2, type, relatedIds = []) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('connection-line');

        // Add classes for related people
        relatedIds.forEach(id => {
            path.classList.add(`conn-p-${id}`);
        });

        if (type === 'partner') {
            path.classList.add('partner');
            // Straight line for partners
            path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
        } else {
            // Curved line for parent-child
            const midY = y1 + (y2 - y1) / 2;
            path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
        }

        svg.appendChild(path);
    }

    selectNode(id) {
        // Deselect previous
        this.nodes.forEach(node => node.classList.remove('selected'));

        // Select new
        this.selectedId = id;
        const node = this.nodes.get(id);
        if (node) {
            node.classList.add('selected');
        }
    }

    clearSelection() {
        this.selectedId = null;
        this.nodes.forEach(node => node.classList.remove('selected'));
    }

    highlightNode(id) {
        const node = this.nodes.get(id);
        if (node) {
            node.style.animation = 'none';
            node.offsetHeight; // Trigger reflow
            node.style.animation = 'highlight 0.5s ease';
        }
    }

    centerOnNode(id) {
        const pos = this.positions.get(id);
        if (!pos) return;

        const rect = this.container.getBoundingClientRect();
        this.translateX = rect.width / 2 - (pos.x + this.nodeWidth / 2) * this.scale;
        this.translateY = rect.height / 2 - (pos.y + this.nodeHeight / 2) * this.scale;

        this.updateTransform();
    }
}

// Add highlight animation
const style = document.createElement('style');
style.textContent = `
  @keyframes highlight {
    0%, 100% { box-shadow: var(--shadow-sm); }
    50% { box-shadow: 0 0 0 4px var(--accent-primary), var(--shadow-lg); }
  }
`;
document.head.appendChild(style);
