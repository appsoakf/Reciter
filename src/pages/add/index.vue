<template>
  <view class="container">
    <!-- 单词输入框 -->
    <view class="form-group">
      <view class="label-row">
        <text class="required">*</text>
        <text class="label-text">单词</text>
      </view>
      <view class="input-container">
        <input 
          type="text" 
          class="word-input" 
          v-model="formData.name" 
          placeholder="输入单词" 
        />
        <text class="time">{{ getCurrentTime() }}</text>
      </view>
    </view>
    
    <!-- 用法模块 (合并词性、中文释义和例句) -->
    <view class="form-group">
      <view class="section-header">
        <text class="label-text">用法</text>
      </view>
      
      <!-- 中文意思列表 -->
      <view class="section-subtitle">
        词性及中文释义
        <text class="add-btn" @click="addUsage">+ 添加意思</text>
      </view>
      
      <!-- 每个意思及其例句 -->
      <view 
        v-for="(usage, usageIndex) in formData.usages" 
        :key="usageIndex"
        class="usage-edit-item"
      >
        <view class="usage-edit-header">
          <view class="usage-number">{{ usageIndex + 1 }}</view>
          <view class="usage-delete" @click="removeUsage(usageIndex)" v-if="formData.usages.length > 1">删除</view>
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
          :adjust-position="false"
          :show-confirm-bar="false"
          :disable-default-padding="true"
          :cursor-spacing="10"
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
            :adjust-position="false"
            :show-confirm-bar="false"
            :disable-default-padding="true"
            :cursor-spacing="10"
          ></textarea>
          <textarea 
            class="edit-textarea" 
            v-model="example.zh" 
            placeholder="输入中文翻译"
            :adjust-position="false"
            :show-confirm-bar="false"
            :disable-default-padding="true"
            :cursor-spacing="10"
          ></textarea>
        </view>
        
        <view class="empty-module" v-if="usage.examples.length === 0">
          暂无例句，点击"添加例句"按钮添加
        </view>
      </view>
    </view>
    
    <!-- 注意事项 -->
    <view class="form-group">
      <view class="section-header">
        <text class="label-text">注意事项</text>
        <view class="add-button" @click="addNote">
          <text class="add-icon">+</text>
          <text class="add-text">添加注意事项</text>
        </view>
      </view>
      
      <view v-if="formData.notes && formData.notes.length > 0" class="items-list">
        <view 
          v-for="(note, index) in formData.notes" 
          :key="index"
          class="note-item"
        >
          <view class="input-container">
            <textarea 
              class="form-textarea fixed-height" 
              v-model="formData.notes[index]" 
              placeholder="输入注意事项"
              :adjust-position="false"
              :show-confirm-bar="false"
              :disable-default-padding="true"
              :cursor-spacing="10"
            ></textarea>
            <view class="delete-button" @click="removeNote(index)">
              <text class="delete-icon">×</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-else class="empty-state">
        <text class="empty-text">添加注意事项，记录单词使用中的常见错误</text>
      </view>
    </view>
    
    <!-- 保存按钮 -->
    <button class="save-btn" @click="saveWord">{{ isEditMode ? '保存修改' : '保存单词' }}</button>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted, onMounted } from 'vue';
import { addWord, updateWord, getWordById } from '@/services/word.js';
import { onLoad, onShow, onUnload } from '@/utils/uni-hooks.js';

// 是否为编辑模式
const isEditMode = ref(false);
const currentWordId = ref(null);

// 表单数据
const formData = reactive({
  name: '',
  pos: [], // 词性，可多选
  meaning: '', // 中文释义
  examples: [], // 例句
  notes: [], // 注意事项
  usages: [] // 用法
});

// 添加重置表单方法
const resetForm = () => {
  // 深度清空表单数据
  formData.name = '';
  formData.pos = [];
  formData.meaning = '';
  
  // 确保清空和重新创建数组，而不是仅清空内容
  formData.examples = [];
  formData.notes = [];
  
  // 初始化用法数据，至少有一个默认用法
  formData.usages = [{
    pos: posOptions[0].value, // 使用第一个默认词性
    meaning: '',
    examples: []
  }];
  
  // 重置编辑模式状态
  isEditMode.value = false;
  currentWordId.value = null;
  
  // 强制刷新一下组件
  setTimeout(() => {
    console.log('表单已完全重置');
  }, 0);
};

