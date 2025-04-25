<template>
  <view class="container">
    <!-- 单词头部区域 -->
    <view class="word-header" :class="{ 'loading': isLoading }">
      <view class="word-main">
        <view class="word-name" v-if="!isEditing">{{ word.name || '加载中...' }}</view>
        <input v-else class="word-name-input" v-model="editFormData.name" placeholder="输入单词" />
        <view class="word-pos-tag" v-if="!isEditing">{{ word.pos || '' }}</view>
        <view v-else class="pos-selection">
          <view 
            v-for="(item, index) in posOptions" 
            :key="index"
            class="pos-item-small"
            :class="{ 'active': editFormData.pos.includes(item.value) }"
            @click="togglePos(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>
      <!-- 添加刷新按钮 -->
      <view class="refresh-btn" @click="handleRefresh" v-if="!isLoading && !loadError.show && !isEditing">
        <text class="refresh-icon">↻</text>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-area" v-if="!isLoading && !loadError.show">
      <!-- 中文释义区块 -->
      <view class="detail-section">
        <view class="section-title">中文释义</view>
        <view class="section-content chinese-meaning" v-if="!isEditing">{{ word.meaning || '暂无释义' }}</view>
        <textarea v-else class="edit-textarea" v-model="editFormData.meaning" placeholder="输入中文释义"></textarea>
      </view>
      
      <!-- 例句区块 - 始终显示，没有数据时显示暂无例句 -->
      <view class="detail-section">
        <view class="section-title">
          例句 <span v-if="!isEditing && word.examples && word.examples.length">({{ word.examples.length }})</span>
          <text v-if="isEditing" class="add-btn" @click="addExample">+ 添加例句</text>
        </view>
        
        <!-- 查看模式 -->
        <view class="example-list" v-if="!isEditing && word.examples && word.examples.length > 0">
          <view class="example-item" v-for="(example, index) in word.examples" :key="index">
            <view class="example-number">{{ index + 1 }}</view>
            <view class="example-content">
              <view class="example-en">
                <text v-html="highlightWord(example.en, word.name)"></text>
              </view>
              <view class="example-zh">{{ example.zh }}</view>
            </view>
          </view>
        </view>
        
        <!-- 编辑模式 -->
        <view v-if="isEditing">
          <view 
            v-for="(example, index) in editFormData.examples" 
            :key="index"
            class="example-edit-item"
          >
            <view class="example-edit-header">
              <view class="example-number">{{ index + 1 }}</view>
              <view class="example-delete" @click="removeExample(index)">删除</view>
            </view>
            <textarea 
              class="edit-textarea" 
              v-model="example.en" 
              placeholder="输入英文例句"
            ></textarea>
            <textarea 
              class="edit-textarea" 
              v-model="example.zh" 
              placeholder="输入中文翻译"
            ></textarea>
          </view>
        </view>
        
        <view class="empty-module" v-if="(!isEditing && (!word.examples || word.examples.length === 0)) || (isEditing && editFormData.examples.length === 0)">
          暂无例句
        </view>
      </view>
      
      <!-- 相关单词区块 - 始终显示，没有数据时显示暂无相关单词 -->
      <view class="detail-section">
        <view class="section-title">
          相关单词 <span v-if="!isEditing && word.relatedWords && word.relatedWords.length">({{ word.relatedWords.length }})</span>
          <text v-if="isEditing" class="add-btn" @click="showSearchRelatedWord">+ 添加相关单词</text>
        </view>
        
        <!-- 查看模式 -->
        <view class="related-list" v-if="!isEditing && word.relatedWords && word.relatedWords.length > 0">
          <view 
            class="related-item" 
            v-for="(relatedWord, index) in word.relatedWords" 
            :key="index"
            @click="goToWordDetail(relatedWord.id)"
          >
            <view class="related-word-main">
              <text class="related-word-name">{{ relatedWord.name }}</text>
              <text class="related-pos" v-if="relatedWord.pos">{{ relatedWord.pos }}</text>
            </view>
            <view class="related-word-meaning">{{ relatedWord.meaning }}</view>
            <text class="related-arrow">→</text>
          </view>
        </view>
        
        <!-- 编辑模式 -->
        <view v-if="isEditing">
          <!-- 搜索单词弹窗 -->
          <view v-if="isSearchingRelatedWord" class="related-word-search">
            <view class="search-header">
              <input 
                class="search-input" 
                v-model="relatedWordSearch" 
                placeholder="输入单词名称搜索"
                focus
                @input="searchRelatedWord"
              />
              <text class="search-close" @click="cancelSearchRelatedWord">关闭</text>
            </view>
            <view class="search-results" v-if="relatedWordSearchResults.length > 0">
              <view 
                v-for="(result, index) in relatedWordSearchResults" 
                :key="index"
                class="search-result-item"
                @click="selectRelatedWord(result)"
              >
                <view class="result-word-name">{{ result.name }}</view>
                <view class="result-word-pos">{{ result.pos }}</view>
                <view class="result-word-meaning">{{ result.meaning }}</view>
              </view>
            </view>
            <view v-else class="no-search-results">
              <text>{{ relatedWordSearch ? '没有找到匹配的单词' : '请输入单词名称进行搜索' }}</text>
            </view>
          </view>
          
          <view 
            v-for="(relatedWord, index) in editFormData.relatedWords" 
            :key="index"
            class="related-edit-item"
          >
            <view class="related-edit-header">
              <view class="related-edit-number">{{ index + 1 }}</view>
              <view class="related-edit-delete" @click="removeRelatedWord(index)">删除</view>
            </view>
            <input 
              class="edit-input" 
              v-model="relatedWord.name" 
              placeholder="相关单词"
              disabled
            />
            <input 
              class="edit-input" 
              v-model="relatedWord.pos" 
              placeholder="词性"
              disabled
            />
            <input 
              class="edit-input" 
              v-model="relatedWord.meaning" 
              placeholder="中文释义"
              disabled
            />
          </view>
        </view>
        
        <view class="empty-module" v-if="(!isEditing && (!word.relatedWords || word.relatedWords.length === 0)) || (isEditing && editFormData.relatedWords.length === 0)">
          暂无相关单词
        </view>
      </view>
      
      <!-- 注意事项模块 - 始终显示，没有数据时显示暂无注意事项 -->
      <view class="detail-section">
        <view class="section-title">
          注意事项
          <text v-if="isEditing" class="add-btn" @click="addNote">+ 添加注意事项</text>
        </view>
        
        <!-- 查看模式 -->
        <view class="notes-list" v-if="!isEditing && word.notes && word.notes.length > 0">
          <view class="note-item" v-for="(note, index) in word.notes" :key="index">
            <view class="note-bullet">•</view>
            <view class="note-content">{{ note }}</view>
          </view>
        </view>
        
        <!-- 编辑模式 -->
        <view v-if="isEditing">
          <view 
            v-for="(note, index) in editFormData.notes" 
            :key="index"
            class="note-edit-item"
          >
            <view class="note-edit-header">
              <view class="note-bullet">•</view>
              <view class="note-edit-delete" @click="removeNote(index)">删除</view>
            </view>
            <textarea 
              class="edit-textarea" 
              v-model="editFormData.notes[index]" 
              placeholder="输入注意事项"
            ></textarea>
          </view>
        </view>
        
        <view class="empty-module" v-else-if="isEditing && (!editFormData.notes || editFormData.notes.length === 0)">
          暂无注意事项
        </view>
        <view class="empty-module" v-else-if="!isEditing && word.commonErrors && word.commonErrors.length > 0">
          <view class="note-item" v-for="(error, index) in word.commonErrors" :key="index">
            <view class="note-bullet error-bullet">✘</view>
            <view class="note-content">{{ error }}</view>
          </view>
        </view>
        <view class="empty-module" v-else-if="!isEditing && (!word.notes || word.notes.length === 0)">
          暂无注意事项
        </view>
      </view>
      
    </scroll-view>
    
    <!-- 骨架屏加载效果 -->
    <view class="skeleton" v-if="isLoading && !loadError.show">
      <view class="skeleton-section">
        <view class="skeleton-title"></view>
        <view class="skeleton-content"></view>
      </view>
      
      <view class="skeleton-section">
        <view class="skeleton-title"></view>
        <view class="skeleton-content"></view>
        <view class="skeleton-content"></view>
      </view>
      
      <view class="skeleton-section">
        <view class="skeleton-title"></view>
        <view class="skeleton-item"></view>
        <view class="skeleton-item"></view>
      </view>
    </view>
    
    <!-- 加载错误提示 -->
    <view class="error-container" v-if="loadError.show">
      <view class="error-icon">❌</view>
      <view class="error-message">{{ loadError.message }}</view>
      <view class="error-actions">
        <button class="retry-btn" @click="handleRetry">重试</button>
        <button class="back-btn" @click="dismissError">返回</button>
      </view>
    </view>
    
    <!-- 操作按钮区域 -->
    <view class="actions" :class="{ 'disabled': isLoading || loadError.show }">
      <button v-if="!isEditing" class="action-btn edit" @click="handleEdit" hover-class="btn-hover" :disabled="isLoading || loadError.show">编辑</button>
      <button v-else class="action-btn save" @click="handleSaveEdit" hover-class="btn-hover">保存</button>
      <button v-if="!isEditing" class="action-btn delete" @click="handleDelete" hover-class="btn-hover" :disabled="isLoading || loadError.show">删除</button>
      <button v-else class="action-btn cancel" @click="handleCancelEdit" hover-class="btn-hover">取消</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, reactive } from 'vue';
