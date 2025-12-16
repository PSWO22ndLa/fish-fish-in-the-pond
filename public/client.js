const socket = io();

// 解析 URL 參數判斷角色
const params = new URLSearchParams(window.location.search);
const role = params.get('role');

socket.on('update', (state) => {
  document.getElementById('fish').innerText = `池塘總魚數: ${state.totalFish}`;
  document.getElementById('scoreA').innerText = `你目前捕到: ${state.scoreA}`;
  document.getElementById('scoreB').innerText = `你目前捕到: ${state.scoreB}`;
  document.getElementById('progressBar').innerText = `Day ${state.day}`;
});

socket.on('gameOver', (data) => {
  alert(`遊戲結束!\n甲: ${data.scoreA} 條魚\n乙: ${data.scoreB} 條魚`);
});

function submitA() {
  if(role!=='A'){ alert("你不是甲"); return; }
  const count = Number(document.getElementById('catchA').value);
  if(isNaN(count)||count<0){ alert("輸入錯誤"); return; }
  socket.emit('catchA', count);
}

function submitB() {
  if(role!=='B'){ alert("你不是乙"); return; }
  const count = Number(document.getElementById('catchB').value);
  if(isNaN(count)||count<0){ alert("輸入錯誤"); return; }
  socket.emit('catchB', count);
}

function downloadJSON() {
  fetch('/data.json').then(res=>res.blob()).then(blob=>{
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "data.json";
    a.click();
  });
}
