/*!
 * poly-extrude v0.1.0
  */
var earcut$2 = {exports: {}};

earcut$2.exports = earcut;

earcut$2.exports["default"] = earcut;

function earcut(data, holeIndices, dim) {
  dim = dim || 2;
  var hasHoles = holeIndices && holeIndices.length,
      outerLen = hasHoles ? holeIndices[0] * dim : data.length,
      outerNode = linkedList(data, 0, outerLen, dim, true),
      triangles = [];
  if (!outerNode || outerNode.next === outerNode.prev) return triangles;
  var minX, minY, maxX, maxY, x, y, invSize;
  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim); // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox

  if (data.length > 80 * dim) {
    minX = maxX = data[0];
    minY = maxY = data[1];

    for (var i = dim; i < outerLen; i += dim) {
      x = data[i];
      y = data[i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } // minX, minY and invSize are later used to transform coords into integers for z-order calculation


    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 32767 / invSize : 0;
  }

  earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
  return triangles;
} // create a circular doubly linked list from polygon points in the specified winding order


function linkedList(data, start, end, dim, clockwise) {
  var i, last;

  if (clockwise === signedArea(data, start, end, dim) > 0) {
    for (i = start; i < end; i += dim) {
      last = insertNode(i, data[i], data[i + 1], last);
    }
  } else {
    for (i = end - dim; i >= start; i -= dim) {
      last = insertNode(i, data[i], data[i + 1], last);
    }
  }

  if (last && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }

  return last;
} // eliminate colinear or duplicate points


function filterPoints(start, end) {
  if (!start) return start;
  if (!end) end = start;
  var p = start,
      again;

  do {
    again = false;

    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      removeNode(p);
      p = end = p.prev;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  } while (again || p !== end);

  return end;
} // main ear slicing loop which triangulates a polygon (given as a linked list)


function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
  if (!ear) return; // interlink polygon nodes in z-order

  if (!pass && invSize) indexCurve(ear, minX, minY, invSize);
  var stop = ear,
      prev,
      next; // iterate through ears, slicing them one by one

  while (ear.prev !== ear.next) {
    prev = ear.prev;
    next = ear.next;

    if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      // cut off the triangle
      triangles.push(prev.i / dim | 0);
      triangles.push(ear.i / dim | 0);
      triangles.push(next.i / dim | 0);
      removeNode(ear); // skipping the next vertex leads to less sliver triangles

      ear = next.next;
      stop = next.next;
      continue;
    }

    ear = next; // if we looped through the whole remaining polygon and can't find any more ears

    if (ear === stop) {
      // try filtering points and slicing again
      if (!pass) {
        earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1); // if this didn't work, try curing all small self-intersections locally
      } else if (pass === 1) {
        ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
        earcutLinked(ear, triangles, dim, minX, minY, invSize, 2); // as a last resort, try splitting the remaining polygon into two
      } else if (pass === 2) {
        splitEarcut(ear, triangles, dim, minX, minY, invSize);
      }

      break;
    }
  }
} // check whether a polygon node forms a valid ear with adjacent nodes


function isEar(ear) {
  var a = ear.prev,
      b = ear,
      c = ear.next;
  if (area(a, b, c) >= 0) return false; // reflex, can't be an ear
  // now make sure we don't have other points inside the potential ear

  var ax = a.x,
      bx = b.x,
      cx = c.x,
      ay = a.y,
      by = b.y,
      cy = c.y; // triangle bbox; min & max are calculated like this for speed

  var x0 = ax < bx ? ax < cx ? ax : cx : bx < cx ? bx : cx,
      y0 = ay < by ? ay < cy ? ay : cy : by < cy ? by : cy,
      x1 = ax > bx ? ax > cx ? ax : cx : bx > cx ? bx : cx,
      y1 = ay > by ? ay > cy ? ay : cy : by > cy ? by : cy;
  var p = c.next;

  while (p !== a) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.next;
  }

  return true;
}

function isEarHashed(ear, minX, minY, invSize) {
  var a = ear.prev,
      b = ear,
      c = ear.next;
  if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

  var ax = a.x,
      bx = b.x,
      cx = c.x,
      ay = a.y,
      by = b.y,
      cy = c.y; // triangle bbox; min & max are calculated like this for speed

  var x0 = ax < bx ? ax < cx ? ax : cx : bx < cx ? bx : cx,
      y0 = ay < by ? ay < cy ? ay : cy : by < cy ? by : cy,
      x1 = ax > bx ? ax > cx ? ax : cx : bx > cx ? bx : cx,
      y1 = ay > by ? ay > cy ? ay : cy : by > cy ? by : cy; // z-order range for the current triangle bbox;

  var minZ = zOrder(x0, y0, minX, minY, invSize),
      maxZ = zOrder(x1, y1, minX, minY, invSize);
  var p = ear.prevZ,
      n = ear.nextZ; // look for points inside the triangle in both directions

  while (p && p.z >= minZ && n && n.z <= maxZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  } // look for remaining points in decreasing z-order


  while (p && p.z >= minZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
  } // look for remaining points in increasing z-order


  while (n && n.z <= maxZ) {
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  }

  return true;
} // go through all polygon nodes and cure small local self-intersections


