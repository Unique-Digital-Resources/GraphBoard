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
            const sorted = [...selected].sort((a, b) => {
                const aLeft = a.x;
                const bLeft = b.x;
                return aLeft - bLeft;
            });
            
            const leftmost = sorted[0];
            const rightmost = sorted[sorted.length - 1];
            
            const leftEdge = leftmost.x;
            const rightEdge = rightmost.x + rightmost.width;
            const totalSpan = rightEdge - leftEdge;
            const occupiedWidth = sorted.reduce((sum, el) => sum + el.width, 0);
            const totalGapSpace = totalSpan - occupiedWidth;
            const gap = totalGapSpace / (sorted.length - 1);

            let currentX = leftEdge;

            sorted.forEach((el, i) => {
                if (i > 0) {
                    const prevEl = sorted[i - 1];
                    currentX = prevEl.x + prevEl.width + gap;
                }
                
                el.updatePosition(currentX, el.y);
            });

        } else {
            const sorted = [...selected].sort((a, b) => {
                const aTop = a.y;
                const bTop = b.y;
                return aTop - bTop;
            });
            
            const topmost = sorted[0];
            const bottommost = sorted[sorted.length - 1];
            
            const topEdge = topmost.y;
            const bottomEdge = bottommost.y + bottommost.height;
            const totalSpan = bottomEdge - topEdge;
            const occupiedHeight = sorted.reduce((sum, el) => sum + el.height, 0);
            const totalGapSpace = totalSpan - occupiedHeight;
            const gap = totalGapSpace / (sorted.length - 1);

            let currentY = topEdge;

            sorted.forEach((el, i) => {
                if (i > 0) {
                    const prevEl = sorted[i - 1];
                    currentY = prevEl.y + prevEl.height + gap;
                }
                
                el.updatePosition(el.x, currentY);
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

    justifyHorizontally() {
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length < 2) {
            this.graphBoard.showToast("Select 2+ elements to justify");
            return;
        }

        const sorted = [...selected].sort((a, b) => {
            const aLeft = a.x - a.width / 2;
            const bLeft = b.x - b.width / 2;
            return aLeft - bLeft;
        });

        const leftBound = sorted[0].x - sorted[0].width / 2;
        const rightBound = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width / 2;
        const totalSpan = rightBound - leftBound;

        const resizable = sorted.filter(el => !el.locked);
        const locked = sorted.filter(el => el.locked);

        if (resizable.length === 0) {
            this.graphBoard.showToast("No resizable elements (all locked)");
            return;
        }

        const fixedWidth = locked.reduce((sum, el) => sum + el.width, 0);
        let availableWidth = totalSpan - fixedWidth;

        const originalWidths = new Map();
        resizable.forEach(el => originalWidths.set(el, el.width));

        let iterations = 0;
        const maxIterations = 10;

        while (iterations < maxIterations) {
            iterations++;

            let totalResizableWidth = resizable.reduce((sum, el) => sum + el.width, 0);
            
            if (totalResizableWidth === 0) break;
            
            const scaleFactor = availableWidth / totalResizableWidth;

            let overflow = 0;
            resizable.forEach(el => {
                const newWidth = el.width * scaleFactor;
                if (newWidth < el.minWidth) {
                    overflow += el.minWidth - newWidth;
                    el.width = el.minWidth;
                } else {
                    el.width = newWidth;
                }
            });

            if (overflow < 0.001) {
                break;
            }

            availableWidth -= overflow;
            if (availableWidth < 0) break;
        }

        let currentX = leftBound;
        sorted.forEach(el => {
            el.x = currentX + el.width / 2;
            el.updateSize(el.width, el.height);
            el.updatePosition(el.x, el.y);
            currentX += el.width;
        });

        this.graphBoard.updateMinimap();
        this.graphBoard.showToast("Justified horizontally");
    }

    justifyVertically() {
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length < 2) {
            this.graphBoard.showToast("Select 2+ elements to justify");
            return;
        }

        const sorted = [...selected].sort((a, b) => {
            const aTop = a.y - a.height / 2;
            const bTop = b.y - b.height / 2;
            return aTop - bTop;
        });

        const topBound = sorted[0].y - sorted[0].height / 2;
        const bottomBound = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height / 2;
        const totalSpan = bottomBound - topBound;

        const resizable = sorted.filter(el => !el.locked);
        const locked = sorted.filter(el => el.locked);

        if (resizable.length === 0) {
            this.graphBoard.showToast("No resizable elements (all locked)");
            return;
        }

        const fixedHeight = locked.reduce((sum, el) => sum + el.height, 0);
        let availableHeight = totalSpan - fixedHeight;

        let iterations = 0;
        const maxIterations = 10;

        while (iterations < maxIterations) {
            iterations++;

            let totalResizableHeight = resizable.reduce((sum, el) => sum + el.height, 0);
            
            if (totalResizableHeight === 0) break;
            
            const scaleFactor = availableHeight / totalResizableHeight;

            let overflow = 0;
            resizable.forEach(el => {
                const newHeight = el.height * scaleFactor;
                if (newHeight < el.minHeight) {
                    overflow += el.minHeight - newHeight;
                    el.height = el.minHeight;
                } else {
                    el.height = newHeight;
                }
            });

            if (overflow < 0.001) {
                break;
            }

            availableHeight -= overflow;
            if (availableHeight < 0) break;
        }

        let currentY = topBound;
        sorted.forEach(el => {
            el.y = currentY + el.height / 2;
            el.updateSize(el.width, el.height);
            el.updatePosition(el.x, el.y);
            currentY += el.height;
        });

        this.graphBoard.updateMinimap();
        this.graphBoard.showToast("Justified vertically");
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
