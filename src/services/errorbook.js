/**
 * 错误记录服务
 * 提供错误记录相关的数据操作方法
 */

import { generateUUID, formatDate } from '@/utils/common';

// 本地存储键名
const ERROR_BOOK_KEY = 'reciter_errorbook';

/**
 * 获取所有错误记录
 * @returns {Promise<Array>} 错误记录数组
 */
export const getErrorList = () => {
  // 使用Promise接口以保持与wordlist服务一致的风格
  return new Promise((resolve) => {
    try {
      // 从本地存储获取数据
      const savedErrors = uni.getStorageSync(ERROR_BOOK_KEY);
      
      // 如果没有存储数据，返回空数组
      if (!savedErrors) {
        console.log('本地存储中没有错误记录数据，返回空数组');
        resolve([]);
        return;
      }
      
      try {
        const parsedData = JSON.parse(savedErrors);
        
        // 检查解析后的数据是否为数组
        if (Array.isArray(parsedData)) {
          console.log('读取到错误记录数据，长度:', parsedData.length);
          
          // 转换数据格式 - 兼容旧版数据结构（title/desc）和新版（content/translation）
          const normalizedData = parsedData.map(item => {
            // 创建标准化的数据对象
            return {
              id: item.id,
              // 优先使用content字段，如果不存在则使用title字段
              content: item.content || item.title || '',
              // 优先使用translation字段，如果不存在则使用desc字段
              translation: item.translation || item.desc || '',
              // 其他字段
              word: item.word || '',
              note: item.note || '',
              // 日期字段兼容处理
              createTime: item.createTime || item.date || new Date().toISOString(),
              updateTime: item.updateTime || null
            };
          });
          
          console.log('数据格式标准化完成，返回错误记录');
          resolve(normalizedData);
          return;
        }
        
        // 无法识别的格式，返回空数组
        console.warn('存储的错误记录数据格式无法识别，返回空数组');
        resolve([]);
      } catch (parseError) {
        console.error('解析错误记录数据失败:', parseError);
        resolve([]);
      }
    } catch (error) {
      console.error('获取错误记录列表失败:', error);
      resolve([]);
    }
  });
};

/**
 * 同步方式获取所有错误记录
 * @returns {Array} 错误记录数组
 */
export const getErrorListSync = () => {
  try {
    // 从本地存储获取数据
    const savedErrors = uni.getStorageSync(ERROR_BOOK_KEY);
    
    // 如果没有存储数据，返回空数组
    if (!savedErrors) {
      console.log('同步方法：本地存储中没有错误记录数据，返回空数组');
      return [];
    }
    
    try {
      const parsedData = JSON.parse(savedErrors);
      
      // 检查解析后的数据是否为数组
      if (Array.isArray(parsedData)) {
        console.log('同步方法读取到错误记录数据，长度:', parsedData.length);
        
        // 转换数据格式 - 兼容旧版数据结构（title/desc）和新版（content/translation）
        const normalizedData = parsedData.map(item => {
          // 创建标准化的数据对象
          return {
            id: item.id,
            // 优先使用content字段，如果不存在则使用title字段
            content: item.content || item.title || '',
            // 优先使用translation字段，如果不存在则使用desc字段
            translation: item.translation || item.desc || '',
            // 其他字段
            word: item.word || '',
            note: item.note || '',
            // 日期字段兼容处理
            createTime: item.createTime || item.date || new Date().toISOString(),
            updateTime: item.updateTime || null
          };
        });
        
        return normalizedData;
      }
      
      // 无法识别的格式，返回空数组
      console.warn('同步方法：存储的错误记录数据格式无法识别，返回空数组');
      return [];
    } catch (parseError) {
      console.error('解析错误记录数据失败:', parseError);
      return [];
    }
  } catch (error) {
    console.error('获取错误记录列表失败:', error);
    return [];
  }
};

/**
 * 根据ID获取错误记录详情
 * @param {string} id 错误记录ID
 * @returns {Promise<Object|null>} 错误记录对象或null
 */
export const getErrorById = (id) => {
  return new Promise((resolve) => {
    try {
      // 获取所有错误记录
      const errors = getErrorListSync();
      
      // 查找对应ID的错误记录
      const error = errors.find(item => item.id === id) || null;
      
      if (error) {
        console.log('找到错误记录:', id);
      } else {
        console.log('未找到错误记录:', id);
      }
      
      resolve(error);
    } catch (error) {
      console.error('获取错误记录详情失败:', error);
      resolve(null);
    }
  });
};

/**
 * 添加错误记录
 * @param {Object} error 错误对象
 * @returns {Promise<Object|null>} 添加的错误对象或null
 */
