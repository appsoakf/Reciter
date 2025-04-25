/**
 * 单词服务
 * 提供单词相关的数据操作方法
 */

// 本地存储键名
const STORAGE_KEY = 'reciter_words';

// 用于跟踪最后一次通知的单词数量和时间
let lastNotifiedCount = null;
let lastNotifyTime = 0;

/**
 * 获取所有单词
 * @param {boolean} [silent=false] 是否静默加载，为true则不会触发数量更新事件
 * @returns {Promise<Array>} 单词数组
 */
export const getWordList = (silent = false) => {
  // 使用同步实现，但保留Promise接口以保持兼容性
  return new Promise((resolve) => {
    try {
      // 先从本地存储获取数据
      const savedWords = uni.getStorageSync(STORAGE_KEY);
      
      // 如果没有存储数据，返回空数组
      if (!savedWords) {
        console.log('本地存储中没有单词数据，返回空数组');
        if (!silent) notifyWordCountUpdate(0);
        resolve([]);
        return;
      }
      
      try {
        const parsedData = JSON.parse(savedWords);
        
        // 检查是否存在forceEmpty标志
        if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
          console.log('检测到forceEmpty标志，返回空数组');
          if (!silent) notifyWordCountUpdate(0);
          resolve([]);
          return;
        }
        
        // 处理不同格式的存储数据
        if (Array.isArray(parsedData)) {
          // 旧格式：直接是数组
          console.log('读取到数组格式数据，长度:', parsedData.length);
          if (!silent) notifyWordCountUpdate(parsedData.length);
          resolve(parsedData);
          return;
        } else if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.words)) {
          // 新格式：包含words数组的对象
          console.log('读取到对象格式数据，words长度:', parsedData.words.length);
          if (!silent) notifyWordCountUpdate(parsedData.words.length);
          resolve(parsedData.words);
          return;
        }
        
        // 无法识别的格式，返回空数组
        console.warn('存储的数据格式无法识别，返回空数组');
        if (!silent) notifyWordCountUpdate(0);
        resolve([]);
      } catch (parseError) {
        console.error('解析单词数据失败:', parseError);
        if (!silent) notifyWordCountUpdate(0);
        resolve([]);
      }
    } catch (error) {
      console.error('获取单词列表出错:', error);
      if (!silent) notifyWordCountUpdate(0);
      resolve([]);
    }
  });
};

/**
 * 同步方式获取所有单词
 * @returns {Array} 单词数组
 */
export const getWordListSync = () => {
  try {
    // 先从本地存储获取数据
    const savedWords = uni.getStorageSync(STORAGE_KEY);
    
    // 如果没有存储数据，返回空数组
    if (!savedWords) {
      console.log('同步方法：本地存储中没有单词数据，返回空数组');
      return [];
    }
    
    try {
      const parsedData = JSON.parse(savedWords);
      
      // 检查是否存在forceEmpty标志或空数组
      if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
        console.log('同步方法检测到forceEmpty标志，返回空数组');
        return [];
      }
      
      // 处理不同格式的存储数据
      if (Array.isArray(parsedData)) {
        // 旧格式：直接是数组
        console.log('同步方法读取到数组格式数据，长度:', parsedData.length);
        return parsedData;
      } else if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.words)) {
        // 新格式：包含words数组的对象
        console.log('同步方法读取到对象格式数据，words长度:', parsedData.words.length);
        return parsedData.words;
      }
      
      // 无法识别的格式，返回空数组
      console.warn('同步方法：存储的数据格式无法识别，返回空数组');
      return [];
    } catch (parseError) {
      console.error('解析单词数据失败:', parseError);
      return [];
    }
  } catch (error) {
    console.error('获取单词列表出错:', error);
    return [];
  }
};

/**
 * 根据ID获取单词详情
 * @param {number} id 单词ID
 * @returns {Promise<Object|null>} 单词对象或null
 */
export const getWordById = (id) => {
  // 使用同步实现，但保留Promise接口以保持兼容性
  return new Promise((resolve) => {
    const numId = typeof id === 'string' ? Number(id) : id;
    
    try {
      // 检查是否设置了forceEmpty标志
      const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
      if (savedWordsStr) {
        try {
          const parsedData = JSON.parse(savedWordsStr);
          if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
            console.log('getWordById检测到forceEmpty标志，返回null');
            resolve(null);
            return;
          }
        } catch (parseError) {
          console.error('解析存储数据失败:', parseError);
        }
      }
      
      // 从本地存储获取
      if (savedWordsStr) {
        try {
          // 解析存储的数据，支持旧格式和新格式
          const parsedData = JSON.parse(savedWordsStr);
          const words = Array.isArray(parsedData) ? parsedData : 
                       (parsedData && Array.isArray(parsedData.words) ? parsedData.words : null);
          
          if (words) {
            // 查找对应ID的单词
            const word = words.find(item => item.id === numId);
            
            if (word) {
              resolve(word);
              return;
            }
          }
        } catch (parseError) {
          console.error('解析单词数据失败:', parseError);
        }
      }
      
      // 如果没找到，返回null
      resolve(null);
    } catch (error) {
      console.error('获取单词详情出错:', error);
      resolve(null);
    }
  });
};