import { getWordById, getWordByIdSync, deleteWord as apiDeleteWord, updateWord, searchWords } from '@/services/word.js';
import LoadingError from '@/components/LoadingError.vue';
import { onLoad, onShow } from '@/utils/uni-hooks.js';

// 导入必要的常量
const STORAGE_KEY = 'reciter_words';

// 添加mock数据，确保相关单词模块可正常工作
const mockWords = [
  {
    id: 1,
    name: 'apple',
    pos: 'n.',
    meaning: '苹果',
    englishMeaning: 'a round fruit with red, yellow or green skin and firm white flesh',
    phonetic: '/ˈæpl/',
    examples: [
      {
        en: 'She took a bite of the apple.',
        zh: '她咬了一口苹果。'
      },
      {
        en: 'An apple a day keeps the doctor away.',
        zh: '一天一苹果，医生远离我。'
      }
    ],
    notes: [
      'apple除表示"苹果"外，也可用于短语"apple of one\'s eye"表示"心肝宝贝"',
      '用于成语"the apple doesn\'t fall far from the tree"表示"有其父必有其子"'
    ],
    relatedWords: [
      { id: 42, name: 'applesauce', pos: 'n.', meaning: '苹果酱' },
      { id: 43, name: 'applet', pos: 'n.', meaning: '小应用程序' },
      { id: 44, name: 'pineapple', pos: 'n.', meaning: '菠萝，凤梨' }
    ]
  },
  {
    id: 2,
    name: 'banana',
    pos: 'n.',
    meaning: '香蕉',
    englishMeaning: 'a long curved fruit with a yellow skin',
    phonetic: '/bəˈnɑːnə/',
    examples: [
      {
        en: 'I like to eat a banana for breakfast.',
        zh: '我喜欢早餐吃香蕉。'
      },
      {
        en: 'The monkey peeled the banana before eating it.',
        zh: '猴子在吃香蕉前先剥了皮。'
      }
    ],
    notes: [
      '香蕉在热带地区广泛种植',
      '成熟的香蕉会从绿色变为黄色'
    ],
    relatedWords: [
      { id: 45, name: 'plantain', pos: 'n.', meaning: '芭蕉' },
      { id: 46, name: 'fruit', pos: 'n.', meaning: '水果' }
    ]
  },
  {
    id: 3,
    name: 'book',
    pos: 'n./v.',
    meaning: '书；预订',
    englishMeaning: 'a written or printed work consisting of pages; to reserve something',
    phonetic: '/bʊk/',
    examples: [
      {
        en: 'I read a book about ancient history.',
        zh: '我读了一本关于古代历史的书。'
      },
      {
        en: 'Please book a table for dinner tonight.',
        zh: '请为今晚的晚餐预订一张桌子。'
      },
      {
        en: 'She likes to read books before going to sleep.',
        zh: '她喜欢睡前阅读书籍。'
      }
    ],
    notes: [
      'book作为名词表示"书籍"，作为动词表示"预订"',
      '常用短语：by the book（按规矩办事）、throw the book at（严惩）、in someone\'s book（在某人看来）'
    ],
    relatedWords: [
      { id: 47, name: 'bookcase', pos: 'n.', meaning: '书柜' },
      { id: 48, name: 'booklet', pos: 'n.', meaning: '小册子' },
      { id: 49, name: 'booking', pos: 'n.', meaning: '预订' },
      { id: 50, name: 'bookworm', pos: 'n.', meaning: '书虫；爱读书的人' }
    ]
  },
  {
    id: 4,
    name: 'pear',
    pos: 'n.',
    meaning: '梨',
    englishMeaning: 'a sweet fruit with a rounded bottom and slightly pointed top',
    phonetic: '/peər/',
    examples: [
      {
        en: 'The pear was sweet and juicy.',
        zh: '这个梨又甜又多汁。'
      },
      {
        en: 'Asian pears are more round than European pears.',
        zh: '亚洲梨比欧洲梨更圆。'
      }
    ],
    notes: [
      '梨有多种品种，形状和颜色各异',
      '常见的表达：pear-shaped（梨形的；失败的）'
    ],
    relatedWords: [
      { id: 51, name: 'fruit', pos: 'n.', meaning: '水果' },
      { id: 52, name: 'apple', pos: 'n.', meaning: '苹果' }
    ]
  },
  {
    id: 6,
    name: 'eat',
    pos: 'v.',
    meaning: '吃；进食',
    englishMeaning: 'to put food in your mouth and swallow it',
    phonetic: '/iːt/',
    examples: [
      {
        en: 'We usually eat dinner at 7 pm.',
        zh: '我们通常在晚上7点吃晚餐。'
      },
      {
        en: 'The children ate all the cookies.',
        zh: '孩子们吃光了所有的饼干。'
      },
      {
        en: 'I don\'t eat meat.',
        zh: '我不吃肉。'
      }
    ],
    notes: [
      'eat的过去式是ate，过去分词是eaten',
      '常用搭配：eat up（吃完）、eat out（在外就餐）、eat away at（逐渐侵蚀）',
      '表达"吃饭"时，可以说eat a meal或have a meal'
    ],
    relatedWords: [
      { id: 53, name: 'eatable', pos: 'adj.', meaning: '可食用的' },
      { id: 54, name: 'edible', pos: 'adj.', meaning: '可食用的' },
      { id: 55, name: 'feast', pos: 'n./v.', meaning: '盛宴；尽情享用' },
      { id: 56, name: 'devour', pos: 'v.', meaning: '狼吞虎咽；津津有味地读' }
    ]
  }
];

const word = ref({});
const wordId = ref(null);
const isLoading = ref(true);
const isPlaying = ref(false);
const isIdFromUrlProcessed = ref(false);
const loadError = ref({ 
  show: false, 
  message: '数据加载失败',
  details: '' 
});

// 添加编辑状态和表单数据
const isEditing = ref(false);
const editFormData = reactive({
  name: '',
  pos: [],
  meaning: '',
  // englishMeaning: '', // 已移除英文释义字段
  phonetic: '',
  examples: [],
  relatedWords: [],
  notes: []
});

// 词性选项
const posOptions = [
  { label: 'adj.', text: '形容词', value: 'adj.' },
  { label: 'adv.', text: '副词', value: 'adv.' },
  { label: 'n.', text: '名词', value: 'n.' },
  { label: 'v.', text: '动词', value: 'v.' },
  { label: 'prep.', text: '介词', value: 'prep.' },
  { label: 'conj.', text: '连词', value: 'conj.' },
  { label: 'pron.', text: '代词', value: 'pron.' },
  { label: 'num.', text: '数词', value: 'num.' },
  { label: 'art.', text: '冠词', value: 'art.' }
];

// 切换词性选择
const togglePos = (pos) => {
  const index = editFormData.pos.indexOf(pos);
  if (index === -1) {
    editFormData.pos.push(pos);
  } else {
    editFormData.pos.splice(index, 1);
  }
};

// 格式化的音标
const formattedPhonetic = computed(() => {
  if (!word.value || !word.value.phonetic) return '';
  return word.value.phonetic.replace(/^\/|\/$/g, '');
});

// 预处理的pos字符串
const processedPos = computed(() => {
  return editFormData.pos.join('/');
});

