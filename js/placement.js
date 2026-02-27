export class PlacementManager {
    constructor(options = {}) {
        this.options = {
            snapMode: options.snapMode || 'major',
            majorGrid: options.majorGrid || 100,
            subGrid: options.subGrid || 20
        };
    }

    setSnapMode(mode) {
        this.options.snapMode = mode;
    }

    setGridSizes(majorGrid, subGrid) {
        this.options.majorGrid = majorGrid;
        this.options.subGrid = subGrid;
    }

    getSnappedPos(x, y) {
        const mode = this.options.snapMode;
        if (mode === 'off') return { x, y };
        
        const gridSize = (mode === 'sub') ? this.options.subGrid : this.options.majorGrid;
        
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    }

    snapPosition(position, gridSize = null) {
        const size = gridSize || (this.options.snapMode === 'sub' ? this.options.subGrid : this.options.majorGrid);
        return {
            x: Math.round(position.x / size) * size,
            y: Math.round(position.y / size) * size
        };
    }
}
