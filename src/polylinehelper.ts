import { PolylineType } from "./type";
import { mergeArray, pointDistance, pointEqual } from "./util";
import { Bezier } from 'bezier-js';
//https://github.com/bbecquet/Leaflet.PolylineOffset/blob/master/leaflet.polylineoffset.js

/**
Find the coefficients (a,b) of a line of equation y = a.x + b,
or the constant x for vertical lines
Return null if there's no equation possible
*/
type Point = {
    x: number;
    y: number;
    z: number;
}

function lineEquation(pt1: Point, pt2: Point) {
    if (pt1.x === pt2.x) {
        return pt1.y === pt2.y ? null : { x: pt1.x };
    }

    var a = (pt2.y - pt1.y) / (pt2.x - pt1.x);
    return {
        a: a,
        b: pt1.y - a * pt1.x,
    };
}

function calZ(p1: Point, p2: Point, p: Point) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dx1 = p.x - p1.x, dy1 = p.y - p1.y;
    const dis = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const percent = dis / distance;
    const dz = p2.z - p1.z;
    return p1.z + dz * percent;
}

/**
Return the intersection point of two lines defined by two points each
Return null when there's no unique intersection
*/
function intersection(l1a: Point, l1b: Point, l2a: Point, l2b: Point) {
    var line1 = lineEquation(l1a, l1b);
    var line2 = lineEquation(l2a, l2b);

    if (line1 === null || line2 === null) {
        return null;
    }

    if (line1.hasOwnProperty('x')) {
        if (line2.hasOwnProperty('x')) {
            return null;
        }
        const p = {
            x: line1.x,
            y: line2.a * line1.x + line2.b,
            z: 0
        };
        p.z = calZ(l1a, l1b, p);
        return p;
    }
    if (line2.hasOwnProperty('x')) {
        const p = {
            x: line2.x,
            y: line1.a * line2.x + line1.b,
            z: 0
        };
        p.z = calZ(l1a, l1b, p);
        return p;

    }

    if (line1.a === line2.a) {
        return null;
    }

    var x = (line2.b - line1.b) / (line1.a - line2.a);
    const p = {
        x: x,
        y: line1.a * x + line1.b,
        z: 0
    };
    p.z = calZ(l1a, l1b, p);
    return p;
}

function translatePoint(pt: Point, dist: number, heading: number) {
    return {
        x: pt.x + dist * Math.cos(heading),
        y: pt.y + dist * Math.sin(heading),
        z: pt.z || 0
    };
}

function offsetPointLine(points, distance: number) {
    var offsetSegments = [];
    for (let i = 1, len = points.length; i < len; i++) {
        let a = points[i - 1], b = points[i];
        const [x1, y1, z1] = a;
        const [x2, y2, z2] = b;
        if (x1 === x2 && y1 === y2) {
            continue;
        }
        a = {
            x: x1,
            y: y1,
            z: z1 || 0
        };
        b = {
            x: x2,
            y: y2,
            z: z2 || 0
        }
        var segmentAngle = Math.atan2(a.y - b.y, a.x - b.x);
        var offsetAngle = segmentAngle - Math.PI / 2;

        offsetSegments.push({
            offsetAngle: offsetAngle,
            original: [a, b],
            offset: [
                translatePoint(a, distance, offsetAngle),
                translatePoint(b, distance, offsetAngle)
            ]
        });
    }
    return offsetSegments;


}

/**
Join 2 line segments defined by 2 points each with a circular arc
*/
function joinSegments(s1, s2, offset) {
    // TODO: different join styles
    return circularArc(s1, s2, offset)
        .filter(function (x) { return x; })
}

function joinLineSegments(segments, offset) {
    var joinedPoints = [];
    var first = segments[0];
    var last = segments[segments.length - 1];

    if (first && last) {
        joinedPoints.push(first.offset[0]);
        for (let i = 1, len = segments.length; i < len; i++) {
            let s1 = segments[i - 1], s2 = segments[i];
            const pts = joinSegments(s1, s2, offset);
            mergeArray(joinedPoints, pts);
        }
        joinedPoints.push(last.offset[1]);
    }

    return joinedPoints;
}

function segmentAsVector(s) {
    return {
        x: s[1].x - s[0].x,
        y: s[1].y - s[0].y,
    };
}

function getSignedAngle(s1, s2) {
    const a = segmentAsVector(s1);
    const b = segmentAsVector(s2);
    return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
}

