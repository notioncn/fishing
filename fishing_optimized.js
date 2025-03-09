// 游戏配置
const config = {
    fishCount: 10,
    netSpeed: 8,
    gameTime: 60, // 游戏时长（秒）
    baseFishSpeed: 0.8, // 降低基础鱼的速度
    netSize: 30, // 渔网大小
    netExpandTime: 300, // 渔网展开时间（毫秒）
    netStayTime: 500 // 渔网停留时间（毫秒）
};

// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');


// 游戏状态
let isGameRunning = false;
let score = 0;
let timeLeft = config.gameTime;
let gameTimer = null;

// 鱼的信息
let fishes = [];
const fishColors = ['#FF4444', '#FFD700', '#00BFFF', '#9932CC'];
const fishScores = [50, 30, 10, 100]; // 对应不同颜色鱼的分数（红色、黄色、蓝色、紫色宝石鱼）
const fishSpeeds = [1.2, 1.0, 0.8, 1.5]; // 降低后的速度倍率

// 渔网的信息
let net = {
    x: 0,
    y: 0,
    visible: false,
    speed: config.netSpeed,
    angle: 0, // 发射角度
    size: 5, // 当前大小
    maxSize: config.netSize, // 最大大小
    state: 'flying', // 状态：flying, expanding, deployed, retracting
    throwTime: 0, // 发射时间
    particles: [] // 轨迹粒子
};

// 设置画布大小
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const pixelRatio = window.devicePixelRatio || 1;
    
    // 设置CSS尺寸
    canvas.style.width = container.offsetWidth + 'px';
    canvas.style.height = container.offsetHeight + 'px';
    
    // 设置实际渲染尺寸
    canvas.width = container.offsetWidth * pixelRatio;
    canvas.height = container.offsetHeight * pixelRatio;
    
    // 缩放画布上下文
    ctx.scale(pixelRatio, pixelRatio);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 生成鱼
function createFish() {
    const colorIndex = Math.floor(Math.random() * fishColors.length);
    
    // 固定尺寸（紫色宝石鱼25，其他20）
    let size = colorIndex === 3 ? 25 : 20;
    
    // 改进的游动路径算法
    const angle = Math.random() * Math.PI * 2;
    const speed = config.baseFishSpeed * (0.8 + Math.random() * 0.4);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;

    const fish = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: dx,
        dy: dy,
        size: size,
        color: fishColors[colorIndex],
        score: fishScores[colorIndex],
        speedMultiplier: fishSpeeds[colorIndex], // 使用对应的速度倍率
        turnCounter: 0, // 新增转向计数器
        turnInterval: 50 + Math.random() * 100 // 转向间隔
    };
    
    fishes.push(fish);
}

// 绘制鱼
function drawFish() {
    fishes.forEach(fish => {
        ctx.fillStyle = fish.color;
        
        // 根据鱼的移动方向绘制
        ctx.save();
        ctx.translate(fish.x, fish.y);
        
        // 计算鱼的朝向角度
        const angle = Math.atan2(fish.dy, fish.dx);
        ctx.rotate(angle);
        
        // 绘制鱼身
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size, fish.size/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制鱼尾
        ctx.beginPath();
        ctx.moveTo(fish.size * -0.5, 0);
        ctx.lineTo(fish.size * -1, fish.size * 0.5);
        ctx.lineTo(fish.size * -1, fish.size * -0.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });
}



// 绘制发射器
function drawLauncher() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 30;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(net.angle);
    
    // 绘制发射器主体
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.rect(-10, -5, 30, 10);
    ctx.fill();
    
    ctx.restore();
}

