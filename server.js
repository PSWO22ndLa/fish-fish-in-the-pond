const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.static('public'));
app.use(express.json());

const PORT = 3000;

// 乙方帳號
const users = [
  { username: "FishSean", password: "971218" }
];

// 多受試者遊戲狀態
const games = {};

// 登入 API (乙)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  res.json({ success: !!user });
});

http.listen(PORT, () => console.log(`Server running at http://192.168.98.176:${PORT}`));

io.on('connection', socket => {

  // 玩家識別與房間ID
  socket.on('identify', ({ role, roomId }) => {
    socket.role = role;
    socket.roomId = roomId;

    // 建立新遊戲或回接舊遊戲
    if (!games[roomId]) {
      games[roomId] = {
        day: 1,
        totalFish: 100,
        totalCatch: { A: 0, B: 0 },
        submissions: { A: null, B: null },
        connected: { A: false, B: false },
        finished: false
      };
    }

    games[roomId].connected[role] = true;
    socket.join(roomId);

    // 同步狀態給此房間所有人
    io.to(roomId).emit('sync', games[roomId]);
  });

  // 提交魚數
  socket.on('submitFish', count => {
    const roomId = socket.roomId;
    const role = socket.role;
    if (!roomId || !role) return;

    const game = games[roomId];
    if (game.finished) return;

    game.submissions[role] = count;

    // 等待狀態
    if (game.submissions.A === null)
      io.to(roomId).emit('wait', '等待甲方提交...');
    if (game.submissions.B === null)
      io.to(roomId).emit('wait', '等待乙方提交...');

    // 雙方都提交 → 夜晚結算
    if (game.submissions.A !== null && game.submissions.B !== null) {
      io.to(roomId).emit('night');

      setTimeout(() => {
        const A = game.submissions.A;
        const B = game.submissions.B;

        const totalCatch = Math.min(A + B, game.totalFish);
        const remaining = game.totalFish - totalCatch;

        game.totalCatch.A += A;
        game.totalCatch.B += B;

        game.totalFish = remaining * 2;
        game.day++;

        game.submissions = { A: null, B: null };

        // 判斷結束
        if (game.day > 20 || game.totalFish <= 0) {
          game.finished = true;
        }

        io.to(roomId).emit('sync', game);
      }, 2000);
    }
  });

  // 重新開始
  socket.on('restart', () => {
    const roomId = socket.roomId;
    const game = games[roomId];
    if (!game) return;

    game.day = 1;
    game.totalFish = 100;
    game.totalCatch = { A: 0, B: 0 };
    game.submissions = { A: null, B: null };
    game.finished = false;

    io.to(roomId).emit('sync', game);
  });

  // 斷線
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    const role = socket.role;
    if (!roomId || !role) return;

    const game = games[roomId];
    if (!game) return;

    game.connected[role] = false;
    io.to(roomId).emit('status', game.connected);
  });

});
