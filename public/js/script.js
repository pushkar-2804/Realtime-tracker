const socket = io();
const myusername = prompt("Enter your name");
document
  .getElementById("findLocationButton")
  .addEventListener("click", findMyLocation);

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
          "Geolocation permission is necessary. Go to settings and enable it."
        );
        location.reload();
      }
    );
  }
});
let watchId;

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
