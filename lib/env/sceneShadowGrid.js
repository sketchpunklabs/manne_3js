// #region IMPORTS
import * as THREE from 'three';
// #endregion

export default function sceneShadowGrid( tjs, props={} ){
    // const pp = Object.assign( { ambient:0x404040, grid:true }, props );

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Scene
    tjs.scene.background = new THREE.Color( 0x0e1116 );
    tjs.scene.fog        = new THREE.Fog( 0x0e1116, 13, 30 );

    // const pmrem                    = new THREE.PMREMGenerator( tjs.renderer );
    // tjs.scene.environment          = pmrem.fromScene( new RoomEnvironment(), 0.04 ).texture;
    // tjs.scene.environmentIntensity = 0.45;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Floor
    const size   = 70;
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry( size, size ),
        new THREE.MeshStandardMaterial({ color:0x1e2535, roughness:1 }) );
    ground.rotation.x    = -Math.PI / 2;
    ground.receiveShadow = true;
    tjs.scene.add( ground );

    const grid      = new THREE.GridHelper( size, size, 0x3A4457, 0x2A3240 );
    grid.position.y = 0.001;
    tjs.scene.add( grid );

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Light
    const hemi = new THREE.HemisphereLight( 0x9fb6cf, 0x20242c, 1.85 );
    const sun  = new THREE.DirectionalLight( 0xffffff, 2 );
    sun.position.set( 4, 8, 5 );
    sun.castShadow = true;
    // sun.shadow.bias       = -0.0004;
    // sun.shadow.normalBias = 0.025;
    // sun.shadow.radius     = 3;
    sun.shadow.mapSize.set( 1024, 1024 );
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 20;
    sun.shadow.camera.left = -5; sun.shadow.camera.right  =  5;
    sun.shadow.camera.top  =  5; sun.shadow.camera.bottom = -5;

    tjs.scene.add( hemi, sun );

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Renderer
    // tjs.renderer.setClearColor( bg, 1 );
    tjs.renderer.shadowMap.enabled   = true;
    tjs.renderer.shadowMap.type      = THREE.PCFShadowMap;
    // tjs.renderer.toneMapping         = THREE.NeutralToneMapping;
    // tjs.renderer.toneMappingExposure = 1.1;

    // THREE.ColorManagement.enabled = false;
    // tjs.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    return tjs;
};
