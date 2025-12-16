const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
app.use(express.json());

const PORT = 3000;

// 乙方帳號
const users = [{ username: "FishSean", password: "971218" }];

let rooms = {};

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  res.json({ success: !!user });
});

http.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://192.168.7.38:${PORT}`));

io.on('connection', socket => {

  socket.on('join', ({ role, playerId }) => {
    socket.role = role;
    socket.playerId = playerId;

    if (!rooms[playerId]) {
      rooms[playerId] = { day: 1, totalFish: 100, aFish: 0, bFish: 0, submissions: { A: null, B: null } };
    }

    socket.join(playerId);
    checkWaiting(socket);
  });

  socket.on('submitFish', ({ count }) => {
    const room = rooms[socket.playerId];
    if (!room) return;
    room.submissions[socket.role] = count;
    checkWaiting(socket);
  });

  function checkWaiting(socket) {
    const room = rooms[socket.playerId];
    const { submissions } = room;

    if (submissions.A === null) io.to(socket.playerId).emit('wait', '等待甲方提交...');
    if (submissions.B === null) io.to(socket.playerId).emit('wait', '等待乙方提交...');

    if (submissions.A !== null && submissions.B !== null) {
      const totalCatch = Math.min(submissions.A + submissions.B, room.totalFish);
      const remaining = room.totalFish - totalCatch;
      room.aFish += submissions.A;
      room.bFish += submissions.B;

      io.to(socket.playerId).emit('nightStart', { room, remaining });

      room.submissions = { A: null, B: null };
    }
  }
});
