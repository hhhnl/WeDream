document.addEventListener('DOMContentLoaded', () => {
    // 创建光标元素
    const cursor = document.createElement('img');
    cursor.id = 'cursor';
    cursor.src = '../../星星.png';
    document.body.appendChild(cursor);

    // 跟踪鼠标位置
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    const smoothFactor = 0.15; // 平滑跟随系数

    // 更新光标位置
    function updateCursorPosition() {
        // 平滑跟随效果
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        cursorX += dx * smoothFactor;
        cursorY += dy * smoothFactor;
        
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        
        requestAnimationFrame(updateCursorPosition);
    }

    // 监听鼠标移动
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // 创建拖尾效果
        if (Math.random() < 0.3) { // 控制拖尾密度
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            trail.style.left = `${e.clientX}px`;
            trail.style.top = `${e.clientY}px`;
            document.body.appendChild(trail);
            
            // 移除拖尾元素
            setTimeout(() => {
                trail.remove();
            }, 800);
        }
    });

    // 启动动画循环
    updateCursorPosition();
}); 