function cureLocalIntersections(start, triangles, dim) {
  var p = start;

  do {
    var a = p.prev,
        b = p.next.next;

    if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i / dim | 0);
      triangles.push(p.i / dim | 0);
      triangles.push(b.i / dim | 0); // remove two nodes involved

      removeNode(p);
      removeNode(p.next);
      p = start = b;
    }

    p = p.next;
  } while (p !== start);

  return filterPoints(p);
} // try splitting polygon into two and triangulate them independently


function splitEarcut(start, triangles, dim, minX, minY, invSize) {
  // look for a valid diagonal that divides the polygon into two
  var a = start;

  do {
    var b = a.next.next;

    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        // split the polygon in two by the diagonal
        var c = splitPolygon(a, b); // filter colinear points around the cuts

        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next); // run earcut on each half

        earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
        earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
        return;
      }

      b = b.next;
    }

    a = a.next;
  } while (a !== start);
} // link every hole into the outer loop, producing a single-ring polygon without holes


function eliminateHoles(data, holeIndices, outerNode, dim) {
  var queue = [],
      i,
      len,
      start,
      end,
      list;

  for (i = 0, len = holeIndices.length; i < len; i++) {
    start = holeIndices[i] * dim;
    end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
    list = linkedList(data, start, end, dim, false);
    if (list === list.next) list.steiner = true;
    queue.push(getLeftmost(list));
  }

  queue.sort(compareX); // process holes from left to right

  for (i = 0; i < queue.length; i++) {
    outerNode = eliminateHole(queue[i], outerNode);
  }

  return outerNode;
}

function compareX(a, b) {
  return a.x - b.x;
} // find a bridge between vertices that connects hole with an outer ring and and link it


function eliminateHole(hole, outerNode) {
  var bridge = findHoleBridge(hole, outerNode);

  if (!bridge) {
    return outerNode;
  }

  var bridgeReverse = splitPolygon(bridge, hole); // filter collinear points around the cuts

  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
} // David Eberly's algorithm for finding a bridge between hole and outer polygon


function findHoleBridge(hole, outerNode) {
  var p = outerNode,
      hx = hole.x,
      hy = hole.y,
      qx = -Infinity,
      m; // find a segment intersected by a ray from the hole's leftmost point to the left;
  // segment's endpoint with lesser x will be potential connection point

  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);

      if (x <= hx && x > qx) {
        qx = x;
        m = p.x < p.next.x ? p : p.next;
        if (x === hx) return m; // hole touches outer segment; pick leftmost endpoint
      }
    }

    p = p.next;
  } while (p !== outerNode);

  if (!m) return null; // look for points inside the triangle of hole point, segment intersection and endpoint;
  // if there are no points found, we have a valid connection;
  // otherwise choose the point of the minimum angle with the ray as connection point

  var stop = m,
      mx = m.x,
      my = m.y,
      tanMin = Infinity,
      tan;
  p = m;

  do {
    if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
      tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

      if (locallyInside(p, hole) && (tan < tanMin || tan === tanMin && (p.x > m.x || p.x === m.x && sectorContainsSector(m, p)))) {
        m = p;
        tanMin = tan;
      }
    }

    p = p.next;
  } while (p !== stop);

  return m;
} // whether sector in vertex m contains sector in vertex p in the same coordinates


function sectorContainsSector(m, p) {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
} // interlink polygon nodes in z-order


function indexCurve(start, minX, minY, invSize) {
  var p = start;

  do {
    if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p = p.next;
  } while (p !== start);

  p.prevZ.nextZ = null;
  p.prevZ = null;
  sortLinked(p);
} // Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html


function sortLinked(list) {
  var i,
      p,
      q,
      e,
      tail,
      numMerges,
      pSize,
      qSize,
      inSize = 1;

  do {
    p = list;
    list = null;
    tail = null;
    numMerges = 0;

    while (p) {
      numMerges++;
      q = p;
      pSize = 0;

      for (i = 0; i < inSize; i++) {
        pSize++;
        q = q.nextZ;
        if (!q) break;
      }

      qSize = inSize;

      while (pSize > 0 || qSize > 0 && q) {
        if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
          e = p;
          p = p.nextZ;
          pSize--;
        } else {
          e = q;
          q = q.nextZ;
          qSize--;
        }

        if (tail) tail.nextZ = e;else list = e;
        e.prevZ = tail;
        tail = e;
      }

      p = q;
    }

    tail.nextZ = null;
    inSize *= 2;
  } while (numMerges > 1);

  return list;
} // z-order of a point given coords and inverse of the longer side of data bbox


