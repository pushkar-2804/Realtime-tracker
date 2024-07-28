const socket = io();
const myusername = prompt("Enter your name");
// DOM Event listners
document
  .getElementById("findLocationButton")
  .addEventListener("click", findMyLocation);
document
  .getElementById("findLocationButton")
  .addEventListener("click", findMyLocation);

document
  .getElementById("searchButton")
  .addEventListener("click", searchDestination);

if (!myusername) {
  location.reload();
}

navigator.permissions.query({ name: "geolocation" }).then((result) => {
  if (result.state !== "granted") {
    // If permission is not already granted, try to get the current position
    navigator.geolocation.getCurrentPosition(
      (success) => {
        // Permission was granted
        console.log("Geolocation permission granted.");
      },
      (error) => {
        // Permission denied or another error occurred
        alert(
          "Geolocation permission is necessary. Go to settings and enable it. You cant view other's location without sharing your own"
        );
        location.reload();
      }
    );
  }
});
let watchId;
let userMarker = null;

function startWatchingLocation() {
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("send-location", {
          latitude,
          longitude,
          username: myusername,
        });
        if (!userMarker) {
          userMarker = L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup("You are here")
            .openPopup();
        } else {
          userMarker.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        console.log(err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  } else {
    console.log("Geolocation is not supported by this browser.");
  }
}

function stopWatchingLocation() {
  if (navigator.geolocation && watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

startWatchingLocation();

const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors and Pushkar",
}).addTo(map);

const markers = {};
const routeLayer = L.layerGroup().addTo(map);

socket.on("init-markers", (data) => {
  for (const key in data) {
    const { latitude, longitude, username } = data[key];

    markers[key] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(username)
      .openPopup();
  }
});

socket.on("receive-location", (data) => {
  const { latitude, longitude, id, username } = data;
  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
    markers[id].bindPopup(username).openPopup();
  } else {
    if (username !== myusername) {
      alert(`${username} is online`);
    }
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(username)
      .openPopup();
  }
});

socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});

function findMyLocation() {
  stopWatchingLocation();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 16);
        startWatchingLocation();
      },
      (err) => {
        console.log(err);
        startWatchingLocation();
      }
    );
  } else {
    console.log("Geolocation is not supported by this browser.");
    startWatchingLocation();
  }
}

function searchDestination() {
  const destination = document.getElementById("destinationInput").value;
  if (!destination) {
    alert("Please enter a destination.");
    return;
  }

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${destination}`
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      if (data.length > 0) {
        const destLatLng = [data[0].lat, data[0].lon];
        getRoute(destLatLng);
      } else {
        alert("Destination not found.");
      }
    })
    .catch((error) => {
      console.error("Error fetching geocoding data:", error);
    });
}

function getRoute(destLatLng) {
  if (!userMarker) {
    alert("Unable to get your current location.");
    return;
  }

  const userLatLng = userMarker.getLatLng();
  const url = `https://router.project-osrm.org/route/v1/driving/${userLatLng.lng},${userLatLng.lat};${destLatLng[1]},${destLatLng[0]}?overview=full&geometries=geojson`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const route = data.routes[0];
      if (route) {
        const routeCoordinates = route.geometry.coordinates.map((coord) => [
          coord[1],
          coord[0],
        ]);
        routeLayer.clearLayers();
        L.polyline(routeCoordinates, { color: "blue" }).addTo(routeLayer);
        map.fitBounds(L.polyline(routeCoordinates).getBounds());
      } else {
        alert("No route found.");
      }
    })
    .catch((error) => {
      console.error("Error fetching route data:", error);
    });
}
