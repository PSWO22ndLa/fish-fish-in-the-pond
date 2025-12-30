const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.use(express.static('public'));
app.use(express.json());

const PORT = 3000;

// 乙方帳號
const users = [
  { username: "FishSean", password: "971218" }
];

// 多受試者遊戲狀態
const games = {};

// 保存的實驗數據資料夾
const DATA_DIR = path.join(__dirname, 'experiment_data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// 登入 API (乙)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  res.json({ success: !!user });
});

http.listen(PORT, () => console.log(`Server running at http://192.168.7.38:${PORT}`));

// 輔助函數：保存實驗數據到文件
function saveExperimentToFile(subjectId, logs, roomId) {
  const filename = path.join(DATA_DIR, `${subjectId}_${roomId}_${Date.now()}.json`);
  const data = {
    subjectId,
    roomId,
    timestamp: new Date().toISOString(),
    logs
  };
  
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('保存失敗:', err);
    return false;
  }
}

// 輔助函數：讀取所有保存的實驗
function getAllSavedExperiments() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const experiments = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
          const data = JSON.parse(content);
          return {
            filename: f,
            subjectId: data.subjectId,
            roomId: data.roomId,
            timestamp: data.timestamp,
            logCount: data.logs.length
          };
        } catch (err) {
          return null;
        }
      })
      .filter(e => e !== null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // 最新的在前
    
    return experiments;
  } catch (err) {
    console.error('讀取實驗列表失敗:', err);
    return [];
  }
}

// 輔助函數：讀取特定受試者的數據
function loadExperimentData(subjectId) {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const targetFile = files.find(f => f.startsWith(subjectId + '_'));
    
    if (!targetFile) return null;
    
    const content = fs.readFileSync(path.join(DATA_DIR, targetFile), 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('讀取實驗數據失敗:', err);
    return null;
  }
}

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
        finished: false,
        logs: []
      };
    }

    games[roomId].connected[role] = true;
    socket.join(roomId);

    // 發送房間資訊
    socket.emit('roomInfo', { roomId: roomId });

    // 同步狀態給此房間所有人
    io.to(roomId).emit('sync', games[roomId]);

    // 通知雙方已連線
    if (games[roomId].connected.A && games[roomId].connected.B) {
      io.to(roomId).emit('wait', '雙方已連線，可以開始遊戲！');
    }
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
      const A = game.submissions.A;
      const B = game.submissions.B;

      const startFish = game.totalFish;
      const totalCatch = Math.min(A + B, game.totalFish);
      const remaining = game.totalFish - totalCatch;

      game.totalCatch.A += A;
      game.totalCatch.B += B;

      const newFishCount = remaining * 2;

      // 發送夜晚事件
      io.to(roomId).emit('night', { newFishCount: newFishCount });

      setTimeout(() => {
        game.totalFish = newFishCount;
        
        // 記錄本輪數據
        game.logs.push({
          day: game.day,
          startFish: startFish,
          catchA: A,
          catchB: B,
          endFish: remaining,
          afterGrowth: game.totalFish
        });

        game.day++;
        game.submissions = { A: null, B: null };

        // 判斷結束
        if (game.day > 20 || game.totalFish <= 0) {
          game.finished = true;
        }

        io.to(roomId).emit('sync', game);
      }, 3000);
    }
  });

  // 💾 保存實驗數據
  socket.on('saveExperiment', ({ subjectId, logs, roomId }) => {
    const success = saveExperimentToFile(subjectId, logs, roomId);
    
    if (success) {
      socket.emit('experimentSaved', { subjectId });
      console.log(`✅ 受試者 ${subjectId} 的數據已保存`);
    } else {
      socket.emit('error', { message: '保存失敗' });
    }
  });

  // 📂 取得已保存的實驗列表
  socket.on('getSavedExperiments', () => {
    const experiments = getAllSavedExperiments();
    socket.emit('savedExperiments', experiments);
  });

  // 📊 載入特定實驗數據
  socket.on('loadExperiment', (subjectId) => {
    const data = loadExperimentData(subjectId);
    
    if (data) {
      socket.emit('experimentData', {
        subjectId: data.subjectId,
        logs: data.logs
      });
    } else {
      socket.emit('error', { message: '找不到該受試者的數據' });
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
    game.logs = [];

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