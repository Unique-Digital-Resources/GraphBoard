import { registerShortcut } from './shortcuts.js';

export class SelectionManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
        this.selectedElements = new Set();
        this.onSelectionChange = null;
    }

    init() {
        registerShortcut('a', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.selectAll();
            }
        }, this);
    }

    selectElement(id, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }

        if (this.selectedElements.has(id)) {
            this.selectedElements.delete(id);
            this.updateElementVisual(id, false);
        } else {
            this.selectedElements.add(id);
            this.updateElementVisual(id, true);
        }
        
        this.notifySelectionChange();
    }

    selectAll() {
        this.graphBoard.elements.forEach(el => {
            this.selectedElements.add(el.id);
            el.setSelected(true);
        });
        this.notifySelectionChange();
        this.graphBoard.showToast("Selected All Elements");
    }

    clearSelection() {
        this.selectedElements.forEach(id => {
            this.updateElementVisual(id, false);
        });
        this.selectedElements.clear();
        this.notifySelectionChange();
    }

    isSelected(id) {
        return this.selectedElements.has(id);
    }

    getSelected() {
        return this.graphBoard.elements.filter(el => this.selectedElements.has(el.id));
    }

    updateElementVisual(id, isSelected) {
        const element = this.graphBoard.elements.find(el => el.id === id);
        if (element) {
            element.setSelected(isSelected);
            if (element.minimapDot) {
                if (isSelected) {
                    element.minimapDot.classList.add('selected');
                } else {
                    element.minimapDot.classList.remove('selected');
                }
            }
        }
    }

    notifySelectionChange() {
        if (this.onSelectionChange) {
            this.onSelectionChange(this.selectedElements.size);
        }
    }

    setOnSelectionChange(callback) {
        this.onSelectionChange = callback;
    }
}
