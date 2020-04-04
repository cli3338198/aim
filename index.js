const express = require("express");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const colors = require("colors");
const port = process.env.PORT || 5000;

app.use(cors());

const handlers = require("./handlers/handlers");

io.on("connection", (socket) => {
  console.log("a user connected".brightGreen.underline.bold);

  const { handleSignOn, handleSignOut } = handlers(socket);

  socket.on("sign on", handleSignOn);

  socket.on("sign out", handleSignOut);

  // socket.on("get buddies", package => handleGetBuddies(package, socket));

  socket.on("disconnect", () =>
    console.log("a user disconnected".brightRed.underline)
  );
});

server.listen(port, () =>
  console.log(`server listening on port ${port}`.rainbow.bold)
);
