document.addEventListener('DOMContentLoaded', () => {
    // 预加载图片以提高性能
    const cursorImage = new Image();
    cursorImage.onload = () => {
        // 创建光标元素
        const cursor = document.createElement('img');
        cursor.id = 'cursor';
        cursor.src = cursorImage.src;
        cursor.style.willChange = 'transform'; // 提示浏览器这个元素将会频繁变化
        document.body.appendChild(cursor);
        
        // 使用 requestAnimationFrame 提高性能
        let cursorX = 0;
        let cursorY = 0;
        
        // 获取光标元素，避免重复DOM查询
        const updateCursorPosition = (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
        };
        
        // 使用 passive: true 提高事件监听性能
        document.addEventListener('mousemove', updateCursorPosition, { passive: true });
        
        // 使用 RAF 更新光标位置，减少布局重排
        function render() {
            cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
            requestAnimationFrame(render);
        }
        
        requestAnimationFrame(render);
    };
    cursorImage.src = '../../星星.png';
}); 