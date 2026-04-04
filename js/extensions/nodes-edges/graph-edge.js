import { GraphElement } from '../../element.js';

const OUTLINE_EXTRA = 6;

export class GraphEdge extends GraphElement {
    constructor(options = {}) {
        super({
            id: options.id,
            type: options.type || 'graph-edge'
        });
        this.sourceId = options.sourceId;
        this.targetId = options.targetId;
        this.sourceDir = options.sourceDir || 'right';
        this.targetDir = options.targetDir || 'left';

        this.colors = options.colors || ['#e09f3e'];
        this.strokeStyle = options.strokeStyle || 'solid';
        this.method = options.method || 'default';
        this.strokeWidth = options.strokeWidth || 3;
        this.animation = options.animation || 'none';

        this.label = options.label || '';
        this.labelBgColor = options.labelBgColor || '#1e1e1e';
        this.labelTextColor = options.labelTextColor || '#e0e0e0';
        this.labelFontSize = options.labelFontSize || 12;
        this.labelPaddingX = options.labelPaddingX !== undefined ? options.labelPaddingX : 8;
        this.labelPaddingY = options.labelPaddingY !== undefined ? options.labelPaddingY : 4;
        this.labelBgStroke = options.labelBgStroke || 'rgba(255,255,255,0.12)';
        this.labelBgStrokeWidth = options.labelBgStrokeWidth || 1;
        this.labelBgRadius = options.labelBgRadius || 4;

        this.sourceSlotStyle = options.sourceSlotStyle || 'circle';
        this.sourceSlotColor = options.sourceSlotColor || '#e09f3e';
        this.targetSlotStyle = options.targetSlotStyle || 'circle';
        this.targetSlotColor = options.targetSlotColor || '#e09f3e';

        this.data = options.data || {};

        this._pathD = '';
        this._sourcePos = null;
        this._targetPos = null;
        this._hovered = false;
        this._editingLabel = false;

        this._labelMidX = 0;
        this._labelMidY = 0;
    }

    /**
     * Override parent createDOM to avoid the 'graph-element' class.
     * That class causes .graph-element rect { … } from main.css to
     * bleed into the label background, making it look like a node.
     */
    createDOM(svgNS) {
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('class', 'graph-edge');
        g.setAttribute('data-id', this.id);
        this.el = g;
        this.render(svgNS);
        return g;
    }

    render(svgNS) {
        this._hitPath = document.createElementNS(svgNS, 'path');
        this._hitPath.setAttribute('stroke', 'transparent');
        this._hitPath.setAttribute('stroke-width', '20');
        this._hitPath.setAttribute('fill', 'none');
        this._hitPath.setAttribute('class', 'ge-hit');
        this._hitPath.dataset.edgeId = this.id;
        this.el.appendChild(this._hitPath);

        this._focusOutlinePath = document.createElementNS(svgNS, 'path');
        this._focusOutlinePath.setAttribute('fill', 'none');
        this._focusOutlinePath.setAttribute('stroke-linecap', 'round');
        this._focusOutlinePath.setAttribute('stroke-linejoin', 'round');
        this._focusOutlinePath.setAttribute('class', 'ge-outline-focus');
        this._focusOutlinePath.style.display = 'none';
        this.el.appendChild(this._focusOutlinePath);

        this._selOutlinePath = document.createElementNS(svgNS, 'path');
        this._selOutlinePath.setAttribute('fill', 'none');
        this._selOutlinePath.setAttribute('stroke-linecap', 'round');
        this._selOutlinePath.setAttribute('stroke-linejoin', 'round');
        this._selOutlinePath.setAttribute('class', 'ge-outline-sel');
        this._selOutlinePath.style.display = 'none';
        this.el.appendChild(this._selOutlinePath);

        this._visPath = document.createElementNS(svgNS, 'path');
        this._visPath.setAttribute('fill', 'none');
        this._visPath.setAttribute('stroke-linecap', 'round');
        this._visPath.setAttribute('stroke-linejoin', 'round');
        this._visPath.setAttribute('class', 'ge-vis');
        this.el.appendChild(this._visPath);

        this._labelBg = document.createElementNS(svgNS, 'rect');
        this._labelBg.setAttribute('class', 'ge-label-bg');
        this._labelBg.style.display = 'none';
        this.el.appendChild(this._labelBg);

        this._labelText = document.createElementNS(svgNS, 'text');
        this._labelText.setAttribute('class', 'ge-label');
        this._labelText.setAttribute('text-anchor', 'middle');
        this._labelText.setAttribute('dominant-baseline', 'central');
        this._labelText.style.display = 'none';
        this.el.appendChild(this._labelText);

        this._sourceSlot = document.createElementNS(svgNS, 'g');
        this._sourceSlot.setAttribute('class', 'ge-slot ge-slot-source');
        this._sourceSlot.dataset.edgeId = this.id;
        this._sourceSlot.style.display = 'none';

        this._targetSlot = document.createElementNS(svgNS, 'g');
        this._targetSlot.setAttribute('class', 'ge-slot ge-slot-target');
        this._targetSlot.dataset.edgeId = this.id;
        this._targetSlot.style.display = 'none';
    }

