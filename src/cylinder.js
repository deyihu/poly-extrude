import { generateNormal } from './util';

export function cylinder(point, options = {}) {
    options = Object.assign({}, { radius: 1, height: 2, radialSegments: 6 }, options);
    const radialSegments = Math.round(Math.max(4, options.radialSegments));
    const { radius, height } = options;
    const aRad = 360 / radialSegments / 360 * Math.PI * 2;
    const circlePointsLen = (radialSegments + 1);
    const points = new Float32Array(circlePointsLen * 3 * 2);
    const [centerx, centery] = point;
    let idx = 0, uIdx = 0;
    const offset = circlePointsLen * 3, uOffset = circlePointsLen * 2;
    const indices = [], uvs = [];
    for (let i = -1; i < radialSegments; i++) {
        const rad = aRad * i;
        const x = Math.cos(rad) * radius + centerx, y = Math.sin(rad) * radius + centery;
        // bottom vertices
        points[idx] = x;
        points[idx + 1] = y;
        points[idx + 2] = 0;

        // top vertices
        points[idx + offset] = x;
        points[idx + 1 + offset] = y;
        points[idx + 2 + offset] = height;

        let u = 0, v = 0;
        u = 0.5 + x / radius / 2;
        v = 0.5 + y / radius / 2;
        uvs[uIdx] = u;
        uvs[uIdx + 1] = v;
        uvs[uIdx + uOffset] = u;
        uvs[uIdx + 1 + uOffset] = v;

        idx += 3;
        uIdx += 2;
        if (i > 1) {
            // bottom indices
            indices.push(0, i - 1, i);
        }
    }
    idx -= 3;
    points[idx] = points[0];
    points[idx + 1] = points[1];
    points[idx + 2] = points[2];
    const pointsLen = points.length;
    points[pointsLen - 3] = points[0];
    points[pointsLen - 2] = points[1];
    points[pointsLen - 1] = height;

    const indicesLen = indices.length;
    // top indices
    for (let i = 0; i < indicesLen; i++) {
        const index = indices[i];
        indices.push(index + circlePointsLen);
    }

    const sidePoints = new Float32Array((circlePointsLen * 3 * 2 - 6) * 2);
    let pIndex = -1;
    idx = circlePointsLen * 2;
    uIdx = 0;
    for (let i = 0, len = points.length / 2; i < len - 3; i += 3) {
        const x1 = points[i], y1 = points[i + 1], x2 = points[i + 3], y2 = points[i + 4];
        sidePoints[++pIndex] = x1;
        sidePoints[++pIndex] = y1;
        sidePoints[++pIndex] = height;
        sidePoints[++pIndex] = x2;
        sidePoints[++pIndex] = y2;
        sidePoints[++pIndex] = height;
        sidePoints[++pIndex] = x1;
        sidePoints[++pIndex] = y1;
        sidePoints[++pIndex] = 0;
        sidePoints[++pIndex] = x2;
        sidePoints[++pIndex] = y2;
        sidePoints[++pIndex] = 0;
        const a = idx + 2, b = idx + 3, c = idx, d = idx + 1;
        // indices.push(a, c, b, c, d, b);
        indices.push(c, a, d, a, b, d);
        idx += 4;
        const u1 = uIdx / circlePointsLen, u2 = (uIdx + 1) / circlePointsLen;
        uvs.push(u1, height / radius / 2, u2, height / radius / 2, u1, 0, u2, 0);
        uIdx++;
    }
    const position = new Float32Array(points.length + sidePoints.length);
    position.set(points, 0);
    position.set(sidePoints, points.length);
    const normal = generateNormal(indices, position);
    return { points, indices: new Uint32Array(indices), position, normal, uv: new Float32Array(uvs) };
}
