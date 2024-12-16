export type PolylineType = Array<number[]>;
export type PolygonType = Array<Array<number[]>>;
export type ResultType = {
    position: Float32Array;
    normal: Float32Array;
    uv: Float32Array;
    indices: Uint32Array;
    results?: Array<any>;
}