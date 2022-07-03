// eslint-disable-next-line no-unused-vars
function flatCoordinates(geojson) {
    const [minx, miny, maxx, maxy] = window.bbox(geojson);
    const centerX = (minx + maxx) / 2, centerY = (miny + maxy) / 2;
    const dx = maxx - minx, dy = maxy - miny;
    const max = Math.max(dx, dy);
    geojson.features.forEach(feature => {
        const { coordinates, type } = feature.geometry;
        const scale = 160 / max;
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
    });

}

// eslint-disable-next-line no-unused-vars
function getGeoJSON(url) {
    return fetch(url).then(res => res.json());
}

// eslint-disable-next-line no-unused-vars
function createBufferGeometry(result) {
    // eslint-disable-next-line no-unused-vars
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
    // geometry.computeVertexNormals();

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

// eslint-disable-next-line no-unused-vars
function createScene() {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb0b0b0);
    //

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 100000);
    camera.position.set(0, 0, 200);

    //

    const directionalLight = new THREE.DirectionalLight('#fff', 0.9);
    directionalLight.position.set(0.75, 0.75, 1.0).normalize();
    scene.add(directionalLight);

    // const ambientLight = new THREE.AmbientLight('#FFF', 0.5);
    // scene.add(ambientLight);

    //

    const helper = new THREE.GridHelper(200, 10);
    helper.rotation.x = Math.PI / 2;
    scene.add(helper);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10;
    controls.maxDistance = 1000;

    function animation() {
        requestAnimationFrame(animation);

        renderer.render(scene, camera);
    }
    animation();
    return scene;

}
