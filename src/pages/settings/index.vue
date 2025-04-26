<template>
  <view class="container">
    <!-- 数据设置 -->
    <view class="settings-group">
      <view class="group-title">数据设置</view>
      
      <view class="setting-item" @click="exportDataHandler">
        <view class="setting-label">
          <text class="label-text">数据导出</text>
          <text class="setting-sublabel">导出所有单词数据</text>
        </view>
        <view class="setting-control">
          <button class="action-btn export-btn" @click.stop="exportDataHandler">导出</button>
        </view>
      </view>
      
      <view class="setting-item" @click="importDataHandler">
        <view class="setting-label">
          <text class="label-text">数据导入</text>
          <text class="setting-sublabel">导入备份的单词数据</text>
        </view>
        <view class="setting-control">
          <button class="action-btn import-btn" @click.stop="importDataHandler">导入</button>
        </view>
      </view>
      
      <!-- 新增错题本导出功能 -->
      <view class="setting-item" @click="exportErrorBookHandler">
        <view class="setting-label">
          <text class="label-text">错题本导出</text>
          <text class="setting-sublabel">导出错题本数据</text>
        </view>
        <view class="setting-control">
          <button class="action-btn export-btn" @click.stop="exportErrorBookHandler">导出</button>
        </view>
      </view>
      
      <!-- 新增错题本导入功能 -->
      <view class="setting-item" @click="importErrorBookHandler">
        <view class="setting-label">
          <text class="label-text">错题本导入</text>
          <text class="setting-sublabel">导入备份的错题本数据</text>
        </view>
        <view class="setting-control">
          <button class="action-btn import-btn" @click.stop="importErrorBookHandler">导入</button>
        </view>
      </view>
      
      <view class="setting-item" @click="confirmClearDataHandler">
        <view class="setting-label">
          <text class="label-text danger-text">清空所有数据</text>
          <text class="setting-sublabel">删除所有单词数据</text>
        </view>
        <view class="setting-control">
          <button class="action-btn danger-btn" @click.stop="confirmClearDataHandler">清空</button>
        </view>
      </view>
    </view>
    
    <!-- 关于应用 -->
    <view class="settings-group">
      <view class="group-title">关于应用</view>
      
      <view class="setting-item">
        <view class="setting-label">
          <text class="label-text">版本</text>
        </view>
        <view class="setting-value">
          <text>1.0.0</text>
        </view>
      </view>
      
      <view class="setting-item">
        <view class="setting-label">
          <text class="label-text">开发者</text>
        </view>
        <view class="setting-value">
          <text>Reciter Team</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as ErrorBook from '@/services/errorbook';

// 定义一个全局变量用于存储文件数据，在Activity回调中使用
let pendingDataForExport = null;
let pendingFileNameForExport = null;
let fileCallback = null; // 用于存储文件操作的回调函数

// 直接定义事件处理函数
const exportDataHandler = () => {
  console.log('导出数据按钮被点击');
  exportData();
};

const importDataHandler = () => {
  console.log('导入数据按钮被点击');
  importData();
};

const exportErrorBookHandler = () => {
  console.log('导出错题本按钮被点击');
  exportErrorBook();
};

const importErrorBookHandler = () => {
  console.log('导入错题本按钮被点击');
  importErrorBook();
};

const confirmClearDataHandler = () => {
  console.log('清空数据按钮被点击');
  confirmClearData();
};

// 在组件挂载时加载设置和初始化文件操作
onMounted(() => {
  loadSettings();
  // 初始化Android文件操作
  initAndroidFileOperations();
});

