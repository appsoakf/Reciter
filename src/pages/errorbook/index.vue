<template>
  <view class="container">
    <!-- 页面内容区域 -->
    <view class="content-container">
      <!-- 搜索框 -->
      <view class="search-bar">
        <view class="search-box">
          <text class="icon">🔍</text>
          <input 
            type="text" 
            v-model="searchText" 
            placeholder="搜索" 
            @input="onSearch"
          />
          <text v-if="searchText" class="icon" @click="clearSearch">✖</text>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="action-bar">
        <button class="add-btn" @click="showAddModal = true">
          <text class="icon">+</text> 添加
        </button>
      </view>
      
      <!-- 错误记录列表 -->
      <scroll-view 
        class="error-list" 
        scroll-y 
        @scroll="onScroll"
        :scroll-with-animation="true"
        :enable-back-to-top="true"
        :show-scrollbar="true"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        :refresher-threshold="80"
        :refresher-background="'#f5f7fa'"
        :scroll-top="scrollTop"
        @refresherpulling="onPulling"
        @refresherrefresh="onRefresh"
        @refresherrestore="onRestore"
        @refresherabort="onAbort"
        @scrolltolower="onScrollToLower"
      >
        <!-- 检查错误记录列表是否有数据 -->
        <template v-if="errorList && errorList.length > 0">
          <view 
            v-for="(error, index) in filteredErrorList" 
            :key="error.id" 
            class="error-item"
          >
            <view class="error-content" @click="viewErrorDetail(error)">
              <view class="error-title">{{ error.content }}</view>
              <view class="error-note" v-if="error.note">备注: {{ error.note }}</view>
              <view class="error-date">{{ formatDate(error.createTime) }}</view>
            </view>
            <view class="error-actions">
              <text class="icon icon-edit" @click="editError(error)">✏️</text>
              <text class="icon icon-delete" @click="confirmDelete(error)">🗑️</text>
            </view>
          </view>
        </template>
        
        <!-- 无错误记录数据 -->
        <view v-else-if="errorList.length === 0 && !isLoading" class="empty-result">
          <image src="/static/images/empty.png" mode="aspectFit"></image>
          <text>错题本为空</text>
          <text class="empty-tip">点击"添加"按钮添加内容</text>
        </view>
        
        <!-- 无搜索结果 -->
        <view v-else-if="filteredErrorList && filteredErrorList.length === 0 && searchText && !isLoading" class="empty-result">
          <image src="/static/images/empty.png" mode="aspectFit"></image>
          <text>没有找到匹配的错误记录</text>
          <button class="small-btn" @click="clearSearch">清除搜索</button>
        </view>
        
        <!-- 底部加载状态 -->
        <view class="loading-more" v-if="errorList.length > 0">
          <text>- 已经到底了 -</text>
        </view>
      </scroll-view>
    </view>
    
    <!-- 添加/编辑错误记录弹窗 -->
    <view class="modal" v-if="showAddModal">
      <view class="modal-content">
        <view class="modal-header">
          <text>{{ showEditModal ? '编辑错误记录' : '添加错误记录' }}</text>
          <text class="icon" @click="closeModal">✖</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="label">内容</text>
            <textarea 
              v-model="currentError.content" 
              placeholder="输入错误内容"
              class="textarea"
            />
          </view>
          <view class="form-item">
            <text class="label">备注</text>
            <textarea 
              v-model="currentError.note" 
              placeholder="输入备注（可选）"
              class="textarea"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="cancel-btn" @click="closeModal">取消</button>
          <button class="submit-btn" @click="saveError">保存</button>
        </view>
      </view>
    </view>
    
    <!-- 删除确认弹窗 -->
    <view class="modal" v-if="showDeleteModal">
      <view class="modal-content">
        <view class="modal-header">
          <text>删除错误记录</text>
          <text class="icon" @click="showDeleteModal = false">✖</text>
        </view>
        <view class="modal-body">
          <text>确定要删除这个错误记录吗？</text>
          <text class="delete-title">{{ currentError.content }}</text>
        </view>
        <view class="modal-footer">
          <button class="cancel-btn" @click="showDeleteModal = false">取消</button>
          <button class="delete-btn" @click="deleteError">删除</button>
        </view>
      </view>
    </view>
    
    <!-- 详情弹窗 -->
    <view class="modal" v-if="showDetailModal">
      <view class="modal-content detail-modal">
        <view class="modal-header">
          <text>错误详情</text>
          <text class="icon" @click="showDetailModal = false">✖</text>
        </view>
        <view class="modal-body">
          <view class="detail-title">{{ currentError.content }}</view>
          <view class="detail-note" v-if="currentError.note">
            <text class="note-label">备注：</text>
            {{ currentError.note }}
          </view>
          <view class="detail-date">记录时间：{{ formatDate(currentError.createTime) }}</view>
          <view class="detail-date" v-if="currentError.updateTime">更新时间：{{ formatDate(currentError.updateTime) }}</view>
        </view>
        <view class="modal-footer">
          <button class="cancel-btn" @click="showDetailModal = false">关闭</button>
          <button class="edit-btn" @click="editError(currentError)">编辑</button>
        </view>
      </view>
    </view>

    <!-- 加载错误提示 -->
    <loading-error 
      :show="showError" 
      :message="errorMessage" 
      @retry="loadErrorBook"
      @dismiss="showError = false"
    />
  </view>
