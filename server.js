const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, name: "DADA GAME" }));

const waiting = [];
const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("find-match", () => {
    if (waiting.length && waiting[0] !== socket.id) {
      const opponentId = waiting.shift();
      const room = `room-${opponentId}-${socket.id}`;
      rooms.set(room, { players: [opponentId, socket.id], turn: opponentId });
      socket.join(room);
      const opponent = io.sockets.sockets.get(opponentId);
      if (opponent) opponent.join(room);
      io.to(room).emit("match-found", { room, players: [opponentId, socket.id] });
    } else if (!waiting.includes(socket.id)) {
      waiting.push(socket.id);
      socket.emit("waiting");
    }
  });

  socket.on("battle-move", ({ room, move }) => {
    const game = rooms.get(room);
    if (!game || !game.players.includes(socket.id)) return;
    io.to(room).emit("battle-update", { player: socket.id, move });
  });

  socket.on("disconnect", () => {
    const i = waiting.indexOf(socket.id);
    if (i !== -1) waiting.splice(i, 1);
    for (const [room, game] of rooms) {
      if (game.players.includes(socket.id)) {
        io.to(room).emit("opponent-left");
        rooms.delete(room);
      }
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`DADA GAME running on ${port}`));
