const socket = io();
const roomId = prompt("請輸入受試者編號"); // 房間ID
socket.emit('identify', { role: 'A', roomId });

const pond = document.getElementById('pond');
const fishInput = document.getElementById('fishInput');
const status = document.getElementById('status');
let totalFish = 100;

// 生成魚元素
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

// 提交魚數
function submitFish() {
  const count = parseInt(fishInput.value);
  if (isNaN(count) || count < 0) return;
  socket.emit('submitFish', count);
  fishInput.value = '';
}

function restartGame() {
  socket.emit('restart');
}

// Socket 事件
socket.on('sync', game => {
  totalFish = game.totalFish;
  renderFish(totalFish);
  status.innerText = game.finished
    ? `遊戲結束！甲抓${game.totalCatch.A}條，乙抓${game.totalCatch.B}條`
    : `第${game.day}天 | 魚池剩餘: ${game.totalFish}條`;
  document.body.classList.add('day');
  document.body.classList.remove('night');
});

socket.on('wait', msg => {
  status.innerText = msg;
});

socket.on('night', () => {
  document.body.classList.add('night');
  document.body.classList.remove('day');
  status.innerText = '夜晚中… 魚正在繁殖';

  const current = Number(pond.getAttribute('data-count')) || 0;
  let target = totalFish; // server sync 之後會更新

  // 夜晚結束後由 sync 更新 totalFish
});
