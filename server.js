const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

const PORT = 3000;

// 靜態資源
app.use(express.static('public'));

// 乙帳號密碼（固定）
const accounts = {
  "FishSean.971218": "TaiSean60805Chiayiseniorhighschoolstudent"
};

// 遊戲初始狀態
let gameState = {
  totalFish: 100,
  day: 1,
  maxDays: 20,
  scoreA: 0,
  scoreB: 0,
  tempA: null,
  tempB: null,
  records: []
};

// Socket.IO 連線
io.on('connection', (socket) => {
  console.log('有玩家連線:', socket.id);

  socket.emit('update', gameState);

  socket.on('catchA', (count) => {
    gameState.tempA = count;
    checkDayEnd();
  });

  socket.on('catchB', (count) => {
    gameState.tempB = count;
    checkDayEnd();
  });

  function checkDayEnd() {
    if(gameState.tempA !== null && gameState.tempB !== null){
      let totalCatch = gameState.tempA + gameState.tempB;
      if(totalCatch > gameState.totalFish) totalCatch = gameState.totalFish;
      let remaining = gameState.totalFish - totalCatch;

      gameState.scoreA += gameState.tempA;
      gameState.scoreB += gameState.tempB;

      gameState.records.push({
        day: gameState.day,
        fishBefore: gameState.totalFish,
        catchA: gameState.tempA,
        catchB: gameState.tempB,
        fishAfter: remaining*2,
        timestamp: new Date().toISOString()
      });

      gameState.totalFish = remaining*2;
      gameState.day++;
      gameState.tempA = null;
      gameState.tempB = null;

      io.emit('update', gameState);

      if(gameState.day > gameState.maxDays || gameState.totalFish === 0){
        io.emit('gameOver', {scoreA: gameState.scoreA, scoreB: gameState.scoreB});
        fs.writeFileSync('data.json', JSON.stringify(gameState.records, null, 2));
      }
    } else {
      io.emit('update', gameState);
    }
  }
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`伺服器運行在 http://192.168.7.38:3000`);
});
