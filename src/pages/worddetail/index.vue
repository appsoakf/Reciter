<template>
  <view class="container">
    <!-- 单词头部区域 -->
    <view class="word-header" :class="{ 'loading': isLoading }">
      <view class="word-main">
        <view class="word-name" v-if="!isEditingName">{{ word.name || '加载中...' }}</view>
        <input v-else class="word-name-input" v-model="editFormData.name" placeholder="输入单词" />
        <!-- 移除词性标签 -->
      </view>
      <!-- 删除按钮 (之前是刷新按钮) -->
      <view class="delete-btn" @click="handleDelete" v-if="!isLoading && !loadError.show && !isEditingName">
        <text class="delete-icon">🗑️</text>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-area" v-if="!isLoading && !loadError.show">
      <!-- 用法模块 (合并中文释义和例句) -->
      <view class="detail-section">
        <view class="section-title">
          用法
          <text v-if="!isEditingUsage" class="edit-btn" @click="handleEditUsage">编辑</text>
          <text v-else class="save-btn" @click="handleSaveUsage">保存</text>
        </view>
        
        <!-- 查看模式 -->
        <view v-if="!isEditingUsage">
          <!-- 显示多个中文释义及其例句 -->
          <view v-if="word.usages && word.usages.length > 0">
            <view v-for="(usage, usageIndex) in word.usages" :key="usageIndex" class="usage-item">
              <!-- 词性 -->
              <view class="usage-pos" v-if="usage.pos">{{ usage.pos }}</view>
              
              <!-- 中文释义 -->
              <view class="section-content chinese-meaning">{{ usage.meaning }}</view>
              
              <!-- 例句列表 -->
              <view class="example-list" v-if="usage.examples && usage.examples.length > 0">
                <view class="example-item" v-for="(example, index) in usage.examples" :key="index">
                  <view class="example-number">{{ index + 1 }}</view>
                  <view class="example-content">
                    <view class="example-en">
                      <text v-html="highlightWord(example.en, word.name)"></text>
                    </view>
                    <view class="example-zh">{{ example.zh }}</view>
                  </view>
                </view>
              </view>
              
              <view class="empty-module" v-if="!usage.examples || usage.examples.length === 0">
                暂无例句
              </view>
            </view>
          </view>
          
          <!-- 兼容旧数据格式的显示方式 -->
          <view v-else>
            <!-- 中文释义 -->
            <view class="section-content chinese-meaning">{{ word.meaning || '暂无释义' }}</view>
            
            <!-- 例句列表 -->
            <view class="example-list" v-if="word.examples && word.examples.length > 0">
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
            
            <view class="empty-module" v-if="!word.examples || word.examples.length === 0">
              暂无例句
            </view>
          </view>
        </view>
        
        <!-- 编辑模式 -->
        <view v-if="isEditingUsage">
          <!-- 中文意思列表 -->
          <view class="section-subtitle">
            词性及中文释义
            <text class="add-btn" @click="addUsage">+ 添加意思</text>
          </view>
          
          <!-- 每个意思及其例句 -->
          <view 
            v-for="(usage, usageIndex) in editFormData.usages" 
            :key="usageIndex"
            class="usage-edit-item"
          >
            <view class="usage-edit-header">
              <view class="usage-number">{{ usageIndex + 1 }}</view>
              <view class="usage-delete" @click="removeUsage(usageIndex)" v-if="editFormData.usages.length > 1">删除</view>
            </view>
            
            <!-- 编辑词性 -->
            <view class="pos-label">词性：</view>
            <view class="pos-selection usage-pos-selection">
              <view 
                v-for="(item, index) in posOptions" 
                :key="index"
                class="pos-item-small"
                :class="{ 'active': usage.pos === item.value }"
                @click="setUsagePos(usageIndex, item.value)"
              >
                {{ item.label }}
              </view>
            </view>
            
            <!-- 编辑中文释义 -->
            <textarea 
              class="edit-textarea" 
              v-model="usage.meaning" 
              placeholder="输入中文释义"
            ></textarea>
            
            <!-- 编辑例句 -->
            <view class="section-subtitle example-subtitle">
              例句
              <text class="add-btn" @click="addExampleToUsage(usageIndex)">+ 添加例句</text>
            </view>
            
            <view 
              v-for="(example, exampleIndex) in usage.examples" 
              :key="exampleIndex"
              class="example-edit-item"
            >
              <view class="example-edit-header">
                <view class="example-number">{{ exampleIndex + 1 }}</view>
                <view class="example-delete" @click="removeExampleFromUsage(usageIndex, exampleIndex)">删除</view>
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
            
            <view class="empty-module" v-if="usage.examples.length === 0">
              暂无例句，点击"添加例句"按钮添加
            </view>
          </view>
        </view>
      </view>
      
      <!-- 相关单词区块 -->
      <view class="detail-section">
        <view class="section-title">
          相关单词
          <text v-if="!isEditingRelated" class="edit-btn" @click="handleEditRelated">编辑</text>
          <text v-else class="save-btn" @click="handleSaveRelated">保存</text>
        </view>
        
        <!-- 查看模式 -->
        <view class="related-list" v-if="!isEditingRelated && word.relatedWords && word.relatedWords.length > 0">
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
        <view v-if="isEditingRelated">
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
          
          <view class="related-edit-header" style="margin-top: 8px;">
            <text class="add-btn" @click="showSearchRelatedWord">+ 添加相关单词</text>
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
        
        <view class="empty-module" v-if="(!isEditingRelated && (!word.relatedWords || word.relatedWords.length === 0)) || (isEditingRelated && editFormData.relatedWords.length === 0)">
          暂无相关单词
        </view>
      </view>
      
      <!-- 注意事项模块 -->
      <view class="detail-section">
        <view class="section-title">
          注意事项
          <text v-if="!isEditingNotes" class="edit-btn" @click="handleEditNotes">编辑</text>
          <text v-else class="save-btn" @click="handleSaveNotes">保存</text>
        </view>
        
        <!-- 查看模式 -->
        <view class="notes-list" v-if="!isEditingNotes && word.notes && word.notes.length > 0">
          <view class="note-item" v-for="(note, index) in word.notes" :key="index">
            <view class="note-bullet">•</view>
            <view class="note-content">{{ note }}</view>
          </view>
        </view>
        
        <!-- 编辑模式 -->
        <view v-if="isEditingNotes">
          <view class="note-edit-header">
            <text class="add-btn" @click="addNote">+ 添加注意事项</text>
          </view>
          
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
        
        <view class="empty-module" v-else-if="isEditingNotes && (!editFormData.notes || editFormData.notes.length === 0)">
          暂无注意事项
        </view>
        <view class="empty-module" v-else-if="!isEditingNotes && word.commonErrors && word.commonErrors.length > 0">
          <view class="note-item" v-for="(error, index) in word.commonErrors" :key="index">
            <view class="note-bullet error-bullet">✘</view>
            <view class="note-content">{{ error }}</view>
          </view>
        </view>
        <view class="empty-module" v-else-if="!isEditingNotes && (!word.notes || word.notes.length === 0)">
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
  </view>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, reactive } from 'vue';