// 游戏循环
function gameLoop() {
    if (!isGameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 更新鱼的位置
    fishes.forEach(fish => {
        fish.x += fish.dx * fish.speedMultiplier;
        fish.y += fish.dy * fish.speedMultiplier;
        
        // 边界检查和循环
        if (fish.x < -fish.size) fish.x = canvas.width + fish.size;
        if (fish.x > canvas.width + fish.size) fish.x = -fish.size;
        if (fish.y < -fish.size) fish.y = canvas.height + fish.size;
        if (fish.y > canvas.height + fish.size) fish.y = -fish.size;
    });
    
    // 更新渔网状态
    if (net.visible) {
        switch(net.state) {
            case 'flying':
                net.x += Math.cos(net.angle) * net.speed;
                net.y += Math.sin(net.angle) * net.speed;
                // 检查是否到达最大距离或碰到边界
                if (net.x < 0 || net.x > canvas.width || net.y < 0 || net.y > canvas.height) {
                    net.state = 'retracting';
                }
                break;
            case 'expanding':
                net.size = Math.min(net.size + 2, net.maxSize);
                if (net.size >= net.maxSize) {
                    net.state = 'deployed';
                    net.throwTime = Date.now();
                }
                break;
            case 'deployed':
                if (Date.now() - net.throwTime > config.netStayTime) {
                    net.state = 'retracting';
                }
                break;
            case 'retracting':
                net.size = Math.max(5, net.size - 2);
                if (net.size <= 5) {
                    net.visible = false;
                }
                break;
        }
    }
    
    drawLauncher();
    drawFish();
    drawNet();
    
    // 添加碰撞检测
    if (net.visible) {
        checkNetHit();
    }
    
    requestAnimationFrame(gameLoop);
}

// 开始游戏
function startGame() {
    if (isGameRunning) return;
    
    // 隐藏游戏规则界面
    document.getElementById('game-rules').style.display = 'none';
    isGameRunning = true;
    score = 0;
    timeLeft = config.gameTime;
    scoreElement.textContent = score;
    timerElement.textContent = timeLeft;
    
    // 清除之前的状态
    fishes = [];
    net.visible = false;
    net.angle = -Math.PI / 2; // 默认向上
    
    // 清除可能存在的旧定时器
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    // 生成初始鱼群
    for (let i = 0; i < config.fishCount; i++) {
        createFish();
    }
    
    // 设置倒计时
    gameTimer = setInterval(() => {
        if (timeLeft <= 0) {
            endGame();
            return;
        }
        timeLeft--;
        timerElement.textContent = timeLeft;
    }, 1000);
    
    // 启动游戏循环
    gameLoop();
}

// 重置游戏
function resetGame() {
    isGameRunning = false;
    score = 0;
    timeLeft = config.gameTime;
    scoreElement.textContent = score;
    timerElement.textContent = timeLeft;
    fishes = [];
    document.getElementById('game-rules').style.display = 'block';
}

// 事件监听
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);

// 绑定点击事件
canvas.addEventListener('click', (e) => {
    if (isGameRunning) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        throwNet(x, y);
    }
});

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;
    
    if (e.key === ' ' || e.key === 'ArrowUp') {
        // 空格或上箭头发射渔网
        if (!net.visible) {
            const targetX = canvas.width / 2;
            const targetY = 0; // 默认向上发射
            throwNet(targetX, targetY);
        }
    }
});

// 绘制渔网
function drawNet() {
    if (!net.visible) return;
    
    ctx.save();
    
    // 根据渔网状态绘制不同效果
    switch(net.state) {
        case 'flying':
            // 绘制飞行中的渔网（较小）
            ctx.translate(net.x, net.y);
            
            // 绘制渔网轨迹粒子
            for (let i = 0; i < net.particles.length; i++) {
                const particle = net.particles[i];
                ctx.globalAlpha = particle.alpha;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = '#AADDFF';
                ctx.fill();
            }
            
            // 绘制渔网本体
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(0, 0, net.size, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制网格线
            const segments = 8;
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * net.size, Math.sin(angle) * net.size);
                ctx.stroke();
            }
            break;
            
        case 'expanding':
        case 'deployed':
            // 绘制展开的渔网
            ctx.translate(net.x, net.y);
            ctx.beginPath();
            ctx.arc(0, 0, net.size, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制网格线 - 径向线
            const radialSegments = 12;
            for (let i = 0; i < radialSegments; i++) {
                const angle = (i / radialSegments) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * net.size, Math.sin(angle) * net.size);
                ctx.stroke();
            }
            
            // 绘制网格线 - 同心圆
            const circles = 3;
            for (let i = 1; i <= circles; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, (net.size * i) / (circles + 1), 0, Math.PI * 2);
                ctx.stroke();
            }
            break;
            
        case 'retracting':
            // 绘制收回中的渔网
            ctx.translate(net.x, net.y);
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(0, 0, net.size, 0, Math.PI * 2);
            ctx.strokeStyle = '#AADDFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 简化的网格
            const retractSegments = 6;
            for (let i = 0; i < retractSegments; i++) {
                const angle = (i / retractSegments) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * net.size, Math.sin(angle) * net.size);
                ctx.stroke();
            }
            break;
    }
    
    ctx.restore();
}

// 投掷渔网
function throwNet(x, y) {
    if (net.visible || !isGameRunning) return;
    
    // 计算发射角度
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 30;
    net.angle = Math.atan2(y - centerY, x - centerX);
    
    net.x = centerX;
    net.y = centerY;
    net.visible = true;
    net.size = 5; // 初始大小
    net.state = 'flying';
    net.throwTime = Date.now();
    net.particles = []; // 清空粒子
    
    moveNet();
}