    attachSlots(slotLayer) {
        if (this._sourceSlot && !this._sourceSlot.parentNode) {
            slotLayer.appendChild(this._sourceSlot);
        }
        if (this._targetSlot && !this._targetSlot.parentNode) {
            slotLayer.appendChild(this._targetSlot);
        }
    }

    update(pathD, endpoints, defs, svgNS, outlineOpts = {}) {
        this._pathD = pathD;
        this._sourcePos = { x: endpoints.sx, y: endpoints.sy };
        this._targetPos = { x: endpoints.tx, y: endpoints.ty };

        const outlineW = this.strokeWidth + OUTLINE_EXTRA;

        if (this._hitPath) {
            this._hitPath.setAttribute('d', pathD);
        }

        if (this._focusOutlinePath) {
            this._focusOutlinePath.setAttribute('d', pathD);
            this._focusOutlinePath.setAttribute('stroke', outlineOpts.focusColor || '#e09f3e');
            this._focusOutlinePath.setAttribute('stroke-width', outlineW);
            this._focusOutlinePath.style.display = this._hovered ? '' : 'none';
        }

        if (this._selOutlinePath) {
            this._selOutlinePath.setAttribute('d', pathD);
            this._selOutlinePath.setAttribute('stroke', outlineOpts.selectionColor || '#ff6b6b');
            this._selOutlinePath.setAttribute('stroke-width', outlineW);
            this._selOutlinePath.style.display = this.selected ? '' : 'none';
        }

        if (this._visPath) {
            this._visPath.setAttribute('d', pathD);
            this._visPath.setAttribute('stroke-width', this.strokeWidth);

            if (this.colors.length >= 2 && defs && svgNS) {
                this._updateGradient(endpoints, defs, svgNS);
                this._visPath.setAttribute('stroke', `url(#ge-grad-${this.id})`);
            } else {
                this._removeGradient(defs);
                this._visPath.setAttribute('stroke', this.colors[0] || '#e09f3e');
            }

            if (this.strokeStyle === 'dashed') {
                const gap = Math.max(this.strokeWidth * 2.5, 10);
                this._visPath.setAttribute('stroke-dasharray', `0.1 ${gap}`);
            } else {
                this._visPath.removeAttribute('stroke-dasharray');
            }

            this._visPath.className.baseVal = 'ge-vis';
            if (this.animation && this.animation !== 'none') {
                this._visPath.classList.add('ge-anim-' + this.animation);
            }
        }

        this._updateLabel(svgNS);
        this._updateSlotMarkers(svgNS);
    }

