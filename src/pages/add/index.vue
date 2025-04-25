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
    
    <!-- 词性选择 -->
    <view class="form-group">
      <view class="label-row">
        <text class="required">*</text>
        <text class="label-text">词性</text>
      </view>
      <view class="pos-selection">
        <view 
          v-for="(item, index) in posOptions" 
          :key="index"
          class="pos-item"
          :class="{ active: formData.pos.includes(item.value) }"
          @click="togglePos(item.value)"
        >
          <text class="pos-abbr">{{ item.label }}</text>
          <text class="pos-text">{{ item.text }}</text>
        </view>
      </view>
    </view>
    
    <!-- 中文释义 -->
    <view class="form-group">
      <view class="label-row">
        <text class="required">*</text>
        <text class="label-text">中文释义</text>
      </view>
      <view class="input-container">
        <textarea 
          id="meaning-textarea"
          class="form-textarea fixed-height" 
          v-model="formData.meaning" 
          placeholder="输入中文释义"
          :adjust-position="false"
          :show-confirm-bar="false"
          :disable-default-padding="true"
          :cursor-spacing="10"
        ></textarea>
      </view>
    </view>
    
    <!-- 例句 -->
    <view class="form-group">
      <view class="section-header">
        <text class="label-text">例句</text>
        <view class="add-button" @click="addExample">
          <text class="add-icon">+</text>
          <text class="add-text">添加例句</text>
        </view>
      </view>
      
      <view v-if="formData.examples.length > 0" class="items-list">
        <view 
          v-for="(example, index) in formData.examples" 
          :key="index"
          class="example-item"
        >
          <view class="input-container mb-2">
            <textarea 
              class="form-textarea fixed-height en-text" 
              v-model="example.en" 
              placeholder="输入英文例句"
              :adjust-position="false"
              :show-confirm-bar="false"
              :disable-default-padding="true"
              :cursor-spacing="10"
            ></textarea>
          </view>
          <view class="input-container">
            <textarea 
              class="form-textarea fixed-height zh-text" 
              v-model="example.zh" 
              placeholder="输入中文翻译"
              :adjust-position="false"
              :show-confirm-bar="false"
              :disable-default-padding="true"
              :cursor-spacing="10"
            ></textarea>
            <view class="delete-button" @click="removeExample(index)">
              <text class="delete-icon">×</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-else class="empty-state">
        <text class="empty-text">添加例句有助于更好地理解单词用法</text>
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
  notes: [] // 注意事项
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