// 添加在例句中高亮单词的方法
const highlightWord = (text, keyword) => {
  if (!text || !keyword) return text;
  
  const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
};

// 播放单词发音
const playWordSound = () => {
  if (!word.value || !word.value.name || isPlaying.value) return;
  
  isPlaying.value = true;
  
  // 模拟发音服务API调用
  uni.showToast({
    title: '播放发音: ' + word.value.name,
    icon: 'none',
    duration: 1000
  });
  
  // 模拟播放完成
  setTimeout(() => {
    isPlaying.value = false;
  }, 1200);
  
  // 实际应用中可以这样实现：
  // const innerAudioContext = uni.createInnerAudioContext();
  // innerAudioContext.autoplay = true;
  // innerAudioContext.src = `https://dict.youdao.com/dictvoice?audio=${word.value.name}&type=1`;
  // innerAudioContext.onPlay(() => {
  //   isPlaying.value = true;
  // });
  // innerAudioContext.onEnded(() => {
  //   isPlaying.value = false;
  // });
  // innerAudioContext.onError(() => {
  //   isPlaying.value = false;
  //   uni.showToast({
  //     title: '播放失败',
  //     icon: 'none'
  //   });
  // });
};

// 添加检查网络连接状态的方法
const checkNetworkStatus = () => {
  return new Promise((resolve) => {
    try {
      uni.getNetworkType({
        success: (res) => {
          console.log('当前网络状态:', res.networkType);
          const isConnected = res.networkType !== 'none';
          resolve(isConnected);
        },
        fail: () => {
          console.error('获取网络状态失败');
          resolve(false);
        }
      });
    } catch (e) {
      console.error('检查网络错误:', e);
      resolve(false);
    }
  });
};

// 添加内存缓存
const wordCache = {};

// 增加一个紧急恢复函数
const emergencyRecover = () => {
  console.log('启动紧急恢复流程');
  
  try {
    // 检查是否设置了forceEmpty标志
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      try {
        const parsedData = JSON.parse(savedWordsStr);
        if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
          console.log('紧急恢复检测到forceEmpty标志，显示清空状态信息');
          
          loadError.value = {
            show: true,
            message: '单词数据已被清空',
            details: '请返回单词列表页面'
          };
          isLoading.value = false;
          
          return true;
        }
      } catch (error) {
        console.error('检查forceEmpty标志失败:', error);
      }
    }
    
    // 尝试直接加载第一个模拟单词
    if (mockWords && mockWords.length > 0) {
      const firstWord = mockWords[0];
      console.log('使用第一个模拟单词作为紧急恢复:', firstWord.name);
      
      word.value = firstWord;
      isLoading.value = false;
      loadError.value.show = false;
      
      // 显示轻微提示
      uni.showToast({
        title: '加载了默认单词',
        icon: 'none',
        duration: 2000
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('紧急恢复也失败了:', error);
    return false;
  }
};

// 强制更新单词数据 - 确保用最新的mockWords数据
const forceRefreshWord = (id) => {
  try {
    // 查找最新的单词数据
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    // 检查是否设置了forceEmpty标志
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      try {
        const parsedData = JSON.parse(savedWordsStr);
        if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
          console.log('forceRefreshWord检测到forceEmpty标志，停止刷新单词');
          return false;
        }
      } catch (parseError) {
        console.error('解析存储数据失败:', parseError);
      }
    }
    
    const latestWord = mockWords.find(w => w.id === numId);
    
    if (!latestWord) {
      console.warn(`在mockWords中找不到ID为${numId}的单词`);
      return false;
    }
    
    console.log(`找到最新的单词数据: ${latestWord.name}`);
    
    // 更新本地存储
    if (savedWordsStr) {
      try {
        let parsedData = JSON.parse(savedWordsStr);
        
        // 处理不同的存储格式
        if (Array.isArray(parsedData)) {
          // 找到并替换单词
          const index = parsedData.findIndex(w => w.id === numId);
          
          if (index >= 0) {
            // 替换单词
            parsedData[index] = { ...latestWord };
            console.log(`替换了本地存储中的单词: ${latestWord.name}`);
          } else {
            // 添加单词
            parsedData.push({ ...latestWord });
            console.log(`添加了新单词到本地存储: ${latestWord.name}`);
          }
          
          // 保存回本地存储
          uni.setStorageSync(STORAGE_KEY, JSON.stringify(parsedData));
          console.log('成功更新本地存储');
          
          return true;
        }
        else if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.words)) {
          // 处理新格式 {words: [...], forceEmpty: boolean}
          const index = parsedData.words.findIndex(w => w.id === numId);
          
          if (index >= 0) {
            // 替换单词
            parsedData.words[index] = { ...latestWord };
            console.log(`替换了本地存储中的单词: ${latestWord.name}`);
          } else {
            // 添加单词
            parsedData.words.push({ ...latestWord });
            console.log(`添加了新单词到本地存储: ${latestWord.name}`);
          }
          
          // 保存回本地存储，保留forceEmpty标志
          uni.setStorageSync(STORAGE_KEY, JSON.stringify(parsedData));
          console.log('成功更新本地存储');
          
          return true;
        }
      } catch (e) {
        console.error('解析或更新本地存储失败:', e);
      }
    }
    
    // 如果上面的尝试失败或本地存储为空，直接用完整的mockWords初始化存储
    uni.setStorageSync(STORAGE_KEY, JSON.stringify([latestWord]));
    console.log('已初始化本地存储为单个单词');
    
    return true;
  } catch (e) {
    console.error('强制更新单词数据失败:', e);
    return false;
  }
};

