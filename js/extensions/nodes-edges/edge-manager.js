import { GraphEdge } from './graph-edge.js';
import { PathMethods } from './path-methods.js';

export class EdgeManager {
    constructor(board, options = {}) {
        this.board = board;
        this.edges = [];
        this._nextEdgeId = 1;
        this._selectedEdgeId = null;

        this._edgeLayer = null;
        this._previewLine = null;
        this._connectState = null;

        this.focusOutlineColor = options.focusOutlineColor || '#e09f3e';
        this.selectionOutlineColor = options.selectionOutlineColor || '#ff6b6b';

        this._onEdgeSelect = options.onEdgeSelect || null;
        this._onEdgeDeselect = options.onEdgeDeselect || null;
        this._onEdgeCreate = options.onEdgeCreate || null;
        this._onEdgeDelete = options.onEdgeDelete || null;
    }

    init() {
        const svgNS = this.board.svgNS;

        this._edgeLayer = document.createElementNS(svgNS, 'g');
        this._edgeLayer.setAttribute('class', 'edge-layer');
        this.board.contentLayer.insertBefore(this._edgeLayer, this.board.contentLayer.firstChild);

        this._previewLine = document.createElementNS(svgNS, 'line');
        this._previewLine.setAttribute('stroke', 'rgba(224,159,62,0.5)');
        this._previewLine.setAttribute('stroke-width', '2');
        this._previewLine.setAttribute('stroke-dasharray', '6 4');
        this._previewLine.style.display = 'none';
        this._previewLine.setAttribute('class', 'ge-connect-preview');
        this._edgeLayer.appendChild(this._previewLine);
    }

    getEdgeLayer() {
        return this._edgeLayer;
    }

    // ─── Outline colors ───

    setFocusOutlineColor(color) {
        this.focusOutlineColor = color;
        this.renderAll();
    }

    setSelectionOutlineColor(color) {
        this.selectionOutlineColor = color;
        this.renderAll();
    }

    // ─── Edge CRUD ───

    addEdge(sourceId, targetId, sourceDir, targetDir, props = {}) {
        if (sourceId === targetId) return null;
        if (this.edges.find(e => e.sourceId === sourceId && e.targetId === targetId)) return null;

        const edge = new GraphEdge({
            id: `edge-${this._nextEdgeId++}`,
            sourceId,
            targetId,
            sourceDir,
            targetDir,
            colors: props.colors,
            strokeStyle: props.strokeStyle,
            method: props.method,
            strokeWidth: props.strokeWidth,
            animation: props.animation,
            data: props.data
        });

        const dom = edge.createDOM(this.board.svgNS);
        this._edgeLayer.appendChild(dom);
        this._setupEdgeEvents(edge);
        this.edges.push(edge);
        this.renderEdge(edge);

        if (this._onEdgeCreate) this._onEdgeCreate(edge);
        return edge;
    }

    removeEdge(edgeId) {
        const idx = this.edges.findIndex(e => e.id === edgeId);
        if (idx === -1) return;
        const edge = this.edges[idx];
        edge.destroy(this.board.defs);
        this.edges.splice(idx, 1);
        if (this._selectedEdgeId === edgeId) {
            this._selectedEdgeId = null;
            if (this._onEdgeDeselect) this._onEdgeDeselect(edge);
        }
        if (this._onEdgeDelete) this._onEdgeDelete(edge);
    }

    getEdge(edgeId) {
        return this.edges.find(e => e.id === edgeId);
    }

