
// 滚动到底部显示
document.addEventListener("DOMContentLoaded", function () {
  // 设置滚动位置到底部
  const container = document.querySelector(".background-container");
  if (container) {
    container.scrollTop = container.scrollHeight - container.clientHeight;
  }

  // 延迟执行卡片旋转处理
  setTimeout(setupCardRotation, 100);

  // 设置卡片拖拽效果
  setupCardDragging();

  // 设置解梦按钮点击事件
  setupResultButton();

  // 设置重新解梦按钮点击事件
  setupResetButton();

  // 设置滚动事件监听
  setupScrollListener();

  // 生成星空背景
  generateStars();

  // 设置吹气检测功能
  setupBlowDetection();

  // 创建音效对象，提前加载
  window.generationSound = new Audio('生成音效.MP3');
  window.generationSound.preload = 'auto';

  // 创建全局handleCardDrag函数，供手势操作调用
  window.handleCardDrag = function (card, position) {
    console.log("处理卡片拖拽:", position);

    // 添加消失效果
    card.classList.add("disappearing");

    // 获取对应的内容并添加到文本框
    const cardContents = {
      1: "**我常常梦见飞行物体，像飞机之类的…**",
      2: "**我常常梦见死亡…**",
      3: "**我常常梦见婴儿…**",
      4: "**我常常梦见我在天上飞…**",
      5: "**我常常梦见外星人UFO飞船…**",
      6: "**我常常梦见蛇…**",
      7: "**我常常梦见自然灾害，像火山爆发地震之类的…**",
      8: "**我常常梦见自己的牙齿掉了…**",
      9: "**我常常梦见房子…**",
      10: "**我常常梦见食物…**",
    };

    // 将内容添加到文本框
    const inputField = document.querySelector(".input-field");
    if (inputField) {
      const content = cardContents[position] || `卡片${position}的解释`;

      // 如果文本框中已有内容，添加换行符
      if (inputField.value.trim() !== "") {
        inputField.value += "\n\n";
      }

      // 添加卡片内容
      inputField.value += content;

      // 自动滚动到底部，使新添加的内容可见
      inputField.scrollTop = inputField.scrollHeight;
    }

    // 在卡片消失动画结束后检查是否需要触发结果按钮点击
    // 不立即触发结果按钮，而是由最后一张卡片的处理来控制
  };
});

// 播放生成音效
function playGenerationSound() {
  // 重置音频到起始位置（以防重复播放）
  if (window.generationSound) {
    window.generationSound.currentTime = 0;
    
    // 播放音效
    window.generationSound.play().catch(err => {
      console.error("音效播放失败:", err);
    });
  }
}