function zOrder(x, y, minX, minY, invSize) {
  // coords are transformed into non-negative 15-bit integer range
  x = (x - minX) * invSize | 0;
  y = (y - minY) * invSize | 0;
  x = (x | x << 8) & 0x00FF00FF;
  x = (x | x << 4) & 0x0F0F0F0F;
  x = (x | x << 2) & 0x33333333;
  x = (x | x << 1) & 0x55555555;
  y = (y | y << 8) & 0x00FF00FF;
  y = (y | y << 4) & 0x0F0F0F0F;
  y = (y | y << 2) & 0x33333333;
  y = (y | y << 1) & 0x55555555;
  return x | y << 1;
} // find the leftmost node of a polygon ring


function getLeftmost(start) {
  var p = start,
      leftmost = start;

  do {
    if (p.x < leftmost.x || p.x === leftmost.x && p.y < leftmost.y) leftmost = p;
    p = p.next;
  } while (p !== start);

  return leftmost;
} // check if a point lies within a convex triangle


function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
  return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
} // check if a diagonal between two polygon nodes is valid (lies in polygon interior)


function isValidDiagonal(a, b) {
  return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && ( // dones't intersect other edges
  locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && ( // locally visible
  area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
  equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0); // special zero-length case
} // signed area of a triangle


function area(p, q, r) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
} // check if two points are equal


function equals(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
} // check if two segments intersect


function intersects(p1, q1, p2, q2) {
  var o1 = sign(area(p1, q1, p2));
  var o2 = sign(area(p1, q1, q2));
  var o3 = sign(area(p2, q2, p1));
  var o4 = sign(area(p2, q2, q1));
  if (o1 !== o2 && o3 !== o4) return true; // general case

  if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1

  if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1

  if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2

  if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

  return false;
} // for collinear points p, q, r, check if point q lies on segment pr


function onSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

function sign(num) {
  return num > 0 ? 1 : num < 0 ? -1 : 0;
} // check if a polygon diagonal intersects any polygon segments


function intersectsPolygon(a, b) {
  var p = a;

  do {
    if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true;
    p = p.next;
  } while (p !== a);

  return false;
} // check if a polygon diagonal is locally inside the polygon


function locallyInside(a, b) {
  return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
} // check if the middle point of a polygon diagonal is inside the polygon


function middleInside(a, b) {
  var p = a,
      inside = false,
      px = (a.x + b.x) / 2,
      py = (a.y + b.y) / 2;

  do {
    if (p.y > py !== p.next.y > py && p.next.y !== p.y && px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x) inside = !inside;
    p = p.next;
  } while (p !== a);

  return inside;
} // link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring


function splitPolygon(a, b) {
  var a2 = new Node(a.i, a.x, a.y),
      b2 = new Node(b.i, b.x, b.y),
      an = a.next,
      bp = b.prev;
  a.next = b;
  b.prev = a;
  a2.next = an;
  an.prev = a2;
  b2.next = a2;
  a2.prev = b2;
  bp.next = b2;
  b2.prev = bp;
  return b2;
} // create a node and optionally link it with previous one (in a circular doubly linked list)


function insertNode(i, x, y, last) {
  var p = new Node(i, x, y);

  if (!last) {
    p.prev = p;
    p.next = p;
  } else {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }

  return p;
}

