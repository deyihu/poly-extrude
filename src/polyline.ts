import { PolylineType, ResultType } from './type';
import { calLineDistance, degToRad, generateNormal, generateSideWallUV, merge, radToDeg } from './util';

function checkOptions(options) {
    options.lineWidth = Math.max(0, options.lineWidth);
    options.depth = Math.max(0, options.depth);
    options.sideDepth = Math.max(0, options.sideDepth);
}

type ExpandLineOptions = {
    lineWidth?: number;
    cutCorner?: boolean;
}

type PolylinesOptions = ExpandLineOptions & {
    depth?: number;
    bottomStickGround?: boolean;
    pathUV?: boolean;
}

type SlopesOptions = PolylinesOptions & {
    side?: 'left' | 'right',
    sideDepth?: number
}


type PolylinesResult = ResultType & {
    lines: Array<PolylineType>;
}

export function extrudePolylines(lines: Array<PolylineType>, opts?: PolylinesOptions): PolylinesResult {
    const options = Object.assign({}, { depth: 2, lineWidth: 1, bottomStickGround: false, pathUV: false }, opts);
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
    const result = merge<PolylinesResult>(results as Array<ResultType>);
    result.lines = lines;
    return result;
}

export function extrudeSlopes(lines: Array<PolylineType>, opts?: SlopesOptions): PolylinesResult {
    const options = Object.assign({}, { depth: 2, lineWidth: 1, side: 'left', sideDepth: 0, bottomStickGround: false, pathUV: false, isSlope: true }, opts);
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
    const result = merge<PolylinesResult>(results as Array<ResultType>);
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
    let uvCalPath = line;
    // let needCalUV = false;
    if (leftPoints.length > uvCalPath.length) {
        uvCalPath = leftPoints;
    }
    if (pathUV) {
        calLineDistance(uvCalPath);
        for (let i = 0, len = uvCalPath.length; i < len; i++) {
            leftPoints[i].distance = rightPoints[i].distance = uvCalPath[i].distance;
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

        // const p1 = leftPoints[i];

        // top right
        const [x2, y2, z2] = rightPoints[i];
        const idx1 = len * 3 + idx0;
        points[idx1] = x2;
        points[idx1 + 1] = y2;
        points[idx1 + 2] = rz + z2;

        // const p2 = rightPoints[i];

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
            const p = uvCalPath[i];
            let uvx = p.distance;

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

export function expandLine(line, options?: ExpandLineOptions) {
    options = Object.assign({}, { lineWidth: 1, cutCorner: false }, options);
    let radius = options.lineWidth / 2;
    if ((options as any).isSlope) {
        radius *= 2;
    }
    const { cutCorner } = options;
    const points: Array<number[]> = [], leftPoints: Array<number[]> = [], rightPoints: Array<number[]> = [];
    const len = line.length;

    const repeatVertex = () => {
        const len1 = leftPoints.length;
        if (len1) {
            leftPoints.push(leftPoints[len1 - 1]);
            rightPoints.push(rightPoints[len1 - 1]);
            const len2 = points.length;
            points.push(points[len2 - 2], points[len2 - 1]);
        }
    };

    const equal = (p1, p2) => {
        return p1[0] === p2[0] && p1[1] === p2[1];
    };

    let i = 0;
    let preleftline, prerightline;
    while (i < len) {
        let p0;
        let p1 = line[i],
            p2 = line[i + 1];
        const currentp = p1;
        // last vertex
        if (i === len - 1) {
            p1 = line[len - 2];
            p2 = line[len - 1];
            if (equal(p1, p2)) {
                for (let j = line.indexOf(p1); j >= 0; j--) {
                    const p = line[j];
                    if (!equal(p, currentp)) {
                        p1 = p;
                        break;
                    }
                }
            }
        } else {
            if (equal(p1, p2)) {
                for (let j = line.indexOf(p2); j < len; j++) {
                    const p = line[j];
                    if (!equal(p, currentp)) {
                        p2 = p;
                        break;
                    }
                }
            }
        }
        if (equal(p1, p2)) {
            repeatVertex();
            i++;
            continue;
        }

        let dy = p2[1] - p1[1],
            dx = p2[0] - p1[0];

        let rAngle = 0;
        const rad = Math.atan2(dy, dx);
        const angle = radToDeg(rad);
        if (i === 0 || i === len - 1) {
            rAngle = angle;
            rAngle -= 90;
        } else {
            // 至少3个顶点才会触发
            p0 = line[i - 1];
            if (equal(p0, p2) || equal(p0, p1)) {
                for (let j = line.indexOf(p2); j >= 0; j--) {
                    const p = line[j];
                    if (!equal(p, p2) && (!equal(p, p1))) {
                        p0 = p;
                        break;
                    }
                }
            }
            if (equal(p0, p2) || equal(p0, p1) || equal(p1, p2)) {
                repeatVertex();
                i++;
                continue;
            }
            const dy1 = p1[1] - p0[1], dx1 = p1[0] - p0[0];
            const rad1 = Math.atan2(dy1, dx1);
            const angle1 = radToDeg(rad1);
            // 平行，回头路
            if (Math.abs(Math.abs(angle1 - angle) - 180) <= 0.0001) {
                rAngle = angle;
                rAngle -= 90;
                console.log()
            } else {
                TEMPV1.x = p0[0] - p1[0];
                TEMPV1.y = p0[1] - p1[1];
                TEMPV2.x = p2[0] - p1[0];
                TEMPV2.y = p2[1] - p1[1];
                if ((TEMPV1.x === 0 && TEMPV1.y === 0) || (TEMPV2.x === 0 && TEMPV2.y === 0)) {
                    console.error('has repeat vertex,the index:', i);
                }
                const vAngle = getAngle(TEMPV1, TEMPV2);
                rAngle = angle - vAngle / 2;

            }
        }

        const rRad = degToRad(rAngle);
        const p3 = currentp;
        const x = Math.cos(rRad) + p3[0], y = Math.sin(rRad) + p3[1];
        const p4 = [x, y];
        const [leftline, rightline] = translateLine(p1, p2, radius);
        let op1 = lineIntersection(leftline[0], leftline[1], p3, p4);
        let op2 = lineIntersection(rightline[0], rightline[1], p3, p4);
        // 平行，回头路
        if (!op1 || !op2) {
            const len1 = points.length;
            const point1 = points[len1 - 2];
            const point2 = points[len1 - 1];
            if (!point1 || !point2) {
                i++;
                continue;
            }
            op1 = [point1[0], point1[1]];
            op2 = [point2[0], point2[1]];
        }
        op1[2] = currentp[2] || 0;
        op2[2] = currentp[2] || 0;
        // const [op1, op2] = calOffsetPoint(rRad, radius, p1);
        points.push(op1, op2);
        let needCut = false;
        if (cutCorner) {
            const bufferRadius = radius * 2;
            if (distance(currentp, op1) > bufferRadius || distance(currentp, op2) > bufferRadius) {
                needCut = true;
            }
        }
        if (needCut && p0 && preleftline && prerightline) {
            let cutPoint = op1;
            if (distance(op1, p0) < distance(op2, p0)) {
                cutPoint = op2;
            }
            const dy = cutPoint[1] - currentp[1], dx = cutPoint[0] - currentp[0];
            const cutAngle = Math.atan2(dy, dx) / Math.PI * 180;
            const cutRad = degToRad(cutAngle);
            const x1 = Math.cos(cutRad) * radius + currentp[0];
            const y1 = Math.sin(cutRad) * radius + currentp[1];
            const v1 = [x1, y1];

            const hcutangle = cutAngle + 90;
            // console.log(i, cutAngle, hcutangle);
            const hcutRad = degToRad(hcutangle);
            const x2 = Math.cos(hcutRad) + x1;
            const y2 = Math.sin(hcutRad) + y1;
            const v2 = [x2, y2];

            let preline = preleftline;
            let currentLine = leftline;
            let appendArray = leftPoints;
            let repeatArray = rightPoints;
            if (!leftOnLine(cutPoint, p1, p2)) {
                preline = prerightline;
                currentLine = rightline;
                appendArray = rightPoints;
                repeatArray = leftPoints;
            }

            let cross1 = lineIntersection(preline[0], preline[1], v1, v2);
            let cross2 = lineIntersection(currentLine[0], currentLine[1], v1, v2);

            cross1[2] = currentp[2] || 0;
            cross2[2] = currentp[2] || 0;
            const repeatPoint = cutPoint === op1 ? op2 : op1;
            appendArray.push(cross1, cross2);
            repeatArray.push(repeatPoint, [...repeatPoint]);
        } else {
            if (leftOnLine(op1, p1, p2)) {
                leftPoints.push(op1);
                rightPoints.push(op2);
            } else {
                leftPoints.push(op2);
                rightPoints.push(op1);
            }
        }

        preleftline = leftline;
        prerightline = rightline;

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
    return (angle);
    // return (angle + 360) % 360;
};

function distance(p1, p2) {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

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
export function translateLine(p1, p2, distance) {
    const dy = p2[1] - p1[1], dx = p2[0] - p1[0];
    if (dy === 0 && dx === 0) {
        return null;
    }
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
    //vertical 
    if (dx1 === 0 && dx2 === 0) {
        return null;
    }
    //horizontal
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