// 添加吹气检测功能
function setupBlowDetection() {
  // 检查浏览器是否支持相关API
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("浏览器不支持getUserMedia API");
    return;
  }
  
  let audioContext;
  let analyser;
  let microphone;
  let scriptProcessor;
  let isBlowDetectionActive = false;
  let isBlowing = false;
  let blowStartTime = 0;
  const blowThreshold = 130; // 吹气阈值，可能需要根据实际情况调整
  const blowDuration = 500; // 判定为吹气的最小持续时间（毫秒）
  
  // 监视向上滑动图片的显示状态
  const swipeUpImage = document.querySelector(".swipe-up-image");
  const blowInstruction = document.getElementById("blow-instruction");
  if (!swipeUpImage) return;
  
  // 创建一个Mutation Observer来监视向上滑动图片的状态变化
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'class' || 
           mutation.attributeName === 'style')) {
        // 检查图片是否显示
        const isVisible = swipeUpImage.classList.contains('show') && 
                          swipeUpImage.style.opacity !== '0';
        
        if (isVisible && !isBlowDetectionActive) {
          // 图片显示，启动吹气检测
          startBlowDetection();
          
          // 不再显示吹气提示
        } else if (!isVisible && isBlowDetectionActive) {
          // 图片不显示，停止吹气检测
          stopBlowDetection();
          
          // 隐藏吹气提示
          if (blowInstruction) {
            blowInstruction.classList.remove('show');
          }
        }
      }
    });
  });
  
  // 配置观察选项
  const config = { attributes: true, childList: false, subtree: false };
  
  // 开始观察
  observer.observe(swipeUpImage, config);
  
  // 如果图片已经显示，立即启动吹气检测
  if (swipeUpImage.classList.contains('show') && 
      swipeUpImage.style.opacity !== '0') {
    startBlowDetection();
    
    // 不再显示吹气提示
  }
  
  // 启动吹气检测
  function startBlowDetection() {
    if (isBlowDetectionActive) return;
    
    console.log("启动吹气检测");
    isBlowDetectionActive = true;
    
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(function(stream) {
        // 创建音频上下文
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        
        // 设置分析参数
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        // 连接音频流
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // 创建脚本处理器
        scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        
        // 处理音频数据
        scriptProcessor.onaudioprocess = function() {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          
          // 计算音量值（使用频率数据的平均值）
          let volume = 0;
          for (let i = 0; i < array.length; i++) {
            volume += array[i];
          }
          volume = volume / array.length;
          
          // 检测吹气（高音量）
          if (volume > blowThreshold) {
            if (!isBlowing) {
              isBlowing = true;
              blowStartTime = Date.now();
            } else if (Date.now() - blowStartTime > blowDuration) {
              // 持续吹气超过阈值时间，触发滚动效果
              handleBlowDetected();
              // 重置状态，防止连续触发
              isBlowing = false;
            }
          } else {
            isBlowing = false;
          }
        };
      })
      .catch(function(err) {
        console.error("获取麦克风失败:", err);
        isBlowDetectionActive = false;
      });
  }
  
  // 停止吹气检测
  function stopBlowDetection() {
    if (!isBlowDetectionActive) return;
    
    console.log("停止吹气检测");
    isBlowDetectionActive = false;
    isBlowing = false;
    
    // 断开并清理音频资源
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor = null;
    }
    
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }
    
    if (microphone) {
      microphone.disconnect();
      microphone = null;
    }
    
    if (audioContext) {
      audioContext.close().then(() => {
        audioContext = null;
      });
    }
  }
  
  // 处理检测到吹气的事件
  function handleBlowDetected() {
    console.log("检测到吹气，开始自动滚动到顶部");
    
    // 隐藏向上滑动图片
    swipeUpImage.style.transition = "opacity 1s ease";
    swipeUpImage.style.opacity = "0";
    
    setTimeout(() => {
      swipeUpImage.classList.remove("show");
      swipeUpImage.style.transition = "";
    }, 1000);
    
    // 获取滚动容器并平滑滚动到顶部
    const container = document.querySelector(".background-container");
    if (container) {
      // 使用更慢的滚动效果
      const scrollDistance = container.scrollTop;
      const scrollDuration = 3000; // 增加到3秒
      const startTime = performance.now();
      
      // 使用自定义滚动动画，实现更慢的滚动
      function scrollAnimation(currentTime) {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime < scrollDuration) {
          // 使用缓动函数计算滚动位置
          const progress = 1 - Math.pow(1 - elapsedTime / scrollDuration, 2); // 使用二次缓动
          container.scrollTop = scrollDistance * (1 - progress);
          requestAnimationFrame(scrollAnimation);
        } else {
          container.scrollTop = 0; // 确保最终滚动到顶部
        }
      }
      
      requestAnimationFrame(scrollAnimation);
    }
  }
}

// 添加滚动监听，处理向上滑动图片的消失效果
function setupScrollListener() {
  const container = document.querySelector(".background-container");
  const swipeUpImage = document.querySelector(".swipe-up-image");

  if (!container || !swipeUpImage) return;

  let lastScrollTop = container.scrollTop;

  container.addEventListener("scroll", function () {
    // 检测滚动方向
    const scrollTop = container.scrollTop;
    const isScrollingUp = scrollTop < lastScrollTop;

    // 当向上滚动时，快速淡出向上滑动图片
    if (isScrollingUp && swipeUpImage.classList.contains("show")) {
      swipeUpImage.style.transition = "opacity 1s ease";
      swipeUpImage.style.opacity = "0";

      // 在动画完成后移除show类
      setTimeout(() => {
        swipeUpImage.classList.remove("show");
        // 恢复原始transition设置，以便下次显示时可以使用正常的动画
        swipeUpImage.style.transition = "";
      }, 1000);
    }

    lastScrollTop = scrollTop;
  });
}

