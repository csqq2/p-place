const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');

// ここをあなたのRenderアプリのURLに置き換えてください
const WS_URL = 'wss://pplace.onrender.comcom';
const ws = new WebSocket(WS_URL);

const gridSize = 1000; // グリッドを1000x1000に拡大
let pixelData = {}; // 全ピクセルデータをメモリにキャッシュ

let scale = 1; // ズームレベル
let translateX = 0; // X軸のパン
let translateY = 0; // Y軸のパン
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let currentColor = colorPicker.value;

canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;

// --- リアルタイム通信 ---

ws.onopen = () => {
    console.log('Connected to WebSocket server.');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'initial') {
        // 全ピクセルデータをメモリにロード
        message.data.forEach(pixel => {
            pixelData[`${pixel.x},${pixel.y}`] = pixel.color;
        });
        drawCanvas();
    } else if (message.type === 'pixel_updated') {
        const { x, y, color } = message.data;
        // データ更新
        pixelData[`${x},${y}`] = color;
        // 描画更新
        drawCanvas();
    }
};

// --- イベントリスナー ---

colorPicker.addEventListener('change', (e) => {
    currentColor = e.target.value;
});

// マウスイベントによるパン
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        translateX += deltaX;
        translateY += deltaY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        drawCanvas();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

// ホイールイベントによるズーム
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // ズームイン/アウトの係数
    const oldScale = scale;
    scale *= zoomFactor;
    scale = Math.max(0.1, Math.min(10, scale)); // ズームの限界を設定
    
    // マウスカーソルを中心にズーム
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;
    translateX = mouseX - (mouseX - translateX) * (scale / oldScale);
    translateY = mouseY - (mouseY - translateY) * (scale / oldScale);

    drawCanvas();
});

// クリック時にピクセルを送信
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor(((e.clientX - rect.left - translateX) / scale));
    const gridY = Math.floor(((e.clientY - rect.top - translateY) / scale));

    if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
        const updateData = {
            type: 'update_pixel',
            x: gridX,
            y: gridY,
            color: currentColor
        };
        ws.send(JSON.stringify(updateData));
    }
});

// --- 描画関数 ---

function drawCanvas() {
    // 描画領域をクリア
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 可視領域のグリッド座標を計算
    const minX = Math.floor(-translateX / scale);
    const minY = Math.floor(-translateY / scale);
    const maxX = Math.ceil((canvas.width - translateX) / scale);
    const maxY = Math.ceil((canvas.height - translateY) / scale);

    // 可視領域のピクセルのみを描画
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const key = `${x},${y}`;
            if (pixelData[key]) {
                ctx.fillStyle = pixelData[key];
                ctx.fillRect(x * scale + translateX, y * scale + translateY, scale, scale);
            }
        }
    }
}

// 初回描画
drawCanvas();
