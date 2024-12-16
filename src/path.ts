import { Vector3 } from './math/Vector3';
import { PathPoint } from './path/PathPoint';
import { PathPointList } from './path/PathPointList';
import { PolylineType, ResultType } from './type';
import { line2Vectors, merge } from './util';
const UP = new Vector3(0, 0, 1);

const right = new Vector3();
const left = new Vector3();

// for sharp corners
const leftOffset = new Vector3();
const rightOffset = new Vector3();
const tempPoint1 = new Vector3();
const tempPoint2 = new Vector3();

type OptionsType = {
    lineWidth?: number;
    cornerRadius?: number;
    cornerSplit?: number;
}

type PathsResult = ResultType & {
    lines: Array<PolylineType>;
}

export function expandPaths(lines: Array<PolylineType>, options?: OptionsType): PathsResult {
    options = Object.assign({}, { lineWidth: 1, cornerRadius: 0, cornerSplit: 10 }, options);
    const results = lines.map(line => {
        const points = line2Vectors(line);
        const pathPointList = new PathPointList();
        //@ts-ignore
        pathPointList.set(points, options.cornerRadius, options.cornerSplit, UP);
        const params = generatePathVertexData(pathPointList, options);

        const result = {
            position: new Float32Array(params.position),
            indices: new Uint32Array(params.indices),
            uv: new Float32Array(params.uv),
            normal: new Float32Array(params.normal),
            line,
            count: params.count
        }
        return result;
    });
    const result = merge(results) as PathsResult;
    result.lines = lines;
    return result;
}

