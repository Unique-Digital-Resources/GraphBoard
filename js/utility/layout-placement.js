export class PlacementManager {
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