/**
Interpolates points between two offset segments in a circular form
*/
function circularArc(s1, s2, distance) {
    // if the segments are the same angle,
    // there should be a single join point
    if (s1.offsetAngle === s2.offsetAngle) {
        return [s1.offset[1]];
    }

    const signedAngle = getSignedAngle(s1.offset, s2.offset);
    // for inner angles, just find the offset segments intersection
    if ((signedAngle * distance > 0) &&
        (signedAngle * getSignedAngle(s1.offset, [s1.offset[0], s2.offset[1]]) > 0)) {
        return [intersection(s1.offset[0], s1.offset[1], s2.offset[0], s2.offset[1])];
    }

    // draws a circular arc with R = offset distance, C = original meeting point
    var points = [];
    var center = s1.original[1];
    // ensure angles go in the anti-clockwise direction
    var rightOffset = distance > 0;
    var startAngle = rightOffset ? s2.offsetAngle : s1.offsetAngle;
    var endAngle = rightOffset ? s1.offsetAngle : s2.offsetAngle;
    // and that the end angle is bigger than the start angle
    if (endAngle < startAngle) {
        endAngle += Math.PI * 2;
    }
    var step = Math.PI / 8;
    for (var alpha = startAngle; alpha < endAngle; alpha += step) {
        points.push(translatePoint(center, distance, alpha));
    }
    points.push(translatePoint(center, distance, endAngle));

    return rightOffset ? points.reverse() : points;
}


function offsetPoints(pts: PolylineType, options: polylineOffsetOptions) {
    var offsetSegments = offsetPointLine(pts, options.offset);
    return joinLineSegments(offsetSegments, options.offset);
}

type polylineOffsetOptions = {
    offset: number
}
export function polylineOffset(line: PolylineType, options: polylineOffsetOptions): PolylineType {
    options = Object.assign({ offset: 0 }, options);
    if (options.offset === 0) {
        return line;
    }
    const pts = offsetPoints(line, options);
    const result = [];
    for (let i = 0, len = pts.length; i < len; i++) {
        const pt = pts[i];
        if (!pt) {
            continue;
        }
        const { x, y, z } = pt;
        result.push([x, y, z]);
    }
    return result;
}

type polylineRoundOptions = {
    roundSize: number,
    steps?: number;
}

export function polylineRound(line: PolylineType, options: polylineRoundOptions): PolylineType {
    options = Object.assign({ roundSize: 0, steps: 10 }, options);
    if (options.roundSize === 0) {
        return line;
    }
    if (!line || line.length < 3) {
        return line;
    }
    const len = line.length;
    const { roundSize, steps } = options;

    const points = [line[0]];
    let pre = line[0];
    let idx = 0;

    for (let i = 1; i < len; i++) {
        const p1 = line[i - 1], p2 = line[i], p3 = line[i + 1];
        if (!p3 || !p1 || !p2) {
            continue;
        }
        if (pointEqual(pre, p2, true)) {
            continue;
        }
        const d1 = pointDistance(p2, p1, true), d2 = pointDistance(p2, p3, true);
        if (d1 < roundSize || d2 < roundSize) {
            pre = p2;
            points[++idx] = p2;
            continue;
        }
        const dx1 = p2[0] - p1[0], dy1 = p2[1] - p1[1], dz1 = (p2[2] || 0) - (p1[2] || 0);
        const dx2 = p3[0] - p2[0], dy2 = p3[1] - p2[1], dz2 = (p3[2] || 0) - (p2[2] || 0);

        const percent1 = (d1 - roundSize) / d1;
        const percent2 = roundSize / d2;
        const c1 = {
            x: p1[0] + percent1 * dx1,
            y: p1[1] + percent1 * dy1,
            z: (p1[2] || 0) + percent1 * dz1
        };
        const c2 = {
            x: p2[0] + percent2 * dx2,
            y: p2[1] + percent2 * dy2,
            z: (p2[2] || 0) + percent2 * dz2
        };
        const d3 = pointDistance([c1.x, c1.y, c1.z], [c2.x, c2.y, c2.z], true);
        if (d3 < roundSize / 10) {
            pre = p2;
            points[++idx] = p2;
            continue;
        }
        const be = new Bezier([c1, { x: p2[0], y: p2[1], z: p2[2] || 0 }, c2]);
        const path = be.getLUT(steps);
        for (let j = 0, len1 = path.length; j < len1; j++) {
            const p = path[j];
            points[++idx] = [p.x, p.y, p.z];
        }
        pre = p2;
    }
    points.push(line[len - 1]);
    for (let i = 0, len = points.length; i < len; i++) {
        const p = points[i];
        p[2] = p[2] || 0;
    }
    return points;
}