function removeNode(p) {
  p.next.prev = p.prev;
  p.prev.next = p.next;
  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function Node(i, x, y) {
  // vertex index in coordinates array
  this.i = i; // vertex coordinates

  this.x = x;
  this.y = y; // previous and next vertex nodes in a polygon ring

  this.prev = null;
  this.next = null; // z-order curve value

  this.z = 0; // previous and next nodes in z-order

  this.prevZ = null;
  this.nextZ = null; // indicates whether this is a steiner point

  this.steiner = false;
} // return a percentage difference between the polygon area and its triangulation area;
// used to verify correctness of triangulation


earcut.deviation = function (data, holeIndices, dim, triangles) {
  var hasHoles = holeIndices && holeIndices.length;
  var outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));

  if (hasHoles) {
    for (var i = 0, len = holeIndices.length; i < len; i++) {
      var start = holeIndices[i] * dim;
      var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
      polygonArea -= Math.abs(signedArea(data, start, end, dim));
    }
  }

  var trianglesArea = 0;

  for (i = 0; i < triangles.length; i += 3) {
    var a = triangles[i] * dim;
    var b = triangles[i + 1] * dim;
    var c = triangles[i + 2] * dim;
    trianglesArea += Math.abs((data[a] - data[c]) * (data[b + 1] - data[a + 1]) - (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
  }

  return polygonArea === 0 && trianglesArea === 0 ? 0 : Math.abs((trianglesArea - polygonArea) / polygonArea);
};

function signedArea(data, start, end, dim) {
  var sum = 0;

  for (var i = start, j = end - dim; i < end; i += dim) {
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i;
  }

  return sum;
} // turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts


earcut.flatten = function (data) {
  var dim = data[0][0].length,
      result = {
    vertices: [],
    holes: [],
    dimensions: dim
  },
      holeIndex = 0;

  for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < data[i].length; j++) {
      for (var d = 0; d < dim; d++) {
        result.vertices.push(data[i][j][d]);
      }
    }

    if (i > 0) {
      holeIndex += data[i - 1].length;
      result.holes.push(holeIndex);
    }
  }

  return result;
};

var earcut$1 = earcut$2.exports;

/**
 * https://github.com/Turfjs/turf/blob/master/packages/turf-boolean-clockwise/index.ts
 * @param {*} ring
 * @returns
 */
function isClockwise(ring) {
  var sum = 0;
  var i = 1;
  var prev;
  var cur;
  var len = ring.length;

  while (i < len) {
    prev = cur || ring[0];
    cur = ring[i];
    sum += (cur[0] - prev[0]) * (cur[1] + prev[1]);
    i++;
  }

  return sum > 0;
}

function v3Sub(out, v1, v2) {
  out[0] = v1[0] - v2[0];
  out[1] = v1[1] - v2[1];
  out[2] = v1[2] - v2[2];
  return out;
}

function v3Normalize(out, v) {
  var x = v[0];
  var y = v[1];
  var z = v[2];
  var d = Math.sqrt(x * x + y * y + z * z) || 1;
  out[0] = x / d;
  out[1] = y / d;
  out[2] = z / d;
  return out;
}

