
import earcut from 'earcut';
import { generateNormal, generateSideWallUV, isClockwise, merge, isClosedRing, validateRing, calPolygonPointsCount, validatePolygon } from './util';
import { PolylineType, PolygonType, ResultType } from './type';

type PolygonsOptions = {
    depth?: number,
    top?: boolean
}

type PolygonsResult = ResultType & {
    polygons: Array<PolygonType>;
}


export function extrudePolygons(polygons: Array<PolygonType>, opts?: PolygonsOptions): PolygonsResult {
    const options = Object.assign({}, { depth: 2, top: true }, opts);
    const results = polygons.map(polygon => {
        validatePolygon(polygon, true);
        const result = flatVertices(polygon, options) as Record<string, any>;
        result.polygon = polygon;
        const triangles = earcut(result.flatVertices, result.holes, 2);
        generateTopAndBottom(result, triangles, options);
        generateSides(result, options);
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.indices);
        result.uv = new Float32Array(result.uv);
        result.normal = generateNormal(result.indices, result.position);
        return result;
    });
    const result = merge<PolygonsResult>(results as Array<ResultType>);
    result.polygons = polygons;
    return result;

}

function generateTopAndBottom(result, triangles, options: PolygonsOptions) {
    const indices: number[] = [];
    const { count } = result;
    const top = options.top;
    for (let i = 0, len = triangles.length; i < len; i += 3) {
        // top
        const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
        if (top) {
            indices[i] = a;
            indices[i + 1] = b;
            indices[i + 2] = c;
        }
        // bottom
        let idx = len + i;
        const a1 = count + a, b1 = count + b, c1 = count + c;
        if (!top) {
            idx = i;
        }
        indices[idx] = a1;
        indices[idx + 1] = b1;
        indices[idx + 2] = c1;
    }
    result.indices = indices;
}

function generateSides(result, options) {
    const { points, indices, polygon, uv } = result;
    const depth = options.depth;
    let pIndex = points.length - 1;
    let iIndex = indices.length - 1;
    for (let i = 0, len = polygon.length; i < len; i++) {
        const ring = polygon[i];
        let j = 0;
        const len1 = ring.length;
        while (j < len1) {
            const v1 = ring[j];
            let v2 = ring[j + 1];
            if (j === len1 - 1) {
                v2 = ring[0];
            }
            const idx = points.length / 3;
            const x1 = v1[0], y1 = v1[1], z1 = v1[2] || 0, x2 = v2[0], y2 = v2[1], z2 = v2[2] || 0;
            points[++pIndex] = x1;
            points[++pIndex] = y1;
            points[++pIndex] = z1 + depth;
            points[++pIndex] = x2;
            points[++pIndex] = y2;
            points[++pIndex] = z2 + depth;
            points[++pIndex] = x1;
            points[++pIndex] = y1;
            points[++pIndex] = z1;
            points[++pIndex] = x2;
            points[++pIndex] = y2;
            points[++pIndex] = z2;
            // points.push(x1, y1, z, x2, y2, z, x1, y1, 0, x2, y2, 0);
            const a = idx + 2, b = idx + 3, c = idx, d = idx + 1;
            // points.push(p3, p4, p1, p2);
            // index.push(a, c, b, c, d, b);
            indices[++iIndex] = a;
            indices[++iIndex] = c;
            indices[++iIndex] = b;
            indices[++iIndex] = c;
            indices[++iIndex] = d;
            indices[++iIndex] = b;
            // index.push(c, d, b);

            generateSideWallUV(uv, points, a, b, c, d);
            j++;
        }
    }
}


function flatVertices(polygon, options) {
    const count = calPolygonPointsCount(polygon);
    const len = polygon.length;
    const holes: number[] = [], flatVertices = new Float32Array(count * 2), points: number[] = [], uv: number[] = [];
    const pOffset = count * 3, uOffset = count * 2;
    const depth = options.depth;

    let idx0 = 0, idx1 = 0, idx2 = 0;
    for (let i = 0; i < len; i++) {
        const ring = polygon[i];
        if (i > 0) {
            holes.push(idx0 / 2);
        }
        let j = 0;
        const len1 = ring.length;
        while (j < len1) {
            const c = ring[j];
            const x = c[0], y = c[1], z = c[2] || 0;

            flatVertices[idx0++] = x;
            flatVertices[idx0++] = y;

            // top vertices
            points[idx1] = x;
            points[idx1 + 1] = y;
            points[idx1 + 2] = depth + z;

            // bottom vertices
            points[pOffset + idx1] = x;
            points[pOffset + idx1 + 1] = y;
            points[pOffset + idx1 + 2] = z;

            uv[idx2] = x;
            uv[idx2 + 1] = y;

            uv[uOffset + idx2] = x;
            uv[uOffset + idx2 + 1] = y;

            idx1 += 3;
            idx2 += 2;
            j++;
        }
    }
    return {
        flatVertices,
        holes,
        points,
        count,
        uv
    };

}


function simplePolygon(polygon, options = {}) {
    const flatVertices = [], holes = [];
    let pIndex = -1, aIndex = -1, uvIndex = -1;
    const points = [], uv = [];
    for (let i = 0, len = polygon.length; i < len; i++) {
        const ring = polygon[i];
        if (i > 0) {
            holes.push(flatVertices.length / 2);
        }
        for (let j = 0, len1 = ring.length; j < len1; j++) {
            const c = ring[j];
            flatVertices[++pIndex] = c[0];
            flatVertices[++pIndex] = c[1];

            points[++aIndex] = c[0];
            points[++aIndex] = c[1];
            points[++aIndex] = c[2] || 0;

            uv[++uvIndex] = c[0];
            uv[++uvIndex] = c[1];
        }
    }
    const triangles = earcut(flatVertices, holes, 2);
    const normal = generateNormal(triangles, points);
    return {
        normal,
        uv,
        points,
        indices: triangles
    }
}

export function polygons(polygons, opts = {}): PolygonsResult {
    const options = Object.assign({}, opts);
    const results = polygons.map(polygon => {
        validatePolygon(polygon, true);

        const result = simplePolygon(polygon, options) as Record<string, any>;
        result.polygon = polygon;
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.indices);
        result.uv = new Float32Array(result.uv);
        result.normal = new Float32Array(result.normal);
        return result;
    });
    const result = merge<PolygonsResult>(results as Array<ResultType>);
    result.polygons = polygons;
    return result;



}
