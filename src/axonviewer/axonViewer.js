// Resources
// https://threejsfundamentals.org/threejs/lessons/threejs-responsive.html

import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@latest/examples/jsm/controls/OrbitControls.js';

import { Rhino3dmLoader } from 'https://unpkg.com/three@latest/examples/jsm/loaders/3DMLoader.js';

THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

let renderer, aspect, scene, camera, controls, sceneBox;

// For hover / selection
let raycaster, mouse, selection, hover;

// 0-1 percentage for explode displacement
let displacementPos = 0;

// Initialize scene
function init() {
  // 0. Basic Setup
  const canvas = document.querySelector('#c');
  renderer = new THREE.WebGL1Renderer({
                                      canvas,
                                      alphas:true,
                                      premultipliedAlpha: false,
                                      });
  
  renderer.setClearColor( new THREE.Color(0xffffff), 0 );
  renderer.setPixelRatio( window.devicePixelRatio );

  aspect = canvas.clientWidth / canvas.clientHeight;

  scene = new THREE.Scene();
  
  // Orthographic Camera
  // https://threejs.org/docs/#api/en/cameras/OrthographicCamera
  camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0, 20000);
  camera.position.set(-500, -500, 200);

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  // Scene bounding box
  sceneBox = new THREE.Box3();

  // hover / selection                                 
  raycaster = new THREE.Raycaster;
  // Init mouse position so it's not sitting at the center of the screen
  mouse = new THREE.Vector2(-1000);
  selection = [];
  hover = {};

  // Visualize origin
  // var axesHelper = new THREE.AxesHelper( 200 );
  // scene.add( axesHelper );

  // Lighting
  {
    scene.add( new THREE.AmbientLight( 0xffffff, 0.125 ) );

    // Directional Light
    // let dirLight = new THREE.DirectionalLight(0x0000ff, 0.125);
    // dirLight.position.set(100, 100, 400);
    // dirLight.lookAt(0,0,0);
    // scene.add(dirLight);
    // let dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 15, 0xff0000);
    // scene.add(dirLightHelper);

    // Hemisphere Light
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0x080808, 0.75 );
    hemiLight.position.set( 0, 0, 400 );
    scene.add( hemiLight );
    // let hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 8, 0xff0000);
    // scene.add( hemiLightHelper );
  }

  // Load Rhino File
  var loader = new Rhino3dmLoader();
  loader.setLibraryPath( './libs/rhino3dm/' );

  loader.load( './models/maison.3dm', function ( rhinoDoc ) {
    // We can see properties of rhinoDoc
    // console.log(rhinoDoc);

    // Init scene Bounding box
    sceneBox.setFromObject(rhinoDoc);
    // let boxHelper = new THREE.Box3Helper(sceneBox, 0x0000ff);
    // scene.add(boxHelper);

    // Name to identify rhino object node
    rhinoDoc.name = 'rhinoDoc';

    // Iterate through rhinoDoc and set material from Rhino document
    rhinoDoc.children.map(child => {
      // Access attributes from the Rhino document
      let col = child.userData.attributes.drawColor;
      let color = new THREE.Color(col.r/255, col.g/255, col.b/255);

      let mat = new THREE.MeshLambertMaterial( {
        color: color,
      } );

      // All objects have a position set to 0
      // we need to recalculate their positions based on their bounding box
      
      // Meshes that are parented directly to the scene
      if(!child.children.length && 
              child.parent.name === 'rhinoDoc' && 
              typeof child.geometry !== 'undefined'){

        let box = new THREE.Box3().setFromObject(child);
        
        // let boxHelper = new THREE.Box3Helper(box, 0x00ffff);
        // scene.add(boxHelper);

        // Move child geometry to origin
        let translation = new THREE.Vector3(0.0).sub(box.getCenter(new THREE.Vector3()));
        child.geometry.translate(translation.x, translation.y, translation.z);

        // Move position of child geometry to center of bounding box
        box.getCenter(child.position);
        
        // Set mesh material
        child.material = mat;
      } else {
        // Object3D with mesh children
        let box = new THREE.Box3().setFromObject(child);
        box.getCenter(child.position);

        child.traverse(obj => {
          if (child.uuid !== obj.uuid){
            
            box.getCenter(obj.position);
            obj.position.multiplyScalar(-1);

            obj.material = mat;
          }
        })
      }

      // Can we automate displacement paths?
      let explode = sceneBox.getCenter(new THREE.Vector3()).sub(child.position).normalize().multiplyScalar(-1);
      let maxExplode = 200;
      
      child.userData.explode = {vec: explode, max: maxExplode};
    })

    scene.add( rhinoDoc );
    
    zoomToScene();
  });

  // Hover
  document.querySelector("#c").addEventListener('mousemove', mouseMove);
  document.querySelector("#c").addEventListener('pointerup', mouseUp);

  // Axon Explode
  document.querySelector("#globalDisplacement").addEventListener('input', explodeDiagram);

  // Screenshot
  const elem = document.querySelector('#screenshot').addEventListener('click', screenshot);

  requestAnimationFrame(animate);
}

