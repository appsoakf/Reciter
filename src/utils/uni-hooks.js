/**
 * uni-app生命周期钩子适配器
 * 这个文件解决uni-app生命周期方法在Vue组合式API中的使用问题
 */

// 这里我们手动实现onLoad等生命周期钩子
export const onLoad = (callback) => {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage) {
      const originOnLoad = currentPage.onLoad;
      
      currentPage.onLoad = function(options) {
        if (typeof originOnLoad === 'function') {
          originOnLoad.call(this, options);
        }
        
        callback(options);
      };
    } else {
      console.warn('onLoad: 无法获取当前页面实例');
      
      // 使用onMounted作为备选方案
      setTimeout(() => {
        console.log('onLoad: 使用setTimeout模拟');
        callback({});
      }, 100);
    }
  } catch (e) {
    console.error('onLoad适配器错误:', e);
  }
};

export const onShow = (callback) => {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage) {
      const originOnShow = currentPage.onShow;
      
      currentPage.onShow = function() {
        if (typeof originOnShow === 'function') {
          originOnShow.call(this);
        }
        
        callback();
      };
    } else {
      console.warn('onShow: 无法获取当前页面实例');
    }
  } catch (e) {
    console.error('onShow适配器错误:', e);
  }
};

export const onHide = (callback) => {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage) {
      const originOnHide = currentPage.onHide;
      
      currentPage.onHide = function() {
        if (typeof originOnHide === 'function') {
          originOnHide.call(this);
        }
        
        callback();
      };
    } else {
      console.warn('onHide: 无法获取当前页面实例');
    }
  } catch (e) {
    console.error('onHide适配器错误:', e);
  }
};

export const onUnload = (callback) => {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage) {
      const originOnUnload = currentPage.onUnload;
      
      currentPage.onUnload = function() {
        if (typeof originOnUnload === 'function') {
          originOnUnload.call(this);
        }
        
        callback();
      };
    } else {
      console.warn('onUnload: 无法获取当前页面实例');
    }
  } catch (e) {
    console.error('onUnload适配器错误:', e);
  }
};

export const onPullDownRefresh = (callback) => {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage) {
      const originOnPullDownRefresh = currentPage.onPullDownRefresh;
      
      currentPage.onPullDownRefresh = function() {
        if (typeof originOnPullDownRefresh === 'function') {
          originOnPullDownRefresh.call(this);
        }
        
        callback();
      };
    } else {
      console.warn('onPullDownRefresh: 无法获取当前页面实例');
    }
  } catch (e) {
    console.error('onPullDownRefresh适配器错误:', e);
  }
};

export const onReachBottom = (callback) => {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage) {
      const originOnReachBottom = currentPage.onReachBottom;
      
      currentPage.onReachBottom = function() {
        if (typeof originOnReachBottom === 'function') {
          originOnReachBottom.call(this);
        }
        
        callback();
      };
    } else {
      console.warn('onReachBottom: 无法获取当前页面实例');
    }
  } catch (e) {
    console.error('onReachBottom适配器错误:', e);
  }
}; 