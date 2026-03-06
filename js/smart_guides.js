export class SmartGuidesManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
        this.guideLayer = null;
        this.guideGroup = null;
        this.snapThreshold = 15;
        this.svgNS = "http://www.w3.org/2000/svg";

        this.options = {
            majorGrid: 100,
            subGrid: 20
        };
    }

    init() {
        this.guideLayer = document.createElementNS(this.svgNS, "g");
        this.guideLayer.setAttribute("class", "smart-guides-layer");
        this.graphBoard.contentLayer.parentNode.insertBefore(
            this.guideLayer,
            this.graphBoard.contentLayer.nextSibling
        );

        this.guideGroup = document.createElementNS(this.svgNS, "g");
        this.guideGroup.setAttribute("class", "smart-guides-group");
        this.guideLayer.appendChild(this.guideGroup);
    }

    setGridSizes(majorGrid, subGrid) {
        this.options.majorGrid = majorGrid;
        this.options.subGrid = subGrid;
    }

    clearGuides() {
        this.guideGroup.innerHTML = '';
    }

    updateGuides() {
        this.clearGuides();

        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length === 0) return;

        const others = this.graphBoard.elements.filter(
            el => !this.graphBoard.selectionManager.isSelected(el.id)
        );

        const allElements = this.graphBoard.elements;

        // ── 1. Alignment guides ──────────────────────────────────────────────
        // For each axis value (left/right/centerX/top/bottom/centerY), group ALL
        // elements (selected + unselected) that share it within the threshold.
        // Only emit a guide when at least one selected element is in the group AND
        // the group has ≥ 2 members. One merged line per group — no duplicates.

        this._buildAlignmentGuides(selected, allElements);

        // ── 2. Equal-spacing guides ──────────────────────────────────────────
        // Detect sets of 3+ elements (must include a selected one) where the
        // gaps between their bounding-box edges are equal.
        this._buildEqualSpacingGuides(selected, allElements);
    }

    // ── Alignment guides ─────────────────────────────────────────────────────

    _buildAlignmentGuides(selected, allElements) {
        const T = this.snapThreshold;
        const selectedIds = new Set(selected.map(el => el.id));

        // Collect all bounds once
        const boundsMap = new Map();
        allElements.forEach(el => boundsMap.set(el.id, el.getBounds()));

        // For each alignment axis we want to detect, cluster all elements that
        // share the same approximate value. Then emit ONE guide per cluster that
        // contains ≥1 selected element and ≥2 total elements.

        const axisExtractors = [
            { key: 'left',    axis: 'vertical',   getValue: b => b.left    },
            { key: 'right',   axis: 'vertical',   getValue: b => b.right   },
            { key: 'centerX', axis: 'vertical',   getValue: b => b.centerX },
            { key: 'top',     axis: 'horizontal',  getValue: b => b.top    },
            { key: 'bottom',  axis: 'horizontal',  getValue: b => b.bottom },
            { key: 'centerY', axis: 'horizontal',  getValue: b => b.centerY },
        ];

        axisExtractors.forEach(({ key, axis, getValue }) => {
            // Build clusters: greedy single-pass after sorting by value
            const sorted = allElements
                .map(el => ({ el, val: getValue(boundsMap.get(el.id)) }))
                .sort((a, b) => a.val - b.val);

            const clusters = [];
            let current = null;

            sorted.forEach(item => {
                if (!current || Math.abs(item.val - current.refVal) > T) {
                    current = { refVal: item.val, items: [] };
                    clusters.push(current);
                }
                current.items.push(item);
            });

            clusters.forEach(cluster => {
                if (cluster.items.length < 2) return;

                const hasSelected = cluster.items.some(i => selectedIds.has(i.el.id));
                if (!hasSelected) return;

                // Average position for the guide line
                const avgVal = cluster.items.reduce((s, i) => s + i.val, 0) / cluster.items.length;

                const bList = cluster.items.map(i => boundsMap.get(i.el.id));

                if (axis === 'vertical') {
                    // Vertical line: spans from topmost top to bottommost bottom of cluster
                    const startY = Math.min(...bList.map(b => b.top));
                    const endY   = Math.max(...bList.map(b => b.bottom));
                    this._renderLine(avgVal, startY, avgVal, endY, this._alignColor(key));
                } else {
                    // Horizontal line: spans from leftmost left to rightmost right
                    const startX = Math.min(...bList.map(b => b.left));
                    const endX   = Math.max(...bList.map(b => b.right));
                    this._renderLine(startX, avgVal, endX, avgVal, this._alignColor(key));
                }
            });
        });
    }

    _alignColor(key) {
        const map = {
            left:    '#ff6b6b',
            right:   '#ff6b6b',
            top:     '#4ecdc4',
            bottom:  '#4ecdc4',
            centerX: '#ffe66d',
            centerY: '#ffe66d',
        };
        return map[key] || '#ffffff';
    }

    // ── Equal-spacing guides ─────────────────────────────────────────────────

    _buildEqualSpacingGuides(selected, allElements) {
        if (allElements.length < 3) return;

        const selectedIds = new Set(selected.map(el => el.id));
        const T = this.snapThreshold;

        // Check horizontal spacing: sort by centerX, measure gap between right
        // edge of one element and left edge of the next.
        this._detectEqualGaps(allElements, selectedIds, 'horizontal', T);
        this._detectEqualGaps(allElements, selectedIds, 'vertical',   T);
    }

    /**
     * Detect groups of 3+ elements (sorted along `direction`) where the
     * between-element gaps are equal. Renders a spacing gizmo for each such group.
     *
     * Strategy:
     *  1. Sort all elements along the primary axis.
     *  2. Compute the gap between consecutive element bounding boxes.
     *  3. Find the longest run where all gaps are equal (within threshold).
     *  4. If run length ≥ 3 elements (≥2 gaps) and contains a selected element → render.
     */
    _detectEqualGaps(allElements, selectedIds, direction, T) {
        const isH = direction === 'horizontal';

        // Sort by leading edge along primary axis
        const sorted = [...allElements].sort((a, b) => {
            const ba = a.getBounds(), bb = b.getBounds();
            return isH ? ba.left - bb.left : ba.top - bb.top;
        });

        const n = sorted.length;
        if (n < 3) return;

        // Pre-compute gaps between consecutive elements
        // gap[i] = gap between sorted[i] and sorted[i+1]
        const gaps = [];
        for (let i = 0; i < n - 1; i++) {
            const ba = sorted[i].getBounds();
            const bb = sorted[i + 1].getBounds();
            const gap = isH
                ? bb.left  - ba.right
                : bb.top   - ba.bottom;
            gaps.push(gap);
        }

        // Find maximal runs of equal gaps using a sliding window
        // We mark which gap indices are part of an equal run
        const visited = new Set();

        let i = 0;
        while (i < gaps.length) {
            if (visited.has(i)) { i++; continue; }

            // Extend run from i as long as gaps stay equal within T
            let runEnd = i; // inclusive last gap index in run
            while (runEnd + 1 < gaps.length && Math.abs(gaps[runEnd + 1] - gaps[i]) <= T) {
                runEnd++;
            }

            const runGapCount  = runEnd - i + 1;      // number of gaps
            const runElemCount = runGapCount + 1;       // number of elements

            if (runElemCount >= 3) {
                const runElements = sorted.slice(i, i + runElemCount);
                const hasSelected = runElements.some(el => selectedIds.has(el.id));

                if (hasSelected) {
                    const refGap = gaps[i];
                    this._renderEqualSpacingGizmo(runElements, direction, refGap);
                }

                // Mark all gap indices in this run as visited so we don't
                // double-render overlapping sub-runs
                for (let k = i; k <= runEnd; k++) visited.add(k);
            }

            i++;
        }
    }

    /**
     * Render the equal-spacing gizmo for a set of elements.
     *
     * Visual: For each gap between consecutive elements, draw:
     *   - A thin coloured line through the centre of the gap (parallel to axis)
     *   - Two perpendicular tick marks at the gap edges
     *   - A small label showing the gap size
     */
    _renderEqualSpacingGizmo(elements, direction, gapSize) {
        const isH   = direction === 'horizontal';
        const color = '#a29bfe';

        // Compute a stable cross-axis centre for the indicator line/ticks.
        // Use the midpoint of the bounding box of all elements in the group.
        const allBounds = elements.map(el => el.getBounds());

        const crossMin = isH
            ? Math.min(...allBounds.map(b => b.top))
            : Math.min(...allBounds.map(b => b.left));
        const crossMax = isH
            ? Math.max(...allBounds.map(b => b.bottom))
            : Math.max(...allBounds.map(b => b.right));
        const crossCenter = (crossMin + crossMax) / 2;

        // Tick height/width: proportional to gap but capped
        const tickHalf = Math.min(Math.abs(gapSize) * 0.4, 12);

        for (let i = 0; i < elements.length - 1; i++) {
            const ba = elements[i].getBounds();
            const bb = elements[i + 1].getBounds();

            const gapStart = isH ? ba.right : ba.bottom;
            const gapEnd   = isH ? bb.left  : bb.top;
            const gapMid   = (gapStart + gapEnd) / 2;

            if (isH) {
                // Horizontal connector line through gap centre
                this._renderLine(gapStart, crossCenter, gapEnd, crossCenter, color, '3,3');

                // Left tick (at gapStart)
                this._renderLine(gapStart, crossCenter - tickHalf, gapStart, crossCenter + tickHalf, color);
                // Right tick (at gapEnd)
                this._renderLine(gapEnd, crossCenter - tickHalf, gapEnd, crossCenter + tickHalf, color);

                // Label
                this._renderLabel(gapMid, crossCenter - tickHalf - 4, Math.round(gapSize).toString(), color, 'middle');
            } else {
                // Vertical connector line through gap centre
                this._renderLine(crossCenter, gapStart, crossCenter, gapEnd, color, '3,3');

                // Top tick (at gapStart)
                this._renderLine(crossCenter - tickHalf, gapStart, crossCenter + tickHalf, gapStart, color);
                // Bottom tick (at gapEnd)
                this._renderLine(crossCenter - tickHalf, gapEnd,   crossCenter + tickHalf, gapEnd,   color);

                // Label
                this._renderLabel(crossCenter + tickHalf + 4, gapMid, Math.round(gapSize).toString(), color, 'start');
            }
        }
    }

    // ── SVG helpers ──────────────────────────────────────────────────────────

    _renderLine(x1, y1, x2, y2, color, dashArray = null) {
        const line = document.createElementNS(this.svgNS, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "1");
        line.setAttribute("vector-effect", "non-scaling-stroke");
        if (dashArray) line.setAttribute("stroke-dasharray", dashArray);
        this.guideGroup.appendChild(line);
        return line;
    }

    _renderLabel(x, y, text, color, anchor = 'middle') {
        const label = document.createElementNS(this.svgNS, "text");
        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("fill", color);
        label.setAttribute("font-size", "9");
        label.setAttribute("font-family", "sans-serif");
        label.setAttribute("text-anchor", anchor);
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("vector-effect", "non-scaling-stroke");
        label.textContent = text;
        this.guideGroup.appendChild(label);
        return label;
    }

    updateTransform(panX, panY, scale) {
        if (this.guideLayer) {
            this.guideLayer.setAttribute(
                "transform",
                `translate(${panX}, ${panY}) scale(${scale})`
            );
        }
    }
}