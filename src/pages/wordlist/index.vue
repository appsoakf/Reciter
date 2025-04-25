<template>
  <view class="container">
    <!-- 选择模式提示 -->
    <view v-if="mode === 'select'" class="select-tip">
      点击单词进行选择
    </view>
    
    <!-- 页面内容区域 -->
    <view class="content-container">
      <!-- 搜索框 -->
      <view class="search-bar">
        <view class="search-box">
          <text class="iconfont icon-search"></text>
          <input 
            type="text" 
            v-model="searchKeyword" 
            placeholder="搜索单词" 
            @input="handleSearch"
          />
          <text v-if="searchKeyword" class="iconfont icon-close" @click="clearSearch"></text>
        </view>
      </view>
      
      <!-- 单词列表 -->
      <scroll-view 
        class="word-list" 
        scroll-y 
        :scroll-into-view="scrollToView" 
        @scroll="onScroll"
        :scroll-with-animation="true"
        :enable-back-to-top="true"
        :show-scrollbar="true"
        :refresher-enabled="false"
      >
        <view v-if="filteredWords.length > 0">
          <view v-for="(group, letter) in groupedWords" :key="letter" :id="'letter-'+letter">
            <!-- 字母组标题 -->
            <view class="letter-title">{{ letter }}</view>
            
            <!-- 字母分组下的单词 -->
            <view 
              v-for="(word, index) in group" 
              :key="word.id" 
              class="word-item" 
              @click="handleWordClick(word)"
            >
              <view class="word-name">{{ word.name }}</view>
              <view class="word-meaning"><text class="word-pos">{{ word.pos }}</text> {{ word.meaning }}</view>
            </view>
          </view>
        </view>
        
        <!-- 无单词数据 -->
        <view v-else-if="filteredWords.length === 0 && !searchKeyword" class="empty-result">
          <image src="/static/images/empty.png" mode="aspectFit"></image>
          <text>单词列表为空</text>
          <text class="empty-tip">您已清空数据，单词列表为空</text>
        </view>
        
        <!-- 无搜索结果 -->
        <view v-else-if="filteredWords.length === 0 && searchKeyword" class="empty-result">
          <image src="/static/images/empty.png" mode="aspectFit"></image>
          <text>没有找到匹配的单词</text>
          <button class="small-btn" @click="clearSearch">清除搜索</button>
        </view>
      </scroll-view>
    </view>
    
    <!-- 字母索引栏 -->
    <view class="letter-index">
      <view 
        v-for="(letter, index) in letters" 
        :key="index" 
        class="letter-item" 
        :class="{ active: currentLetter === letter }" 
        @click="scrollToLetter(letter)"
      >
        {{ letter }}
      </view>
    </view>
    
    <!-- 右侧字母导航提示 -->
    <view v-if="showLetterTip" class="letter-tip">
      {{ currentLetter }}
    </view>

    <!-- 加载错误提示 -->
    <loading-error 
      :show="showError" 
      :message="errorMessage" 
      @retry="handleRetry"
      @dismiss="dismissError"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getWordList, getWordListSync, searchWords } from '@/services/word.js';
import LoadingError from '@/components/LoadingError.vue';
import { onLoad, onShow, onHide as pageHide } from '@/utils/uni-hooks.js';

