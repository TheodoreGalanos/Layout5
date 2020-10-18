/* eslint no-undef: "off", no-unused-vars: "off" */
let data = {}
let state = false;
data.definition = 'matrix_baked_2.gh'
data.inputs = {
  'bool_refresh':state
  // 'int_k':document.getElementById('clusters').valueAsNumber,
  // 'int_dimension':document.getElementById('dimension').valueAsNumber,
  // 'int_resolution':document.getElementById('resolution').valueAsNumber,
  // 'num_x':document.getElementById('x').valueAsNumber,
  // 'num_y':document.getElementById('y').valueAsNumber
}

let _threeMesh, _threeMaterial, rhino

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

  console.log(data.inputs)

  const request = {
    'method':'POST',
    'body': JSON.stringify(data),
    'headers': {'Content-Type': 'application/json'}
  }

  try {
    const response = await fetch('/solve', request)

    if(!response.ok)
      throw new Error(response.statusText)

    const responseJson = await response.json()

    // Request finished. Do processing here.

    // hide spinner
    document.getElementById('loader').style.display = 'none'

    // process mesh
    console.log(responseJson.values[0].InnerTree);
    // console.log(responseJson.values[1].InnerTree);
    let mesh_data = JSON.parse(responseJson.values[0].InnerTree['{ 0; }'][0].data)
    let mesh = rhino.CommonObject.decode(mesh_data)
    console.log(mesh_data);
    if (!_threeMaterial) {
      _threeMaterial = new THREE.MeshBasicMaterial({vertexColors:true, side:2})
    }
    let threeMesh = meshToThreejs(mesh, _threeMaterial)
    mesh.delete()
    replaceCurrentMesh(threeMesh)

    drawLines();

    //process data
    // let cluster_data = responseJson.values[1].InnerTree['{ 0; }'].map(d=>d.data)
    // console.log(cluster_data)

    //process colors
    // let color_data = responseJson.values[2].InnerTree['{ 0; }'].map( d=> {

    //   return 'rgb(' + JSON.parse(d.data) + ')'

    // })
    // console.log(color_data)

    //add legend
    // let legend = document.getElementById('legend')
    // if(!legend){
    //   legend = document.createElement("div")
    //   legend.id = 'legend'
    //   legend.style.width = '30px'
    //   legend.style.zIndex = 2
    //   legend.style.position = 'relative'
    //   document.body.appendChild(legend)
    // } else {
    //   while (legend.firstChild) {
    //     legend.removeChild(legend.lastChild);
    //   }
    // }

    // for(let i = 0; i < cluster_data.length; i++) {

    //   let div = document.createElement("div")
    //   div.innerHTML = cluster_data[i]
    //   div.style.color = 'white'
    //   div.style.width = '30px'
    //   div.style.height = '30px'
    //   div.style.backgroundColor = color_data[i]
    //   legend.appendChild(div)
    // }
  } catch(error){
    console.error(error)
  }
}

function drawLines(){
  var material1 = new THREE.LineBasicMaterial( { color: 0x444444 } );
  var material2 = new THREE.LineBasicMaterial( { color: 0x999999 } );

  var a = 45;
  var b = 4.5;
  var n = 10;
  var p0 = new THREE.Vector3( 0, 0, 0 );
  var p1 = new THREE.Vector3( a+5, 0, 0 ) ;
  var p2 = new THREE.Vector3( 0, a+5, 0 ) ;

  var geometry = new THREE.BufferGeometry().setFromPoints( [p0,p1] );
  var line1 = new THREE.Line( geometry, material1 );
  scene.add( line1 );
  var geometry = new THREE.BufferGeometry().setFromPoints( [p0,p2] );
  var line2 = new THREE.Line( geometry, material1 );
  scene.add( line2 );

  for(i = 1;i<n+1;i++){
    var p0 = new THREE.Vector3( i*b, 0, 0 );
    var p1 = new THREE.Vector3( i*b, a, 0 ) ;
    var geometry = new THREE.BufferGeometry().setFromPoints( [p0,p1] );
    var line1 = new THREE.Line( geometry, material2 );
    scene.add( line1 );
  }

  for(i = 1;i<n+1;i++){
    var p0 = new THREE.Vector3( 0, i*b, 0 );
    var p1 = new THREE.Vector3( a, i*b, 0 ) ;
    var geometry = new THREE.BufferGeometry().setFromPoints( [p0,p1] );
    var line1 = new THREE.Line( geometry, material2 );
    scene.add( line1 );
  }

  var points = [];
  renderer.render( scene, camera );
}

/**
 * Called when a slider value changes in the UI. Collect all of the
 * slider values and call compute to solve for a new scene
 */
function onButtonClick () {
  // show spinner
  document.getElementById('loader').style.display = 'block'
  console.log(document.getElementById('btn_update').values);
  // get slider values
  state = !state
  data.inputs = {
    'bool_refresh':state
    // 'int_k':document.getElementById('clusters').valueAsNumber,
    // 'int_dimension':document.getElementById('dimension').valueAsNumber,
    // 'int_resolution':document.getElementById('resolution').valueAsNumber,
    // 'num_x':document.getElementById('x').valueAsNumber,
    // 'num_y':document.getElementById('y').valueAsNumber
  }
  compute()
}

// BOILERPLATE //

var scene, camera, renderer, controls

function init () {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(1,1,1)
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 1, 1000 )

  renderer = new THREE.WebGLRenderer({antialias: true})
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize( window.innerWidth, window.innerHeight )
  let canvas = document.getElementById('canvas')
  canvas.appendChild( renderer.domElement )

  controls = new THREE.OrbitControls( camera, renderer.domElement  )

  camera.position.z = 50

  window.addEventListener( 'resize', onWindowResize, false )

  animate()
}

var animate = function () {
  requestAnimationFrame( animate )
  controls.update()
  renderer.render( scene, camera )
}
  
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize( window.innerWidth, window.innerHeight )
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
