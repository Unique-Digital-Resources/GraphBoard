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
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("width", this.width);
        rect.setAttribute("height", this.height);
        rect.setAttribute("x", -this.width / 2);
        rect.setAttribute("y", -this.height / 2);
        
        const text = document.createElementNS(svgNS, "text");
        text.textContent = this.title;
        text.setAttribute("x", 0);
        text.setAttribute("y", 5);
        text.setAttribute("text-anchor", "middle");
        
        this.el.appendChild(rect);
        this.el.appendChild(text);
    }

    setTitle(title) {
        this.title = title;
        const text = this.el.querySelector('text');
        if (text) {
            text.textContent = title;
        }
    }
}
