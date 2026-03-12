export class RulersManager {
    constructor(graphBoard, options = {}) {
        this.graphBoard = graphBoard;
        this.size      = options.size      || 24;
        this.visible   = options.showRulers !== false;
        this.majorGrid = options.majorGrid || 100;
        this.subGrid   = options.subGrid   || 20;

        this.hCanvas   = null;
        this.vCanvas   = null;
        this.cornerDiv = null;
        this._dpr      = window.devicePixelRatio || 1;
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────

    init() {
        const container = this.graphBoard.container;
        const s = this.size;

        // Corner square sits at (0,0) above both rulers
        this.cornerDiv = document.createElement('div');
        Object.assign(this.cornerDiv.style, {
            position:     'absolute',
            top:          '0',
            left:         '0',
            width:        s + 'px',
            height:       s + 'px',
            background:   '#111',
            borderRight:  '1px solid #2a2a2a',
            borderBottom: '1px solid #2a2a2a',
            zIndex:       '51',
            pointerEvents:'none',
            display:      this.visible ? '' : 'none'
        });
        container.appendChild(this.cornerDiv);

        // Horizontal ruler – full container width, top-aligned
        this.hCanvas = this._makeCanvas('ruler-h', {
            position: 'absolute', top: '0', left: '0',
            height: s + 'px', width: '100%', zIndex: '49', pointerEvents: 'none',
            display: this.visible ? '' : 'none'
        });
        container.appendChild(this.hCanvas);

        // Vertical ruler – full container height, left-aligned
        this.vCanvas = this._makeCanvas('ruler-v', {
            position: 'absolute', top: '0', left: '0',
            width: s + 'px', height: '100%', zIndex: '49', pointerEvents: 'none',
            display: this.visible ? '' : 'none'
        });
        container.appendChild(this.vCanvas);

        window.addEventListener('resize', () => { this._resize(); this.render(); });
        this._resize();
        this.render();
    }

    _makeCanvas(className, styles) {
        const c = document.createElement('canvas');
        c.className = 'ruler-canvas ' + className;
        Object.assign(c.style, styles);
        return c;
    }

    _resize() {
        const container = this.graphBoard.container;
        const dpr = this._dpr;
        const cw  = container.clientWidth;
        const ch  = container.clientHeight;

        this.hCanvas.width  = cw * dpr;
        this.hCanvas.height = this.size * dpr;
        this.hCanvas.style.width  = cw   + 'px';
        this.hCanvas.style.height = this.size + 'px';

        this.vCanvas.width  = this.size * dpr;
        this.vCanvas.height = ch * dpr;
        this.vCanvas.style.width  = this.size + 'px';
        this.vCanvas.style.height = ch + 'px';
    }

    // ── Public API ───────────────────────────────────────────────────────────

    render() {
        if (!this.visible) return;
        this._drawH();
        this._drawV();
    }

    toggleRulers(show) {
        this.visible = show;
        const d = show ? '' : 'none';
        this.hCanvas.style.display   = d;
        this.vCanvas.style.display   = d;
        this.cornerDiv.style.display = d;
        if (show) this.render();
    }

    setMajorGrid(size) { this.majorGrid = size; this.render(); }
    setSubGrid(size)   { this.subGrid   = size; this.render(); }

    // ── Drawing helpers ──────────────────────────────────────────────────────

    /**
     * Find a display interval that keeps major ticks ~50–180 px apart.
     * Steps: 1, 2, 5 × 10^n of baseGrid.
     */
    _computeInterval(scale) {
        const minPx = 52;
        const maxPx = 180;
        const base  = this.majorGrid;
        const mults = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

        for (const m of mults) {
            const candidate = base * m;
            if (candidate * scale >= minPx) {
                // check it's not too wide
                if (candidate * scale <= maxPx || m === mults[mults.length - 1]) {
                    return candidate;
                }
            }
        }
        return base;
    }

    _subDivisions(majorInterval) {
        // How many sub-divisions fit cleanly
        const ratio = majorInterval / this.subGrid;
        // Use 1, 2, 4, 5, 10 divisions
        for (const d of [10, 5, 4, 2, 1]) {
            if (Number.isInteger(ratio / d) || Math.abs((ratio % d)) < 0.01) return d;
        }
        return Math.round(ratio);
    }

    _formatNum(n) {
        const r = Math.round(n);
        if (Math.abs(r) >= 10000)  return (r / 1000).toFixed(0) + 'k';
        if (Math.abs(r) >= 1000)   return (r / 1000).toFixed(1) + 'k';
        return r.toString();
    }

    _drawH() {
        const canvas = this.hCanvas;
        const ctx    = canvas.getContext('2d');
        const dpr    = this._dpr;
        const W = canvas.width, H = canvas.height;
        const rulerPx = this.size * dpr;  // width of vertical ruler in canvas pixels

        const { panX, scale } = this.graphBoard;

        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);

        // Bottom edge line
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, H - dpr, W, dpr);

        const majorInterval = this._computeInterval(scale);
        const subDivs       = this._subDivisions(majorInterval);
        const subInterval   = majorInterval / subDivs;

        // World → canvas-x  (canvas pixel, DPR-scaled)
        const toCanvasX = (wx) => (wx * scale + panX) * dpr;

        const worldLeft  = (rulerPx / dpr - panX) / scale;  // world coord at left edge of ruler area
        const worldRight = (W / dpr - panX) / scale;

        // ── Sub-grid ticks ────────────────────────────────────────────────────
        const subPxSpacing = subInterval * scale * dpr;
        if (subPxSpacing >= 4 * dpr) {
            const startSub = Math.floor(worldLeft / subInterval) * subInterval;
            ctx.strokeStyle = '#252525';
            ctx.lineWidth   = dpr;
            ctx.beginPath();
            for (let x = startSub; x <= worldRight + subInterval; x += subInterval) {
                const px = toCanvasX(x);
                if (px < rulerPx || px > W) continue;
                ctx.moveTo(px + 0.5, H);
                ctx.lineTo(px + 0.5, H * 0.5);
            }
            ctx.stroke();
        }

        // ── Major ticks ───────────────────────────────────────────────────────
        const startMajor = Math.floor(worldLeft / majorInterval) * majorInterval;

        ctx.strokeStyle = '#3c3c3c';
        ctx.lineWidth   = dpr;
        ctx.beginPath();
        for (let x = startMajor; x <= worldRight + majorInterval; x += majorInterval) {
            const px = toCanvasX(x);
            if (px < rulerPx || px > W + dpr) continue;
            ctx.moveTo(px + 0.5, H);
            ctx.lineTo(px + 0.5, 0);
        }
        ctx.stroke();

        // ── Labels ────────────────────────────────────────────────────────────
        ctx.fillStyle    = '#5a5a5a';
        ctx.font         = `${Math.round(8.5 * dpr)}px "JetBrains Mono","Fira Code","Courier New",monospace`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'top';

        for (let x = startMajor; x <= worldRight + majorInterval; x += majorInterval) {
            const px = toCanvasX(x);
            if (px < rulerPx || px > W) continue;
            ctx.fillText(this._formatNum(x), px + 3 * dpr, 3 * dpr);
        }

        // ── Origin crosshair dot ──────────────────────────────────────────────
        const originPx = toCanvasX(0);
        if (originPx >= rulerPx && originPx <= W) {
            ctx.fillStyle = '#7b6cd9';
            ctx.beginPath();
            ctx.arc(originPx, H / 2, 2.5 * dpr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawV() {
        const canvas = this.vCanvas;
        const ctx    = canvas.getContext('2d');
        const dpr    = this._dpr;
        const W = canvas.width, H = canvas.height;
        const rulerPx = this.size * dpr; // height of horizontal ruler

        const { panY, scale } = this.graphBoard;

        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);

        // Right edge line
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(W - dpr, 0, dpr, H);

        const majorInterval = this._computeInterval(scale);
        const subDivs       = this._subDivisions(majorInterval);
        const subInterval   = majorInterval / subDivs;

        const toCanvasY = (wy) => (wy * scale + panY) * dpr;

        const worldTop    = (rulerPx / dpr - panY) / scale;
        const worldBottom = (H / dpr - panY) / scale;

        // ── Sub-grid ticks ────────────────────────────────────────────────────
        const subPxSpacing = subInterval * scale * dpr;
        if (subPxSpacing >= 4 * dpr) {
            const startSub = Math.floor(worldTop / subInterval) * subInterval;
            ctx.strokeStyle = '#252525';
            ctx.lineWidth   = dpr;
            ctx.beginPath();
            for (let y = startSub; y <= worldBottom + subInterval; y += subInterval) {
                const py = toCanvasY(y);
                if (py < rulerPx || py > H) continue;
                ctx.moveTo(W, py + 0.5);
                ctx.lineTo(W * 0.5, py + 0.5);
            }
            ctx.stroke();
        }

        // ── Major ticks ───────────────────────────────────────────────────────
        const startMajor = Math.floor(worldTop / majorInterval) * majorInterval;

        ctx.strokeStyle = '#3c3c3c';
        ctx.lineWidth   = dpr;
        ctx.beginPath();
        for (let y = startMajor; y <= worldBottom + majorInterval; y += majorInterval) {
            const py = toCanvasY(y);
            if (py < rulerPx || py > H + dpr) continue;
            ctx.moveTo(0, py + 0.5);
            ctx.lineTo(W, py + 0.5);
        }
        ctx.stroke();

        // ── Labels (rotated) ─────────────────────────────────────────────────
        ctx.fillStyle    = '#5a5a5a';
        ctx.font         = `${Math.round(8.5 * dpr)}px "JetBrains Mono","Fira Code","Courier New",monospace`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';

        for (let y = startMajor; y <= worldBottom + majorInterval; y += majorInterval) {
            const py = toCanvasY(y);
            if (py < rulerPx || py > H) continue;
            ctx.save();
            ctx.translate(W / 2 - 1 * dpr, py - 4 * dpr);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(this._formatNum(y), 0, 0);
            ctx.restore();
        }

        // ── Origin crosshair dot ──────────────────────────────────────────────
        const originPy = toCanvasY(0);
        if (originPy >= rulerPx && originPy <= H) {
            ctx.fillStyle = '#7b6cd9';
            ctx.beginPath();
            ctx.arc(W / 2, originPy, 2.5 * dpr, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
