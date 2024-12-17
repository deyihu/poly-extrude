import { PolylineType, ResultType } from './type';
import { calLineDistance, degToRad, generateNormal, generateSideWallUV, merge, radToDeg } from './util';

function checkOptions(options) {
    options.lineWidth = Math.max(0, options.lineWidth);
    options.depth = Math.max(0, options.depth);
    options.sideDepth = Math.max(0, options.sideDepth);
}

type PolylinesOptions = {
    depth?: number;
    lineWidth?: number;
    bottomStickGround?: boolean;
    pathUV?: boolean;
}

type PolylinesResult = ResultType & {
    lines: Array<PolylineType>;
}

export function extrudePolylines(lines: Array<PolylineType>, options?: PolylinesOptions): PolylinesResult {
    options = Object.assign({}, { depth: 2, lineWidth: 1, bottomStickGround: false, pathUV: false }, options);
    checkOptions(options);
    const results = lines.map(line => {
        const result = expandLine(line, options) as Record<string, any>;
        result.line = line;
        generateTopAndBottom(result, options);
        generateSides(result, options);
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.indices);
        result.uv = new Float32Array(result.uv);
        result.normal = generateNormal(result.indices, result.position);
        return result;
    });
    const result = merge(results as Array<ResultType>) as PolylinesResult;
    result.lines = lines;
    return result;
}

type SlopesOptions = PolylinesOptions & {
    side?: 'left' | 'right',
    sideDepth?: number
}

export function extrudeSlopes(lines: Array<PolylineType>, options?: SlopesOptions): PolylinesResult {
    options = Object.assign({}, { depth: 2, lineWidth: 1, side: 'left', sideDepth: 0, bottomStickGround: false, pathUV: false, isSlope: true }, options);
    checkOptions(options);
    const { depth, side, sideDepth } = options;
    const results = lines.map(line => {
        const tempResult = expandLine(line, options);
        tempResult.line = line;
        const { leftPoints, rightPoints } = tempResult;
        const result: Record<string, any> = { line };
        let depths;
        for (let i = 0, len = line.length; i < len; i++) {
            line[i][2] = line[i][2] || 0;
        }
        if (side === 'left') {
            result.leftPoints = leftPoints;
            result.rightPoints = line;
            depths = [sideDepth, depth];
        } else {
            result.leftPoints = line;
            result.rightPoints = rightPoints;
            depths = [depth, sideDepth];
        }
        result.depths = depths;
        generateTopAndBottom(result, options);
        generateSides(result, options);
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.indices);
        result.uv = new Float32Array(result.uv);
        result.normal = generateNormal(result.indices, result.position);
        return result;
    });
    const result = merge(results as Array<ResultType>) as PolylinesResult;
    result.lines = lines;
    return result;
}