// 统一初始化Android文件操作函数
function initAndroidFileOperations() {
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'android') {
    // 安卓10及以上需要使用新的文件访问API
    const Build = plus.android.importClass('android.os.Build');
    const isAndroid10Plus = Build.VERSION.SDK_INT >= 29; // Android 10 是API 29
    
    // 请求必要的权限
    requestAndroidPermissions(isAndroid10Plus)
      .then(() => {
        console.log('权限已授予，初始化文件操作');
        
        // 设置全局的Activity回调处理
        const main = plus.android.runtimeMainActivity();
        
        // 确保只有一个回调处理函数
        // 保存之前的回调，以避免覆盖其他功能的回调
        const originalOnActivityResult = main.onActivityResult;
        
        main.onActivityResult = function(requestCode, resultCode, data) {
          console.log(`onActivityResult: requestCode=${requestCode}, resultCode=${resultCode}`);
          
          // 只处理我们的请求码，其他请求转发给原始回调
          if (requestCode !== 1 && requestCode !== 2 && requestCode !== 3 && 
              requestCode !== 4 && requestCode !== 5 && requestCode !== 6) {
            if (typeof originalOnActivityResult === 'function') {
              return originalOnActivityResult(requestCode, resultCode, data);
            }
            return;
          }
          
          const Activity = plus.android.importClass('android.app.Activity');
          if (resultCode !== Activity.RESULT_OK) {
            if (requestCode === 2 || requestCode === 3 || requestCode === 5 || requestCode === 6) {
              // 用户取消了导出文件选择，尝试保存到默认位置
              console.log('用户取消了选择保存位置');
              if (pendingDataForExport && pendingFileNameForExport) {
                saveToDefaultLocation(pendingDataForExport, pendingFileNameForExport);
                // 清除临时数据
                pendingDataForExport = null;
                pendingFileNameForExport = null;
              }
            }
            return;
          }
          
          try {
            switch (requestCode) {
              case 1: // 导入单词数据文件请求码
                console.log('处理导入单词数据文件结果');
                try {
                  const uri = data.getData();
                  if (!uri) {
                    console.error('获取URI失败，URI为空');
                    throw new Error('获取URI失败');
                  }
                  
                  console.log('获取到导入文件URI:', uri.toString());
                  
                  const ContentResolver = plus.android.importClass('android.content.ContentResolver');
                  const resolver = main.getContentResolver();
                  const inputStream = resolver.openInputStream(uri);
                  
                  if (inputStream) {
                    const BufferedReader = plus.android.importClass('java.io.BufferedReader');
                    const InputStreamReader = plus.android.importClass('java.io.InputStreamReader');
                    const reader = new BufferedReader(new InputStreamReader(inputStream, 'UTF-8'));
                    
                    const StringBuilder = plus.android.importClass('java.lang.StringBuilder');
                    const sb = new StringBuilder();
                    let line;
                    
                    try {
                      while ((line = reader.readLine()) != null) {
                        sb.append(line);
                      }
                      
                      // 处理读取的文件内容
                      const fileContent = sb.toString();
                      console.log('文件内容读取成功，长度:', fileContent.length);
                      
                      if (fileContent.length > 0) {
                        processImportedData(fileContent);
                      } else {
                        console.error('读取的文件内容为空');
                        uni.showModal({
                          title: '导入失败',
                          content: '文件内容为空',
                          showCancel: false,
                          confirmText: '确定'
                        });
                      }
                    } finally {
                      // 关闭资源
                      try {
                        if (reader) reader.close();
                        if (inputStream) inputStream.close();
                      } catch (closeError) {
                        console.error('关闭输入流错误:', closeError);
                      }
                    }
                  } else {
                    console.error('无法打开输入流');
                    uni.showToast({
                      title: '无法打开文件',
                      icon: 'none'
                    });
                    tryReadDownloadDir();
                  }
                } catch (e) {
                  console.error('读取文件失败:', e);
                  uni.showModal({
                    title: '读取文件失败',
                    content: e.message || '未知错误',
                    showCancel: false,
                    confirmText: '确定'
                  });
                  
                  // 如果使用系统文件选择器失败，回退到下载目录
                  tryReadDownloadDir();
                }
                break;
                
              case 2: // 导出单词数据文件请求码
              case 5: // 导出错题本数据文件请求码
                console.log(`处理导出文件结果, 请求码: ${requestCode}`);
                try {
                  if (pendingDataForExport) {
                    const uri = data.getData();
                    console.log('获取到导出文件URI:', uri.toString());
                    
                    const ContentResolver = plus.android.importClass('android.content.ContentResolver');
                    const resolver = main.getContentResolver();
                    const outputStream = resolver.openOutputStream(uri);
                    
                    if (outputStream) {
                      const OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter');
                      const BufferedWriter = plus.android.importClass('java.io.BufferedWriter');
                      
                      let writer = null;
                      
                      try {
                        writer = new BufferedWriter(new OutputStreamWriter(outputStream, 'UTF-8'));
                        writer.write(pendingDataForExport);
                        writer.flush();
                        
                        // 获取显示路径
                        let displayPath = "您选择的位置";
                        try {
                          displayPath = uri.getPath();
                        } catch (pathError) {
                          console.error('获取路径错误:', pathError);
                        }
                        
                        // 显示成功消息
                        const successTitle = requestCode === 5 ? '错题本导出成功' : '导出成功';
                        uni.showModal({
                          title: successTitle,
                          content: `文件已保存到: ${displayPath}`,
                          showCancel: false,
                          confirmText: '确定'
                        });
                        
                        // 清除临时数据
                        pendingDataForExport = null;
                        pendingFileNameForExport = null;
                      } finally {
                        // 关闭资源
                        try {
                          if (writer) writer.close();
                          if (outputStream) outputStream.close();
                        } catch (closeError) {
                          console.error('关闭输出流错误:', closeError);
                        }
                      }
                    } else {
                      console.error('无法打开输出流');
                      throw new Error('无法打开输出流');
                    }
                  }
                } catch (e) {
                  console.error('保存文件失败:', e);
                  const errorTitle = requestCode === 5 ? '错题本导出失败' : '导出失败';
                  uni.showModal({
                    title: errorTitle,
                    content: '保存文件到您选择的位置失败: ' + (e.message || '未知错误'),
                    showCancel: false,
                    confirmText: '确定'
                  });
                  
                  // 尝试保存到默认位置
                  if (pendingDataForExport && pendingFileNameForExport) {
                    saveToDefaultLocation(pendingDataForExport, pendingFileNameForExport);
                    // 清除临时数据
                    pendingDataForExport = null;
                    pendingFileNameForExport = null;
                  }
                }
                break;
                
              case 3: // 选择目录请求码（单词数据）
              case 6: // 选择目录请求码（错题本数据）
                console.log(`处理目录选择结果, 请求码: ${requestCode}`);
                try {
                  if (pendingDataForExport && pendingFileNameForExport) {
                    const uri = data.getData();
                    console.log('获取到目录URI:', uri.toString());
                    
                    // 使用DocumentsContract创建文件
                    const DocumentsContract = plus.android.importClass('android.provider.DocumentsContract');
                    const ContentResolver = plus.android.importClass('android.content.ContentResolver');
                    
                    // 在选定目录中创建文件
                    const childUri = DocumentsContract.createDocument(
                      main.getContentResolver(), 
                      uri,
                      'application/json',
                      pendingFileNameForExport
                    );
                    
                    if (childUri) {
                      const resolver = main.getContentResolver();
                      const outputStream = resolver.openOutputStream(childUri);
                      
                      if (outputStream) {
                        const OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter');
                        const BufferedWriter = plus.android.importClass('java.io.BufferedWriter');
                        
                        let writer = null;
                        
                        try {
                          writer = new BufferedWriter(new OutputStreamWriter(outputStream, 'UTF-8'));
                          writer.write(pendingDataForExport);
                          writer.flush();
                          
                          // 简化获取路径
                          let displayPath = "您选择的目录";
                          try {
                            // 简单获取路径
                            displayPath = childUri.getPath();
                          } catch (pathError) {
                            console.error('获取路径错误:', pathError);
                          }
                          
                          // 显示成功消息
                          const successTitle = requestCode === 6 ? '错题本导出成功' : '导出成功';
                          uni.showModal({
                            title: successTitle,
                            content: `文件已保存到: ${displayPath}`,
                            showCancel: false,
                            confirmText: '确定'
                          });
                          
                          // 清除临时数据
                          pendingDataForExport = null;
                          pendingFileNameForExport = null;
                        } finally {
                          // 关闭资源
                          try {
                            if (writer) writer.close();
                            if (outputStream) outputStream.close();
                          } catch (closeError) {
                            console.error('关闭输出流错误:', closeError);
                          }
                        }
                      } else {
                        throw new Error('无法打开输出流');
                      }
                    } else {
                      throw new Error('无法在所选目录创建文件');
                    }
                  }
                } catch (e) {
                  console.error('在选定目录创建文件失败:', e);
                  const errorTitle = requestCode === 6 ? '错题本导出失败' : '导出失败';
                  uni.showModal({
                    title: errorTitle,
                    content: '在您选择的目录中创建文件失败: ' + (e.message || '未知错误'),
                    showCancel: false,
                    confirmText: '确定'
                  });
                  
                  // 尝试保存到默认位置
                  if (pendingDataForExport && pendingFileNameForExport) {
                    saveToDefaultLocation(pendingDataForExport, pendingFileNameForExport);
                    // 清除临时数据
                    pendingDataForExport = null;
                    pendingFileNameForExport = null;
                  }
                }
                break;
                
              case 4: // 导入错题本数据文件请求码
                console.log('处理导入错题本数据文件结果');
                try {
                  const uri = data.getData();
                  if (!uri) {
                    console.error('获取URI失败，URI为空');
                    throw new Error('获取URI失败');
                  }
                  
                  console.log('获取到导入错题本文件URI:', uri.toString());
                  
                  const ContentResolver = plus.android.importClass('android.content.ContentResolver');
                  const resolver = main.getContentResolver();
                  const inputStream = resolver.openInputStream(uri);
                  
                  if (inputStream) {
                    const BufferedReader = plus.android.importClass('java.io.BufferedReader');
                    const InputStreamReader = plus.android.importClass('java.io.InputStreamReader');
                    const reader = new BufferedReader(new InputStreamReader(inputStream, 'UTF-8'));
                    
                    const StringBuilder = plus.android.importClass('java.lang.StringBuilder');
                    const sb = new StringBuilder();
                    let line;
                    
                    try {
                      while ((line = reader.readLine()) != null) {
                        sb.append(line);
                      }
                      
                      // 处理读取的文件内容
                      const fileContent = sb.toString();
                      console.log('错题本文件内容读取成功，长度:', fileContent.length);
                      
                      if (fileContent.length > 0) {
                        processImportedErrorBookData(fileContent);
                      } else {
                        console.error('读取的错题本文件内容为空');
                        uni.showModal({
                          title: '导入失败',
                          content: '错题本文件内容为空',
                          showCancel: false,
                          confirmText: '确定'
                        });
                      }
                    } finally {
                      // 关闭资源
                      try {
                        if (reader) reader.close();
                        if (inputStream) inputStream.close();
                      } catch (closeError) {
                        console.error('关闭输入流错误:', closeError);
                      }
                    }
                  } else {
                    console.error('无法打开输入流');
                    uni.showToast({
                      title: '无法打开错题本文件',
                      icon: 'none'
                    });
                    tryReadErrorBookDownloadDir();
                  }
                } catch (e) {
                  console.error('读取错题本文件失败:', e);
                  uni.showModal({
                    title: '读取错题本文件失败',
                    content: e.message || '未知错误',
                    showCancel: false,
                    confirmText: '确定'
                  });
                  
                  // 如果使用系统文件选择器失败，回退到下载目录
                  tryReadErrorBookDownloadDir();
                }
                break;
            }
          } catch (error) {
            console.error('处理Activity结果时出错:', error);
          }
        };
      })
      .catch(error => {
        console.error('权限请求失败:', error);
      });
  }
  // #endif
}

