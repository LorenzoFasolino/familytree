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
        this.minScale = 0.2;
        this.maxScale = 2.5;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Layout constants - optimized for large trees
        this.nodeWidth = 180;
        this.nodeHeight = 80;
        this.horizontalGap = 40;       // Reduced for better density
        this.verticalGap = 60;         // Not used directly
        this.generationGap = 150;      // Vertical gap between generations

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

        const padding = 80;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;

        const rect = this.container.getBoundingClientRect();
        const scaleX = rect.width / contentWidth;
        const scaleY = (rect.height - 100) / contentHeight;

        // Minimum scale of 0.5 (50%) for readability, max 1.0
        this.scale = Math.max(0.5, Math.min(1, Math.min(scaleX, scaleY)));

        // Center the content
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
            // Custom Sort: "Centripetal Layout"
            // Females with partners -> Left (towards Groom in left tree)
            // Males with partners -> Right (towards Bride in right tree)
            // Singles -> Center
            const sortedChildIds = Array.from(childIds).sort((a, b) => {
                const pA = personMap.get(a);
                const pB = personMap.get(b);
                if (!pA || !pB) return 0;

                const checkPartner = (p) => {
                    return (p.relationships.partners && p.relationships.partners.length > 0) ||
                        (p.splitLinks && p.splitLinks.some(l => l.type === 'partner' || l.ghostContext === 'partner'));
                };
                const hasPartnerA = checkPartner(pA);
                const hasPartnerB = checkPartner(pB);

                // Determine layout weight: Female+Partner = -1 (Left), Single = 0, Male+Partner = 1 (Right)
                const getWeight = (p, hasPartner) => {
                    if (!hasPartner) return 0;
                    if (p.gender === 'F') return -1;
                    if (p.gender === 'M') return 1;
                    return 0;
                };

                const weightA = getWeight(pA, hasPartnerA);
                const weightB = getWeight(pB, hasPartnerB);

                if (weightA !== weightB) {
                    return weightA - weightB;
                }

                // Secondary sort: Birthdate
                if (pA.birthDate && pB.birthDate) {
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

        // Sort roots by family connection - group related ancestors together
        // Find all descendants for each root to determine family clusters
        const getDescendants = (personId, visited = new Set()) => {
            if (visited.has(personId)) return visited;
            visited.add(personId);
            const person = personMap.get(personId);
            if (person && person.relationships.children) {
                person.relationships.children.forEach(cid => getDescendants(cid, visited));
            }
            return visited;
        };

        // Create family clusters - roots that share descendants belong together
        const rootClusters = [];
        const assignedRoots = new Set();

        potentialRoots.forEach(root => {
            if (assignedRoots.has(root.id)) return;

            const cluster = [root];
            const rootDescendants = getDescendants(root.id);
            assignedRoots.add(root.id);

            // Find other roots that share descendants with this one
            potentialRoots.forEach(otherRoot => {
                if (assignedRoots.has(otherRoot.id)) return;
                const otherDescendants = getDescendants(otherRoot.id);

                // Check for shared descendants
                for (const desc of rootDescendants) {
                    if (otherDescendants.has(desc)) {
                        cluster.push(otherRoot);
                        assignedRoots.add(otherRoot.id);
                        break;
                    }
                }
            });

            // Sort cluster internally by birthdate
            cluster.sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || ''));
            rootClusters.push(cluster);
        });

        // Flatten clusters - roots within each cluster are now adjacent
        const sortedRoots = rootClusters.flat();

        sortedRoots.forEach(p => {
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

        // 1. Calculate internal layout for all roots (positions relative to root at 0,0)
        // Store metadata about each root tree (width, bbox, etc.)
        const rootLayouts = [];
        const placedPersonPositions = new Map(); // Global map of final positions

        roots.forEach(root => {
            // reset root-relative positions map for this tree
            const relativePositions = new Map();

            // Recursive helper to calculate relative positions
            const calcRelative = (node, x, y) => {
                const coupleX = x + (node.totalWidth - node.coupleWidth) / 2;
                relativePositions.set(node.person.id, { x: coupleX, y: y });

                let currentPartnerX = coupleX + this.nodeWidth + this.horizontalGap;
                node.partners.forEach(p => {
                    relativePositions.set(p.id, { x: currentPartnerX, y: y });
                    currentPartnerX += this.nodeWidth + this.horizontalGap;
                });

                const childrenBlockWidth = node.children.reduce((sum, c) => sum + c.totalWidth, 0)
                    + Math.max(0, node.children.length - 1) * this.horizontalGap;
                let childX = x + (node.totalWidth - childrenBlockWidth) / 2;

                if (node.children.length > 0) {
                    node.children.forEach(child => {
                        calcRelative(child, childX, y + this.generationGap);
                        childX += child.totalWidth + this.horizontalGap;
                    });
                }
            };

            calcRelative(root, 0, 0);

            rootLayouts.push({
                rootNode: root,
                relativePositions: relativePositions,
                width: root.totalWidth,
                id: root.person.id,
                placed: false,
                finalX: 0
            });
        });

        // 2. Identify anchors (dependencies)
        // An anchor is ANY person in another tree that this tree is connected to
        // via parent-child OR partner relationship.
        rootLayouts.forEach(layout => {
            layout.anchors = [];
            const processedAnchors = new Set();

            // Iterate ALL people in this tree
            layout.relativePositions.forEach((_, personId) => {
                const person = personMap.get(personId);
                if (!person) return;

                // Check children (if they are in another tree)
                if (person.relationships.children) {
                    person.relationships.children.forEach(cid => {
                        if (!layout.relativePositions.has(cid) && !processedAnchors.has(cid)) {
                            layout.anchors.push(cid);
                            processedAnchors.add(cid);
                        }
                    });
                }

                // Check partners (if they are in another tree - crucial for disjoint trees!)
                if (person.relationships.partners) {
                    person.relationships.partners.forEach(pid => {
                        if (!layout.relativePositions.has(pid) && !processedAnchors.has(pid)) {
                            layout.anchors.push(pid);
                            processedAnchors.add(pid);
                        }
                    });
                }

                // Also check parents? Usually parents are in the same tree or above.
                // If a node has a parent in another tree... that parent is a Root of another tree.
                // We want to be near our parent.
                if (person.relationships.parents) {
                    person.relationships.parents.forEach(pid => {
                        if (!layout.relativePositions.has(pid) && !processedAnchors.has(pid)) {
                            layout.anchors.push(pid);
                            processedAnchors.add(pid);
                        }
                    });
                }
            });
        });

        // Helper to check if a tree fits at x
        // Returns { fits: boolean, pushDir: number }
        // pushDir > 0 means "obstacle is to the left, move right"
        // pushDir < 0 means "obstacle is to the right, move left"
        const checkFit = (layout, targetX) => {
            let pushDir = 0;
            let collisionCount = 0;

            // Iterate all nodes in the candidate layout
            for (const [id, relPos] of layout.relativePositions) {
                const absX = targetX + relPos.x;
                const absY = 100 + relPos.y; // Base Y is 100

                // Check against all ALREADY PLACED nodes
                for (const [placedId, placedPos] of placedPersonPositions) {
                    if (Math.abs(placedPos.y - absY) < this.nodeHeight) {
                        // Same row (generation) - check X overlap
                        // Add horizontal gap to ensure breathing room
                        if (absX < placedPos.x + this.nodeWidth + this.horizontalGap &&
                            absX + this.nodeWidth + this.horizontalGap > placedPos.x) {

                            // Collision! Calculate escape direction
                            const myCenter = absX + this.nodeWidth / 2;
                            const obsCenter = placedPos.x + this.nodeWidth / 2;

                            if (myCenter > obsCenter) pushDir += 1;
                            else pushDir -= 1;

                            collisionCount++;
                        }
                    }
                }
            }

            return { fits: collisionCount === 0, pushDir };
        };

        // 3. Iterative placement
        let safetyCounter = 0;
        while (rootLayouts.some(l => !l.placed) && safetyCounter < 100) {
            safetyCounter++;

            // Score unplaced layouts
            const candidates = rootLayouts.filter(l => !l.placed).map(layout => {
                let score = 0;
                let desiredX = null;

                // Check if anchors are placed
                const placedAnchors = layout.anchors
                    .map(id => placedPersonPositions.get(id))
                    .filter(pos => pos !== undefined);

                if (placedAnchors.length > 0) {
                    score += 10; // High priority: ready to be attached
                    const avgAnchorX = placedAnchors.reduce((sum, p) => sum + p.x, 0) / placedAnchors.length;
                    desiredX = avgAnchorX - (layout.width / 2); // Center root block
                } else if (layout.anchors.length > 0) {
                    score -= 5; // Has anchors but not placed yet -> wait
                } else {
                    score += 1; // Base tree
                }

                return { layout, score, desiredX };
            });

            candidates.sort((a, b) => {
                // Primary: Score (descending) - place high priority items first
                if (b.score !== a.score) return b.score - a.score;

                // Secondary: Desired X (ascending) - place left-most items first
                // This prevents crossing lines by filling space from left to right
                if (a.desiredX !== null && b.desiredX !== null) {
                    return a.desiredX - b.desiredX;
                }

                // Fallback (should rarely happen for connected components)
                return 0;
            });

            const best = candidates[0];
            const layout = best.layout;

            let placeX;

            if (best.desiredX !== null) {
                // Try to place at desired X
                placeX = best.desiredX;

                // Check initial fit using new vector-based logic
                let fitResult = checkFit(layout, placeX);
                let fits = fitResult.fits;

                if (fitResult.fits) {
                    // Fits perfectly
                } else {
                    // Collision. Use pushDir to guide search
                    let offset = 0;
                    // fits handled in outer scope
                    const searchStep = 50;
                    // Prefer direction indicated by collision
                    // If obstacles are to the LEFT (pushDir > 0), we move RIGHT (+1)
                    // If obstacles are to the RIGHT (pushDir < 0), we move LEFT (-1)
                    // If ambiguous (0), default to verifying both sides
                    const preferredDir = fitResult.pushDir >= 0 ? 1 : -1;

                    while (offset < 4000) {
                        offset += searchStep;

                        // Try Preferred Direction FIRST
                        if (checkFit(layout, placeX + (offset * preferredDir)).fits) {
                            placeX += (offset * preferredDir);
                            fits = true;
                            break;
                        }

                        // Try Opposite Direction (fallback after significant effort)
                        // Or if preferred didn't work for a long time
                        if (offset > 1500 && checkFit(layout, placeX - (offset * preferredDir)).fits) {
                            placeX -= (offset * preferredDir);
                            fits = true;
                            break;
                        }
                    }
                }

                if (!fits) {
                    // Fallback to end
                    const maxPlacedX = rootLayouts
                        .filter(l => l.placed)
                        .reduce((max, l) => Math.max(max, l.finalX + l.width), 100);
                    placeX = maxPlacedX + this.horizontalGap * 1.5;
                }

            } else {
                // Place at next available spot
                const maxPlacedX = rootLayouts
                    .filter(l => l.placed)
                    .reduce((max, l) => Math.max(max, l.finalX + l.width), 100);
                placeX = maxPlacedX + this.horizontalGap * 1.5;
            }

            // Commit placement
            layout.placed = true;
            layout.finalX = placeX;

            // Update global position map
            layout.relativePositions.forEach((relPos, id) => {
                const finalPos = { x: placeX + relPos.x, y: 100 + relPos.y };
                placedPersonPositions.set(id, finalPos);
                this.positions.set(id, finalPos);
            });
        }
    }

    safelyAlignRoots(roots, people) {
        // 1. Identify "Tree Components" for each root
        // We traverse down from each root to identify which nodes belong to which layout block
        const rootComponents = new Map(); // rootId -> Set of node IDs

        const collectComponent = (node, set) => {
            set.add(node.person.id);
            node.partners.forEach(p => set.add(p.id));
            node.children.forEach(c => collectComponent(c, set));
        };

        roots.forEach(root => {
            const set = new Set();
            collectComponent(root, set);
            rootComponents.set(root.person.id, set);
        });

        // 2. Identify desired shifts
        const moves = [];

        roots.forEach(root => {
            const rootId = root.person.id;
            const componentIds = rootComponents.get(rootId);

            // Find children of this root that are NOT in this component
            // These form the "bridge" to other trees
            const children = root.person.relationships.children || [];
            if (children.length === 0) return;

            const externalChildPositions = [];
            children.forEach(cid => {
                if (!componentIds.has(cid)) {
                    const pos = this.positions.get(cid);
                    if (pos) externalChildPositions.push(pos);
                }
            });

            if (externalChildPositions.length === 0) return;

            // Calculate ideal center for the root based on external children
            const minChildX = Math.min(...externalChildPositions.map(p => p.x));
            const maxChildX = Math.max(...externalChildPositions.map(p => p.x + this.nodeWidth));
            const targetChildCenter = (minChildX + maxChildX) / 2;

            const currentRootPos = this.positions.get(rootId);
            const currentRootCenter = currentRootPos.x + this.nodeWidth / 2;
            const shift = targetChildCenter - currentRootCenter;

            // Only move if significant
            if (Math.abs(shift) > 10) {
                moves.push({ root, componentIds, shift, distance: Math.abs(shift) });
            }
        });

        // Sort moves by distance (maybe largest first? or those that move Left?)
        // Let's process closest matches first to lock them in? 
        // Or largest to fix big gaps?
        // Let's define a safe move function
        moves.sort((a, b) => b.distance - a.distance);

        moves.forEach(move => {
            const { root, componentIds, shift } = move;

            // Try to apply the shift
            if (this.canSafelyShift(componentIds, shift)) {
                this.applyShift(componentIds, shift);
                console.log(`Aligned ${familyTree.getFullName(root.person)} by ${Math.round(shift)}px`);
            } else {
                // Try partial shift? Scanning for allowed space is complex.
                // For now, simpler is safer: valid or nothing.
                // Or try 80%?
                console.log(`Could not safely align ${familyTree.getFullName(root.person)} (collision detected)`);
            }
        });
    }

    canSafelyShift(movingNodeIds, shiftX) {
        // Check if moving these nodes by shiftX causes overlap with ANY non-moving node
        // Iterate all nodes in the diagram
        for (const [id, pos] of this.positions) {
            // If this node is part of the moving group, skip it (it moves with us)
            if (movingNodeIds.has(id)) continue;

            // This is a static obstacle. Check against all moving nodes.
            // Optimization: first check if 'pos' is even in the Y-range of moving group?
            // Actually, just iterate moving group.
            for (const movingId of movingNodeIds) {
                const movingPos = this.positions.get(movingId);

                // Proposed new X for moving node
                const newX = movingPos.x + shiftX;
                const newY = movingPos.y; // Y doesn't change

                // Check collision with static node 'pos'
                // Simple AABB collision with horizontal gap
                const horizontalOverlap = (newX < pos.x + this.nodeWidth + this.horizontalGap) &&
                    (newX + this.nodeWidth + this.horizontalGap > pos.x);

                const verticalOverlap = Math.abs(newY - pos.y) < this.nodeHeight;

                if (horizontalOverlap && verticalOverlap) {
                    return false; // Collision!
                }
            }
        }
        return true;
    }

    applyShift(movingNodeIds, shiftX) {
        movingNodeIds.forEach(id => {
            const pos = this.positions.get(id);
            this.positions.set(id, { x: pos.x + shiftX, y: pos.y });
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
                this.highlightAncestryPath(person.id, true);
            });

            node.addEventListener('mouseleave', () => {
                this.highlightAncestryPath(person.id, false);
            });

            this.canvas.appendChild(node);
            this.nodes.set(person.id, node);
        });

        // Create ghost nodes for split relationships
        this.renderGhostNodes(people, svg, onNodeClick);
    }

    // Render ghost (duplicate) nodes for split relationships
    renderGhostNodes(people, svg, onNodeClick) {
        const personMap = new Map(people.map(p => [p.id, p]));
        const ghostPositions = [];

        // Find all split relationships and create ghost positions
        people.forEach(person => {
            if (!person.splitLinks || person.splitLinks.length === 0) return;

            person.splitLinks.forEach(split => {
                const linkedPerson = personMap.get(split.linkedPersonId);
                if (!linkedPerson) return;

                const linkedPos = this.positions.get(split.linkedPersonId);
                if (!linkedPos) return;

                // Calculate ghost position near the linked person
                let ghostX, ghostY;

                if (split.type === 'parent') {
                    // Ghost should appear below the parent (where child would normally be)
                    ghostX = linkedPos.x;
                    ghostY = linkedPos.y + this.generationGap;
                } else if (split.type === 'partner') {
                    // Ghost should appear next to the partner
                    ghostX = linkedPos.x + this.nodeWidth + this.horizontalGap;
                    ghostY = linkedPos.y;
                } else if (split.type === 'child') {
                    // Ghost should appear above the child (where parent would normally be)
                    ghostX = linkedPos.x;
                    ghostY = linkedPos.y - this.generationGap;
                }

                ghostPositions.push({
                    person: person,
                    ghostX: ghostX,
                    ghostY: ghostY,
                    linkedPerson: linkedPerson,
                    splitType: split.type
                });
            });
        });

        // Render ghost nodes
        ghostPositions.forEach(({ person, ghostX, ghostY, linkedPerson, splitType }) => {
            const ghostNode = this.createGhostNode(person, ghostX, ghostY, linkedPerson);

            ghostNode.addEventListener('click', (e) => {
                e.stopPropagation();
                // Navigate to the main node
                const mainPos = this.positions.get(person.id);
                if (mainPos) {
                    this.centerOnNode(person.id);
                    this.selectNode(person.id);
                    if (onNodeClick) onNodeClick(person);
                }
            });

            this.canvas.appendChild(ghostNode);

            // Draw a connection line from linked person to ghost
            if (splitType === 'parent') {
                // Draw line from parent to ghost child
                const parentCenterX = linkedPerson.id ?
                    this.positions.get(linkedPerson.id).x + this.nodeWidth / 2 : ghostX;
                const parentBottomY = this.positions.get(linkedPerson.id).y + this.nodeHeight;
                const childCenterX = ghostX + this.nodeWidth / 2;
                const childTopY = ghostY;
                const midY = parentBottomY + (childTopY - parentBottomY) * 0.5;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.classList.add('connection-line', 'ghost-connection');
                path.setAttribute('d', `M ${parentCenterX} ${parentBottomY} L ${parentCenterX} ${midY} L ${childCenterX} ${midY} L ${childCenterX} ${childTopY}`);
                svg.appendChild(path);
            }
        });
    }

    // Create a ghost node (visual duplicate with distinctive style)
    createGhostNode(person, x, y, linkedTo) {
        const node = document.createElement('div');
        node.className = 'tree-node ghost-node';

        if (person.gender === 'M') node.classList.add('male');
        else if (person.gender === 'F') node.classList.add('female');
        else if (person.gender) node.classList.add('other');

        node.style.left = x + 'px';
        node.style.top = y + 'px';

        const photoContent = person.photo
            ? `<img src="${person.photo}" alt="">`
            : familyTree.getGenderEmoji(person);

        const linkedName = linkedTo ? familyTree.getFullName(linkedTo) : '';
        const mainPos = this.positions.get(person.id);
        const direction = mainPos && mainPos.x < x ? '←' : '→';

        node.innerHTML = `
            <div class="node-content">
                <div class="node-photo">${photoContent}</div>
                <div class="node-info">
                    <div class="node-name">${familyTree.getFullName(person)}</div>
                    <div class="node-dates ghost-badge-nav" title="Vai al nodo principale">${direction} Vai al principale</div>
                </div>
            </div>
        `;

        return node;
    }

    // Highlight ancestry path (all ancestors and descendants)
    highlightAncestryPath(personId, highlight) {
        const relatedIds = new Set();
        relatedIds.add(personId);

        // Get the person
        const person = familyTree.getPerson(personId);
        if (!person) return;

        // Collect all ancestors recursively
        const collectAncestors = (id) => {
            const p = familyTree.getPerson(id);
            if (!p) return;
            p.relationships.parents.forEach(parentId => {
                if (!relatedIds.has(parentId)) {
                    relatedIds.add(parentId);
                    collectAncestors(parentId);
                }
            });
        };

        // Collect all descendants recursively
        const collectDescendants = (id) => {
            const p = familyTree.getPerson(id);
            if (!p) return;
            p.relationships.children.forEach(childId => {
                if (!relatedIds.has(childId)) {
                    relatedIds.add(childId);
                    collectDescendants(childId);
                }
            });
        };

        // Also include partners
        const collectPartners = (id) => {
            const p = familyTree.getPerson(id);
            if (!p) return;
            p.relationships.partners.forEach(partnerId => {
                relatedIds.add(partnerId);
            });
            // Co-parents from children
            p.relationships.children.forEach(childId => {
                const child = familyTree.getPerson(childId);
                if (child) {
                    child.relationships.parents.forEach(parentId => {
                        relatedIds.add(parentId);
                    });
                }
            });
        };

        collectAncestors(personId);
        collectDescendants(personId);
        collectPartners(personId);

        if (highlight) {
            // Add path-active class to canvas
            this.canvas.classList.add('path-active');

            // Highlight related nodes
            relatedIds.forEach(id => {
                const node = this.nodes.get(id);
                if (node) node.classList.add('path-highlight');
            });

            // Highlight related connection lines
            // For each line, check if child AND at least one parent are in relatedIds
            this.canvas.querySelectorAll('.connection-line').forEach(line => {
                const lineClasses = Array.from(line.classList);
                const connectedIds = lineClasses
                    .filter(c => c.startsWith('conn-p-'))
                    .map(c => c.replace('conn-p-', ''));

                // A line should be highlighted if at least 2 connected people are in relatedIds
                // This handles parent-child lines where one parent may not be in the ancestry
                const matchCount = connectedIds.filter(cid => relatedIds.has(cid)).length;
                if (matchCount >= 2) {
                    line.classList.add('path-highlight');
                }
            });
        } else {
            // Remove all highlights
            this.canvas.classList.remove('path-active');
            this.canvas.querySelectorAll('.path-highlight').forEach(el => {
                el.classList.remove('path-highlight');
            });
        }
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

        // 2. Draw Child Lines (orthogonal: down, horizontal, down)
        const arcLengths = []; // Debug: collect arc lengths

        people.forEach(child => {
            const childPos = this.positions.get(child.id);
            const parentIds = child.relationships.parents;
            if (!childPos || !parentIds || parentIds.length === 0) return;

            // Skip if this relationship is split (ghost node will handle it)
            if (child.splitLinks && child.splitLinks.some(s => s.type === 'parent')) {
                return; // Don't draw line - ghost node handles this
            }

            // Get parent positions
            const parentsPos = parentIds
                .map(id => this.positions.get(id))
                .filter(pos => pos !== undefined);

            if (parentsPos.length === 0) return;

            // Calculate parent connection point
            let parentCenterX, parentBottomY;

            if (parentsPos.length === 1) {
                parentCenterX = parentsPos[0].x + this.nodeWidth / 2;
                parentBottomY = parentsPos[0].y + this.nodeHeight;
            } else {
                // Center between parents
                let minX = Infinity, maxX = -Infinity;
                let maxY = -Infinity;

                parentsPos.forEach(pos => {
                    minX = Math.min(minX, pos.x);
                    maxX = Math.max(maxX, pos.x + this.nodeWidth);
                    maxY = Math.max(maxY, pos.y + this.nodeHeight);
                });

                parentCenterX = (minX + maxX) / 2;
                parentBottomY = maxY;
            }

            const childCenterX = childPos.x + this.nodeWidth / 2;
            const childTopY = childPos.y;

            // Simple midY at 50% between parent and child
            const midY = parentBottomY + (childTopY - parentBottomY) * 0.5;

            // Calculate arc length (orthogonal path)
            const verticalDown1 = midY - parentBottomY;
            const horizontal = Math.abs(childCenterX - parentCenterX);
            const verticalDown2 = childTopY - midY;
            const totalArcLength = verticalDown1 + horizontal + verticalDown2;

            // Get names for debug
            const childName = familyTree.getFullName(child);
            const parentNames = parentIds.map(id => {
                const p = personMap.get(id);
                return p ? familyTree.getFullName(p) : id;
            }).join(' & ');

            arcLengths.push({
                parent: parentNames,
                child: childName,
                horizontalDist: Math.round(horizontal),
                verticalDist: Math.round(childTopY - parentBottomY),
                totalLength: Math.round(totalArcLength)
            });

            // Draw orthogonal path: parent → down → horizontal → down → child
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.classList.add('connection-line');
            parentIds.forEach(id => path.classList.add(`conn-p-${id}`));
            path.classList.add(`conn-p-${child.id}`);

            // Path: vertical down, horizontal to child X, vertical down to child
            path.setAttribute('d', `M ${parentCenterX} ${parentBottomY} L ${parentCenterX} ${midY} L ${childCenterX} ${midY} L ${childCenterX} ${childTopY}`);
            svg.appendChild(path);
        });

        // Debug: Log arc lengths sorted by total length (longest first)
        arcLengths.sort((a, b) => b.totalLength - a.totalLength);
        console.log('=== ARC LENGTHS (sorted by total length) ===');
        console.table(arcLengths);

        // Highlight the longest arcs
        const longArcs = arcLengths.filter(a => a.horizontalDist > 500);
        if (longArcs.length > 0) {
            console.warn('⚠️ LONG HORIZONTAL DISTANCES (>500px):', longArcs);
        }
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
            // Straight horizontal line for partners
            path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
        } else {
            // Orthogonal (right-angle) lines for parent-child
            // Pattern: go down from parent, then horizontal, then down to child
            const midY = y1 + (y2 - y1) / 2;

            // Create path with right angles: 
            // 1. Go down from start point to midY
            // 2. Go horizontal to align with end X
            // 3. Go down to end point
            path.setAttribute('d', `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
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