function generateTopAndBottom(result, options) {
    const bottomStickGround = options.bottomStickGround;
    const z = options.depth;
    const depths = result.depths;
    let lz = z, rz = z;
    if (depths) {
        lz = depths[0];
        rz = depths[1];
    }
    const { leftPoints, rightPoints } = result;
    const line = result.line;
    const pathUV = options.pathUV;
    if (pathUV) {
        calLineDistance(line);
        for (let i = 0, len = line.length; i < len; i++) {
            leftPoints[i].distance = rightPoints[i].distance = line[i].distance;
        }
    }
    let i = 0, len = leftPoints.length;
    const points: number[] = [], indices: number[] = [], uv: number[] = [];
    while (i < len) {
        // top left
        const idx0 = i * 3;
        const [x1, y1, z1] = leftPoints[i];
        points[idx0] = x1;
        points[idx0 + 1] = y1;
        points[idx0 + 2] = lz + z1;

        // top right
        const [x2, y2, z2] = rightPoints[i];
        const idx1 = len * 3 + idx0;
        points[idx1] = x2;
        points[idx1 + 1] = y2;
        points[idx1 + 2] = rz + z2;

        // bottom left
        const idx2 = (len * 2) * 3 + idx0;
        points[idx2] = x1;
        points[idx2 + 1] = y1;
        points[idx2 + 2] = z1;
        if (bottomStickGround) {
            points[idx2 + 2] = 0;
        }

        // bottom right
        const idx3 = (len * 2) * 3 + len * 3 + idx0;
        points[idx3] = x2;
        points[idx3 + 1] = y2;
        points[idx3 + 2] = z2;
        if (bottomStickGround) {
            points[idx3 + 2] = 0;
        }

        // generate path uv
        if (pathUV) {
            const p = line[i];
            const uvx = p.distance;

            const uIndex0 = i * 2;
            uv[uIndex0] = uvx;
            uv[uIndex0 + 1] = 1;

            const uIndex1 = len * 2 + uIndex0;
            uv[uIndex1] = uvx;
            uv[uIndex1 + 1] = 0;

            const uIndex2 = (len * 2) * 2 + uIndex0;
            uv[uIndex2] = uvx;
            uv[uIndex2 + 1] = 1;

            const uIndex3 = (len * 2) * 2 + len * 2 + uIndex0;
            uv[uIndex3] = uvx;
            uv[uIndex3 + 1] = 0;

        }
        i++;
    }
    if (!pathUV) {
        i = 0;
        len = points.length;
        let uIndex = uv.length - 1;
        while (i < len) {
            const x = points[i], y = points[i + 1];
            uv[++uIndex] = x;
            uv[++uIndex] = y;
            // uvs.push(x, y);
            i += 3;
        }
    }

    i = 0;
    len = leftPoints.length;
    let iIndex = indices.length - 1;
    while (i < len - 1) {
        // top
        // left1 left2 right1,right2
        const a1 = i, b1 = i + 1, c1 = a1 + len, d1 = b1 + len;
        indices[++iIndex] = a1;
        indices[++iIndex] = c1;
        indices[++iIndex] = b1;
        indices[++iIndex] = c1;
        indices[++iIndex] = d1;
        indices[++iIndex] = b1;
        // index.push(a1, c1, b1);
        // index.push(c1, d1, b1);

        // bottom
        // left1 left2 right1,right2
        const len2 = len * 2;
        const a2 = i + len2, b2 = a2 + 1, c2 = a2 + len, d2 = b2 + len;
        indices[++iIndex] = a2;
        indices[++iIndex] = c2;
        indices[++iIndex] = b2;
        indices[++iIndex] = c2;
        indices[++iIndex] = d2;
        indices[++iIndex] = b2;
        // index.push(a2, c2, b2);
        // index.push(c2, d2, b2);
        i++;
    }
    result.indices = indices;
    result.points = points;
    result.uv = uv;
    if (depths) {
        len = leftPoints.length;
        i = 0;
        while (i < len) {
            leftPoints[i].depth = lz;
            rightPoints[i].depth = rz;
            i++;
        }
    }
}

