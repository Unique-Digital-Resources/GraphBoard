import { PlacementManager } from './layout-placement.js';
import { DistributeManager } from './layout-distribute.js';
import { WrapManager } from './layout-wrap.js';
import { JustifyManager } from './layout-justify.js';

export class AlignmentManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
        this.placement = new PlacementManager(graphBoard);
        this.distribute = new DistributeManager(graphBoard);
        this.wrap = new WrapManager(graphBoard);
        this.justify = new JustifyManager(graphBoard);
    }

    alignNodes(mode) {
        this.placement.alignNodes(mode);
    }

    distributeNodes(direction) {
        this.distribute.distributeNodes(direction);
    }

    wrapElements(direction, cols) {
        this.wrap.wrapElements(direction, cols);
    }

    justifyHorizontally() {
        this.justify.justifyHorizontally();
    }

    justifyVertically() {
        this.justify.justifyVertically();
    }

    getSelectionBounds(elements) {
        return this.placement.getSelectionBounds(elements);
    }
}