// 解梦按钮点击事件
async function setupResultButton() {
  const resultButtonContainer = document.querySelector(
    ".result-button-container"
  );
  const resultButton = document.querySelector(".result-button");
  const cardItems = document.querySelectorAll(".banner .slider .item");
  const swipeUpImage = document.querySelector(".swipe-up-image");
  const magicEffect = document.querySelector(".magic-effect-container");
  const slider = document.querySelector(".banner .slider");
  let isButtonClicked = false; // 跟踪按钮是否已被点击

  if (resultButton && resultButtonContainer) {
    resultButton.addEventListener("click", async function (event) {
      // 如果按钮已被点击，则不再响应
      if (isButtonClicked) {
        console.log("按钮已经被点击过，忽略此次点击");
        return;
      }

      // 触发背景抖动效果
      const backgroundImage = document.querySelector(".background-image");
      if (backgroundImage) {
        backgroundImage.classList.remove("shaking");
        void backgroundImage.offsetWidth; // 触发重绘
        backgroundImage.classList.add("shaking");
      }

      //   定时器
      const timer = setInterval(() => {
        if (backgroundImage) {
          backgroundImage.classList.remove("shaking");
          void backgroundImage.offsetWidth; // 触发重绘
          backgroundImage.classList.add("shaking");
        }
      }, 2000);

      await getImageText();

      clearInterval(timer);

      isButtonClicked = true; // 标记按钮已被点击
      console.log("结果按钮被点击，开始处理卡片和按钮动画");

      // 暂停卡片旋转
      if (slider) {
        slider.style.animationPlayState = "paused";
      }

      // 触发按钮淡出动画
      resultButtonContainer.style.transition = "opacity 0.8s ease-out";
      resultButtonContainer.style.opacity = "0";

      // 触发背景抖动效果
      //   const backgroundImage = document.querySelector(".background-image");
      if (backgroundImage) {
        backgroundImage.classList.remove("shaking");
        void backgroundImage.offsetWidth; // 触发重绘
        backgroundImage.classList.add("shaking");
      }

      // 触发所有可见卡片的飞出动画
      let visibleItems = [];
      cardItems.forEach((item) => {
        if (
          item.style.display !== "none" &&
          !item.classList.contains("disappearing") &&
          !item.classList.contains("flying-out")
        ) {
          visibleItems.push(item);
        }
      });

      // 如果没有可见卡片，直接显示上滑提示和魔法效果
      if (visibleItems.length === 0) {
        setTimeout(() => {
          resultButtonContainer.style.display = "none";

          // 没有卡片时也显示魔法效果
          if (magicEffect) {
            magicEffect.classList.add("show");
            // 播放生成音效
            playGenerationSound();
          }

          // 同时显示重新解梦按钮
          const resetButton = document.querySelector(".reset-dream-button-container");
          if (resetButton) {
            resetButton.classList.add("show");
          }

          // 同时显示上左右装饰图片
          const topLeftImage = document.querySelector(".top-left-image-container");
          const topRightImage = document.querySelector(".top-right-image-container");
          if (topLeftImage) {
            topLeftImage.classList.add("show");
          }
          if (topRightImage) {
            topRightImage.classList.add("show");
          }

          // 等待适当时间后显示上滑提示
          setTimeout(() => {
            if (swipeUpImage) {
              swipeUpImage.classList.add("show");
              swipeUpImage.style.display = "block";
              swipeUpImage.style.opacity = "1";
            }
          }, 1000);
        }, 800);
        return;
      }

      // 依次为每个可见卡片添加飞出动画
      visibleItems.forEach((item, index) => {
        setTimeout(() => {
          // 随机选择飞出方向 (1-4)
          const flyDirection = Math.floor(Math.random() * 4) + 1;

          // 添加飞出动画类和方向类
          item.classList.add("flying-out");
          item.classList.add(`flying-out-${flyDirection}`);

          // 最后一张卡片飞出后显示魔法效果和上滑提示
          if (index === visibleItems.length - 1) {
            setTimeout(() => {
              resultButtonContainer.style.display = "none";

              // 在这里添加显示魔法效果的代码，让它在卡片飞走后显示
              if (magicEffect) {
                magicEffect.classList.add("show");
                // 播放生成音效
                playGenerationSound();
              }

              // 同时显示重新解梦按钮
              const resetButton = document.querySelector(".reset-dream-button-container");
              if (resetButton) {
                resetButton.classList.add("show");
              }

              // 同时显示上左右装饰图片
              const topLeftImage = document.querySelector(".top-left-image-container");
              const topRightImage = document.querySelector(".top-right-image-container");
              if (topLeftImage) {
                topLeftImage.classList.add("show");
              }
              if (topRightImage) {
                topRightImage.classList.add("show");
              }

              // 等待适当时间后显示上滑提示
              setTimeout(() => {
                if (swipeUpImage) {
                  swipeUpImage.classList.add("show");
                  swipeUpImage.style.display = "block";
                  swipeUpImage.style.opacity = "1";
                }
              }, 1000);
            }, 500);
          }
        }, index * 100);
      });
    });
  }
}