// Vertex Data Generate Functions
// code copy from https://github.com/shawn0326/three.path/blob/master/src/PathGeometry.js
function generatePathVertexData(pathPointList, options: OptionsType) {
    const width = options.lineWidth || 0.1;
    const progress = 1;
    const side = 'both';

    const halfWidth = width / 2;
    const sideWidth = (side !== 'both' ? width / 2 : width);
    const totalDistance = pathPointList.distance();
    const progressDistance = progress * totalDistance;

    let count = 0;

    // modify data
    const position: number[] = [];
    const normal: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    let verticesCount = 0;

    if (totalDistance === 0) {
        return {
            position: position,
            normal,
            uv: uv,
            indices: indices,
            count
        }
    }

    const sharpUvOffset = halfWidth / sideWidth;
    // const sharpUvOffset2 = halfWidth / totalDistance;


    let pIndex = position.length - 1;
    let nIndex = normal.length - 1;
    let uIndex = uv.length - 1;
    let iIndex = indices.length - 1;
    function addVertices(pathPoint) {
        const first = position.length === 0;
        const sharpCorner = pathPoint.sharp && !first;

        const uvDist = pathPoint.dist / sideWidth;
        // const uvDist2 = pathPoint.dist / totalDistance;

        const dir = pathPoint.dir;
        const up = pathPoint.up;
        const _right = pathPoint.right;

        //@ts-ignore
        if (side !== 'left') {
            right.copy(_right).multiplyScalar(halfWidth * pathPoint.widthScale);
        } else {
            right.set(0, 0, 0);
        }
        //@ts-ignore
        if (side !== 'right') {
            left.copy(_right).multiplyScalar(-halfWidth * pathPoint.widthScale);
        } else {
            left.set(0, 0, 0);
        }

        right.add(pathPoint.pos);
        left.add(pathPoint.pos);

        if (sharpCorner) {
            leftOffset.fromArray(position, position.length - 6).sub(left);
            rightOffset.fromArray(position, position.length - 3).sub(right);

            const leftDist = leftOffset.length();
            const rightDist = rightOffset.length();

            const sideOffset = leftDist - rightDist;
            let longerOffset, longEdge;

            if (sideOffset > 0) {
                longerOffset = leftOffset;
                longEdge = left;
            } else {
                longerOffset = rightOffset;
                longEdge = right;
            }

            tempPoint1.copy(longerOffset).setLength(Math.abs(sideOffset)).add(longEdge);

            // eslint-disable-next-line prefer-const
            let _cos = tempPoint2.copy(longEdge).sub(tempPoint1).normalize().dot(dir);
            // eslint-disable-next-line prefer-const
            let _len = tempPoint2.copy(longEdge).sub(tempPoint1).length();
            // eslint-disable-next-line prefer-const
            let _dist = _cos * _len * 2;

            tempPoint2.copy(dir).setLength(_dist).add(tempPoint1);

            if (sideOffset > 0) {
                position[++pIndex] = tempPoint1.x;
                position[++pIndex] = tempPoint1.y;
                position[++pIndex] = tempPoint1.z;
                position[++pIndex] = right.x;
                position[++pIndex] = right.y;
                position[++pIndex] = right.z;
                position[++pIndex] = left.x;
                position[++pIndex] = left.y;
                position[++pIndex] = left.z;
                position[++pIndex] = right.x;
                position[++pIndex] = right.y;
                position[++pIndex] = right.z;
                position[++pIndex] = tempPoint2.x;
                position[++pIndex] = tempPoint2.y;
                position[++pIndex] = tempPoint2.z;
                position[++pIndex] = right.x;
                position[++pIndex] = right.y;
                position[++pIndex] = right.z;
                // position.push(
                //     tempPoint1.x, tempPoint1.y, tempPoint1.z, // 6
                //     right.x, right.y, right.z, // 5
                //     left.x, left.y, left.z, // 4
                //     right.x, right.y, right.z, // 3
                //     tempPoint2.x, tempPoint2.y, tempPoint2.z, // 2
                //     right.x, right.y, right.z // 1
                // );

                verticesCount += 6;

                indices[++iIndex] = verticesCount - 6;
                indices[++iIndex] = verticesCount - 8;
                indices[++iIndex] = verticesCount - 7;
                indices[++iIndex] = verticesCount - 6;
                indices[++iIndex] = verticesCount - 7;
                indices[++iIndex] = verticesCount - 5;
                indices[++iIndex] = verticesCount - 4;
                indices[++iIndex] = verticesCount - 6;
                indices[++iIndex] = verticesCount - 5;
                indices[++iIndex] = verticesCount - 2;
                indices[++iIndex] = verticesCount - 4;
                indices[++iIndex] = verticesCount - 1;

                // indices.push(
                //     verticesCount - 6, verticesCount - 8, verticesCount - 7,
                //     verticesCount - 6, verticesCount - 7, verticesCount - 5,

                //     verticesCount - 4, verticesCount - 6, verticesCount - 5,
                //     verticesCount - 2, verticesCount - 4, verticesCount - 1
                // );

                count += 12;
            } else {
                position[++pIndex] = left.x;
                position[++pIndex] = left.y;
                position[++pIndex] = left.z;
                position[++pIndex] = tempPoint1.x;
                position[++pIndex] = tempPoint1.y;
                position[++pIndex] = tempPoint1.z;
                position[++pIndex] = left.x;
                position[++pIndex] = left.y;
                position[++pIndex] = left.z;
                position[++pIndex] = right.x;
                position[++pIndex] = right.y;
                position[++pIndex] = right.z;
                position[++pIndex] = left.x;
                position[++pIndex] = left.y;
                position[++pIndex] = left.z;
                position[++pIndex] = tempPoint2.x;
                position[++pIndex] = tempPoint2.y;
                position[++pIndex] = tempPoint2.z;
                // position.push(
                //     left.x, left.y, left.z, // 6
                //     tempPoint1.x, tempPoint1.y, tempPoint1.z, // 5
                //     left.x, left.y, left.z, // 4
                //     right.x, right.y, right.z, // 3
                //     left.x, left.y, left.z, // 2
                //     tempPoint2.x, tempPoint2.y, tempPoint2.z // 1
                // );

                verticesCount += 6;
                indices[++iIndex] = verticesCount - 6;
                indices[++iIndex] = verticesCount - 8;
                indices[++iIndex] = verticesCount - 7;
                indices[++iIndex] = verticesCount - 6;
                indices[++iIndex] = verticesCount - 7;
                indices[++iIndex] = verticesCount - 5;
                indices[++iIndex] = verticesCount - 6;
                indices[++iIndex] = verticesCount - 5;
                indices[++iIndex] = verticesCount - 3;
                indices[++iIndex] = verticesCount - 2;
                indices[++iIndex] = verticesCount - 3;
                indices[++iIndex] = verticesCount - 1;

                // indices.push(
                //     verticesCount - 6, verticesCount - 8, verticesCount - 7,
                //     verticesCount - 6, verticesCount - 7, verticesCount - 5,

                //     verticesCount - 6, verticesCount - 5, verticesCount - 3,
                //     verticesCount - 2, verticesCount - 3, verticesCount - 1
                // );

                count += 12;
            }
            for (let i = 0; i < 6; i++) {
                normal[++nIndex] = up.x;
                normal[++nIndex] = up.y;
                normal[++nIndex] = up.z;
            }

            // normal.push(
            //     up.x, up.y, up.z,
            //     up.x, up.y, up.z,
            //     up.x, up.y, up.z,
            //     up.x, up.y, up.z,
            //     up.x, up.y, up.z,
            //     up.x, up.y, up.z
            // );

            uv[++uIndex] = uvDist - sharpUvOffset;
            uv[++uIndex] = 0;
            uv[++uIndex] = uvDist - sharpUvOffset;
            uv[++uIndex] = 1;
            uv[++uIndex] = uvDist;
            uv[++uIndex] = 0;
            uv[++uIndex] = uvDist;
            uv[++uIndex] = 1;
            uv[++uIndex] = uvDist + sharpUvOffset;
            uv[++uIndex] = 0;
            uv[++uIndex] = uvDist + sharpUvOffset;
            uv[++uIndex] = 1;
            // uv.push(
            //     uvDist - sharpUvOffset, 0,
            //     uvDist - sharpUvOffset, 1,
            //     uvDist, 0,
            //     uvDist, 1,
            //     uvDist + sharpUvOffset, 0,
            //     uvDist + sharpUvOffset, 1
            // );

            // if (generateUv2) {
            //     uv2.push(
            //         uvDist2 - sharpUvOffset2, 0,
            //         uvDist2 - sharpUvOffset2, 1,
            //         uvDist2, 0,
            //         uvDist2, 1,
            //         uvDist2 + sharpUvOffset2, 0,
            //         uvDist2 + sharpUvOffset2, 1
            //     );
            // }
        } else {
            position[++pIndex] = left.x;
            position[++pIndex] = left.y;
            position[++pIndex] = left.z;
            position[++pIndex] = right.x;
            position[++pIndex] = right.y;
            position[++pIndex] = right.z;
            // position.push(
            //     left.x, left.y, left.z,
            //     right.x, right.y, right.z
            // );

            normal[++nIndex] = up.x;
            normal[++nIndex] = up.y;
            normal[++nIndex] = up.z;
            normal[++nIndex] = up.x;
            normal[++nIndex] = up.y;
            normal[++nIndex] = up.z;
            // normal.push(
            //     up.x, up.y, up.z,
            //     up.x, up.y, up.z
            // );

            uv[++uIndex] = uvDist;
            uv[++uIndex] = 0;
            uv[++uIndex] = uvDist;
            uv[++uIndex] = 1;
            // uv.push(
            //     uvDist, 0,
            //     uvDist, 1
            // );

            // if (generateUv2) {
            //     uv2.push(
            //         uvDist2, 0,
            //         uvDist2, 1
            //     );
            // }

            verticesCount += 2;

            if (!first) {
                indices[++iIndex] = verticesCount - 2;
                indices[++iIndex] = verticesCount - 4;
                indices[++iIndex] = verticesCount - 3;
                indices[++iIndex] = verticesCount - 2;
                indices[++iIndex] = verticesCount - 3;
                indices[++iIndex] = verticesCount - 1;
                // indices.push(
                //     verticesCount - 2, verticesCount - 4, verticesCount - 3,
                //     verticesCount - 2, verticesCount - 3, verticesCount - 1
                // );

                count += 6;
            }
        }
    }

    let lastPoint;

    if (progressDistance > 0) {
        for (let i = 0; i < pathPointList.count; i++) {
            const pathPoint = pathPointList.array[i];

            if (pathPoint.dist > progressDistance) {
                const prevPoint = pathPointList.array[i - 1];
                lastPoint = new PathPoint();

                // linear lerp for progress
                const alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
                lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

                addVertices(lastPoint);
                break;
            } else {
                addVertices(pathPoint);
            }
        }
    } else {
        lastPoint = pathPointList.array[0];
    }

    return {
        position: position,
        normal,
        uv: uv,
        indices: indices,
        count
    };
}
