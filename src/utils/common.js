/**
 * 通用工具函数
 */

/**
 * 生成UUID
 * @returns {string} 生成的UUID
 */
export const generateUUID = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

/**
 * 格式化日期
 * @param {string} isoString ISO格式的日期字符串
 * @param {string} format 格式模板 (可选)
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (isoString, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '';
  }
};

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间(ms)
 * @returns {Function} 防抖处理后的函数
 */
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

export default {
  generateUUID,
  formatDate,
  debounce
}; 