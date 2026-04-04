import { GraphNode } from './graph-node.js';
import { GraphEdge } from './graph-edge.js';
import { EdgeManager } from './edge-manager.js';
import { PathMethods } from './path-methods.js';

export class NodesEdgesExtension {
    constructor(board, options = {}) {
        this.board = board;
        this.edgeManager = null;
        this._installed = false;

        this._dragState = null;
        this._originalHandleDragElements = null;

        this.options = {
            onEdgeSelect: options.onEdgeSelect || null,
            onEdgeDeselect: options.onEdgeDeselect || null,
            onEdgeCreate: options.onEdgeCreate || null,
            onEdgeDelete: options.onEdgeDelete || null,
            onEdgeLabelChange: options.onEdgeLabelChange || null,
            focusOutlineColor: options.focusOutlineColor || '#e09f3e',
            selectionOutlineColor: options.selectionOutlineColor || '#ff6b6b',
        };
    }

    install() {
        if (this._installed) return;
        this._installed = true;

        this.edgeManager = new EdgeManager(this.board, {
            onEdgeSelect: this.options.onEdgeSelect,
            onEdgeDeselect: this.options.onEdgeDeselect,
            onEdgeCreate: (edge) => {
                this._applySlotStylesToNodes(edge);
                if (this.options.onEdgeCreate) this.options.onEdgeCreate(edge);
            },
            onEdgeDelete: (edge) => {
                this._resetSlotStylesForEdge(edge);
                if (this.options.onEdgeDelete) this.options.onEdgeDelete(edge);
            },
            onEdgeLabelChange: this.options.onEdgeLabelChange,
            focusOutlineColor: this.options.focusOutlineColor,
            selectionOutlineColor: this.options.selectionOutlineColor,
        });
        this.edgeManager.init();

        this._bindPortEvents();
        this._hookDragUpdate();
        this._hookRemoveElement();
        this._hookLayoutMethods();

        this.board._nodesEdgesExt = this;
    }

    uninstall() {
        if (!this._installed) return;
        this._installed = false;

        this._unbindPortEvents();
        this._unhookDragUpdate();
        this._unhookRemoveElement();
        this._unhookLayoutMethods();

        if (this.edgeManager) {
            this.edgeManager.destroy();
            this.edgeManager = null;
        }

        delete this.board._nodesEdgesExt;
    }

    // ─── Keep slot layer on top of all nodes ───

    _ensureSlotLayerOnTop() {
        const slotLayer = this.edgeManager && this.edgeManager.getSlotLayer();
        if (slotLayer && slotLayer.parentNode === this.board.contentLayer) {
            this.board.contentLayer.appendChild(slotLayer);
        }
    }

    // ─── Public API: Node creation ───

    addNode(x, y, label, options = {}) {
        const snapped = this.board.placementManager.getSnappedPos(x, y, options.width || 140, options.height || 50);
        const node = new GraphNode({
            x: snapped.x + (options.width || 140) / 2,
            y: snapped.y + (options.height || 50) / 2,
            label,
            ...options
        });

        const dom = node.createDOM(this.board.svgNS);
        this.board.contentLayer.appendChild(dom);
        this.board.setupElementEvents(node);
        this.board.elements.push(node);
        this.board.updateMinimap();

        // Ensure slot layer stays above all nodes
        this._ensureSlotLayerOnTop();

        return node;
    }

    // ─── Public API: Edge creation ───

    addEdge(sourceId, targetId, sourceDir, targetDir, props) {
        return this.edgeManager.addEdge(sourceId, targetId, sourceDir, targetDir, props);
    }

    removeEdge(edgeId) {
        this.edgeManager.removeEdge(edgeId);
    }

    getEdge(edgeId) {
        return this.edgeManager.getEdge(edgeId);
    }

    get pathMethods() {
        return PathMethods;
    }



		setEdgeLabelFontSize(edgeId, size) {
        this.edgeManager.setEdgeLabelFontSize(edgeId, size);
    }

    setEdgeLabelPadding(edgeId, padX, padY) {
        this.edgeManager.setEdgeLabelPadding(edgeId, padX, padY);
    }



    // ─── Slot style application ───

    _applySlotStylesToNodes(edge) {
        const sourceNode = this.board.elements.find(e => e.id === edge.sourceId);
        const targetNode = this.board.elements.find(e => e.id === edge.targetId);

        if (sourceNode && sourceNode.setPortStyle) {
            if (edge.sourceSlotStyle === 'none') {
                sourceNode.setPortStyle(edge.sourceDir, 'circle', null);
            } else {
                sourceNode.setPortStyle(edge.sourceDir, edge.sourceSlotStyle, edge.sourceSlotColor);
            }
        }
        if (targetNode && targetNode.setPortStyle) {
            if (edge.targetSlotStyle === 'none') {
                targetNode.setPortStyle(edge.targetDir, 'circle', null);
            } else {
                targetNode.setPortStyle(edge.targetDir, edge.targetSlotStyle, edge.targetSlotColor);
            }
        }
    }

