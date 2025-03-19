// 轮播图功能
const carousel = document.querySelector('.carousel');
const carouselInner = carousel.querySelector('.carousel-inner');
const carouselItems = carousel.querySelectorAll('.carousel-item');
const prevButton = carousel.querySelector('.carousel-prev');
const nextButton = carousel.querySelector('.carousel-next');
const indicators = carousel.querySelectorAll('.carousel-indicator');

let currentIndex = 0;
let autoPlayInterval;

function updateCarousel() {
  const offset = -currentIndex * 100;
  carouselInner.style.transform = `translateX(${offset}%)`;
  
  // 更新指示器状态
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle('active', index === currentIndex);
  });
}

function moveToIndex(index) {
  if (index < 0) {
    currentIndex = carouselItems.length - 1;
  } else if (index >= carouselItems.length) {
    currentIndex = 0;
  } else {
    currentIndex = index;
  }
  updateCarousel();
}

function startAutoPlay() {
  autoPlayInterval = setInterval(() => {
    moveToIndex(currentIndex + 1);
  }, 5000);
}

function stopAutoPlay() {
  clearInterval(autoPlayInterval);
}

// 事件监听
prevButton.addEventListener('click', () => {
  stopAutoPlay();
  moveToIndex(currentIndex - 1);
});

nextButton.addEventListener('click', () => {
  stopAutoPlay();
  moveToIndex(currentIndex + 1);
});

indicators.forEach((indicator, index) => {
  indicator.addEventListener('click', () => {
    stopAutoPlay();
    moveToIndex(index);
  });
});

// 鼠标悬停时暂停自动播放
carousel.addEventListener('mouseenter', stopAutoPlay);
carousel.addEventListener('mouseleave', startAutoPlay);

// 初始化
updateCarousel();
startAutoPlay();
