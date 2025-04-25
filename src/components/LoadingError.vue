<template>
  <view v-if="show" class="error-container" @click="retryWithLogging">
    <view class="error-icon">
      <text class="iconfont icon-warning"></text>
    </view>
    <view class="error-text">{{ message }}</view>
    <view class="error-retry">点击屏幕重试</view>
    <view class="error-continue" @click.stop="dismissError">继续使用应用</view>
  </view>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: '数据加载失败'
  }
});

const emit = defineEmits(['retry', 'dismiss']);

// 添加自动重试逻辑
const retryCount = ref(0);
const MAX_AUTO_RETRIES = 2;
const autoRetryTimer = ref(null);

// 当错误显示时启动自动重试
watch(() => props.show, (newVal) => {
  if (newVal) {
    console.log('错误显示，将在3秒后自动重试');
    setupAutoRetry();
  } else {
    clearAutoRetry();
    retryCount.value = 0;
  }
});

const setupAutoRetry = () => {
  clearAutoRetry();
  if (retryCount.value < MAX_AUTO_RETRIES) {
    autoRetryTimer.value = setTimeout(() => {
      retryWithLogging();
    }, 3000);
  }
};

const clearAutoRetry = () => {
  if (autoRetryTimer.value) {
    clearTimeout(autoRetryTimer.value);
    autoRetryTimer.value = null;
  }
};

const retryWithLogging = (event) => {
  console.log('执行重试操作，重试次数:', retryCount.value + 1);
  retryCount.value++;
  
  // 防止冒泡
  if (event) {
    event.stopPropagation();
  }
  
  // 重试
  emit('retry');
  
  // 如果未达到最大重试次数，设置下一次自动重试
  if (retryCount.value < MAX_AUTO_RETRIES) {
    setupAutoRetry();
  }
};

const dismissError = (event) => {
  console.log('用户选择继续使用应用，忽略错误');
  clearAutoRetry();
  
  // 防止冒泡
  if (event) {
    event.stopPropagation();
  }
  
  emit('dismiss');
};

// 组件卸载时清理定时器
onMounted(() => {
  if (props.show) {
    setupAutoRetry();
  }
});
</script>

<style>
.error-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.error-icon {
  font-size: 50px;
  color: #ff4d4f;
  margin-bottom: 20px;
}

.error-text {
  font-size: 18px;
  color: #333;
  margin-bottom: 10px;
  text-align: center;
}

.error-retry {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
}

.error-continue {
  margin-top: 20px;
  padding: 8px 16px;
  background-color: #4F46E5;
  color: white;
  border-radius: 4px;
  font-size: 14px;
}
</style> 