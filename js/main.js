import { GridManager } from './grids.js';
import { PlacementManager } from './placement.js';
import { SelectionManager } from './selection.js';
import { AlignmentManager } from './alignment.js';
import { TestNode } from './_test_node.js';

export class GraphBoard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        
        this.options = {
            majorGrid: options.majorGrid || 100,
            subGrid: options.subGrid || 20,
            gridType: options.gridType || 'lines',
            showSubGrid: options.showSubGrid !== undefined ? options.showSubGrid : true,
            snapMode: options.snapMode || 'major',
            minZoom: options.minZoom || 0.1,
            maxZoom: options.maxZoom || 10.0,
            zoomSensitivity: options.zoomSensitivity || 0.1
        };

        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.isDraggingElements = false;
        this.dragStartMouse = { x: 0, y: 0 };
        this.dragStartPositions = [];

        this.elements = [];
        
        this.svgNS = "http://www.w3.org/2000/svg";
        
        this.gridManager = null;
        this.placementManager = null;
        this.selectionManager = null;
        this.alignmentManager = null;

        this.onToast = options.onToast || ((msg) => console.log(msg));
        
        this.init();
    }

    init() {
        this.setupSVG();
        this.setupManagers();
        this.bindEvents();
    }

    setupSVG() {
        this.svg = document.createElementNS(this.svgNS, "svg");
        this.svg.setAttribute("id", "main-svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        
        this.defs = document.createElementNS(this.svgNS, "defs");
        this.svg.appendChild(this.defs);

        this.gridLayer = document.createElementNS(this.svgNS, "g");
        this.gridLayer.setAttribute("class", "grid-group");
        this.svg.appendChild(this.gridLayer);

        this.contentLayer = document.createElementNS(this.svgNS, "g");
        this.contentLayer.setAttribute("class", "content-group");
        this.svg.appendChild(this.contentLayer);

        this.container.appendChild(this.svg);
    }

    setupManagers() {
        this.gridManager = new GridManager(this.svg, {
            majorGrid: this.options.majorGrid,
            subGrid: this.options.subGrid,
            gridType: this.options.gridType,
            showSubGrid: this.options.showSubGrid
        });
        this.gridManager.init(this.defs, this.gridLayer);

        this.placementManager = new PlacementManager({
            snapMode: this.options.snapMode,
            majorGrid: this.options.majorGrid,
            subGrid: this.options.subGrid
        });

        this.selectionManager = new SelectionManager(this);
        this.selectionManager.init();

        this.alignmentManager = new AlignmentManager(this);
    }

    bindEvents() {
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());

        this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.pan(dx, dy);
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        } else if (this.isDraggingElements) {
            this.handleDragElements(e.clientX, e.clientY);
        }
    }

    handleMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.container.classList.remove('panning');
        }
        if (this.isDraggingElements) {
            this.endDragElements();
        }
    }

    handleMouseDown(e) {
        if (e.target === this.svg || e.target === this.gridLayer || e.target.tagName === 'rect' && e.target.getAttribute('fill')?.startsWith('url')) {
            this.selectionManager.clearSelection();
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.container.classList.add('panning');
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const d = Math.sign(e.deltaY);
        this.zoom(-d * this.options.zoomSensitivity, e.clientX, e.clientY);
    }

    zoom(delta, screenX, screenY) {
        const oldScale = this.scale;
        let newScale = oldScale * (1 + delta);
        newScale = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, newScale));
        if (newScale === oldScale) return;

        const worldX = (screenX - this.panX) / oldScale;
        const worldY = (screenY - this.panY) / oldScale;

        this.scale = newScale;
        this.panX = screenX - worldX * this.scale;
        this.panY = screenY - worldY * this.scale;
        this.updateTransform();
    }

    pan(dx, dy) {
        this.panX += dx;
        this.panY += dy;
        this.updateTransform();
    }

    updateTransform() {
        const transformStr = `translate(${this.panX}, ${this.panY}) scale(${this.scale})`;
        this.contentLayer.setAttribute("transform", transformStr);
        this.gridManager.updateTransform(this.panX, this.panY, this.scale);
        this.updateMinimap();
    }

    addTestNode(x, y, title) {
        const snapped = this.placementManager.getSnappedPos(x, y);
        
        const node = new TestNode({
            x: snapped.x,
            y: snapped.y,
            title: title
        });

        const dom = node.createDOM(this.svgNS);
        this.contentLayer.appendChild(dom);

        this.setupElementEvents(node);
        
        this.elements.push(node);
        this.updateMinimap();
        
        return node;
    }

    setupElementEvents(node) {
        node.el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            
            const isMultiKey = e.ctrlKey || e.metaKey;
            this.selectionManager.selectElement(node.id, isMultiKey);

            if (this.selectionManager.isSelected(node.id)) {
                this.startDragElements(e.clientX, e.clientY);
            }
        });
    }

    startDragElements(startX, startY) {
        this.isDraggingElements = true;
        this.container.classList.add('dragging-element');
        this.dragStartMouse = { x: startX, y: startY };
        
        this.dragStartPositions = [];
        this.selectionManager.selectedElements.forEach(id => {
            const el = this.elements.find(e => e.id === id);
            if (el) {
                this.dragStartPositions.push({ id: el.id, x: el.x, y: el.y });
            }
        });
    }

    handleDragElements(currentX, currentY) {
        if (!this.isDraggingElements) return;
        
        const dxScreen = currentX - this.dragStartMouse.x;
        const dyScreen = currentY - this.dragStartMouse.y;
        const dxWorld = dxScreen / this.scale;
        const dyWorld = dyScreen / this.scale;

        this.dragStartPositions.forEach(startPos => {
            const el = this.elements.find(e => e.id === startPos.id);
            if (el) {
                let targetX = startPos.x + dxWorld;
                let targetY = startPos.y + dyWorld;

                const snapped = this.placementManager.getSnappedPos(targetX, targetY);
                el.x = snapped.x;
                el.y = snapped.y;

                el.updatePosition(el.x, el.y);
            }
        });
        
        this.updateMinimap();
    }

    endDragElements() {
        this.isDraggingElements = false;
        this.container.classList.remove('dragging-element');
    }

    setGridType(type) {
        this.options.gridType = type;
        this.gridManager.setGridType(type);
    }

    toggleSubGrid(show) {
        this.options.showSubGrid = show;
        this.gridManager.toggleSubGrid(show);
    }

    setSnapMode(mode) {
        this.options.snapMode = mode;
        this.placementManager.setSnapMode(mode);
        const labels = { off: "Snapping Off", major: "Snap to Major", sub: "Snap to Sub-grid" };
        this.showToast(labels[mode]);
    }

    alignNodes(mode) {
        this.alignmentManager.alignNodes(mode);
    }

    distributeNodes(direction) {
        this.alignmentManager.distributeNodes(direction);
    }

    resetView() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.showToast("View Reset");
    }

    getContentBounds() {
        if (this.elements.length === 0) return null;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.elements.forEach(el => {
            const b = el.getBounds();
            if (b.left < minX) minX = b.left;
            if (b.right > maxX) maxX = b.right;
            if (b.top < minY) minY = b.top;
            if (b.bottom > maxY) maxY = b.bottom;
        });
        
        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    updateMinimap() {
        // Override in subclass or pass minimap elements
    }

    showToast(msg) {
        if (this.onToast) {
            this.onToast(msg);
        }
    }
}
