# poly-extrude

Extrude polygons/polylines. Born in [maptalks.three](https://github.com/maptalks/maptalks.three) project

![](./gallery/building.png)
![](./gallery/buildings.png)
![](./gallery/multi-polygon.png)
![](./gallery/street.png)
![](./gallery/line-uv.png)

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
  import {extrudePolygons,extrudePolyline} from 'poly-extrude';
  const polygons=[
    //polygon
     [
        //outring
        [[x,y],[x,y],...........],
        //holes
        [[x,y],[x,y],...........],
        ........

     ],
     //other polygons
     ......
  ]

  const result = extrudePolygons(polygons,{depth:2});
  const {positon,normal,uv,indices}=result;
  //do something

  const polylines=[
        // polyline
        [[x,y],[x,y],...........],
        //polyline
        [[x,y],[x,y],...........],
  ];

  const result = extrudePolyline(polylines,{depth:2,lineWidth:2});
  const {positon,normal,uv,indices}=result;
  //do something
```

### CDN

```html
<script src="https://unpkg.com/poly-extrude/dist/poly-extrude.js"></script>

<script>
    const polygons=[
        //polygon
        [
            //outring
            [[x,y],[x,y],...........],
            //holes
            [[x,y],[x,y],...........],
            ........

        ],
        //other polygons
        ......
    ]

    const result =    polyextrude.extrudePolygons(polygons,{depth:2})
    const {positon,normal,uv,indices}=result;
    //do something

    const polylines=[
            // polyline
            [[x,y],[x,y],...........],
            //polyline
            [[x,y],[x,y],...........],
    ];

    const result = polyextrude.extrudePolyline(polylines,{depth:2,lineWidth:2});
    const {positon,normal,uv,indices}=result;
    //do something
</script>
```
