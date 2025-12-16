const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.static(__dirname + '/public'));
app.use(express.json());

let game = {
  day: 1,
  maxDays: 20,
  totalFish: 100,
  scoreA: 0,
  scoreB: 0,
  inputA: null,
  inputB: null,
  records: []
};

// 前端送捕魚數
io.on('connection', (socket) => {
  console.log('新連線:', socket.id);

  // 送初始遊戲狀態給新連線
  socket.emit('update', {
    day: game.day,
    totalFish: game.totalFish,
    scoreA: game.scoreA,
    scoreB: game.scoreB
  });

  socket.on('catch', (data) => {
    const {role, count, subjectId, experimenterAccount} = data;

    if(role==='A') game.inputA = count;
    if(role==='B') game.inputB = count;

    // 如果兩邊都送出，計算結果
    if(game.inputA !== null && game.inputB !== null){
      let totalCatch = game.inputA + game.inputB;
      if(totalCatch > game.totalFish) totalCatch = game.totalFish;
      let remaining = game.totalFish - totalCatch;

      game.scoreA += game.inputA;
      game.scoreB += game.inputB;

      game.records.push({
        day: game.day,
        fishBefore: game.totalFish,
        catchA: game.inputA,
        catchB: game.inputB,
        fishAfter: remaining*2,
        subjectId,
        experimenterAccount,
        timestamp: new Date().toISOString()
      });

      game.day++;
      game.totalFish = remaining*2;
      game.inputA = null;
      game.inputB = null;

      // 廣播給所有連線
      io.emit('update', {
        day: game.day,
        totalFish: game.totalFish,
        scoreA: game.scoreA,
        scoreB: game.scoreB
      });

      // 如果遊戲結束，廣播結束訊息
      if(game.day > game.maxDays || game.totalFish === 0){
        io.emit('end', {
          scoreA: game.scoreA,
          scoreB: game.scoreB,
          records: game.records
        });

        // 同步存檔 data.json
        fs.writeFileSync('data.json', JSON.stringify(game.records,null,2));
      }
    }
  });
});

http.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
