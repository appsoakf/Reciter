<template>
  <view class="progress-modal" v-if="visible">
    <view class="modal-content">
      <view class="modal-header">
        <text>{{ title }}</text>
      </view>
      <view class="modal-body">
        <view class="progress-info">
          <text class="progress-text">{{ currentStep }}</text>
          <text class="progress-count">{{ `${completedCount}/${totalCount}` }}</text>
        </view>
        <view class="progress-bar-container">
          <view class="progress-bar" :style="{ width: `${percentage}%` }"></view>
        </view>
        <view class="progress-message" v-if="message">{{ message }}</view>
      </view>
      <view class="modal-footer" v-if="showCancel">
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// 组件的props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '导入进度'
  },
  currentStep: {
    type: String,
    default: '处理中...'
  },
  completedCount: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  },
  message: {
    type: String,
    default: ''
  },
  showCancel: {
    type: Boolean,
    default: true
  }
});

// 事件
const emit = defineEmits(['cancel']);

// 计算进度百分比
const percentage = computed(() => {
  if (props.totalCount === 0) return 0;
  return Math.min((props.completedCount / props.totalCount) * 100, 100);
});

// 取消处理函数
const handleCancel = () => {
  emit('cancel');
};
</script>

<style>
.progress-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  width: 80%;
  max-width: 300px;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 15px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header text {
  font-size: 16px;
  font-weight: 500;
}

.modal-body {
  padding: 20px 15px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.progress-text {
  font-size: 14px;
  color: #333;
}

.progress-count {
  font-size: 14px;
  color: #666;
}

.progress-bar-container {
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-bar {
  height: 100%;
  background-color: #4F46E5; /* 与应用主色调一致 */
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-message {
  font-size: 12px;
  color: #666;
  margin-top: 10px;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding: 10px 15px 15px;
}

.cancel-btn {
  background-color: #f0f0f0;
  color: #333;
  font-size: 14px;
  padding: 6px 15px;
  border-radius: 4px;
  border: none;
}
</style> 