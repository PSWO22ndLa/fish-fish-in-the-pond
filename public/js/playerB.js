const socket = io();
const roomId = new URLSearchParams(window.location.search).get('roomId');
socket.emit('identify', { role: 'B', roomId });

const pond = document.getElementById('pond');
const fishInput = document.getElementById('fishInput');
const status = document.getElementById('status');
let totalFish = 100;
let fishElements = [];
let currentLogs = []; // 當前實驗數據
let currentModalData = null; // 當前彈出視窗的數據

status.innerText = `🔑 房間代碼: ${roomId} | 請告知受試者此代碼`;

// 魚的類別
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
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x <= 0 || this.x >= 95) this.speedX *= -1;
    if (this.y <= 0 || this.y >= 85) this.speedY *= -1;

    if (Math.random() < 0.02) {
      this.speedX += (Math.random() - 0.5) * 0.2;
      this.speedY += (Math.random() - 0.5) * 0.2;
    }

    this.speedX = Math.max(-1, Math.min(1, this.speedX));
    this.speedY = Math.max(-0.5, Math.min(0.5, this.speedY));

    this.element.style.left = this.x + '%';
    this.element.style.top = this.y + '%';

    const angle = Math.atan2(this.speedY, this.speedX) * 180 / Math.PI;
    this.element.style.transform = `rotate(${angle}deg)`;
  }

  remove() {
    this.element.remove();
  }
}

function clearFish() {
  fishElements.forEach(fish => fish.remove());
  fishElements = [];
}

function renderFish(n) {
  clearFish();
  const maxRender = Math.min(n, 50);
  
  for (let i = 0; i < maxRender; i++) {
    fishElements.push(new Fish(i));
  }

  pond.setAttribute('data-count', n);
}

function breedAnimation(oldCount, newCount) {
  const toAdd = Math.min(newCount - oldCount, 50 - oldCount);
  if (toAdd <= 0) {
    renderFish(newCount);
    return;
  }

  const interval = 2000 / toAdd;
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

function animateFish() {
  fishElements.forEach(fish => fish.update());
  requestAnimationFrame(animateFish);
}
animateFish();

function submitFish() {
  const count = parseInt(fishInput.value);
  if (isNaN(count) || count < 0) return alert('請輸入有效數字');
  if (count > totalFish) return alert(`最多只能抓 ${totalFish} 條魚`);
  
  socket.emit('submitFish', count);
  fishInput.value = '';
}

function restartGame() {
  if (confirm('確定要重新開始嗎？當前數據將清空（未保存會遺失）')) {
    socket.emit('restart');
  }
}

// 💾 保存當前實驗數據
function saveExperiment() {
  if (currentLogs.length === 0) {
    return alert('⚠️ 尚無實驗數據可保存');
  }

  const subjectId = prompt('請輸入受試者編號（例如：001）：');
  if (!subjectId || subjectId.trim() === '') {
    return alert('⚠️ 受試者編號不能為空');
  }

  // 發送保存請求到服務器
  socket.emit('saveExperiment', {
    subjectId: subjectId.trim(),
    logs: currentLogs,
    roomId: roomId
  });
}

// 📂 載入已保存的實驗列表
function loadSavedExperiments() {
  socket.emit('getSavedExperiments');
}

// 🔍 顯示特定受試者的數據
function showExperiment(subjectId, data) {
  currentModalData = { subjectId, data };
  
  document.getElementById('modalTitle').innerText = `受試者: ${subjectId}`;
  
  const modalData = document.getElementById('modalData');
  modalData.innerHTML = `
    <table class="modal-table">
      <thead>
        <tr>
          <th>天數</th>
          <th>開始魚數</th>
          <th>甲抓</th>
          <th>乙抓</th>
          <th>結束魚數</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(log => `
          <tr>
            <td>${log.day}</td>
            <td>${log.startFish}</td>
            <td>${log.catchA}</td>
            <td>${log.catchB}</td>
            <td>${log.endFish}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="summary">
      <p>📊 實驗總結：</p>
      <p>總天數：${data.length} 天</p>
      <p>甲總捕獲：${data.reduce((sum, log) => sum + log.catchA, 0)} 條</p>
      <p>乙總捕獲：${data.reduce((sum, log) => sum + log.catchB, 0)} 條</p>
    </div>
  `;
  
  document.getElementById('modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// 下載彈出視窗中的數據
function downloadModalData() {
  if (!currentModalData) return;
  
  const blob = new Blob(
    [JSON.stringify(currentModalData.data, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `subject_${currentModalData.subjectId}_${roomId}.json`;
  a.click();
}

// 點擊視窗外部關閉
window.onclick = function(event) {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    closeModal();
  }
}

// Socket 事件
socket.on('sync', game => {
  totalFish = game.totalFish;
  renderFish(totalFish);
  status.innerText = game.finished
    ? `遊戲結束！甲抓${game.totalCatch.A}條，乙抓${game.totalCatch.B}條`
    : `🔑 房間: ${roomId} | 第${game.day}天 | 魚池剩餘: ${game.totalFish}條`;
  document.body.classList.add('day');
  document.body.classList.remove('night');

  // 更新當前實驗數據
  currentLogs = game.logs || [];
  
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';

  currentLogs.forEach(log => {
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
});

socket.on('wait', msg => {
  status.innerText = msg;
});

socket.on('night', data => {
  document.body.classList.add('night');
  document.body.classList.remove('day');
  status.innerText = '🌙 夜晚中… 魚正在繁殖';

  const oldCount = parseInt(pond.getAttribute('data-count')) || 0;
  
  setTimeout(() => {
    status.innerText = '✨ 魚兒正在繁殖...';
    breedAnimation(oldCount, data.newFishCount);
  }, 1000);
});

socket.on('roomInfo', info => {
  status.innerText = `🔑 房間代碼: ${info.roomId} | 等待受試者加入...`;
});

// 💾 保存成功
socket.on('experimentSaved', ({ subjectId }) => {
  alert(`✅ 受試者 ${subjectId} 的數據已保存！`);
  loadSavedExperiments(); // 重新載入列表
});

// 📂 接收已保存的實驗列表
socket.on('savedExperiments', (experiments) => {
  const container = document.getElementById('savedExperiments');
  
  if (experiments.length === 0) {
    container.innerHTML = '<p style="opacity: 0.7;">尚無保存的實驗數據</p>';
    return;
  }

  container.innerHTML = experiments.map(exp => `
    <button class="subject-btn" onclick='socket.emit("loadExperiment", "${exp.subjectId}")'>
      📋 受試者: ${exp.subjectId}
      <span class="timestamp">${new Date(exp.timestamp).toLocaleString('zh-TW')}</span>
    </button>
  `).join('');
});

// 📊 載入特定實驗數據
socket.on('experimentData', ({ subjectId, logs }) => {
  showExperiment(subjectId, logs);
});

// 頁面載入時取得已保存的實驗
setTimeout(() => {
  loadSavedExperiments();
}, 1000);