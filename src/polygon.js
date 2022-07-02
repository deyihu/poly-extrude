
import earcut from 'earcut';
import { isClockwise } from './util';

export function extrudePolygons(polygons, options) {
    options = Object.assign({}, { depth: 2 }, options);
    const polygon = polygons[0];
    polygon.slice(1, Infinity).forEach((coordinates, index) => {
        if (isClockwise(coordinates)) {
            polygon[index + 1] = coordinates.reverse();
        }
    });
    const result = flatVertices(polygon, options);
    const triangles = earcut(result.flatVertices, result.holes, 2);
    const indices = generateIndices(result, triangles);
    result.indices = indices;
    result.normal = new Float32Array(result.position.length).fill(1, 0, result.position.length);
    return result;

}

function generateIndices(result, triangles) {
    const index = [];
    const { count } = result;
    for (let i = 0, len = triangles.length; i < len; i += 3) {
        const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
        index[i] = a;
        index[i + 1] = b;
        index[i + 2] = c;
        const idx = len + i;
        index[idx] = count + a;
        index[idx + 1] = count + b;
        index[idx + 2] = count + c;
    }
    generateRingsIndices(result, index);
    return new Uint32Array(index);

}

function generateRingsIndices(result, index) {
    const { holes, vertices, count } = result;
    let end = vertices.length;
    if (holes.length) {
        end = holes[0];
    }
    for (let i = 1; i < end - 1; i++) {
        const a = i, b = a + 1, c = a + count, d = b + count;
        index.push(a, c, b);
        index.push(c, d, b);

    }
    if (holes.length) {
        for (let r = 0, len = holes.length; r < len; r++) {
            const star = holes[r];
            end = holes[r + 1];
            if (end === undefined) {
                end = vertices.length;
            } else {
                // end++;
            }
            for (let i = star; i < end - 1; i++) {
                const a = i, b = a + 1, c = a + count, d = b + count;
                // index.push(c, a, b);
                // index.push(c, b, d);
                index.push(a, c, b);
                index.push(c, d, b);
            }
        }
    }
}

function calPolygonPointsCount(polygon) {
    let count = 0;
    let i = 0;
    const len = polygon.length;
    while (i < len) {
        count += polygon[i].length;
        i++;
    }
    return count;
}

function flatVertices(polygon, options) {
    const count = calPolygonPointsCount(polygon);
    const position = new Float32Array(count * 2 * 3);
    const len = polygon.length;
    let idx = 0;
    const holes = [], vertices = [], flatVertices = [];
    for (let i = 0; i < len; i++) {
        const ring = polygon[i];
        if (i > 0) {
            holes.push(vertices.length);
        }
        for (let j = 0, len1 = ring.length; j < len1; j++) {
            const c = ring[j];
            vertices.push(c);
            flatVertices.push(c[0], c[1]);
            position[idx] = c[0];
            idx++;
            position[idx] = c[1];
            idx++;
            position[idx] = 0;
            idx++;
        }
    }
    for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x = position[idx], y = position[idx + 1];
        const idx1 = (count + i) * 3;
        position[idx1] = x;
        position[idx1 + 1] = y;
        position[idx1 + 2] = options.depth;
    }
    return {
        vertices,
        flatVertices,
        holes,
        position,
        count
    };

}
