import { degToRad, generateNormal, generateSideWallUV, merge, radToDeg } from './util';

export function extrudePolylines(lines, options) {
    options = Object.assign({}, { depth: 2, lineWidth: 1 }, options);
    const results = lines.map(line => {
        const result = expandLine(line, options);
        result.line = line;
        generateTopAndBottom(result, options);
        generateSides(result, options);
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.index);
        result.uv = new Float32Array(result.uvs);
        result.normal = generateNormal(result.indices, result.position);
        return result;
    });
    const result = merge(results);
    result.lines = lines;
    return result;
}

function generateTopAndBottom(result, options) {
    const z = options.depth;
    const points = [], index = [], uvs = [];
    const { leftPoints, rightPoints } = result;
    let i = 0, len = leftPoints.length;
    while (i < len) {
        // top left
        const idx0 = i * 3;
        const [x1, y1, z1] = leftPoints[i];
        points[idx0] = x1;
        points[idx0 + 1] = y1;
        points[idx0 + 2] = z + z1;

        // top right
        const [x2, y2, z2] = rightPoints[i];
        const idx1 = len * 3 + idx0;
        points[idx1] = x2;
        points[idx1 + 1] = y2;
        points[idx1 + 2] = z + z2;

        // bottom left
        const idx2 = (len * 2) * 3 + idx0;
        points[idx2] = x1;
        points[idx2 + 1] = y1;
        points[idx2 + 2] = z1;

        // bottom right
        const idx3 = (len * 2) * 3 + len * 3 + idx0;
        points[idx3] = x2;
        points[idx3 + 1] = y2;
        points[idx3 + 2] = z2;

        i++;
    }
    i = 0;
    len = points.length;
    while (i < len) {
        const x = points[i], y = points[i + 1];
        uvs.push(x, y);
        i += 3;
    }
    i = 0;
    len = leftPoints.length;
    while (i < len - 1) {
        // top
        // left1 left2 right1,right2
        const a1 = i, b1 = i + 1, c1 = a1 + len, d1 = b1 + len;
        index.push(a1, c1, b1);
        index.push(c1, d1, b1);

        // bottom
        // left1 left2 right1,right2
        const len2 = len * 2;
        const a2 = i + len2, b2 = a2 + 1, c2 = a2 + len, d2 = b2 + len;
        index.push(a2, c2, b2);
        index.push(c2, d2, b2);
        i++;
    }
    result.index = index;
    result.points = points;
    result.uvs = uvs;
}

function generateSides(result, options) {
    const { points, index, leftPoints, rightPoints, uvs } = result;
    const z = options.depth;
    const rings = [leftPoints, rightPoints];

    function addOneSideIndex(v1, v2) {
        const idx = points.length / 3;
        points.push(v1[0], v1[1], z + v1[2], v2[0], v2[1], z + v2[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
        const a = idx + 2, b = idx + 3, c = idx, d = idx + 1;
        index.push(a, c, b, c, d, b);
        generateSideWallUV(uvs, points, a, b, c, d);
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
    let preAngle = 0;
    const radius = options.lineWidth / 2;
    const points = [], leftPoints = [], rightPoints = [];
    const len = line.length;
    let i = 0;
    while (i < len - 1) {
        const p1 = line[i],
            p2 = line[i + 1];
        const dy = p2[1] - p1[1],
            dx = p2[0] - p1[0];
        let rAngle = 0;
        const rad = Math.atan(dy / dx);
        const angle = radToDeg(rad);
        preAngle = angle;
        if (i === 0) {
            rAngle = angle;
            rAngle -= 90;
        } else {
            const p0 = line[i - 1];
            TEMPV1.x = p0[0] - p1[0];
            TEMPV1.y = p0[1] - p1[1];
            TEMPV2.x = p2[0] - p1[0];
            TEMPV2.y = p2[1] - p1[1];
            const vAngle = getAngle(TEMPV1, TEMPV2);
            rAngle = angle - vAngle / 2;
        }
        const rRad = degToRad(rAngle);
        const [op1, op2] = calOffsetPoint(rRad, radius, p1);
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
    let rAngle = preAngle;
    rAngle -= 90;
    const rRad = degToRad(rAngle);
    const p1 = line[len - 2];
    const p2 = line[len - 1];
    const [op1, op2] = calOffsetPoint(rRad, radius, p2);
    points.push(op1, op2);
    if (leftOnLine(op1, p1, p2)) {
        leftPoints.push(op1);
        rightPoints.push(op2);
    } else {
        leftPoints.push(op2);
        rightPoints.push(op1);
    }

    return { offsetPoints: points, leftPoints, rightPoints };
}

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

function leftOnLine(p, p1, p2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [x, y] = p;
    return (y1 - y2) * x + (x2 - x1) * y + x1 * y2 - x2 * y1 > 0;
}