// 预处理的pos字符串
const processedPos = computed(() => {
  return formData.pos.join('/');
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

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// 切换词性选择
const togglePos = (pos) => {
  const index = formData.pos.indexOf(pos);
  if (index === -1) {
    formData.pos.push(pos);
  } else {
    formData.pos.splice(index, 1);
  }
};

// 添加例句
const addExample = () => {
  formData.examples.push({
    en: '',
    zh: ''
  });
};

// 删除例句
const removeExample = (index) => {
  formData.examples.splice(index, 1);
};

// 添加注意事项
const addNote = () => {
  // 确保notes数组存在
  if (!formData.notes) {
    formData.notes = [];
  }
  formData.notes.push('');
};

// 删除注意事项
const removeNote = (index) => {
  formData.notes.splice(index, 1);
};

// 添加用法
const addUsage = () => {
  formData.usages.push({
    pos: posOptions[0].value, // 使用默认词性
    meaning: '',
    examples: []
  });
};

// 删除用法
const removeUsage = (index) => {
  formData.usages.splice(index, 1);
};

// 设置用法词性
const setUsagePos = (index, pos) => {
  formData.usages[index].pos = pos;
};

// 添加用法例句
const addExampleToUsage = (index) => {
  formData.usages[index].examples.push({
    en: '',
    zh: ''
  });
};

// 删除用法例句
const removeExampleFromUsage = (usageIndex, exampleIndex) => {
  formData.usages[usageIndex].examples.splice(exampleIndex, 1);
};

// 保存单词
const saveWord = async () => {
  // 表单验证
  if (!formData.name.trim()) {
    uni.showToast({
      title: '请输入单词',
      icon: 'none'
    });
    return;
  }
  
  // 检查是否至少有一个用法
  if (!formData.usages || formData.usages.length === 0) {
    // 如果没有用法，添加一个默认用法
    formData.usages = [{
      pos: posOptions[0].value,
      meaning: formData.meaning || '', // 使用已有meaning
      examples: []
    }];
  }
  
  // 过滤有效的用法（必须有词性和释义）
  const validUsages = formData.usages
    .filter(usage => usage.pos && usage.meaning && usage.meaning.trim())
    .map(usage => ({
      pos: usage.pos,
      meaning: usage.meaning.trim(),
      examples: (usage.examples || []).filter(ex => ex.en.trim() && ex.zh.trim())
                          .map(ex => ({
                            en: ex.en.trim(),
                            zh: ex.zh.trim()
                          }))
    }));
  
  // 确保至少有一个有效用法
  if (validUsages.length === 0) {
    uni.showToast({
      title: '请完善所有用法的词性和释义',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({ title: '保存中...' });
    
    // 为向后兼容，保留pos、meaning和examples字段
    const mainPos = validUsages.map(u => u.pos).join('/');
    const mainMeaning = validUsages[0].meaning;
    
    // 合并所有例句
    let allExamples = [];
    validUsages.forEach(usage => {
      if (Array.isArray(usage.examples) && usage.examples.length > 0) {
        allExamples = allExamples.concat(usage.examples);
      }
    });
    
    // 过滤掉空的注意事项
    const validNotes = (formData.notes || []).filter(note => note && note.trim());
    
    // 构建保存数据
    const wordData = {
      name: formData.name.trim(),
      pos: mainPos,
      meaning: mainMeaning,
      examples: allExamples,
      notes: validNotes,
      usages: validUsages
    };
    
    console.log('保存单词数据:', wordData);
    
    if (isEditMode.value && currentWordId.value) {
      // 编辑模式
      wordData.id = currentWordId.value;
      await updateWord(currentWordId.value, wordData);
      uni.hideLoading();
      uni.showToast({
        title: '修改成功',
        icon: 'success'
      });
      
      // 清除特定单词缓存
      clearWordCache(currentWordId.value);
    } else {
      // 添加模式
      await addWord(wordData);
      uni.hideLoading();
      uni.showToast({
        title: '添加成功',
        icon: 'success'
      });
      
      // 清除所有单词缓存，确保列表刷新
      clearAllWordCache();
    }
    
    // 发送刷新事件，通知其他页面刷新数据
    uni.$emit('refreshWordList');
    
    // 重置表单，确保下次打开页面不会有残留数据
    resetForm();
    
    // 导航到单词列表页面
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/wordlist/index'
      });
    }, 1500);
  } catch (err) {
    uni.hideLoading();
    console.error('保存单词失败:', err);
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none'
    });
  }
};

