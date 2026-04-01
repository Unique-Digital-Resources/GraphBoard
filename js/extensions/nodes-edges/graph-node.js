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
            const circle = document.createElementNS(svgNS, 'circle');
            const pos = positions[dir];
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', r);
            circle.setAttribute('class', `gn-port gn-port-${dir}`);
            circle.dataset.portDir = dir;
            circle.dataset.nodeId = this.id;
            circle.dataset.baseR = r;

            circle.addEventListener('mouseenter', () => {
                circle.setAttribute('r', r * 1.5);
            });
            circle.addEventListener('mouseleave', () => {
                circle.setAttribute('r', r);
            });

            this.el.appendChild(circle);
            this.ports[dir] = circle;
        }
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
            const circle = this.ports[dir];
            if (circle) {
                const pos = positions[dir];
                circle.setAttribute('cx', pos.x);
                circle.setAttribute('cy', pos.y);
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