// 导入mockWords和STORAGE_KEY常量
const STORAGE_KEY = 'reciter_words';
const mockWords = [
  { id: 1, name: 'apple', pos: 'n.', meaning: '苹果' },
  { id: 2, name: 'banana', pos: 'n.', meaning: '香蕉' },
  { id: 3, name: 'book', pos: 'n.', meaning: '书籍' },
  { id: 4, name: 'cat', pos: 'n.', meaning: '猫' },
  { id: 5, name: 'dog', pos: 'n.', meaning: '狗' },
  { id: 6, name: 'eat', pos: 'v.', meaning: '吃' },
  { id: 7, name: 'friend', pos: 'n.', meaning: '朋友' },
  { id: 8, name: 'go', pos: 'v.', meaning: '去' },
  { id: 9, name: 'happy', pos: 'adj.', meaning: '快乐的' },
  { id: 10, name: 'in', pos: 'prep.', meaning: '在...里' },
  { id: 11, name: 'jump', pos: 'v.', meaning: '跳跃' },
  { id: 12, name: 'kind', pos: 'adj.', meaning: '友善的' },
  { id: 13, name: 'love', pos: 'v./n.', meaning: '爱；喜爱' },
  { id: 14, name: 'moon', pos: 'n.', meaning: '月亮' },
  { id: 15, name: 'nice', pos: 'adj.', meaning: '好的；友好的' },
  { id: 16, name: 'open', pos: 'v./adj.', meaning: '打开；开着的' },
  { id: 17, name: 'pen', pos: 'n.', meaning: '钢笔' },
  { id: 18, name: 'question', pos: 'n.', meaning: '问题' },
  { id: 19, name: 'run', pos: 'v.', meaning: '跑' },
  { id: 20, name: 'sun', pos: 'n.', meaning: '太阳' },
  { id: 21, name: 'time', pos: 'n.', meaning: '时间' },
  { id: 22, name: 'umbrella', pos: 'n.', meaning: '雨伞' },
  { id: 23, name: 'very', pos: 'adv.', meaning: '非常' },
  { id: 24, name: 'water', pos: 'n.', meaning: '水' },
  { id: 25, name: 'xylophone', pos: 'n.', meaning: '木琴' },
  { id: 26, name: 'yellow', pos: 'adj.', meaning: '黄色的' },
  { id: 27, name: 'zoo', pos: 'n.', meaning: '动物园' },
];

// 单词数据
const wordList = ref([]);
const isLoading = ref(false); // 添加加载状态标记

// 错误处理状态
const showError = ref(false);
const errorMessage = ref('数据加载失败');

// 页面模式：normal(默认) 或 select(选择单词)
const mode = ref('normal');

// 搜索相关
const searchKeyword = ref('');
const searchDebounceTimer = ref(null); // 搜索防抖定时器

// 使用记忆化计算优化过滤单词性能
const filteredWords = computed(() => {
  if (!searchKeyword.value) return wordList.value;
  
  const keyword = searchKeyword.value.toLowerCase();
  // 针对空关键词跳过过滤
  if (!keyword.trim()) return wordList.value;
  
  return wordList.value.filter(word => 
    word.name.toLowerCase().includes(keyword) || 
    word.meaning.includes(keyword)
  );
});

// 按字母分组
const groupedWords = computed(() => {
  // 记忆化处理，减少计算量
  const cached = wordListCacheKey === getWordListCacheKey();
  if (cached && wordListGroupCache) {
    return wordListGroupCache;
  }
  
  const grouped = {};
  filteredWords.value.forEach(word => {
    const firstLetter = word.name.charAt(0).toUpperCase();
    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }
    grouped[firstLetter].push(word);
  });
  
  // 按字母顺序排序
  const result = Object.keys(grouped)
    .sort()
    .reduce((obj, key) => {
      obj[key] = grouped[key];
      return obj;
    }, {});
  
  // 缓存结果
  wordListGroupCache = result;
  wordListCacheKey = getWordListCacheKey();
  
  return result;
});

// 生成缓存键
const getWordListCacheKey = () => {
  return `${filteredWords.value.length}_${searchKeyword.value}`;
};

// 缓存相关变量
let wordListGroupCache = null;
let wordListCacheKey = '';

// 字母索引
const letters = computed(() => {
  // 确保始终至少返回一个字母，避免空数组
  const letterKeys = Object.keys(groupedWords.value);
  return letterKeys.length > 0 ? letterKeys : ['A'];
});

// 当前选中的字母和滚动视图
const currentLetter = ref('');
const scrollToView = ref('');
const showLetterTip = ref(false);
let letterTipTimer = null;
let scrollTimer = null; // 添加滚动节流计时器