// 从全局参数获取编辑模式和单词ID
const getEditParamsFromGlobal = () => {
  try {
    const app = getApp();
    if (app && app.globalData) {
      const { editWordId, editMode } = app.globalData;
      
      if (editMode === 'edit' && editWordId) {
        console.log('从全局变量获取编辑参数:', editWordId, editMode);
        
        // 设置编辑模式
        isEditMode.value = true;
        currentWordId.value = editWordId;
        
        // 清除全局变量，避免下次误用
        app.globalData.editWordId = null;
        app.globalData.editMode = null;
        
        // 加载单词详情
        loadWordDetail(editWordId);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('获取全局编辑参数失败:', err);
    return false;
  }
};

// 加载单词详情
const loadWordDetail = async (id) => {
  try {
    uni.showLoading({ title: '加载中...' });
    
    const wordDetail = await getWordById(id);
    if (wordDetail) {
      console.log('加载单词详情:', wordDetail);
      
      // 设置表单数据
      formData.name = wordDetail.name || '';
      
      // 处理usages
      if (Array.isArray(wordDetail.usages) && wordDetail.usages.length > 0) {
        // 使用新的usages结构，并确保数据完整性
        formData.usages = wordDetail.usages.map(usage => ({
          pos: usage.pos || posOptions[0].value,  // 确保有词性
          meaning: usage.meaning || '',           // 确保有释义字段
          examples: Array.isArray(usage.examples) ? usage.examples.map(ex => ({
            en: ex.en || '',
            zh: ex.zh || ''
          })) : []
        }));
      } else {
        // 兼容旧数据，创建新的usages结构
        const wordPos = getDefaultPosFromWordDetail(wordDetail);
        
        // 处理例句
        const examples = Array.isArray(wordDetail.examples) 
          ? wordDetail.examples.map(ex => ({
              en: ex.en || '',
              zh: ex.zh || ''
            }))
          : [];
        
        // 保存meaning和examples供向后兼容
        formData.meaning = wordDetail.meaning || '';
        formData.examples = examples;
        
        // 创建新的usage结构
        formData.usages = [{
          pos: wordPos,
          meaning: wordDetail.meaning || '',
          examples: examples
        }];
      }
      
      // 处理注意事项
      if (wordDetail.notes && Array.isArray(wordDetail.notes)) {
        formData.notes = wordDetail.notes.filter(note => note); // 过滤掉null/undefined
      } else {
        formData.notes = [];
      }
      
      // 确保至少有一个用法
      if (formData.usages.length === 0) {
        formData.usages = [{
          pos: posOptions[0].value,
          meaning: '',
          examples: []
        }];
      }
      
      uni.hideLoading();
    } else {
      uni.hideLoading();
      uni.showToast({
        title: '单词不存在',
        icon: 'none'
      });
      
      // 重置表单
      resetForm();
      
      // 延迟返回
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    }
  } catch (err) {
    uni.hideLoading();
    console.error('加载单词详情失败:', err);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
    
    // 出错时也重置表单
    resetForm();
  }
};

// 从单词详情中获取默认词性
const getDefaultPosFromWordDetail = (wordDetail) => {
  let wordPos = '';
  
  // 处理词性 - 可能是字符串或数组
  if (typeof wordDetail.pos === 'string' && wordDetail.pos) {
    const posParts = wordDetail.pos.split('/');
    if (posParts.length > 0) {
      wordPos = posParts[0];
    }
  } else if (Array.isArray(wordDetail.pos) && wordDetail.pos.length > 0) {
    wordPos = wordDetail.pos[0];
  }
  
  // 如果没有获取到有效词性，使用默认值
  if (!wordPos) {
    wordPos = posOptions[0].value;
  }
  
  return wordPos;
};

// 页面加载时处理参数
onLoad((options) => {
  try {
    console.log('页面加载参数:', options);
    
    // 清理可能存在的单词预加载缓存
    if (typeof uni.$wordPreloadCache !== 'undefined') {
      console.log('清理单词预加载缓存');
      uni.$wordPreloadCache = {};
    }
    
    // 彻底清空表单数据
    resetForm();
    
    // 确保usages至少有一个默认选项
    if (!formData.usages || formData.usages.length === 0) {
      formData.usages = [{
        pos: posOptions[0].value,
        meaning: '',
        examples: []
      }];
    }
    
    // 尝试从页面参数中获取编辑信息
    if (options.id && options.mode === 'edit') {
      isEditMode.value = true;
      currentWordId.value = Number(options.id);
      loadWordDetail(Number(options.id));
    }
    // 如果没有页面参数，尝试从全局变量获取
    else {
      getEditParamsFromGlobal();
    }
    
    // 添加延迟检查，确保表单显示正常
    setTimeout(() => {
      checkFormRender();
    }, 300);
  } catch (err) {
    console.error('处理页面参数失败:', err);
  }
});

// 检查表单是否正确渲染的函数
const checkFormRender = () => {
  console.log('检查表单渲染');
  
  // 检查文本域是否被截断，如果被截断则尝试修复
  try {
    // 在H5环境下尝试直接操作DOM
    // #ifdef H5
    const textareas = document.querySelectorAll('textarea');
    if (textareas.length > 0) {
      console.log('找到', textareas.length, '个文本域');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }
    // #endif
    
    // 小程序环境下使用选择器查询
    // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
    const query = uni.createSelectorQuery();
    query.selectAll('.form-textarea, .edit-textarea').boundingClientRect(rects => {
      if (rects) {
        rects.forEach(rect => {
          console.log('文本域高度:', rect.height);
          // 如果高度小于最小要求，可能是被截断了
          if (rect.height < 70) {
            console.log('检测到文本域高度异常，尝试修复');
            refreshPage();
          }
        });
      }
    }).exec();
    // #endif
  } catch (e) {
    console.error('检查表单渲染失败:', e);
  }
};

// 添加页面强制刷新方法
const refreshPage = () => {
  console.log('执行页面强制刷新');
  
  // 保存当前表单数据
  const tempData = {
    name: formData.name,
    usages: formData.usages ? JSON.parse(JSON.stringify(formData.usages)) : [],
    notes: formData.notes ? [...formData.notes] : []
  };
  
  // 清空数据触发视图更新
  resetForm();
  
  // 延迟恢复数据
  setTimeout(() => {
    formData.name = tempData.name;
    
    // 确保usages有数据
    if (tempData.usages && tempData.usages.length > 0) {
      formData.usages = tempData.usages;
    }
    
    // 恢复注意事项
    if (tempData.notes && tempData.notes.length > 0) {
      formData.notes = tempData.notes;
    }
    
    console.log('页面已刷新并恢复数据');
    
    // 短暂延迟后检查文本框高度
    setTimeout(() => {
      // H5环境下修复文本框高度
      // #ifdef H5
      try {
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          console.log('重设H5文本框高度');
          textareas.forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
          });
        }
      } catch (e) {
        console.error('H5文本框高度重设失败:', e);
      }
      // #endif
      
      // 小程序环境下修复文本框
      // #ifdef MP
      fixMiniProgramTextareas();
      // #endif
    }, 50);
  }, 100);
};