// 更可靠的单词详情加载逻辑
const loadWordDetail = async (retryCount = 0, maxRetries = 3) => {
  if (!wordId.value) {
    console.error('加载失败：wordId 为空或无效');
    loadError.value = {
      show: true,
      message: '无效的单词ID，请返回后重试',
      details: '参数错误'
    };
    
    // 尝试紧急恢复
    if (emergencyRecover()) {
      console.log('紧急恢复成功，显示默认单词');
      return;
    }
    
    isLoading.value = false;
    return;
  }
  
  // 检查是否设置了forceEmpty标志
  try {
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      const parsedData = JSON.parse(savedWordsStr);
      if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
        console.log('loadWordDetail检测到forceEmpty标志，不加载单词并返回错误');
        
        isLoading.value = false;
        loadError.value = {
          show: true,
          message: '单词数据已被清空',
          details: '请返回单词列表页面'
        };
        return;
      }
    }
  } catch (error) {
    console.error('检查forceEmpty标志失败:', error);
  }
  
  console.log(`开始加载单词详情，ID:${wordId.value}，尝试次数:${retryCount + 1}/${maxRetries + 1}`);
  isLoading.value = true;
  loadError.value.show = false;

  // 先尝试从预加载缓存中获取
  if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
    console.log('从全局预加载缓存获取单词数据:', uni.$wordPreloadCache[wordId.value].name);
    const cachedWord = uni.$wordPreloadCache[wordId.value];
    
    // 确保单词有基本属性
    if (!cachedWord.examples) cachedWord.examples = [];
    if (!cachedWord.relatedWords) cachedWord.relatedWords = [];
    if (!cachedWord.notes) cachedWord.notes = [];
    
    word.value = cachedWord;
    // 将结果存入内存缓存
    wordCache[wordId.value] = cachedWord;
    isLoading.value = false;
    
    // 异步预加载相邻单词
    setTimeout(() => {
      preloadAdjacentWords(wordId.value);
    }, 100);
    
    return;
  }

  // 优先检查内存缓存
  if (wordCache[wordId.value]) {
    // 在清空数据后，我们不应该依赖缓存
    // 因此先检查本地存储中是否还有这个单词
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      try {
        // 解析存储的数据
        const parsedData = JSON.parse(savedWordsStr);
        // 获取单词列表
        const words = Array.isArray(parsedData) ? parsedData : 
                     (parsedData && Array.isArray(parsedData.words) ? parsedData.words : null);
        
        if (words) {
          // 检查单词是否还存在于本地存储中
          const wordStillExists = words.some(w => w.id === wordId.value);
          
          if (!wordStillExists) {
            // 如果单词已不存在，清除缓存
            console.log(`单词ID ${wordId.value} 不再存在于本地存储中，清除缓存`);
            delete wordCache[wordId.value];
          } else {
            // 单词仍然存在，可以使用缓存
            console.log('从缓存加载单词详情:', wordCache[wordId.value].name);
            word.value = wordCache[wordId.value];
            isLoading.value = false;
            return;
          }
        }
      } catch (error) {
        console.error('检查单词是否存在失败:', error);
        // 出错时清除缓存，确保安全
        delete wordCache[wordId.value];
      }
    } else {
      // 如果本地存储为空，清除所有缓存
      console.log('本地存储为空，清除所有缓存');
      Object.keys(wordCache).forEach(key => delete wordCache[key]);
    }
  }

  try {
    console.log('从存储中加载单词...');
    // 使用Promise.race设置超时机制
    const result = await Promise.race([
      loadWordDetailFromStorage(wordId.value),
      new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 3000)) // 减少超时时间
    ]);
    
    console.log('从存储中加载结果:', result ? result.name : '无结果');
    
    if (!result) {
      console.error('加载结果为空');
      throw new Error('找不到单词详情');
    }
    
    word.value = result;
    // 将结果存入内存缓存
    wordCache[wordId.value] = result;
    isLoading.value = false;
    
    // 异步预加载相邻单词，不影响当前单词加载速度
    setTimeout(() => {
      preloadAdjacentWords(wordId.value);
    }, 100);
    
    // 详细记录加载的单词信息
    console.log('单词详情加载成功:', result.name);
    
  } catch (error) {
    console.error(`加载单词详情失败(ID:${wordId.value})，错误:`, error);
    isLoading.value = false;
    
    // 如果是因为数据被清空，显示特定的错误信息
    if (error.message && error.message.includes('数据已被清空')) {
      loadError.value = {
        show: true,
        message: '单词数据已被清空',
        details: '请返回单词列表页面'
      };
      return;
    }
    
    // 处理未找到单词的错误
    if (error.notFound) {
      console.log(`ID为${wordId.value}的单词在本地存储中不存在，尝试从mockWords查找`);
      
      // 尝试从mockWords中查找
      const mockWord = mockWords.find(item => item.id === wordId.value);
      if (mockWord) {
        console.log(`在mockWords中找到单词: ${mockWord.name}，但本地存储中没有这个单词`);
        
        loadError.value = {
          show: true,
          message: `ID为${wordId.value}的单词在您的单词库中不存在`,
          details: `您可能尝试访问的是示例单词"${mockWord.name}"，但它不在您的单词库中`
        };
        return;
      }
    }
    
    // 显示加载错误提示
    loadError.value = {
      show: true,
      message: `加载失败: ${error.message || '未知错误'}`,
      details: error.stack
    };
    
    // 尝试应急恢复
    if (retryCount >= maxRetries) {
      console.log('已达到最大重试次数，尝试紧急恢复');
      if (emergencyRecover()) {
        return;
      }
    }
    
    // 处理特定错误情况
    if (error.message.includes('找不到单词') || error.message.includes('无效ID')) {
      // 尝试恢复
      if (emergencyRecover()) {
        return;
      }
      
      uni.showToast({ title: '找不到该单词', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
      return;
    }
    
    // 超过最大重试次数，返回上一页
    if (retryCount >= maxRetries) {
      uni.showToast({ 
        title: '加载失败，将返回上一页', 
        icon: 'none', 
        duration: 2000 
      });
      
      setTimeout(() => uni.navigateBack(), 2000);
      return;
    }
    
    // 重试加载
    console.log(`准备进行第${retryCount + 2}次尝试...`);
    loadWordDetail(retryCount + 1, maxRetries);
  }
};

// 从存储加载单词详情的助手方法
const loadWordDetailFromStorage = (id) => {
  return new Promise((resolve, reject) => {
    console.log(`尝试从本地存储加载ID为${id}的单词详情`);
    
    try {
      // 从本地存储加载单词数据
      const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
      console.log(`从本地存储加载单词数据，存储状态: ${!!savedWordsStr}`);
      
      if (!savedWordsStr) {
        console.error('本地存储中没有单词数据');
        reject(new Error('本地存储中没有单词数据'));
        return;
      }
      
      try {
        let data = JSON.parse(savedWordsStr);
        let words;
        
        // 确定数据格式
        if (Array.isArray(data)) {
          console.log('检测到旧格式存储数据（数组）');
          words = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.words)) {
          console.log('检测到新格式存储数据（对象包含words数组）');
          words = data.words;
        } else {
          console.error('未识别的存储数据格式');
          reject(new Error('单词数据格式错误'));
          return;
        }
        
        // 确保ID是数字类型
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        console.log(`查找ID为${numId}的单词，ID类型: ${typeof numId}`);
        
        // 查找单词
        const wordData = words.find(item => item.id === numId);
        
        if (wordData) {
          console.log(`找到ID为${numId}的单词: ${wordData.name}`);
          resolve(wordData);
        } else {
          console.error(`未找到ID为${numId}的单词`);
          const err = new Error(`找不到ID为${numId}的单词`);
          err.notFound = true;
          reject(err);
        }
      } catch (parseError) {
        console.error('解析单词数据失败:', parseError);
        reject(new Error('解析单词数据失败: ' + parseError.message));
      }
    } catch (error) {
      console.error('加载单词详情时出错:', error, error.stack);
      reject(error);
    }
  });
};

// 预加载相邻单词
const preloadAdjacentWords = async (currentId) => {
  try {
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (!savedWordsStr) return;
    
    // 检查是否设置了forceEmpty标志
    const parsedData = JSON.parse(savedWordsStr);
    if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
      console.log('预加载发现forceEmpty标志，取消预加载操作');
      return;
    }
    
    // 根据存储格式获取单词列表
    const words = Array.isArray(parsedData) ? parsedData : 
                 (parsedData && Array.isArray(parsedData.words) ? parsedData.words : null);
    
    if (!Array.isArray(words)) return;
    
    // 找到当前单词的索引
    const currentIndex = words.findIndex(w => w.id === currentId);
    if (currentIndex === -1) return;
    
    // 预加载前后各2个单词
    const preloadIndexes = [
      currentIndex - 2, 
      currentIndex - 1, 
      currentIndex + 1, 
      currentIndex + 2
    ].filter(idx => idx >= 0 && idx < words.length);
    
    console.log('预加载相邻单词:', preloadIndexes.map(idx => words[idx].name).join(', '));
    
    // 存入缓存
    preloadIndexes.forEach(idx => {
      const word = words[idx];
      if (word && !wordCache[word.id]) {
        wordCache[word.id] = word;
      }
    });
  } catch (error) {
    console.error('预加载相邻单词失败:', error);
  }
};

// 记录错误指标的助手方法
const logErrorMetric = (type, data) => {
  console.error(`[错误指标] ${type}:`, data);
  // 这里可以实现实际的指标收集逻辑，如发送到本地存储或服务器
  try {
    const metrics = uni.getStorageSync('ERROR_METRICS') || '[]';
    const metricsArray = JSON.parse(metrics);
    metricsArray.push({
      type,
      data,
      timestamp: Date.now()
    });
    // 只保留最近100条记录
    if (metricsArray.length > 100) {
      metricsArray.shift();
    }
    uni.setStorageSync('ERROR_METRICS', JSON.stringify(metricsArray));
  } catch (e) {
    console.error('记录错误指标失败:', e);
  }
};

