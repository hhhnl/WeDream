const canvas = document.getElementById("space");
const c = canvas.getContext("2d");
const flowerCanvas = document.getElementById("flower-canvas");
const flowerCtx = flowerCanvas.getContext("2d");
const raf = window.requestAnimationFrame;

// 配置参数
const cfg = {
    numStars: 10000,  // 星星数量
    focalLength: canvas.width * 2,  // 焦距，影响3D效果
    mouseInfluence: 0.2,   // 鼠标影响系数
    speed: 1, // 移动速度
    maxStarSize: 10,   // 星星最大尺寸，从5放大到10
    fadeStartZ: 200,  // 开始淡出的距离
    fadeEndZ: 100 // 完全消失的距离
};

let stars = [], cx, cy, mx = 0, my = 0;

// 花朵效果相关变量
let flowers = [];
const maxFlowers = 30;
let isSucking = true; // 默认是吸引模式
const colors = [
    [255, 182, 193], // 浅粉色
    [255, 255, 255], // 白色
    [135, 206, 250]  // 浅蓝色
];

// 初始化星星数组
function init() {
    cx = canvas.width / 2;
    cy = canvas.height / 2;
    stars = Array.from({ length: cfg.numStars }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        o: '0.' + Math.floor(Math.random() * 99) + 1,  // 随机透明度
        px: 0,  // 上一帧x坐标
        py: 0,  // 上一帧y坐标
        pz: 0   // 上一帧z坐标
    }));
    
    // 添加一些初始花朵
    addInitialFlowers(5);
}

// 初始化一些花朵
function addInitialFlowers(count) {
    for (let i = 0; i < count; i++) {
        addFlower();
    }
}

// 添加一朵新花
function addFlower() {
    if (flowers.length >= maxFlowers) return;
    
    const colorIndex1 = Math.floor(Math.random() * colors.length);
    const colorIndex2 = Math.floor(Math.random() * colors.length);
    
    // 随机选择花瓣形状类型 (0-椭圆形, 1-心形)
    const petalType = Math.random() > 0.7 ? 1 : 0; 
    
    // 为每个花瓣预先生成随机变化
    const petalVariations = [];
    const numPetals = Math.floor(Math.random() * 4) + 5; // 随机花瓣数量 (5-8)
    
    for (let i = 0; i < numPetals; i++) {
        const randomVariation = 0.1; // 最大10%的变化
        petalVariations.push({
            length: 1 + (Math.random() * randomVariation * 2 - randomVariation),
            width: 1 + (Math.random() * randomVariation * 2 - randomVariation),
            height: 1 + (Math.random() * randomVariation * 2 - randomVariation)
        });
    }
    
    flowers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        targetX: Math.random() * canvas.width, // 目标X位置，初始和当前位置相同
        targetY: Math.random() * canvas.height, // 目标Y位置，初始和当前位置相同
        w: Math.random() * 30 + 30, // 花的大小，30-60
        w1: 0, // 花瓣大小，从0开始
        w2: 0, // 花蕊大小，从0开始
        ew1: Math.random() * 30 + 30, // 目标花瓣大小
        ew2: (Math.random() * 0.2 + 0.1) * (Math.random() * 20 + 20), // 目标花蕊大小，缩小范围
        ptn: Math.floor(Math.random() * 22) + 8, // 花瓣图案
        ewh: Math.random() * 0.2 + 0.15, // 花瓣宽度，更大范围随机 (0.15-0.35)
        ehh: Math.random() * 0.07 + 0.03, // 花瓣高度，更大范围随机 (0.03-0.10)
        esh: Math.random() * 0.15 + 0.2, // 花瓣长度，更大范围随机 (0.2-0.35)
        petalType: petalType, // 花瓣形状类型
        petalVariations: petalVariations, // 每个花瓣的随机变化
        numPetals: numPetals,
        t: 0, // 当前动画时间
        t1: 20, // 动画时间1
        t2: 50, // 动画时间2 (t1 + 30)
        t3: 70, // 动画时间3 (t2 + 20)
        ang: Math.random() * 10, // 角度
        col1: colors[colorIndex1], // 花瓣颜色
        col2: colors[colorIndex2], // 花蕊颜色
        xs: (Math.random() * 2 - 1) * 0.5, // x方向速度
        ys: -0.2, // y方向速度（上升）
        as: (Math.random() * 2 - 1) * 0.02, // 旋转速度
        isDead: false // 是否死亡
    });
}

