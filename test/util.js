// eslint-disable-next-line no-unused-vars
function flatCoordinates(feature, scale = 1000) {
    const { coordinates, type } = feature.geometry;
    const [minx, miny, maxx, maxy] = window.bbox(feature);
    const centerX = (minx + maxx) / 2, centerY = (miny + maxy) / 2;
    if (['MultiLineString', 'Polygon'].includes(type)) {
        coordinates.forEach(coord => {
            coord.forEach(c => {
                c[0] -= centerX;
                c[1] -= centerY;
                c[0] *= scale;
                c[1] *= scale;
            });
        });

    }
    if (type === 'MultiPolygon') {
        coordinates.forEach(coords => {
            coords.forEach(coord => {
                coord.forEach(c => {
                    c[0] -= centerX;
                    c[1] -= centerY;
                    c[0] *= scale;
                    c[1] *= scale;
                });
            });
        });
    }
    if (type === 'LineString') {
        coordinates.forEach(c => {
            c[0] -= centerX;
            c[1] -= centerY;
            c[0] *= scale;
            c[1] *= scale;
        });
    }
}

// eslint-disable-next-line no-unused-vars
function getGeoJSON(url) {
    return fetch(url).then(res => res.json());
}

// eslint-disable-next-line no-unused-vars
function createBufferGeometry(result) {
    const { position, indices, normal } = result;
    // eslint-disable-next-line no-undef
    const geometry = new THREE.BufferGeometry();
    // eslint-disable-next-line no-undef
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    // eslint-disable-next-line no-undef
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    // // eslint-disable-next-line no-undef
    // geometry.addAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // eslint-disable-next-line no-undef
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // eslint-disable-next-line no-undef
    const topColor = new THREE.Color('#fff'), bottomColor = new THREE.Color('#2d2f61');
    const len = position.length;
    const colors = new Float32Array(len);
    for (let j = 0; j < len; j += 3) {
        const z = position[j + 2];
        if (z > 0) {
            colors[j] = topColor.r;
            colors[j + 1] = topColor.g;
            colors[j + 2] = topColor.b;
        } else {
            colors[j] = bottomColor.r;
            colors[j + 1] = bottomColor.g;
            colors[j + 2] = bottomColor.b;
        }
    }
    // eslint-disable-next-line no-undef
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
}
