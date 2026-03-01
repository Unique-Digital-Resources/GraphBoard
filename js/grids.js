export class GridManager {
    constructor(svgElement, options = {}) {
        this.svg = svgElement;
        this.defs = null;
        this.gridLayer = null;
        
        this.options = {
            majorGrid: options.majorGrid || 100,
            subGrid: options.subGrid || 20,
            gridType: options.gridType || 'lines',
            showSubGrid: options.showSubGrid !== undefined ? options.showSubGrid : true
        };

        this.svgNS = "http://www.w3.org/2000/svg";
    }

    init(defsElement, gridLayerElement) {
        this.defs = defsElement;
        this.gridLayer = gridLayerElement;
        this.updatePatterns();
    }

    updatePatterns() {
        this.defs.innerHTML = '';
        this.gridLayer.innerHTML = '';

        const createPattern = (id, w, h, type, isSub = false) => {
            const pattern = document.createElementNS(this.svgNS, "pattern");
            pattern.setAttribute("id", id);
            pattern.setAttribute("width", w);
            pattern.setAttribute("height", h);
            pattern.setAttribute("patternUnits", "userSpaceOnUse");
            if (type === 'lines') {
                const path = document.createElementNS(this.svgNS, "path");
                path.setAttribute("d", `M ${w} 0 L ${w} ${h} M 0 ${h} L ${w} ${h}`);
                path.setAttribute("fill", "none");
                path.setAttribute("class", isSub ? "grid-sub-line" : "grid-line");
                pattern.appendChild(path);
            } else {
                const c1 = document.createElementNS(this.svgNS, "circle");
                c1.setAttribute("cx", 0); c1.setAttribute("cy", 0);
                c1.setAttribute("r", isSub ? 1 : 2);
                c1.setAttribute("class", isSub ? "grid-sub-dot" : "grid-dot");
                pattern.appendChild(c1);
                
                const c2 = document.createElementNS(this.svgNS, "circle");
                c2.setAttribute("cx", w); c2.setAttribute("cy", 0);
                c2.setAttribute("r", isSub ? 1 : 2);
                c2.setAttribute("class", isSub ? "grid-sub-dot" : "grid-dot");
                pattern.appendChild(c2);
                
                const c3 = document.createElementNS(this.svgNS, "circle");
                c3.setAttribute("cx", 0); c3.setAttribute("cy", h);
                c3.setAttribute("r", isSub ? 1 : 2);
                c3.setAttribute("class", isSub ? "grid-sub-dot" : "grid-dot");
                pattern.appendChild(c3);
                
                const c4 = document.createElementNS(this.svgNS, "circle");
                c4.setAttribute("cx", w); c4.setAttribute("cy", h);
                c4.setAttribute("r", isSub ? 1 : 2);
                c4.setAttribute("class", isSub ? "grid-sub-dot" : "grid-dot");
                pattern.appendChild(c4);
            }
            return pattern;
        };

        this.defs.appendChild(createPattern('gridPatternMajor', this.options.majorGrid, this.options.majorGrid, this.options.gridType));
        this.defs.appendChild(createPattern('gridPatternSub', this.options.subGrid, this.options.subGrid, this.options.gridType, true));

        const infiniteRect = document.createElementNS(this.svgNS, "rect");
        infiniteRect.setAttribute("x", "-50000");
        infiniteRect.setAttribute("y", "-50000");
        infiniteRect.setAttribute("width", "100000");
        infiniteRect.setAttribute("height", "100000");

        const majorRect = infiniteRect.cloneNode();
        majorRect.setAttribute("fill", "url(#gridPatternMajor)");
        this.gridLayer.appendChild(majorRect);

        if (this.options.showSubGrid) {
            const subRect = infiniteRect.cloneNode();
            subRect.setAttribute("fill", "url(#gridPatternSub)");
            subRect.setAttribute("opacity", "0.5");
            this.gridLayer.appendChild(subRect);
        }
    }

    toggleSubGrid(show) {
        this.options.showSubGrid = show;
        this.updatePatterns();
    }

    setGridType(type) {
        this.options.gridType = type;
        this.updatePatterns();
    }

    setMajorGrid(size) {
        this.options.majorGrid = size;
        this.updatePatterns();
    }

    setSubGrid(size) {
        this.options.subGrid = size;
        this.updatePatterns();
    }

    updateTransform(panX, panY, scale) {
        const transformStr = `translate(${panX}, ${panY}) scale(${scale})`;
        this.gridLayer.setAttribute("transform", transformStr);
    }
}
