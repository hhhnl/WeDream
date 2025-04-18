// 光标效果
document.addEventListener('DOMContentLoaded', function() {
    // 获取自定义光标元素，如果不存在则创建一个
    let cursor = document.getElementById('cursor');
    if (!cursor) {
        cursor = document.createElement('img');
        cursor.id = 'cursor';
        cursor.src = '../星星.png'; // 使用相对路径，可能需要根据实际页面位置调整
        cursor.alt = '星星光标';
        document.body.appendChild(cursor);
    }
    
    // 光标旋转效果
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
    
    // 点击事件 - 创建更多拖尾效果
    document.addEventListener('click', function(e) {
        // 点击时创建更多拖尾效果
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                createTrailEffect(
                    e.clientX + (Math.random() - 0.5) * 40, 
                    e.clientY + (Math.random() - 0.5) * 40
                );
            }, i * 50);
        }
    });
}); 