// 使用透视投影公式: 屏幕 = (世界坐标 - 中心) * (焦距 / z) + 中心
function pos(x, y, z) {
    const scale = cfg.focalLength / z;
    return {
        x: (x - cx) * scale + cx,
        y: (y - cy) * scale + cy,
        size: Math.min(cfg.maxStarSize, scale)  // 限制星星大小
    };
}

// 计算星星透明度，实现平滑淡出效果
function alpha(z) {
    if (z <= cfg.fadeStartZ) {
        // 线性插值计算透明度
        return Math.max(0, Math.min(1, (z - cfg.fadeEndZ) / (cfg.fadeStartZ - cfg.fadeEndZ)));
    }
    return 1;
}

// 缓动函数
function easeInOutQuart(x) {
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

// 线性插值
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// 更新星星位置
function move() {
    stars.forEach(star => {
        // 保存当前位置用于绘制拖尾
        [star.px, star.py, star.pz] = [star.x, star.y, star.z];
        // 向观察者移动
        star.z -= cfg.speed;
        // 根据鼠标位置调整星星移动
        star.x += mx * cfg.mouseInfluence / star.z;
        star.y += my * cfg.mouseInfluence / star.z;
        // 重置飞出视野的星星
        if (star.z <= cfg.fadeEndZ) {
            star.z = canvas.width;
            star.x = Math.random() * canvas.width;
            star.y = Math.random() * canvas.height;
            [star.px, star.py, star.pz] = [star.x, star.y, star.z];
        }
    });
    
    // 更新花朵位置和动画
    updateFlowers();
}

// 更新所有花朵
function updateFlowers() {
    // 每隔一段时间添加新花朵
    if (frameCount % 15 === 0 && flowers.length < maxFlowers) {
        addFlower();
    }
    
    // 更新每朵花
    for (let i = flowers.length - 1; i >= 0; i--) {
        const flower = flowers[i];
        
        // 处理生长动画
        if (0 < flower.t && flower.t < flower.t2) {
            const n = (flower.t - 0) / (flower.t2 - 1);
            flower.w2 = lerp(0, flower.ew2, easeInOutQuart(n));
        }
        if (flower.t1 < flower.t && flower.t < flower.t3) {
            const n = (flower.t - flower.t1) / (flower.t3 - flower.t1 - 1);
            flower.w1 = lerp(0, flower.ew1, easeInOutQuart(n));
        }
        
        // 根据吸引/散开模式更新位置
        if (isSucking) {
            // 吸引模式 - 设置目标位置为鼠标位置
            flower.targetX = mx + cx;
            flower.targetY = my + cy;
        } else {
            // 散开模式 - 更新目标位置
            flower.targetX += flower.xs;
            flower.targetY += flower.ys;
            flower.ys += 0.01; // 减小重力效果
        }
        
        // 平滑过渡到目标位置 (LERP)
        flower.x = lerp(flower.x, flower.targetX, 0.03);
        flower.y = lerp(flower.y, flower.targetY, 0.03);
        
        // 减缓旋转速度
        flower.ang += flower.as * 0.5; // 减慢旋转速度
        flower.t++;
        
        // 检查是否超出画布
        if (flower.y > canvas.height + flower.w || 
            flower.y < -flower.w || 
            flower.x > canvas.width + flower.w || 
            flower.x < -flower.w) {
            flower.isDead = true;
        }
        
        // 处理碰撞
        for (let j = 0; j < flowers.length; j++) {
            if (i !== j && !flower.isDead) {
                handleFlowerCollision(flower, flowers[j]);
            }
        }
    }
    
    // 移除死亡的花朵
    flowers = flowers.filter(flower => !flower.isDead);
}

// 散开花朵的效果
function scatterFlowers() {
    for (const flower of flowers) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        
        // 设置速度和初始目标位置
        flower.xs = Math.cos(angle) * speed;
        flower.ys = Math.sin(angle) * speed;
        
        // 立即更新目标位置，向散开方向移动一小段距离
        flower.targetX = flower.x + flower.xs * 5;
        flower.targetY = flower.y + flower.ys * 5;
    }
}

