const express = require("express");
const path = require("path");
const app = express();
const http = require("http");

const server = http.createServer(app);
const socketio = require("socket.io");
const io = socketio(server);

// ejs setup
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));
// socket
io.on("connection", (socket) => {
  socket.on("send-location", (data) => {
    console.log(data, socket.id);
    io.emit("receive-location", { ...data, id: socket.id });
  });
  socket.on("disconnect", () => {
    io.emit("user-disconnected", socket.id);
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
