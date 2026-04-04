import { GraphElement } from '../../element.js';

const PORT_DIRS = ['top', 'right', 'bottom', 'left'];

export class GraphNode extends GraphElement {
    constructor(options = {}) {
        super({
            ...options,
            width: options.width || 140,
            height: options.height || 50,
            type: options.type || 'graph-node'
        });
        this.label = options.label || 'Node';
        this.ports = {};
        this._portRadius = options.portRadius || 5;
        this._portConfigs = {};
    }

    render(svgNS) {
        this.rect = document.createElementNS(svgNS, 'rect');
        this.rect.setAttribute('width', this.width);
        this.rect.setAttribute('height', this.height);
        this.rect.setAttribute('x', -this.width / 2);
        this.rect.setAttribute('y', -this.height / 2);
        this.rect.setAttribute('class', 'gn-body');
        this.el.appendChild(this.rect);

        const text = document.createElementNS(svgNS, 'text');
        text.textContent = this.label;
        text.setAttribute('x', 0);
        text.setAttribute('y', 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'gn-label');
        this.el.appendChild(text);
        this._labelEl = text;

        this._createPorts(svgNS);
    }

    _createPorts(svgNS) {
        const r = this._portRadius;
        const positions = this._getPortPositions();

        for (const dir of PORT_DIRS) {
            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('class', `gn-port gn-port-${dir}`);
            g.dataset.portDir = dir;
            g.dataset.nodeId = this.id;
            g.dataset.baseR = r;

            const pos = positions[dir];
            g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

            // Default circle shape
            this._renderPortShape(g, svgNS, 'circle', null, r);

            g.addEventListener('mouseenter', () => {
                const shape = g.querySelector('circle, polygon, path');
                if (shape) {
                    const scale = 1.5;
                    if (shape.tagName === 'circle') {
                        shape.setAttribute('r', r * scale);
                    } else {
                        shape.setAttribute('transform', `scale(${scale})`);
                    }
                }
            });
            g.addEventListener('mouseleave', () => {
                const shape = g.querySelector('circle, polygon, path');
                if (shape) {
                    if (shape.tagName === 'circle') {
                        shape.setAttribute('r', r);
                    } else {
                        shape.removeAttribute('transform');
                    }
                }
            });

            this.el.appendChild(g);
            this.ports[dir] = g;
        }
    }

    _renderPortShape(portG, svgNS, style, color, r) {
        portG.innerHTML = '';
        const fillColor = color || 'var(--gb-accent-color, #7b6cd9)';

        switch (style) {
            case 'diamond': {
                const s = r * 1.2;
                const diamond = document.createElementNS(svgNS, 'polygon');
                diamond.setAttribute('points', `0,${-s} ${s},0 0,${s} ${-s},0`);
                diamond.setAttribute('fill', fillColor);
                diamond.setAttribute('stroke', 'var(--gb-bg-color, #1e1e1e)');
                diamond.setAttribute('stroke-width', '2px');
                portG.appendChild(diamond);
                break;
            }
            case 'ring': {
                const outer = document.createElementNS(svgNS, 'circle');
                outer.setAttribute('r', r);
                outer.setAttribute('fill', 'none');
                outer.setAttribute('stroke', fillColor);
                outer.setAttribute('stroke-width', Math.max(2, r * 0.4));
                portG.appendChild(outer);
                break;
            }
            case 'arrow': {
                const path = document.createElementNS(svgNS, 'path');
                const s = r * 1.3;
                path.setAttribute('d', `M ${s} 0 L ${-s * 0.4} ${-s * 0.6} L ${-s * 0.4} ${s * 0.6} Z`);
                path.setAttribute('fill', fillColor);
                path.setAttribute('stroke', 'var(--gb-bg-color, #1e1e1e)');
                path.setAttribute('stroke-width', '1px');
                portG.appendChild(path);
                break;
            }
            case 'circle':
            default: {
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('r', r);
                circle.setAttribute('fill', fillColor);
                circle.setAttribute('stroke', 'var(--gb-bg-color, #1e1e1e)');
                circle.setAttribute('stroke-width', '2px');
                portG.appendChild(circle);
                break;
            }
        }
    }

    /**
     * Set the visual style for a specific port direction.
     * @param {string} dir - 'top'|'right'|'bottom'|'left'
     * @param {string} style - 'circle'|'diamond'|'ring'|'arrow'
     * @param {string} [color] - CSS color value
     */
    setPortStyle(dir, style, color) {
        if (!PORT_DIRS.includes(dir)) return;
        this._portConfigs[dir] = { style: style || 'circle', color: color || null };
        const portG = this.ports[dir];
        if (portG) {
            const svgNS = portG.ownerSVGElement ? portG.ownerSVGElement.namespaceURI : 'http://www.w3.org/2000/svg';
            this._renderPortShape(portG, svgNS, style, color, this._portRadius);
            // Re-add hover class
            portG.classList.add('gn-port', `gn-port-${dir}`);
        }
    }

    /**
     * Get port config for a direction.
     */
    getPortConfig(dir) {
        return this._portConfigs[dir] || { style: 'circle', color: null };
    }

    _getPortPositions() {
        return {
            top: { x: 0, y: -this.height / 2 },
            right: { x: this.width / 2, y: 0 },
            bottom: { x: 0, y: this.height / 2 },
            left: { x: -this.width / 2, y: 0 }
        };
    }

    /**
     * Get world-space position of a port.
     */
    getPortWorldPos(dir) {
        const local = this._getPortPositions()[dir];
        if (!local) return { x: this.x, y: this.y };
        return { x: this.x + local.x, y: this.y + local.y };
    }

    /**
     * Find the closest port to a world-space point.
     */
    getClosestPort(wx, wy) {
        let best = 'right', bestDist = Infinity;
        for (const dir of PORT_DIRS) {
            const p = this.getPortWorldPos(dir);
            const d = Math.hypot(wx - p.x, wy - p.y);
            if (d < bestDist) { bestDist = d; best = dir; }
        }
        return best;
    }

    /**
     * Find the closest port within a max distance threshold.
     * Returns null if no port is close enough.
     */
    hitTestPort(wx, wy, maxDist = 20) {
        let best = null, bestDist = maxDist;
        for (const dir of PORT_DIRS) {
            const p = this.getPortWorldPos(dir);
            const d = Math.hypot(wx - p.x, wy - p.y);
            if (d < bestDist) { bestDist = d; best = dir; }
        }
        return best;
    }

    updateSize(width, height) {
        super.updateSize(width, height);
        if (this.rect) {
            this.rect.setAttribute('width', this.width);
            this.rect.setAttribute('height', this.height);
            this.rect.setAttribute('x', -this.width / 2);
            this.rect.setAttribute('y', -this.height / 2);
        }
        this._updatePortPositions();
    }

    _updatePortPositions() {
        const positions = this._getPortPositions();
        for (const dir of PORT_DIRS) {
            const g = this.ports[dir];
            if (g) {
                const pos = positions[dir];
                g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            }
        }
    }

    setTitle(label) {
        this.label = label;
        if (this._labelEl) {
            this._labelEl.textContent = label;
        }
    }
}