    /**
     * Render the label background and text.
     *
     * ALL visual properties are set as SVG attributes here.
     * The CSS file must NOT declare fill / stroke / font-size on
     * .ge-label-bg or .ge-label — CSS properties always override
     * SVG presentation attributes, which would break any call to
     * setEdgeLabelBgColor / setEdgeLabelTextColor / etc.
     */
    _updateLabel(svgNS) {
        if (!this._labelText || !this._labelBg) return;

        // Don't touch the SVG while the HTML input overlay is active
        if (this._editingLabel) return;

        if (!this.label) {
            this._labelText.style.display = 'none';
            this._labelBg.style.display = 'none';
            return;
        }

        // Compute midpoint along the path for label placement
        let midX = (this._sourcePos.x + this._targetPos.x) / 2;
        let midY = (this._sourcePos.y + this._targetPos.y) / 2;

        if (this._visPath && this._visPath.getTotalLength) {
            try {
                const len = this._visPath.getTotalLength();
                const pt = this._visPath.getPointAtLength(len / 2);
                midX = pt.x;
                midY = pt.y;
            } catch (e) { /* fall back to simple midpoint */ }
        }

        // Cache for EdgeManager._startLabelEdit
        this._labelMidX = midX;
        this._labelMidY = midY;

        // ─── Text ─────────────────────────────────────────────
        this._labelText.textContent = this.label;
        this._labelText.setAttribute('x', midX);
        this._labelText.setAttribute('y', midY);
        this._labelText.setAttribute('fill', this.labelTextColor);
        this._labelText.setAttribute('font-size', this.labelFontSize);
        // Paint-order stroke: matches the bg colour so the path line
        // behind the text is hidden, guaranteeing readability.
        this._labelText.setAttribute('paint-order', 'stroke');
        this._labelText.setAttribute('stroke', this.labelBgColor);
        this._labelText.setAttribute('stroke-width', '4');
        this._labelText.setAttribute('stroke-linecap', 'round');
        this._labelText.setAttribute('stroke-linejoin', 'round');
        this._labelText.style.display = '';

        // ─── Background rect ──────────────────────────────────
        let textWidth = 0;
        let textHeight = this.labelFontSize * 1.25;
        if (this._labelText.getBBox) {
            try {
                const bbox = this._labelText.getBBox();
                textWidth = bbox.width;
                textHeight = Math.max(bbox.height, this.labelFontSize * 1.15);
            } catch (e) {
                textWidth = this.label.length * this.labelFontSize * 0.6;
            }
        } else {
            textWidth = this.label.length * this.labelFontSize * 0.6;
        }

        const padX = this.labelPaddingX;
        const padY = this.labelPaddingY;
        const r = this.labelBgRadius;

        this._labelBg.setAttribute('x', midX - textWidth / 2 - padX);
        this._labelBg.setAttribute('y', midY - textHeight / 2 - padY);
        this._labelBg.setAttribute('width', textWidth + padX * 2);
        this._labelBg.setAttribute('height', textHeight + padY * 2);
        this._labelBg.setAttribute('rx', r);
        this._labelBg.setAttribute('ry', r);
        this._labelBg.setAttribute('fill', this.labelBgColor);
        this._labelBg.setAttribute('stroke', this.labelBgStroke);
        this._labelBg.setAttribute('stroke-width', this.labelBgStrokeWidth);
        this._labelBg.style.display = '';
    }

    _updateSlotMarkers(svgNS) {
        if (!this._sourcePos || !this._targetPos) return;

        const srcColor = this.sourceSlotColor || this.colors[0] || '#e09f3e';
        const tgtColor = this.targetSlotColor || this.colors[0] || '#e09f3e';
        const r = Math.max(this.strokeWidth + 2, 6);

        if (this._sourceSlot) {
            this._sourceSlot.innerHTML = '';
            if (this.sourceSlotStyle === 'none') {
                this._sourceSlot.style.display = 'none';
            } else {
                const sourceShape = this._createSlotShape(svgNS, this.sourceSlotStyle, r, srcColor);
                const angle = this._getSlotRotation(this.sourceSlotStyle, this.sourceDir, 'source');
                if (angle !== 0) sourceShape.setAttribute('transform', `rotate(${angle})`);
                this._sourceSlot.appendChild(sourceShape);
                this._sourceSlot.setAttribute('transform', `translate(${this._sourcePos.x}, ${this._sourcePos.y})`);
                this._sourceSlot.style.display = '';
            }
        }

        if (this._targetSlot) {
            this._targetSlot.innerHTML = '';
            if (this.targetSlotStyle === 'none') {
                this._targetSlot.style.display = 'none';
            } else {
                const targetShape = this._createSlotShape(svgNS, this.targetSlotStyle, r, tgtColor);
                const angle = this._getSlotRotation(this.targetSlotStyle, this.targetDir, 'target');
                if (angle !== 0) targetShape.setAttribute('transform', `rotate(${angle})`);
                this._targetSlot.appendChild(targetShape);
                this._targetSlot.setAttribute('transform', `translate(${this._targetPos.x}, ${this._targetPos.y})`);
                this._targetSlot.style.display = '';
            }
        }
    }

    _getSlotRotation(style, dir, endpoint) {
        if (style === 'arrow') {
            const dirAngles = { right: 0, bottom: 90, left: 180, top: 270 };
            let base = dirAngles[dir] || 0;
            if (endpoint === 'target') base = (base + 180) % 360;
            return base;
        }
        if (style === 'bar') {
            if (dir === 'top' || dir === 'bottom') return 0;
            return 90;
        }
        return 0;
    }