// 处理花朵之间的碰撞
function handleFlowerCollision(flower1, flower2) {
    const dx = flower1.x - flower2.x;
    const dy = flower1.y - flower2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (flower1.w + flower2.w) / 2;
    
    if (distance < minDistance) {
        const overlap = (minDistance - distance) / 2;
        
        if (distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;
            
            flower1.x += nx * overlap * 0.5;
            flower1.y += ny * overlap * 0.5;
            
            flower2.x -= nx * overlap * 0.5;
            flower2.y -= ny * overlap * 0.5;
        }
    }
}

// 渲染星星和拖尾
function draw() {
    // 自适应画布大小
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        flowerCanvas.width = window.innerWidth;
        flowerCanvas.height = window.innerHeight;
        init();
    }
    // 清空画布，绘制黑色背景
    c.fillStyle = "rgb(0,10,20)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制每颗星星
    stars.forEach(star => {
        const curr = pos(star.x, star.y, star.z);
        const a = alpha(star.z);
        // 高速时绘制拖尾
        if (cfg.speed > 10) {
            const prev = pos(star.px, star.py, star.pz);
            c.beginPath();
            c.moveTo(prev.x, prev.y);
            c.lineTo(curr.x, curr.y);
            c.strokeStyle = `rgba(255, 255, 255, ${0.3 * a})`;
            c.lineWidth = curr.size;
            c.stroke();
        }
        // 绘制星星
        c.beginPath();
        c.arc(curr.x, curr.y, curr.size, 0, Math.PI * 2);
        c.fillStyle = `rgba(255, 255, 255, ${parseFloat(star.o) * a})`;
        c.fill();
    });
    
    // 清空花朵画布
    flowerCtx.clearRect(0, 0, flowerCanvas.width, flowerCanvas.height);
    
    // 绘制花朵到单独的canvas
    drawFlowers();
}

// 绘制所有花朵
function drawFlowers() {
    for (const flower of flowers) {
        flowerCtx.save();
        flowerCtx.translate(flower.x, flower.y);
        flowerCtx.rotate(flower.ang);
        
        // 绘制花瓣
        const col1 = flower.col1;
        flowerCtx.fillStyle = `rgba(${col1[0]}, ${col1[1]}, ${col1[2]}, 0.85)`;
        drawFlowerPetals(flower);
        
        // 绘制花蕊
        const col2 = flower.col2;
        flowerCtx.fillStyle = `rgba(${col2[0]}, ${col2[1]}, ${col2[2]}, 0.9)`;
        flowerCtx.beginPath();
        flowerCtx.arc(0, 0, flower.w2 / 2, 0, Math.PI * 2);
        flowerCtx.fill();
        
        flowerCtx.restore();
    }
}

// 绘制花瓣
function drawFlowerPetals(flower) {
    const baseLength = flower.w1 * flower.esh;
    const baseWidth = flower.w1 * flower.ewh;
    const baseHeight = flower.w1 * flower.ehh;
    const numPetals = flower.numPetals;
    
    for (let i = 0; i < numPetals; i++) {
        // 使用预先生成的随机变化，而不是每帧生成新的
        const variation = flower.petalVariations[i];
        const petalLength = baseLength * variation.length;
        const petalWidth = baseWidth * variation.width;
        const petalHeight = baseHeight * variation.height;
        
        flowerCtx.save();
        flowerCtx.rotate((Math.PI * 2 / numPetals) * i);
        
        // 根据花瓣类型绘制不同形状
        if (flower.petalType === 0) {
            // 椭圆形花瓣 (默认)
            flowerCtx.beginPath();
            flowerCtx.ellipse(petalLength, 0, petalWidth / 2, petalHeight / 2, 0, 0, Math.PI * 2);
            flowerCtx.fill();
        } else if (flower.petalType === 1) {
            // 更细长的花瓣
            flowerCtx.beginPath();
            
            // 使用贝塞尔曲线创建一个细长形状
            const tipX = petalLength * 1.2;
            const controlX = petalLength * 0.8;
            const widthY = petalWidth / 2.5;
            
            flowerCtx.moveTo(0, 0);
            flowerCtx.quadraticCurveTo(controlX, -widthY, tipX, 0);
            flowerCtx.quadraticCurveTo(controlX, widthY, 0, 0);
            flowerCtx.fill();
        }
        
        flowerCtx.restore();
    }
}