// 移动渔网
function moveNet() {
    if (!net.visible) return;
    
    const now = Date.now();
    const elapsedTime = now - net.throwTime;
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 30;
    
    // 根据渔网状态更新位置和大小
    switch(net.state) {
        case 'flying':
            // 移动渔网
            const dx = Math.cos(net.angle) * net.speed;
            const dy = Math.sin(net.angle) * net.speed;
            
            net.x += dx;
            net.y += dy;
            
            // 添加轨迹粒子
            if (Math.random() < 0.3) {
                net.particles.push({
                    x: -dx * (Math.random() * 5),
                    y: -dy * (Math.random() * 5),
                    size: 1 + Math.random() * 2,
                    alpha: 0.7
                });
                
                // 限制粒子数量
                if (net.particles.length > 10) {
                    net.particles.shift();
                }
            }
            
            // 更新粒子透明度
            for (let i = 0; i < net.particles.length; i++) {
                net.particles[i].alpha -= 0.02;
                if (net.particles[i].alpha <= 0) {
                    net.particles.splice(i, 1);
                    i--;
                }
            }
            
            // 检查是否超出边界
            if (net.x < 0 || net.x > canvas.width || 
                net.y < 0 || net.y > canvas.height) {
                net.visible = false;
                return;
            }
            
            // 检查碰撞
            checkNetHit();
            
            // 如果到达最大距离，开始展开
            const distance = Math.hypot(net.x - centerX, net.y - centerY);
            if (distance >= 150) {
                net.state = 'expanding';
                net.throwTime = now; // 重置时间
            }
            break;
            
        case 'expanding':
            // 渔网展开动画
            const expandProgress = Math.min(elapsedTime / config.netExpandTime, 1);
            net.size = 5 + (config.netSize - 5) * expandProgress;
            
            // 展开完成后切换到部署状态
            if (expandProgress >= 1) {
                net.state = 'deployed';
                net.throwTime = now; // 重置时间
            }
            
            // 检查碰撞
            checkNetHit();
            break;
            
        case 'deployed':
            // 渔网停留一段时间
            if (elapsedTime >= config.netStayTime) {
                net.state = 'retracting';
                net.throwTime = now; // 重置时间
            }
            
            // 检查碰撞
            checkNetHit();
            break;
            
        case 'retracting':
            // 计算收回的中心点
            const centerX = canvas.width / 2;
            const centerY = canvas.height - 30;
            
            // 向发射器移动
            const dx2 = centerX - net.x;
            const dy2 = centerY - net.y;
            const dist = Math.hypot(dx2, dy2);
            
            if (dist < 10) {
                // 收回完成
                net.visible = false;
            } else {
                // 继续收回
                const speed = 5;
                net.x += (dx2 / dist) * speed;
                net.y += (dy2 / dist) * speed;
                
                // 逐渐缩小
                net.size = Math.max(5, net.size - 2);
            }
            break;
    }
    
    // 继续移动
    if (net.visible) {
        requestAnimationFrame(moveNet);
    }
}

// 检测渔网命中
function checkNetHit() {
    // 移除状态限制，始终检测碰撞
    const scaledNetSize = net.size * (window.devicePixelRatio || 1);
    
    for (let i = 0; i < fishes.length; i++) {
        const fish = fishes[i];
        const scaledFishSize = fish.size * (window.devicePixelRatio || 1);
        
        const dx = net.x - fish.x;
        const dy = net.y - fish.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < (scaledNetSize/2 + scaledFishSize/2)) {
            // 命中鱼
            score += fish.score;
            scoreElement.textContent = score;
            
            createCaptureEffect(fish.x, fish.y, fish.color);
            fishes.splice(i, 1);
            i--;
            setTimeout(createFish, 500);
        }
    }
}

// 创建捕获效果
function createCaptureEffect(x, y, color) {
    ctx.save();
    
    // 绘制网收紧效果
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerRadius = 5;
        const outerRadius = 15;
        
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * innerRadius, y + Math.sin(angle) * innerRadius);
        ctx.lineTo(x + Math.cos(angle) * outerRadius, y + Math.sin(angle) * outerRadius);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    // 绘制水花效果
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 10 + Math.random() * 10;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    ctx.restore();
}

// 游戏结束
function endGame() {
    isGameRunning = false;
    clearInterval(gameTimer);
    
    // 显示最终得分
    alert(`游戏结束！\n你的最终得分是：${score}分`);
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 重置游戏状态
    fishes = [];
    net.visible = false;
}