    _createSlotShape(svgNS, style, r, color) {
        const g = document.createElementNS(svgNS, 'g');

        switch (style) {
            case 'diamond': {
                const diamond = document.createElementNS(svgNS, 'polygon');
                const s = r * 1.2;
                diamond.setAttribute('points', `0,${-s} ${s},0 0,${s} ${-s},0`);
                diamond.setAttribute('fill', color);
                g.appendChild(diamond);
                break;
            }
            case 'ring': {
                const outer = document.createElementNS(svgNS, 'circle');
                outer.setAttribute('r', r);
                outer.setAttribute('fill', 'none');
                outer.setAttribute('stroke', color);
                outer.setAttribute('stroke-width', Math.max(2, r * 0.35));
                g.appendChild(outer);
                break;
            }
            case 'arrow': {
                const path = document.createElementNS(svgNS, 'path');
                const w = r * 1.4;
                const h = r * 0.8;
                path.setAttribute('d', `M ${w} 0 L ${-h} ${-h} L ${-h * 0.2} 0 L ${-h} ${h} Z`);
                path.setAttribute('fill', color);
                g.appendChild(path);
                break;
            }
            case 'bar': {
                const rect = document.createElementNS(svgNS, 'rect');
                const barW = r * 0.5;
                const barH = r * 2.2;
                rect.setAttribute('x', -barW / 2);
                rect.setAttribute('y', -barH / 2);
                rect.setAttribute('width', barW);
                rect.setAttribute('height', barH);
                rect.setAttribute('rx', 1);
                rect.setAttribute('fill', color);
                g.appendChild(rect);
                break;
            }
            case 'circle': {
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('r', r);
                circle.setAttribute('fill', color);
                g.appendChild(circle);
                break;
            }
            default: {
                const placeholder = document.createElementNS(svgNS, 'circle');
                placeholder.setAttribute('r', 0);
                g.appendChild(placeholder);
                break;
            }
        }

        return g.firstChild;
    }

    setHovered(isHovered) {
        this._hovered = isHovered;
        if (this._focusOutlinePath) {
            this._focusOutlinePath.style.display = isHovered ? '' : 'none';
        }
    }

    setSelected(isSelected) {
        this.selected = isSelected;
        if (this._selOutlinePath) {
            this._selOutlinePath.style.display = isSelected ? '' : 'none';
        }
        // Toggle selection visual on label elements
        const method = isSelected ? 'add' : 'remove';
        if (this._labelBg) this._labelBg.classList[method]('ge-label-selected');
        if (this._labelText) this._labelText.classList[method]('ge-label-selected');
    }

    setLabel(label) {
        this.label = label;
        if (this._visPath && this._visPath.getAttribute('d')) {
            const svgNS = this._visPath.ownerSVGElement
                ? this._visPath.ownerSVGElement.namespaceURI
                : 'http://www.w3.org/2000/svg';
            this._updateLabel(svgNS);
        }
    }

    getSlotOffset(endpoint) {
        const style = endpoint === 'source' ? this.sourceSlotStyle : this.targetSlotStyle;
        const r = Math.max(this.strokeWidth + 2, 6);

        switch (style) {
            case 'none': return 0;
            case 'circle': return r;
            case 'ring': return r + Math.max(2, r * 0.35) / 2;
            case 'diamond': return r * 1.2;
            case 'arrow': return r * 1.4;
            case 'bar': return r * 0.5 / 2;
            default: return 0;
        }
    }

    _updateGradient(endpoints, defs, svgNS) {
        const gradId = `ge-grad-${this.id}`;
        let grad = defs.querySelector(`#${gradId}`);
        if (!grad) {
            grad = document.createElementNS(svgNS, 'linearGradient');
            grad.id = gradId;
            grad.setAttribute('gradientUnits', 'userSpaceOnUse');
            defs.appendChild(grad);
        }
        grad.setAttribute('x1', endpoints.sx);
        grad.setAttribute('y1', endpoints.sy);
        grad.setAttribute('x2', endpoints.tx);
        grad.setAttribute('y2', endpoints.ty);
        grad.innerHTML = '';
        this.colors.forEach((c, i) => {
            const stop = document.createElementNS(svgNS, 'stop');
            stop.setAttribute('offset', `${(i / (this.colors.length - 1)) * 100}%`);
            stop.setAttribute('stop-color', c);
            grad.appendChild(stop);
        });
    }

    _removeGradient(defs) {
        if (!defs) return;
        const gradId = `ge-grad-${this.id}`;
        const existing = defs.querySelector(`#${gradId}`);
        if (existing) existing.remove();
    }

    destroy(defs) {
        this._removeGradient(defs);
        if (this._sourceSlot) this._sourceSlot.remove();
        if (this._targetSlot) this._targetSlot.remove();
        super.destroy();
    }
}