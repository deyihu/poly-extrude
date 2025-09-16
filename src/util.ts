import { Vector3 } from './math/Vector3';
import { PolygonType, PolylineType, ResultType } from './type';

type Point = Array<number>;

export function mergeArray(array1, array2) {
    let index = array1.length - 1;
    for (let i = 0, len = array2.length; i < len; i++) {
        array1[++index] = array2[i];
    }
}
/**
 * https://github.com/Turfjs/turf/blob/master/packages/turf-boolean-clockwise/index.ts
 * @param {*} ring
 * @returns
 */
export function isClockwise(ring: PolylineType) {
    let sum = 0;
    let i = 1;
    let prev;
    let cur;
    const len = ring.length;

    while (i < len) {
        prev = cur || ring[0];
        cur = ring[i];
        sum += (cur[0] - prev[0]) * (cur[1] + prev[1]);
        i++;
    }
    return sum > 0;
}


export function validateRing(ring: PolylineType) {
    if (!isClosedRing(ring)) {
        ring.push(ring[0]);
    }
}

export function isClosedRing(ring: PolylineType) {
    const len = ring.length;
    const [x1, y1] = ring[0], [x2, y2] = ring[len - 1];
    return (x1 === x2 && y1 === y2);
}

export function calPolygonPointsCount(polygon: PolygonType) {
    let count = 0;
    let i = 0;
    const len = polygon.length;
    while (i < len) {
        count += (polygon[i].length);
        i++;
    }
    return count;
}

export function getPolygonsBBOX(polygons, bbox?) {
    bbox = bbox || [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0, len = polygons.length; i < len; i++) {
        const p = polygons[i];
        if (Array.isArray(p[0][0])) {
            getPolygonsBBOX(p, bbox);
        } else {
            for (let j = 0, len1 = p.length; j < len1; j++) {
                const c = p[j];
                const [x, y] = c;
                bbox[0] = Math.min(bbox[0], x);
                bbox[1] = Math.min(bbox[1], y);
                bbox[2] = Math.max(bbox[2], x);
                bbox[3] = Math.max(bbox[3], y);
            }
        }
    }
    return bbox;
}

export function validatePolygon(polygon: PolygonType, ignoreEndPoint: boolean) {
    for (let i = 0, len = polygon.length; i < len; i++) {
        const ring = polygon[i];
        validateRing(ring);
        if (i === 0) {
            if (!isClockwise(ring)) {
                polygon[i] = ring.reverse();
            }
        } else if (isClockwise(ring)) {
            polygon[i] = ring.reverse();
        }
        if (ignoreEndPoint) {
            if (isClosedRing(ring)) {
                ring.splice(ring.length - 1, 1);
            }
        }
    }
}

function v3Sub(out, v1, v2) {
    out[0] = v1[0] - v2[0];
    out[1] = v1[1] - v2[1];
    out[2] = v1[2] - v2[2];
    return out;
}

function v3Normalize(out, v) {
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const d = Math.sqrt(x * x + y * y + z * z) || 1;
    out[0] = x / d;
    out[1] = y / d;
    out[2] = z / d;
    return out;
}