// Render scene
function render() {
  
  // If canvas needs to be resized
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    aspect = canvas.clientWidth / canvas.clientHeight;
    let side = Math.max(sceneBox.max.x - sceneBox.min.x, sceneBox.max.z - sceneBox.min.z);
    
    // Ortho camera resize
    camera.left = aspect * side * -1;
    camera.right = aspect * side;
    camera.bottom = side * -1;
    camera.top = side;

    camera.updateProjectionMatrix();
    controls.update();
  }

  renderer.render(scene, camera);
}

function updateSelState(){
  // Set our raycaster to begin selecting objects
  raycaster.setFromCamera(mouse, camera);
  
  // Check if hover is a valid object,
  // If so, reset material and hover object
  if(typeof hover.parent !== 'undefined'){
    hover.traverse((m) => {
      if(!m.material) return;
      m.material.emissiveIntensity = 0.0;
    })
    hover = {};
  }

  // Using the name for our Rhino document
  let doc = scene.children.find(a => a.name === 'rhinoDoc');

  if(typeof doc !== 'undefined'){
    
    let intersects = raycaster.intersectObjects(doc.children, true);
    
    // If we've intersected things
    if(intersects.length > 0 ){

      // Intersects are sorted by distance to camera
      // Item 0 is the closest object
      hover = intersects[0].object;

      // Grab the top level object that has access to
      // attributes from Rhino
      while(hover.parent.name !== 'rhinoDoc'){
        hover = hover.parent;
      }

      // Traverse is called on hover and all descendants
      hover.traverse((m) => {
        // Object3D won't have a material, just descendants
        if(!m.material) return;
        m.material.emissive.set(new THREE.Color(0xffeeee));
        m.material.emissiveIntensity = 0.35;
      })
      // controls.enabled = false;
    }
  }
}

// Animate
function animate(){

  // Update Orbit Controls
  controls.update();

  updateSelState();

  render();

  requestAnimationFrame(animate);
}

// Zoom ortho camera to sceneBox
function zoomToScene () {
  // Choose largest dimension of scenebox to set the larger dimension of the viewport
  let side = Math.max(sceneBox.max.x - sceneBox.min.x, sceneBox.max.z - sceneBox.min.z);

  // Note: camera position and controls can't be the same
  controls.target.set((sceneBox.max.x - sceneBox.min.x)/2, (sceneBox.max.y - sceneBox.min.y)/2, (sceneBox.max.z - sceneBox.min.z)/2);
  
  camera.left = aspect * side * -1;
  camera.right = aspect * side;
  camera.bottom = side * -1;
  camera.top = side;

  camera.updateProjectionMatrix();
  controls.update();
}

// Resize canvas
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width  = canvas.clientWidth | 0;
  const height = canvas.clientHeight | 0;
  const needResize = canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio ;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
function getCanvasRelativePosition(event) {
  let canvas = renderer.domElement;
  let rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}

// Mouse coords are in "Normalized Device Coordinates"
// Meaning (-1 , 1) with Y flipped
function mouseMove(e){
  // prevent menu clicks from causing this to fire
  if(e.target !== document.querySelector('#c')) return;

  let canvas = renderer.domElement;
  let pos = getCanvasRelativePosition(e);

  mouse.x = (pos.x / canvas.width) * 2 - 1;
  mouse.y = (pos.y / canvas.height) * -2 + 1;
  
  // console.log(mouse);
}

function mouseUp(e){
  // prevent menu clicks from causing this to fire
  if(e.target !== document.querySelector('#c')) return;

  if(typeof hover.parent !== 'undefined'){

    // Does the object we're selecting already exist in the selection?
    let index = selection.findIndex(a => a.uuid === hover.uuid);

    // If so splice out existing element and change the material
    if(index > -1){

      let removed = selection.splice(index, 1)[0];
      let col = removed.userData.attributes.drawColor;
      let color = new THREE.Color(col.r/255, col.g/255, col.b/255);

      removed.traverse((b) => {
        if(b.material) b.material.color.set(color);
        return b;
      });
    } else {
      // Otherwise set selection
      selection.push(hover);

      selection.map(a => a.traverse((b) => {
          if(b.material) b.material.color.set(0xff0000);
          return b;
        })
      );
    }
    hover = {};
  } else {
    // Deselect
    selection.map(a => a.traverse((b) => {
        let col = a.userData.attributes.drawColor;
        let color = new THREE.Color(col.r/255, col.g/255, col.b/255);
        if(b.material) b.material.color.set(color);
        return b;
      })
    );
    selection.length = 0;
  }
  // controls.enabled = true;
}

function explodeDiagram(e){
  // get value of the slider
  // console.log(e.target.value);
  let doc = scene.children.find(a => a.name === 'rhinoDoc');

  // In the event of slider move ahead of model load
  if(!doc) return;
  
  let dist = (e.target.value / 100) - displacementPos;
  displacementPos = e.target.value / 100;

  // displace model elements
  for(let c of doc.children){
    let max = c.userData.explode.max;
    let vec = c.userData.explode.vec;
    
    c.translateOnAxis(vec, dist * max);
  }
}

function screenshot(e) {
  render();
  let canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
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

init();

// export selection for use in the Context Menu
export {selection};