// 滚动时检测当前字母区域
const onScroll = (e) => {
  // 滚动时不需要特殊处理，只需要简单防抖即可
  if (scrollTimer) return;
  
  scrollTimer = setTimeout(() => {
    scrollTimer = null;
  }, 100);
};

// 点击字母索引
const scrollToLetter = (letter) => {
  // 清除任何现有的定时器，防止冲突
  if (letterTipTimer) clearTimeout(letterTipTimer);
  if (scrollTimer) clearTimeout(scrollTimer);
  
  // 立即执行，不使用setTimeout，避免延迟响应
  currentLetter.value = letter;
  scrollToView.value = 'letter-' + letter;
  
  // 显示字母提示
  showLetterTip.value = true;
  letterTipTimer = setTimeout(() => {
    showLetterTip.value = false;
  }, 800);
};

// 处理搜索 - 添加防抖
const handleSearch = (e) => {
  const value = e.detail.value;
  
  // 防抖处理
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value);
  }
  
  searchDebounceTimer.value = setTimeout(() => {
    searchKeyword.value = value;
    // 重置缓存
    wordListCacheKey = '';
    wordListGroupCache = null;
    
    searchDebounceTimer.value = null;
  }, 300); // 300ms防抖
};

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = '';
};

// 处理单词点击，跳转到详情页
const handleWordClick = (word) => {
  // 判断是否为选择模式
  if (mode.value === 'select') {
    // 选择模式：返回上一页并传递选中的单词数据
    const selectedWord = {
      id: word.id,
      name: word.name,
      pos: word.pos
    };
    
    // 获取上一页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    // 如果是从添加单词页面来的，添加到相关单词
    if (prevPage && prevPage.route === 'pages/add/index') {
      prevPage.$vm.formData.relatedWords.push(selectedWord);
    }
    
    uni.navigateBack();
    return;
  }
  
  console.log('点击单词:', word.name);
  
  // 更新为详细记录跳转信息
  console.log('准备跳转到单词详情页, ID:', word.id, '类型:', typeof word.id);
  
  // 预先缓存单词数据到全局对象，加速详情页加载
  if (typeof uni.$wordPreloadCache === 'undefined') {
    uni.$wordPreloadCache = {};
  }
  uni.$wordPreloadCache[word.id] = word;
  
  // 尝试使用数字ID
  const numId = parseInt(word.id, 10);
  console.log('转换后的ID:', numId, '类型:', typeof numId);
  
  // 确保ID是有效数字
  if (isNaN(numId)) {
    console.error('无效ID，无法跳转');
    uni.showToast({
      title: '无效的单词ID',
      icon: 'none'
    });
    return;
  }
  
  navigateToDetail(numId);
};

// 独立跳转功能，确保传递正确ID
const navigateToDetail = (id) => {
  // 确保ID是数字
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numId)) {
    console.error('跳转失败: 无效ID');
    uni.showToast({
      title: '无法加载单词详情',
      icon: 'none'
    });
    return;
  }
  
  // 使用更完整的URL构造
  const url = `/pages/worddetail/index?id=${numId}`;
  console.log('跳转URL:', url);
  
  try {
    uni.navigateTo({
      url: url,
      success: () => {
        console.log('成功跳转到单词详情页, ID:', numId);
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        uni.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
        
        // 尝试使用redirectTo
        setTimeout(() => {
          console.log('尝试使用redirectTo方式跳转');
          uni.redirectTo({
            url: url,
            success: () => console.log('redirectTo成功'),
            fail: (err2) => console.error('redirectTo也失败:', err2)
          });
        }, 500);
      }
    });
  } catch (e) {
    console.error('跳转异常:', e);
    uni.showToast({
      title: '跳转出错',
      icon: 'none'
    });
  }
};