</template>

<script>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import * as ErrorBook from '@/services/errorbook';
import utils from '@/utils/common';
import LoadingError from '@/components/LoadingError.vue';

export default {
  components: {
    LoadingError
  },
  setup() {
    // 错误列表和过滤状态
    const errorList = ref([]);
    const searchText = ref('');
    const isLoading = ref(false);
    const isRefreshing = ref(false);
    const scrollTop = ref(0); // 控制滚动位置
    
    // 过滤后的错误列表
    const filteredErrorList = ref([]);
    
    // 实时监听搜索关键词变化
    const performSearch = async () => {
      try {
        if (!searchText.value) {
          filteredErrorList.value = errorList.value;
          return;
        }
        // 使用错误记录服务中的搜索功能
        const results = await ErrorBook.searchErrors(searchText.value);
        filteredErrorList.value = results;
      } catch (err) {
        console.error('搜索错误:', err);
        filteredErrorList.value = [];
      }
    };

    // 监听searchText变化
    const onSearch = async (e) => {
      searchText.value = e.detail.value;
      await performSearch();
    };

    // 弹窗相关状态
    const showAddModal = ref(false);
    const showEditModal = ref(false);
    const showDetailModal = ref(false);
    const showDeleteModal = ref(false);
    const currentError = ref({
      id: '',
      content: '',
      translation: '',
      word: '',
      note: '',
      createTime: '',
      updateTime: ''
    });

    // 错误处理状态
    const showError = ref(false);
    const errorMessage = ref('数据加载失败');

    // 滚动事件处理
    const onScroll = (e) => {
      // 记录滚动位置，便于回到同一位置
      const scrollTop = e.detail.scrollTop;
      // 可以根据滚动位置添加一些UI交互
      if (scrollTop > 100) {
        // 滚动超过一定距离可以添加回到顶部按钮等功能
      }
    };

    // 下拉刷新处理
    const onPulling = () => {
      // 用户下拉中
    };

    const onRefresh = () => {
      isRefreshing.value = true;
      loadData();
    };

    const onRestore = () => {
      isRefreshing.value = false;
    };

    const onAbort = () => {
      isRefreshing.value = false;
    };

    // 关闭弹窗
    const closeModal = () => {
      showAddModal.value = false;
      showEditModal.value = false;
      resetCurrentError();
    };

    // 重置当前错误记录
    const resetCurrentError = () => {
      currentError.value = {
        id: '',
        content: '',
        translation: '',
        word: '',
        note: '',
        createTime: '',
        updateTime: ''
      };
    };

    // 加载数据
    const loadData = async () => {
      if (isLoading.value) return;
      
      isLoading.value = true;
      try {
        // 从错误记录服务获取数据，使用Promise接口
        const data = await ErrorBook.getErrorList();
        
        errorList.value = data;
        // 初始化过滤列表
        filteredErrorList.value = data;
        updateHomePageCount();
        
        // 重置滚动位置
        setTimeout(() => {
          scrollTop.value = 0;
        }, 300);
      } catch (err) {
        console.error('加载错误本数据失败:', err);
        showError.value = true;
        errorMessage.value = '加载数据失败，请重试';
      } finally {
        isLoading.value = false;
        isRefreshing.value = false;
      }
    };

    // 更新主页计数
    const updateHomePageCount = () => {
      try {
        // 获取当前globalData
        const globalData = getApp().globalData || {};
        
        // 记录更新前的计数
        const oldCount = globalData.errorBookCount || 0;
        
        // 设置错误本计数
        globalData.errorBookCount = errorList.value.length;
        
        // 尝试触发UI更新（如果有相关事件机制）
        if (typeof globalData.updateCounters === 'function') {
          globalData.updateCounters();
        }
        
        // 额外保障措施：通过事件通知首页更新
        uni.$emit('errorbook-count-updated', {
          count: errorList.value.length
        });
      } catch (err) {
        console.error('更新主页错误本计数失败:', err);
      }
    };

    // 清空搜索
    const clearSearch = async () => {
      searchText.value = '';
      filteredErrorList.value = errorList.value;
      // 重置滚动位置
      scrollTop.value = 0;
    };

    // 编辑错误
    const editError = (error) => {
      currentError.value = { ...error };
      showDetailModal.value = false;
      showEditModal.value = true;
      showAddModal.value = true;
    };

    // 查看错误详情
    const viewErrorDetail = async (error) => {
      try {
        // 获取最新的错误详情
        const errorDetail = await ErrorBook.getErrorById(error.id);
        if (errorDetail) {
          currentError.value = errorDetail;
          showDetailModal.value = true;
        } else {
          uni.showToast({
            title: '记录不存在或已被删除',
            icon: 'none'
          });
        }
      } catch (err) {
        console.error('获取错误详情失败:', err);
        uni.showToast({
          title: '获取详情失败',
          icon: 'none'
        });
      }
    };

    // 显示删除确认
    const confirmDelete = (error) => {
      currentError.value = { ...error };
      showDeleteModal.value = true;
    };

    // 执行删除
    const deleteError = async () => {
      try {
        // 使用错误记录服务删除
        const success = await ErrorBook.deleteError(currentError.value.id);
        
        if (success) {
          // 先直接更新本地数据，不需要等待重新加载
          if (errorList.value.length > 0) {
            // 从本地列表中移除已删除的记录
            errorList.value = errorList.value.filter(item => item.id !== currentError.value.id);
            // 同时更新过滤后的列表
            filteredErrorList.value = filteredErrorList.value.filter(item => item.id !== currentError.value.id);
            // 立即更新首页计数
            updateHomePageCount();
          }
          
          // 然后再重新加载以保证数据一致性
          await loadData();
          showDeleteModal.value = false;
          
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } else {
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      } catch (err) {
        console.error('删除错误记录失败:', err);
        uni.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    };

    // 保存错误（新增或编辑）
    const saveError = async () => {
      // 表单验证
      if (!currentError.value.content.trim()) {
        uni.showToast({
          title: '内容不能为空',
          icon: 'none'
        });
        return;
      }

      try {
        let wasAdded = false;
        
        if (!currentError.value.id) {
          // 新增错误记录
          const result = await ErrorBook.addError(currentError.value);
          if (result) {
            // 本地添加记录
            if (result) {
              wasAdded = true;
              // 将新记录添加到本地列表最前面
              errorList.value.unshift(result);
              // 更新过滤后的列表
              if (!searchText.value) {
                filteredErrorList.value = [...errorList.value];
              }
              // 立即更新首页计数
              updateHomePageCount();
            }
            
            uni.showToast({
              title: '添加成功',
              icon: 'success'
            });
          } else {
            uni.showToast({
              title: '添加失败',
              icon: 'none'
            });
            return;
          }
        } else {
          // 更新错误记录
          const success = await ErrorBook.updateError(currentError.value);
          if (success) {
            // 本地更新记录
            const index = errorList.value.findIndex(item => item.id === currentError.value.id);
            if (index !== -1) {
              errorList.value[index] = { ...currentError.value };
              // 更新过滤后的列表
              const filteredIndex = filteredErrorList.value.findIndex(item => item.id === currentError.value.id);
              if (filteredIndex !== -1) {
                filteredErrorList.value[filteredIndex] = { ...currentError.value };
              }
            }
            
            uni.showToast({
              title: '更新成功',
              icon: 'success'
            });
          } else {
            uni.showToast({
              title: '更新失败',
              icon: 'none'
            });
            return;
          }
        }
        
        // 如果是添加操作，已经在上面更新了计数
        // 如果是编辑操作，计数不变，但我们仍然重新加载以保证数据一致性
        await loadData();
        closeModal();
      } catch (err) {
        console.error('保存错误记录失败:', err);
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    };

    // 格式化日期显示
    const formatDate = (isoString) => {
      return utils.formatDate(isoString);
    };

    // 错误重试处理
    const loadErrorBook = () => {
      showError.value = false;
      loadData();
    };

    // 滚动到底部触发事件
    const onScrollToLower = () => {
      console.log('滚动到底部');
      // 这里可以实现分页加载，当前暂不实现
      // 如果数据量大，可以考虑只加载部分数据，然后在滚动到底部时加载更多
    };

    // 初始化
    onMounted(() => {
      loadData();
      
      // 添加对refresh-errorbook事件的监听，用于接收清空数据和导入数据的通知
      uni.$on('refresh-errorbook', (event) => {
        console.log('收到错题本刷新事件:', event);
        
        // 立即刷新数据
        loadData();
        
        // 如果是清空操作，则重置UI状态
        if (event && event.cleared === true) {
          console.log('检测到清空数据事件，重置所有UI状态');
          // 关闭可能打开的弹窗
          showAddModal.value = false;
          showEditModal.value = false;
          showDetailModal.value = false;
          showDeleteModal.value = false;
          // 清空搜索
          searchText.value = '';
        }
      });
      
      // 添加对错题计数更新事件的监听
      uni.$on('errors-count-updated', (event) => {
        console.log('收到错题数量更新事件:', event);
        
        // 如果计数为0，可能是数据被清空，立即刷新
        if (event && event.count === 0) {
          console.log('错题数量为0，可能是数据被清空，立即刷新');
          loadData();
        }
      });
    });
    
    // 组件销毁前清理事件监听器
    onBeforeUnmount(() => {
      // 移除事件监听器
      uni.$off('refresh-errorbook');
      uni.$off('errors-count-updated');
    });

    return {
      errorList,
      filteredErrorList,
      searchText,
      isLoading,
      isRefreshing,
      scrollTop,
      showAddModal,
      showEditModal,
      showDetailModal,
      showDeleteModal,
      currentError,
      onSearch,
      clearSearch,
      editError,
      viewErrorDetail,
      confirmDelete,
      deleteError,
      saveError,
      formatDate,
      loadData,
      closeModal,
      showError,
      errorMessage,
      onScroll,
      onPulling,
      onRefresh,
      onRestore,
      onAbort,
      onScrollToLower,
      loadErrorBook
    };
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
  overflow: hidden; /* 防止整个页面出现滚动条 */
}

.content-container {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整个内容区域出现滚动条 */
}

.search-bar {
  padding: 10px 0;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 20px;
  padding: 5px 15px;
}

.search-box input {
  flex: 1;
  height: 30px;
  margin: 0 10px;
}

.icon {
  font-size: 16px;
  color: #666;
  padding: 5px;
  cursor: pointer;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 0;
}

.add-btn {
  background-color: #4F46E5;
  color: white;
  font-size: 14px;
  padding: 5px 15px;
  border-radius: 20px;
  line-height: 1.5;
}

.error-list {
  flex: 1;
  height: calc(100vh - 120px); /* 减去搜索栏和按钮栏的高度 */
  position: relative;
  -webkit-overflow-scrolling: touch; /* 增强iOS滚动体验 */
}

.error-item {
  background-color: white;
  margin-bottom: 10px;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  border-left: 4px solid #4F46E5;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  will-change: transform; /* 性能优化 */
  transform: translateZ(0); /* 启用GPU加速 */
}

.error-content {
  flex: 1;
}

.error-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.error-note {
  font-size: 13px;
  color: #888;
  margin-bottom: 5px;
  font-style: italic;
}

.error-date {
  font-size: 12px;
  color: #999;
}

.error-actions {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding-left: 15px;
}

.error-actions .icon {
  font-size: 20px;
  color: #666;
  padding: 5px;
}

.icon-edit {
  color: #4F46E5 !important;
}

.icon-delete {
  color: #dc2626 !important;
}

.empty-result {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 50px 0;
}

.empty-result image {
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
}

.empty-result text {
  color: #666;
  margin-bottom: 10px;
}

.empty-tip {
  font-size: 12px;
  color: #999;
}

.small-btn {
  font-size: 14px;
  padding: 5px 15px;
  margin-top: 10px;
  border-radius: 20px;
  background-color: #f5f5f5;
  color: #666;
}

/* 弹窗样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-content {
  width: 80%;
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
}

.detail-modal {
  max-height: 80%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 15px;
  max-height: 50vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 15px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.form-item {
  margin-bottom: 15px;
}

.label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input {
  width: 100%;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 0 10px;
}

.textarea {
  width: 100%;
  height: 100px;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
}

.cancel-btn {
  margin-right: 10px;
  background-color: #f5f5f5;
  color: #666;
}

.submit-btn {
  background-color: #4F46E5;
  color: white;
}

.delete-btn {
  background-color: #dc2626;
  color: white;
}

.edit-btn {
  background-color: #4F46E5;
  color: white;
}

.detail-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.detail-note {
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 5px;
  border-left: 3px solid #4F46E5;
}

.note-label {
  font-weight: bold;
  color: #555;
}

.detail-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
}

.delete-title {
  display: block;
  font-weight: bold;
  margin-top: 10px;
  color: #dc2626;
}

.loading-more {
  text-align: center;
  padding: 15px 0;
  color: #999;
  font-size: 12px;
}
</style> 