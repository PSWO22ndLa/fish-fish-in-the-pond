const socket = io();
const roomId = prompt("請輸入受試者編號"); // 房間ID
socket.emit('identify', { role: 'B', roomId });

const pond = document.getElementById('pond');
const fishInput = document.getElementById('fishInput');
const status = document.getElementById('status');
let totalFish = 100;

function renderFish(n) {
  pond.innerHTML = '';

  const maxRender = Math.min(n, 50); // ⭐ 最多顯示 50 條（效能）
  for (let i = 0; i < maxRender; i++) {
    const fish = document.createElement('div');
    fish.className = 'fish';
    fish.style.top = Math.random() * 80 + '%';
    fish.style.left = Math.random() * 90 + '%'; // ⭐ 關鍵
    fish.style.animationDuration = (3 + Math.random() * 4) + 's';
    pond.appendChild(fish);
  }

  pond.setAttribute('data-count', n);
}

function submitFish() {
  const count = parseInt(fishInput.value);
  if (isNaN(count) || count < 0) return;
  socket.emit('submitFish', count);
  fishInput.value = '';
}

function restartGame() {
  socket.emit('restart');
}
function downloadData() {
  socket.emit('requestData');
}

socket.on('sync', game => {
  totalFish = game.totalFish;
  renderFish(totalFish);
  status.innerText = game.finished
    ? `遊戲結束！甲抓${game.totalCatch.A}條，乙抓${game.totalCatch.B}條`
    : `第${game.day}天 | 魚池剩餘: ${game.totalFish}條`;
  document.body.classList.add('day');
  document.body.classList.remove('night');
});

const tbody = document.querySelector('#dataTable tbody');
tbody.innerHTML = '';

game.logs.forEach(log => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${log.day}</td>
    <td>${log.startFish}</td>
    <td>${log.catchA}</td>
    <td>${log.catchB}</td>
    <td>${log.endFish}</td>
  `;
  tbody.appendChild(tr);
});

socket.on('wait', msg => {
  status.innerText = msg;
});
socket.on('experimentData', logs => {
  const blob = new Blob(
    [JSON.stringify(logs, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `experiment_${roomId}.json`;
  a.click();
});

socket.on('night', () => {
  document.body.classList.add('night');
  document.body.classList.remove('day');
  status.innerText = '夜晚中… 魚正在繁殖';

  const current = Number(pond.getAttribute('data-count')) || 0;
  let target = totalFish; // server sync 之後會更新

  // 夜晚結束後由 sync 更新 totalFish
});