function v3Cross(out, v1, v2) {
    const ax = v1[0], ay = v1[1], az = v1[2],
        bx = v2[0], by = v2[1], bz = v2[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
}

export function generateNormal(indices, position) {

    function v3Set(p, a, b, c) {
        p[0] = a; p[1] = b; p[2] = c;
    }

    const p1 = [];
    const p2 = [];
    const p3 = [];

    const v21 = [];
    const v32 = [];

    const n = [];

    const len = indices.length;
    const normals = new Float32Array(position.length);
    let f = 0;
    while (f < len) {

        // const i1 = indices[f++] * 3;
        // const i2 = indices[f++] * 3;
        // const i3 = indices[f++] * 3;
        // const i1 = indices[f];
        // const i2 = indices[f + 1];
        // const i3 = indices[f + 2];
        const a = indices[f], b = indices[f + 1], c = indices[f + 2];
        const i1 = a * 3, i2 = b * 3, i3 = c * 3;

        v3Set(p1, position[i1], position[i1 + 1], position[i1 + 2]);
        v3Set(p2, position[i2], position[i2 + 1], position[i2 + 2]);
        v3Set(p3, position[i3], position[i3 + 1], position[i3 + 2]);

        v3Sub(v32, p3, p2);
        v3Sub(v21, p1, p2);
        v3Cross(n, v32, v21);
        // Already be weighted by the triangle area
        for (let i = 0; i < 3; i++) {
            normals[i1 + i] += n[i];
            normals[i2 + i] += n[i];
            normals[i3 + i] += n[i];
        }
        f += 3;
    }

    let i = 0;
    const l = normals.length;
    while (i < l) {
        v3Set(n, normals[i], normals[i + 1], normals[i + 2]);
        v3Normalize(n, n);
        normals[i] = n[0] || 0;
        normals[i + 1] = n[1] || 0;
        normals[i + 2] = n[2] || 0;
        i += 3;
    }

    return normals;
}

export function merge<T extends ResultType>(results: Array<ResultType>): T {
    if (results.length === 1) {
        const result = {
            position: results[0].position,
            normal: results[0].normal,
            uv: results[0].uv,
            indices: results[0].indices,
            results
        };
        return result as T;
    }
    let plen = 0, ilen = 0;
    for (let i = 0, len = results.length; i < len; i++) {
        const { position, indices } = results[i];
        plen += position.length;
        ilen += indices.length;
    }
    const result = {
        position: new Float32Array(plen),
        normal: new Float32Array(plen),
        uv: new Float32Array(plen / 3 * 2),
        indices: new Uint32Array(ilen),
        results
    };
    let pOffset = 0, pCount = 0, iIdx = 0, uvOffset = 0;
    for (let i = 0, len = results.length; i < len; i++) {
        const { position, indices, normal, uv } = results[i];
        result.position.set(position, pOffset);
        result.normal.set(normal, pOffset);
        result.uv.set(uv, uvOffset);
        let j = 0;
        const len1 = indices.length;
        while (j < len1) {
            const pIndex = indices[j] + pCount;
            result.indices[iIdx] = pIndex;
            iIdx++;
            j++;
        }
        uvOffset += uv.length;
        pOffset += position.length;
        pCount += position.length / 3;
    }
    return result as T;
}

export function radToDeg(rad: number) {
    return rad * 180 / Math.PI;
}

export function degToRad(angle: number) {
    return angle / 180 * Math.PI;
}

// https://github.com/mrdoob/three.js/blob/16f13e3b07e31d0e9a00df7c3366bbe0e464588c/src/geometries/ExtrudeGeometry.js?_pjax=%23js-repo-pjax-container#L736
export function generateSideWallUV(uvs, vertices, indexA, indexB, indexC, indexD) {

    const idx1 = indexA * 3, idx2 = indexB * 3, idx3 = indexC * 3, idx4 = indexD * 3;
    const a_x = vertices[idx1];
    const a_y = vertices[idx1 + 1];
    const a_z = vertices[idx1 + 2];
    const b_x = vertices[idx2];
    const b_y = vertices[idx2 + 1];
    const b_z = vertices[idx2 + 2];
    const c_x = vertices[idx3];
    const c_y = vertices[idx3 + 1];
    const c_z = vertices[idx3 + 2];
    const d_x = vertices[idx4];
    const d_y = vertices[idx4 + 1];
    const d_z = vertices[idx4 + 2];

    let uIndex = uvs.length - 1;
    if (Math.abs(a_y - b_y) < Math.abs(a_x - b_x)) {
        uvs[++uIndex] = a_x;
        uvs[++uIndex] = 1 - a_z;
        uvs[++uIndex] = b_x;
        uvs[++uIndex] = 1 - b_z;
        uvs[++uIndex] = c_x;
        uvs[++uIndex] = 1 - c_z;
        uvs[++uIndex] = d_x;
        uvs[++uIndex] = 1 - d_z;

        // uvs.push(a_x, 1 - a_z);
        // uvs.push(b_x, 1 - b_z);
        // uvs.push(c_x, 1 - c_z);
        // uvs.push(d_x, 1 - d_z);
    } else {
        uvs[++uIndex] = a_y;
        uvs[++uIndex] = 1 - a_z;
        uvs[++uIndex] = b_y;
        uvs[++uIndex] = 1 - b_z;
        uvs[++uIndex] = c_y;
        uvs[++uIndex] = 1 - c_z;
        uvs[++uIndex] = d_y;
        uvs[++uIndex] = 1 - d_z;

        // uvs.push(a_y, 1 - a_z);
        // uvs.push(b_y, 1 - b_z);
        // uvs.push(c_y, 1 - c_z);
        // uvs.push(d_y, 1 - d_z);
    }

}

export function line2Vectors(line: PolylineType) {
    const points: Vector3[] = [];
    for (let i = 0, len = line.length; i < len; i++) {
        const p = line[i];
        const [x, y, z] = p;
        const v = new Vector3(x, y, z || 0);
        points[i] = v;
    }
    return points;
}

export function calLineDistance(line) {
    let distance = 0;
    for (let i = 0, len = line.length; i < len; i++) {
        const p1 = line[i], p2 = line[i + 1];
        if (i === 0) {
            p1.distance = 0;
        }
        if (p1 && p2) {
            const [x1, y1, z1] = p1;
            const [x2, y2, z2] = p2;
            const dx = x1 - x2, dy = y1 - y2, dz = (z1 || 0) - (z2 || 0);
            const dis = Math.sqrt(dx * dx + dy * dy + dz * dz);
            distance += dis;
            p2.distance = distance;
        }
    }
    return distance;
}


export function pointEqual(p1: Point, p2: Point, considerZ?: boolean) {
    if (considerZ) {
        return p1[0] === p2[0] && p1[1] === p2[1] && (p1[2] || 0) === (p2[2] || 0);
    }
    return p1[0] === p2[0] && p1[1] === p2[1];
}

export function pointDistance(p1: Point, p2: Point, considerZ?: boolean) {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = (p2[2] || 0) - (p1[2] || 0);
    if (considerZ) {
        Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return Math.sqrt(dx * dx + dy * dy);
}
