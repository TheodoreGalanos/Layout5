//contextMenu.js

import {selection} from './axonViewer.js';

let posX = 0;
let posY = 0;

let dragging = false;


function main(){
  //------ open, drag, close ------
  document.querySelector('#c').addEventListener("contextmenu", showContextMenu);
  document.querySelector('#closeMenu').addEventListener("mouseup", closeMenu);

  document.querySelector('#contextMenu').addEventListener("mousedown", startDrag);

  window.addEventListener("mousemove", doDrag);
  window.addEventListener("mouseup", endDrag);
  //------ open, drag, close ------

  document.querySelector('#X').addEventListener('input', changeX);
  document.querySelector('#Y').addEventListener('input', changeY);
  document.querySelector('#Z').addEventListener('input', changeZ);
  document.querySelector('#maxExplode').addEventListener('input', changeMaxExplode);
  document.querySelector('#modelColor').addEventListener('input', changeColor);
}


function setMenuState(obj){
  console.log(obj.userData.explode);
  document.querySelector('#X').value = obj.userData.explode.vec.x.toFixed(2);
  document.querySelector('#Y').value = obj.userData.explode.vec.y.toFixed(2);
  document.querySelector('#Z').value = obj.userData.explode.vec.z.toFixed(2);
  document.querySelector('#maxExplode').value = obj.userData.explode.max;

  let col = obj.userData.attributes.drawColor;
  document.querySelector('#modelColor').value = rgbToHex(col.r, col.g, col.b);
}

function changeX(e){
  console.log("hi");
  let val = parseFloat(e.target.value);
  selection.map(obj => obj.userData.explode.vec.setX(val).normalize());
}

function changeY(e){
  let val = parseFloat(e.target.value);
  selection.map(obj => obj.userData.explode.vec.setY(val).normalize());
}

function changeZ(e){
  let val = parseFloat(e.target.value);
  selection.map(obj => obj.userData.explode.vec.setZ(val).normalize());
}

function changeMaxExplode(e){
  let val = parseInt(e.target.value);
  selection.map(obj => obj.userData.explode.max = val);
}

function changeColor(e){
  let val = e.target.value;

  selection.map(a => a.traverse((b) => {
      if(b.material) {
        b.material.color.set(val);
      }
      if(b.userData.attributes){
        b.userData.attributes.drawColor = hexToRgb(val);
      }
      return b;
    })
  );
}

//------ open, drag, close ------
function showContextMenu(e) {
  e.preventDefault();
  e.stopPropagation();

  posX = e.clientX;
  posY = e.clientY;

  console.log(selection);
  if(selection.length){
    setMenuState(selection[0]);
  }

  document.querySelector("#contextMenu").style.visibility = "visible";
  document.querySelector("#contextMenu").style.top = posY + "px";
  document.querySelector("#contextMenu").style.left = posX + "px";
}

function startDrag(e) {
  if(e.target.id != "contextMenu") return;
  dragging = true;
}

function doDrag(e) {
  if(!dragging) return;
  
  e.stopPropagation();
  e.preventDefault();
  posX = e.clientX;
  posY = e.clientY;

  document.querySelector("#contextMenu").style.top = posY + "px";
  document.querySelector("#contextMenu").style.left = posX + "px";
}

function endDrag(e) {
  if(dragging) e.preventDefault();
  dragging = false;
}

function closeMenu(e){
  e.preventDefault();
  document.querySelector("#contextMenu").style.visibility = "hidden";

  dragging = false;
}
//------ open, drag, close ------

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

main();