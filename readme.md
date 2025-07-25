# poly-extrude

Extrude polygons/polylines. Born in [maptalks.three](https://github.com/maptalks/maptalks.three) project<br>

<!-- ## Examples

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
[![](./gallery/terrain.png)](https://deyihu.github.io/poly-extrude/test/terrain.html)<br>

[shape demo ](https://deyihu.github.io/poly-extrude/test/shape.html)<br> -->

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
      polygons,
      extrudePolygons,
      extrudePolygonsOnPath,
      extrudePolylines,
      cylinder,
      expandPaths,
      extrudeSlopes,
      expandTubes,
      plane
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
* `options.top` Whether to display the top

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
[building](https://deyihu.github.io/poly-extrude/test/building.html)  
[buildings](https://deyihu.github.io/poly-extrude/test/buildings.html)  
[china](https://deyihu.github.io/poly-extrude/test/china.html)  
[muti polygon](https://deyihu.github.io/poly-extrude/test/multi-polygon.html)  
[ny buildings](https://deyihu.github.io/poly-extrude/test/ny-building.html)  
[custom shape](https://deyihu.github.io/poly-extrude/test/shape.html)  

___

![](./img/extrudepolygonsonpath.png)

### `extrudePolygonsOnPath(polygons, options)`

* `polygons`
* `options.extrudePath` is line
* `options.openEnd`
* `options.openEndUV`
* `options.polygonRotation`

```js
  const result = extrudePolygonsOnPath(polygons, {
      extrudePath: [
          [0, 0],
          [100, 0]
      ]
  });
  const {
      positon,
      normal,
      uv,
      indices
  } = result;
  //do something
```

[base demo](https://deyihu.github.io/poly-extrude/test/polygon-on-path.html)  
[wireframe demo](https://deyihu.github.io/poly-extrude/test/polygon-on-path-wireframe.html)  
[with holes](https://deyihu.github.io/poly-extrude/test/polygon-on-path-hole.html)  
[with holes by custom shape](https://deyihu.github.io/poly-extrude/test/polygon-on-path-hole1.html)  
[polygonRotation](https://deyihu.github.io/poly-extrude/test/polygon-on-path-rotation.html)  
[extrude along spring](https://deyihu.github.io/poly-extrude/test/polygon-on-path-spring.html)  
[extrude taihu lake](https://deyihu.github.io/poly-extrude/test/polygon-on-path-taihu.html)  
[extrude by curve](https://deyihu.github.io/poly-extrude/test/polygon-on-path-curve.html)  


___


![](./img/extrudePolylines.png)

### `extrudePolylines(lines, options)`

* `lines`
* `options.depth`
* `options.lineWidth`
* `options.bottomStickGround`  Is the bottom attached to the ground 
* `options.pathUV`  generate Path UV

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
[line](https://deyihu.github.io/poly-extrude/test/line.html)  
[line uv](https://deyihu.github.io/poly-extrude/test/line-uv.html)  
[line pathUV](https://deyihu.github.io/poly-extrude/test/line-pathuv.html)  
[brige](https://deyihu.github.io/poly-extrude/test/brige.html)  
[brige bottomStickGround](https://deyihu.github.io/poly-extrude/test/brige-bottomStickGround.html)  
[extrude brige](https://deyihu.github.io/poly-extrude/test/extrudepolyline-brige.html)  
[spring](https://deyihu.github.io/poly-extrude/test/spring.html)  
[wall](https://deyihu.github.io/poly-extrude/test/wall.html)  
[street](https://deyihu.github.io/poly-extrude/test/street.html)  




___


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
[cylinder](https://deyihu.github.io/poly-extrude/test/cylinder.html)  
___



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

[paths](https://deyihu.github.io/poly-extrude/test/expand-path.html)  
[street paths](https://deyihu.github.io/poly-extrude/test/expand-path-street.html)  
[brige paths](https://deyihu.github.io/poly-extrude/test/expand-paths-brige.html)  
___


![](./img/extrudeSlopes.png)

### `extrudeSlopes(lines, options)`

* `lines`
* `options.depth`
* `options.lineWidth`
* `options.side` Which side serves as the slope, 'left' or 'right'
* `options.sideDepth` slope depth 
* `options.bottomStickGround` Is the bottom attached to the ground
* `options.pathUV`  generate Path UV


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

[slope](https://deyihu.github.io/poly-extrude/test/slope.html)  
[extrudeSlopes pathUV demo](https://deyihu.github.io/poly-extrude/test/slope-pathuv.html)   
___

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

[tube](https://deyihu.github.io/poly-extrude/test/tube.html)  
___

![](./img/plane.png)

### `plane(width, height,devideW,devideH)`

* `width`
* `height`
* `devideW`
* `devideH`


```js
const result = plane(100, 100, 10, 10);
const {

    positon,
    normal,
    uv,
    indices

} = result;
//do something
```

[plane demo](https://deyihu.github.io/poly-extrude/test/plane.html)  
[custom terrain demo](https://deyihu.github.io/poly-extrude/test/terrain.html)  

___

![](./img/polygons.png)

### `polygons(polygons, options)`

* `polygons`

```js
  const result = polygons(polygons, {

  });
  const {
      positon,
      normal,
      uv,
      indices
  } = result;
  //do something
```

[polygons demo](https://deyihu.github.io/poly-extrude/test/simplepolygon.html)