function generateSides(result, options) {
    const { points, indices, leftPoints, rightPoints, uv } = result;
    const z = options.depth;
    const bottomStickGround = options.bottomStickGround;
    const rings = [leftPoints, rightPoints];
    const depthsEnable = result.depths;
    const pathUV = options.pathUV;
    const lineWidth = options.lineWidth;

    let pIndex = points.length - 1;
    let iIndex = indices.length - 1;
    let uIndex = uv.length - 1;

    function addOneSideIndex(v1, v2) {
        const idx = points.length / 3;
        // let pIndex = points.length - 1;

        const v1Depth = (depthsEnable ? v1.depth : z);
        const v2Depth = (depthsEnable ? v2.depth : z);

        // top
        points[++pIndex] = v1[0];
        points[++pIndex] = v1[1];
        points[++pIndex] = v1Depth + v1[2];

        points[++pIndex] = v2[0];
        points[++pIndex] = v2[1];
        points[++pIndex] = v2Depth + v2[2];

        // points.push(v1[0], v1[1], (depthsEnable ? v1.depth : z) + v1[2], v2[0], v2[1], (depthsEnable ? v2.depth : z) + v2[2]);

        // bottom

        points[++pIndex] = v1[0];
        points[++pIndex] = v1[1];
        points[++pIndex] = bottomStickGround ? 0 : v1[2];

        points[++pIndex] = v2[0];
        points[++pIndex] = v2[1];
        points[++pIndex] = bottomStickGround ? 0 : v2[2];

        // points.push(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);

        const a = idx + 2, b = idx + 3, c = idx, d = idx + 1;
        indices[++iIndex] = a;
        indices[++iIndex] = c;
        indices[++iIndex] = b;
        indices[++iIndex] = c;
        indices[++iIndex] = d;
        indices[++iIndex] = b;
        // index.push(a, c, b, c, d, b);
        if (!pathUV) {
            generateSideWallUV(uv, points, a, b, c, d);
        } else {
            uv[++uIndex] = v1.distance;
            uv[++uIndex] = v1Depth / lineWidth;

            uv[++uIndex] = v2.distance;
            uv[++uIndex] = v2Depth / lineWidth;

            uv[++uIndex] = v1.distance;
            uv[++uIndex] = 0;

            uv[++uIndex] = v2.distance;
            uv[++uIndex] = 0;
        }
    }

    for (let i = 0, len = rings.length; i < len; i++) {
        let ring = rings[i];
        if (i > 0) {
            ring = ring.map(p => {
                return p;
            });
            ring = ring.reverse();
        }
        let j = 0;
        const len1 = ring.length - 1;
        while (j < len1) {
            const v1 = ring[j];
            const v2 = ring[j + 1];
            addOneSideIndex(v1, v2);
            j++;
        }
    }
    const len = leftPoints.length;
    const vs = [rightPoints[0], leftPoints[0], leftPoints[len - 1], rightPoints[len - 1]];
    for (let i = 0; i < vs.length; i += 2) {
        const v1 = vs[i], v2 = vs[i + 1];
        addOneSideIndex(v1, v2);
    }
}

const TEMPV1 = { x: 0, y: 0 }, TEMPV2 = { x: 0, y: 0 };

export function expandLine(line, options) {
    // let preAngle = 0;
    let radius = options.lineWidth / 2;
    if (options.isSlope) {
        radius *= 2;
    }
    const points: Array<number[]> = [], leftPoints: Array<number[]> = [], rightPoints: Array<number[]> = [];
    const len = line.length;
    let i = 0;
    while (i < len) {
        let p1 = line[i],
            p2 = line[i + 1];
        const currentp = line[i];
        // last vertex
        if (i === len - 1) {
            p1 = line[len - 2];
            p2 = line[len - 1];
        }
        const dy = p2[1] - p1[1],
            dx = p2[0] - p1[0];
        let rAngle = 0;
        const rad = Math.atan(dy / dx);
        const angle = radToDeg(rad);
        // preAngle = angle;
        if (i === 0 || i === len - 1) {
            rAngle = angle;
            rAngle -= 90;
        } else {
            // 至少3个顶点才会触发
            const p0 = line[i - 1];
            TEMPV1.x = p0[0] - p1[0];
            TEMPV1.y = p0[1] - p1[1];
            TEMPV2.x = p2[0] - p1[0];
            TEMPV2.y = p2[1] - p1[1];
            const vAngle = getAngle(TEMPV1, TEMPV2);
            rAngle = angle - vAngle / 2;
        }
        const rRad = degToRad(rAngle);
        const p3 = currentp;
        const x = Math.cos(rRad) + p3[0], y = Math.sin(rRad) + p3[1];
        const p4 = [x, y];
        const [line1, line2] = translateLine(p1, p2, radius);
        let op1 = lineIntersection(line1[0], line1[1], p3, p4);
        let op2 = lineIntersection(line2[0], line2[1], p3, p4);
        // 平行，回头路
        if (!op1 || !op2) {
            const len1 = points.length;
            const point1 = points[len1 - 2];
            const point2 = points[len1 - 1];
            if (!point1 || !point2) {
                continue;
            }
            op1 = [point1[0], point1[1]];
            op2 = [point2[0], point2[1]];
        }
        op1[2] = currentp[2] || 0;
        op2[2] = currentp[2] || 0;
        // const [op1, op2] = calOffsetPoint(rRad, radius, p1);
        points.push(op1, op2);
        if (leftOnLine(op1, p1, p2)) {
            leftPoints.push(op1);
            rightPoints.push(op2);
        } else {
            leftPoints.push(op2);
            rightPoints.push(op1);
        }
        i++;
    }

    return { offsetPoints: points, leftPoints, rightPoints, line };
}