    _resetSlotStylesForEdge(edge) {
        const sourceStillUsed = this.edgeManager.edges.some(
            e => e.sourceId === edge.sourceId && e.sourceDir === edge.sourceDir && e.id !== edge.id
        ) || this.edgeManager.edges.some(
            e => e.targetId === edge.sourceId && e.targetDir === edge.sourceDir && e.id !== edge.id
        );

        const targetStillUsed = this.edgeManager.edges.some(
            e => e.sourceId === edge.targetId && e.sourceDir === edge.targetDir && e.id !== edge.id
        ) || this.edgeManager.edges.some(
            e => e.targetId === edge.targetId && e.targetDir === edge.targetDir && e.id !== edge.id
        );

        const sourceNode = this.board.elements.find(e => e.id === edge.sourceId);
        const targetNode = this.board.elements.find(e => e.id === edge.targetId);

        if (!sourceStillUsed && sourceNode && sourceNode.setPortStyle) {
            sourceNode.setPortStyle(edge.sourceDir, 'circle', null);
        }
        if (!targetStillUsed && targetNode && targetNode.setPortStyle) {
            targetNode.setPortStyle(edge.targetDir, 'circle', null);
        }
    }

    setSourceSlotStyle(edgeId, style) {
        this.edgeManager.setSourceSlotStyle(edgeId, style);
        const edge = this.edgeManager.getEdge(edgeId);
        if (edge) this._applySlotStylesToNodes(edge);
    }

    setSourceSlotColor(edgeId, color) {
        this.edgeManager.setSourceSlotColor(edgeId, color);
        const edge = this.edgeManager.getEdge(edgeId);
        if (edge) this._applySlotStylesToNodes(edge);
    }

    setTargetSlotStyle(edgeId, style) {
        this.edgeManager.setTargetSlotStyle(edgeId, style);
        const edge = this.edgeManager.getEdge(edgeId);
        if (edge) this._applySlotStylesToNodes(edge);
    }

    setTargetSlotColor(edgeId, color) {
        this.edgeManager.setTargetSlotColor(edgeId, color);
        const edge = this.edgeManager.getEdge(edgeId);
        if (edge) this._applySlotStylesToNodes(edge);
    }

    setEdgeLabel(edgeId, label) {
        this.edgeManager.setEdgeLabel(edgeId, label);
    }

    setEdgeLabelBgColor(edgeId, color) {
        this.edgeManager.setEdgeLabelBgColor(edgeId, color);
    }

    setEdgeLabelTextColor(edgeId, color) {
        this.edgeManager.setEdgeLabelTextColor(edgeId, color);
    }

		setEdgeLabelFontSize(edgeId, size) {
        this.edgeManager.setEdgeLabelFontSize(edgeId, size);
    }

    setEdgeLabelPadding(edgeId, padX, padY) {
        this.edgeManager.setEdgeLabelPadding(edgeId, padX, padY);
    }

    setEdgeLabelBgStroke(edgeId, color, width) {
        this.edgeManager.setEdgeLabelBgStroke(edgeId, color, width);
    }

    setEdgeLabelBgRadius(edgeId, radius) {
        this.edgeManager.setEdgeLabelBgRadius(edgeId, radius);
    }

    // ─── Port interaction ───