// 专门用于修复小程序环境下文本框渲染问题的函数
const fixMiniProgramTextareas = () => {
  // #ifdef MP
  console.log('执行小程序文本框修复');
  
  // 使用选择器查询所有文本框
  const query = uni.createSelectorQuery();
  query.selectAll('.form-textarea, .edit-textarea').boundingClientRect(rects => {
    if (rects && rects.length > 0) {
      console.log('找到', rects.length, '个文本框元素');
      
      // 检测是否有高度异常的文本框
      const hasAbnormalHeight = rects.some(rect => rect.height < 70);
      
      if (hasAbnormalHeight) {
        console.log('检测到异常高度的文本框，尝试修复');
        
        // 备份当前数据
        const backup = {
          usages: formData.usages ? JSON.parse(JSON.stringify(formData.usages)) : [],
          notes: formData.notes ? [...formData.notes] : []
        };
        
        // 临时修改内容触发重绘
        if (formData.usages && formData.usages.length > 0) {
          formData.usages.forEach(usage => {
            usage.meaning = usage.meaning + ' ';
            if (usage.examples && usage.examples.length > 0) {
              usage.examples.forEach(ex => {
                ex.en = ex.en + ' ';
                ex.zh = ex.zh + ' ';
              });
            }
          });
        }
        
        if (formData.notes && formData.notes.length > 0) {
          formData.notes = formData.notes.map(note => note + ' ');
        }
        
        // 恢复内容，触发重新渲染
        setTimeout(() => {
          // 恢复原始数据
          formData.usages = backup.usages;
          formData.notes = backup.notes;
          
          // 使用系统API强制重绘
          uni.pageScrollTo({
            scrollTop: 0,
            duration: 0
          });
          
          console.log('小程序文本框修复完成');
        }, 50);
      } else {
        console.log('所有文本框高度正常，不需要修复');
      }
    }
  }).exec();
  // #endif
};

