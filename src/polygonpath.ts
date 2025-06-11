import { Vector3 } from './math/Vector3';
import { PathPoint } from './path/PathPoint';
import { PathPointList } from './path/PathPointList';
import { PolygonType, PolylineType, ResultType } from './type';
import { generateNormal, isClockwise, line2Vectors, merge, validateRing, isClosedRing, calPolygonPointsCount, getPolygonsBBOX, mergeArray } from './util';
import earcut from 'earcut';
const UP = new Vector3(0, 0, 1);
const normalDir = new Vector3();

type PolygonsOnPathOptions = {
    extrudePath: PolylineType;
    openEnd?: boolean;
    openEndUV?: boolean;

}

type PolygonsOnPathResult = ResultType & {
    polygons: Array<PolygonType>;
}


type Point = [number, number];

export function extrudePolygonsOnPath(polygons: Array<PolygonType>, options?: PolygonsOnPathOptions) {
    options = Object.assign({}, { openEnd: false, openEndUV: true }, options);
    const { extrudePath, openEnd } = options;
    if (!extrudePath || !Array.isArray(extrudePath) || extrudePath.length < 2) {
        console.error('extrudePath is error:', extrudePath);
        return null;
    }
    const bbox = getPolygonsBBOX(polygons);
    const [minx, miny, maxx, maxy] = bbox;
    const center = [(minx + maxx) / 2, (miny + maxy) / 2] as Point;

    const points = line2Vectors(extrudePath);
    const pathPointList = new PathPointList();
    //@ts-ignore
    pathPointList.set(points, 0, options.cornerSplit, UP);

    const results = polygons.map(polygon => {
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
        }

        const result = generatePolygonOnPathVertexData(pathPointList, polygon, center) as Record<string, any>;
        if (!openEnd) {
            generateStartAndEnd(result, polygon, options);
        }
        result.polygon = polygon;
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.indices);
        result.uv = new Float32Array(result.uv);
        result.normal = new Float32Array(result.normal);
        return result;
    });
    const result = merge(results as Array<ResultType>) as PolygonsOnPathResult;
    result.polygons = polygons;
    return result;
}


function getAngle(c1: Point, c2: Point) {
    const [x1, y1] = c1;
    const [x2, y2] = c2;
    const dy = y2 - y1;
    const dx = x2 - x1;
    return Math.atan2(dy, dx);
}


function transformPolygon(polygon: PolygonType, center: Point) {
    const [cx, cy] = center;
    const list = [];
    polygon.forEach((ring, rIndex) => {
        const data = [];
        let totalDistance = 0;
        let tempPoint;
        for (let i = 0, len = ring.length; i < len; i++) {
            const p = ring[i];
            const x1 = p[0], y1 = p[1];
            const offsetx = x1 - cx, offsety = y1 - cy;
            let distance = 0;
            if (i > 0) {
                const x2 = tempPoint[0], y2 = tempPoint[1];
                const dx = x2 - x1, dy = y2 - y1;
                distance = Math.sqrt(dx * dx + dy * dy) + totalDistance;
                totalDistance = distance;
            }
            data[i] = {
                // dx,
                // dy,
                // dz: 0,
                distance,
                radius: Math.sqrt(offsetx * offsetx + offsety * offsety),
                angle: -getAngle(center, p as Point)
            }
            tempPoint = p;
        }
        list[rIndex] = {
            ring: data,
            ringLen: totalDistance
        };
    });
    return list;
}