export const addError = (error) => {
  return new Promise((resolve) => {
    try {
      // 获取当前错误记录列表(原始格式)
      const rawData = uni.getStorageSync(ERROR_BOOK_KEY);
      let errorList = [];
      
      try {
        if (rawData) {
          errorList = JSON.parse(rawData);
          if (!Array.isArray(errorList)) {
            errorList = [];
          }
        }
      } catch (e) {
        console.error('解析现有数据失败，将创建新的数组', e);
        errorList = [];
      }
      
      // 创建新错误记录 - 使用新格式保存
      const newError = {
        id: generateUUID(),
        content: error.content || '',
        translation: '', // 默认为空字符串
        word: '',        // 默认为空字符串
        note: error.note || '',
        createTime: new Date().toISOString(),
      };
      
      // 添加到列表开头
      errorList.unshift(newError);
      
      // 保存到本地存储
      uni.setStorageSync(ERROR_BOOK_KEY, JSON.stringify(errorList));
      console.log('添加错误记录成功, ID:', newError.id);
      
      resolve(newError);
    } catch (error) {
      console.error('添加错误记录失败:', error);
      resolve(null);
    }
  });
};

/**
 * 更新错误记录
 * @param {Object} error 错误记录对象
 * @returns {Promise<boolean>} 是否更新成功
 */
export const updateError = (error) => {
  return new Promise((resolve) => {
    try {
      // 获取原始数据
      const rawData = uni.getStorageSync(ERROR_BOOK_KEY);
      if (!rawData) {
        console.warn('没有找到错误记录数据');
        resolve(false);
        return;
      }
      
      try {
        // 解析原始数据
        const errors = JSON.parse(rawData);
        if (!Array.isArray(errors)) {
          console.warn('错误记录数据格式不正确');
          resolve(false);
          return;
        }
        
        // 查找并更新错误记录
        const index = errors.findIndex(item => item.id === error.id);
        
        if (index === -1) {
          console.warn('未找到要更新的错误记录:', error.id);
          resolve(false);
          return;
        }
        
        // 保留原始数据的格式，同时更新内容
        // 如果原始数据使用 title/desc 格式，则保持这种格式
        const originalError = errors[index];
        const updatedError = { ...originalError };
        
        // 更新内容字段（兼容新旧格式）
        if ('content' in originalError) {
          updatedError.content = error.content;
        } else if ('title' in originalError) {
          updatedError.title = error.content;
        }
        
        // 旧数据保持原样，不进行更新
        // 如果前端没有提供这些字段，保留原始值
        
        // 更新其他字段
        updatedError.note = error.note || originalError.note || '';
        
        // 更新时间字段（兼容新旧格式）
        if ('updateTime' in originalError) {
          updatedError.updateTime = new Date().toISOString();
        } else {
          // 对于旧格式，我们仍然添加新的字段
          updatedError.updateTime = new Date().toISOString();
        }
        
        // 更新数组中的对象
        errors[index] = updatedError;
        
        // 保存到本地存储
        uni.setStorageSync(ERROR_BOOK_KEY, JSON.stringify(errors));
        console.log('更新错误记录成功, ID:', error.id);
        
        resolve(true);
      } catch (parseError) {
        console.error('解析错误记录数据失败:', parseError);
        resolve(false);
      }
    } catch (error) {
      console.error('更新错误记录失败:', error);
      resolve(false);
    }
  });
};

/**
 * 删除错误记录
 * @param {string} id 错误记录ID
 * @returns {Promise<boolean>} 是否删除成功
 */
export const deleteError = (id) => {
  return new Promise((resolve) => {
    try {
      // 获取原始数据
      const rawData = uni.getStorageSync(ERROR_BOOK_KEY);
      if (!rawData) {
        console.warn('没有找到错误记录数据');
        resolve(false);
        return;
      }
      
      try {
        // 解析原始数据
        const errors = JSON.parse(rawData);
        if (!Array.isArray(errors)) {
          console.warn('错误记录数据格式不正确');
          resolve(false);
          return;
        }
        
        // 过滤掉要删除的错误记录
        const filteredErrors = errors.filter(item => item.id !== id);
        
        if (filteredErrors.length === errors.length) {
          console.warn('未找到要删除的错误记录:', id);
          resolve(false);
          return;
        }
        
        // 保存到本地存储
        uni.setStorageSync(ERROR_BOOK_KEY, JSON.stringify(filteredErrors));
        console.log('删除错误记录成功, ID:', id);
        
        resolve(true);
      } catch (parseError) {
        console.error('解析错误记录数据失败:', parseError);
        resolve(false);
      }
    } catch (error) {
      console.error('删除错误记录失败:', error);
      resolve(false);
    }
  });
};

/**
 * 搜索错误记录
 * @param {string} keyword 搜索关键词
 * @returns {Promise<Array>} 搜索结果数组
 */
export const searchErrors = (keyword) => {
  return new Promise((resolve) => {
    try {
      // 直接从本地存储获取当前数据
      const errors = getErrorListSync();
      
      // 如果关键词为空，返回全部错误记录
      if (!keyword) {
        resolve(errors);
        return;
      }
      
      const lowercaseKeyword = keyword.toLowerCase();
      
      // 搜索内容和备注
      const results = errors.filter(error => 
        (error.content && error.content.toLowerCase().includes(lowercaseKeyword)) || 
        (error.note && error.note.toLowerCase().includes(lowercaseKeyword))
      );
      
      console.log(`搜索关键词 "${keyword}" 找到 ${results.length} 条结果`);
      resolve(results);
    } catch (error) {
      console.error('搜索错误记录失败:', error);
      resolve([]);
    }
  });
};

export default {
  getErrorList,
  getErrorListSync,
  getErrorById,
  addError,
  updateError,
  deleteError,
  searchErrors
}; 