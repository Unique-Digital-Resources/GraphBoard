export class GraphElement {
    constructor(options = {}) {
        this.id = options.id || `element-${Math.random().toString(36).substr(2, 9)}`;
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 100;
        this.height = options.height || 50;
        this.type = options.type || 'element';
        this.el = null;
        this.minimapDot = null;
        this.selected = false;
        this.data = options.data || {};
    }

    createDOM(svgNS) {
        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", `graph-element ${this.type}`);
        g.setAttribute("transform", `translate(${this.x}, ${this.y})`);
        g.setAttribute("data-id", this.id);
        this.el = g;
        this.render(svgNS);
        return g;
    }

    render(svgNS) {
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
        if (this.el) {
            this.el.setAttribute("transform", `translate(${this.x}, ${this.y})`);
        }
    }

    setSelected(isSelected) {
        this.selected = isSelected;
        if (this.el) {
            if (isSelected) {
                this.el.classList.add('selected');
            } else {
                this.el.classList.remove('selected');
            }
        }
    }

    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2,
            centerX: this.x,
            centerY: this.y
        };
    }

    destroy() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        if (this.minimapDot && this.minimapDot.parentNode) {
            this.minimapDot.parentNode.removeChild(this.minimapDot);
        }
    }
}