// 修改onShow生命周期钩子
onShow(() => {
  console.log('页面显示');
  
  // 如果不是编辑模式，确保表单已被重置
  if (!isEditMode.value) {
    resetForm();
    // 尝试从全局变量获取编辑参数
    getEditParamsFromGlobal();
  }
  
  // 确保usages至少有一个项目
  if (!formData.usages || formData.usages.length === 0) {
    formData.usages = [{
      pos: posOptions[0].value,
      meaning: '',
      examples: []
    }];
  }
  
  // 针对文本框截断问题的处理
  setTimeout(() => {
    // 文本框截断检查
    checkFormRender();
    
    // 强制重新渲染文本框
    const renderReset = () => {
      // 尝试读取文本框高度并重设
      try {
        // #ifdef H5
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          console.log('找到', textareas.length, '个文本框');
          textareas.forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
          });
        }
        // #endif
        
        // 针对小程序环境的特殊处理
        fixMiniProgramTextareas();
      } catch (e) {
        console.error('重置文本框高度失败:', e);
      }
    };
    
    // 延迟执行以确保DOM已更新
    renderReset();
    setTimeout(renderReset, 300);
  }, 100);
});

// 强制使用固定高度，避免自动高度计算出错
onMounted(() => {
  console.log('组件已挂载');
  
  // 延迟检查表单渲染
  setTimeout(() => {
    checkFormRender();
  }, 100);
});

// 在组件卸载时清理数据
onUnmounted(() => {
  console.log('组件卸载，清理数据');
  // 清空表单数据
  resetForm();
});

// 添加onUnload生命周期函数
onUnload(() => {
  console.log('页面卸载，清理数据');
  // 确保表单数据被清空
  resetForm();
});

// 清除特定单词的缓存
const clearWordCache = (wordId) => {
  try {
    // 清除内存缓存
    if (typeof uni.$wordPreloadCache !== 'undefined' && uni.$wordPreloadCache[wordId]) {
      delete uni.$wordPreloadCache[wordId];
      console.log(`清除单词${wordId}的缓存`);
    }
    
    // 尝试清除全局应用缓存
    const app = getApp();
    if (app && app.globalData && app.globalData.wordCache) {
      if (app.globalData.wordCache[wordId]) {
        delete app.globalData.wordCache[wordId];
        console.log(`清除全局应用缓存中单词${wordId}的数据`);
      }
    }
  } catch (err) {
    console.error('清除单词缓存失败:', err);
  }
};

