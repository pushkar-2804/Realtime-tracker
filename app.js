const express = require("express");
const path = require("path");
const app = express();
const http = require("http");

const server = http.createServer(app);
const socketio = require("socket.io");
const io = socketio(server);

// ejs setup
app.set("view engine", "ejs");
app.set(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