import { getWordById, getWordByIdSync, deleteWord as apiDeleteWord, updateWord, searchWords } from '@/services/word.js';
import LoadingError from '@/components/LoadingError.vue';
import { onLoad, onShow } from '@/utils/uni-hooks.js';

// 导入必要的常量
const STORAGE_KEY = 'reciter_words';

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

// 替换单一编辑状态为多个模块编辑状态
const isEditingName = ref(false);
const isEditingUsage = ref(false);
const isEditingRelated = ref(false);
const isEditingNotes = ref(false);

// 表单数据
const editFormData = reactive({
  name: '',
  pos: [],
  meaning: '', // 保留以兼容旧数据
  phonetic: '',
  usages: [], // 新增：多个意思及其例句
  examples: [], // 保留以兼容旧数据
  relatedWords: [],
  notes: []
});

// 相关单词搜索
const isSearchingRelatedWord = ref(false);
const relatedWordSearch = ref('');
const relatedWordSearchResults = ref([]);

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
};

// 处理单词名称编辑
const handleEditName = () => {
  isEditingName.value = true;
  editFormData.name = word.value.name || '';
  
  // 处理词性
  if (typeof word.value.pos === 'string') {
    editFormData.pos = word.value.pos.split('/').filter(Boolean);
  } else if (Array.isArray(word.value.pos)) {
    editFormData.pos = [...word.value.pos];
  } else {
    editFormData.pos = [];
  }
};