// 清除所有单词缓存
const clearAllWordCache = () => {
  try {
    // 清除内存缓存
    if (typeof uni.$wordPreloadCache !== 'undefined') {
      uni.$wordPreloadCache = {};
      console.log('清除所有单词预加载缓存');
    }
    
    // 尝试清除全局应用缓存
    const app = getApp();
    if (app && app.globalData && app.globalData.wordCache) {
      app.globalData.wordCache = {};
      console.log('清除所有全局单词缓存');
    }
  } catch (err) {
    console.error('清除所有单词缓存失败:', err);
  }
};
</script>

<style scoped>
/* 使用scoped确保样式只应用于当前组件 */
/* 添加!important以确保样式优先级 */
.container {
  padding: 20px !important;
  background-color: #f6f8f8 !important;
  min-height: 100vh !important;
  box-sizing: border-box !important;
  width: 100% !important;
  overflow-x: hidden !important;
}

.form-group {
  margin-bottom: 20px !important;
  background-color: #ffffff !important;
  border-radius: 12px !important;
  padding: 15px !important;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.03) !important;
  overflow: hidden !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.label-row {
  display: flex !important;
  align-items: center !important;
  margin-bottom: 10px !important;
}

.required {
  color: #f5365c !important;
  margin-right: 5px !important;
  font-size: 14px !important;
}

.label-text {
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #333333 !important;
}

.input-container {
  position: relative !important;
  width: 100% !important;
  display: block !important;
  margin-bottom: 0 !important;
}

.mb-2 {
  margin-bottom: 10px !important;
}

.word-input {
  height: 42px !important;
  border-radius: 8px !important;
  background-color: #f5f7fa !important;
  padding: 0 12px !important;
  font-size: 15px !important;
  color: #333 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.time {
  position: absolute !important;
  right: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  color: #b0b0b0 !important;
  font-size: 13px !important;
}

/* 用法模块样式 */
.section-subtitle {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #555 !important;
  margin: 12px 0 10px !important;
  padding-bottom: 6px !important;
  border-bottom: 1px solid #eee !important;
}

.example-subtitle {
  margin-top: 16px !important;
}

.add-btn {
  font-size: 13px !important;
  color: #4F46E5 !important;
  padding: 2px 8px !important;
  border-radius: 12px !important;
  background-color: rgba(79, 70, 229, 0.1) !important;
}

.usage-edit-item {
  background-color: #f9fafb !important;
  border-radius: 8px !important;
  padding: 12px !important;
  margin-bottom: 16px !important;
}

.usage-edit-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 10px !important;
}

.usage-number {
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  background-color: #4F46E5 !important;
  color: white !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  font-size: 12px !important;
}

.usage-delete {
  font-size: 12px !important;
  color: #f56c6c !important;
}

.pos-label {
  font-size: 13px !important;
  color: #555 !important;
  margin-bottom: 8px !important;
}

.usage-pos-selection {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-bottom: 12px !important;
}

.pos-item-small {
  font-size: 12px !important;
  padding: 4px 8px !important;
  background-color: #f5f7fa !important;
  border-radius: 4px !important;
  color: #666 !important;
}

.pos-item-small.active {
  background-color: #4F46E5 !important;
  color: white !important;
}

.edit-textarea {
  width: 100% !important;
  min-height: 70px !important;
  background-color: #f5f7fa !important;
  border-radius: 8px !important;
  padding: 10px 12px !important;
  font-size: 14px !important;
  color: #333 !important;
  box-sizing: border-box !important;
  line-height: 1.4 !important;
  margin-bottom: 10px !important;
  border: none !important;
}

.example-edit-item {
  background-color: #ffffff !important;
  border: 1px solid #eee !important;
  border-radius: 6px !important;
  padding: 10px !important;
  margin-bottom: 12px !important;
}

.example-edit-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 8px !important;
}

.example-number {
  font-size: 12px !important;
  color: #666 !important;
}

.example-delete {
  font-size: 12px !important;
  color: #f56c6c !important;
}