/**
 * 同步方式根据ID获取单词详情
 * @param {number} id 单词ID
 * @returns {Object|null} 单词对象或null
 */
export const getWordByIdSync = (id) => {
  const numId = typeof id === 'string' ? Number(id) : id;
  
  try {
    // 检查是否设置了forceEmpty标志
    const savedWordsStr = uni.getStorageSync(STORAGE_KEY);
    if (savedWordsStr) {
      try {
        const parsedData = JSON.parse(savedWordsStr);
        if (parsedData && typeof parsedData === 'object' && parsedData.forceEmpty === true) {
          console.log('getWordByIdSync检测到forceEmpty标志，返回null');
          return null;
        }
      } catch (parseError) {
        console.error('解析存储数据失败:', parseError);
      }
    }
    
    // 从本地存储获取
    if (savedWordsStr) {
      try {
        // 解析存储的数据，支持旧格式和新格式
        const parsedData = JSON.parse(savedWordsStr);
        const words = Array.isArray(parsedData) ? parsedData : 
                     (parsedData && Array.isArray(parsedData.words) ? parsedData.words : null);
        
        if (words) {
          // 查找对应ID的单词
          const word = words.find(item => item.id === numId);
          
          if (word) {
            return word;
          }
        }
      } catch (parseError) {
        console.error('解析单词数据失败:', parseError);
      }
    }
    
    // 如果没找到，返回null
    return null;
  } catch (error) {
    console.error('获取单词详情出错:', error);
    return null;
  }
};

/**
 * 通知单词数量更新
 * @param {number} count 单词数量
 */
const notifyWordCountUpdate = (count) => {
  // 发送事件通知
  if (typeof uni !== 'undefined' && uni.$emit) {
    // 避免重复通知相同的数量
    if (lastNotifiedCount === count) {
      console.log('跳过相同数量的通知:', count);
      return;
    }
    
    // 防止短时间内多次通知
    const now = Date.now();
    if (now - lastNotifyTime < 300) { // 300毫秒内不重复通知
      console.log('通知频率过高，跳过本次通知');
      return;
    }
    
    console.log('发送单词数量更新事件，当前数量:', count);
    lastNotifiedCount = count;
    lastNotifyTime = now;
    
    uni.$emit('words-count-updated', { count: count });
    
    // 也发送全局数据更新通知
    uni.$emit('global-data-updated');
  }
};

/**
 * 添加新单词
 * @param {Object} word 单词对象
 * @returns {Promise<Array>} 更新后的单词数组
 */
export const addWord = (word) => {
  return new Promise((resolve) => {
    try {
      // 直接从本地存储获取当前数据
      let words = getWordListSync();
      
      // 生成新的ID
      const newId = words.length > 0 ? Math.max(...words.map(item => item.id)) + 1 : 1;
      
      // 创建新单词对象
      const newWord = {
        id: newId,
        ...word,
      };
      
      // 将新单词添加到数组
      const newWords = [...words, newWord];
      
      // 保存到本地存储
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(newWords));
      
      // 通知单词数量更新
      notifyWordCountUpdate(newWords.length);
      
      resolve(newWords);
    } catch (error) {
      console.error('添加单词出错:', error);
      resolve([]);
    }
  });
};

/**
 * 更新单词
 * @param {Object} word 单词对象
 * @returns {Promise<Array>} 更新后的单词数组
 */