// 重试加载
const handleRetry = () => {
  console.log('用户点击重试加载');
  loadError.value.show = false;
  
  // 先检查ID
  if (!wordId.value) {
    console.error('wordId无效，尝试使用默认ID');
    // 尝试使用默认ID
    if (mockWords && mockWords.length > 0) {
      wordId.value = mockWords[0].id;
      console.log('设置了默认ID:', wordId.value);
    } else {
      uni.showToast({ title: '无法加载默认单词', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
      return;
    }
  }
  
  // 尝试加载
  loadWordDetail(0, 3);
};

// 修复LoadingError组件的dismiss事件处理
function dismissError() {
  console.log('dismissError被调用');
  loadError.value.show = false;
  // 返回上一页
  uni.navigateBack();
}

// 跳转到关联单词详情
const goToWordDetail = (id) => {
  if (!id) {
    console.error('无效的单词ID，无法跳转');
    uni.showToast({
      title: '无法加载单词',
      icon: 'none'
    });
    return;
  }
  
  console.log(`准备跳转到单词ID: ${id}，类型: ${typeof id}`);
  
  // 清除相关缓存，确保加载新数据
  if (wordCache[id]) {
    console.log(`清除ID为${id}的缓存`);
    delete wordCache[id];
  }
  
  // 获取本地存储的单词列表
  try {
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      const parsedData = JSON.parse(savedWordsStr);
      const words = Array.isArray(parsedData) ? parsedData : 
                   (parsedData && Array.isArray(parsedData.words) ? parsedData.words : []);
      
      // 尝试从本地单词库中查找目标单词
      const targetWord = words.find(w => w.id === id);
      if (targetWord) {
        console.log(`目标单词存在于本地单词库中: ${targetWord.name}`);
      } else {
        console.warn(`ID为${id}的单词在本地单词库中不存在`);
        
        // 尝试从mockWords中查找，用于提示用户
        const mockWord = mockWords.find(w => w.id === id);
        if (mockWord) {
          console.warn(`ID为${id}的单词在mockWords中存在(${mockWord.name})，但不在本地单词库中`);
          
          uni.showModal({
            title: '单词不存在',
            content: `您尝试访问的单词"${mockWord.name}"不在您的单词库中，是否仍要继续？`,
            confirmText: '继续',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 用户选择继续，执行跳转
                performNavigate(id);
              }
            }
          });
          return;
        }
      }
    }
  } catch (error) {
    console.error('检查本地单词库出错:', error);
  }
  
  // 执行跳转
  performNavigate(id);
};

// 实际执行导航跳转的函数
const performNavigate = (id) => {
  // 构建跳转URL，确保ID是数字格式
  const url = `/pages/worddetail/index?id=${id}`;
  console.log(`跳转URL: ${url}`);
  
  // 清除全局的处理标记，确保新页面可以正确处理ID
  isIdFromUrlProcessed.value = false;
  
  uni.navigateTo({
    url: url,
    success: () => {
      console.log(`成功跳转到单词ID: ${id}`);
    },
    fail: (err) => {
      console.error('跳转失败:', err);
      uni.showToast({
        title: '跳转失败',
        icon: 'none'
      });
    }
  });
};

// 编辑单词 - 修改为直接在页面内编辑
const handleEdit = () => {
  try {
    if (!word.value || !word.value.id) {
      uni.showToast({ title: '单词信息不完整，无法编辑', icon: 'none' });
      return;
    }
    
    // 设置编辑模式
    isEditing.value = true;
    
    // 填充表单数据
    editFormData.name = word.value.name || '';
    editFormData.meaning = word.value.meaning || '';
    // 英文释义已移除
    editFormData.phonetic = word.value.phonetic || '';
    
    // 处理词性 - 可能是字符串或数组
    if (typeof word.value.pos === 'string') {
      editFormData.pos = word.value.pos.split('/').filter(Boolean);
    } else if (Array.isArray(word.value.pos)) {
      editFormData.pos = [...word.value.pos];
    } else {
      editFormData.pos = [];
    }
    
    // 复制例句数组
    editFormData.examples = Array.isArray(word.value.examples) 
      ? JSON.parse(JSON.stringify(word.value.examples))
      : [];
    
    // 复制相关单词数组
    editFormData.relatedWords = Array.isArray(word.value.relatedWords) 
      ? JSON.parse(JSON.stringify(word.value.relatedWords))
      : [];
    
    // 复制注意事项数组
    editFormData.notes = Array.isArray(word.value.notes) 
      ? JSON.parse(JSON.stringify(word.value.notes))
      : [];
    
    console.log('进入编辑模式，表单数据:', editFormData);
  } catch (err) {
    console.error('处理编辑操作失败:', err);
    uni.showToast({ title: '操作失败，请重试', icon: 'none' });
  }
};