.empty-module {
  text-align: center !important;
  padding: 12px !important;
  color: #999 !important;
  font-size: 13px !important;
  background-color: #f9fafb !important;
  border-radius: 6px !important;
  margin-top: 10px !important;
}

/* 调整词性选择区域 */
.pos-selection {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 8px !important;
  margin-top: 5px !important;
}

.pos-item {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 5px !important;
  border-radius: 8px !important;
  border: 1px solid #e0e0e0 !important;
  background-color: #f5f7fa !important;
  transition: all 0.2s !important;
  text-align: center !important;
}

.pos-item.active {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(99, 102, 241, 0.2)) !important;
  border-color: #4F46E5 !important;
}

.pos-abbr {
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #333 !important;
  margin-bottom: 2px !important;
}

.pos-text {
  font-size: 11px !important;
  color: #666 !important;
}

.form-textarea {
  width: 100% !important;
  min-height: 70px !important;
  background-color: #f5f7fa !important;
  border-radius: 8px !important;
  padding: 10px 12px !important;
  font-size: 14px !important;
  color: #333 !important;
  box-sizing: border-box !important;
  line-height: 1.4 !important;
  display: block !important;
  margin: 0 !important;
  border: none !important;
  max-height: 150px !important;
  height: auto !important;
  overflow-y: auto !important;
  resize: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
}

/* 固定高度文本域 */
.fixed-height {
  height: 80px !important;
  min-height: 80px !important;
  max-height: 150px !important;
  overflow-y: auto !important;
  resize: none !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
}

.section-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 12px !important;
}

.add-button {
  display: flex !important;
  align-items: center !important;
  color: #4F46E5 !important;
  font-size: 13px !important;
  padding: 4px 8px !important;
  background-color: rgba(79, 70, 229, 0.1) !important;
  border-radius: 15px !important;
}

.add-icon {
  font-size: a4px !important;
  margin-right: 2px !important;
}

.items-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

.example-item, .note-item {
  position: relative !important;
  width: 100% !important;
}

.delete-button {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  width: 22px !important;
  height: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background-color: rgba(245, 54, 92, 0.1) !important;
  color: #f5365c !important;
  border-radius: 50% !important;
  z-index: 10 !important;
}

.delete-icon {
  font-size: 16px !important;
  line-height: 1 !important;
}

.en-text {
  border-left: 3px solid #4F46E5 !important;
}

.zh-text {
  border-left: 3px solid #10b981 !important;
}

.empty-state {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 15px 0 !important;
  background-color: #f5f7fa !important;
  border-radius: 8px !important;
}

.empty-text {
  color: #8c8c8c !important;
  font-size: 13px !important;
  text-align: center !important;
  padding: 0 10px !important;
}

.save-btn {
  width: 90% !important;
  height: 44px !important;
  background: linear-gradient(135deg, #4F46E5, #6366F1) !important;
  color: white !important;
  border-radius: 22px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  margin: 20px auto 30px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2) !important;
}

.save-btn:active {
  transform: scale(0.98) !important;
  box-shadow: 0 2px 5px rgba(79, 70, 229, 0.15) !important;
}

/* 媒体查询适配不同屏幕尺寸 */
@media screen and (max-width: 320px) {
  .container {
    padding: 10px !important;
  }
  
  .form-group {
    padding: 12px !important;
    margin-bottom: 12px !important;
  }

  .pos-selection {
    grid-template-columns: repeat(3, 1fr) !important;
  }
  
  .pos-abbr {
    font-size: 12px !important;
  }
  
  .pos-text {
    font-size: 10px !important;
  }
}

@media screen and (min-width: 768px) {
  .container {
    padding: 20px !important;
    max-width: 600px !important;
    margin: 0 auto !important;
  }
  
  .pos-selection {
    grid-template-columns: repeat(5, 1fr) !important;
  }
}
</style>

<!-- 添加全局样式确保兼容性 -->
<style>
/* 全局样式重置，确保没有默认样式干扰 */
page {
  background-color: #f6f8fa;
  min-height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 确保文本域在第二次打开时不会被截断 */
textarea {
  height: 80px;
  min-height: 80px;
  box-sizing: border-box;
  overflow-y: auto;
}
</style> 