    _isInputFocused() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
            el.isContentEditable;
    }

    _bindPortEvents() {
        this._onPortMouseDown = (e) => {
            const portEl = e.target.closest('.gn-port');
            if (!portEl || e.button !== 0) return;
            e.stopPropagation();

            const nodeId = portEl.dataset.nodeId;
            const dir = portEl.dataset.portDir;
            const node = this.board.elements.find(n => n.id === nodeId);
            if (!node) return;

            const worldPos = node.getPortWorldPos(dir);

            this.board.selectionManager.selectElement(nodeId, false);

            this._dragState = {
                type: 'connect',
                nodeId,
                dir,
                startX: worldPos.x,
                startY: worldPos.y
            };
            this.edgeManager.startConnect(nodeId, dir, worldPos.x, worldPos.y);
        };

        this._onPortMouseUp = (e) => {
            if (!this._dragState || this._dragState.type !== 'connect') return;

            const worldPos = this._screenToWorld(e.clientX, e.clientY);

            let targetNodeId = null, targetDir = null;
            for (const el of this.board.elements) {
                if (!el.hitTestPort) continue;
                if (el.id === this._dragState.nodeId) continue;
                const dir = el.hitTestPort(worldPos.x, worldPos.y, 30);
                if (dir) {
                    targetNodeId = el.id;
                    targetDir = dir;
                    break;
                }
            }

            const edge = this.edgeManager.endConnect(targetNodeId, targetDir);
            if (edge) {
                this.edgeManager.selectEdge(edge.id);
            }
            this._dragState = null;
        };

        this._onDocMouseMove = (e) => {
            if (!this._dragState || this._dragState.type !== 'connect') return;
            const worldPos = this._screenToWorld(e.clientX, e.clientY);
            this.edgeManager.updateConnect(worldPos.x, worldPos.y);
        };

        this._onKeyDown = (e) => {
            if (this._isInputFocused()) return;

            if (e.key === 'Escape') {
                if (this._dragState && this._dragState.type === 'connect') {
                    this.edgeManager.cancelConnect();
                    this._dragState = null;
                }
                this.edgeManager.deselectAll();
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const selectedEdge = this.edgeManager.getSelectedEdge();
                if (selectedEdge) {
                    this.edgeManager.removeEdge(selectedEdge.id);
                    e.preventDefault();
                }
            }
        };

        this._onCanvasClick = (e) => {
            // Don't deselect when an input/control has focus
            if (this._isInputFocused()) return;
            if (e.target === this.board.svg || e.target === this.board.gridLayer) {
                this.edgeManager.deselectAll();
            }
        };

        this.board.container.addEventListener('mousedown', this._onPortMouseDown, true);
        window.addEventListener('mouseup', this._onPortMouseUp);
        window.addEventListener('mousemove', this._onDocMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        this.board.container.addEventListener('click', this._onCanvasClick);
    }

    _unbindPortEvents() {
        this.board.container.removeEventListener('mousedown', this._onPortMouseDown, true);
        window.removeEventListener('mouseup', this._onPortMouseUp);
        window.removeEventListener('mousemove', this._onDocMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        this.board.container.removeEventListener('click', this._onCanvasClick);
    }

    // ─── Hook into element drag to update edges ───

    _hookDragUpdate() {
        const self = this;
        this._origHandleDrag = this.board.handleDragElements.bind(this.board);

        this.board.handleDragElements = function (currentX, currentY) {
            self._origHandleDrag(currentX, currentY);
            self.edgeManager.renderAll();
        };
    }

    _unhookDragUpdate() {
        if (this._origHandleDrag) {
            this.board.handleDragElements = this._origHandleDrag;
            this._origHandleDrag = null;
        }
    }

    // ─── Hook into element removal to clean up connected edges ───

    _hookRemoveElement() {
        const self = this;
        this._origRemoveElement = this.board.removeElement.bind(this.board);

        this.board.removeElement = function (elementId) {
            const connected = self.edgeManager.getEdgesForNode(elementId);
            for (const edge of connected) {
                self.edgeManager.removeEdge(edge.id);
            }
            self._origRemoveElement(elementId);
        };
    }

    _unhookRemoveElement() {
        if (this._origRemoveElement) {
            this.board.removeElement = this._origRemoveElement;
            this._origRemoveElement = null;
        }
    }

    // ─── Hook layout methods to re-render edges after node repositioning ───

    _hookLayoutMethods() {
        const self = this;
        const methods = ['alignNodes', 'distributeNodes', 'wrapElements', 'justifyHorizontally', 'justifyVertically'];
        this._origLayoutMethods = {};

        for (const name of methods) {
            if (typeof this.board[name] !== 'function') continue;
            this._origLayoutMethods[name] = this.board[name].bind(this.board);
            this.board[name] = function (...args) {
                self._origLayoutMethods[name](...args);
                self.edgeManager.renderAll();
            };
        }
    }

    _unhookLayoutMethods() {
        if (!this._origLayoutMethods) return;
        for (const [name, fn] of Object.entries(this._origLayoutMethods)) {
            this.board[name] = fn;
        }
        this._origLayoutMethods = null;
    }

    // ─── Coordinate helper ───

    _screenToWorld(screenX, screenY) {
        const rect = this.board.container.getBoundingClientRect();
        return {
            x: (screenX - rect.left - this.board.panX) / this.board.scale,
            y: (screenY - rect.top - this.board.panY) / this.board.scale
        };
    }
}

export { GraphNode } from './graph-node.js';
export { GraphEdge } from './graph-edge.js';
export { EdgeManager } from './edge-manager.js';
export { PathMethods } from './path-methods.js';
