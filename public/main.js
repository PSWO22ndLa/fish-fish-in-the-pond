let socket;
let role;
let playerId;

function initGame(r, pId) {
  role = r;
  playerId = pId;

  document.body.classList.remove('night');
  document.body.classList.add('day');

  socket = io();
  socket.emit('join', { role, playerId });

  socket.on('wait', msg => {
    document.getElementById('status').innerText = msg;
    document.querySelector('button').disabled = true;
  });

  socket.on('nightStart', ({ room, remaining }) => {
    startNight(room, remaining);
  });

  socket.on('update', data => {
    document.getElementById('status').innerText =
      `Day ${data.day} - 總魚數：${Math.round(data.totalFish)} (甲抓${data.aFish} / 乙抓${data.bFish})`;
    document.querySelector('button').disabled = false;
    updatePond(data.totalFish);
  });
}

function submitFish() {
  const inputId = role === 'A' ? 'aFish' : 'bFish';
  const count = parseInt(document.getElementById(inputId).value) || 0;
  socket.emit('submitFish', { count });
  document.querySelector('button').disabled = true;
}

function updatePond(num) {
  const pond = document.getElementById('pond');
  pond.innerHTML = '';
  const displayCount = Math.min(Math.ceil(num / 2), 50);
  for (let i = 0; i < displayCount; i++) {
    const f = document.createElement('div');
    f.className = 'fish';
    f.style.top = Math.random() * 180 + 'px';
    f.style.animationDelay = Math.random() * 5 + 's';
    pond.appendChild(f);
  }
}

function startNight(room, remaining) {
  document.body.classList.remove('day');
  document.body.classList.add('night');

  const nightDuration = 2000;
  const newFish = remaining * 2;
  const frames = 60;
  const increment = newFish / frames;
  let currentFish = remaining;
  let frame = 0;

  const interval = setInterval(() => {
    frame++;
    currentFish = Math.min(currentFish + increment, newFish);
    updatePond(currentFish);
    if (frame >= frames) {
      clearInterval(interval);
      document.body.classList.remove('night');
      document.body.classList.add('day');

      room.totalFish = newFish;
      room.day++;
      document.getElementById('status').innerText =
        `Day ${room.day} - 總魚數：${Math.round(room.totalFish)} (甲抓${room.aFish} / 乙抓${room.bFish})`;
      document.querySelector('button').disabled = false;
    }
  }, nightDuration / frames);
}
