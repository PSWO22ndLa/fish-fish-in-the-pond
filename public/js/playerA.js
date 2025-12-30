const socket = io();
const roomId = new URLSearchParams(window.location.search).get('roomId');
socket.emit('identify', { role: 'A', roomId });

const pond = document.getElementById('pond');
const fishInput = document.getElementById('fishInput');
const status = document.getElementById('status');
let totalFish = 100;
let fishElements = [];

// 魚的類別 - 處理不規則游動
class Fish {
  constructor(index) {
    this.element = document.createElement('div');
    this.element.className = 'fish';
    this.x = Math.random() * 90;
    this.y = Math.random() * 80;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.element.style.left = this.x + '%';
    this.element.style.top = this.y + '%';
    pond.appendChild(this.element);
  }

  update() {
    // 不規則移動
    this.x += this.speedX;
    this.y += this.speedY;

    // 邊界反彈
    if (this.x <= 0 || this.x >= 95) this.speedX *= -1;
    if (this.y <= 0 || this.y >= 85) this.speedY *= -1;

    // 隨機改變方向
    if (Math.random() < 0.02) {
      this.speedX += (Math.random() - 0.5) * 0.2;
      this.speedY += (Math.random() - 0.5) * 0.2;
    }

    // 限制速度
    this.speedX = Math.max(-1, Math.min(1, this.speedX));
    this.speedY = Math.max(-0.5, Math.min(0.5, this.speedY));

    this.element.style.left = this.x + '%';
    this.element.style.top = this.y + '%';

    // 魚的方向（面向移動方向）
    const angle = Math.atan2(this.speedY, this.speedX) * 180 / Math.PI;
    this.element.style.transform = `rotate(${angle}deg)`;
  }

  remove() {
    this.element.remove();
  }
}

// 清空魚池
function clearFish() {
  fishElements.forEach(fish => fish.remove());
  fishElements = [];
}

// 渲染魚（初始化）
function renderFish(n) {
  clearFish();
  const maxRender = Math.min(n, 50);
  
  for (let i = 0; i < maxRender; i++) {
    fishElements.push(new Fish(i));
  }

  pond.setAttribute('data-count', n);
}

// 繁殖動畫 - 一隻一隻出現
function breedAnimation(oldCount, newCount) {
  const toAdd = Math.min(newCount - oldCount, 50 - oldCount);
  if (toAdd <= 0) {
    renderFish(newCount);
    return;
  }

  const interval = 2000 / toAdd; // 2秒內完成
  let added = 0;

  const addFish = setInterval(() => {
    if (added >= toAdd) {
      clearInterval(addFish);
      pond.setAttribute('data-count', newCount);
      return;
    }
    
    fishElements.push(new Fish(oldCount + added));
    added++;
  }, interval);
}

// 魚游動動畫循環
function animateFish() {
  fishElements.forEach(fish => fish.update());
  requestAnimationFrame(animateFish);
}
animateFish();

// 提交魚數
function submitFish() {
  const count = parseInt(fishInput.value);
  if (isNaN(count) || count < 0) return alert('請輸入有效數字');
  if (count > totalFish) return alert(`最多只能抓 ${totalFish} 條魚`);
  
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

socket.on('night', data => {
  document.body.classList.add('night');
  document.body.classList.remove('day');
  status.innerText = '🌙 夜晚中… 魚正在繁殖';

  const oldCount = parseInt(pond.getAttribute('data-count')) || 0;
  
  // 2秒後開始繁殖動畫
  setTimeout(() => {
    status.innerText = '✨ 魚兒正在繁殖...';
    breedAnimation(oldCount, data.newFishCount);
  }, 1000);
});

socket.on('roomInfo', info => {
  status.innerText = `房間代碼: ${info.roomId} | 等待實驗者加入...`;
});