// 请求Android权限的Promise包装函数
function requestAndroidPermissions(isAndroid10Plus) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    if (uni.getSystemInfoSync().platform === 'android') {
      let permissions = [];
      
      if (isAndroid10Plus) {
        // Android 10+使用存储访问框架，不需要请求存储权限
        resolve();
        return;
      } else {
        // 较旧的Android版本需要存储权限
        permissions = [
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.WRITE_EXTERNAL_STORAGE'
        ];
      }
      
      if (permissions.length > 0) {
        plus.android.requestPermissions(
          permissions,
          function(resultObj) {
            if (resultObj.granted.length === permissions.length) {
              resolve();
            } else {
              reject('权限未完全授予');
            }
          },
          function(error) {
            reject(error);
          }
        );
      } else {
        resolve();
      }
    } else {
      resolve();
    }
    // #endif
    
    // 非APP-PLUS环境
    // #ifndef APP-PLUS
    resolve();
    // #endif
  });
}

// 加载设置
const loadSettings = () => {
  try {
    const settingsStr = uni.getStorageSync('reciter_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      // 可以保留其他非学习相关的设置项
    }
  } catch (e) {
    console.error('加载设置失败:', e);
  }
};

// 保存设置
const saveSettings = () => {
  try {
    const settings = {
      // 保留其他需要的设置项
    };
    
    // 保存到本地存储
    uni.setStorageSync('reciter_settings', JSON.stringify(settings));
    
    uni.showToast({
      title: '设置已保存',
      icon: 'success',
      duration: 1500
    });
  } catch (e) {
    console.error('保存设置失败:', e);
    uni.showToast({
      title: '保存设置失败',
      icon: 'none'
    });
  }
};