function v3Cross(out, v1, v2) {
  var ax = v1[0],
      ay = v1[1],
      az = v1[2],
      bx = v2[0],
      by = v2[1],
      bz = v2[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

function generateNormal(indices, position) {
  function v3Set(p, a, b, c) {
    p[0] = a;
    p[1] = b;
    p[2] = c;
  }

  var p1 = [];
  var p2 = [];
  var p3 = [];
  var v21 = [];
  var v32 = [];
  var n = [];
  var len = indices.length;
  var normals = new Float32Array(position.length);
  var f = 0;

  while (f < len) {
    // const i1 = indices[f++] * 3;
    // const i2 = indices[f++] * 3;
    // const i3 = indices[f++] * 3;
    // const i1 = indices[f];
    // const i2 = indices[f + 1];
    // const i3 = indices[f + 2];
    var a = indices[f],
        b = indices[f + 1],
        c = indices[f + 2];
    var i1 = a * 3,
        i2 = b * 3,
        i3 = c * 3;
    v3Set(p1, position[i1], position[i1 + 1], position[i1 + 2]);
    v3Set(p2, position[i2], position[i2 + 1], position[i2 + 2]);
    v3Set(p3, position[i3], position[i3 + 1], position[i3 + 2]);
    v3Sub(v32, p3, p2);
    v3Sub(v21, p1, p2);
    v3Cross(n, v32, v21); // Already be weighted by the triangle area

    for (var _i = 0; _i < 3; _i++) {
      normals[i1 + _i] += n[_i];
      normals[i2 + _i] += n[_i];
      normals[i3 + _i] += n[_i];
    }

    f += 3;
  }

  var i = 0;
  var l = normals.length;

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
function merge(results) {
  if (results.length === 1) {
    var _result = {
      position: results[0].position,
      normal: results[0].normal,
      uv: results[0].uv,
      indices: results[0].indices,
      results: results
    };
    return _result;
  }

  var plen = 0,
      ilen = 0;

  for (var i = 0, len = results.length; i < len; i++) {
    var _results$i = results[i],
        position = _results$i.position,
        indices = _results$i.indices;
    plen += position.length;
    ilen += indices.length;
  }

  var result = {
    position: new Float32Array(plen),
    normal: new Float32Array(plen),
    uv: new Float32Array(plen / 3 * 2),
    indices: new Uint32Array(ilen),
    results: results
  };
  var pOffset = 0,
      pCount = 0,
      iIdx = 0,
      uvOffset = 0;

  for (var _i2 = 0, _len = results.length; _i2 < _len; _i2++) {
    var _results$_i = results[_i2],
        _position = _results$_i.position,
        _indices = _results$_i.indices,
        normal = _results$_i.normal,
        uv = _results$_i.uv;
    result.position.set(_position, pOffset);
    result.normal.set(normal, pOffset);
    result.uv.set(uv, uvOffset);
    var j = 0;
    var len1 = _indices.length;

    while (j < len1) {
      var pIndex = _indices[j] + pCount;
      result.indices[iIdx] = pIndex;
      iIdx++;
      j++;
    }

    uvOffset += uv.length;
    pOffset += _position.length;
    pCount += _position.length / 3;
  }

  return result;
}
function radToDeg(rad) {
  return rad * 180 / Math.PI;
}
function degToRad(angle) {
  return angle / 180 * Math.PI;
} // https://github.com/mrdoob/three.js/blob/16f13e3b07e31d0e9a00df7c3366bbe0e464588c/src/geometries/ExtrudeGeometry.js?_pjax=%23js-repo-pjax-container#L736

function generateSideWallUV(uvs, vertices, indexA, indexB, indexC, indexD) {
  var idx1 = indexA * 3,
      idx2 = indexB * 3,
      idx3 = indexC * 3,
      idx4 = indexD * 3;
  var a_x = vertices[idx1];
  var a_y = vertices[idx1 + 1];
  var a_z = vertices[idx1 + 2];
  var b_x = vertices[idx2];
  var b_y = vertices[idx2 + 1];
  var b_z = vertices[idx2 + 2];
  var c_x = vertices[idx3];
  var c_y = vertices[idx3 + 1];
  var c_z = vertices[idx3 + 2];
  var d_x = vertices[idx4];
  var d_y = vertices[idx4 + 1];
  var d_z = vertices[idx4 + 2];

  if (Math.abs(a_y - b_y) < Math.abs(a_x - b_x)) {
    uvs.push(a_x, 1 - a_z);
    uvs.push(b_x, 1 - b_z);
    uvs.push(c_x, 1 - c_z);
    uvs.push(d_x, 1 - d_z);
  } else {
    uvs.push(a_y, 1 - a_z);
    uvs.push(b_y, 1 - b_z);
    uvs.push(c_y, 1 - c_z);
    uvs.push(d_y, 1 - d_z);
  }
}

function extrudePolygons(polygons, options) {
  options = Object.assign({}, {
    depth: 2
  }, options);
  var results = polygons.map(function (polygon) {
    for (var i = 0, len = polygon.length; i < len; i++) {
      var ring = polygon[i];
      validateRing(ring);

      if (i === 0) {
        if (!isClockwise(ring)) {
          polygon[i] = ring.reverse();
        }
      } else if (isClockwise(ring)) {
        polygon[i] = ring.reverse();
      }

      if (isClosedRing(ring)) {
        ring.splice(ring.length - 1, 1);
      }
    }

    var result = flatVertices(polygon, options);
    result.polygon = polygon;
    var triangles = earcut$1(result.flatVertices, result.holes, 2);
    generateTopAndBottom$1(result, triangles);
    generateSides$1(result, options);
    result.position = new Float32Array(result.points);
    result.indices = new Uint32Array(result.index);
    result.uv = new Float32Array(result.uvs);
    result.normal = generateNormal(result.indices, result.position);
    return result;
  });
  var result = merge(results);
  result.polygons = polygons;
  return result;
}

function generateTopAndBottom$1(result, triangles) {
  var index = [];
  var count = result.count;

  for (var i = 0, len = triangles.length; i < len; i += 3) {
    // top
    var a = triangles[i],
        b = triangles[i + 1],
        c = triangles[i + 2];
    index[i] = a;
    index[i + 1] = b;
    index[i + 2] = c; // bottom

    var idx = len + i;
    var a1 = count + a,
        b1 = count + b,
        c1 = count + c;
    index[idx] = a1;
    index[idx + 1] = b1;
    index[idx + 2] = c1;
  }

  result.index = index;
}

function generateSides$1(result, options) {
  var points = result.points,
      index = result.index,
      polygon = result.polygon,
      uvs = result.uvs;
  var z = options.depth;

  for (var i = 0, len = polygon.length; i < len; i++) {
    var ring = polygon[i];
    var j = 0;
    var len1 = ring.length;

    while (j < len1) {
      var v1 = ring[j];
      var v2 = ring[j + 1];

      if (j === len1 - 1) {
        v2 = ring[0];
      }

      var idx = points.length / 3;
      var x1 = v1[0],
          y1 = v1[1],
          x2 = v2[0],
          y2 = v2[1];
      points.push(x1, y1, z, x2, y2, z, x1, y1, 0, x2, y2, 0);
      var a = idx + 2,
          b = idx + 3,
          c = idx,
          d = idx + 1; // points.push(p3, p4, p1, p2);

      index.push(a, c, b, c, d, b); // index.push(c, d, b);

      generateSideWallUV(uvs, points, a, b, c, d);
      j++;
    }
  }
}

function calPolygonPointsCount(polygon) {
  var count = 0;
  var i = 0;
  var len = polygon.length;

  while (i < len) {
    count += polygon[i].length;
    i++;
  }

  return count;
}

function flatVertices(polygon, options) {
  var count = calPolygonPointsCount(polygon);
  var len = polygon.length;
  var holes = [],
      flatVertices = new Float32Array(count * 2),
      points = [],
      uvs = [];
  var pOffset = count * 3,
      uOffset = count * 2;
  var z = options.depth;
  var idx0 = 0,
      idx1 = 0,
      idx2 = 0;

  for (var i = 0; i < len; i++) {
    var ring = polygon[i];

    if (i > 0) {
      holes.push(idx0 / 2);
    }

    var j = 0;
    var len1 = ring.length;

    while (j < len1) {
      var c = ring[j];
      var x = c[0],
          y = c[1];
      flatVertices[idx0++] = x;
      flatVertices[idx0++] = y; // top vertices

      points[idx1] = x;
      points[idx1 + 1] = y;
      points[idx1 + 2] = z; // bottom vertices

      points[pOffset + idx1] = x;
      points[pOffset + idx1 + 1] = y;
      points[pOffset + idx1 + 2] = 0;
      uvs[idx2] = x;
      uvs[idx2 + 1] = y;
      uvs[uOffset + idx2] = x;
      uvs[uOffset + idx2 + 1] = y;
      idx1 += 3;
      idx2 += 2;
      j++;
    }
  }

  return {
    flatVertices: flatVertices,
    holes: holes,
    points: points,
    count: count,
    uvs: uvs
  };
}

function validateRing(ring) {
  if (!isClosedRing(ring)) {
    ring.push(ring[0]);
  }
}

function isClosedRing(ring) {
  var len = ring.length;
  var _ring$ = ring[0],
      x1 = _ring$[0],
      y1 = _ring$[1],
      _ring = ring[len - 1],
      x2 = _ring[0],
      y2 = _ring[1];
  return x1 === x2 && y1 === y2;
}

function extrudePolylines(lines, options) {
  options = Object.assign({}, {
    depth: 2,
    lineWidth: 1
  }, options);
  var results = lines.map(function (line) {
    var result = expandLine(line, options);
    result.line = line;
    generateTopAndBottom(result, options);
    generateSides(result, options);
    result.position = new Float32Array(result.points);
    result.indices = new Uint32Array(result.index);
    result.uv = new Float32Array(result.uvs);
    result.normal = generateNormal(result.indices, result.position);
    return result;
  });
  var result = merge(results);
  result.lines = lines;
  return result;
}

function generateTopAndBottom(result, options) {
  var z = options.depth;
  var points = [],
      index = [],
      uvs = [];
  var leftPoints = result.leftPoints,
      rightPoints = result.rightPoints;
  var i = 0,
      len = leftPoints.length;

  while (i < len) {
    // top left
    var idx0 = i * 3;
    var _leftPoints$i = leftPoints[i],
        x1 = _leftPoints$i[0],
        y1 = _leftPoints$i[1];
    points[idx0] = x1;
    points[idx0 + 1] = y1;
    points[idx0 + 2] = z; // top right

    var _rightPoints$i = rightPoints[i],
        x2 = _rightPoints$i[0],
        y2 = _rightPoints$i[1];
    var idx1 = len * 3 + idx0;
    points[idx1] = x2;
    points[idx1 + 1] = y2;
    points[idx1 + 2] = z; // bottom left

    var idx2 = len * 2 * 3 + idx0;
    points[idx2] = x1;
    points[idx2 + 1] = y1;
    points[idx2 + 2] = 0; // bottom right

    var idx3 = len * 2 * 3 + len * 3 + idx0;
    points[idx3] = x2;
    points[idx3 + 1] = y2;
    points[idx3 + 2] = 0;
    i++;
  }

  i = 0;
  len = points.length;

  while (i < len) {
    var x = points[i],
        y = points[i + 1];
    uvs.push(x, y);
    i += 3;
  }

  i = 0;
  len = leftPoints.length;

  while (i < len - 1) {
    // top
    // left1 left2 right1,right2
    var a1 = i,
        b1 = i + 1,
        c1 = a1 + len,
        d1 = b1 + len;
    index.push(a1, c1, b1);
    index.push(c1, d1, b1); // bottom
    // left1 left2 right1,right2

    var len2 = len * 2;
    var a2 = i + len2,
        b2 = a2 + 1,
        c2 = a2 + len,
        d2 = b2 + len;
    index.push(a2, c2, b2);
    index.push(c2, d2, b2);
    i++;
  }

  result.index = index;
  result.points = points;
  result.uvs = uvs;
}

function generateSides(result, options) {
  var points = result.points,
      index = result.index,
      leftPoints = result.leftPoints,
      rightPoints = result.rightPoints,
      uvs = result.uvs;
  var z = options.depth;
  var rings = [leftPoints, rightPoints];

  function addOneSideIndex(v1, v2) {
    var idx = points.length / 3;
    points.push(v1[0], v1[1], z, v2[0], v2[1], z, v1[0], v1[1], 0, v2[0], v2[1], 0);
    var a = idx + 2,
        b = idx + 3,
        c = idx,
        d = idx + 1;
    index.push(a, c, b, c, d, b);
    generateSideWallUV(uvs, points, a, b, c, d);
  }

  for (var i = 0, _len = rings.length; i < _len; i++) {
    var ring = rings[i];

    if (i > 0) {
      ring = ring.map(function (p) {
        return p;
      });
      ring = ring.reverse();
    }

    var j = 0;
    var len1 = ring.length - 1;

    while (j < len1) {
      var v1 = ring[j];
      var v2 = ring[j + 1];
      addOneSideIndex(v1, v2);
      j++;
    }
  }

  var len = leftPoints.length;
  var vs = [rightPoints[0], leftPoints[0], leftPoints[len - 1], rightPoints[len - 1]];

  for (var _i = 0; _i < vs.length; _i += 2) {
    var _v = vs[_i],
        _v2 = vs[_i + 1];
    addOneSideIndex(_v, _v2);
  }
}

var TEMPV1 = {
  x: 0,
  y: 0
},
    TEMPV2 = {
  x: 0,
  y: 0
};
function expandLine(line, options) {
  var preAngle = 0;
  var radius = options.lineWidth / 2;
  var points = [],
      leftPoints = [],
      rightPoints = [];
  var len = line.length;
  var i = 0;

  while (i < len - 1) {
    var _p = line[i],
        _p2 = line[i + 1];
    var dy = _p2[1] - _p[1],
        dx = _p2[0] - _p[0];
    var _rAngle = 0;
    var rad = Math.atan(dy / dx);
    var angle = radToDeg(rad);
    preAngle = angle;

    if (i === 0) {
      _rAngle = angle;
      _rAngle -= 90;
    } else {
      var p0 = line[i - 1];
      TEMPV1.x = p0[0] - _p[0];
      TEMPV1.y = p0[1] - _p[1];
      TEMPV2.x = _p2[0] - _p[0];
      TEMPV2.y = _p2[1] - _p[1];
      var vAngle = getAngle(TEMPV1, TEMPV2);
      _rAngle = angle - vAngle / 2;
    }

    var _rRad = degToRad(_rAngle);

    var _calOffsetPoint = calOffsetPoint(_rRad, radius, _p),
        _op = _calOffsetPoint[0],
        _op2 = _calOffsetPoint[1];

    points.push(_op, _op2);

    if (leftOnLine(_op, _p, _p2)) {
      leftPoints.push(_op);
      rightPoints.push(_op2);
    } else {
      leftPoints.push(_op2);
      rightPoints.push(_op);
    }

    i++;
  }

  var rAngle = preAngle;
  rAngle -= 90;
  var rRad = degToRad(rAngle);
  var p1 = line[len - 2];
  var p2 = line[len - 1];

  var _calOffsetPoint2 = calOffsetPoint(rRad, radius, p2),
      op1 = _calOffsetPoint2[0],
      op2 = _calOffsetPoint2[1];

  points.push(op1, op2);

  if (leftOnLine(op1, p1, p2)) {
    leftPoints.push(op1);
    rightPoints.push(op2);
  } else {
    leftPoints.push(op2);
    rightPoints.push(op1);
  }

  return {
    offsetPoints: points,
    leftPoints: leftPoints,
    rightPoints: rightPoints
  };
}

function calOffsetPoint(rad, radius, p) {
  var x = p[0],
      y = p[1];
  var x1 = Math.cos(rad) * radius,
      y1 = Math.sin(rad) * radius;
  var p1 = [x + x1, y + y1];
  var rad1 = rad += Math.PI;
  var x2 = Math.cos(rad1) * radius,
      y2 = Math.sin(rad1) * radius;
  var p2 = [x + x2, y + y2];
  return [p1, p2];
}

var getAngle = function getAngle(_ref, _ref2) {
  var x1 = _ref.x,
      y1 = _ref.y;
  var x2 = _ref2.x,
      y2 = _ref2.y;
  var dot = x1 * x2 + y1 * y2;
  var det = x1 * y2 - y1 * x2;
  var angle = Math.atan2(det, dot) / Math.PI * 180;
  return (angle + 360) % 360;
};

function leftOnLine(p, p1, p2) {
  var x1 = p1[0],
      y1 = p1[1];
  var x2 = p2[0],
      y2 = p2[1];
  var x = p[0],
      y = p[1];
  return (y1 - y2) * x + (x2 - x1) * y + x1 * y2 - x2 * y1 > 0;
}

function cylinder(point, options) {
  if (options === void 0) {
    options = {};
  }

  options = Object.assign({}, {
    radius: 1,
    height: 2,
    radialSegments: 6
  }, options);
  var radialSegments = Math.round(Math.max(4, options.radialSegments));
  var _options = options,
      radius = _options.radius,
      height = _options.height;
  var aRad = 360 / radialSegments / 360 * Math.PI * 2;
  var circlePointsLen = radialSegments + 1;
  var points = new Float32Array(circlePointsLen * 3 * 2);
  var centerx = point[0],
      centery = point[1];
  var idx = 0,
      uIdx = 0;
  var offset = circlePointsLen * 3,
      uOffset = circlePointsLen * 2;
  var indices = [],
      uvs = [];

  for (var i = -1; i < radialSegments; i++) {
    var rad = aRad * i;
    var x = Math.cos(rad) * radius + centerx,
        y = Math.sin(rad) * radius + centery; // bottom vertices

    points[idx] = x;
    points[idx + 1] = y;
    points[idx + 2] = 0; // top vertices

    points[idx + offset] = x;
    points[idx + 1 + offset] = y;
    points[idx + 2 + offset] = height;
    var u = 0,
        v = 0;
    u = 0.5 + x / radius / 2;
    v = 0.5 + y / radius / 2;
    uvs[uIdx] = u;
    uvs[uIdx + 1] = v;
    uvs[uIdx + uOffset] = u;
    uvs[uIdx + 1 + uOffset] = v;
    idx += 3;
    uIdx += 2;

    if (i > 1) {
      // bottom indices
      indices.push(0, i - 1, i);
    }
  }

  idx -= 3;
  points[idx] = points[0];
  points[idx + 1] = points[1];
  points[idx + 2] = points[2];
  var pointsLen = points.length;
  points[pointsLen - 3] = points[0];
  points[pointsLen - 2] = points[1];
  points[pointsLen - 1] = height;
  var indicesLen = indices.length; // top indices

  for (var _i = 0; _i < indicesLen; _i++) {
    var index = indices[_i];
    indices.push(index + circlePointsLen);
  }

  var sidePoints = new Float32Array((circlePointsLen * 3 * 2 - 6) * 2);
  var pIndex = -1;
  idx = circlePointsLen * 2;
  uIdx = 0;

  for (var _i2 = 0, len = points.length / 2; _i2 < len - 3; _i2 += 3) {
    var x1 = points[_i2],
        y1 = points[_i2 + 1],
        x2 = points[_i2 + 3],
        y2 = points[_i2 + 4];
    sidePoints[++pIndex] = x1;
    sidePoints[++pIndex] = y1;
    sidePoints[++pIndex] = height;
    sidePoints[++pIndex] = x2;
    sidePoints[++pIndex] = y2;
    sidePoints[++pIndex] = height;
    sidePoints[++pIndex] = x1;
    sidePoints[++pIndex] = y1;
    sidePoints[++pIndex] = 0;
    sidePoints[++pIndex] = x2;
    sidePoints[++pIndex] = y2;
    sidePoints[++pIndex] = 0;
    var a = idx + 2,
        b = idx + 3,
        c = idx,
        d = idx + 1; // indices.push(a, c, b, c, d, b);

    indices.push(c, a, d, a, b, d);
    idx += 4;
    var u1 = uIdx / circlePointsLen,
        u2 = (uIdx + 1) / circlePointsLen;
    uvs.push(u1, height / radius / 2, u2, height / radius / 2, u1, 0, u2, 0);
    uIdx++;
  }

  var position = new Float32Array(points.length + sidePoints.length);
  position.set(points, 0);
  position.set(sidePoints, points.length);
  var normal = generateNormal(indices, position);
  return {
    points: points,
    indices: new Uint32Array(indices),
    position: position,
    normal: normal,
    uv: new Float32Array(uvs)
  };
}

export { cylinder, expandLine, extrudePolygons, extrudePolylines };
