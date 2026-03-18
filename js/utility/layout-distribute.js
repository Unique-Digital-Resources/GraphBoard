export class DistributeManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
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