// 重新解梦按钮点击事件
function setupResetButton() {
  const resetButton = document.querySelector(".reset-dream-button-container");
  if (resetButton) {
    // 确保按钮初始状态是隐藏的
    resetButton.classList.remove("show");
    
    // 确保上方装饰图片初始状态是隐藏的
    const topLeftImage = document.querySelector(".top-left-image-container");
    const topRightImage = document.querySelector(".top-right-image-container");
    if (topLeftImage) {
      topLeftImage.classList.remove("show");
    }
    if (topRightImage) {
      topRightImage.classList.remove("show");
    }
    
    const resetButtonImg = document.querySelector(".reset-dream-button");
    if (resetButtonImg) {
      resetButtonImg.addEventListener("click", function() {
        // 刷新页面
        window.location.reload();
      });
    }
  }
}

// 卡片拖拽功能
function setupCardDragging() {
  const items = document.querySelectorAll(".slider .item");
  const inputField = document.querySelector(".input-field");

  // 卡片对应的内容映射
  const cardContents = {
    1: "**我常常梦见飞行物体，像飞机之类的…**",
    2: "**我常常梦见死亡…**",
    3: "**我常常梦见婴儿…**",
    4: "**我常常梦见我在天上飞…**",
    5: "**我常常梦见外星人UFO飞船…**",
    6: "**我常常梦见蛇…**",
    7: "**我常常梦见自然灾害，像火山爆发地震之类的…**",
    8: "**我常常梦见自己的牙齿掉了…**",
    9: "**我常常梦见房子…**",
    10: "**我常常梦见食物…**",
  };

  items.forEach((item) => {
    let isDragging = false;
    let startY = 0;
    let currentY = 0;

    // 鼠标按下事件
    item.addEventListener("mousedown", (e) => {
      isDragging = true;
      startY = e.clientY;
      currentY = startY;
      item.classList.add("dragging");
      e.preventDefault();
    });

    // 鼠标移动事件
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      currentY = e.clientY;
      const deltaY = currentY - startY;

      // 只有向下拖拽才有效果
      if (deltaY > 0) {
        // 计算缩放和透明度，随着拖拽距离增加而变化
        const dragRatio = Math.min(deltaY / 150, 1);
        const scale = 1 - dragRatio * 0.7;
        const translateY = dragRatio * 150;

        // 应用变换
        const baseTransform = item.style.transform || "";
        const newTransform = baseTransform.replace(
          /translateY\([^)]*\)|scale\([^)]*\)/g,
          ""
        );
        item.style.transform = `${newTransform} translateY(${translateY}px) scale(${scale})`;
        item.style.opacity = 1 - dragRatio;

        // 如果拖拽距离超过阈值，标记为消失
        if (dragRatio >= 0.8) {
          item.classList.add("disappearing");
        }
      }
    });

    // 鼠标释放事件
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;

      isDragging = false;
      const deltaY = currentY - startY;

      // 如果拖拽足够远，移除卡片
      if (deltaY > 120) {
        // 获取卡片位置并添加对应内容到文本框
        const position = parseInt(item.getAttribute("data-position"));
        const content = cardContents[position] || `卡片${position}的解释`;

        // 将内容添加到文本框
        if (inputField) {
          // 如果文本框已有内容，添加换行符
          if (inputField.value && inputField.value.trim() !== "") {
            inputField.value += "\n\n";
          }
          inputField.value += content;

          // 自动滚动文本框到底部
          inputField.scrollTop = inputField.scrollHeight;
        }

        // 动画完成后隐藏卡片
        setTimeout(() => {
          item.style.display = "none";
        }, 300);
      } else {
        // 不够远，恢复卡片
        item.classList.remove("dragging");
        item.classList.remove("disappearing");
        item.style.transform = "";
        item.style.opacity = "";
      }
    });

    // 鼠标离开视口
    document.addEventListener("mouseleave", () => {
      if (isDragging) {
        isDragging = false;
        item.classList.remove("dragging");
        item.style.transform = "";
        item.style.opacity = "";
      }
    });
  });
}