// 导出数据
const exportData = () => {
  try {
    // 清除之前可能存在的临时数据
    pendingDataForExport = null;
    pendingFileNameForExport = null;
    
    // 获取所有需要导出的数据
    const wordsData = uni.getStorageSync('reciter_words') || '[]';
    const settingsData = uni.getStorageSync('reciter_settings') || '{}';
    
    // 构建导出数据对象
    const exportData = {
      words: JSON.parse(wordsData),
      settings: JSON.parse(settingsData),
      exportTime: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // 转换为JSON字符串
    const dataStr = JSON.stringify(exportData);
    
    // 保存到文件
    const fileName = `reciter_backup_${new Date().toISOString().replace(/[:.]/g, '_')}.json`;
    
    // 根据平台使用不同的文件保存方法
    // #ifdef APP-PLUS
    // 检查是否为Android平台
    if (uni.getSystemInfoSync().platform === 'android') {
      try {
        // 设置待处理的数据
        pendingDataForExport = dataStr;
        pendingFileNameForExport = fileName;
        
        // 安卓10及以上需要使用新的文件访问API
        const Build = plus.android.importClass('android.os.Build');
        const isAndroid10Plus = Build.VERSION.SDK_INT >= 29; // Android 10 是API 29
        
        // 使用系统文件选择器让用户选择保存位置
        const Intent = plus.android.importClass('android.content.Intent');
        const Uri = plus.android.importClass('android.net.Uri');
        
        // 创建ACTION_CREATE_DOCUMENT意图，让用户选择保存位置
        const main = plus.android.runtimeMainActivity();
        const intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType('application/json');
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        
        try {
          // 通过Activity启动文件保存对话框
          main.startActivityForResult(intent, 2);
          console.log('启动文件保存对话框');
        } catch (activityError) {
          console.error('启动文件选择器失败:', activityError);
          
          // 尝试备用方案：通过SAF框架创建文档
          try {
            const DocumentsContract = plus.android.importClass('android.provider.DocumentsContract');
            const intent2 = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            main.startActivityForResult(intent2, 3);
            console.log('启动目录选择对话框');
          } catch (treeError) {
            console.error('启动目录选择器失败:', treeError);
            
            // 如果目录选择器也失败，回退到默认保存位置
            saveToDefaultLocation(dataStr, fileName);
          }
        }
      } catch (e) {
        console.error('导出操作失败:', e);
        // 如果无法使用系统文件选择器，回退到默认保存位置
        saveToDefaultLocation(dataStr, fileName);
        // 清除临时数据
        pendingDataForExport = null;
        pendingFileNameForExport = null;
      }
    } else {
      // 非Android平台的APP-PLUS实现(iOS等)
      saveToPrivateDoc(dataStr, fileName);
    }
    // #endif
    
    // #ifdef H5
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    uni.showModal({
      title: '导出成功',
      content: '文件已下载到您的设备',
      showCancel: false,
      confirmText: '确定'
    });
    // #endif
    
    // #ifdef MP-WEIXIN
    // 微信小程序保存到本地
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFile({
      filePath: filePath,
      data: dataStr,
      encoding: 'utf8',
      success: () => {
        wx.saveFile({
          tempFilePath: filePath,
          success: (res) => {
            uni.showModal({
              title: '导出成功',
              content: '文件已保存',
              showCancel: false,
              confirmText: '确定'
            });
          },
          fail: () => {
            uni.showModal({
              title: '导出失败',
              content: '写入文件失败',
              showCancel: false,
              confirmText: '确定'
            });
          }
        });
      },
      fail: () => {
        uni.showModal({
          title: '导出失败',
          content: '写入文件失败',
          showCancel: false,
          confirmText: '确定'
        });
      }
    });
    // #endif
  } catch (error) {
    console.error('导出数据失败:', error);
    uni.showModal({
      title: '导出失败',
      content: error.message || '未知错误',
      showCancel: false,
      confirmText: '确定'
    });
  }
};

// 保存到默认的下载目录位置
function saveToDefaultLocation(dataStr, fileName) {
  try {
    // 获取下载目录
    const Context = plus.android.importClass('android.content.Context');
    const Environment = plus.android.importClass('android.os.Environment');
    const File = plus.android.importClass('java.io.File');
    const FileOutputStream = plus.android.importClass('java.io.FileOutputStream');
    
    // 创建下载目录文件夹
    const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
    console.log('下载目录路径:', downloadDir.getAbsolutePath());
    
    // 确保下载目录存在
    if (!downloadDir.exists()) {
      const mkdirResult = downloadDir.mkdirs();
      console.log('创建下载目录结果:', mkdirResult);
    }
    
    // 直接在下载目录中保存文件，不创建子文件夹
    const file = new File(downloadDir, fileName);
    console.log('要保存的文件路径:', file.getAbsolutePath());
    
    try {
      // 使用FileOutputStream替代FileWriter
      const fos = new FileOutputStream(file);
      const OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter');
      const osw = new OutputStreamWriter(fos, 'UTF-8');
      const BufferedWriter = plus.android.importClass('java.io.BufferedWriter');
      const bw = new BufferedWriter(osw);
      
      try {
        bw.write(dataStr);
        bw.flush();
        
        // 使用对话框代替Toast显示文件路径
        uni.showModal({
          title: '导出成功',
          content: `文件已保存至：\n${file.getAbsolutePath()}`,
          showCancel: false,
          confirmText: '确定'
        });
      } finally {
        // 确保所有资源都被关闭，顺序从内到外
        try {
          if (bw) bw.close();
          if (osw) osw.close();
          if (fos) fos.close();
        } catch (closeError) {
          console.error('关闭输出流错误:', closeError);
          // 不抛出关闭错误，继续执行
        }
      }
    } catch (fileWriteError) {
      console.error('写入文件失败:', fileWriteError);
      uni.showModal({
        title: '导出失败',
        content: '写入文件失败: ' + (fileWriteError?.message || '未知错误'),
        showCancel: false,
        confirmText: '确定'
      });
      // 如果直接保存到公共目录失败，尝试保存到应用私有目录
      saveToPrivateDoc(dataStr, fileName);
    }
  } catch (e) {
    console.error('Android文件保存失败:', e);
    // 如果直接保存到公共目录失败，尝试保存到应用私有目录
    saveToPrivateDoc(dataStr, fileName);
  }
}

// 保存到应用私有文档目录的函数
function saveToPrivateDoc(dataStr, fileName) {
  try {
    const filePath = `_doc/${fileName}`;
    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
      try {
        fs.root.getFile(fileName, { create: true, exclusive: false }, (fileEntry) => {
          try {
            fileEntry.createWriter((writer) => {
              writer.onwrite = () => {
                // 获取应用文档目录
                let docPath = null;
                try {
                  const Context = plus.android.importClass('android.content.Context');
                  const main = plus.android.runtimeMainActivity();
                  const files = main.getExternalFilesDir(null);
                  if (files) {
                    docPath = files.getAbsolutePath();
                  }
                } catch (e) {
                  console.error('获取应用文档目录失败:', e);
                }
                
                // 使用对话框代替Toast显示文件保存信息
                uni.showModal({
                  title: '导出成功',
                  content: docPath 
                    ? `文件已保存到应用文档目录：\n${docPath}/${fileName}`
                    : '文件已保存到应用文档目录',
                  showCancel: false,
                  confirmText: '确定'
                });
              };
              writer.onerror = (e) => {
                console.error('写入文件错误:', e);
                uni.showModal({
                  title: '导出失败',
                  content: '保存文件失败: ' + (e?.message || '未知错误'),
                  showCancel: false,
                  confirmText: '确定'
                });
              };
              
              try {
                writer.write(dataStr);
              } catch (writeError) {
                console.error('写入数据错误:', writeError);
                uni.showModal({
                  title: '导出失败',
                  content: '写入数据错误: ' + (writeError?.message || '未知错误'),
                  showCancel: false,
                  confirmText: '确定'
                });
              }
            }, (createWriterError) => {
              console.error('创建写入器错误:', createWriterError);
              uni.showModal({
                title: '导出失败',
                content: '创建写入器错误',
                showCancel: false,
                confirmText: '确定'
              });
            });
          } catch (fileEntryError) {
            console.error('文件Entry操作错误:', fileEntryError);
            uni.showModal({
              title: '导出失败',
              content: '文件操作错误',
              showCancel: false,
              confirmText: '确定'
            });
          }
        }, (getFileError) => {
          console.error('获取文件错误:', getFileError);
          uni.showModal({
            title: '导出失败',
            content: '获取文件错误',
            showCancel: false,
            confirmText: '确定'
          });
        });
      } catch (fsError) {
        console.error('文件系统操作错误:', fsError);
        uni.showModal({
          title: '导出失败',
          content: '文件系统操作错误',
          showCancel: false,
          confirmText: '确定'
        });
      }
    }, (requestFSError) => {
      console.error('请求文件系统错误:', requestFSError);
      uni.showModal({
        title: '导出失败',
        content: '请求文件系统错误',
        showCancel: false,
        confirmText: '确定'
      });
    });
  } catch (generalError) {
    console.error('保存到私有目录总体错误:', generalError);
    uni.showModal({
      title: '导出失败',
      content: '保存到私有目录错误: ' + (generalError?.message || '未知错误'),
      showCancel: false,
      confirmText: '确定'
    });
  }
}