// 加载数据函数 - 增加节流保护
const loadData = () => {
  if (isLoading.value) {
    console.log('加载操作正在进行中，跳过重复加载');
    return;
  }
  
  try {
    isLoading.value = true;
    
    // 显示加载提示，除非已经有数据
    if (wordList.value.length === 0) {
      uni.showLoading({
        title: '加载中...',
        mask: true
      });
    }
    
    // 清理本页所有缓存
    wordListGroupCache = null;
    wordListCacheKey = '';
    
    // 确保清理全局预加载缓存
    clearPreloadCache();
    
    // 获取单词列表
    getWordList(true).then(wordsArray => {
      // 总是更新列表，以确保在清空数据后能立即反映变化
      wordList.value = wordsArray;
      
      // 重置缓存
      wordListCacheKey = '';
      wordListGroupCache = null;
      
      // 记录数据状态
      if (wordsArray.length > 0) {
        console.log('成功加载单词数据，数量:', wordsArray.length);
      } else {
        console.log('单词列表为空');
      }
      
      uni.hideLoading();
      isLoading.value = false; // 重置加载状态
    }).catch(err => {
      console.error('获取单词列表出错:', err);
      // 出错时不自动填充默认数据
      uni.hideLoading();
      isLoading.value = false; // 重置加载状态
    });
  } catch (err) {
    console.error('加载单词列表数据错误:', err);
    uni.hideLoading();
    isLoading.value = false; // 重置加载状态
  }
};

// 错误重试处理
const handleRetry = () => {
  console.log('用户点击重试');
  showError.value = false;
  loadData();
};

// 解除错误状态但不重新加载数据
const dismissError = () => {
  console.log('用户选择继续使用应用');
  showError.value = false;
};

// 每次页面显示时重新加载数据
onShow(() => {
  console.log('单词列表页面显示');
  // 每次显示页面时重新加载数据
  loadData();
});

// 页面加载时加载数据
onLoad((options) => {
  // 检查是否为选择模式
  if (options && options.mode === 'select') {
    mode.value = 'select';
  }
  
  // 预加载数据 - 使用无loading方式
  setTimeout(() => {
    if (!isLoading.value && wordList.value.length === 0) {
      getWordList().then(words => {
        // 只有当真正有数据时才更新列表，保持空数据状态
        if (Array.isArray(words) && words.length > 0) {
          wordList.value = words;
          console.log('预加载完成，数据数量:', words.length);
        } else {
          console.log('预加载完成，数据为空，保持空列表状态');
        }
      }).catch(err => {
        console.error('预加载出错:', err);
      });
    }
  }, 50);
  
  // 延迟一点执行完整的加载过程
  setTimeout(() => {
    loadData();
  }, 300);
});

// 添加缓存清理函数
const clearPreloadCache = () => {
  if (typeof uni.$wordPreloadCache !== 'undefined') {
    console.log('清理全局单词预加载缓存');
    uni.$wordPreloadCache = {};
  }
};

// 在组件卸载时清除事件监听和缓存，防止内存泄漏
onUnmounted(() => {
  console.log('单词列表页面卸载');
  
  if (typeof window !== 'undefined') {
    window.removeEventListener('error', errorHandler, true);
  }
  
  // 清除refresh事件监听
  uni.$off('refreshWordList');
  
  // 清除所有定时器
  if (letterTipTimer) clearTimeout(letterTipTimer);
  if (scrollTimer) clearTimeout(scrollTimer);
  if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value);
  
  // 清除缓存
  wordListGroupCache = null;
  
  // 清理预加载缓存
  clearPreloadCache();
});

// 当页面隐藏时清理缓存
pageHide(() => {
  console.log('单词列表页面隐藏');
  clearPreloadCache();
});

