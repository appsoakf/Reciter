<template>
  <view class="container">
    <!-- 根据设备尺寸动态调整布局 -->
    <view class="feature-cards">
      <view class="card-row">
        <view 
          class="card" 
          @click="navigateTo('/pages/wordlist/index')"
        >
          <view class="card-icon">
            <text class="iconfont icon-list">📋</text>
          </view>
          <view class="card-title">单词列表</view>
          <view class="card-desc">共有单词：{{wordCount}}个</view>
        </view>
        
        <view 
          class="card" 
          @click="navigateTo('/pages/errorbook/index')"
        >
          <view class="card-icon">
            <text class="iconfont icon-book">📚</text>
          </view>
          <view class="card-title">错题本</view>
          <view class="card-desc">记录知识点：{{errorCount}}个</view>
        </view>
      </view>
      
      <view class="card-row">
        <view 
          class="card" 
          @click="navigateTo('/pages/add/index')"
        >
          <view class="card-icon">
            <text class="iconfont icon-add">➕</text>
          </view>
          <view class="card-title">添加单词</view>
          <view class="card-desc">自定义添加新单词</view>
        </view>
        
        <view 
          class="card" 
          @click="navigateTo('/pages/settings/index')"
        >
          <view class="card-icon">
            <text class="iconfont icon-settings">⚙️</text>
          </view>
          <view class="card-title">设置</view>
          <view class="card-desc">自定义应用设置</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed, reactive, onBeforeUnmount } from 'vue';
import { getWordList, getWordListSync } from '@/services/word.js';
import { getErrorList } from '@/services/errorbook.js';
import { onShow } from '@/utils/uni-hooks.js'; // 引入onShow钩子

const wordCount = ref(0);
const errorCount = ref(0);
const windowInfo = ref({
  width: 375, // 默认值
  height: 667,
  pixelRatio: 2,
  platform: 'ios',
  orientation: 'portrait' // 'portrait' 或 'landscape'
});

// 计算设备类型
const deviceClass = computed(() => {
  const { width, orientation } = windowInfo.value;
  if (width < 360) return 'device-small';
  if (width < 768) return orientation === 'portrait' ? 'device-phone' : 'device-phone-landscape';
  if (width < 1024) return 'device-tablet';
  return 'device-desktop';
});

// 计算卡片大小类型
const cardSize = computed(() => {
  const { width } = windowInfo.value;
  if (width < 360) return 'small';
  if (width < 768) return 'medium';
  return 'large';
});

// 计算每行显示的卡片数
const cardsPerRow = computed(() => {
  const { width, orientation } = windowInfo.value;
  
  // 横屏模式下显示更多卡片
  if (orientation === 'landscape') {
    if (width < 568) return 2; // 小屏幕横屏
    if (width < 1024) return 4; // 平板横屏
    return 4; // 桌面横屏
  }
  
  // 竖屏模式
  if (width < 375) return 1; // 小屏幕手机
  if (width < 768) return 2; // 正常手机
  return 4; // 平板或桌面
});

// 计算卡片样式
const getCardStyle = (index) => {
  const perRow = cardsPerRow.value;
  // 如果是一行显示4个，就不需要特殊样式
  if (perRow === 4) return {};
  
  // 如果是一行显示2个，第1、3个左对齐，第2、4个右对齐
  if (perRow === 2) {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    
    // 添加一点随机的颜色变化，使界面更活泼
    const hueOffset = index * 5; // 每个卡片色相偏移一点
    const baseHue = 240; // 基础色相 - 接近原来的紫色
    
    return {
      marginLeft: col === 0 ? '0' : 'auto',
      marginRight: col === 1 ? '0' : 'auto',
      borderTopColor: `hsl(${baseHue + hueOffset}, 70%, 65%)`,
      borderTopWidth: '4px',
      borderTopStyle: 'solid'
    };
  }
  
  return {};
};

const navigateTo = (url) => {
  // 判断是否是tabBar页面
  const tabBarPages = [
    '/pages/index/index',
    '/pages/wordlist/index',
    '/pages/add/index',
    '/pages/errorbook/index'
  ];
  
  if (tabBarPages.includes(url)) {
    // 如果是tabBar页面，使用switchTab
    uni.switchTab({ url });
  } else {
    // 如果不是tabBar页面，使用navigateTo
    uni.navigateTo({ url });
  }
};

const loadWordCount = async () => {
  try {
    // 先清除可能存在的缓存
    if (typeof uni.$wordPreloadCache !== 'undefined') {
      uni.$wordPreloadCache = {};
    }
    
    // 使用silent模式加载单词列表，避免触发事件造成循环
    const words = await getWordList(true);
    
    if (Array.isArray(words)) {
      wordCount.value = words.length;
    } else {
      console.warn('获取到的单词数据格式异常');
      wordCount.value = 0;
    }
  } catch (err) {
    console.error('获取单词数量失败:', err);
    wordCount.value = 0;
  }
};

const loadErrorCount = async () => {
  try {
    const errors = await getErrorList();
    
    if (Array.isArray(errors)) {
      errorCount.value = errors.length;
    } else {
      console.warn('获取到的错题数据不是数组');
      errorCount.value = 0;
    }
  } catch (err) {
    console.error('获取错题数量失败:', err);
    errorCount.value = 0;
  }
};

// 获取设备信息
const getSystemInfo = () => {
  try {
    const info = uni.getSystemInfoSync();
    console.log('系统信息:', info);
    
    // 判断设备方向
    const orientation = info.windowWidth > info.windowHeight ? 'landscape' : 'portrait';
    
    windowInfo.value = {
      width: info.windowWidth,
      height: info.windowHeight,
      pixelRatio: info.pixelRatio,
      platform: info.platform,
      orientation
    };
    console.log('窗口尺寸:', windowInfo.value);
  } catch (e) {
    console.error('获取系统信息失败:', e);
  }
};

