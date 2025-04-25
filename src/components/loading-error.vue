<template>
  <view class="loading-error" v-if="show">
    <view class="error-container">
      <text class="error-icon">!</text>
      <text class="error-text">{{ message || '加载失败' }}</text>
      <view class="error-actions">
        <button class="retry-btn" @click="$emit('retry')">重试</button>
        <button class="dismiss-btn" @click="$emit('dismiss')">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'LoadingError',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: '加载失败'
    }
  },
  emits: ['retry', 'dismiss']
}
</script>

<style scoped>
.loading-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  max-width: 80%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.error-icon {
  width: 60px;
  height: 60px;
  background-color: #ff4d4f;
  color: white;
  font-size: 36px;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  margin-bottom: 20px;
}

.error-text {
  font-size: 16px;
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

.error-actions {
  display: flex;
  justify-content: center;
  width: 100%;
}

.retry-btn {
  background-color: #4F46E5;
  color: white;
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 20px;
  margin-right: 10px;
}

.dismiss-btn {
  background-color: #f5f5f5;
  color: #666;
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 20px;
}
</style> 