const socket = io();

// 甲方
document.getElementById('enterA').addEventListener('click', () => {
  const playerId = document.getElementById('playerA-id').value.trim();
  const room = document.getElementById('playerA-room').value.trim();

  if (!playerId || !room) return alert('請輸入編號和房間號');

  // 發送加入房間訊息
  socket.emit('join', { role: 'A', playerId: room });

  // 等待對方加入
  socket.on('wait', msg => {
    document.body.style.cursor = 'wait';
    alert(msg);
  });

  // 房間滿員，開始遊戲
  socket.on('startGame', () => {
    window.location.href = `playerA.html?room=${room}&playerId=${playerId}`;
  });
});

// 乙方
document.getElementById('loginB').addEventListener('click', () => {
  const username = document.getElementById('playerB-username').value.trim();
  const password = document.getElementById('playerB-password').value.trim();
  const room = document.getElementById('playerB-room').value.trim();

  if (!username || !password || !room) return alert('請輸入帳號、密碼和房間號');

  // 驗證帳號密碼
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) return alert('帳號或密碼錯誤');

    // 發送加入房間訊息
    socket.emit('join', { role: 'B', playerId: room });

    // 等待對方加入
    socket.on('wait', msg => {
      document.body.style.cursor = 'wait';
      alert(msg);
    });

    // 房間滿員，開始遊戲
    socket.on('startGame', () => {
      window.location.href = `playerB.html?room=${room}&username=${username}`;
    });
  });
});