// 卡片旋转控制 - 完全重写
function setupCardRotation() {
  const items = document.querySelectorAll(".slider .item");
  const slider = document.querySelector(".slider");
  const itemCount = items.length;

  // 启动旋转检测
  let lastRotation = getCurrentRotation(slider);
  let rotationCounter = 0;

  // 每帧检测旋转角度变化
  function checkRotation() {
    const currentRotation = getCurrentRotation(slider);

    // 如果旋转角度变化，更新卡片状态
    if (Math.abs(currentRotation - lastRotation) > 0.1) {
      updateCardPositions();
      lastRotation = currentRotation;
    }

    // 每30帧强制更新一次，防止检测失败
    rotationCounter++;
    if (rotationCounter >= 30) {
      updateCardPositions();
      rotationCounter = 0;
    }

    requestAnimationFrame(checkRotation);
  }

  // 开始检测
  checkRotation();

  // 更新卡片前后位置
  function updateCardPositions() {
    items.forEach((item) => {
      // 如果卡片已被拖拽消失，跳过处理
      if (item.classList.contains("disappearing")) {
        return;
      }

      const position = parseInt(item.getAttribute("data-position"));
      const angle = getCardAngle(position, itemCount);

      // 如果卡片在前半圈 (270-90度区域)
      if (angle >= 270 || angle < 90) {
        item.classList.add("front-item");
        item.classList.remove("back-item");
      } else {
        item.classList.add("back-item");
        item.classList.remove("front-item");
      }
    });
  }

  // 获取卡片当前角度
  function getCardAngle(position, totalItems) {
    const baseAngle = (position - 1) * (360 / totalItems);
    const sliderRotation = getCurrentRotation(slider);
    let angle = (baseAngle + sliderRotation) % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

  // 获取滑块当前旋转角度
  function getCurrentRotation(element) {
    const style = window.getComputedStyle(element);
    const transform = style.getPropertyValue("transform");

    if (transform === "none") return 0;

    const matrix = transform.match(/^matrix3d\((.+)\)$/);
    if (matrix) {
      const values = matrix[1].split(", ");
      const [a, b] = [parseFloat(values[0]), parseFloat(values[1])];
      return Math.round(Math.atan2(b, a) * (180 / Math.PI));
    }

    return 0;
  }

  // 初始化：立即更新卡片位置状态
  updateCardPositions();
}

// 生成星空背景
function generateStars() {
  const stars = document.getElementById("stars");
  const count = 900; // 900颗星星

  // 清空现有内容
  stars.innerHTML = "";

  // 创建多种大小的星星
  const createStars = (size, count, opacityRange, durationRange) => {
    // 将页面划分为几个区域，确保星星均匀分布
    const sections = 10; // 将屏幕垂直方向划分为10个区域
    const starsPerSection = Math.ceil(count / sections);

    for (let section = 0; section < sections; section++) {
      // 计算当前区域的垂直范围
      const yMin = (section * 100) / sections;
      const yMax = ((section + 1) * 100) / sections;

      // 在每个区域内创建星星
      for (let i = 0; i < starsPerSection; i++) {
        const star = document.createElement("div");
        star.className = "star";

        // 随机位置，但限制在当前区域内
        const x = Math.random() * 100;
        const y = yMin + Math.random() * (yMax - yMin);

        // 随机大小
        const finalSize = size * (0.8 + Math.random() * 0.4);

        // 随机动画持续时间
        const minDuration = durationRange[0];
        const maxDuration = durationRange[1];
        const duration =
          Math.random() * (maxDuration - minDuration) + minDuration;

        // 随机最大亮度
        const minOpacity = opacityRange[0];
        const maxOpacity = opacityRange[1];
        const opacity = Math.random() * (maxOpacity - minOpacity) + minOpacity;

        // 随机延迟开始时间
        const delay = Math.random() * 10;

        // 设置样式
        star.style.cssText = `
          left: ${x}%;
          top: ${y}%;
          width: ${finalSize}px;
          height: ${finalSize}px;
          --duration: ${duration}s;
          --opacity: ${opacity};
          animation-delay: ${delay}s;
        `;

        stars.appendChild(star);
      }
    }
  };

  // 创建不同大小的星星，均匀分布在各个区域
  createStars(1, 450, [0.4, 0.7], [1.2, 2.5]); // 小星星，亮度较低，闪烁快
  createStars(2, 300, [0.5, 0.8], [1.5, 3.0]); // 中小星星
  createStars(3, 110, [0.6, 0.9], [2.0, 3.5]); // 中等星星
  createStars(4, 40, [0.7, 1.0], [2.5, 4.0]); // 大星星，较亮，闪烁较慢
}
