import { Vector3 } from './math/Vector3';
import { PathPoint } from './path/PathPoint';
import { PathPointList } from './path/PathPointList';
import { merge } from './util';
const UP = new Vector3(0, 0, 1);

export function expandTubes(lines, options) {
    options = Object.assign({}, { radius: 1, cornerSplit: 0, radialSegments: 8, startRad: -Math.PI / 4 }, options);
    const results = lines.map(line => {
        const points = line.map(p => {
            const [x, y, z] = p;
            return new Vector3(x, y, z || 0);
        });
        const pathPointList = new PathPointList();
        pathPointList.set(points, options.cornerRadius, options.cornerSplit, UP);
        const result = generateTubeVertexData(pathPointList, options);
        result.line = line;
        result.position = new Float32Array(result.points);
        result.indices = new Uint32Array(result.index);
        result.uv = new Float32Array(result.uvs);
        result.normal = new Float32Array(result.normal);
        return result;
    });
    const result = merge(results);
    result.lines = lines;
    return result;
}

// Vertex Data Generate Functions
// code copy from https://github.com/shawn0326/three.path/blob/master/src/PathGeometry.js
function generateTubeVertexData(pathPointList, options) {
    const radius = Math.max(options.radius || 1, 0.00000001);
    const progress = options.progress !== undefined ? options.progress : 1;
    const radialSegments = Math.max(3, options.radialSegments || 8);
    const startRad = options.startRad || 0;

    const circum = radius * 2 * Math.PI;
    const totalDistance = pathPointList.distance();
    const progressDistance = progress * totalDistance;
    if (progressDistance === 0) {
        return null;
    }

    let count = 0;

    // modify data
    const points = [];
    const normal = [];
    const uvs = [];
    // const uv2 = [];
    const index = [];
    let verticesCount = 0;

    const normalDir = new Vector3();

    let pIndex = -1;
    let nIndex = -1;
    let uIndex = -1;
    let iIndex = -1;
    function addVertices(pathPoint, radius, radialSegments) {
        const first = points.length === 0;
        const uvDist = pathPoint.dist / circum;
        // const uvDist2 = pathPoint.dist / totalDistance;

        for (let i = 0; i <= radialSegments; i++) {
            let r = i;
            if (r === radialSegments) {
                r = 0;
            }
            normalDir.copy(pathPoint.up).applyAxisAngle(pathPoint.dir, startRad + Math.PI * 2 * r / radialSegments).normalize();

            const scale = radius * pathPoint.widthScale;
            points[++pIndex] = pathPoint.pos.x + normalDir.x * scale;
            points[++pIndex] = pathPoint.pos.y + normalDir.y * scale;
            points[++pIndex] = pathPoint.pos.z + normalDir.z * scale;

            normal[++nIndex] = normalDir.x;
            normal[++nIndex] = normalDir.y;
            normal[++nIndex] = normalDir.z;

            uvs[++uIndex] = uvDist;
            uvs[++uIndex] = i / radialSegments;

            // uvs.push(uvDist, r / radialSegments);

            // if (generateUv2) {
            //     uv2.push(uvDist2, r / radialSegments);
            // }

            verticesCount++;
        }

        if (!first) {
            const begin1 = verticesCount - (radialSegments + 1) * 2;
            const begin2 = verticesCount - (radialSegments + 1);

            for (let i = 0; i < radialSegments; i++) {
                index[++iIndex] = begin2 + i;
                index[++iIndex] = begin1 + i;
                index[++iIndex] = begin1 + i + 1;
                index[++iIndex] = begin2 + i;
                index[++iIndex] = begin1 + i + 1;
                index[++iIndex] = begin2 + i + 1;
                // index.push(
                //     begin2 + i,
                //     begin1 + i,
                //     begin1 + i + 1,
                //     begin2 + i,
                //     begin1 + i + 1,
                //     begin2 + i + 1
                // );

                count += 6;
            }
        }
    }

    if (progressDistance > 0) {
        for (let i = 0; i < pathPointList.count; i++) {
            const pathPoint = pathPointList.array[i];

            if (pathPoint.dist > progressDistance) {
                const prevPoint = pathPointList.array[i - 1];
                const lastPoint = new PathPoint();

                // linear lerp for progress
                const alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
                lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

                addVertices(lastPoint, radius, radialSegments);
                break;
            } else {
                addVertices(pathPoint, radius, radialSegments);
            }
        }
    }

    return {
        points,
        normal,
        uvs,
        // uv2,
        index,
        count
    };
}