// 保存编辑
const handleSaveEdit = async () => {
  try {
    // 表单验证 - 单词名称
    if (!editFormData.name || editFormData.name.trim() === '') {
      uni.showToast({
        title: '请输入单词',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 表单验证 - 词性
    if (editFormData.pos.length === 0) {
      uni.showToast({
        title: '请选择至少一个词性',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 表单验证 - 中文释义
    if (!editFormData.meaning || editFormData.meaning.trim() === '') {
      uni.showToast({
        title: '请输入中文释义',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 显示加载提示
    uni.showLoading({ 
      title: '保存修改...',
      mask: true
    });
    
    // 构建要保存的单词对象
    const wordToSave = {
      id: word.value.id,
      name: editFormData.name,
      pos: processedPos.value,
      meaning: editFormData.meaning,
      // englishMeaning: '',  // 英文释义固定为空
      phonetic: editFormData.phonetic || '',
      examples: editFormData.examples || [],
      relatedWords: editFormData.relatedWords || [],
      notes: editFormData.notes || []
    };
    
    // 获取需要建立双向关联的单词ID列表
    const originalRelatedWordIds = word.value.relatedWords?.map(w => w.id) || [];
    const newRelatedWordIds = editFormData.relatedWords.map(w => w.id);
    
    // 确定新增的关联单词
    const addedRelatedWordIds = newRelatedWordIds.filter(id => !originalRelatedWordIds.includes(id));
    
    // 确定移除的关联单词
    const removedRelatedWordIds = originalRelatedWordIds.filter(id => !newRelatedWordIds.includes(id));
    
    // 保存当前单词
    await updateWord(wordToSave.id, wordToSave);
    
    // 更新相关单词中的双向关联
    if (addedRelatedWordIds.length > 0 || removedRelatedWordIds.length > 0) {
      try {
        // 为新增关联的单词添加当前单词作为关联
        for (const relatedWordId of addedRelatedWordIds) {
          const relatedWord = await getWordById(relatedWordId);
          if (relatedWord) {
            // 确保relatedWords数组存在
            if (!relatedWord.relatedWords) {
              relatedWord.relatedWords = [];
            }
            
            // 检查是否已经包含当前单词
            const alreadyLinked = relatedWord.relatedWords.some(w => w.id === word.value.id);
            
            if (!alreadyLinked) {
              // 添加当前单词作为关联单词
              relatedWord.relatedWords.push({
                id: word.value.id,
                name: wordToSave.name, // 使用可能更新后的名称
                pos: wordToSave.pos,
                meaning: wordToSave.meaning
              });
              
              // 更新相关单词
              await updateWord(relatedWord.id, relatedWord);
            }
          }
        }
        
        // 从移除关联的单词中删除当前单词
        for (const relatedWordId of removedRelatedWordIds) {
          const relatedWord = await getWordById(relatedWordId);
          if (relatedWord && relatedWord.relatedWords) {
            // 移除当前单词
            relatedWord.relatedWords = relatedWord.relatedWords.filter(w => w.id !== word.value.id);
            
            // 更新相关单词
            await updateWord(relatedWord.id, relatedWord);
          }
        }
      } catch (err) {
        console.error('更新相关单词关联关系失败:', err);
        // 即使更新关联关系失败，主单词已保存成功，继续执行
      }
    }
    
    // 清除所有相关缓存，确保下次从存储加载最新数据
    console.log('清除单词ID缓存:', wordId.value);
    delete wordCache[wordId.value];
    
    // 清除全局预加载缓存
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
      console.log('清除全局预加载缓存');
      delete uni.$wordPreloadCache[wordId.value];
    }
    
    // 从存储中重新加载最新数据
    console.log('从存储中重新加载单词数据');
    const refreshedWord = await getWordById(wordId.value);
    
    // 更新本地显示数据
    if (refreshedWord) {
      console.log('成功从存储中加载最新数据:', refreshedWord.name);
      word.value = refreshedWord;
      // 更新内存缓存
      wordCache[wordId.value] = refreshedWord;
    } else {
      // 如果无法从存储加载，使用保存的数据
      console.log('无法从存储中加载最新数据，使用保存的数据');
      word.value = {...wordToSave};
      // 更新内存缓存
      wordCache[wordId.value] = {...wordToSave};
    }
    
    // 退出编辑模式
    isEditing.value = false;
    
    uni.hideLoading();
    uni.showToast({
      title: '修改成功',
      icon: 'success',
      duration: 1500
    });
    
    // 通知其他页面刷新数据
    console.log('发送刷新单词列表事件');
    uni.$emit('refreshWordList');
  } catch (err) {
    uni.hideLoading();
    console.error('保存修改失败:', err);
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none',
      duration: 2000
    });
  }
};

// 取消编辑
const handleCancelEdit = () => {
  isEditing.value = false;
  
  // 清空编辑表单数据
  editFormData.name = '';
  editFormData.pos = [];
  editFormData.meaning = '';
  // 英文释义已移除
  editFormData.phonetic = '';
  editFormData.examples = [];
  editFormData.relatedWords = [];
  editFormData.notes = [];
  
  uni.showToast({
    title: '已取消编辑',
    icon: 'none',
    duration: 1500
  });
};

// 添加例句
const addExample = () => {
  editFormData.examples.push({
    en: '',
    zh: ''
  });
};

// 删除例句
const removeExample = (index) => {
  editFormData.examples.splice(index, 1);
};

// 添加相关单词
const addRelatedWord = () => {
  editFormData.relatedWords.push({
    id: Date.now(), // 临时ID
    name: '',
    pos: '',
    meaning: ''
  });
};

// 删除相关单词
const removeRelatedWord = (index) => {
  editFormData.relatedWords.splice(index, 1);
};

// 添加注意事项
const addNote = () => {
  editFormData.notes.push('');
};

// 删除注意事项
const removeNote = (index) => {
  editFormData.notes.splice(index, 1);
};

// 删除单词 - 使用同步方式
const handleDelete = () => {
  if (!word.value || !word.value.id) {
    uni.showToast({ title: '单词信息不完整，无法删除', icon: 'none' });
    return;
  }
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除单词"${word.value.name}"吗？此操作不可恢复。`,
    confirmText: '删除',
    confirmColor: '#ff0000',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' });
          
          // 获取单词的相关单词ID列表，用于更新关联关系
          const relatedWordIds = word.value.relatedWords?.map(w => w.id) || [];
          const wordId = word.value.id;
          
          // 使用API函数删除单词，而不是直接操作存储
          await apiDeleteWord(wordId);
          
          // 清除所有相关缓存
          if (typeof uni.$wordIdCache !== 'undefined') {
            console.log(`清除ID为${wordId}的单词缓存`);
            if (uni.$wordIdCache && uni.$wordIdCache[wordId]) {
              delete uni.$wordIdCache[wordId];
            }
            console.log('为安全起见，清空整个wordIdCache');
            uni.$wordIdCache = {};
          }
          
          // 清除全局预加载缓存
          if (typeof uni.$wordPreloadCache !== 'undefined') {
            console.log('清除全局单词预加载缓存');
            uni.$wordPreloadCache = {};
          }
          
          // 从相关单词中移除当前单词的关联
          if (relatedWordIds.length > 0) {
            try {
              for (const relatedWordId of relatedWordIds) {
                const relatedWord = await getWordById(relatedWordId);
                if (relatedWord && relatedWord.relatedWords) {
                  // 移除当前单词
                  relatedWord.relatedWords = relatedWord.relatedWords.filter(w => w.id !== wordId);
                  
                  // 更新相关单词
                  await updateWord(relatedWord.id, relatedWord);
                }
              }
            } catch (relationErr) {
              console.error('更新关联关系失败:', relationErr);
              // 继续执行，因为主要的删除操作已经成功
            }
          }
          
          // 通知其他页面刷新数据
          console.log('发送刷新单词列表事件');
          uni.$emit('refreshWordList');
          
          uni.hideLoading();
          uni.showToast({ title: '删除成功', icon: 'success' });
          
          // 延迟返回，让用户看到删除成功的提示
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } catch (err) {
          console.error('删除单词失败:', err);
          uni.hideLoading();
          
          // 提示用户删除失败并询问是否重试
          uni.showModal({
            title: '删除失败',
            content: '删除单词时出现错误，是否重试？',
            confirmText: '重试',
            success: (res) => {
              if (res.confirm) {
                handleDelete(); // 重试删除操作
              }
            }
          });
        }
      }
    }
  });
};

// 直接加载默认单词作为备用
const loadDefaultWord = () => {
  console.log('加载默认单词作为备用');
  
  // 直接从mockWords中获取第一个单词 (apple)
  const defaultWord = mockWords[0];
  if (defaultWord) {
    console.log('成功获取默认单词:', defaultWord.name);
    word.value = defaultWord;
    wordId.value = defaultWord.id;
    isLoading.value = false;
    
    // 简单提示用户
    setTimeout(() => {
      uni.showToast({
        title: '已加载默认单词',
        icon: 'none',
        duration: 2000
      });
    }, 500);
    
    return true;
  }
  
  return false;
};

// 添加强制重新初始化函数
const forceInitialize = () => {
  console.log('强制初始化单词详情页');
  
  // 检查是否已加载成功
  if (!isLoading.value && word.value && word.value.id) {
    console.log('页面已成功加载，无需初始化');
    return;
  }
  
  // 如果在5秒后仍在加载中，强制加载默认单词
  if (isLoading.value) {
    console.log('页面仍在加载中，强制加载默认单词');
    loadDefaultWord();
  }
};

// 页面显示时触发
const handlePageShow = () => {
  // 如果单词已被修改，重新加载数据
  if (wordId.value) {
    // 清除缓存，确保每次都加载最新数据
    if (wordCache[wordId.value]) {
      console.log('页面显示时清除缓存，确保加载最新数据:', wordId.value);
      delete wordCache[wordId.value];
    }
    
    // 清除全局预加载缓存
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
      console.log('页面显示时清除全局预加载缓存');
      delete uni.$wordPreloadCache[wordId.value];
    }
    
    // 延迟执行可避免与其他操作冲突
    setTimeout(() => {
      console.log('页面显示，重新加载单词详情:', wordId.value);
      loadWordDetail(0, 3);
    }, 200);
  } else {
    // 如果ID为空，尝试加载默认单词
    console.log('handlePageShow: ID为空，尝试加载默认单词');
    loadDefaultWord();
  }
};

// 使用正确的页面显示生命周期钩子
onShow(() => {
  console.log('单词详情页面显示，执行handlePageShow，当前ID:', wordId.value);
  
  // 在返回到页面时才执行刷新，首次加载时不执行，避免覆盖onLoad设置的ID
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const isPageRevisit = currentPage && currentPage.$refreshCount > 0;
  
  if (isPageRevisit) {
    handlePageShow();
  } else if (currentPage) {
    currentPage.$refreshCount = (currentPage.$refreshCount || 0) + 1;
  }
});

// 注册页面挂载事件
onMounted(() => {
  console.log('单词详情页面已挂载，ID:', wordId.value);
  
  // 已经有ID时不要再设置默认ID，避免覆盖传入的ID
  if (!wordId.value && !isIdFromUrlProcessed.value) {
    console.log('onMounted: ID为空，尝试使用默认ID');
    // 直接从当前URL获取ID参数
    try {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      if (currentPage && currentPage.$page && currentPage.$page.fullPath) {
        console.log('onMounted: 尝试从URL获取ID, 当前路径:', currentPage.$page.fullPath);
        
        // 尝试从URL中提取id参数
        const idMatch = /[?&]id=([^&]+)/.exec(currentPage.$page.fullPath);
        if (idMatch && idMatch[1]) {
          const id = parseInt(idMatch[1], 10);
          console.log('onMounted: 从URL成功获取ID:', id);
          
          // 设置标志，避免后续重置ID
          isIdFromUrlProcessed.value = true;
          // 设置ID并加载单词详情
          wordId.value = id;
          console.log('onMounted: 设置wordId为:', wordId.value);
          
          // 立即加载单词
          loadWordDetail(0, 3);
          return;
        } else {
          console.log('onMounted: 无法从URL获取ID参数');
        }
      } else {
        console.log('onMounted: 无法获取当前页面信息');
      }
    } catch (err) {
      console.error('onMounted: 解析URL获取ID出错:', err);
    }
    
    // 如果上面的直接获取失败，延迟尝试加载默认ID
    setTimeout(() => {
      if (!wordId.value && !isIdFromUrlProcessed.value) {
        console.log('onMounted: 经过延时后ID仍为空，设置默认ID');
        wordId.value = 1; // 默认加载apple
        if (isLoading.value) {
          loadWordDetail(0, 3);
        }
      }
    }, 500);
  }
  
  // 设置强制初始化定时器，防止一直显示加载中
  setTimeout(forceInitialize, 5000);
});

// 生命周期
onLoad((options) => {
  console.log('单词详情页面 onLoad 生命周期触发，参数:', options);
  
  // 重置数据，避免显示上一个单词的数据
  word.value = { name: '加载中...' };
  isLoading.value = true;
  loadError.value.show = false;
  
  // 尝试直接从当前页面路径获取ID
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  
  // 尝试从currentPage获取options
  let pageOptions = null;
  if (currentPage && currentPage.options) {
    pageOptions = currentPage.options;
  }
  
  // 优先使用传入的options，如果为空则尝试使用页面options
  const finalOptions = options && Object.keys(options).length > 0 ? options : pageOptions;
  
  let idFound = false;
  
  try {
    // 首先尝试直接从options.id获取ID，这是最常见的场景
    if (finalOptions && finalOptions.id !== undefined && finalOptions.id !== null && finalOptions.id !== '') {
      console.log('从options直接获取到ID:', finalOptions.id);
      idFound = true;
      isIdFromUrlProcessed.value = true;
      processIdParameter(finalOptions.id);
      return;
    }
    
    // 如果finalOptions仍然无效，尝试从URL中直接解析ID
    if (!idFound) {
      const currentUrl = currentPage ? currentPage.route + (currentPage.$page && currentPage.$page.fullPath ? currentPage.$page.fullPath : '') : '';
      
      // 尝试解析URL中的id参数
      const idMatch = /[?&]id=([^&]+)/.exec(currentUrl);
      if (idMatch && idMatch[1]) {
        console.log('从URL成功解析到ID:', idMatch[1]);
        // 使用这个ID
        idFound = true;
        isIdFromUrlProcessed.value = true;
        processIdParameter(idMatch[1]);
        return;
      }
    }
    
    // 以下代码只有在无法获取ID的情况下执行
    if (!idFound) {
      console.error('没有找到有效的ID参数');
      handleMissingId();
    }
  } catch (error) {
    console.error('onLoad处理总体错误:', error);
    handleMissingId();
  }
});

// 添加专门处理ID参数的函数
function processIdParameter(idParam) {
  console.log('开始处理ID参数:', idParam, '类型:', typeof idParam);
  try {
    // 转换为数字ID
    const originalId = idParam;
    let id;
    
    // 更严格的ID解析
    if (typeof originalId === 'number') {
      id = originalId;
    } else if (typeof originalId === 'string') {
      // 尝试不同的转换方法
      if (/^\d+$/.test(originalId)) {
        id = parseInt(originalId, 10);
      } else {
        throw new Error(`无效的ID格式: ${originalId}`);
      }
    } else {
      throw new Error(`意外的ID类型: ${typeof originalId}`);
    }
    
    if (isNaN(id)) {
      throw new Error('无效的ID格式 (NaN)');
    }
    
    // 先尝试从预加载缓存获取数据
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[id]) {
      console.log('从全局预加载缓存获取单词数据:', uni.$wordPreloadCache[id].name);
      const cachedWord = uni.$wordPreloadCache[id];
      
      // 确保单词有基本属性
      if (!cachedWord.examples) cachedWord.examples = [];
      if (!cachedWord.relatedWords) cachedWord.relatedWords = [];
      if (!cachedWord.notes) cachedWord.notes = [];
      
      // 保存ID
      wordId.value = id;
      
      // 直接设置单词数据
      word.value = cachedWord;
      // 将结果存入内存缓存
      wordCache[id] = cachedWord;
      isLoading.value = false;
      
      // 异步预加载相邻单词
      setTimeout(() => {
        preloadAdjacentWords(id);
      }, 100);
      
      return;
    }
    
    // 保存ID，设置为全局响应式变量
    console.log('成功解析ID，设置wordId为:', id);
    wordId.value = id;
    
    // 立即初始化加载
    loadWordDetail(0, 3);
  } catch (e) {
    console.error('处理ID参数错误:', e);
    
    // 尝试紧急恢复
    if (emergencyRecover()) {
      console.log('参数处理错误，但紧急恢复成功');
    } else {
      loadError.value = {
        show: true,
        message: '参数错误，无法加载单词',
        details: e.message
      };
      isLoading.value = false;
    }
  }
}

// 处理缺失ID的情况
function handleMissingId() {
  console.log('处理缺失ID情况');
  // 尝试使用默认ID (apple)
  console.log('尝试使用默认ID 1 (apple)');
  wordId.value = 1;
  
  if (wordId.value) {
    console.log('已设置默认ID:', wordId.value);
    loadWordDetail(0, 3);
  } else {
    // 尝试紧急恢复
    if (emergencyRecover()) {
      console.log('无有效参数，但紧急恢复成功');
    } else {
      loadError.value = {
        show: true,
        message: '未提供单词ID',
        details: '参数缺失'
      };
      isLoading.value = false;
    }
  }
}

// 刷新并重新加载单词数据
const handleRefresh = async () => {
  console.log('单词刷新按钮被点击');
  
  // 检查是否设置了forceEmpty标志
  try {
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      const parsedData = JSON.parse(savedWordsStr);
      if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
        console.log('handleRefresh检测到forceEmpty标志，无法刷新单词');
        uni.showToast({
          title: '数据已被清空，无法刷新',
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
  } catch (error) {
    console.error('检查forceEmpty标志失败:', error);
  }
  
  // 显示加载提示
  uni.showLoading({
    title: '刷新单词中...',
    mask: true
  });
  
  // 清除内存缓存
  if (wordCache[wordId.value]) {
    console.log(`清除ID为${wordId.value}的缓存`);
    delete wordCache[wordId.value];
  }
  
  // 延迟执行，给用户一个加载的感觉
  setTimeout(async () => {
    uni.hideLoading();
    
    try {
      // 重新加载单词详情
      console.log('重新从存储加载单词详情');
      await loadWordDetail(0, 3);
      
      uni.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('刷新后重新加载单词详情失败:', error);
      
      // 刷新失败的处理
      uni.showToast({
        title: '无法刷新单词',
        icon: 'none',
        duration: 1500
      });
    }
  }, 1000);
};

// 搜索相关单词
const relatedWordSearch = ref('');
const relatedWordSearchResults = ref([]);
const isSearchingRelatedWord = ref(false);

const searchRelatedWord = async (e) => {
  const keyword = e?.detail?.value || relatedWordSearch.value;
  if (!keyword) {
    relatedWordSearchResults.value = [];
    return;
  }

  try {
    // 获取所有单词
    const allWords = await searchWords(keyword);
    
    // 过滤掉当前单词和已经添加的相关单词
    const filteredResults = allWords.filter(w => {
      // 排除当前单词
      if (w.id === word.value.id) return false;
      
      // 排除已经添加的相关单词
      const alreadyAdded = editFormData.relatedWords.some(rw => rw.id === w.id);
      return !alreadyAdded;
    });
    
    relatedWordSearchResults.value = filteredResults;
  } catch (error) {
    console.error('搜索相关单词失败:', error);
    uni.showToast({
      title: '搜索失败',
      icon: 'none'
    });
  }
};

const cancelSearchRelatedWord = () => {
  relatedWordSearch.value = '';
  relatedWordSearchResults.value = [];
  isSearchingRelatedWord.value = false;
};

// 选择相关单词
const selectRelatedWord = (selectedWord) => {
  // 检查是否已经添加了这个单词
  const alreadyAdded = editFormData.relatedWords.some(rw => rw.id === selectedWord.id);
  if (alreadyAdded) {
    uni.showToast({
      title: '已添加该单词',
      icon: 'none',
      duration: 1000
    });
    return;
  }

  // 检查是否添加了当前单词自身
  if (selectedWord.id === word.value.id) {
    uni.showToast({
      title: '不能添加当前单词',
      icon: 'none',
      duration: 1000
    });
    return;
  }
  
  // 添加到相关单词列表
  editFormData.relatedWords.push({
    id: selectedWord.id,
    name: selectedWord.name,
    pos: selectedWord.pos,
    meaning: selectedWord.meaning
  });
  
  // 关闭搜索框
  relatedWordSearch.value = '';
  relatedWordSearchResults.value = [];
  isSearchingRelatedWord.value = false;
  
  uni.showToast({
    title: '添加成功',
    icon: 'success',
    duration: 1000
  });
};

// 显示搜索相关单词弹窗
const showSearchRelatedWord = () => {
  isSearchingRelatedWord.value = true;
  relatedWordSearch.value = '';
  relatedWordSearchResults.value = [];
};

const updateWordDetail = (wordData) => {
  console.log('更新单词详情:', wordData);
  
  if (!wordData) {
    console.error('提供的单词数据为空');
    loadError.value.show = true;
    loadError.value.message = '无法加载单词数据';
    isLoading.value = false;
    return;
  }
  
  try {
    // 设置基本信息
    word.value = {
      ...wordData,
      examples: Array.isArray(wordData.examples) ? wordData.examples : [],
      relatedWords: Array.isArray(wordData.relatedWords) ? wordData.relatedWords : [],
      notes: Array.isArray(wordData.notes) ? wordData.notes : []
    };
    
    // 确保必要的字段存在
    if (!word.value.id) {
      console.error('单词数据缺少ID字段');
      word.value.id = Date.now(); // 为缺失的ID提供一个临时值
    }
    
    if (!word.value.name) {
      console.error('单词数据缺少name字段');
      word.value.name = '未命名单词';
    }
    
    console.log('单词详情已更新:', word.value);
    isLoading.value = false;
    loadError.value.show = false;
    
    // 通知其他组件单词已加载
    uni.$emit('wordDetailLoaded', {
      id: word.value.id,
      name: word.value.name
    });
    
    // 尝试更新页面标题
    try {
      uni.setNavigationBarTitle({
        title: word.value.name || '单词详情'
      });
    } catch (e) {
      console.error('设置导航栏标题失败:', e);
    }
  } catch (error) {
    console.error('更新单词详情时出错:', error);
    loadError.value.show = true;
    loadError.value.message = '更新单词详情时出错';
    isLoading.value = false;
  }
};
</script>

<style>
.container {
  padding: 24px;
  background-color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 单词头部样式 */
.word-header {
  margin-bottom: 36px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(79, 70, 229, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.word-header.loading {
  opacity: 0.6;
}

.word-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.word-name {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}

.word-pos-tag {
  display: inline-block;
  padding: 3px 10px;
  background-color: rgba(79, 70, 229, 0.1);
  color: #4F46E5;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

/* 内容区域 */
.content-area {
  flex: 1;
  width: 100%;
  height: 0;
}

/* 详情区块样式 */
.detail-section {
  margin-bottom: 30px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(79, 70, 229, 0.1);
}

.detail-section:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-bottom: 14px;
  position: relative;
  padding-left: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  height: 16px;
  width: 4px;
  background-color: #4F46E5;
  border-radius: 2px;
}

.section-content {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  padding-left: 12px;
}

.chinese-meaning {
  font-size: 18px;
}

/* 例句样式 - 改进 */
.example-list {
  padding-left: 12px;
}

.example-item {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fc;
  border-radius: 12px;
  transition: all 0.2s ease;
  display: flex;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.example-number {
  width: 24px;
  height: 24px;
  background-color: #4F46E5;
  color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  margin-right: 12px;
  flex-shrink: 0;
}

.example-content {
  flex: 1;
}

.example-item:last-child {
  margin-bottom: 0;
}

.example-item:active {
  background-color: #f0f0f0;
}

.example-en {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.5;
}

.example-zh {
  font-size: 16px;
  color: #666;
  line-height: 1.5;
  font-style: italic;
}

.highlight {
  color: #4F46E5;
  font-weight: 500;
  background-color: rgba(79, 70, 229, 0.1);
  padding: 0 4px;
  border-radius: 4px;
}

/* 相关单词样式 - 改进 */
.related-list {
  padding-left: 12px;
}

.related-item {
  padding: 12px 15px;
  background-color: #f8f9fc;
  border-radius: 12px;
  margin-bottom: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.related-word-main {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.related-word-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-right: 8px;
}

.related-pos {
  font-size: 12px;
  color: #666;
  background-color: rgba(79, 70, 229, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.related-word-meaning {
  font-size: 14px;
  color: #666;
  padding-right: 20px;
}

.related-arrow {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #4F46E5;
  font-size: 16px;
}

.related-item:active {
  background-color: #f0f0f0;
  transform: scale(0.98);
}

/* 骨架屏加载样式 */
.skeleton {
  flex: 1;
}

.skeleton-section {
  margin-bottom: 30px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.skeleton-title {
  height: 20px;
  width: 120px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 16px;
}

.skeleton-content {
  height: 16px;
  width: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-item {
  height: 40px;
  width: 90%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 16px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 操作按钮样式 */
.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 36px;
  padding: 0 12px;
}

.actions.disabled {
  opacity: 0.6;
}

.action-btn {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  font-size: 16px;
  margin: 0 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn[disabled] {
  opacity: 0.6;
  pointer-events: none;
}

.edit {
  background-color: #4F46E5;
  color: #fff;
  box-shadow: 0 2px 10px rgba(79, 70, 229, 0.3);
}

.delete {
  background-color: #fff;
  color: #ff4d4f;
  border: 1px solid #ff4d4f;
}

.btn-hover {
  opacity: 0.9;
  transform: scale(0.98);
}

/* 确保scrollbar不影响布局 */
::-webkit-scrollbar {
  width: 4px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(79, 70, 229, 0.2);
  border-radius: 2px;
}

/* 错误提示样式 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  flex: 1;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-message {
  font-size: 16px;
  color: #666;
  text-align: center;
  margin-bottom: 30px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  flex-direction: row;
}

.retry-btn, .back-btn {
  padding: 10px 20px;
  margin: 0 10px;
  border-radius: 20px;
  font-size: 14px;
}

.retry-btn {
  background-color: #4F46E5;
  color: white;
}

.back-btn {
  background-color: #f5f5f5;
  color: #666;
}

/* 注意事项样式 - 新增 */
.notes-list {
  padding-left: 12px;
}

.note-item {
  display: flex;
  margin-bottom: 12px;
  line-height: 1.5;
}

.note-bullet {
  font-size: 18px;
  color: #4F46E5;
  margin-right: 10px;
  flex-shrink: 0;
}

.error-bullet {
  color: #ff4d4f;
}

.note-content {
  flex: 1;
  font-size: 15px;
  color: #555;
}

/* 添加刷新按钮样式 */
.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: rgba(79, 70, 229, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:active {
  background-color: rgba(79, 70, 229, 0.2);
  transform: scale(0.95);
}

.refresh-icon {
  font-size: 22px;
  color: #4F46E5;
  font-weight: bold;
}

/* 添加空模块样式 */
.empty-module {
  padding: 15px;
  background-color: #f8f9fc;
  border-radius: 12px;
  text-align: center;
  color: #999;
  font-size: 14px;
  margin-left: 12px;
  margin-top: 5px;
  margin-bottom: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

/* 添加编辑相关样式 */
.word-name-input {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-right: 10px;
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  width: 70%;
}

.edit-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;
  color: #333;
  background-color: #fff;
}

.edit-input {
  width: 100%;
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 12px;
  margin-bottom: 8px;
  font-size: 16px;
  color: #333;
  background-color: #fff;
}

.add-btn {
  font-size: 14px;
  color: #4F46E5;
  margin-left: auto;
  cursor: pointer;
}

.pos-selection {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
}

.pos-item-small {
  padding: 2px 6px;
  background-color: #f0f0f0;
  border-radius: 6px;
  margin-right: 6px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
  border: 1px solid transparent;
}

.pos-item-small.active {
  background-color: rgba(79, 70, 229, 0.1);
  color: #4F46E5;
  border-color: #4F46E5;
}

.example-edit-item,
.related-edit-item,
.note-edit-item {
  padding: 12px;
  background-color: #f8f9fc;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.example-edit-header,
.related-edit-header,
.note-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.example-delete,
.related-edit-delete,
.note-edit-delete {
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
}

/* 保存和取消按钮 */
.action-btn.save {
  background-color: #52c41a;
}

.action-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
}

/* 搜索相关单词样式 */
.related-word-search {
  margin-bottom: 16px;
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 12px;
  margin-right: 10px;
  font-size: 16px;
  color: #333;
  background-color: #fff;
}

.search-close {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 5px 10px;
}

.search-results {
  max-height: 250px;
  overflow-y: auto;
  margin-top: 10px;
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
}

.search-result-item {
  padding: 12px;
  background-color: #f8f9fc;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result-item:active {
  background-color: #f0f0f0;
  transform: scale(0.98);
}

.result-word-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.result-word-pos {
  font-size: 12px;
  color: #666;
  background-color: rgba(79, 70, 229, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
  margin-bottom: 5px;
}

.result-word-meaning {
  font-size: 14px;
  color: #555;
}

.no-search-results {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin: 20px 0;
  padding: 20px;
  background-color: #f8f9fc;
  border-radius: 8px;
}
</style> 