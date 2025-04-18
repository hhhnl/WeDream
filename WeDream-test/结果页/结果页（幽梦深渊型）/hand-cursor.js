document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素 - 缓存DOM查询以提高性能
    const videoElement = document.getElementById('webcam');
    const outputCanvas = document.getElementById('output-canvas');
    const canvasCtx = outputCanvas.getContext('2d', { alpha: false }); // 禁用alpha通道以提高性能
    const particlesCanvas = document.getElementById('particles-canvas');
    const particlesCtx = particlesCanvas.getContext('2d', { alpha: true });
    
    // 获取信封元素
    const formWrap = document.getElementById('form-wrap');
    let formWrapRect = null; // 存储信封位置和尺寸
    let isFormAnimating = false; // 防止重复触发信封动画
    
    // 使用requestAnimationFrame替代setTimeout来进行动画状态检查
    let animationCheckId = null;
    function checkAnimationStatus() {
        // 如果全局isAnimating变量存在，与我们的状态保持同步
        if (typeof window.isAnimating !== 'undefined') {
            isFormAnimating = window.isAnimating;
        }
        animationCheckId = requestAnimationFrame(checkAnimationStatus);
    }
    checkAnimationStatus();
    
    // 防抖函数用于优化窗口尺寸变化
    let resizeTimeout;
    function debounce(func, wait) {
        return function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(func, wait);
        };
    }
    
    // 在页面初始化后获取信封位置
    function updateFormWrapRect() {
        if (formWrap) {
            formWrapRect = formWrap.getBoundingClientRect();
        }
    }
    
    // 页面加载后更新信封位置
    updateFormWrapRect();
    
    // 使用防抖优化窗口尺寸变化处理
    window.addEventListener('resize', debounce(function() {
        outputCanvas.width = window.innerWidth;
        outputCanvas.height = window.innerHeight;
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
        groundY = window.innerHeight - 10; // 更新地面位置
        updateFormWrapRect();
    }, 150));
    
    // 设置canvas尺寸
    outputCanvas.width = window.innerWidth;
    outputCanvas.height = window.innerHeight;
    particlesCanvas.width = window.innerWidth;
    particlesCanvas.height = window.innerHeight;
    
    // 确保所有相关元素不会干扰点击事件
    videoElement.style.pointerEvents = 'none';
    outputCanvas.style.pointerEvents = 'none';
    particlesCanvas.style.pointerEvents = 'none';
    const instruction = document.getElementById('instruction');
    if (instruction) instruction.style.pointerEvents = 'none';
    
    // 创建一个手部星星映射对象
    const handStars = {};
    
    // 粒子系统
    const particles = [];
    const gravity = 0.15;      // 重力加速度
    const friction = 0.98;     // 摩擦力/阻尼
    const maxParticles = 300;  // 减少最大粒子数以提高性能
    let groundY = window.innerHeight - 10; // 地面位置（屏幕底部上方一点）
    const bounceCoefficient = 0.5; // 反弹系数
    
    // 添加手部跟踪平滑
    const smoothingFactor = 0.3; // 平滑因子，越小越平滑但也越滞后
    
    // 使用缓存计算以提高性能
    const distanceCache = new Map();
    
    // 计算两点间距离的工具函数
    function getDistance(x1, y1, x2, y2) {
        const key = `${x1},${y1},${x2},${y2}`;
        if (distanceCache.has(key)) {
            return distanceCache.get(key);
        }
        const dist = Math.hypot(x1 - x2, y1 - y2);
        distanceCache.set(key, dist);
        if (distanceCache.size > 100) { // 限制缓存大小
            distanceCache.clear();
        }
        return dist;
    }
    
    // 判断是否为握拳状态的函数
    function isFist(landmarks) {
        // 获取指尖和掌心的关键点
        const thumb = landmarks[4];   // 大拇指尖
        const index = landmarks[8];   // 食指尖
        const middle = landmarks[12]; // 中指尖
        const ring = landmarks[16];   // 无名指尖
        const pinky = landmarks[20];  // 小指尖
        const palm = landmarks[9];    // 手掌中心点(中指根部)
        
        // 计算手指尖到手掌中心的距离
        const thumbDist = getDistance(thumb.x, thumb.y, palm.x, palm.y);
        const indexDist = getDistance(index.x, index.y, palm.x, palm.y);
        const middleDist = getDistance(middle.x, middle.y, palm.x, palm.y);
        const ringDist = getDistance(ring.x, ring.y, palm.x, palm.y);
        const pinkyDist = getDistance(pinky.x, pinky.y, palm.x, palm.y);
        
        // 指尖到手掌中心的阈值，如果所有指尖都很靠近手掌中心，则认为是握拳状态
        const threshold = 0.15;
        return (thumbDist < threshold && indexDist < threshold && 
                middleDist < threshold && ringDist < threshold && pinkyDist < threshold);
    }
    
    // 创建一个粒子
    function createParticle(x, y, size, color) {
        const angle = Math.random() * Math.PI * 2; // 随机角度
        const speed = Math.random() * 7 + 3;       // 增加随机速度
        const rotation = Math.random() * 360;      // 随机初始旋转角度
        const rotationSpeed = (Math.random() - 0.5) * 5; // 减小旋转速度，让地面上的星星旋转更缓慢
        
        return {
            x: x,
            y: y,
            size: size * (Math.random() * 0.5 + 0.5), // 随机大小(原始大小的50%-100%)
            vx: Math.cos(angle) * speed,           // x方向速度
            vy: Math.sin(angle) * speed - 3,       // y方向速度（向上的初始速度增加）
            color: color,
            rotation: rotation,
            rotationSpeed: rotationSpeed,
            alpha: 1,
            decay: 0.005 + Math.random() * 0.01,   // 正常衰减速率，在地面上会被设为0
            gravity: gravity * (Math.random() * 0.5 + 0.8), // 随机化重力效果
            onGround: false // 标记是否在地面上
        };
    }
    
    // 更新粒子状态 - 优化循环
    function updateParticles() {
        let i = particles.length;
        
        // 使用倒序循环，避免在循环中移除元素导致的性能问题
        while (i--) {
            const p = particles[i];
            
            // 更新位置
            p.x += p.vx;
            p.y += p.vy;
            
            // 应用摩擦力
            p.vx *= friction;
            p.vy *= friction;
            
            // 应用重力
            p.vy += p.gravity;
            
            // 检测是否碰到地面
            if (p.y + p.size/2 > groundY) {
                // 设置到地面位置
                p.y = groundY - p.size/2;
                
                // 反弹效果（减小垂直速度并反向）
                if (Math.abs(p.vy) > 0.5) {
                    p.vy = -p.vy * bounceCoefficient;
                } else {
                    // 当速度很小时停止垂直运动，但保持一点水平运动
                    p.vy = 0;
                    p.vx *= 0.95; // 增加水平摩擦
                }
                
                // 粒子停止在地面时完全停止衰减并标记为在地面上
                if (Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
                    p.decay = 0; // 设为0，永不衰减
                    p.onGround = true; // 标记为在地面上
                }
            }
            
            // 更新旋转
            p.rotation += p.rotationSpeed;
            
            // 透明度衰减（只有在未停在地面的情况下才衰减）
            if (p.decay > 0) {
                p.alpha -= p.decay;
            }
            
            // 移除透明度为0的粒子，但只移除不在地面上的粒子
            if (p.alpha <= 0 && !p.onGround) {
                particles.splice(i, 1);
            }
        }
        
        // 如果粒子超过最大数量，简化移除逻辑以提高性能
        if (particles.length > maxParticles) {
            // 找出非地面粒子，从最旧的开始移除
            let nonGroundParticles = [];
            for (let i = 0; i < particles.length; i++) {
                if (!particles[i].onGround) {
                    nonGroundParticles.push(i);
                }
            }
            
            // 计算需要移除的数量
            const excessCount = particles.length - maxParticles;
            const removeCount = Math.min(excessCount, nonGroundParticles.length);
            
            // 从最旧的非地面粒子开始移除
            for (let i = 0; i < removeCount; i++) {
                particles.splice(nonGroundParticles[i] - i, 1); // 减去i是因为每次splice后索引会变
            }
        }
    }
    
    // 渲染粒子 - 使用批量绘制优化
    function renderParticles() {
        // 清空画布
        particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
        
        // 启用混合模式，使粒子叠加更亮
        particlesCtx.globalCompositeOperation = 'lighter';
        
        // 按颜色分组绘制，减少上下文切换
        const colorGroups = {};
        
        // 为每个粒子分配颜色组
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!colorGroups[p.color]) {
                colorGroups[p.color] = [];
            }
            colorGroups[p.color].push(p);
        }
        
        // 逐个颜色组绘制粒子
        for (const color in colorGroups) {
            const group = colorGroups[color];
            
            for (let i = 0; i < group.length; i++) {
                const p = group[i];
                
                particlesCtx.save();
                particlesCtx.translate(p.x, p.y);
                particlesCtx.rotate(p.rotation * Math.PI / 180);
                
                // 根据透明度设置全局alpha
                particlesCtx.globalAlpha = p.alpha;
                
                // 创建径向渐变
                const gradient = particlesCtx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                particlesCtx.fillStyle = gradient;
                particlesCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                
                particlesCtx.restore();
            }
        }
        
        // 恢复默认混合模式
        particlesCtx.globalCompositeOperation = 'source-over';
    }
    
    // 判断手掌是否打开的函数，并计算手掌大小
    function isHandOpen(landmarks) {
        // 获取指尖和掌心的关键点
        const thumb = landmarks[4];  // 大拇指
        const index = landmarks[8];  // 食指
        const middle = landmarks[12]; // 中指
        const ring = landmarks[16];   // 无名指
        const pinky = landmarks[20];  // 小指
        const wrist = landmarks[0];   // 手腕
        
        // 计算手指尖到手腕的距离
        const thumbDist = Math.hypot(thumb.x - wrist.x, thumb.y - wrist.y);
        const indexDist = Math.hypot(index.x - wrist.x, index.y - wrist.y);
        const middleDist = Math.hypot(middle.x - wrist.x, middle.y - wrist.y);
        const ringDist = Math.hypot(ring.x - wrist.x, ring.y - wrist.y);
        const pinkyDist = Math.hypot(pinky.x - wrist.x, pinky.y - wrist.y);
        
        // 计算手掌大小 - 使用手指到手腕的平均距离
        const palmSize = (thumbDist + indexDist + middleDist + ringDist + pinkyDist) / 5;
        
        // 如果所有手指都远离手腕，则认为手掌打开
        // 可以根据不同手型调整阈值
        return {
            isOpen: (thumbDist > 0.15 && indexDist > 0.15 && middleDist > 0.15 && ringDist > 0.15 && pinkyDist > 0.15),
            size: palmSize
        };
    }
    
    // 初始化MediaPipe Hands
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 2,                // 最多检测两只手
        modelComplexity: 1,            // 模型复杂度
        minDetectionConfidence: 0.5,   // 最小检测置信度
        minTrackingConfidence: 0.5     // 最小跟踪置信度
    });
    
    // 处理手部检测结果
    hands.onResults(function(results) {
        // 清空画布
        canvasCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        
        // 如果检测到手
        if (results.multiHandLandmarks) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handId = results.multiHandedness[i].index;
                
                // 获取手掌中心点
                const palmCenter = landmarks[0]; // 使用手腕点作为手掌中心
                
                // 转换到屏幕坐标，计算镜像位置（因为canvas已经镜像，这里用1-x）
                const x = (1 - palmCenter.x) * outputCanvas.width; // 水平镜像坐标
                const y = palmCenter.y * outputCanvas.height;
                
                // 检查手掌是否打开
                const handInfo = isHandOpen(landmarks);
                
                // 检查是否为握拳状态
                const fistDetected = isFist(landmarks);
                
                // 如果手还没有星星，创建一个
                if (!handStars[handId]) {
                    // 创建星星图片元素
                    const star = document.createElement('img');
                    star.src = 'img/星星.png'; // 确保有这个图片资源
                    star.className = 'hand-star';
                    star.style.pointerEvents = 'none'; // 确保星星不会干扰点击
                    document.body.appendChild(star);
                    
                    handStars[handId] = {
                        element: star,
                        rotation: 0,
                        x: x,  // 初始位置
                        y: y,
                        visible: true,
                        size: 60,       // 初始大小
                        targetSize: 60,  // 目标大小
                        fist: fistDetected,  // 记录握拳状态
                        wasFist: false       // 上一帧是否为握拳
                    };
                }
                
                // 更新星星位置（添加平滑效果）
                const star = handStars[handId];
                star.x = star.x + (x - star.x) * smoothingFactor;
                star.y = star.y + (y - star.y) * smoothingFactor;
                
                // 更新握拳状态
                star.fist = fistDetected;
                
                // 如果检测到握拳状态变化（从非握拳到握拳），创建粒子爆发效果
                if (!star.wasFist && star.fist) {
                    // 创建更多粒子
                    const particleCount = 30;  // 每次爆发产生的粒子数量
                    const particleSize = 15;   // 粒子基础大小
                    
                    // 检查手是否在信封上方
                    if (formWrapRect && !isFormAnimating) {
                        // 检查手的位置是否在信封区域内
                        if (star.x >= formWrapRect.left && 
                            star.x <= formWrapRect.right && 
                            star.y >= formWrapRect.top && 
                            star.y <= formWrapRect.bottom) {
                            
                            // 触发信封动画
                            console.log('手势触发信封动画');
                            isFormAnimating = true; // 防止重复触发
                            
                            // 创建并分发点击事件，触发信封动画
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            formWrap.dispatchEvent(clickEvent);
                            
                            // 重置触发状态
                            setTimeout(() => {
                                isFormAnimating = false;
                            }, 3500); // 动画完成后才能再次触发
                        }
                    }
                    
                    // 创建随机颜色的粒子
                    const colors = [
                        '#ffff00', // 黄色
                        '#ffffaa', // 浅黄色
                        '#ffaa00', // 橙色
                        '#ffffff', // 白色
                        '#aaaaff'  // 浅蓝色
                    ];
                    
                    // 创建粒子
                    for (let j = 0; j < particleCount; j++) {
                        // 随机选择一个颜色
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        
                        // 确保粒子总数不超过最大限制
                        if (particles.length < maxParticles) {
                            particles.push(createParticle(star.x, star.y, particleSize, color));
                        }
                    }
                }
                
                // 更新上一帧的握拳状态
                star.wasFist = star.fist;
                
                if (handInfo.isOpen) {
                    star.element.style.left = `${star.x}px`;
                    star.element.style.top = `${star.y}px`;
                    
                    // 计算基于手掌大小的星星尺寸（距离越近，星星越大）
                    // 将手掌大小映射到星星尺寸范围 (40px-120px)
                    const minPalmSize = 0.15;  // 手掌最小尺寸（远距离）
                    const maxPalmSize = 0.4;   // 手掌最大尺寸（近距离）
                    const minStarSize = 40;    // 星星最小尺寸
                    const maxStarSize = 120;   // 星星最大尺寸
                    
                    // 将手掌大小映射到星星尺寸
                    let newSize = minStarSize + ((handInfo.size - minPalmSize) / (maxPalmSize - minPalmSize)) * (maxStarSize - minStarSize);
                    
                    // 限制范围
                    newSize = Math.max(minStarSize, Math.min(maxStarSize, newSize));
                    
                    // 设置目标尺寸，添加平滑过渡
                    star.targetSize = newSize;
                    star.size = star.size + (star.targetSize - star.size) * 0.1;
                    
                    // 星星随机旋转
                    star.rotation = (star.rotation + 2) % 360;
                    
                    // 应用转换
                    star.element.style.transform = `translate(-50%, -50%) rotate(${star.rotation}deg)`;
                    star.element.style.width = `${star.size}px`;
                    star.element.style.height = `${star.size}px`;
                    
                    // 显示星星
                    if (!star.visible) {
                        star.element.style.display = 'block';
                        star.visible = true;
                    }
                } else if (handStars[handId] && handStars[handId].visible) {
                    // 如果手掌关闭，隐藏星星
                    handStars[handId].element.style.display = 'none';
                    handStars[handId].visible = false;
                }
            }
        }
        
        // 移除没有再检测到的手的星星
        for (const handId in handStars) {
            let found = false;
            for (let i = 0; i < results.multiHandedness.length; i++) {
                if (results.multiHandedness[i].index == handId) {
                    found = true;
                    break;
                }
            }
            if (!found && handStars[handId]) {
                handStars[handId].element.remove();
                delete handStars[handId];
            }
        }
        
        // 更新和渲染粒子效果
        updateParticles();
        renderParticles();
    });
    
    // 设置相机
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });
    
    // 启动相机
    camera.start()
        .then(() => {
            console.log('相机启动成功');
        })
        .catch(err => {
            console.error('相机启动失败:', err);
        });
}); 