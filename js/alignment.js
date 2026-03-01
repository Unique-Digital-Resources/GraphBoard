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
