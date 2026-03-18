export class WrapManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
    }

    wrapElements(direction = 'h', cols = null) {
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length < 2) {
            this.graphBoard.showToast("Select 2+ elements to wrap");
            return;
        }

        const n = selected.length;

        let gridCols, gridRows;
        if (direction === 'h') {
            gridCols = cols != null ? Math.max(1, Math.min(cols, n)) : Math.ceil(Math.sqrt(n));
            gridRows = Math.ceil(n / gridCols);
        } else {
            gridRows = cols != null ? Math.max(1, Math.min(cols, n)) : Math.ceil(Math.sqrt(n));
            gridCols = Math.ceil(n / gridRows);
        }

        const bounds = this.getSelectionBounds(selected);

        const sorted = [...selected].sort((a, b) =>
            a.x !== b.x ? a.x - b.x : a.y - b.y
        );

        const cellW = Math.max(...sorted.map(el => el.width));
        const cellH = Math.max(...sorted.map(el => el.height));

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
