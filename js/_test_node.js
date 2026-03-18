import { GraphElement } from './element.js';

export class TestNode extends GraphElement {
    constructor(options = {}) {
        super({
            ...options,
            width: options.width || 160,
            height: options.height || 80,
            type: 'test-node'
        });
        this.title = options.title || 'Node';
    }

    render(svgNS) {
        this.rect = document.createElementNS(svgNS, "rect");
        this.rect.setAttribute("width", this.width);
        this.rect.setAttribute("height", this.height);
        this.rect.setAttribute("x", -this.width / 2);
        this.rect.setAttribute("y", -this.height / 2);
        
        const text = document.createElementNS(svgNS, "text");
        text.textContent = this.title;
        text.setAttribute("x", 0);
        text.setAttribute("y", 5);
        text.setAttribute("text-anchor", "middle");
        
        this.el.appendChild(this.rect);
        this.el.appendChild(text);
    }

    updateSize(width, height) {
        super.updateSize(width, height);
        if (this.rect) {
            this.rect.setAttribute("width", this.width);
            this.rect.setAttribute("height", this.height);
            this.rect.setAttribute("x", -this.width / 2);
            this.rect.setAttribute("y", -this.height / 2);
        }
    }

    setTitle(title) {
        this.title = title;
        const text = this.el.querySelector('text');
        if (text) {
            text.textContent = title;
        }
    }
}
