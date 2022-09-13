# poly-extrude

Extrude polygons/polylines. Born in [maptalks.three](https://github.com/maptalks/maptalks.three) project<br>
[building](https://deyihu.github.io/poly-extrude/test/building.html)<br>
![](./gallery/building.png)<br>
[buildings](https://deyihu.github.io/poly-extrude/test/buildings.html)<br>
![](./gallery/buildings.png)<br>
[multi-polygon](https://deyihu.github.io/poly-extrude/test/multi-polygon.html)<br>
![](./gallery/multi-polygon.png)<br>
[street](https://deyihu.github.io/poly-extrude/test/street.html)<br>
![](./gallery/street.png)<br>
[line-uv](https://deyihu.github.io/poly-extrude/test/line-uv.html)<br>
![](./gallery/line-uv.png)
[ny-building](https://deyihu.github.io/poly-extrude/test/ny-building.html)<br>
![](./gallery/ny-building.png)
[cylinder](https://deyihu.github.io/poly-extrude/test/cylinder.html)<br>
![](./gallery/cylinder.png)

## install

```sh
npm i poly-extrude

#   or

yarn add poly-extrude

# or

pnpm i poly-extrude
```

## API

### ESM

```js
  import {
      extrudePolygons,
      extrudePolylines,
      cylinder
  } from 'poly-extrude';
  const polygons = [
      //polygon
      [
          //outring
          [
              [x, y],
              [x, y], ...........
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
  ]

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

  const polylines = [
      // polyline
      [
          [x, y],
          [x, y], ...........
      ],
      //polyline
      [
          [x, y],
          [x, y], ...........
      ],
  ];

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

### CDN

```html
<script src="https://unpkg.com/poly-extrude/dist/poly-extrude.js"></script>

<script>
    const polygons = [
        //polygon
        [
            //outring
            [
                [x, y],
                [x, y], ...........
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
    ]

    const result = polyextrude.extrudePolygons(polygons, {
        depth: 2
    })
    const {
        positon,
        normal,
        uv,
        indices
    } = result;
    //do something

    const polylines = [
        // polyline
        [
            [x, y],
            [x, y], ...........
        ],
        //polyline
        [
            [x, y],
            [x, y], ...........
        ],
    ];

    const result = polyextrude.extrudePolylines(polylines, {
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

    const center = [0, 0];
    const result = polyextrude.cylinder(center, {
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
</script>
```