onMounted(() => {
  console.log('单词列表页面已挂载');
  
  // 添加刷新事件监听
  uni.$on('refreshWordList', (data) => {
    console.log('接收到刷新单词列表事件:', data);
    // 立即重新加载数据
    wordList.value = []; // 先清空当前列表
    loadData(); // 然后重新加载数据
  });
  
  // 注册全局错误处理器，防止页面崩溃
  if (typeof window !== 'undefined') {
    const errorHandler = (event) => {
      console.error('捕获到页面错误:', event.message);
      event.preventDefault();
      
      // 避免显示错误弹窗，而是使用toast
      if (!showError.value) {
        uni.showToast({
          title: '发生了一些问题，正在恢复...',
          icon: 'none',
          duration: 2000
        });
        
        // 移除自动恢复默认单词的逻辑，防止清空数据后被重新填充
        // 仅在真正的错误情况下才考虑恢复
        if (wordList.value.length === 0 && event.message && !event.message.includes('forceEmpty')) {
          console.log('尝试恢复基本功能，但不自动填充默认单词');
          // 不再自动填充默认单词
          // wordList.value = [...mockWords];
        }
      }
      
      return true;
    };
    
    window.addEventListener('error', errorHandler, true);
    
    // 组件卸载时清除事件监听，防止内存泄漏
    onUnmounted(() => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', errorHandler, true);
      }
      
      // 清除refresh事件监听
      uni.$off('refreshWordList');
      
      // 清除所有定时器
      if (letterTipTimer) clearTimeout(letterTipTimer);
      if (scrollTimer) clearTimeout(scrollTimer);
      if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value);
      
      // 清除缓存
      wordListGroupCache = null;
    });
  }
  
  // 如果没有数据，尝试加载
  if (wordList.value.length === 0 && !isLoading.value) {
    loadData();
  }
});
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  background-color: #f8f8f8;
  overflow: hidden;
}

.content-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* 选择模式提示 */
.select-tip {
  padding: 10px 15px;
  background-color: #4F46E5;
  color: #fff;
  font-size: 14px;
  text-align: center;
}

/* 搜索框样式 */
.search-bar {
  padding: 10px 15px;
  background-color: #fff;
  position: relative; /* 改为相对定位 */
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.search-box {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 20px;
  padding: 6px 12px;
}

.search-box input {
  flex: 1;
  height: 24px;
  margin: 0 10px;
  font-size: 14px;
}

.iconfont {
  font-size: 16px;
  color: #666;
}

/* 字母索引栏样式 */
.letter-index {
  position: fixed;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 15px;
  padding: 5px 0;
  pointer-events: auto; /* 确保事件能被捕获 */
}

.letter-item {
  padding: 3px 5px;
  font-size: 12px;
  color: #666;
  text-align: center;
  cursor: pointer; /* 显示点击光标 */
}

.letter-item.active {
  color: #4F46E5; /* indigo-600 */
  font-weight: bold;
}

/* 单词列表样式 */
.word-list {
  flex: 1;
  height: calc(100% - 56px); /* 减去搜索框高度 */
  position: relative;
}

.letter-title {
  padding: 8px 15px;
  background-color: #f0f0f0;
  font-size: 14px;
  color: #666;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 5;
}

.word-item {
  padding: 12px 15px;
  background-color: #fff;
  margin-bottom: 1px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.word-item:active {
  background-color: #f5f5f5;
}

.word-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.word-meaning {
  font-size: 14px;
  color: #666;
}

.word-pos {
  font-size: 12px;
  color: #888;
  margin-right: 5px;
  display: inline-block;
}

/* 字母提示 */
.letter-tip {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background-color: rgba(79, 70, 229, 0.8); /* indigo-600 */
  color: white;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 36px;
  font-weight: bold;
  z-index: 1000;
  pointer-events: none; /* 不拦截触摸事件 */
}

/* 空结果样式 */
.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
}

.empty-result image {
  width: 120px;
  height: 120px;
  margin-bottom: 15px;
}

.empty-result text {
  font-size: 14px;
  color: #999;
}

.empty-tip {
  font-size: 12px;
  color: #bbb;
  margin-top: 5px;
  margin-bottom: 15px;
}

.reset-btn {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #4F46E5;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
}

.small-btn {
  margin-top: 10px;
  padding: 5px 15px;
  background-color: #4F46E5;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
}
</style> 