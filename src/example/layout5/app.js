/* eslint no-undef: "off", no-unused-vars: "off" */
let data = {}
let state = false;
data.definition = 'BranchNodeRnd.gh'
data.inputs = {
  // 'bool_refresh':state
  'Count':document.getElementById('count').valueAsNumber,
  'Radius':document.getElementById('radius').valueAsNumber,
  'Length':document.getElementById('length').valueAsNumber
}

let _threeMesh, _threeMaterial, rhino
let ratio = 0.25;

rhino3dm().then(async m => {
  console.log('Loaded rhino3dm.')
  rhino = m // global

  init()
  compute()
})

/**
 * Call appserver
 */
async function compute(){
  let t0 = performance.now()
  const timeComputeStart = t0

  console.log(data.inputs)

  const request = {
    'method':'POST',
    'body': JSON.stringify(data),
    'headers': {'Content-Type': 'application/json'}
  }

  try{ const response = await fetch('/solve', request)

  if(!response.ok)
    throw new Error(response.statusText)
    
  headers = response.headers.get('server-timing')
  const responseJson = await response.json()

  // Request finished. Do processing here.
  let t1 = performance.now()
  const computeSolveTime = t1 - timeComputeStart
  t0 = t1

  // hide spinner
  document.getElementById('loader').style.display = 'none'
  let data = JSON.parse(responseJson.values[0].InnerTree['{ 0; }'][0].data)
  let mesh = rhino.DracoCompression.decompressBase64String(data)
    
  t1 = performance.now()
  const decodeMeshTime = t1 - t0
  t0 = t1

  if (!_threeMaterial) {
    _threeMaterial = new THREE.MeshNormalMaterial()
  }
  let threeMesh = meshToThreejs(mesh, _threeMaterial)
  mesh.delete()
  replaceCurrentMesh(threeMesh)

  t1 = performance.now()
  const rebuildSceneTime = t1 - t0

  console.log(`[call compute and rebuild scene] = ${Math.round(t1-timeComputeStart)} ms`)
  console.log(`  ${Math.round(computeSolveTime)} ms: appserver request`)
  let timings = headers.split(',')
  let sum = 0
  timings.forEach(element => {
    let name = element.split(';')[0].trim()
    let time = element.split('=')[1].trim()
    sum += Number(time)
    if (name === 'network') {
      console.log(`  .. ${time} ms: appserver<->compute network latency`)
    } else {
      console.log(`  .. ${time} ms: ${name}`)
    }
  })
  console.log(`  .. ${Math.round(computeSolveTime - sum)} ms: local<->appserver network latency`)
  console.log(`  ${Math.round(decodeMeshTime)} ms: decode json to rhino3dm mesh`)
  console.log(`  ${Math.round(rebuildSceneTime)} ms: create threejs mesh and insert in scene`)

  } catch(error){
    console.error(error)
  }
}

/**
 * Called when a slider value changes in the UI. Collect all of the
 * slider values and call compute to solve for a new scene
 */
function onSliderChange () {
  // show spinner
  document.getElementById('loader').style.display = 'block'

  // get slider values
  data.inputs = {
    'Count':document.getElementById('count').valueAsNumber,
    'Radius':document.getElementById('radius').valueAsNumber,
    'Length':document.getElementById('length').valueAsNumber
  }
  compute()
}

// BOILERPLATE //

var scene, sceneLeft, camera, cameraOrtho, renderer, rendererLeft, controls, controlsLeft
// For hover / selection
let raycaster, mouse, mouseDown, selection, hover;

function init () {
    // hover / selection                                 
    raycaster = new THREE.Raycaster;
    // Init mouse position so it's not sitting at the center of the screen
    mouse = new THREE.Vector2(-1000);
    mouseDown = new THREE.Vector2(-1000);
    selection = [];
    hover = {};

    renderer = new THREE.WebGLRenderer({antialias: true})
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize((1-ratio)*window.innerWidth, (1-ratio)*window.innerHeight )
  //renderer.setViewport(0, -1, window.innerWidth, window.innerHeight/2 )

  rendererLeft = new THREE.WebGLRenderer({antialias: true})
  rendererLeft.setPixelRatio( window.devicePixelRatio )
  rendererLeft.setSize( ratio * window.innerWidth, ratio * window.innerWidth )
  //rendererLeft.setViewport(0, window.innerHeight/2, window.innerWidth, window.innerHeight/2 )

    let canvas = document.getElementById('canvas')
    canvas.appendChild( renderer.domElement )
    let canvasTop = document.getElementById('canvasTop')
    canvasTop.appendChild( rendererLeft.domElement )

    scene = new THREE.Scene()
  scene.background = new THREE.Color(0.5,0.5,1)
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 1, 1000 )
  //cameraOrtho = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 1, 1000 )
  //cameraOrtho.position.set( 0, 0, 150 );

  

  sceneLeft = new THREE.Scene()
  sceneLeft.background = new THREE.Color(1,1,1)

  

  aspect = canvas.clientWidth / canvas.clientHeight;
  aspectTop = canvasTop.clientWidth / canvasTop.clientHeight;
  canvasTop.left

    // Orthographic Camera
  // https://threejs.org/docs/#api/en/cameras/OrthographicCamera
  cameraOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 10, 20000);
  cameraOrtho.position.set(canvasTop.clientWidth/2, canvasTop.clientHeight/2, 10000);
  //cameraOrtho.target.set(0,0,0);
  //cameraOrtho.enableRotate = false;

  // Orbit Controls
  controlsLeft = new THREE.OrbitControls(cameraOrtho, rendererLeft.domElement);
  controlsLeft.target.set( 0, 0, 0 ); // view direction perpendicular to XY-plane
  controlsLeft.enableRotate = false;
  //controlsLeft.enableZoom = true; // optional
  controlsLeft.update();

  // Scene bounding box
  sceneBox = new THREE.Box3();
  
  controls = new THREE.OrbitControls( camera, renderer.domElement  )
  //controlsLeft = new THREE.OrbitControls( cameraOrtho, rendererLeft.domElement );
  // controlsLeft.target.set( 0, 0, 0 ); // view direction perpendicular to XY-plane
  // controlsLeft.enableRotate = false;
  // controlsLeft.enableZoom = true; // optional

  camera.position.z = 50;
  //cameraOrtho.position.z = 10;
  
  window.addEventListener( 'resize', onWindowResize, false )
  window.addEventListener( 'pointerdown', onMouseDown, false )
  window.addEventListener( 'pointerup', onMouseClick, false )

  // Screenshot
  const elem = document.querySelector('#screenshot').addEventListener('click', screenshot);

  animate()
}