// eslint-disable-next-line no-unused-vars
function calOffsetPoint(rad, radius, p) {
    const [x, y] = p;
    const z = p[2] || 0;
    const x1 = Math.cos(rad) * radius, y1 = Math.sin(rad) * radius;
    const p1 = [x + x1, y + y1, z];
    const rad1 = rad += Math.PI;
    const x2 = Math.cos(rad1) * radius, y2 = Math.sin(rad1) * radius;
    const p2 = [x + x2, y + y2, z];
    return [p1, p2];
}

const getAngle = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => {
    const dot = x1 * x2 + y1 * y2;
    const det = x1 * y2 - y1 * x2;
    const angle = Math.atan2(det, dot) / Math.PI * 180;
    return (angle + 360) % 360;
};

export function leftOnLine(p, p1, p2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [x, y] = p;
    return (y1 - y2) * x + (x2 - x1) * y + x1 * y2 - x2 * y1 > 0;
}

/**
 * 平移线
 * @param {*} p1
 * @param {*} p2
 * @param {*} distance
 * @returns
 */
function translateLine(p1, p2, distance) {
    const dy = p2[1] - p1[1], dx = p2[0] - p1[0];
    const rad = Math.atan2(dy, dx);
    const rad1 = rad + Math.PI / 2;
    let offsetX = Math.cos(rad1) * distance, offsetY = Math.sin(rad1) * distance;
    const tp1 = [p1[0] + offsetX, p1[1] + offsetY];
    const tp2 = [p2[0] + offsetX, p2[1] + offsetY];
    const rad2 = rad - Math.PI / 2;
    offsetX = Math.cos(rad2) * distance;
    offsetY = Math.sin(rad2) * distance;
    const tp3 = [p1[0] + offsetX, p1[1] + offsetY];
    const tp4 = [p2[0] + offsetX, p2[1] + offsetY];
    return [[tp1, tp2], [tp3, tp4]];
}

/**
 * 直线交点
 * @param {*} p1
 * @param {*} p2
 * @param {*} p3
 * @param {*} p4
 * @returns
 */
function lineIntersection(p1, p2, p3, p4): Array<number> | null {
    const dx1 = p2[0] - p1[0], dy1 = p2[1] - p1[1];
    const dx2 = p4[0] - p3[0], dy2 = p4[1] - p3[1];
    if (dx1 === 0 && dx2 === 0) {
        return null;
    }
    if (dy1 === 0 && dy2 === 0) {
        return null;
    }

    const k1 = dy1 / dx1;
    const k2 = dy2 / dx2;

    const b1 = p1[1] - k1 * p1[0];
    const b2 = p3[1] - k2 * p3[0];

    let x, y;

    if (dx1 === 0) {
        x = p1[0];
        y = k2 * x + b2;
    } else if (dx2 === 0) {
        x = p3[0];
        y = k1 * x + b1;
    } else if (dy1 === 0) {
        y = p1[1];
        x = (y - b2) / k2;
    } else if (dy2 === 0) {
        y = p3[1];
        x = (y - b1) / k1;
    } else {
        x = (b2 - b1) / (k1 - k2);
        y = k1 * x + b1;
    }
    return [x, y];
}
