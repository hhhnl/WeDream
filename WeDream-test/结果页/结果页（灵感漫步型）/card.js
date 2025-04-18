document.addEventListener('DOMContentLoaded', function() {
  // 获取所有卡片和容器
  const cards = document.querySelectorAll('.card-container .card');
  const container = document.querySelector('.card-container');
  
  // 防止任何选择和输入光标
  preventTextSelection();
  
  // 存储背景颜色
  const originalBgColor = '#222'; // 使用固定颜色
  
  // 初始状态设置 - 确保卡片重叠并设置正确的叠放顺序
  let isExpanded = false;
  
  // 添加一个变量来跟踪中间卡片是否已被点击
  let middleCardClicked = false;
  
  // 初始化卡片叠放顺序和透明度，移除所有修饰
  arrangeInitialCardOrder();
  removeAllDecorations();
  
  // 为容器添加点击事件
  container.addEventListener('click', function(event) {
    // 只有当点击的是容器本身而不是卡片时才触发
    if (event.target === container || event.target === container.querySelector('.background')) {
      if (!isExpanded) {
        // 展开卡片
        container.classList.add('expanded');
        isExpanded = true;
        
        // 为所有卡片添加硬件加速
        cards.forEach(card => {
          // 先隐藏再显示，创造渐变效果
          card.style.opacity = "0.5";
          card.style.willChange = "transform, opacity";
          if (!card.style.transform.includes('translateZ')) {
            card.style.transform = `${card.style.transform || ''} translateZ(0)`;
          }
          
          requestAnimationFrame(() => {
            card.style.opacity = "1";
          });
        });
        
        // 确保展开后的z-index仍然正确
        requestAnimationFrame(() => {
          arrangeInitialCardOrder();
          removeAllDecorations();
        });
      } else {
        // 如果点击容器背景，取消所有卡片的选中状态
        cards.forEach(c => {
          if (c.classList.contains('active')) {
            c.classList.remove('active');
            
            // 恢复到展开状态的位置
            const iValue = getComputedStyle(c).getPropertyValue('--i').trim();
            // 首先清除行内样式中的transform和important声明
            c.style.cssText = c.style.cssText.replace(/transform:[^;]*!important/g, '');
            // 然后应用展开状态的位置和过渡效果
            c.style.transition = "all 0.5s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.3s ease";
            c.style.willChange = "transform, opacity";
            
            // 对于中间卡片，如果已被点击过，保持下移和缩小状态
            if (iValue === '0' && middleCardClicked) {
              c.style.transform = `translateZ(0) rotate(0deg) translate(0px, 120px) scale(0.95)`;
              
              // 图片也保持1.3倍
              const img = c.querySelector('img');
              if (img) {
                img.style.transform = "scale(1.3) translateZ(0)";
                img.style.willChange = "transform";
              }
            } else {
              // 其他卡片恢复到正常展开位置
              c.style.transform = `translateZ(0) rotate(${iValue * -5}deg) translate(${iValue * 250}px, 80px)`;
              
              // 恢复图片大小
              const img = c.querySelector('img');
              if (img) {
                if (iValue === '0' && !middleCardClicked) {
                  // 中间卡片保持1.3倍
                  img.style.transform = "scale(1.3) translateZ(0)";
                } else {
                  // 其他卡片恢复正常大小
                  img.style.transform = "scale(1) translateZ(0)";
                }
                img.style.willChange = "transform";
              }
            }
          } else {
            // 即使没有激活的卡片，也需要确保中间卡片保持正确状态
            const iValue = getComputedStyle(c).getPropertyValue('--i').trim();
            if (iValue === '0' && middleCardClicked) {
              // 清除可能存在的transform样式
              c.style.cssText = c.style.cssText.replace(/transform:[^;]*!important/g, '');
              c.style.transition = "all 0.5s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.3s ease";
              c.style.transform = `translateZ(0) rotate(0deg) translate(0px, 120px) scale(0.95)`;
              
              // 图片也保持1.3倍
              const img = c.querySelector('img');
              if (img) {
                img.style.transform = "scale(1.3) translateZ(0)";
                img.style.willChange = "transform";
              }
            }
          }
          
          // 添加渐变效果
          applyFadeEffect(c);
          
          // 重置所有卡片z-index到初始值，但保持中间卡片在适当位置
          if (getComputedStyle(c).getPropertyValue('--i').trim() === '0' && middleCardClicked) {
            // 为中间卡片设置合适的z-index
            c.style.zIndex = 5;
          } else {
            resetCardZIndex(c);
          }
        });
        
        // 移除所有修饰
        removeAllDecorations();
        
        // 恢复原始背景色
        container.classList.remove('change-bg');
        document.documentElement.style.setProperty('--current-color', originalBgColor);
      }
    }
  });
  
  // 为每张卡片添加点击事件监听
  cards.forEach(card => {
    // 点击卡片时
    card.addEventListener('click', function(event) {
      // 阻止事件冒泡，防止触发容器的点击事件
      event.stopPropagation();
      
      // 确保硬件加速
      card.style.transform = card.style.transform || 'translateZ(0)';
      
      // 先确保容器已展开
      if (!isExpanded) {
        container.classList.add('expanded');
        isExpanded = true;
        
        // 添加渐变效果
        cards.forEach(c => {
          // 确保硬件加速
          c.style.transform = c.style.transform || 'translateZ(0)';
          // 先隐藏再显示，创造渐变效果
          c.style.opacity = "0.5";
          requestAnimationFrame(() => {
            c.style.opacity = "1";
          });
        });
        
        // 确保展开后的z-index仍然正确
        requestAnimationFrame(() => {
          arrangeInitialCardOrder();
        });
      }
      
      // 检查卡片是否已经处于激活状态
      if (card.classList.contains('active')) {
        // 如果已激活，则取消激活
        card.classList.remove('active');
        // 恢复原始背景色
        container.classList.remove('change-bg');
        document.documentElement.style.setProperty('--current-color', originalBgColor);
        
        // 添加渐变效果
        applyFadeEffect(card);
        
        // 恢复到展开状态的位置
        const iValue = getComputedStyle(card).getPropertyValue('--i').trim();
        
        // 如果是中间卡片且已被点击过，保持下移和缩小状态
        if (iValue === '0' && middleCardClicked) {
          card.style.transform = `translateZ(0) rotate(0deg) translate(0px, 120px) scale(0.95)`;
          
          // 图片也保持1.3倍
          const img = card.querySelector('img');
          if (img) {
            img.style.transform = "scale(1.3) translateZ(0)";
          }
        } else {
          // 其他卡片恢复正常展开位置
          card.style.transform = `translateZ(0) rotate(${iValue * -5}deg) translate(${iValue * 250}px, 80px)`;
          
          // 恢复图片大小
          const img = card.querySelector('img');
          if (img) {
            if (iValue === '0' && !middleCardClicked) {
              // 中间卡片保持1.3倍
              img.style.transform = "scale(1.3) translateZ(0)";
            } else {
              // 其他卡片恢复正常大小
              img.style.transform = "scale(1) translateZ(0)";
            }
          }
        }
        
        // 重置这张卡片的z-index到初始值
        resetCardZIndex(card);
        
        // 移除所有修饰
        removeAllDecorations();
      } else {
        // 获取卡片的自定义颜色变量
        const cardColor = getComputedStyle(card).getPropertyValue('--clr').trim();
        // 设置当前颜色变量
        document.documentElement.style.setProperty('--current-color', cardColor);
        // 添加背景变化类
        container.classList.add('change-bg');
        
        // 获取当前卡片的i值
        const currentIValue = getComputedStyle(card).getPropertyValue('--i').trim();
        
        // 如果点击的是中间卡片，标记它已被点击
        if (currentIValue === '0') {
          middleCardClicked = true;
        }
        
        // 处理卡片的放大效果 - 移除其他卡片的选中状态，添加当前卡片的选中状态
        cards.forEach(c => {
          if (c !== card) {
            c.classList.remove('active');
            
            // 获取这张卡片的i值
            const iValue = getComputedStyle(c).getPropertyValue('--i').trim();
            
            // 清除可能存在的transform样式（特别是带有!important的）
            c.style.cssText = c.style.cssText.replace(/transform:[^;]*!important/g, '');
            
            // 如果是中间卡片且已被点击过，保持下移和缩小状态
            if (iValue === '0' && middleCardClicked) {
              c.style.transform = `translateZ(0) rotate(0deg) translate(0px, 120px) scale(0.95)`;
              
              // 图片也保持1.3倍
              const img = c.querySelector('img');
              if (img) {
                img.style.transform = "scale(1.3) translateZ(0)";
              }
            } else {
              // 其他卡片恢复到展开状态的位置
              c.style.transform = `translateZ(0) rotate(${iValue * -5}deg) translate(${iValue * 250}px, 80px)`;
              
              // 恢复图片大小
              const img = c.querySelector('img');
              if (img) {
                img.style.transform = "scale(1) translateZ(0)";
              }
            }
            
            // 添加渐变效果
            applyFadeEffect(c);
            // 重置非活动卡片的z-index
            resetCardZIndex(c);
          }
        });
        
        // 添加当前卡片的渐变效果
        card.style.opacity = "0.9";
        requestAnimationFrame(() => {
          // 激活当前卡片并确保其在顶层
          card.classList.add('active');
          card.style.zIndex = 1000;
          card.style.opacity = "1";
          
          // 获取卡片的i值，决定不同的动画效果
          const iValue = getComputedStyle(card).getPropertyValue('--i').trim();
          
          if (iValue === '0') {
            // 中间卡片（图片3）特殊处理：下移并稍微缩小
            card.style.cssText += "transform: translateZ(0) rotate(0deg) translate(0px, 120px) scale(0.95) !important;";
            
            // 图片改为1.3倍
            const img = card.querySelector('img');
            if (img) {
              img.style.transform = "scale(1.3) translateZ(0)";
            }
          } else {
            // 其他卡片移动到中央位置
            card.style.cssText += "transform: translateZ(0) rotate(0deg) translate(0px, 80px) !important;";
            
            // 对应处理图片大小
            const img = card.querySelector('img');
            if (img) {
              img.style.transform = "scale(1.3) translateZ(0)";
            }
          }
          
          // 移除所有修饰
          removeAllDecorations();
        });
      }
    });
  });
  
  // 应用渐隐渐显效果
  function applyFadeEffect(card) {
    // 获取卡片当前的i值来决定最终透明度
    const iValue = getComputedStyle(card).getPropertyValue('--i').trim();
    let finalOpacity = 1;
    
    // 根据卡片位置设置不同的透明度
    if (iValue === '0') {          // 3号卡片 (中间)
      finalOpacity = 1;
    } else if (iValue === '-1' || iValue === '1') {  // 2号和4号卡片
      finalOpacity = 0.95;
    } else {                        // 1号和5号卡片
      finalOpacity = 0.9;
    }
    
    // 应用渐变效果，确保没有额外修饰
    card.style.opacity = "0.7";
    card.style.boxShadow = "none";
    card.style.border = "none";
    
    requestAnimationFrame(() => {
      card.style.opacity = finalOpacity.toString();
    });
  }
  
  // 函数：设置初始叠放顺序
  function arrangeInitialCardOrder() {
    // 遍历所有卡片并设置z-index (CSS中已设置，此处仅作为备份确保)
    cards.forEach(card => {
      // 如果不是活动卡片，才重置z-index
      if (!card.classList.contains('active')) {
        // 获取卡片的i值
        const iValue = getComputedStyle(card).getPropertyValue('--i').trim();
        
        // 中间卡片特殊处理
        if (iValue === '0') {
          // 如果中间卡片已被点击过，保持下移和缩小状态
          if (middleCardClicked) {
            card.style.transform = `translateZ(0) rotate(0deg) translate(0px, 120px) scale(0.95)`;
            
            // 图片也保持1.3倍
            const img = card.querySelector('img');
            if (img) {
              img.style.transform = "scale(1.3) translateZ(0)";
            }
            
            // 设置z-index
            card.style.zIndex = 5;
          } else {
            // 中间卡片（3号卡片）
            resetCardZIndex(card);
            card.style.opacity = "1";
          }
        } else {
          // 其他卡片按照正常逻辑处理
          resetCardZIndex(card);
          
          // 设置初始透明度
          if (iValue === '-1' || iValue === '1') {  // 2号和4号卡片
            card.style.opacity = "0.95";
          } else {                        // 1号和5号卡片
            card.style.opacity = "0.9";
          }
        }
      }
    });
  }
  
  // 函数：重置卡片的z-index到初始值
  function resetCardZIndex(card) {
    const iValue = getComputedStyle(card).getPropertyValue('--i').trim();
    if (iValue === '0') {          // 3号卡片 (中间)
      if (middleCardClicked) {
        // 如果中间卡片已被点击，确保其保持特殊状态
        card.style.zIndex = 5;
        return;
      } else {
        card.style.zIndex = 5;
      }
    } else if (iValue === '-1' || iValue === '1') {  // 2号和4号卡片
      card.style.zIndex = 3;
    } else {                        // 1号和5号卡片
      card.style.zIndex = 1;
    }
  }
  
  // 函数：移除所有卡片和图片的修饰
  function removeAllDecorations() {
    // 移除所有卡片的边框和阴影
    cards.forEach(card => {
      card.style.boxShadow = "none";
      card.style.border = "none";
      card.style.outline = "none";
      
      // 移除图片的边框和阴影
      const img = card.querySelector('img');
      if (img) {
        img.style.boxShadow = "none";
        img.style.border = "none";
        img.style.outline = "none";
      }
    });
  }
  
  // 函数：防止文本选择和输入光标
  function preventTextSelection() {
    // 仅为卡片区域防止文本选择
    container.onselectstart = function() { return false; };
    
    // 防止拖拽卡片区域的图片
    container.ondragstart = function() { return false; };
    
    // 防止卡片区域的右键菜单
    container.oncontextmenu = function() { return false; };
    
    // 添加mousedown事件处理，阻止默认行为
    container.addEventListener('mousedown', function(e) {
      // 防止鼠标点击时出现光标
      if (e.target.closest('.card') || e.target === container) {
        e.preventDefault();
      }
    });
    
    // 添加focus和blur事件处理
    cards.forEach(card => {
      card.addEventListener('focus', function() {
        this.blur(); // 立即失去焦点
      });
      
      // 确保点击时不会获得焦点
      card.addEventListener('mousedown', function(e) {
        e.preventDefault();
      });
    });
  }
}); 