// 导入数据
const importData = () => {
  console.log('importData函数被调用'); // 添加调试日志
  try {
    // #ifdef APP-PLUS
    // 检查是否为Android平台
    if (uni.getSystemInfoSync().platform === 'android') {
      // 首先尝试直接查找下载目录中的备份文件
      try {
        const hasBuckupFiles = hasBackupFilesInDownloads();
        if (hasBuckupFiles) {
          // 如果找到了备份文件，显示选择对话框
          tryReadDownloadDir();
        } else {
          // 如果没有找到备份文件，直接打开文件选择器
          openFileChooser();
        }
      } catch (e) {
        console.error('检查下载目录失败:', e);
        // 如果失败，直接打开文件选择器
        openFileChooser();
      }
    } else {
      // 非Android平台
      uni.showModal({
        title: '提示',
        content: '此功能仅支持Android平台',
        showCancel: false,
        confirmText: '确定'
      });
    }
    
    // 检查下载目录中是否有备份文件
    function hasBackupFilesInDownloads() {
      const Context = plus.android.importClass('android.content.Context');
      const Environment = plus.android.importClass('android.os.Environment');
      const File = plus.android.importClass('java.io.File');
      
      // 获取下载目录
      const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
      
      // 检查下载目录是否存在
      if (!downloadDir.exists()) {
        return false;
      }
      
      // 列出所有下载目录中的文件
      const files = downloadDir.listFiles();
      if (!files || files.length === 0) {
        return false;
      }
      
      // 查找备份文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.getName();
        if (fileName.startsWith('reciter_backup_') && fileName.endsWith('.json')) {
          return true;
        }
      }
      
      return false;
    }
    
    // 使用原生Intent打开文件选择器
    function openFileChooser() {
      try {
        const Intent = plus.android.importClass('android.content.Intent');
        const Uri = plus.android.importClass('android.net.Uri');
        
        const main = plus.android.runtimeMainActivity();
        // 使用ACTION_OPEN_DOCUMENT代替ACTION_GET_CONTENT，提供更好的文件选择体验
        const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType('*/*'); // 允许选择所有类型，避免某些设备过滤问题
        
        // 创建MIME类型数组
        try {
          // 注意：这里应该创建Java的String数组
          const StringClass = plus.android.importClass('java.lang.String');
          const mimeTypesArray = plus.android.newArray(StringClass, 2);
          mimeTypesArray[0] = 'application/json';
          mimeTypesArray[1] = 'text/plain';
          
          intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypesArray);
        } catch (mimeError) {
          console.error('设置MIME类型失败:', mimeError);
          // 如果设置MIME类型失败，直接设置为JSON
          intent.setType('application/json');
        }
        
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        
        try {
          // 通过Activity启动文件选择，使用请求码1区分导入操作
          main.startActivityForResult(intent, 1);
          console.log('启动文件选择对话框');
        } catch (activityError) {
          console.error('启动原生文件选择器失败:', activityError);
          // 如果直接启动选择器失败，尝试读取下载目录
          tryReadDownloadDir();
        }
      } catch (e) {
        console.error('创建文件选择器对象失败:', e);
        tryReadDownloadDir();
      }
    }
    
    // 尝试直接读取下载目录中的备份文件
    function tryReadDownloadDir() {
      try {
        const Context = plus.android.importClass('android.content.Context');
        const Environment = plus.android.importClass('android.os.Environment');
        const File = plus.android.importClass('java.io.File');
        
        // 获取下载目录
        const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        console.log('下载目录路径:', downloadDir.getAbsolutePath());
        
        // 检查下载目录是否存在
        if (!downloadDir.exists()) {
          console.log('下载目录不存在');
          throw new Error('下载目录不存在');
        }
        
        // 列出所有下载目录中的文件
        const files = downloadDir.listFiles();
        if (!files || files.length === 0) {
          console.log('下载目录为空');
          throw new Error('下载目录为空');
        }
        
        // 筛选出所有backup开头的json文件
        const backupFiles = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.getName();
          if (fileName.startsWith('reciter_backup_') && fileName.endsWith('.json')) {
            backupFiles.push({
              name: fileName,
              path: file.getAbsolutePath(),
              lastModified: file.lastModified()
            });
          }
        }
        
        console.log('找到的备份文件:', JSON.stringify(backupFiles));
        
        if (backupFiles.length === 0) {
          console.log('没有找到备份文件');
          openFileChooser();
          return;
        }
        
        // 按修改时间排序，最新的在前面
        backupFiles.sort((a, b) => b.lastModified - a.lastModified);
        
        const fileOptions = backupFiles.map(file => ({
          text: file.name,
          value: file.path
        }));
        
        // 显示选择对话框
        uni.showActionSheet({
          itemList: fileOptions.map(item => item.text),
          success: function(res) {
            const selectedFilePath = fileOptions[res.tapIndex].value;
            console.log('用户选择的文件:', selectedFilePath);
            
            // 读取选择的文件
            readSelectedFile(selectedFilePath);
          },
          fail: function(err) {
            console.log('用户取消选择');
            // 如果用户取消选择，则使用文件选择器
            openFileChooser();
          }
        });
      } catch (e) {
        console.error('读取下载目录失败:', e);
        // 如果读取下载目录失败，则使用文件选择器
        openFileChooser();
      }
    }
    
    // 读取选择的文件
    function readSelectedFile(filePath) {
      try {
        console.log('准备读取文件:', filePath);
        const File = plus.android.importClass('java.io.File');
        
        // 首先检查文件是否存在
        const file = new File(filePath);
        if (!file.exists()) {
          throw new Error('文件不存在');
        }
        
        if (!file.canRead()) {
          throw new Error('无法读取文件，没有读取权限');
        }
        
        // 使用FileInputStream读取文件
        const FileInputStream = plus.android.importClass('java.io.FileInputStream');
        const InputStreamReader = plus.android.importClass('java.io.InputStreamReader');
        const BufferedReader = plus.android.importClass('java.io.BufferedReader');
        
        let fis = null;
        let isr = null;
        let br = null;
        
        try {
          fis = new FileInputStream(file);
          isr = new InputStreamReader(fis, 'UTF-8');
          br = new BufferedReader(isr);
          
          // 一次性读取整个文件
          const StringBuilder = plus.android.importClass('java.lang.StringBuilder');
          const sb = new StringBuilder();
          let line = null;
          
          while ((line = br.readLine()) !== null) {
            sb.append(line);
          }
          const content = sb.toString();
          
          console.log('文件内容长度:', content.length);
          
          if (content.length > 0) {
            processImportedData(content);
          } else {
            throw new Error('文件内容为空');
          }
        } finally {
          // 确保所有资源都被关闭，顺序从内到外
          try {
            if (br) br.close();
            if (isr) isr.close();
            if (fis) fis.close();
          } catch (closeError) {
            console.error('关闭输入流错误:', closeError);
            // 不抛出关闭错误，继续执行
          }
        }
      } catch (e) {
        console.error('读取选择的文件失败:', e);
        uni.showModal({
          title: '读取文件失败',
          content: e.message || '未知错误',
          showCancel: false,
          confirmText: '确定'
        });
      }
    }
    // #endif
    
    // #ifdef H5
    console.log('H5环境中导入数据');
    // 创建一个文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // 监听文件选择
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) {
        console.log('没有选择文件');
        document.body.removeChild(fileInput);
        return;
      }
      
      console.log('选择的文件:', file.name);
      
      // 使用FileReader读取文件
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          console.log('文件内容长度:', content.length);
          
          if (content.length > 0) {
            processImportedData(content);
          } else {
            throw new Error('文件内容为空');
          }
        } catch (err) {
          console.error('读取文件内容失败:', err);
          uni.showModal({
            title: '导入失败',
            content: err.message || '未知错误',
            showCancel: false,
            confirmText: '确定'
          });
        } finally {
          // 移除文件输入元素
          document.body.removeChild(fileInput);
        }
      };
      
      reader.onerror = (err) => {
        console.error('读取文件错误:', err);
        uni.showModal({
          title: '导入失败',
          content: '读取文件失败',
          showCancel: false,
          confirmText: '确定'
        });
        document.body.removeChild(fileInput);
      };
      
      // 读取文件内容
      reader.readAsText(file);
    });
    
    // 触发文件选择对话框
    fileInput.click();
    // #endif
    
    // #ifdef MP-WEIXIN
    // 微信小程序相关代码...
    // #endif
  } catch (error) {
    console.error('导入数据总体失败:', error);
    uni.showModal({
      title: '导入失败',
      content: error.message || '未知错误',
      showCancel: false,
      confirmText: '确定'
    });
  }
};