// 保存单词名称编辑
const handleSaveName = async () => {
  if (!editFormData.name || editFormData.name.trim() === '') {
    uni.showToast({
      title: '请输入单词',
      icon: 'none'
    });
    return;
  }
  
  if (editFormData.pos.length === 0) {
    uni.showToast({
      title: '请选择至少一个词性',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 创建更新对象
    const updatedWord = {
      ...word.value,
      name: editFormData.name,
      pos: processedPos.value
    };
    
    // 更新单词
    await updateWord(updatedWord.id, updatedWord);
    
    // 更新本地显示数据
    word.value = updatedWord;
    
    // 清除缓存
    if (wordCache[wordId.value]) {
      delete wordCache[wordId.value];
    }
    
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
      delete uni.$wordPreloadCache[wordId.value];
    }
    
    isEditingName.value = false;
    uni.hideLoading();
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 通知其他页面刷新数据
    uni.$emit('refreshWordList');
  } catch (err) {
    uni.hideLoading();
    console.error('保存单词名称失败:', err);
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
};

// 处理用法编辑
const handleEditUsage = () => {
  isEditingUsage.value = true;
  
  // 检查单词是否有新的usages结构
  if (Array.isArray(word.value.usages) && word.value.usages.length > 0) {
    // 使用新的usages结构
    editFormData.usages = JSON.parse(JSON.stringify(word.value.usages));
    
    // 确保每个usage都有pos字段
    editFormData.usages.forEach(usage => {
      if (!usage.pos) {
        // 如果没有词性，尝试从单词的pos字段获取
        if (word.value.pos && typeof word.value.pos === 'string') {
          // 取第一个词性
          const firstPos = word.value.pos.split('/')[0];
          usage.pos = firstPos || posOptions[0].value;
        } else {
          // 使用默认词性
          usage.pos = posOptions[0].value;
        }
      }
    });
  } else {
    // 兼容旧数据，创建新的usages结构
    let wordPos = '';
    // 尝试从word.pos中获取词性
    if (word.value.pos && typeof word.value.pos === 'string') {
      const posParts = word.value.pos.split('/');
      if (posParts.length > 0) {
        wordPos = posParts[0];
      }
    }
    
    // 如果没有词性，使用默认值
    if (!wordPos) {
      wordPos = posOptions[0].value;
    }
    
    editFormData.usages = [{
      pos: wordPos,
      meaning: word.value.meaning || '',
      examples: Array.isArray(word.value.examples) 
        ? JSON.parse(JSON.stringify(word.value.examples))
        : []
    }];
  }
};

// 保存用法编辑
const handleSaveUsage = async () => {
  // 检查每个用法是否有有效的中文意思
  const hasEmptyMeaning = editFormData.usages.some(usage => !usage.meaning || usage.meaning.trim() === '');
  if (hasEmptyMeaning) {
    uni.showToast({
      title: '请填写所有中文释义',
      icon: 'none'
    });
    return;
  }
  
  // 检查是否有选择词性
  const hasNoPOS = editFormData.usages.some(usage => !usage.pos);
  if (hasNoPOS) {
    // 为缺少词性的用法自动分配默认词性
    editFormData.usages.forEach((usage, index) => {
      if (!usage.pos) {
        console.log(`为第${index+1}个用法分配默认词性`);
        usage.pos = posOptions[0].value;
      }
    });
    
    uni.showToast({
      title: '已自动为所有释义分配词性',
      icon: 'none',
      duration: 2000
    });
  }
  
  // 检查例句的英文和中文是否都已填写
  let hasEmptyExample = false;
  let emptyExampleIndex = 0;
  let emptyExampleUsageIndex = 0;
  
  for (let i = 0; i < editFormData.usages.length; i++) {
    const usage = editFormData.usages[i];
    if (!Array.isArray(usage.examples)) {
      // 确保examples是数组
      usage.examples = [];
      continue;
    }
    
    for (let j = 0; j < usage.examples.length; j++) {
      const example = usage.examples[j];
      if (!example) {
        // 处理null或undefined的例句
        usage.examples.splice(j, 1);
        j--; 
        continue;
      }
      
      if ((!example.en || example.en.trim() === '') && (!example.zh || example.zh.trim() === '')) {
        // 如果英文和中文都为空，可以直接删除这个例句
        usage.examples.splice(j, 1);
        j--; // 调整索引
      } else if (!example.en || example.en.trim() === '' || !example.zh || example.zh.trim() === '') {
        // 如果只有一个为空
        hasEmptyExample = true;
        emptyExampleIndex = j;
        emptyExampleUsageIndex = i;
        break;
      }
    }
    
    if (hasEmptyExample) break;
  }
  
  if (hasEmptyExample) {
    uni.showToast({
      title: `请完善第${emptyExampleUsageIndex + 1}个释义的第${emptyExampleIndex + 1}个例句`,
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 为向后兼容，保留meaning字段和examples字段
    let mainMeaning = '';
    let allExamples = [];
    
    if (editFormData.usages.length > 0) {
      // 使用第一个意思作为主meaning
      mainMeaning = editFormData.usages[0].meaning;
      
      // 合并所有例句
      editFormData.usages.forEach(usage => {
        if (Array.isArray(usage.examples)) {
          allExamples = allExamples.concat(usage.examples);
        }
      });
    }
    
    // 生成新的pos字段：合并所有词性，用/分隔
    const posArray = editFormData.usages.map(usage => usage.pos).filter(Boolean);
    const uniquePosArray = [...new Set(posArray)]; // 去重
    const combinedPos = uniquePosArray.join('/');
    
    // 确保所有的usages和examples都有正确的数据结构
    const normalizedUsages = editFormData.usages.map(usage => {
      return {
        pos: usage.pos || posOptions[0].value, // 确保有默认词性
        meaning: usage.meaning || '',
        examples: Array.isArray(usage.examples) 
          ? usage.examples.map(example => ({
              en: example.en || '',
              zh: example.zh || ''
            }))
          : []
      };
    });
    
    // 创建更新对象
    const updatedWord = {
      ...word.value,
      pos: combinedPos, // 更新pos字段为合并后的值
      meaning: mainMeaning,
      examples: allExamples,
      usages: normalizedUsages
    };
    
    // 更新单词
    await updateWord(updatedWord.id, updatedWord);
    
    // 更新本地显示数据
    word.value = updatedWord;
    
    // 清除缓存
    if (wordCache[wordId.value]) {
      delete wordCache[wordId.value];
    }
    
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
      delete uni.$wordPreloadCache[wordId.value];
    }
    
    isEditingUsage.value = false;
    uni.hideLoading();
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 通知其他页面刷新数据
    uni.$emit('refreshWordList');
  } catch (err) {
    uni.hideLoading();
    console.error('保存用法失败:', err);
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
};

// 添加新的中文意思
const addUsage = () => {
  // 添加默认的词性
  editFormData.usages.push({
    pos: posOptions[0].value, // 使用第一个默认词性
    meaning: '',
    examples: []
  });
};

// 删除中文意思
const removeUsage = (index) => {
  editFormData.usages.splice(index, 1);
};

// 添加例句到特定意思
const addExampleToUsage = (usageIndex) => {
  editFormData.usages[usageIndex].examples.push({
    en: '',
    zh: ''
  });
};

// 删除特定意思中的例句
const removeExampleFromUsage = (usageIndex, exampleIndex) => {
  editFormData.usages[usageIndex].examples.splice(exampleIndex, 1);
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

// 添加注意事项
const addNote = () => {
  editFormData.notes.push('');
};

// 删除注意事项
const removeNote = (index) => {
  editFormData.notes.splice(index, 1);
};

// 保留搜索相关单词的功能
const searchRelatedWord = (e) => {
  const value = e.detail ? e.detail.value : relatedWordSearch.value;
  
  if (!value.trim()) {
    relatedWordSearchResults.value = [];
    return;
  }
  
  // 搜索单词
  searchWords(value).then(results => {
    // 过滤掉当前单词
    relatedWordSearchResults.value = results.filter(w => w.id !== word.value.id);
  }).catch(err => {
    console.error('搜索单词失败:', err);
    relatedWordSearchResults.value = [];
  });
};

// 显示搜索相关单词弹窗
const showSearchRelatedWord = () => {
  isSearchingRelatedWord.value = true;
  relatedWordSearch.value = '';
  relatedWordSearchResults.value = [];
};

// 取消搜索相关单词
const cancelSearchRelatedWord = () => {
  isSearchingRelatedWord.value = false;
  relatedWordSearch.value = '';
  relatedWordSearchResults.value = [];
};

// 选择相关单词
const selectRelatedWord = (selectedWord) => {
  // 检查是否已添加
  const exists = editFormData.relatedWords.some(w => w.id === selectedWord.id);
  if (exists) {
    uni.showToast({
      title: '已添加该单词',
      icon: 'none'
    });
    return;
  }
  
  // 添加相关单词
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

// 设置检查网络连接状态的方法
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

// 紧急恢复功能 - 使用简化版本，不依赖mockWords
const emergencyRecover = () => {
  console.log('尝试紧急恢复');
  try {
    // 检查是否设置了forceEmpty标志
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      try {
        const parsedData = JSON.parse(savedWordsStr);
        if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
          console.log('检测到forceEmpty标志，不进行恢复');
          return false;
        }
      } catch (error) {
        console.error('检查forceEmpty标志失败:', error);
      }
    }
    
    // 提示用户需要退出应用
    uni.showModal({
      title: '应用错误',
      content: '无法加载单词数据，请退出并重新启动应用。',
      showCancel: false,
      confirmText: '知道了'
    });
    
    return false;
  } catch (error) {
    console.error('紧急恢复也失败了:', error);
    return false;
  }
};

// 移除强制刷新单词数据功能
// 替换为加载错误处理函数
const handleWordLoadError = (id) => {
  console.error(`无法加载ID为${id}的单词`);
  
  // 提示用户
  loadError.value = {
    show: true,
    message: '单词加载失败',
    details: '无法加载单词详情，请退出并重新启动应用'
  };
  
  isLoading.value = false;
};

// 更可靠的单词详情加载逻辑
const loadWordDetail = async (retryCount = 0, maxRetries = 3) => {
  if (!wordId.value) {
    console.error('加载失败：wordId 为空或无效');
    loadError.value = {
      show: true,
      message: '无效的单词ID',
      details: '请返回单词列表页面'
    };
    
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
      console.log(`ID为${wordId.value}的单词在本地存储中不存在`);
      
      // 显示未找到单词的错误消息
      loadError.value = {
        show: true,
        message: `ID为${wordId.value}的单词在您的单词库中不存在`,
        details: '请返回单词列表页面'
      };
      return;
    }
    
    // 显示加载错误提示
    loadError.value = {
      show: true,
      message: `加载失败: ${error.message || '未知错误'}`,
      details: '请退出并重新启动应用'
    };
    
    // 处理特定错误情况
    if (error.message.includes('找不到单词') || error.message.includes('无效ID')) {
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
    console.error('wordId无效，无法重试');
    uni.showToast({ 
      title: '无法加载单词，请退出应用', 
      icon: 'none' 
    });
    setTimeout(() => uni.navigateBack(), 1500);
    return;
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
        
        // 单词不存在，提示用户
        uni.showModal({
          title: '单词不存在',
          content: `您尝试访问的单词不在您的单词库中`,
          showCancel: false,
          confirmText: '返回',
          success: (res) => {
            if (res.confirm) {
              // 不执行跳转，返回上一页
              return;
            }
          }
        });
        return;
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

// 删除单词 - 修改为直接显示确认框，不再需要原有编辑模式
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
    console.log('onMounted: ID为空，尝试获取ID');
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
    
    // 如果从URL获取ID失败，尝试加载单词列表中的第一个单词
    setTimeout(() => {
      if (!wordId.value && !isIdFromUrlProcessed.value) {
        console.log('onMounted: 经过延时后ID仍为空，尝试加载初始单词');
        loadInitialWord();
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
    
    // 显示错误信息并返回上一页
    loadError.value = {
      show: true,
      message: '参数错误，无法加载单词',
      details: e.message
    };
    isLoading.value = false;
    
    // 提示用户
    uni.showModal({
      title: '参数错误',
      content: '无法加载单词，请退出并重新启动应用。',
      showCancel: false,
      confirmText: '返回',
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack();
        }
      }
    });
  }
}

// 处理缺失ID的情况
function handleMissingId() {
  console.log('处理缺失ID情况');
  
  // 尝试加载初始单词列表的第一个单词
  loadInitialWord();
}

// 处理刷新
const handleRefresh = () => {
  // 此函数已不需要，由删除功能替代
};

// 处理相关单词编辑
const handleEditRelated = () => {
  isEditingRelated.value = true;
  editFormData.relatedWords = Array.isArray(word.value.relatedWords) 
    ? JSON.parse(JSON.stringify(word.value.relatedWords))
    : [];
};

// 保存相关单词编辑
const handleSaveRelated = async () => {
  try {
    uni.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 获取需要建立双向关联的单词ID列表
    const originalRelatedWordIds = word.value.relatedWords?.map(w => w.id) || [];
    const newRelatedWordIds = editFormData.relatedWords.map(w => w.id);
    
    // 确定新增的关联单词
    const addedRelatedWordIds = newRelatedWordIds.filter(id => !originalRelatedWordIds.includes(id));
    
    // 确定移除的关联单词
    const removedRelatedWordIds = originalRelatedWordIds.filter(id => !newRelatedWordIds.includes(id));
    
    // 创建更新对象
    const updatedWord = {
      ...word.value,
      relatedWords: editFormData.relatedWords || []
    };
    
    // 更新单词
    await updateWord(updatedWord.id, updatedWord);
    
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
                name: word.value.name,
                pos: word.value.pos,
                meaning: word.value.meaning
              });
              
              // 更新相关单词
              await updateWord(relatedWord.id, relatedWord);
              
              // 清除相关单词的缓存
              if (wordCache[relatedWordId]) {
                delete wordCache[relatedWordId];
              }
              
              if (uni.$wordPreloadCache && uni.$wordPreloadCache[relatedWordId]) {
                delete uni.$wordPreloadCache[relatedWordId];
              }
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
            
            // 清除相关单词的缓存
            if (wordCache[relatedWordId]) {
              delete wordCache[relatedWordId];
            }
            
            if (uni.$wordPreloadCache && uni.$wordPreloadCache[relatedWordId]) {
              delete uni.$wordPreloadCache[relatedWordId];
            }
          }
        }
      } catch (err) {
        console.error('更新相关单词关联关系失败:', err);
        // 记录错误但继续执行，因为主单词已更新成功
      }
    }
    
    // 更新本地显示数据
    word.value = updatedWord;
    
    // 清除缓存
    if (wordCache[wordId.value]) {
      delete wordCache[wordId.value];
    }
    
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
      delete uni.$wordPreloadCache[wordId.value];
    }
    
    isEditingRelated.value = false;
    uni.hideLoading();
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 通知其他页面刷新数据
    uni.$emit('refreshWordList');
  } catch (err) {
    uni.hideLoading();
    console.error('保存相关单词失败:', err);
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
};