// 保存单词
const saveWord = async () => {
  // 添加表单验证
  if (!formData.name.trim()) {
    uni.showToast({
      title: '请输入单词',
      icon: 'none'
    });
    return;
  }
  
  if (formData.pos.length === 0) {
    uni.showToast({
      title: '请选择词性',
      icon: 'none'
    });
    return;
  }
  
  if (!formData.meaning.trim()) {
    uni.showToast({
      title: '请输入中文释义',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({ title: '保存中...' });
    
    // 处理数据
    const wordData = {
      name: formData.name.trim(),
      pos: processedPos.value,
      meaning: formData.meaning.trim(),
      examples: formData.examples.filter(ex => ex.en.trim() || ex.zh.trim()),
      notes: formData.notes.filter(note => note.trim())
    };
    
    if (isEditMode.value && currentWordId.value) {
      // 编辑模式
      wordData.id = currentWordId.value;
      await updateWord(currentWordId.value, wordData);
      uni.hideLoading();
      uni.showToast({
        title: '修改成功',
        icon: 'success'
      });
    } else {
      // 添加模式
      await addWord(wordData);
      uni.hideLoading();
      uni.showToast({
        title: '添加成功',
        icon: 'success'
      });
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
      // 设置表单数据
      formData.name = wordDetail.name || '';
      formData.meaning = wordDetail.meaning || '';
      
      // 处理词性 - 可能是字符串或数组
      if (typeof wordDetail.pos === 'string') {
        formData.pos = wordDetail.pos.split('/').filter(Boolean);
      } else if (Array.isArray(wordDetail.pos)) {
        formData.pos = [...wordDetail.pos];
      } else {
        formData.pos = [];
      }
      
      // 处理例句
      if (wordDetail.examples && Array.isArray(wordDetail.examples)) {
        formData.examples = [...wordDetail.examples];
      } else {
        formData.examples = [];
      }
      
      // 处理注意事项
      if (wordDetail.notes && Array.isArray(wordDetail.notes)) {
        formData.notes = [...wordDetail.notes];
      } else {
        formData.notes = [];
      }
      
      uni.hideLoading();
    } else {
      uni.hideLoading();
      uni.showToast({
        title: '单词不存在',
        icon: 'none'
      });
      
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
  }
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
    
    // 确保页面不被缓存
    try {
      // #ifdef APP-PLUS
      const currentWebview = plus.webview.currentWebview();
      if (currentWebview) {
        currentWebview.setStyle({
          cachemode: "noCache"
        });
        console.log('设置APP页面不缓存');
      }
      // #endif
    } catch (e) {
      console.error('设置页面不缓存失败:', e);
    }
    
    // 识别导航来源
    const getNavigationSource = () => {
      const pages = getCurrentPages();
      if (pages.length <= 1) {
        // 可能是通过tabBar直接打开
        return 'tabbar';
      }
      
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.route) {
        if (prevPage.route.includes('wordlist')) {
          return 'wordlist';
        } else {
          return prevPage.route;
        }
      }
      
      return 'unknown';
    };
    
    const navSource = getNavigationSource();
    console.log('导航来源:', navSource);
    
    // 针对不同来源的特殊处理
    if (navSource === 'wordlist' || navSource === 'tabbar') {
      // 延迟执行文本框修复操作
      setTimeout(() => {
        console.log('执行特殊来源页面渲染修复');
        
        // 强制刷新所有文本框
        refreshPage();
        
        // 延迟执行文本框高度修复
        setTimeout(fixMiniProgramTextareas, 300);
        setTimeout(fixMiniProgramTextareas, 600);
      }, 200);
    }
    
    // 尝试禁用页面缓存
    try {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && typeof currentPage.$getAppWebview === 'function') {
        const webview = currentPage.$getAppWebview();
        if (webview && typeof webview.setStyle === 'function') {
          // 设置页面不缓存
          webview.setStyle({
            disableScroll: false,
            cachemode: 'noCache'
          });
          console.log('成功设置页面不缓存');
        }
      }
    } catch (e) {
      console.error('设置页面不缓存失败:', e);
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
    query.selectAll('.form-textarea').boundingClientRect(rects => {
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
    pos: [...formData.pos],
    meaning: formData.meaning,
    examples: JSON.parse(JSON.stringify(formData.examples)),
    notes: formData.notes ? [...formData.notes] : []
  };
  
  // 清空数据触发视图更新
  resetForm();
  
  // 延迟恢复数据
  setTimeout(() => {
    formData.name = tempData.name;
    formData.pos = tempData.pos;
    formData.meaning = tempData.meaning;
    formData.examples = tempData.examples;
    formData.notes = tempData.notes;
    
    console.log('页面已刷新并恢复数据');
    
    // 强制处理文本框高度
    setTimeout(() => {
      fixMiniProgramTextareas();
      
      // #ifdef H5
      try {
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          console.log('重设H5文本框高度, 找到', textareas.length, '个文本框');
          textareas.forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
          });
        }
      } catch (e) {
        console.error('H5文本框高度重设失败:', e);
      }
      // #endif
      
      // 解决小程序环境文本框渲染问题
      // #ifdef MP
      try {
        // 触发滚动事件强制重新计算布局
        uni.pageScrollTo({ scrollTop: 0, duration: 0 });
        setTimeout(() => {
          uni.pageScrollTo({ scrollTop: 1, duration: 0 });
          setTimeout(() => {
            uni.pageScrollTo({ scrollTop: 0, duration: 0 });
          }, 10);
        }, 10);
      } catch (e) {
        console.error('小程序滚动触发重绘失败:', e);
      }
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
  query.selectAll('.form-textarea').boundingClientRect(rects => {
    if (rects && rects.length > 0) {
      console.log('找到', rects.length, '个文本框元素');
      
      // 检测是否有高度异常的文本框
      const hasAbnormalHeight = rects.some(rect => rect.height < 70);
      
      if (hasAbnormalHeight) {
        console.log('检测到异常高度的文本框，尝试修复');
        
        // 提取当前文本框内容
        const examplesBackup = formData.examples ? JSON.parse(JSON.stringify(formData.examples)) : [];
        const notesBackup = formData.notes ? [...formData.notes] : [];
        
        // 短暂清空所有文本框内容
        if (formData.examples && formData.examples.length > 0) {
          formData.examples.forEach((example, index) => {
            example.en = example.en + ' ';
            example.zh = example.zh + ' ';
          });
        }
        
        // 恢复内容，触发重新渲染
        setTimeout(() => {
          if (formData.examples && formData.examples.length > 0) {
            formData.examples = JSON.parse(JSON.stringify(examplesBackup));
          }
          
          if (formData.notes && formData.notes.length > 0) {
            formData.notes = [...notesBackup];
          }
          
          // 使用系统API强制重绘
          uni.pageScrollTo({
            scrollTop: 0,
            duration: 0
          });
          
          // 延迟后再次滚动，触发渲染
          setTimeout(() => {
            uni.pageScrollTo({
              scrollTop: 1,
              duration: 0
            });
            
            // 再次返回顶部
            setTimeout(() => {
              uni.pageScrollTo({
                scrollTop: 0,
                duration: 0
              });
              
              console.log('小程序文本框修复完成');
            }, 50);
          }, 50);
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
    
    // 检查是否为tabBar点击导航
    const isTabBarNavigation = () => {
      const pages = getCurrentPages();
      // 页面栈只有一个页面时，很可能是tabBar导航
      return pages.length <= 1;
    };
    
    // 对tabBar点击特殊处理
    if (isTabBarNavigation()) {
      console.log('检测到可能是tabBar导航，执行特殊修复');
      setTimeout(refreshPage, 100);
    }
    
    // 延迟执行以确保DOM已更新
    renderReset();
    setTimeout(renderReset, 300);
    
    // 额外添加一个延迟执行，提高成功率
    setTimeout(renderReset, 800);
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