// 处理导入的数据
const processImportedData = (dataStr) => {
  try {
    // 记录一下导入数据的长度，便于调试
    console.log('导入数据长度:', dataStr ? dataStr.length : 0);
    
    if (!dataStr || dataStr.trim() === '') {
      throw new Error('导入数据为空');
    }
    
    // 尝试解析JSON数据
    let importedData;
    try {
      importedData = JSON.parse(dataStr);
    } catch (jsonError) {
      console.error('JSON解析错误:', jsonError, '尝试解析前100个字符:', dataStr.substring(0, 100));
      console.log('尝试移除BOM标记后再解析');
      // 移除可能的BOM标记
      const dataWithoutBOM = dataStr.replace(/^\uFEFF/, '');
      
      try {
        importedData = JSON.parse(dataWithoutBOM);
      } catch (secondError) {
        console.error('第二次JSON解析失败:', secondError);
        throw new Error('导入的数据不是有效的JSON格式');
      }
    }
    
    // 验证导入数据的结构
    if (!importedData.words || !Array.isArray(importedData.words)) {
      throw new Error('数据格式不正确：缺少words数组字段');
    }
    
    // 确认导入
    uni.showModal({
      title: '确认导入',
      content: `发现${importedData.words.length}个单词数据，确定要导入吗？注意：导入将会覆盖已有的所有数据！`,
      confirmText: '确认导入',
      cancelText: '取消',
      success: (modalRes) => {
        if (modalRes.confirm) {
          // 直接覆盖现有数据，不再合并
          uni.setStorageSync('reciter_words', JSON.stringify(importedData.words));
          
          // 可选：导入设置
          if (importedData.settings) {
            uni.setStorageSync('reciter_settings', JSON.stringify(importedData.settings));
            // 重新加载设置
            loadSettings();
          }
          
          // 显示成功消息
          uni.showToast({
            title: '数据导入成功',
            icon: 'success',
            duration: 2000
          });
          
          // 通知其他页面更新
          uni.$emit('words-count-updated', { count: importedData.words.length });
          uni.$emit('refreshWordList', { imported: true });
        }
      }
    });
  } catch (parseError) {
    console.error('解析导入数据失败:', parseError);
    uni.showModal({
      title: '导入数据失败',
      content: parseError.message || '未知错误',
      showCancel: false,
      confirmText: '确定'
    });
  }
};

// 确认清空数据
const confirmClearData = () => {
  uni.showModal({
    title: '清空所有数据',
    content: '此操作将永久删除所有单词数据，且无法恢复，确定要继续吗？',
    confirmText: '确认清空',
    confirmColor: '#ff4d4f',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        clearAllData();
      }
    }
  });
};

// 清空所有数据
const clearAllData = () => {
  try {
    // 清空单词数据
    uni.setStorageSync('reciter_words', JSON.stringify([]));
    
    // 清空错题本数据
    uni.setStorageSync('reciter_errorbook', JSON.stringify([]));
    
    uni.showToast({
      title: '所有数据已清空',
      icon: 'success',
      duration: 2000
    });
    
    // 可选：保留其他设置
    const defaultSettings = {
      // 可以添加其他默认设置项
    };
    uni.setStorageSync('reciter_settings', JSON.stringify(defaultSettings));
    
    // 重新加载页面显示最新设置
    loadSettings();
    
    // 发送事件更新各页面内容
    console.log('发送清空数据相关事件通知...');
    
    // 通知首页更新单词数量
    uni.$emit('words-count-updated', { count: 0 });
    
    // 通知首页更新错题本数量
    uni.$emit('errors-count-updated', { count: 0 });
    
    // 通知错题本页面更新，设置清除标志为true
    uni.$emit('refresh-errorbook', { 
      cleared: true,
      timestamp: new Date().getTime() 
    });
    console.log('已发送错题本刷新事件(cleared=true)');
    
    // 跳转到单词列表页面并刷新
    setTimeout(() => {
      // 跳转到单词列表页面
      uni.switchTab({
        url: '/pages/wordlist/index',
        success: () => {
          // 通知其他页面刷新数据
          uni.$emit('refreshWordList', { cleared: true });
        }
      });
    }, 1000);
  } catch (error) {
    console.error('清空数据失败:', error);
    uni.showToast({
      title: '清空数据失败',
      icon: 'none'
    });
  }
};

// 检查下载目录中是否有错题本备份文件
function hasErrorBookBackupFilesInDownloads() {
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'android') {
    try {
      const Context = plus.android.importClass('android.content.Context');
      const Environment = plus.android.importClass('android.os.Environment');
      const File = plus.android.importClass('java.io.File');
      
      // 获取下载目录
      const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
      
      // 检查下载目录是否存在
      if (!downloadDir.exists()) {
        return false;
      }
      
      // 列出所有下载目录中的文件
      const files = downloadDir.listFiles();
      if (!files || files.length === 0) {
        return false;
      }
      
      // 查找错题本备份文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.getName();
        if (fileName.startsWith('reciter_errorbook_backup_') && fileName.endsWith('.json')) {
          return true;
        }
      }
    } catch (e) {
      console.error('检查下载目录中错题本备份文件失败:', e);
      return false;
    }
  }
  return false;
  // #endif
  
  // 非APP-PLUS环境
  // #ifndef APP-PLUS
  return false;
  // #endif
}

// 使用原生Intent打开错题本文件选择器
function openErrorBookFileChooser() {
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'android') {
    try {
      const Intent = plus.android.importClass('android.content.Intent');
      const Uri = plus.android.importClass('android.net.Uri');
      
      const main = plus.android.runtimeMainActivity();
      // 使用ACTION_OPEN_DOCUMENT代替ACTION_GET_CONTENT，提供更好的文件选择体验
      const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
      intent.setType('*/*'); // 允许选择所有类型，避免某些设备过滤问题
      
      // 创建MIME类型数组
      try {
        // 注意：这里应该创建Java的String数组
        const StringClass = plus.android.importClass('java.lang.String');
        const mimeTypesArray = plus.android.newArray(StringClass, 2);
        mimeTypesArray[0] = 'application/json';
        mimeTypesArray[1] = 'text/plain';
        
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypesArray);
      } catch (mimeError) {
        console.error('设置MIME类型失败:', mimeError);
        // 如果设置MIME类型失败，直接设置为JSON
        intent.setType('application/json');
      }
      
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      
      try {
        // 通过Activity启动文件选择，使用请求码4区分错题本导入操作
        main.startActivityForResult(intent, 4);
        console.log('启动错题本文件选择对话框');
      } catch (activityError) {
        console.error('启动原生文件选择器失败:', activityError);
        // 如果直接启动选择器失败，尝试读取下载目录
        tryReadErrorBookDownloadDir();
      }
    } catch (e) {
      console.error('创建文件选择器对象失败:', e);
      tryReadErrorBookDownloadDir();
    }
  }
  // #endif
}

// 尝试直接读取下载目录中的错题本备份文件
function tryReadErrorBookDownloadDir() {
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'android') {
    try {
      const Context = plus.android.importClass('android.content.Context');
      const Environment = plus.android.importClass('android.os.Environment');
      const File = plus.android.importClass('java.io.File');
      
      // 获取下载目录
      const downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
      console.log('下载目录路径:', downloadDir.getAbsolutePath());
      
      // 检查下载目录是否存在
      if (!downloadDir.exists()) {
        console.log('下载目录不存在');
        throw new Error('下载目录不存在');
      }
      
      // 列出所有下载目录中的文件
      const files = downloadDir.listFiles();
      if (!files || files.length === 0) {
        console.log('下载目录为空');
        throw new Error('下载目录为空');
      }
      
      // 筛选出所有错题本backup开头的json文件
      const backupFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.getName();
        if (fileName.startsWith('reciter_errorbook_backup_') && fileName.endsWith('.json')) {
          backupFiles.push({
            name: fileName,
            path: file.getAbsolutePath(),
            lastModified: file.lastModified()
          });
        }
      }
      
      console.log('找到的错题本备份文件:', JSON.stringify(backupFiles));
      
      if (backupFiles.length === 0) {
        console.log('没有找到错题本备份文件');
        openErrorBookFileChooser();
        return;
      }
      
      // 按修改时间排序，最新的在前面
      backupFiles.sort((a, b) => b.lastModified - a.lastModified);
      
      const fileOptions = backupFiles.map(file => ({
        text: file.name,
        value: file.path
      }));
      
      // 显示选择对话框
      uni.showActionSheet({
        itemList: fileOptions.map(item => item.text),
        success: function(res) {
          const selectedFilePath = fileOptions[res.tapIndex].value;
          console.log('用户选择的文件:', selectedFilePath);
          
          // 读取选择的文件
          readSelectedErrorBookFile(selectedFilePath);
        },
        fail: function(err) {
          console.log('用户取消选择');
          // 如果用户取消选择，则使用文件选择器
          openErrorBookFileChooser();
        }
      });
    } catch (e) {
      console.error('读取下载目录失败:', e);
      // 如果读取下载目录失败，则使用文件选择器
      openErrorBookFileChooser();
    }
  }
  // #endif
}