var animate = function () {
  requestAnimationFrame( animate )
  controls.update()
  controlsLeft.update()
  renderer.render( scene, camera )
  rendererLeft.render( sceneLeft, cameraOrtho )
}
  
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  cameraOrtho.aspect = window.innerWidth / window.innerHeight
  cameraOrtho.updateProjectionMatrix()
  renderer.setSize((1-ratio)* window.innerWidth, (1-ratio)*window.innerHeight )
  rendererLeft.setSize( ratio*window.innerWidth, ratio*window.innerWidth )
  //renderer.setViewport(0, -1, window.innerWidth, window.innerHeight/2 )
  //rendererLeft.setViewport(0, window.innerHeight/2, window.innerWidth, window.innerHeight/2 )
  animate()
}

//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
function getCanvasRelativePosition(event) {
  let canvasTop = rendererLeft.domElement;
  let rect = canvasTop.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvasTop.width  / rect.width,
    y: (event.clientY - rect.top ) * canvasTop.height / rect.height,
  };
}
function onMouseDown(e) {
  // prevent menu clicks from causing this to fire
  if(e.target !== document.querySelector('canvas')) return;

  let canvasTop = rendererLeft.domElement;
  let pos = getCanvasRelativePosition(e);

  mouseDown.x = (pos.x / canvasTop.width) * 2 - 1;
  mouseDown.y = (pos.y / canvasTop.height) * -2 + 1;
}

function onMouseClick(e) {
  // prevent menu clicks from causing this to fire
  if(e.target !== document.querySelector('canvas')) return;

  let canvasTop = rendererLeft.domElement;
  let pos = getCanvasRelativePosition(e);

  mouse.x = (pos.x / canvasTop.width) * 2 - 1;
  mouse.y = (pos.y / canvasTop.height) * -2 + 1;

  var sizeX = mouseDown.x - mouse.x;
  var sizeY = mouseDown.y - mouse.y;
  
  var corner0 = new THREE.Vector3 (mouseDown.x, mouseDown.y, 0);
  var corner1 = new THREE.Vector3 (mouseDown.x - sizeX, mouseDown.y, 0);
  var corner2 = new THREE.Vector3 (mouseDown.x - sizeX, mouseDown.y - sizeY, 0);
  var corner3 = new THREE.Vector3 (mouseDown.x, mouseDown.y - sizeY, 0);

  var shape = new THREE.CurvePath();
  shape.add(new THREE.LineCurve3(corner0, corner1));
  shape.add(new THREE.LineCurve3(corner1, corner2));
  shape.add(new THREE.LineCurve3(corner2, corner3));
  shape.add(new THREE.LineCurve3(corner3, corner0));
  console.log("add a rectangle...");

  var geometry = new THREE.TubeGeometry( shape, 64, .01, 4, false );
  var material = new THREE.MeshBasicMaterial( { color: 0x5a5a5a } );
  var meshRect = new THREE.Mesh( geometry, material ) ;
  sceneLeft.add(meshRect);
  // console.log(mouse);

  animate()
}

function replaceCurrentMesh (threeMesh) {
  if (_threeMesh) {
    scene.remove(_threeMesh)
    _threeMesh.geometry.dispose()
  }
  _threeMesh = threeMesh
  scene.add(_threeMesh)

}

function meshToThreejs (mesh, material) {
  let loader = new THREE.BufferGeometryLoader()
  var geometry = loader.parse(mesh.toThreejsJSON())
  return new THREE.Mesh(geometry, material)
}

function screenshot(e) {
  //render();
  rendererLeft.render( sceneLeft, cameraOrtho )
  let canvasTop = rendererLeft.domElement;
  canvasTop.toBlob((blob) => {
    saveBlob(blob, `screencapture-layout-512x512.png`);
  });
}

// https://threejsfundamentals.org/threejs/lessons/threejs-tips.html#screenshot
const saveBlob = (function() {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  return function saveData(blob, fileName) {
     const url = window.URL.createObjectURL(blob);
     a.href = url;
     a.download = fileName;
     a.click();
  };
}());