// 删除相关单词
const removeRelatedWord = (index) => {
  editFormData.relatedWords.splice(index, 1);
};

// 处理注意事项编辑
const handleEditNotes = () => {
  isEditingNotes.value = true;
  editFormData.notes = Array.isArray(word.value.notes) 
    ? JSON.parse(JSON.stringify(word.value.notes))
    : [];
};

// 保存注意事项编辑
const handleSaveNotes = async () => {
  try {
    // 验证输入
    const hasEmptyNotes = editFormData.notes.some(note => !note || note.trim() === '');
    if (hasEmptyNotes) {
      // 自动过滤掉空的注意事项
      editFormData.notes = editFormData.notes.filter(note => note && note.trim() !== '');
    }
    
    uni.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 创建更新对象
    const updatedWord = {
      ...word.value,
      notes: editFormData.notes || []
    };
    
    // 更新单词
    await updateWord(updatedWord.id, updatedWord);
    
    // 更新本地显示数据
    word.value = updatedWord;
    
    // 清除缓存
    if (wordCache[wordId.value]) {
      delete wordCache[wordId.value];
    }
    
    if (uni.$wordPreloadCache && uni.$wordPreloadCache[wordId.value]) {
      delete uni.$wordPreloadCache[wordId.value];
    }
    
    isEditingNotes.value = false;
    uni.hideLoading();
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 通知其他页面刷新数据
    uni.$emit('refreshWordList');
  } catch (err) {
    uni.hideLoading();
    console.error('保存注意事项失败:', err);
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
};

// 设置词性
const setUsagePos = (usageIndex, pos) => {
  editFormData.usages[usageIndex].pos = pos;
};

// 处理加载错误
const handleLoadError = (error) => {
  console.error('加载单词详情失败:', error);
  loadError.value = {
    show: true,
    message: error.message || '加载失败',
    details: '无法加载单词详情，请退出并重新启动应用'
  };
  isLoading.value = false;
};

// 加载单词详情 - 根据ID
const loadWordById = async (id) => {
  // ... existing code ...
  
  // 替换所有使用mockWords的地方
  try {
    // ... existing code ...
    
    // 如果没有找到单词，显示错误
    if (!wordData) {
      console.error(`ID为${id}的单词不存在`);
      loadError.value = {
        show: true,
        message: '单词不存在',
        details: `ID为${id}的单词在您的单词库中不存在`
      };
      isLoading.value = false;
      return;
    }
    
    // ... existing code ...
  } catch (error) {
    handleLoadError(error);
  }
};

// 加载初始单词
const loadInitialWord = async () => {
  try {
    const words = await getWordList(true);
    
    if (!words || words.length === 0) {
      console.log('单词库为空');
      loadError.value = {
        show: true,
        message: '单词库为空',
        details: '您的单词库中没有任何单词'
      };
      isLoading.value = false;
      return;
    }
    
    // 使用第一个单词作为初始单词
    wordId.value = words[0].id;
    await loadWordById(wordId.value);
  } catch (error) {
    handleLoadError(error);
  }
};

// 尝试导航到单词详情
const navigateToWord = (id) => {
  try {
    // ... existing code ...
  } catch (error) {
    uni.showModal({
      title: '导航错误',
      content: '无法导航到所请求的单词，请退出并重新启动应用',
      showCancel: false
    });
  }
};

// 添加的函数
const forceInitialize = () => {
  // 如果页面依然处于加载状态，可能是卡住了，尝试重新加载
  if (isLoading.value) {
    console.log('检测到页面长时间处于加载状态，可能被卡住，尝试恢复');
    
    // 显示错误提示，让用户选择重新加载或返回
    loadError.value = {
      show: true,
      message: '加载超时',
      details: '加载单词数据耗时过长，请重试或退出应用。'
    };
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

/* 删除按钮样式 */
.delete-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: rgba(255, 77, 79, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn:active {
  background-color: rgba(255, 77, 79, 0.2);
  transform: scale(0.95);
}

.delete-icon {
  font-size: 18px;
  color: #ff4d4f;
}

/* 编辑按钮样式 */
.edit-btn {
  font-size: 14px;
  color: #4F46E5;
  padding: 3px 8px;
  background-color: rgba(79, 70, 229, 0.1);
  border-radius: 6px;
  cursor: pointer;
}

.save-btn {
  font-size: 14px;
  color: #52c41a;
  padding: 3px 8px;
  background-color: rgba(82, 196, 26, 0.1);
  border-radius: 6px;
  cursor: pointer;
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

.section-subtitle {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 15px 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  margin-top: 16px;
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
  margin-bottom: 8px;
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
  color: #1677ff;
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

/* 确保scrollbar不影响布局 */
::-webkit-scrollbar {
  width: 4px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(79, 70, 229, 0.2);
  border-radius: 2px;
}

.usage-item {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #eaeaea;
}

.usage-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.usage-edit-item {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
  position: relative;
}

.usage-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.usage-number {
  font-weight: bold;
  color: #666;
}

.usage-delete {
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
}

.example-subtitle {
  margin-top: 15px;
}

.usage-pos {
  display: inline-block;
  font-size: 12px;
  color: #4F46E5;
  background-color: rgba(79, 70, 229, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 8px;
}

.usage-pos-selection {
  margin-bottom: 10px;
  border-radius: 8px;
  background-color: #f9f9f9;
  padding: 8px;
}

.pos-label {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
}
</style> 