    getEdgesForNode(nodeId) {
        return this.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId);
    }

    // ─── Selection ───

    selectEdge(edgeId) {
        this.deselectAll();
        this._selectedEdgeId = edgeId;
        const edge = this.getEdge(edgeId);
        if (edge) {
            edge.setSelected(true);
            if (this._onEdgeSelect) this._onEdgeSelect(edge);
        }
    }

    deselectAll() {
        if (this._selectedEdgeId) {
            const edge = this.getEdge(this._selectedEdgeId);
            if (edge) edge.setSelected(false);
            this._selectedEdgeId = null;
            if (this._onEdgeDeselect && edge) this._onEdgeDeselect(edge);
        }
    }

    getSelectedEdge() {
        return this._selectedEdgeId ? this.getEdge(this._selectedEdgeId) : null;
    }

    // ─── Rendering ───

    renderAll() {
        for (const edge of this.edges) {
            this.renderEdge(edge);
        }
    }

    renderEdge(edge) {
        const sourceNode = this.board.elements.find(e => e.id === edge.sourceId);
        const targetNode = this.board.elements.find(e => e.id === edge.targetId);
        if (!sourceNode || !targetNode) return;

        const sp = sourceNode.getPortWorldPos(edge.sourceDir);
        const tp = targetNode.getPortWorldPos(edge.targetDir);

        let astarOpts = null;
        if (edge.method === 'astar') {
            astarOpts = this._buildAStarGrid(new Set([edge.sourceId, edge.targetId]));
            // Convert world coords to screen coords for A* grid search
            const scale = this.board.scale;
            const panX = this.board.panX;
            const panY = this.board.panY;
            astarOpts.srcScreen = { x: sp.x * scale + panX, y: sp.y * scale + panY };
            astarOpts.tgtScreen = { x: tp.x * scale + panX, y: tp.y * scale + panY };
            // Inverse conversion: screen → world
            astarOpts.invScale = 1 / scale;
            astarOpts.invPanX = -panX / scale;
            astarOpts.invPanY = -panY / scale;
        }

        const pathD = PathMethods.compute(
            edge.method, sp.x, sp.y, tp.x, tp.y,
            edge.sourceDir, edge.targetDir, astarOpts
        );

        edge.update(
            pathD,
            { sx: sp.x, sy: sp.y, tx: tp.x, ty: tp.y },
            this.board.defs,
            this.board.svgNS,
            { focusColor: this.focusOutlineColor, selectionColor: this.selectionOutlineColor }
        );
    }

    _buildAStarGrid(excludeIds) {
        const CELL = 14, PAD = 22;
        const container = this.board.container;
        const vw = container.clientWidth, vh = container.clientHeight;
        const W = Math.ceil(vw / CELL), H = Math.ceil(vh / CELL);
        if (W <= 0 || H <= 0) return {};

        const scale = this.board.scale;
        const panX = this.board.panX;
        const panY = this.board.panY;

        const blocked = new Uint8Array(W * H);
        this.board.elements.forEach(n => {
            if (!n.getPortWorldPos || (excludeIds && excludeIds.has(n.id))) return;
            const b = n.getBounds();
            // Convert world bounds to screen bounds
            const sl = b.left * scale + panX;
            const sr = b.right * scale + panX;
            const st = b.top * scale + panY;
            const sb = b.bottom * scale + panY;
            const x1 = Math.max(0, Math.floor((sl - PAD) / CELL));
            const y1 = Math.max(0, Math.floor((st - PAD) / CELL));
            const x2 = Math.min(W - 1, Math.ceil((sr + PAD) / CELL));
            const y2 = Math.min(H - 1, Math.ceil((sb + PAD) / CELL));
            for (let y = y1; y <= y2; y++)
                for (let x = x1; x <= x2; x++)
                    blocked[y * W + x] = 1;
        });

        return { blockedCells: blocked, gridW: W, gridH: H, cellSize: CELL };
    }

    // ─── Connection Drag Interaction ───

    startConnect(nodeId, dir, worldX, worldY) {
        this._connectState = { nodeId, dir, startX: worldX, startY: worldY };
        this._previewLine.style.display = 'block';
        this._previewLine.setAttribute('x1', worldX);
        this._previewLine.setAttribute('y1', worldY);
        this._previewLine.setAttribute('x2', worldX);
        this._previewLine.setAttribute('y2', worldY);
    }

    updateConnect(worldX, worldY) {
        if (!this._connectState) return;
        this._previewLine.setAttribute('x2', worldX);
        this._previewLine.setAttribute('y2', worldY);
    }

    endConnect(targetNodeId, targetDir) {
        if (!this._connectState) return null;
        this._previewLine.style.display = 'none';
        const state = this._connectState;
        this._connectState = null;

        if (!targetNodeId || targetNodeId === state.nodeId) return null;

        const edge = this.addEdge(state.nodeId, targetNodeId, state.dir, targetDir);
        return edge;
    }

    cancelConnect() {
        if (!this._connectState) return;
        this._connectState = null;
        this._previewLine.style.display = 'none';
    }

    get connectState() {
        return this._connectState;
    }

    // ─── Events ───

    _setupEdgeEvents(edge) {
        if (!edge._hitPath) return;
        edge._hitPath.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectEdge(edge.id);
        });
        edge._hitPath.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectEdge(edge.id);
        });
        edge._hitPath.addEventListener('mouseenter', () => {
            edge.setHovered(true);
        });
        edge._hitPath.addEventListener('mouseleave', () => {
            edge.setHovered(false);
        });
    }

    // ─── Edge Property Updates ───

    setEdgeStyle(edgeId, strokeStyle) {
        const edge = this.getEdge(edgeId);
        if (!edge) return;
        edge.strokeStyle = strokeStyle;
        this.renderEdge(edge);
    }

    setEdgeMethod(edgeId, method) {
        const edge = this.getEdge(edgeId);
        if (!edge) return;
        edge.method = method;
        this.renderEdge(edge);
    }

    setEdgeAnimation(edgeId, animation) {
        const edge = this.getEdge(edgeId);
        if (!edge) return;
        edge.animation = animation;
        this.renderEdge(edge);
    }

    setEdgeWidth(edgeId, width) {
        const edge = this.getEdge(edgeId);
        if (!edge) return;
        edge.strokeWidth = width;
        this.renderEdge(edge);
    }

    setEdgeColors(edgeId, colors) {
        const edge = this.getEdge(edgeId);
        if (!edge) return;
        edge.colors = [...colors];
        this.renderEdge(edge);
    }

    // ─── Cleanup ───

    destroy() {
        for (const edge of [...this.edges]) {
            edge.destroy(this.board.defs);
        }
        this.edges = [];
        if (this._edgeLayer) this._edgeLayer.remove();
    }
}
