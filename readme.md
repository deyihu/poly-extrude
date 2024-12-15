# poly-extrude

Extrude polygons/polylines. Born in [maptalks.three](https://github.com/maptalks/maptalks.three) project<br>

## Examples

[![](./gallery/building.png)](https://deyihu.github.io/poly-extrude/test/building.html)

[![](./gallery/buildings.png)](https://deyihu.github.io/poly-extrude/test/buildings.html)

[![](./gallery/multi-polygon.png)](https://deyihu.github.io/poly-extrude/test/multi-polygon.html)<br>
[![](./gallery/street.png)](https://deyihu.github.io/poly-extrude/test/street.html)<br>
[![](./gallery/line-uv.png)](https://deyihu.github.io/poly-extrude/test/line-uv.html)<br>
[![](./gallery/ny-building.png)](https://deyihu.github.io/poly-extrude/test/ny-building.html)<br>
[![](./gallery/cylinder.png)](https://deyihu.github.io/poly-extrude/test/cylinder.html)<br>
[![](./gallery/brige.png)](https://deyihu.github.io/poly-extrude/test/brige.html)<br>
[![](./gallery/spring.png)](https://deyihu.github.io/poly-extrude/test/spring.html)<br>
[![](./gallery/expand-paths-brige.png)](https://deyihu.github.io/poly-extrude/test/expand-paths-brige.html)<br>
[![](./gallery/slope.png)](https://deyihu.github.io/poly-extrude/test/slope.html)<br>

[![](./gallery/tube.png)](https://deyihu.github.io/poly-extrude/test/tube.html)<br>

## Install

### NPM

```sh
npm i poly-extrude
```

### CDN

```html
<script type="text/javascript" src="https://unpkg.com/poly-extrude/dist/poly-extrude.js"></script>
```

## Use

```js
  import {
      extrudePolygons,
      extrudePolylines,
      cylinder,
      expandPaths,
      extrudeSlopes,
      expandTubes
  } from 'poly-extrude';

  //if you use cdn,the namespace is polyextrude

  //   const {
  //       extrudePolygons,
  //       extrudePolylines
  //   } = window.polyextrude;

  const polygons = [
      //polygon
      [
          //outring
          [
              [x, y],
              [x, y],
              ...........
          ],
          //holes
          [
              [x, y],
              [x, y], ...........
          ],
          ........

      ],
      //other polygons
      ......
  ];

  const polylines = [
      // polyline
      [
          [x, y],
          [x, y],
          ...........
      ],
      //polyline
      [
          [x, y],
          [x, y],
          ...........
      ],
  ];

  const result = extrudePolygons(polygons, {
      depth: 2
  });
  const {
      positon,
      normal,
      uv,
      indices
  } = result;
  //do something
```

## API

![](./img/extrudePolygons.png)

### `extrudePolygons(polygons, options)`

* `polygons`
* `options.depth`

```js
  const result = extrudePolygons(polygons, {
      depth: 2
  });
  const {
      positon,
      normal,
      uv,
      indices
  } = result;
  //do something
```

![](./img/extrudePolylines.png)
### `extrudePolylines(lines, options)`

* `lines`
* `options.depth`
* `options.lineWidth`
* `options.bottomStickGround`  Is the bottom attached to the ground 
* `options.pathuV`  generate Path UV

```js
   const result = extrudePolylines(polylines, {
       depth: 2,
       lineWidth: 2
   });
   const {
       positon,
       normal,
       uv,
       indices
   } = result;
   //do something
```

![](./img/cylinder.png)
### `cylinder(center, options)`

* `center`
* `options.radius`
* `options.height`
* `options.radialSegments`

```js
const center = [0, 0];
const result = cylinder(center, {

    radius: 1,
    height: 2,
    radialSegments: 6

});
const {
    positon,
    normal,
    uv,
    indices

} = result;
//do something
```

![](./img/expandPaths.png)
### `expandPaths(lines, options)`

* `lines`
* `options.lineWidth`

```js
const result = expandPaths(polylines, {

    cornerRadius: 0.5,
    lineWidth: 2

});
const {

    positon,
    normal,
    uv,
    indices

} = result;
//do something
```

![](./img/extrudeSlopes.png)

### `extrudeSlopes(lines, options)`

* `lines`
* `options.depth`
* `options.lineWidth`
* `options.side` Which side serves as the slope, 'left' or 'right'
* `options.sideDepth` slope depth 
* `options.bottomStickGround` Is the bottom attached to the ground
* `options.pathuV`  generate Path UV

```js
const result = extrudeSlopes(polylines, {

    depth: 1,
    side: 'left',
    sideDepth: 0,
    lineWidth: 2

});
const {

    positon,
    normal,
    uv,
    indices

} = result;
//do something
```

![](./img/expandTubes.png)
### `expandTubes(lines, options)`

* `lines`
* `options.radius`
* `options.radialSegments`

```js
const result = expandTubes(polylines, {

    radius: 1,
    radialSegments: 8

});
const {

    positon,
    normal,
    uv,
    indices

} = result;
//do something
```
