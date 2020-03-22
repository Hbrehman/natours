/* eslint-disable */

mapboxgl.accessToken =
  'pk.eyJ1IjoiaGJyZWhtYW4iLCJhIjoiY2s4M2RnaGN5MDM2ZjNobzcxcDZpbHEwdiJ9.OyT3lvGZjSvNdaZRQ8sGhg';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11'
});
const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations);
