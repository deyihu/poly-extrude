
import earcut from 'earcut';
import { generateNormal, generateSideWallUV, isClockwise, merge } from './util';

export function extrudePolygons(polygons, options) {
    options = Object.assign({}, { depth: 2 }, options);
    const results = polygons.map(polygon => {
        if (!isClockwise(polygon[0])) {
            polygon[0] = polygon[0].reverse();
        }
        polygon.slice(1, Infinity).forEach((coordinates, index) => {
            if (isClockwise(coordinates)) {
                polygon[index + 1] = coordinates.reverse();
            }
        });
        polygon.forEach(ring => {
            const len = ring.length;
            const [x1, y1] = ring[0], [x2, y2] = ring[len - 1];
            if (x1 === x2 && y1 === y2) {
                ring.splice(len - 1, 1);
            }
        });
        const result = flatVertices(polygon, options);
        result.polygon = polygon;
        const triangles = earcut(result.flatVertices, result.holes, 2);
        generateTopAndBottom(result, triangles);
        generateSides(result, options);
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.index);
        result.uv = new Float32Array(result.uvs);
        result.normal = generateNormal(result.indices, result.position);
        return result;
    });
    const result = merge(results);
    result.polygons = polygons;
    return result;

}

function generateTopAndBottom(result, triangles) {
    const index = [];
    const { count } = result;
    for (let i = 0, len = triangles.length; i < len; i += 3) {
        // top
        const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
        index[i] = a;
        index[i + 1] = b;
        index[i + 2] = c;
        // bottom
        const idx = len + i;
        const a1 = count + a, b1 = count + b, c1 = count + c;
        index[idx] = a1;
        index[idx + 1] = b1;
        index[idx + 2] = c1;
    }
    result.index = index;
}

function generateSides(result, options) {
    const { points, index, polygon, uvs } = result;
    const z = options.depth;
    for (let i = 0, len = polygon.length; i < len; i++) {
        const ring = polygon[i];
        for (let j = 0, len1 = ring.length; j < len1; j++) {
            const v1 = ring[j];
            let v2 = ring[j + 1];
            if (j === len1 - 1) {
                v2 = ring[0];
            }
            // const p1 = [v1[0], v1[1], options.depth],
            //     p2 = [v2[0], v2[1], options.depth],
            //     p3 = [v1[0], v1[1], 0],
            //     p4 = [v2[0], v2[1], 0];
            const idx = points.length / 3;
            points.push(v1[0], v1[1], 0, v2[0], v2[1], 0, v1[0], v1[1], z, v2[0], v2[1], z);
            const a = idx, b = idx + 1, c = idx + 2, d = idx + 3;
            // points.push(p3, p4, p1, p2);
            index.push(a, c, b);
            index.push(c, d, b);

            generateSideWallUV(uvs, points, a, b, c, d);
        }
    }
}

function calPolygonPointsCount(polygon) {
    let count = 0;
    let i = 0;
    const len = polygon.length;
    while (i < len) {
        count += (polygon[i].length);
        i++;
    }
    return count;
}

function flatVertices(polygon, options) {
    const count = calPolygonPointsCount(polygon);
    const len = polygon.length;
    const holes = [], flatVertices = new Float32Array(count * 2), points = [], uvs = [];
    const pOffset = count * 3, uOffset = count * 2;
    const z = options.depth;

    let idx0 = 0, idx1 = 0, idx2 = 0;
    for (let i = 0; i < len; i++) {
        const ring = polygon[i];
        if (i > 0) {
            holes.push(idx0 / 2);
        }
        for (let j = 0, len1 = ring.length; j < len1; j++) {
            const c = ring[j];
            const x = c[0], y = c[1];

            flatVertices[idx0++] = x;
            flatVertices[idx0++] = y;

            // top vertices
            points[idx1] = x;
            points[idx1 + 1] = y;
            points[idx1 + 2] = z;

            // bottom vertices
            points[pOffset + idx1] = x;
            points[pOffset + idx1 + 1] = y;
            points[pOffset + idx1 + 2] = 0;

            uvs[idx2] = x;
            uvs[idx2 + 1] = y;

            uvs[uOffset + idx2] = x;
            uvs[uOffset + idx2 + 1] = y;

            idx1 += 3;
            idx2 += 2;
        }
    }
    return {
        flatVertices,
        holes,
        points,
        count,
        uvs
    };

}