// 设置窗口大小变化监听器
let resizeTimer = null;
const setupResizeListener = () => {
  // #ifdef H5
  try {
    uni.onWindowResize(() => {
      // 使用防抖，避免频繁更新
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        console.log('检测到窗口大小变化，重新计算布局');
        getSystemInfo();
      }, 300);
    });
  } catch (e) {
    console.error('监听窗口大小变化失败:', e);
  }
  // #endif
};

// 移除窗口大小变化监听器
const removeResizeListener = () => {
  // #ifdef H5
  try {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    uni.offWindowResize();
  } catch (e) {
    console.error('移除窗口大小变化监听器失败:', e);
  }
  // #endif
};

// 将首页需要的逻辑函数整合到这里
const setupHomePage = () => {
  // 获取设备信息
  getSystemInfo();
  
  // 设置窗口大小变化监听器
  setupResizeListener();
  
  // 加载单词数量
  loadWordCount();
  
  // 加载错题数量
  loadErrorCount();
};

// 组件挂载时
onMounted(() => {
  setupHomePage();
  
  // 添加错题本计数更新事件监听器
  uni.$on('errorbook-count-updated', (data) => {
    if (data && typeof data.count === 'number') {
      errorCount.value = data.count;
    }
  });
  
  // 添加单词数量更新事件监听器
  uni.$on('words-count-updated', (data) => {
    // 直接使用事件提供的count值，避免调用loadWordCount产生循环依赖
    if (data && typeof data.count === 'number') {
      wordCount.value = data.count;
    } else {
      // 仅当没有传递count时才手动加载
      // 使用getWordListSync避免触发事件
      try {
        const words = getWordListSync();
        if (Array.isArray(words)) {
          wordCount.value = words.length;
        }
      } catch (err) {
        console.error('手动加载单词数量失败:', err);
      }
    }
  });
});

// 页面显示时重新加载数据
onShow(() => {
  loadWordCount();
  loadErrorCount();
});

// 组件销毁前
onBeforeUnmount(() => {
  removeResizeListener();
  
  // 移除错题本计数更新事件监听器
  uni.$off('errorbook-count-updated');
  
  // 移除单词数量更新事件监听器
  uni.$off('words-count-updated');
});
</script>

<style>
.container {
  padding: 3.5vw; /* 使用视窗宽度的百分比替代固定尺寸 */
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}

/* Uni-app特有样式，处理小程序特殊情况 */
/* #ifdef MP */
.container {
  padding: 30rpx;
}
/* #endif */

.feature-cards {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  max-width: 90vw; /* 最大宽度为视窗宽度的90% */
  gap: 20px; /* 行间距 */
}

.card-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 20px; /* 列间距 */
}

.card {
  flex: 1;
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s; /* 添加过渡效果 */
  aspect-ratio: 1/1.1; /* 保持基本形状 */
}

/* 不同设备类型的样式调整 */
.device-small {
  gap: 10px;
}

.device-phone {
  gap: 15px;
}

.device-phone-landscape {
  gap: 15px;
  flex-direction: row;
  max-width: 100vw;
}

.device-tablet, .device-desktop {
  gap: 20px;
  max-width: 800px;
}

/* 小程序特殊处理 */
/* #ifdef MP */
.feature-cards {
  gap: 20rpx;
}

.card-row {
  gap: 20rpx;
}

.card {
  border-radius: 24rpx;
  padding: 30rpx;
}
/* #endif */

.card:active {
  transform: scale(0.97); /* 点击时的缩放效果 */
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: clamp(40px, 12vw, 60px); /* 响应式图标大小 */
  height: clamp(40px, 12vw, 60px);
  background-color: rgba(79, 70, 229, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: clamp(8px, 2vw, 15px);
}

/* 不同卡片尺寸的图标样式 */
.card-small .card-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
}

.card-large .card-icon {
  width: 60px;
  height: 60px;
}

/* 小程序特殊处理 */
/* #ifdef MP */
.card-icon {
  width: 100rpx;
  height: 100rpx;
  margin-bottom: 20rpx;
}
/* #endif */

.card-icon .iconfont {
  font-size: clamp(18px, 5vw, 28px); /* 响应式字体大小 */
  color: #4F46E5; /* indigo-600 */
}

/* 小程序特殊处理 */
/* #ifdef MP */
.card-icon .iconfont {
  font-size: 48rpx;
}
/* #endif */

.card-title {
  font-size: clamp(14px, 4vw, 18px); /* 响应式字体大小 */
  font-weight: 500;
  color: #333;
  margin-bottom: clamp(3px, 1vw, 8px);
  text-align: center;
}

/* 不同卡片尺寸的标题样式 */
.card-small .card-title {
  font-size: 14px;
  margin-bottom: 4px;
}

/* 小程序特殊处理 */
/* #ifdef MP */
.card-title {
  font-size: 32rpx;
  margin-bottom: 10rpx;
}
/* #endif */

.card-desc {
  font-size: clamp(10px, 3vw, 14px); /* 响应式字体大小 */
  color: #666;
  text-align: center;
  line-height: 1.4;
}

/* 不同卡片尺寸的描述样式 */
.card-small .card-desc {
  font-size: 10px;
  line-height: 1.2;
}

/* 小程序特殊处理 */
/* #ifdef MP */
.card-desc {
  font-size: 24rpx;
}
/* #endif */
</style>