// 动画循环
let frameCount = 0;
function loop() {
    raf(loop);
    move();
    draw();
    frameCount++;
}

// 图片滑动相关变量
const image2 = document.querySelector('.overlay-image');
const image3 = document.querySelector('.second-overlay-image');
let extraScrollAmount = 0;
const MAX_EXTRA_SCROLL = 3000; // 达到这个额外滚动量时图片完全移开

// 确保DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 获取自定义光标元素
    const cursor = document.getElementById('cursor');
    
    // 为光标添加旋转属性
    let cursorRotation = 0;
    const cursorRotationSpeed = 0.5; // 光标旋转速度，从2降低到0.5，使旋转更慢
    
    // 更新光标旋转的函数
    function updateCursorRotation() {
        cursorRotation = (cursorRotation + cursorRotationSpeed) % 360;
        cursor.style.transform = `translate(-50%, -50%) rotate(${cursorRotation}deg)`;
        requestAnimationFrame(updateCursorRotation);
    }
    
    // 启动光标旋转
    updateCursorRotation();
    
    // 鼠标移动事件处理
    document.addEventListener('mousemove', e => {
        // 更新星空动画的鼠标位置
        mx = e.clientX - cx;
        my = e.clientY - cy;
        
        // 更新自定义光标位置
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        
        // 创建拖尾效果 - 仅有20%的概率创建，避免过多
        if (Math.random() > 0.8) {
            createTrailEffect(e.clientX, e.clientY);
        }
    });
    
    // 创建光标拖尾效果
    function createTrailEffect(x, y) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        
        // 随机旋转和小小的随机位置偏移，使拖尾看起来更自然
        const randomAngle = Math.random() * 360;
        const randomOffsetX = (Math.random() - 0.5) * 15;
        const randomOffsetY = (Math.random() - 0.5) * 15;
        
        // 设置位置和随机旋转
        trail.style.left = `${x + randomOffsetX}px`;
        trail.style.top = `${y + randomOffsetY}px`;
        trail.style.transform = `translate(-50%, -50%) rotate(${randomAngle}deg) scale(${0.3 + Math.random() * 0.4})`;
        
        document.body.appendChild(trail);
        
        // 淡出动画完成后移除元素
        setTimeout(function() {
            if (trail && trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 800);
    }
    
    // 鼠标点击事件 - 切换花朵吸引/散开效果
    document.addEventListener('click', () => {
        isSucking = !isSucking;
        if (!isSucking) {
            scatterFlowers();
        }
        
        // 点击时创建更多拖尾效果
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                createTrailEffect(
                    mx + cx + (Math.random() - 0.5) * 40, 
                    my + cy + (Math.random() - 0.5) * 40
                );
            }, i * 50);
        }
    });
    
    // 直接使用滚轮事件控制图片移动
    document.addEventListener('wheel', (e) => {
        // 检查是否已经滚动到页面底部
        const isAtBottom = (window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 10;
        
        // 只有在滚动到底部后继续向下滚动，才触发图片移动
        if (isAtBottom && e.deltaY > 0) {
            // 减小每次滚动的累积量，降低灵敏度
            extraScrollAmount = Math.min(MAX_EXTRA_SCROLL, extraScrollAmount + (e.deltaY * 0.1));
            
            // 计算移动比例 (0-1)
            const moveRatio = extraScrollAmount / MAX_EXTRA_SCROLL;
            
            // 为图片添加过渡效果 - 平滑过渡
            image2.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
            image3.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
            
            // 根据滚动比例移动图片
            image2.style.transform = `translateX(${-120 * moveRatio}%)`;
            image2.style.opacity = Math.max(0.2, 1 - (0.8 * moveRatio));
            
            image3.style.transform = `translateX(${120 * moveRatio}%)`;
            image3.style.opacity = Math.max(0.2, 1 - (0.8 * moveRatio));
            
            // 当图片移动超过一定距离时，准备切换页面
            if (moveRatio > 0.2 && !window.redirectTriggered) {
                window.redirectTriggered = true; // 防止多次触发
                
                // 创建一个渐变覆盖层
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgb(47, 54, 180)';
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 1.5s ease-in';
                overlay.style.zIndex = '10000';
                document.body.appendChild(overlay);
                
                // 淡入黑色覆盖层
                setTimeout(() => {
                    overlay.style.opacity = '1';
                    
                    // 在淡入完成后跳转到新页面
                    setTimeout(() => {
                        window.location.href = 'WeDream-catalog/index.html'; // 跳转到新页面
                    }, 1500);
                }, 100);
            }
        }
        
        // 向上滚动时，只有在已经有额外滚动量的情况下才调整图片位置
        if (e.deltaY < 0 && extraScrollAmount > 0) {
            // 减小每次滚动的减少量，降低灵敏度
            extraScrollAmount = Math.max(0, extraScrollAmount - (Math.abs(e.deltaY) * 0.1));
            
            // 计算移动比例 (0-1)
            const moveRatio = extraScrollAmount / MAX_EXTRA_SCROLL;
            
            // 根据滚动比例移动图片
            image2.style.transform = `translateX(${-120 * moveRatio}%)`;
            image2.style.opacity = Math.max(0.2, 1 - (0.8 * moveRatio));
            
            image3.style.transform = `translateX(${120 * moveRatio}%)`;
            image3.style.opacity = Math.max(0.2, 1 - (0.8 * moveRatio));
            
            // 如果用户向上滚动使图片回到初始位置，取消跳转标记
            if (moveRatio < 0.5 && window.redirectTriggered) {
                window.redirectTriggered = false;
                // 移除可能已存在的覆盖层
                const existingOverlay = document.querySelector('div[style*="z-index: 10000"]');
                if (existingOverlay) {
                    existingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        existingOverlay.remove();
                    }, 1000);
                }
            }
        }
    });
    
    // 启动动画
    init();
    loop();
});

