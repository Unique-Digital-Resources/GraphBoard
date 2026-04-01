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

        this.data = options.data || {};

        this._pathD = '';
        this._sourcePos = null;
        this._targetPos = null;
        this._hovered = false;
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
    }

    /**
     * Update the edge path and visual properties.
     * @param {string} pathD - SVG path `d` attribute
     * @param {object} endpoints - { sx, sy, tx, ty }
     * @param {SVGDefsElement} defs - The <defs> element for gradients
     * @param {string} svgNS
     * @param {object} [outlineOpts] - { focusColor, selectionColor }
     */
    update(pathD, endpoints, defs, svgNS, outlineOpts = {}) {
        this._pathD = pathD;
        this._sourcePos = { x: endpoints.sx, y: endpoints.sy };
        this._targetPos = { x: endpoints.tx, y: endpoints.ty };

        const outlineW = this.strokeWidth + OUTLINE_EXTRA;

        // Hit path
        if (this._hitPath) {
            this._hitPath.setAttribute('d', pathD);
        }

        // Focus outline
        if (this._focusOutlinePath) {
            this._focusOutlinePath.setAttribute('d', pathD);
            this._focusOutlinePath.setAttribute('stroke', outlineOpts.focusColor || '#e09f3e');
            this._focusOutlinePath.setAttribute('stroke-width', outlineW);
            this._focusOutlinePath.style.display = this._hovered ? '' : 'none';
        }

        // Selection outline
        if (this._selOutlinePath) {
            this._selOutlinePath.setAttribute('d', pathD);
            this._selOutlinePath.setAttribute('stroke', outlineOpts.selectionColor || '#ff6b6b');
            this._selOutlinePath.setAttribute('stroke-width', outlineW);
            this._selOutlinePath.style.display = this.selected ? '' : 'none';
        }

        // Visible path
        if (this._visPath) {
            this._visPath.setAttribute('d', pathD);
            this._visPath.setAttribute('stroke-width', this.strokeWidth);

            // Stroke color: gradient or solid
            if (this.colors.length >= 2 && defs && svgNS) {
                this._updateGradient(endpoints, defs, svgNS);
                this._visPath.setAttribute('stroke', `url(#ge-grad-${this.id})`);
            } else {
                this._removeGradient(defs);
                this._visPath.setAttribute('stroke', this.colors[0] || '#e09f3e');
            }

            // Dashed style
            if (this.strokeStyle === 'dashed') {
                const gap = Math.max(this.strokeWidth * 2.5, 10);
                this._visPath.setAttribute('stroke-dasharray', `0.1 ${gap}`);
            } else {
                this._visPath.removeAttribute('stroke-dasharray');
            }

            // Animation class
            this._visPath.className.baseVal = 'ge-vis';
            if (this.animation && this.animation !== 'none') {
                this._visPath.classList.add('ge-anim-' + this.animation);
            }
        }
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
        super.destroy();
    }
}
