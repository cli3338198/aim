const pgClient = require("../pgclient/client");
const redisClient = require("../redisClient/client");
const jwt = require("jsonwebtoken");

const handleGetBuddies = (user, socket) => {
  const { token } = user;
  return jwt.verify(token, "secretkey", getBuddies(user, socket));
};

const handleAddBuddy = (user, buddyName, socket) => {
  const { token } = user;
  return jwt.verify(token, "secretkey", addBuddy(user, buddyName, socket));
};

const handleUpdateBuddies = (io, socket) => {
  redisClient.smembers("onlineUsers", updateBuddies(io, socket));
};

const getBuddies = (user, socket, io) => (err, authData) => {
  if (err) {
    console.log(err);
  } else if (authData) {
    const { screenName } = user;
    let query = "SELECT friends AS buddies FROM users WHERE screenname = $1";
    let values = [screenName];
    return pgClient.query(query, values, checkBuddiesStatus(socket, io, user));
  } else {
    console.log("bad token");
  }
};

const checkBuddiesStatus = (socket, io, user) => (err, result) => {
  let buddies = result.rows[0].buddies;
  if (err) {
    console.log(err);
  } else if (!buddies) {
    socket.emit("Got buddies", { onlineBuddies: [], offlineBuddies: [] });
  } else {
    return buildBuddiesList(socket, io, user, buddies);
  }
};

const buildBuddiesList = (socket, io, user, buddies) => {
  return Promise.all(
    buddies.map((buddy) => {
      return new Promise((resolve, reject) => {
        redisClient.sismember("onlineUsers", buddy, (err, isOnline) => {
          if (err) {
            reject(err);
          } else if (isOnline === 1) {
            resolve({ buddy, isOnline: true });
          } else {
            resolve({ buddy, isOnline: false });
          }
        });
      });
    })
  )
    .then((buddies) => emitBuddies(socket, io, user, buddies))
    .catch((err) => console.log(err));
};

const emitBuddies = (socket, io, user, buddies) => {
  const onlineBuddies = [];
  const offlineBuddies = [];
  buddies.forEach((buddy) =>
    buddy.isOnline ? onlineBuddies.push(buddy) : offlineBuddies.push(buddy)
  );
  if (io) {
    const { id, screenName } = user;
    io.to(`${id};${screenName}`).emit("Got buddies", {
      onlineBuddies,
      offlineBuddies,
    });
  } else {
    socket.emit("Got buddies", { onlineBuddies, offlineBuddies });
  }
};

const addBuddy = (user, buddyName, socket) => (err, authData) => {
  if (err) {
    console.log(err);
  } else if (authData) {
    // query if buddy exists
    // if not emit buddy not found
    // else add to pg and emit buddies
  } else {
    console.log("bad token");
  }
};

const updateBuddies = (io, socket) => (err, onlineUsers) => {
  if (err) {
    console.log(err);
  } else if (onlineUsers.length > 0) {
    for (let onlineUser of onlineUsers) {
      const [id, screenName] = onlineUser.split(";");
      const user = { id, screenName };
      getBuddies(user, socket, io)(null, true);
    }
  }
};

module.exports = { handleGetBuddies, handleAddBuddy, handleUpdateBuddies };
