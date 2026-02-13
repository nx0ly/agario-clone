// imports
import { WebSocketServer } from "ws";
import { encode, decode } from "msgpack-lite";
import Player from "../shared/player";
import { CONFIG } from "../shared/config";
import express from "express";
import path from "path";
import Blob from "../shared/blob";

// creates a new express application
const app = express();

// adds a "hook" to / page
app.get("/", (req, res) => {
  // path.join automatically handles the paths provided
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// todo: returns current player data (could be used for different gamemodes - to see how many active players there are)
app.get("/playerData", (req, res) => {});

app.use(express.static(path.join(__dirname, "../client")));
app.use("/shared", express.static(path.join(__dirname, "../shared")));

// makes the express application listen on port 3000 (standard port)
app.listen(3000, () => {
  console.log("express server running on port 3000");
});

// player ids
let ids = Array.from({ length: 60 }, (_, i) => i);

// creates a websocket server on port 8080 (standard port)
const wss = new WebSocketServer({
  port: 8080,
});

console.log("websocket server running on port 8080");

// used to store all the player objects
let players = [];

// used to store all the eatable blobs
let xpBlobs = [];

function addXPBlob(id, x, y) {
  let blob = new Blob(id, x, y, false);

  xpBlobs.push(blob);
}

// create a bunch initially
for (let i = 0; i < 6767; i++) {
  addXPBlob(
    i,
    CONFIG.mapSize * Math.random(),
    CONFIG.mapSize * Math.random(),
    false,
  );
}

// used to store a mapping from player id -> websocket object
let idToSocket = {};

// broadcasts to all sockets
// but excudes any with the player id given in the array 'exceptions'
function broadcastWithExceptions(data, ignores) {
  for (const id in idToSocket) {
    if (ignores.includes(Number(id))) continue;

    const socket = idToSocket[id];
    if (socket.readyState === 1) {
      socket.send(data);
    }
  }
}

function broadcast(data) {
  for (const id in idToSocket) {
    const socket = idToSocket[id];

    if (socket.readyState === 1) {
      socket.send(data);
    }
  }
}

// handles 'connection' event
wss.on("connection", (client) => {
  // declare this beforehand
  let player = null;

  // listen to 'close' event, remove the player from the world
  // todo: send 'playerRemove' packet to tell clients to remove too
  client.on("close", () => {
    if (!player) return;

    // remove from mapping
    delete idToSocket[player.id];

    players = players.filter((p) => p.id !== player.id);

    // add back to id list
    ids.push(player.id);
    ids.sort((a, b) => a - b); // lowest id first

    broadcast(["removePlayer", [player.id]]);
  });

  // listen to 'message' event
  // passes data (in this case an array of bytes)
  client.on("message", (d) => {
    let decoded;

    // wrap in try-catch to try and avoid msgpack vulnerabilities
    try {
      decoded = decode(d);
    } catch (e) {
      // a correct client never makes protocol mistakes
      // it could mean the client is malicious, better to be safe.
      client.close();
    }

    // console.log(decoded);

    if (!decoded) client.close(); // safeguard

    // format: [type, [...data]]
    let [type, data] = decoded;

    // changes between the data type
    switch (type) {
      // player spawning data type
      // data format (not implemented as of now): [name, skinColor]
      case "spawn": {
        // no more available ids left
        // just disconnect the client for now.
        if (ids.length == 0) {
          client.close();
          return;
        }

        const id = ids.shift();

        // create a new player object
        player = new Player(
          // player id
          id,
          // name
          data[0] || "unknown",
          // player coords, Math.random() returns 0-1, so this works (somewhat like percentages)
          CONFIG.mapSize * Math.random(),
          CONFIG.mapSize * Math.random(),
        );

        // define the mapping from player id -> websocket
        idToSocket[player.id] = client;
        // add to the players array
        players.push(player);

        // send to the existing clients
        // the new player.
        // to my client, send with 'true' to indicate that it is my player
        // data format: [type, [playerData, isMyPlayer]]
        //
        // console.log(player);
        let broadcastData = [
          player.id,
          player.x,
          player.y,
          player.name,
          player.color,
          player.blobs.flatMap((y) => {
            return [y?.id, y?.x, y?.y, y?.scale];
          }),
        ];
        client.send(encode(["addPlayer", [broadcastData, true]]));
        broadcastWithExceptions(encode(["addPlayer", [broadcastData, false]]), [
          player.id,
        ]);

        // also send xp blobs
        for (const blob of xpBlobs) {
          broadcast(encode(["addBlob", [blob.id, blob.x, blob.y, blob.scale]]));
        }

        // also send existing players
        for (const player of players.filter((x) => x.id != id)) {
          let broadcastData = [
            player.id,
            player.x,
            player.y,
            player.name,
            player.color,
            player.blobs.flatMap((y) => [y?.id, y?.x, y?.y, y?.scale]),
          ];

          client.send(encode(["addPlayer", [broadcastData, false]]));
        }

        break;
      }

      case "move": {
        if (!player) return;
        // get the move dir from the array
        let [moveDir, moveMag] = data;

        // type checks, double check if this covers all of the issues
        if (typeof moveDir !== "number" || isNaN(moveDir)) client.close();

        // define player movement direction
        player.moveDir = moveDir;
        player.speed = Math.min(1, Math.max(0, moveMag));

        break;
      }
    }
  });
});

// game update loop
setInterval(() => {
  // iterate through all the game players
  for (const player of players) {
    player.update();
  }

  broadcast(
    encode([
      "updatePlayers",
      // map used so server properties aren't leaked
      players.flatMap((x) => {
        return [
          x.id,
          x.x,
          x.y,
          // x.color,
          x.blobs.flatMap((y) => {
            return [y?.id, y?.x, y?.y, y?.scale];
          }),
        ];
      }),
    ]),
  );
}, 67);