// 读取选择的错题本文件
function readSelectedErrorBookFile(filePath) {
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'android') {
    try {
      console.log('准备读取错题本文件:', filePath);
      const File = plus.android.importClass('java.io.File');
      
      // 首先检查文件是否存在
      const file = new File(filePath);
      if (!file.exists()) {
        throw new Error('文件不存在');
      }
      
      if (!file.canRead()) {
        throw new Error('无法读取文件，没有读取权限');
      }
      
      // 使用FileInputStream读取文件
      const FileInputStream = plus.android.importClass('java.io.FileInputStream');
      const InputStreamReader = plus.android.importClass('java.io.InputStreamReader');
      const BufferedReader = plus.android.importClass('java.io.BufferedReader');
      
      let fis = null;
      let isr = null;
      let br = null;
      
      try {
        fis = new FileInputStream(file);
        isr = new InputStreamReader(fis, 'UTF-8');
        br = new BufferedReader(isr);
        
        // 一次性读取整个文件
        const StringBuilder = plus.android.importClass('java.lang.StringBuilder');
        const sb = new StringBuilder();
        let line = null;
        
        while ((line = br.readLine()) !== null) {
          sb.append(line);
        }
        const content = sb.toString();
        
        console.log('文件内容长度:', content.length);
        
        if (content.length > 0) {
          processImportedErrorBookData(content);
        } else {
          throw new Error('文件内容为空');
        }
      } finally {
        // 确保所有资源都被关闭，顺序从内到外
        try {
          if (br) br.close();
          if (isr) isr.close();
          if (fis) fis.close();
        } catch (closeError) {
          console.error('关闭输入流错误:', closeError);
          // 不抛出关闭错误，继续执行
        }
      }
    } catch (e) {
      console.error('读取选择的错题本文件失败:', e);
      uni.showModal({
        title: '读取文件失败',
        content: e.message || '未知错误',
        showCancel: false,
        confirmText: '确定'
      });
    }
  }
  // #endif
}

// 新增错题本导入功能
const importErrorBook = () => {
  console.log('importErrorBook函数被调用'); // 添加调试日志
  try {
    // #ifdef APP-PLUS
    // 检查是否为Android平台
    if (uni.getSystemInfoSync().platform === 'android') {
      // 首先尝试直接查找下载目录中的备份文件
      try {
        const hasBackupFiles = hasErrorBookBackupFilesInDownloads();
        if (hasBackupFiles) {
          // 如果找到了备份文件，显示选择对话框
          tryReadErrorBookDownloadDir();
        } else {
          // 如果没有找到备份文件，直接打开文件选择器
          openErrorBookFileChooser();
        }
      } catch (e) {
        console.error('检查下载目录失败:', e);
        // 如果失败，直接打开文件选择器
        openErrorBookFileChooser();
      }
    } else {
      // 非Android平台
      uni.showModal({
        title: '提示',
        content: '此功能仅支持Android平台',
        showCancel: false,
        confirmText: '确定'
      });
    }
    // #endif
    
    // #ifdef H5
    console.log('H5环境中导入错题本数据');
    // 创建一个文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // 监听文件选择
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) {
        console.log('没有选择文件');
        document.body.removeChild(fileInput);
        return;
      }
      
      console.log('选择的错题本文件:', file.name);
      
      // 使用FileReader读取文件
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          console.log('错题本文件内容长度:', content.length);
          
          if (content.length > 0) {
            processImportedErrorBookData(content);
          } else {
            throw new Error('文件内容为空');
          }
        } catch (err) {
          console.error('读取错题本文件内容失败:', err);
          uni.showModal({
            title: '导入失败',
            content: err.message || '未知错误',
            showCancel: false,
            confirmText: '确定'
          });
        } finally {
          // 移除文件输入元素
          document.body.removeChild(fileInput);
        }
      };
      
      reader.onerror = (err) => {
        console.error('读取错题本文件错误:', err);
        uni.showModal({
          title: '导入失败',
          content: '读取错题本文件失败',
          showCancel: false,
          confirmText: '确定'
        });
        document.body.removeChild(fileInput);
      };
      
      // 读取文件内容
      reader.readAsText(file);
    });
    
    // 触发文件选择对话框
    fileInput.click();
    // #endif
    
    // #ifdef MP-WEIXIN
    // 微信小程序相关代码...
    // #endif
  } catch (error) {
    console.error('导入错题本数据总体失败:', error);
    uni.showModal({
      title: '导入失败',
      content: error.message || '未知错误',
      showCancel: false,
      confirmText: '确定'
    });
  }
};

// 处理导入的错题本数据
const processImportedErrorBookData = (dataStr) => {
  try {
    // 记录一下导入数据的长度，便于调试
    console.log('导入错题本数据长度:', dataStr ? dataStr.length : 0);
    
    if (!dataStr || dataStr.trim() === '') {
      throw new Error('导入数据为空');
    }
    
    // 尝试解析JSON数据
    let importedData;
    try {
      importedData = JSON.parse(dataStr);
    } catch (jsonError) {
      console.error('JSON解析错误:', jsonError, '尝试解析前100个字符:', dataStr.substring(0, 100));
      console.log('尝试移除BOM标记后再解析');
      // 移除可能的BOM标记
      const dataWithoutBOM = dataStr.replace(/^\uFEFF/, '');
      
      try {
        importedData = JSON.parse(dataWithoutBOM);
      } catch (secondError) {
        console.error('第二次JSON解析失败:', secondError);
        throw new Error('导入的数据不是有效的JSON格式');
      }
    }
    
    // 验证导入数据的结构
    if (!importedData.errors || !Array.isArray(importedData.errors)) {
      throw new Error('数据格式不正确：缺少errors数组字段');
    }
    
    // 确认导入
    uni.showModal({
      title: '确认导入',
      content: `发现${importedData.errors.length}条错题记录，确定要导入吗？注意：导入将会覆盖已有的所有错题本数据！`,
      confirmText: '确认导入',
      cancelText: '取消',
      success: (modalRes) => {
        if (modalRes.confirm) {
          // 直接覆盖现有数据
          uni.setStorageSync('reciter_errorbook', JSON.stringify(importedData.errors));
          
          // 显示成功消息
          uni.showToast({
            title: '错题本导入成功',
            icon: 'success',
            duration: 2000
          });
          
          // 通知其他页面更新错题本
          uni.$emit('refresh-errorbook', { imported: true });
          
          // 通知错题数量更新
          uni.$emit('errors-count-updated', { count: importedData.errors.length });
        }
      }
    });
  } catch (parseError) {
    console.error('解析导入错题本数据失败:', parseError);
    uni.showModal({
      title: '导入错题本失败',
      content: parseError.message || '未知错误',
      showCancel: false,
      confirmText: '确定'
    });
  }
};

