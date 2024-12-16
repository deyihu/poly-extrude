import { ResultType } from "./type";

export function plane(width: number, height: number, devideW: number, devideH: number): ResultType {
    devideW = Math.max(1, devideW);
    devideH = Math.max(1, devideH);
    const dx = width / devideW, dy = height / devideH;
    const minX = -width / 2, maxY = height / 2, minY = -height / 2;
    const len = (devideW + 1) * (devideH + 1);
    const position = new Float32Array(len * 3), uv = new Float32Array(len * 2), normal = new Float32Array(len * 3), indices = new Uint32Array(len * 10);
    let index = 0, uIndex = 0, iIndex = 0;
    for (let j = 0; j <= devideH; j++) {
        for (let i = 0; i <= devideW; i++) {
            const x = minX + dx * i;
            const y = maxY - dy * j;
            position[index] = x;
            position[index + 1] = y;
            position[index + 2] = 0;

            normal[index] = 0;
            normal[index + 1] = 0;
            normal[index + 2] = 1;
            // position.push(x, y, 0);
            // normal.push(0, 0, 1);
            const uvx = (x - minX) / width, uvy = (y - minY) / height;
            // uv.push(uvx, uvy);
            uv[uIndex] = uvx;
            uv[uIndex + 1] = uvy;

            index += 3;
            uIndex += 2;
            if (i < devideW && j < devideH) {
                const a = j * (devideW + 1) + i, b = a + 1, c = (devideW + 1) * (j + 1) + i, d = c + 1;
                indices[iIndex] = a;
                indices[iIndex + 1] = c;
                indices[iIndex + 2] = b;
                indices[iIndex + 3] = c;
                indices[iIndex + 4] = d;
                indices[iIndex + 5] = b;
                iIndex += 6;
                // indexs.push(a, c, b, c, d, b);
            }
        }
    }
    const indexArray = new Uint32Array(iIndex);
    for (let i = 0, len = indexArray.length; i < len; i++) {
        indexArray[i] = indices[i];
    }
    // for (let j = 0; j < devideH; j++) {
    //     for (let i = 0; i < devideW; i++) {
    //         const a = j * (devideW + 1) + i, b = a + 1, c = (devideW + 1) * (j + 1) + i, d = c + 1;
    //         indexs.push(a, c, b, c, d, b);
    //     }
    // }
    return {
        position,
        uv,
        normal,
        indices: indexArray
    };
}