export const updateWord = (id, updatedWord) => {
  console.log(`准备更新ID为${id}的单词`, updatedWord);
  
  return new Promise((resolve, reject) => {
    try {
      // 从存储中获取当前单词列表
      const savedWords = uni.getStorageSync(STORAGE_KEY);
      if (!savedWords) {
        console.error('更新单词失败：未找到本地存储的单词数据');
        reject(new Error('未找到本地存储的单词数据'));
        return;
      }
      
      try {
        // 解析存储的数据
        let data = JSON.parse(savedWords);
        let words;
        let isNewFormat = false;
        
        // 根据存储格式获取单词列表
        if (Array.isArray(data)) {
          console.log('检测到旧格式存储数据（数组）');
          words = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.words)) {
          console.log('检测到新格式存储数据（对象包含words数组）');
          words = data.words;
          isNewFormat = true;
        } else {
          console.error('更新单词失败：未识别的存储数据格式');
          reject(new Error('未识别的存储数据格式'));
          return;
        }
        
        // 确保ID是数字类型
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        console.log(`处理的ID为: ${numId}，类型: ${typeof numId}`);
        
        // 查找要更新的单词索引
        const index = words.findIndex(word => word.id === numId);
        if (index === -1) {
          console.error(`更新单词失败：找不到ID为${id}的单词`);
          reject(new Error(`找不到ID为${id}的单词`));
          return;
        }
        
        console.log(`找到ID为${numId}的单词，索引位置: ${index}`);
        
        // 更新单词，保留原有ID
        const originalId = words[index].id;
        const originalName = words[index].name;
        updatedWord.id = originalId;
        
        // 确保单词有基本属性
        if (!updatedWord.examples) updatedWord.examples = [];
        if (!updatedWord.relatedWords) updatedWord.relatedWords = [];
        if (!updatedWord.notes) updatedWord.notes = [];
        
        console.log(`更新单词: ${originalName} -> ${updatedWord.name}`);
        
        // 替换单词
        words[index] = updatedWord;
        
        // 保存更新后的数据
        let dataToSave;
        if (isNewFormat) {
          data.words = words;
          dataToSave = data;
        } else {
          dataToSave = words;
        }
        
        uni.setStorageSync(STORAGE_KEY, JSON.stringify(dataToSave));
        console.log('已将更新后的单词保存到本地存储');
        
        // 清除所有相关缓存
        // 1. 清除单词ID缓存
        if (typeof uni.$wordIdCache !== 'undefined') {
          console.log(`清除ID为${numId}的单词缓存`);
          if (uni.$wordIdCache && uni.$wordIdCache[numId]) {
            delete uni.$wordIdCache[numId];
          }
          // 如果名称变了，也可能需要清除其他缓存
          console.log('为安全起见，清空整个wordIdCache');
          uni.$wordIdCache = {};
        }
        
        // 2. 清除全局预加载缓存
        if (typeof uni.$wordPreloadCache !== 'undefined') {
          console.log('清除全局单词预加载缓存');
          uni.$wordPreloadCache = {};
        }
        
        // 3. 尝试清除页面缓存
        try {
          console.log('尝试清除页面缓存');
          uni.navigateBack({
            delta: 0, // 重新加载当前页面
            success: () => {
              console.log('成功重新加载当前页面');
            },
            fail: (err) => {
              console.log('页面重新加载失败，可能在非导航上下文中:', err);
            }
          });
        } catch (cacheErr) {
          console.log('清除页面缓存失败，这是正常的，如果不在导航上下文中', cacheErr);
        }
        
        // 发出单词更新通知
        try {
          console.log('发出单词更新事件通知');
          uni.$emit('word-updated', { id: numId, word: updatedWord });
          uni.$emit('words-count-updated');
          uni.$emit('global-data-updated');
        } catch (e) {
          console.error('发出单词更新事件时出错:', e);
        }
        
        resolve(updatedWord);
      } catch (parseErr) {
        console.error('解析数据失败:', parseErr);
        reject(new Error('单词数据解析失败'));
      }
    } catch (error) {
      console.error('更新单词时出错:', error, error.stack);
      reject(error);
    }
  });
};

/**
 * 删除单词
 * @param {number} id 单词ID
 * @returns {Promise<Array>} 更新后的单词数组
 */
export const deleteWord = (id) => {
  return new Promise((resolve) => {
    try {
      console.log(`准备删除ID为${id}的单词`);
      
      // 直接从本地存储获取当前数据
      let words = getWordListSync();
      
      // 过滤掉要删除的单词
      const filteredWords = words.filter(item => item.id !== id);
      
      // 保存到本地存储
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(filteredWords));
      
      // 清除所有相关缓存
      // 1. 清除单词ID缓存
      if (typeof uni.$wordIdCache !== 'undefined') {
        console.log(`清除ID为${id}的单词缓存`);
        if (uni.$wordIdCache && uni.$wordIdCache[id]) {
          delete uni.$wordIdCache[id];
        }
        console.log('为安全起见，清空整个wordIdCache');
        uni.$wordIdCache = {};
      }
      
      // 2. 清除全局预加载缓存
      if (typeof uni.$wordPreloadCache !== 'undefined') {
        console.log('清除全局单词预加载缓存');
        uni.$wordPreloadCache = {};
      }
      
      // 通知单词数量更新
      notifyWordCountUpdate(filteredWords.length);
      
      // 发出全局数据更新通知
      try {
        console.log('发出单词数据更新事件通知');
        uni.$emit('global-data-updated');
      } catch (e) {
        console.error('发出事件时出错:', e);
      }
      
      resolve(filteredWords);
    } catch (error) {
      console.error('删除单词出错:', error);
      resolve([]);
    }
  });
};

/**
 * 搜索单词
 * @param {string} keyword 搜索关键词
 * @returns {Promise<Array>} 搜索结果数组
 */
export const searchWords = (keyword) => {
  return new Promise((resolve) => {
    try {
      // 直接从本地存储获取当前数据
      let words = getWordListSync();
      
      if (!keyword) {
        resolve(words);
        return;
      }
      
      const lowercaseKeyword = keyword.toLowerCase();
      
      // 搜索单词和含义
      const results = words.filter(word => 
        word.name.toLowerCase().includes(lowercaseKeyword) || 
        word.meaning.includes(lowercaseKeyword)
      );
      
      resolve(results);
    } catch (error) {
      console.error('搜索单词出错:', error);
      resolve([]);
    }
  });
}; 