// 移除视差效果
// window.addEventListener('scroll', () => {
//     const scrollPosition = window.scrollY;
//     document.querySelector('.base-image').style.transform = `translateY(${scrollPosition * 0.05}px)`;
//     document.querySelector('.overlay-image').style.transform = `translateY(${scrollPosition * 0.1}px)`;
//     document.querySelector('.second-overlay-image').style.transform = `translateY(${scrollPosition * 0.15}px)`;
//     document.querySelector('.third-overlay-image').style.transform = `translateY(${scrollPosition * 0.2}px)`;
//     document.querySelector('.fourth-overlay-image').style.transform = `translateY(${scrollPosition * 0.25}px)`;
//     document.querySelector('.fifth-overlay-image').style.transform = `translateY(${scrollPosition * 0.3}px)`;
// }); 
// }); 
const playButton = document.getElementById('playButton');
const music = document.getElementById('music');
let hasInteracted = false;

function playMusicOnInteraction() {
    if (!hasInteracted) {
        music.play().catch(() => {
            // 播放失败，可能是浏览器策略限制
        });
        hasInteracted = true;
        document.removeEventListener('click', playMusicOnInteraction);
        document.removeEventListener('touchstart', playMusicOnInteraction);
    }
}

document.addEventListener('click', playMusicOnInteraction);
document.addEventListener('touchstart', playMusicOnInteraction);

playButton.addEventListener('click', function () {
    if (music.paused) {
        music.play();
       
    } else {
        music.pause();
      
    }
});