// 鼠标跟踪文字效果
document.addEventListener('DOMContentLoaded', function() {
    // 创建canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas为全屏并添加到DOM
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none'; // 确保不会干扰其他交互
    canvas.style.zIndex = '-1'; // 将z-index改为负值，使其位于页面底层
    document.body.appendChild(canvas);
    
    // 预设文本
    const text = "DreamshavefascinatedhumanitysincetimeimmemorialTheyarethesequencesofimagesideasemotionsandsensationsthatoccurinvoluntarilyinthemindduringcertainstagesofsleepEveryonedreamsalthoughsomemayremembertheirdreamsmorevividlythanothers.";
    let textIndex = 0;
    
    // 字体大小范围
    const minFontSize = 10; // 调整为10px
    const maxFontSize = 128; // 调整为128px
    // 基础字间距系数 - 随字体大小缩放
    const spacingFactor = 0.8; // 字体大小的0.8倍作为间距
    
    // 存储所有已绘制的字符点
    const points = [];
    
    // 鼠标当前位置和历史位置
    let mouseX = 0, mouseY = 0;
    let lastDrawX = 0, lastDrawY = 0;
    let lastMouseX = 0, lastMouseY = 0;
    let isMouseMoving = false;
    let lastMouseMoveTime = 0;
    
    // 鼠标速度相关
    let mouseSpeed = 0;
    const speedHistory = [];
    const maxSpeedHistory = 5;
    const maxSpeed = 60; // 降低最大速度参考值，使字体对速度变化更敏感
    
    // 监听鼠标移动
    document.addEventListener('mousemove', function(e) {
        // 计算鼠标速度
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 更新速度历史
        speedHistory.push(dist);
        if (speedHistory.length > maxSpeedHistory) {
            speedHistory.shift();
        }
        
        // 计算平均速度
        mouseSpeed = speedHistory.reduce((sum, speed) => sum + speed, 0) / speedHistory.length;
        
        // 更新鼠标位置
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        isMouseMoving = true;
        lastMouseMoveTime = Date.now();
    });
    
    // 清除画布的键盘事件
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            points.length = 0; // 清空点数组
            textIndex = 0; // 重置文本索引
        }
    });
    
    // 窗口大小改变时调整canvas大小
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // 在调整大小后重新绘制所有点
        redrawAllPoints();
    });
    
    // 重新绘制所有保存的点
    function redrawAllPoints() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            drawCharAtPoint(point.x, point.y, point.angle, point.char, point.fontSize);
        }
    }
    
    // 在指定点绘制字符
    function drawCharAtPoint(x, y, angle, char, fontSize) {
        ctx.save();
        ctx.font = `${fontSize}px "Modern No. 20", Arial`;
        ctx.fillStyle = `rgba(255, 255, 255, 0.4)`; // 将透明度降低到0.4
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // 绘制字符
        ctx.fillText(char, 0, 0);
        
        ctx.restore();
    }
    
    // 计算两点之间的距离
    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    
    // 根据速度计算字体大小
    function calculateFontSize(speed) {
        // 使用非线性映射来增强对速度的响应
        // 使用平方关系，让快速移动时字体大小增加更明显
        const speedRatio = Math.min(speed / maxSpeed, 1);
        const enhancedRatio = speedRatio * speedRatio; // 平方关系使低速区间变化小，高速区间变化大
        
        // 应用指数增强效果，让较小的速度变化也能产生明显的字体大小差异
        return minFontSize + enhancedRatio * (maxFontSize - minFontSize);
    }
    
    // 获取当前字体大小下应该使用的字间距
    function getLetterSpacing(fontSize) {
        return fontSize * spacingFactor; // 字间距随字体大小成比例增长
    }
    
    // 计算沿线分布新字符点的位置
    function calculateNewPoints() {
        if (!isMouseMoving) return;
        
        // 获取当前鼠标位置与上次绘制位置
        const currentX = mouseX;
        const currentY = mouseY;
        
        if (points.length === 0) {
            // 第一个点
            const char = text.charAt(textIndex);
            textIndex = (textIndex + 1) % text.length;
            
            // 根据速度调整字体大小
            const fontSize = calculateFontSize(mouseSpeed);
            
            // 因为是第一个点，角度设为0
            const angle = 0;
            
            // 绘制字符
            drawCharAtPoint(currentX, currentY, angle, char, fontSize);
            
            // 保存点信息
            points.push({
                x: currentX,
                y: currentY,
                angle: angle,
                char: char,
                fontSize: fontSize
            });
            
            lastDrawX = currentX;
            lastDrawY = currentY;
            return;
        }
        
        // 计算当前字体大小 (根据速度调整)
        const fontSize = calculateFontSize(mouseSpeed);
        // 根据字体大小计算应该使用的字间距
        const letterSpacing = getLetterSpacing(fontSize);
        
        // 计算距离和方向
        const dist = distance(lastDrawX, lastDrawY, currentX, currentY);
        
        if (dist < letterSpacing) return; // 距离不够，还不需要绘制新字符
        
        // 计算新点的方向
        const dx = currentX - lastDrawX;
        const dy = currentY - lastDrawY;
        const angle = Math.atan2(dy, dx);
        
        // 计算应该沿线分布多少个新点
        const numNewPoints = Math.floor(dist / letterSpacing);
        
        for (let i = 0; i < numNewPoints; i++) {
            // 计算新点的位置，确保均匀分布
            const t = (i + 1) / (numNewPoints + 1);
            const newX = lastDrawX + dx * t;
            const newY = lastDrawY + dy * t;
            
            // 获取当前字符
            const char = text.charAt(textIndex);
            textIndex = (textIndex + 1) % text.length;
            
            // 绘制字符
            drawCharAtPoint(newX, newY, angle, char, fontSize);
            
            // 保存新点
            points.push({
                x: newX,
                y: newY,
                angle: angle,
                char: char,
                fontSize: fontSize
            });
        }
        
        // 更新最后绘制位置为最后绘制的字符位置，而不是当前鼠标位置
        // 这可以确保字符之间的距离一致
        if (numNewPoints > 0) {
            const t = numNewPoints / (numNewPoints + 1);
            lastDrawX = lastDrawX + dx * t;
            lastDrawY = lastDrawY + dy * t;
        } else {
            // 如果没有新点，则更新为当前鼠标位置
            lastDrawX = currentX;
            lastDrawY = currentY;
        }
        
        // 如果鼠标停止移动一段时间，添加最后一个点
        if (Date.now() - lastMouseMoveTime > 100) {
            isMouseMoving = false;
            
            // 如果最后绘制位置和当前鼠标位置间距足够
            if (distance(lastDrawX, lastDrawY, currentX, currentY) >= letterSpacing) {
                // 获取当前字符
                const char = text.charAt(textIndex);
                textIndex = (textIndex + 1) % text.length;
                
                // 绘制字符
                drawCharAtPoint(currentX, currentY, angle, char, fontSize);
                
                // 保存新点
                points.push({
                    x: currentX,
                    y: currentY,
                    angle: angle,
                    char: char,
                    fontSize: fontSize
                });
            }
        }
    }
    
    // 渲染循环
    function draw() {
        calculateNewPoints();
        requestAnimationFrame(draw);
    }
    
    // 启动动画
    draw();
}); 
