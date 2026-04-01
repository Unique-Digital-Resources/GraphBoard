/**
 * Path calculation methods for edge routing.
 * Each method receives source/target positions and port directions,
 * returns an SVG path `d` attribute string.
 *
 * Users can register custom path methods via PathMethods.register(name, fn).
 */

const registry = {};

function pointsToSmoothPath(points, r) {
    if (!points || points.length < 2) return '';
    r = r || 10;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1], curr = points[i], next = points[i + 1];
        const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);
        const cr = Math.min(r, d1 / 2, d2 / 2);
        if (cr < 1) { d += ` L ${curr.x} ${curr.y}`; continue; }
        const bx = curr.x - (curr.x - prev.x) / d1 * cr, by = curr.y - (curr.y - prev.y) / d1 * cr;
        const ax = curr.x + (next.x - curr.x) / d2 * cr, ay = curr.y + (next.y - curr.y) / d2 * cr;
        d += ` L ${bx} ${by} Q ${curr.x} ${curr.y} ${ax} ${ay}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
}

// ────────────────────────────────────────────
//  Default: smooth cubic bezier
// ────────────────────────────────────────────
function calcDefault(sx, sy, tx, ty, sDir, tDir) {
    const dist = Math.hypot(tx - sx, ty - sy);
    const off = Math.max(50, Math.min(dist * 0.45, 220));
    let cx1 = sx, cy1 = sy, cx2 = tx, cy2 = ty;
    switch (sDir) {
        case 'right': cx1 += off; break;
        case 'left': cx1 -= off; break;
        case 'bottom': cy1 += off; break;
        case 'top': cy1 -= off; break;
    }
    switch (tDir) {
        case 'right': cx2 += off; break;
        case 'left': cx2 -= off; break;
        case 'bottom': cy2 += off; break;
        case 'top': cy2 -= off; break;
    }
    return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
}

// ────────────────────────────────────────────
//  Straight: direct line
// ────────────────────────────────────────────
function calcStraight(sx, sy, tx, ty) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
}

// ────────────────────────────────────────────
//  Squared: orthogonal routing with rounded corners
// ────────────────────────────────────────────
function calcSquared(sx, sy, tx, ty, sDir, tDir) {
    // Compute how far we can extend from each port before hitting the other port's axis
    function availableForDir(px, py, dir) {
        switch (dir) {
            case 'right': return Math.max(0, tx - px);
            case 'left': return Math.max(0, px - tx);
            case 'bottom': return Math.max(0, ty - py);
            case 'top': return Math.max(0, py - ty);
        }
        return 0;
    }

    const BASE_OFF = 40;
    const MIN_OFF = 8;

    // Available distance along each port's outgoing direction
    const availS = availableForDir(sx, sy, sDir);
    const availT = availableForDir(tx, ty, tDir);

    // Shrink offset when nodes are close — cap at 40% of available, never below MIN_OFF
    const offS = Math.max(MIN_OFF, Math.min(BASE_OFF, availS * 0.4));
    const offT = Math.max(MIN_OFF, Math.min(BASE_OFF, availT * 0.4));

    // Offset points from each port
    let ax = sx, ay = sy;
    switch (sDir) {
        case 'right': ax += offS; break;
        case 'left': ax -= offS; break;
        case 'bottom': ay += offS; break;
        case 'top': ay -= offS; break;
    }
    let bx = tx, by = ty;
    switch (tDir) {
        case 'right': bx += offT; break;
        case 'left': bx -= offT; break;
        case 'bottom': by += offT; break;
        case 'top': by -= offT; break;
    }

    const sH = sDir === 'left' || sDir === 'right';
    const tH = tDir === 'left' || tDir === 'right';
    let pts = [{ x: sx, y: sy }, { x: ax, y: ay }];

    if (!sH && !tH) {
        // Both vertical → horizontal bridge
        let midY;
        if (sDir === tDir) {
            midY = (sDir === 'bottom')
                ? Math.max(ay, by) + Math.min(offS, offT) * 0.5
                : Math.min(ay, by) - Math.min(offS, offT) * 0.5;
        } else {
            midY = (ay + by) / 2;
        }
        pts.push({ x: ax, y: midY }, { x: bx, y: midY });
    } else if (sH && tH) {
        // Both horizontal → vertical bridge
        let midX;
        if (sDir === tDir) {
            midX = (sDir === 'right')
                ? Math.max(ax, bx) + Math.min(offS, offT) * 0.5
                : Math.min(ax, bx) - Math.min(offS, offT) * 0.5;
        } else {
            midX = (ax + bx) / 2;
        }
        pts.push({ x: midX, y: ay }, { x: midX, y: by });
    } else if (sH) {
        pts.push({ x: bx, y: ay });
    } else {
        pts.push({ x: ax, y: by });
    }

    pts.push({ x: bx, y: by }, { x: tx, y: ty });
    return pointsToSmoothPath(pts, 10);
}

// ────────────────────────────────────────────
//  A* orthogonal pathfinding — routes around nodes
// ────────────────────────────────────────────
function calcAStar(sx, sy, tx, ty, sDir, tDir, opts = {}) {
    const blockedCells = opts.blockedCells || new Uint8Array(0);
    const gridW = opts.gridW || 0;
    const gridH = opts.gridH || 0;
    const CELL = opts.cellSize || 14;

    if (blockedCells.length === 0 || gridW === 0 || gridH === 0) {
        return calcSquared(sx, sy, tx, ty, sDir, tDir);
    }

    // Use screen-space coords for grid search (grid is built in screen space)
    const srcS = opts.srcScreen || { x: sx, y: sy };
    const tgtS = opts.tgtScreen || { x: tx, y: ty };

    const W = gridW, H = gridH;
    const si = clamp(Math.floor(srcS.x / CELL), 0, W - 1);
    const sj = clamp(Math.floor(srcS.y / CELL), 0, H - 1);
    const ei = clamp(Math.floor(tgtS.x / CELL), 0, W - 1);
    const ej = clamp(Math.floor(tgtS.y / CELL), 0, H - 1);

    // Copy blocked grid and unblock start/end cells + neighbors
    const blocked = new Uint8Array(blockedCells);
    const clear = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) blocked[y * W + x] = 0; };
    clear(si, sj); clear(ei, ej);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        clear(si + dx, sj + dy); clear(ei + dx, ej + dy);
    }

    // 4-directional A* (Manhattan movement → orthogonal path)
    const gScore = new Float32Array(W * H).fill(1e9);
    const parent = new Int32Array(W * H).fill(-1);
    const closed = new Uint8Array(W * H);
    const h = (x, y) => Math.abs(x - ei) + Math.abs(y - ej); // Manhattan heuristic

    gScore[sj * W + si] = 0;
    const open = [{ x: si, y: sj, f: h(si, sj) }];
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (open.length > 0) {
        // Find lowest f-score
        let bi = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[bi].f) bi = i;
        }
        const cur = open.splice(bi, 1)[0];
        const ci = cur.y * W + cur.x;

        // Reached goal
        if (cur.x === ei && cur.y === ej) {
            const invScale = opts.invScale || 1;
            const invPanX = opts.invPanX || 0;
            const invPanY = opts.invPanY || 0;
            const s2w = (px) => px * invScale + invPanX;
            const s2wy = (py) => py * invScale + invPanY;
            return buildOrthogonalPath(
                si, sj, ei, ej, parent, W, CELL,
                srcS.x, srcS.y, tgtS.x, tgtS.y,
                sDir, tDir, s2w, s2wy
            );
        }

        if (closed[ci]) continue;
        closed[ci] = 1;

        for (const [dx, dy] of dirs) {
            const nx = cur.x + dx, ny = cur.y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const ni = ny * W + nx;
            if (blocked[ni] || closed[ni]) continue;
            const ng = gScore[ci] + 1;
            if (ng < gScore[ni]) {
                gScore[ni] = ng;
                parent[ni] = ci;
                open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
            }
        }
    }

    // No path found → fall back to squared
    return calcSquared(sx, sy, tx, ty, sDir, tDir);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function buildOrthogonalPath(si, sj, ei, ej, parent, W, CELL, sx, sy, tx, ty, sDir, tDir, s2w, s2wy) {
    // Default identity conversion if not provided
    s2w = s2w || (v => v);
    s2wy = s2wy || s2w;

    // Trace parent chain
    const cells = [];
    let idx = ej * W + ei;
    while (idx !== -1) {
        cells.unshift({ cx: idx % W, cy: Math.floor(idx / W) });
        idx = parent[idx];
    }

    // Convert grid cells to world-space points, keeping only direction-change waypoints
    const points = [];
    for (let i = 0; i < cells.length; i++) {
        const screenX = cells[i].cx * CELL + CELL / 2;
        const screenY = cells[i].cy * CELL + CELL / 2;
        if (i === 0 || i === cells.length - 1) {
            points.push({ x: s2w(screenX), y: s2wy(screenY) });
        } else {
            const prev = cells[i - 1], curr = cells[i], next = cells[i + 1];
            const dx1 = curr.cx - prev.cx, dy1 = curr.cy - prev.cy;
            const dx2 = next.cx - curr.cx, dy2 = next.cy - curr.cy;
            if (dx1 !== dx2 || dy1 !== dy2) {
                points.push({ x: s2w(screenX), y: s2wy(screenY) });
            }
        }
    }

    // Snap first/last to exact port positions (already in world space)
    if (points.length > 0) { points[0].x = s2w(sx); points[0].y = s2wy(sy); }
    if (points.length > 1) { points[points.length - 1].x = s2w(tx); points[points.length - 1].y = s2wy(ty); }

    // Add lead-out segment from source port
    if (points.length >= 2) {
        const LEAD_SCREEN = 12;
        let lx = sx, ly = sy;
        switch (sDir) {
            case 'right': lx += LEAD_SCREEN; break;
            case 'left': lx -= LEAD_SCREEN; break;
            case 'bottom': ly += LEAD_SCREEN; break;
            case 'top': ly -= LEAD_SCREEN; break;
        }
        const dx = points[1].x - s2w(sx), dy = points[1].y - s2wy(sy);
        if (Math.abs(dx) > LEAD_SCREEN || Math.abs(dy) > LEAD_SCREEN) {
            points.splice(1, 0, { x: s2w(lx), y: s2wy(ly) });
        }
    }

    // Add lead-in segment to target port
    if (points.length >= 2) {
        const LEAD_SCREEN = 12;
        let lx = tx, ly = ty;
        switch (tDir) {
            case 'right': lx += LEAD_SCREEN; break;
            case 'left': lx -= LEAD_SCREEN; break;
            case 'bottom': ly += LEAD_SCREEN; break;
            case 'top': ly -= LEAD_SCREEN; break;
        }
        const last = points.length - 1;
        const prev = points[last - 1];
        const dx = s2w(tx) - prev.x, dy = s2wy(ty) - prev.y;
        if (Math.abs(dx) > LEAD_SCREEN || Math.abs(dy) > LEAD_SCREEN) {
            points.splice(last, 0, { x: s2w(lx), y: s2wy(ly) });
        }
    }

    return pointsToSmoothPath(points, 8);
}

// Register built-in methods
registry.default = calcDefault;
registry.straight = calcStraight;
registry.squared = calcSquared;
registry.astar = calcAStar;

export const PathMethods = {
    /**
     * Compute an SVG path string for an edge.
     * @param {string} method - Name of the registered path method
     * @param {number} sx - Source x
     * @param {number} sy - Source y
     * @param {number} tx - Target x
     * @param {number} ty - Target y
     * @param {string} sDir - Source port direction
     * @param {string} tDir - Target port direction
     * @param {object} [opts] - Extra options (e.g. blockedCells for astar)
     * @returns {string} SVG path `d` attribute
     */
    compute(method, sx, sy, tx, ty, sDir, tDir, opts) {
        const fn = registry[method] || registry.default;
        return fn(sx, sy, tx, ty, sDir, tDir, opts);
    },

    /**
     * Register a custom path calculation method.
     * @param {string} name - Method identifier
     * @param {function} fn - (sx, sy, tx, ty, sDir, tDir, opts) => string
     */
    register(name, fn) {
        registry[name] = fn;
    },

    /**
     * Check if a method is registered.
     */
    has(name) {
        return name in registry;
    },

    /**
     * List all registered method names.
     */
    list() {
        return Object.keys(registry);
    },

    /**
     * Helper exposed for custom methods.
     */
    pointsToSmoothPath
};
