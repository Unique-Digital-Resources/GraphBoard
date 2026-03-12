export class AlignmentManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
    }

    alignNodes(mode) {
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length < 2) {
            this.graphBoard.showToast("Select 2+ elements to align");
            return;
        }

        const bounds = this.getSelectionBounds(selected);

        selected.forEach(el => {
            const elBounds = el.getBounds();
            let targetX = el.x;
            let targetY = el.y;

            switch(mode) {
                case 'left':
                    targetX = bounds.left + el.width / 2;
                    break;
                case 'right':
                    targetX = bounds.right - el.width / 2;
                    break;
                case 'top':
                    targetY = bounds.top + el.height / 2;
                    break;
                case 'bottom':
                    targetY = bounds.bottom - el.height / 2;
                    break;
                case 'center-h':
                    targetY = bounds.centerY;
                    break;
                case 'center-v':
                    targetX = bounds.centerX;
                    break;
            }

            const snapped = this.graphBoard.placementManager.getSnappedPos(targetX, targetY, el.width, el.height);
            
            if (mode === 'left' || mode === 'right' || mode === 'center-v') {
                el.x = snapped.x + el.width / 2;
            }
            if (mode === 'top' || mode === 'bottom' || mode === 'center-h') {
                el.y = snapped.y + el.height / 2;
            }

            el.updatePosition(el.x, el.y);
        });

        this.graphBoard.updateMinimap();
        this.graphBoard.showToast(`Aligned ${mode}`);
    }

    distributeNodes(direction) {
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length < 3) {
            this.graphBoard.showToast("Select 3+ elements to distribute");
            return;
        }

        if (direction === 'h') {
            selected.sort((a, b) => a.x - b.x);
            
            const minL = selected[0].x - selected[0].width / 2;
            const maxR = selected[selected.length - 1].x + selected[selected.length - 1].width / 2;
            const totalWidth = selected.reduce((sum, el) => sum + el.width, 0);
            const totalGap = (maxR - minL) - totalWidth;
            const gap = totalGap / (selected.length - 1);

            let currentEdge = minL;

            selected.forEach((el, i) => {
                if (i > 0) {
                    currentEdge += gap + selected[i - 1].width;
                }
                
                let targetX = currentEdge + el.width / 2;
                const snapped = this.graphBoard.placementManager.getSnappedPos(targetX, el.y, el.width, el.height);
                el.x = snapped.x + el.width / 2;
                el.updatePosition(el.x, el.y);
            });

        } else {
            selected.sort((a, b) => a.y - b.y);
            
            const minT = selected[0].y - selected[0].height / 2;
            const maxB = selected[selected.length - 1].y + selected[selected.length - 1].height / 2;
            const totalHeight = selected.reduce((sum, el) => sum + el.height, 0);
            const totalGap = (maxB - minT) - totalHeight;
            const gap = totalGap / (selected.length - 1);

            let currentEdge = minT;

            selected.forEach((el, i) => {
                if (i > 0) {
                    currentEdge += gap + selected[i - 1].height;
                }
                
                let targetY = currentEdge + el.height / 2;
                const snapped = this.graphBoard.placementManager.getSnappedPos(el.x, targetY, el.width, el.height);
                el.y = snapped.y + el.height / 2;
                el.updatePosition(el.x, el.y);
            });
        }

        this.graphBoard.updateMinimap();
        this.graphBoard.showToast("Distributed elements");
    }

    wrapElements(direction = 'h', cols = null) {
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length < 2) {
            this.graphBoard.showToast("Select 2+ elements to wrap");
            return;
        }

        const n = selected.length;

        // Auto-compute grid dimensions if not provided
        let gridCols, gridRows;
        if (direction === 'h') {
            gridCols = cols != null ? Math.max(1, Math.min(cols, n)) : Math.ceil(Math.sqrt(n));
            gridRows = Math.ceil(n / gridCols);
        } else {
            gridRows = cols != null ? Math.max(1, Math.min(cols, n)) : Math.ceil(Math.sqrt(n));
            gridCols = Math.ceil(n / gridRows);
        }

        // Anchor to top-left of current selection bounds
        const bounds = this.getSelectionBounds(selected);

        // Sort: left-to-right, then top-to-bottom (reading order)
        const sorted = [...selected].sort((a, b) =>
            a.x !== b.x ? a.x - b.x : a.y - b.y
        );

        // Cell size = largest element dimensions in selection
        const cellW = Math.max(...sorted.map(el => el.width));
        const cellH = Math.max(...sorted.map(el => el.height));

        // Gap: half of majorGrid so layout breathes but stays compact
        const gap = (this.graphBoard.options.majorGrid || 100) * 0.5;
        const stepX = cellW + gap;
        const stepY = cellH + gap;

        const startX = bounds.left;
        const startY = bounds.top;

        sorted.forEach((el, i) => {
            const col = direction === 'h' ? (i % gridCols)              : Math.floor(i / gridRows);
            const row = direction === 'h' ? Math.floor(i / gridCols)    : (i % gridRows);

            const cx = startX + col * stepX + el.width  / 2;
            const cy = startY + row * stepY + el.height / 2;

            const snapped = this.graphBoard.placementManager.getSnappedPos(cx, cy, el.width, el.height);
            el.x = snapped.x + el.width  / 2;
            el.y = snapped.y + el.height / 2;
            el.updatePosition(el.x, el.y);
        });

        this.graphBoard.updateMinimap();
        this.graphBoard.showToast(
            direction === 'h'
                ? `Wrapped in ${gridCols}-col rows`
                : `Wrapped in ${gridRows}-row columns`
        );
    }

    getSelectionBounds(elements) {
        let minL = Infinity, maxR = -Infinity;
        let minT = Infinity, maxB = -Infinity;

        elements.forEach(el => {
            const b = el.getBounds();
            if (b.left < minL) minL = b.left;
            if (b.right > maxR) maxR = b.right;
            if (b.top < minT) minT = b.top;
            if (b.bottom > maxB) maxB = b.bottom;
        });

        return {
            left: minL,
            right: maxR,
            top: minT,
            bottom: maxB,
            centerX: (minL + maxR) / 2,
            centerY: (minT + maxB) / 2,
            width: maxR - minL,
            height: maxB - minT
        };
    }
}