// 错题本导出功能
const exportErrorBook = () => {
  try {
    // 清除之前可能存在的临时数据
    pendingDataForExport = null;
    pendingFileNameForExport = null;
    
    // 获取错题本数据
    const errorsData = uni.getStorageSync('reciter_errorbook') || '[]';
    
    // 构建导出数据对象
    const exportData = {
      errors: JSON.parse(errorsData),
      exportTime: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // 转换为JSON字符串
    const dataStr = JSON.stringify(exportData);
    
    // 保存到文件
    const fileName = `reciter_errorbook_backup_${new Date().toISOString().replace(/[:.]/g, '_')}.json`;
    
    // 根据平台使用不同的文件保存方法
    // #ifdef APP-PLUS
    // 检查是否为Android平台
    if (uni.getSystemInfoSync().platform === 'android') {
      try {
        // 设置待处理的数据
        pendingDataForExport = dataStr;
        pendingFileNameForExport = fileName;
        
        // 安卓10及以上需要使用新的文件访问API
        const Build = plus.android.importClass('android.os.Build');
        const isAndroid10Plus = Build.VERSION.SDK_INT >= 29; // Android 10 是API 29
        
        // 使用系统文件选择器让用户选择保存位置
        const Intent = plus.android.importClass('android.content.Intent');
        const Uri = plus.android.importClass('android.net.Uri');
        
        // 创建ACTION_CREATE_DOCUMENT意图，让用户选择保存位置
        const main = plus.android.runtimeMainActivity();
        const intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType('application/json');
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        
        try {
          // 通过Activity启动文件保存对话框，使用请求码5区分错题本导出操作
          main.startActivityForResult(intent, 5);
          console.log('启动错题本文件保存对话框');
        } catch (activityError) {
          console.error('启动文件选择器失败:', activityError);
          
          // 尝试备用方案：通过SAF框架创建文档
          try {
            const DocumentsContract = plus.android.importClass('android.provider.DocumentsContract');
            const intent2 = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            main.startActivityForResult(intent2, 6);
            console.log('启动目录选择对话框用于错题本导出');
          } catch (treeError) {
            console.error('启动目录选择器失败:', treeError);
            
            // 如果目录选择器也失败，回退到默认保存位置
            saveToDefaultLocation(dataStr, fileName);
          }
        }
      } catch (e) {
        console.error('导出操作失败:', e);
        // 如果无法使用系统文件选择器，回退到默认保存位置
        saveToDefaultLocation(dataStr, fileName);
        // 清除临时数据
        pendingDataForExport = null;
        pendingFileNameForExport = null;
      }
    } else {
      // 非Android平台的APP-PLUS实现(iOS等)
      saveToPrivateDoc(dataStr, fileName);
    }
    // #endif
    
    // #ifdef H5
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    uni.showModal({
      title: '导出成功',
      content: '错题本数据已下载到您的设备',
      showCancel: false,
      confirmText: '确定'
    });
    // #endif
    
    // #ifdef MP-WEIXIN
    // 微信小程序保存到本地
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFile({
      filePath: filePath,
      data: dataStr,
      encoding: 'utf8',
      success: () => {
        wx.saveFile({
          tempFilePath: filePath,
          success: (res) => {
            uni.showModal({
              title: '导出成功',
              content: '错题本数据已保存',
              showCancel: false,
              confirmText: '确定'
            });
          },
          fail: () => {
            uni.showModal({
              title: '导出失败',
              content: '写入文件失败',
              showCancel: false,
              confirmText: '确定'
            });
          }
        });
      },
      fail: () => {
        uni.showModal({
          title: '导出失败',
          content: '写入文件失败',
          showCancel: false,
          confirmText: '确定'
        });
      }
    });
    // #endif
  } catch (error) {
    console.error('导出错题本数据失败:', error);
    uni.showModal({
      title: '导出失败',
      content: error.message || '未知错误',
      showCancel: false,
      confirmText: '确定'
    });
  }
};
</script>

<style scoped>
/* 使用scoped确保样式只应用于当前组件 */
/* 添加!important以确保样式优先级 */
.container {
  padding: 20px !important;
  background-color: #f5f7fa !important;
  min-height: 100vh !important;
}

.settings-group {
  margin-bottom: 20px !important;
  background-color: #ffffff !important;
  border-radius: 16px !important;
  padding: 16px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05) !important;
}

.group-title {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #333 !important;
  margin-bottom: 16px !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.setting-item {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 16px 0 !important;
  border-bottom: 1px solid #f5f5f5 !important;
}

.setting-item:last-child {
  border-bottom: none !important;
  padding-bottom: 4px !important;
}

.setting-label {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
}

.label-text {
  font-size: 16px !important;
  font-weight: 500 !important;
  color: #333 !important;
}

.setting-sublabel {
  font-size: 13px !important;
  color: #8c8c8c !important;
  margin-top: 6px !important;
}

.setting-control {
  display: flex !important;
  align-items: center !important;
}

.action-btn {
  min-width: 80px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  padding: 0 20px !important;
  border-radius: 18px !important;
  text-align: center !important;
  border: none !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
}

.export-btn {
  background: linear-gradient(135deg, #4F46E5, #6366F1) !important;
  color: white !important;
}

.import-btn {
  background: linear-gradient(135deg, #10B981, #34D399) !important;
  color: white !important;
}

.danger-btn {
  background: linear-gradient(135deg, #f5365c, #ff4d7e) !important;
  color: white !important;
}

.danger-text {
  color: #f5365c !important;
}

.setting-value {
  padding: 0 10px !important;
  height: 36px !important;
  line-height: 36px !important;
  color: #666 !important;
  font-size: 14px !important;
  background-color: #f5f7fa !important;
  border-radius: 18px !important;
  min-width: 80px !important;
  text-align: center !important;
}

/* 媒体查询适配不同屏幕尺寸 */
@media screen and (max-width: 320px) {
  .container {
    padding: 10px !important;
  }
  
  .settings-group {
    padding: 12px !important;
    margin-bottom: 15px !important;
    border-radius: 12px !important;
  }
  
  .group-title {
    font-size: 16px !important;
    margin-bottom: 12px !important;
    padding-bottom: 8px !important;
  }
  
  .setting-item {
    padding: 12px 0 !important;
  }
  
  .label-text {
    font-size: 15px !important;
  }
  
  .action-btn {
    min-width: 70px !important;
    padding: 0 12px !important;
    font-size: 13px !important;
  }
}

@media screen and (min-width: 768px) {
  .container {
    max-width: 600px !important;
    margin: 0 auto !important;
  }
}
</style>

<!-- 添加全局样式确保兼容性 -->
<style>
/* 全局样式重置，确保没有默认样式干扰 */
page {
  background-color: #f5f7fa;
  min-height: 100%;
  box-sizing: border-box;
}
</style> 