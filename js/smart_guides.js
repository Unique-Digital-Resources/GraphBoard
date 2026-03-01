export class SmartGuidesManager {
    constructor(graphBoard) {
        this.graphBoard = graphBoard;
        this.guideLayer = null;
        this.guideGroup = null;
        this.snapThreshold = 15;
        this.spacingThreshold = 20;
        this.svgNS = "http://www.w3.org/2000/svg";
        
        this.options = {
            majorGrid: 100,
            subGrid: 20
        };
    }

    init() {
        this.guideLayer = document.createElementNS(this.svgNS, "g");
        this.guideLayer.setAttribute("class", "smart-guides-layer");
        this.graphBoard.contentLayer.parentNode.insertBefore(this.guideLayer, this.graphBoard.contentLayer.nextSibling);
        
        this.guideGroup = document.createElementNS(this.svgNS, "g");
        this.guideGroup.setAttribute("class", "smart-guides-group");
        this.guideLayer.appendChild(this.guideGroup);
    }

    setGridSizes(majorGrid, subGrid) {
        this.options.majorGrid = majorGrid;
        this.options.subGrid = subGrid;
    }

    clearGuides() {
        this.guideGroup.innerHTML = '';
    }

    updateGuides() {
        this.clearGuides();
        
        const selected = this.graphBoard.selectionManager.getSelected();
        if (selected.length === 0) return;
        
        const others = this.graphBoard.elements.filter(el => 
            !this.graphBoard.selectionManager.isSelected(el.id)
        );
        
        if (others.length === 0 && selected.length < 2) return;

        const guides = [];
        
        if (others.length > 0) {
            selected.forEach(sel => {
                others.forEach(other => {
                    const rels = this.getRelation(sel, other);
                    if (rels) {
                        rels.forEach(rel => guides.push(rel));
                    }
                });
            });
        }
        
        if (selected.length >= 2) {
            for (let i = 0; i < selected.length; i++) {
                for (let j = i + 1; j < selected.length; j++) {
                    const rels = this.getRelation(selected[i], selected[j]);
                    if (rels) {
                        rels.forEach(rel => guides.push(rel));
                    }
                }
            }
        }
        
        if (selected.length >= 2) {
            const spacingGuides = this.findEqualSpacingGuides(selected);
            guides.push(...spacingGuides);
        }
        
        if (this.graphBoard.elements.length >= 3) {
            const allSpacingGuides = this.findEqualSpacingGuides(this.graphBoard.elements);
            guides.push(...allSpacingGuides);
        }
        
        guides.forEach(guide => this.renderGuide(guide));
    }

    getRelation(el1, el2) {
        const b1 = el1.getBounds();
        const b2 = el2.getBounds();
        const relations = [];
        
        if (Math.abs(b1.left - b2.left) <= this.snapThreshold) {
            relations.push({
                type: 'vertical',
                pos: (b1.left + b2.left) / 2,
                startY: Math.min(b1.top, b2.top),
                endY: Math.max(b1.bottom, b2.bottom),
                label: 'left'
            });
        }
        
        if (Math.abs(b1.right - b2.right) <= this.snapThreshold) {
            relations.push({
                type: 'vertical',
                pos: (b1.right + b2.right) / 2,
                startY: Math.min(b1.top, b2.top),
                endY: Math.max(b1.bottom, b2.bottom),
                label: 'right'
            });
        }
        
        if (Math.abs(b1.centerX - b2.centerX) <= this.snapThreshold) {
            relations.push({
                type: 'vertical',
                pos: (b1.centerX + b2.centerX) / 2,
                startY: Math.min(b1.top, b2.top),
                endY: Math.max(b1.bottom, b2.bottom),
                label: 'centerH'
            });
        }
        
        if (Math.abs(b1.top - b2.top) <= this.snapThreshold) {
            relations.push({
                type: 'horizontal',
                pos: (b1.top + b2.top) / 2,
                startX: Math.min(b1.left, b2.left),
                endX: Math.max(b1.right, b2.right),
                label: 'top'
            });
        }
        
        if (Math.abs(b1.bottom - b2.bottom) <= this.snapThreshold) {
            relations.push({
                type: 'horizontal',
                pos: (b1.bottom + b2.bottom) / 2,
                startX: Math.min(b1.left, b2.left),
                endX: Math.max(b1.right, b2.right),
                label: 'bottom'
            });
        }
        
        if (Math.abs(b1.centerY - b2.centerY) <= this.snapThreshold) {
            relations.push({
                type: 'horizontal',
                pos: (b1.centerY + b2.centerY) / 2,
                startX: Math.min(b1.left, b2.left),
                endX: Math.max(b1.right, b2.right),
                label: 'centerV'
            });
        }
        
        return relations.length > 0 ? relations : null;
    }

    findEqualSpacingGuides(elements) {
        const guides = [];
        
        if (elements.length < 3) return guides;
        
        const bounds = elements.map(el => el.getBounds());
        
        const lefts = bounds.map(b => b.left);
        const rights = bounds.map(b => b.right);
        const tops = bounds.map(b => b.top);
        const bottoms = bounds.map(b => b.bottom);
        const centersX = bounds.map(b => b.centerX);
        const centersY = bounds.map(b => b.centerY);
        
        const minLeft = Math.min(...lefts);
        const maxLeft = Math.max(...lefts);
        const leftsAligned = (maxLeft - minLeft) <= this.snapThreshold;
        if (leftsAligned) {
            const spacingLeft = this.checkEqualSpacing(lefts);
            if (spacingLeft && spacingLeft.count >= 3) {
                guides.push({
                    type: 'horizontal',
                    pos: minLeft,
                    startX: minLeft,
                    endX: maxLeft,
                    startY: Math.min(...tops),
                    endY: Math.max(...bottoms),
                    label: 'spacingH',
                    count: spacingLeft.count,
                    spacing: spacingLeft.spacing
                });
            }
        }
        
        const minRight = Math.min(...rights);
        const maxRight = Math.max(...rights);
        const rightsAligned = (maxRight - minRight) <= this.snapThreshold;
        if (rightsAligned) {
            const spacingRight = this.checkEqualSpacing(rights);
            if (spacingRight && spacingRight.count >= 3) {
                guides.push({
                    type: 'horizontal',
                    pos: minRight,
                    startX: minRight,
                    endX: maxRight,
                    startY: Math.min(...tops),
                    endY: Math.max(...bottoms),
                    label: 'spacingH',
                    count: spacingRight.count,
                    spacing: spacingRight.spacing
                });
            }
        }
        
        const minTop = Math.min(...tops);
        const maxTop = Math.max(...tops);
        const topsAligned = (maxTop - minTop) <= this.snapThreshold;
        if (topsAligned) {
            const spacingTop = this.checkEqualSpacing(tops);
            if (spacingTop && spacingTop.count >= 3) {
                guides.push({
                    type: 'vertical',
                    pos: minTop,
                    startX: Math.min(...lefts),
                    endX: Math.max(...rights),
                    startY: minTop,
                    endY: maxTop,
                    label: 'spacingV',
                    count: spacingTop.count,
                    spacing: spacingTop.spacing
                });
            }
        }
        
        const minBottom = Math.min(...bottoms);
        const maxBottom = Math.max(...bottoms);
        const bottomsAligned = (maxBottom - minBottom) <= this.snapThreshold;
        if (bottomsAligned) {
            const spacingBottom = this.checkEqualSpacing(bottoms);
            if (spacingBottom && spacingBottom.count >= 3) {
                guides.push({
                    type: 'vertical',
                    pos: minBottom,
                    startX: Math.min(...lefts),
                    endX: Math.max(...rights),
                    startY: minBottom,
                    endY: maxBottom,
                    label: 'spacingV',
                    count: spacingBottom.count,
                    spacing: spacingBottom.spacing
                });
            }
        }
        
        const minCenterX = Math.min(...centersX);
        const maxCenterX = Math.max(...centersX);
        const centersXAligned = (maxCenterX - minCenterX) <= this.snapThreshold;
        if (centersXAligned) {
            const spacingCenterX = this.checkEqualSpacing(centersX);
            if (spacingCenterX && spacingCenterX.count >= 3) {
                guides.push({
                    type: 'horizontal',
                    pos: minCenterX,
                    startX: minCenterX,
                    endX: maxCenterX,
                    startY: Math.min(...tops),
                    endY: Math.max(...bottoms),
                    label: 'centerSpacingH',
                    count: spacingCenterX.count,
                    spacing: spacingCenterX.spacing
                });
            }
        }
        
        const minCenterY = Math.min(...centersY);
        const maxCenterY = Math.max(...centersY);
        const centersYAligned = (maxCenterY - minCenterY) <= this.snapThreshold;
        if (centersYAligned) {
            const spacingCenterY = this.checkEqualSpacing(centersY);
            if (spacingCenterY && spacingCenterY.count >= 3) {
                guides.push({
                    type: 'vertical',
                    pos: minCenterY,
                    startX: Math.min(...lefts),
                    endX: Math.max(...rights),
                    startY: minCenterY,
                    endY: maxCenterY,
                    label: 'centerSpacingV',
                    count: spacingCenterY.count,
                    spacing: spacingCenterY.spacing
                });
            }
        }
        
        return guides;
    }

    checkEqualSpacing(positions) {
        if (positions.length < 3) return null;
        
        const sorted = [...positions].sort((a, b) => a - b);
        const spacing = sorted[1] - sorted[0];
        
        if (spacing <= 0) return null;
        
        for (let i = 1; i < sorted.length - 1; i++) {
            const currentSpacing = sorted[i + 1] - sorted[i];
            if (Math.abs(currentSpacing - spacing) > this.spacingThreshold) {
                return null;
            }
        }
        
        return {
            position: sorted[0] + spacing,
            spacing: spacing,
            count: sorted.length
        };
    }

    renderGuide(guide) {
        const color = this.getGuideColor(guide.label);
        
        const isSpacing = guide.label.startsWith('spacing') || guide.label.startsWith('centerSpacing');
        
        if (guide.type === 'vertical') {
            const startY = guide.startY !== undefined ? guide.startY : 0;
            const endY = guide.endY !== undefined ? guide.endY : 10000;
            const centerX = guide.startX !== undefined && guide.endX !== undefined 
                ? (guide.startX + guide.endX) / 2 
                : 0;
            
            const lineX = isSpacing ? centerX : guide.pos;
            
            const line = document.createElementNS(this.svgNS, "line");
            line.setAttribute("x1", lineX);
            line.setAttribute("y1", startY);
            line.setAttribute("x2", lineX);
            line.setAttribute("y2", endY);
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", "1");
            line.setAttribute("stroke-dasharray", isSpacing ? "4,4" : "none");
            this.guideGroup.appendChild(line);
            
            if (isSpacing) {
                this.renderSpacingIndicator(guide, color);
            }
        } else {
            const startX = guide.startX !== undefined ? guide.startX : 0;
            const endX = guide.endX !== undefined ? guide.endX : 10000;
            const centerY = guide.startY !== undefined && guide.endY !== undefined 
                ? (guide.startY + guide.endY) / 2 
                : 0;
            
            const lineY = isSpacing ? centerY : guide.pos;
            
            const line = document.createElementNS(this.svgNS, "line");
            line.setAttribute("x1", startX);
            line.setAttribute("y1", lineY);
            line.setAttribute("x2", endX);
            line.setAttribute("y2", lineY);
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", "1");
            line.setAttribute("stroke-dasharray", isSpacing ? "4,4" : "none");
            this.guideGroup.appendChild(line);
            
            if (isSpacing) {
                this.renderSpacingIndicator(guide, color);
            }
        }
    }

    renderSpacingIndicator(guide, color) {
        const selected = this.graphBoard.selectionManager.getSelected();
        const others = this.graphBoard.elements.filter(el => 
            !this.graphBoard.selectionManager.isSelected(el.id)
        );
        const elements = [...selected, ...others];
        
        if (elements.length < 2) return;
        
        let sorted, positions, isHorizontal;
        
        if (guide.label === 'spacingH') {
            sorted = [...elements].sort((a, b) => a.getBounds().left - b.getBounds().left);
            positions = sorted.map(el => el.getBounds().left);
            isHorizontal = true;
        } else if (guide.label === 'spacingV') {
            sorted = [...elements].sort((a, b) => a.getBounds().top - b.getBounds().top);
            positions = sorted.map(el => el.getBounds().top);
            isHorizontal = false;
        } else if (guide.label === 'centerSpacingH') {
            sorted = [...elements].sort((a, b) => a.getBounds().centerX - b.getBounds().centerX);
            positions = sorted.map(el => el.getBounds().centerX);
            isHorizontal = true;
        } else if (guide.label === 'centerSpacingV') {
            sorted = [...elements].sort((a, b) => a.getBounds().centerY - b.getBounds().centerY);
            positions = sorted.map(el => el.getBounds().centerY);
            isHorizontal = false;
        } else {
            return;
        }
        
        const spacing = guide.spacing || 20;
        const tickLength = Math.min(spacing / 2, 15);
        
        if (isHorizontal) {
            const minX = Math.min(...positions);
            const maxX = Math.max(...positions);
            const centerY = (guide.startY + guide.endY) / 2;
            
            for (let i = 0; i < positions.length - 1; i++) {
                const gapStart = positions[i];
                const gapEnd = positions[i + 1];
                const gapCenter = (gapStart + gapEnd) / 2;
                const gapSize = gapEnd - gapStart;
                
                const tick1 = document.createElementNS(this.svgNS, "line");
                tick1.setAttribute("x1", gapStart);
                tick1.setAttribute("y1", centerY - tickLength / 2);
                tick1.setAttribute("x2", gapStart);
                tick1.setAttribute("y2", centerY + tickLength / 2);
                tick1.setAttribute("stroke", color);
                tick1.setAttribute("stroke-width", "1");
                this.guideGroup.appendChild(tick1);
                
                const tick2 = document.createElementNS(this.svgNS, "line");
                tick2.setAttribute("x1", gapEnd);
                tick2.setAttribute("y1", centerY - tickLength / 2);
                tick2.setAttribute("x2", gapEnd);
                tick2.setAttribute("y2", centerY + tickLength / 2);
                tick2.setAttribute("stroke", color);
                tick2.setAttribute("stroke-width", "1");
                this.guideGroup.appendChild(tick2);
                
                const label = document.createElementNS(this.svgNS, "text");
                label.setAttribute("x", gapCenter);
                label.setAttribute("y", centerY);
                label.setAttribute("fill", color);
                label.setAttribute("font-size", "9");
                label.setAttribute("font-family", "sans-serif");
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("dominant-baseline", "middle");
                label.textContent = Math.round(gapSize);
                this.guideGroup.appendChild(label);
            }
        } else {
            const minY = Math.min(...positions);
            const maxY = Math.max(...positions);
            const centerX = (guide.startX + guide.endX) / 2;
            
            for (let i = 0; i < positions.length - 1; i++) {
                const gapStart = positions[i];
                const gapEnd = positions[i + 1];
                const gapCenter = (gapStart + gapEnd) / 2;
                const gapSize = gapEnd - gapStart;
                
                const tick1 = document.createElementNS(this.svgNS, "line");
                tick1.setAttribute("x1", centerX - tickLength / 2);
                tick1.setAttribute("y1", gapStart);
                tick1.setAttribute("x2", centerX + tickLength / 2);
                tick1.setAttribute("y2", gapStart);
                tick1.setAttribute("stroke", color);
                tick1.setAttribute("stroke-width", "1");
                this.guideGroup.appendChild(tick1);
                
                const tick2 = document.createElementNS(this.svgNS, "line");
                tick2.setAttribute("x1", centerX - tickLength / 2);
                tick2.setAttribute("y1", gapEnd);
                tick2.setAttribute("x2", centerX + tickLength / 2);
                tick2.setAttribute("y2", gapEnd);
                tick2.setAttribute("stroke", color);
                tick2.setAttribute("stroke-width", "1");
                this.guideGroup.appendChild(tick2);
                
                const label = document.createElementNS(this.svgNS, "text");
                label.setAttribute("x", centerX);
                label.setAttribute("y", gapCenter);
                label.setAttribute("fill", color);
                label.setAttribute("font-size", "9");
                label.setAttribute("font-family", "sans-serif");
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("dominant-baseline", "middle");
                label.textContent = Math.round(gapSize);
                this.guideGroup.appendChild(label);
            }
        }
    }

    getGuideColor(label) {
        const colors = {
            'left': '#ff6b6b',
            'right': '#ff6b6b',
            'top': '#4ecdc4',
            'bottom': '#4ecdc4',
            'centerH': '#ffe66d',
            'centerV': '#ffe66d',
            'spacingH': '#a29bfe',
            'spacingV': '#a29bfe',
            'centerSpacingH': '#fdcb6e',
            'centerSpacingV': '#fdcb6e'
        };
        return colors[label] || '#ffffff';
    }

    updateTransform(panX, panY, scale) {
        if (this.guideLayer) {
            this.guideLayer.setAttribute("transform", `translate(${panX}, ${panY}) scale(${scale})`);
        }
    }
}