const TEMP_VECTOR3 = new Vector3(0, 0, 0);
// Vertex Data Generate Functions
// code copy from https://github.com/shawn0326/three.path/blob/master/src/PathGeometry.js
function generatePolygonOnPathVertexData(pathPointList, polygon: PolygonType, center: Point) {
    const tpolygon = transformPolygon(polygon, center);
    // let count = 0;
    // modify data
    const points: number[] = [];
    const normal: number[] = [];
    const uv: number[] = [];
    // const uv2 = [];
    const indices: number[] = [];
    let verticesCount = 0;

    let pIndex = -1;
    let nIndex = -1;
    let uIndex = -1;
    let iIndex = -1;

    const startPoints = [], endPoints = [];

    function addVertices(pathPoint, ring, ringLen, first, end) {
        const uvDist = pathPoint.dist / ringLen;
        const radialSegments = ring.length;
        // const startRad = ring[0].angle;

        for (let i = 0; i < radialSegments; i++) {
            const item = ring[i];
            if (!item) {
                continue;
            }
            const isLast = i === radialSegments - 1;
            const angle = item.angle;
            const radius = item.radius;
            const distance = item.distance;
            normalDir.copy(pathPoint.up).applyAxisAngle(pathPoint.dir, angle).normalize();
            const v = TEMP_VECTOR3.copy(pathPoint.up);
            v.applyAxisAngle(pathPoint.dir, angle);
            v.x *= radius;
            v.y *= radius;
            v.z *= radius;

            points[++pIndex] = pathPoint.pos.x + v.x;
            points[++pIndex] = pathPoint.pos.y + v.y;
            points[++pIndex] = pathPoint.pos.z + v.z;

            // if (i === 0 || i === radialSegments - 1) {
            //     console.log(i, radialSegments, v.x, v.y, v.z);
            // }


            normal[++nIndex] = normalDir.x;
            normal[++nIndex] = normalDir.y;
            normal[++nIndex] = normalDir.z;

            uv[++uIndex] = uvDist;
            uv[++uIndex] = distance / ringLen;

            verticesCount++;

            if (first && !isLast) {
                let index = startPoints.length - 1;
                startPoints[++index] = pathPoint.pos.x + v.x;
                startPoints[++index] = pathPoint.pos.y + v.y;
                startPoints[++index] = pathPoint.pos.z + v.z;
            }
            if (end && !isLast) {
                let index = endPoints.length - 1;
                endPoints[++index] = pathPoint.pos.x + v.x;
                endPoints[++index] = pathPoint.pos.y + v.y;
                endPoints[++index] = pathPoint.pos.z + v.z;
            }
        }

        if (!first) {
            const begin1 = verticesCount - (radialSegments) * 2;
            const begin2 = verticesCount - (radialSegments);

            for (let i = 0; i < radialSegments; i++) {
                indices[++iIndex] = begin2 + i;
                indices[++iIndex] = begin1 + i;
                indices[++iIndex] = begin1 + i + 1;
                indices[++iIndex] = begin2 + i;
                indices[++iIndex] = begin1 + i + 1;
                indices[++iIndex] = begin2 + i + 1;
            }
        }
    }

    const polygonLen = tpolygon[0].ringLen;
    tpolygon.forEach(item => {
        for (let i = 0; i < pathPointList.count; i++) {
            const pathPoint = pathPointList.array[i];
            const { ring, ringLen } = item;
            addVertices(pathPoint, ring, ringLen, i === 0, i === pathPointList.count - 1);

        }
    });


    return {
        points,
        normal,
        uv,
        // uv2,
        indices,
        startPoints,
        endPoints,
        polygonLen
        // count
    };
}


function generateStartAndEnd(result, polygon, options) {
    const { openEndUV } = options;
    for (let i = 0, len = polygon.length; i < len; i++) {
        const ring = polygon[i];
        if (isClosedRing(ring)) {
            ring.splice(ring.length - 1, 1);
        }
    }
    const pointCount = calPolygonPointsCount(polygon);

    const flatVertices = [], holes = [];
    let pIndex = -1;
    for (let i = 0, len = polygon.length; i < len; i++) {
        const ring = polygon[i];
        if (i > 0) {
            holes.push(flatVertices.length / 2);
        }
        for (let j = 0, len1 = ring.length; j < len1; j++) {
            const c = ring[j];
            flatVertices[++pIndex] = c[0];
            flatVertices[++pIndex] = c[1];
        }
    }
    const triangles = earcut(flatVertices, holes, 2);
    const { points, normal, uv, indices, startPoints, endPoints, polygonLen } = result;

    pIndex = 0;
    let uIndex = 0;
    const aPoints1 = [], auv1 = [], aPoints2 = [], auv2 = [];


    for (let i = 0; i < pointCount; i++) {
        const idx = i * 3;
        const x = startPoints[idx];
        const y = startPoints[idx + 1];
        const z = startPoints[idx + 2];

        aPoints1[pIndex] = x;
        aPoints1[pIndex + 1] = y;
        aPoints1[pIndex + 2] = z;
        if (openEndUV) {
            auv1[uIndex] = y / polygonLen;
            auv1[uIndex + 1] = z / polygonLen;
        } else {
            auv1[uIndex] = 0;
            auv1[uIndex + 1] = 0;
        }

        const x1 = endPoints[idx];
        const y1 = endPoints[idx + 1];
        const z1 = endPoints[idx + 2];

        aPoints2[pIndex] = x1;
        aPoints2[pIndex + 1] = y1;
        aPoints2[pIndex + 2] = z1;
        if (openEndUV) {
            auv2[uIndex] = y1 / polygonLen;
            auv2[uIndex + 1] = z1 / polygonLen;
        } else {
            auv2[uIndex] = 0;
            auv2[uIndex + 1] = 0;
        }

        pIndex += 3;
        uIndex += 2;

    }

    const indexOffset = points.length / 3;
    const indexs = [];
    for (let i = 0, len = triangles.length; i < len; i++) {
        indexs[i] = triangles[i] + indexOffset;
        indexs[i + len] = triangles[i] + indexOffset + pointCount;
    }

    const anormal1 = generateNormal(triangles, aPoints1) as any;
    const anormal2 = generateNormal(triangles, aPoints2) as any;
    mergeArray(points, aPoints1);
    mergeArray(points, aPoints2);
    mergeArray(uv, auv1);
    mergeArray(uv, auv2);
    mergeArray(normal, anormal1);
    mergeArray(normal, anormal2);
    mergeArray(indices, indexs);
}


