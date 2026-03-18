export class JustifyManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
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
