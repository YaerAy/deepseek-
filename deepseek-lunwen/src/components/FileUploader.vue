<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, Document } from '@element-plus/icons-vue';

const props = defineProps({
  onFileLoaded: Function
});

const fileInput = ref(null);
const dragActive = ref(false);

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    readFile(file);
  }
};

// 处理拖放
const handleDragOver = (e) => {
  e.preventDefault();
  dragActive.value = true;
};

const handleDragLeave = () => {
  dragActive.value = false;
};

const handleDrop = (e) => {
  e.preventDefault();
  dragActive.value = false;
  
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    readFile(file);
  }
};

// 读取文件内容
const readFile = (file) => {
  if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
    ElMessage.error('请上传Markdown(.md)或文本(.txt)文件');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      
      // 尝试解析标题和内容
      let title = '';
      let text = content;
      
      // 如果是Markdown，尝试提取标题
      if (file.name.endsWith('.md')) {
        const lines = content.split('\n');
        if (lines.length > 0 && lines[0].startsWith('# ')) {
          title = lines[0].substring(2);
          text = lines.slice(1).join('\n').trim();
        }
      } else {
        // 对于文本文件，使用文件名作为标题
        title = file.name.replace('.txt', '');
      }
      
      // 调用父组件的回调函数
      if (props.onFileLoaded) {
        props.onFileLoaded({
          title,
          content: text
        });
      }
      
      ElMessage({
        message: '文件已成功加载',
        type: 'success'
      });
    } catch (error) {
      console.error('读取文件失败', error);
      ElMessage.error('读取文件失败');
    }
  };
  
  reader.onerror = () => {
    ElMessage.error('读取文件失败');
  };
  
  reader.readAsText(file);
};

// 触发文件选择对话框
const triggerFileInput = () => {
  fileInput.value.click();
};
</script>

<template>
  <div 
    class="file-uploader"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    :class="{ 'drag-active': dragActive }"
  >
    <input 
      type="file" 
      ref="fileInput" 
      @change="handleFileSelect" 
      accept=".md,.txt" 
      style="display: none"
    />
    
    <div class="upload-content">
      <el-icon class="upload-icon"><Upload /></el-icon>
      <div class="upload-text">
        <p>拖放文件到此处或</p>
        <el-button type="primary" @click="triggerFileInput">选择文件</el-button>
      </div>
      <p class="upload-hint">支持 .md 和 .txt 格式</p>
    </div>
  </div>
</template>

<style scoped>
.file-uploader {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--card-bg-color);
  margin-bottom: 20px;
}

.drag-active {
  border-color: var(--highlight-color);
  background-color: rgba(64, 158, 255, 0.1);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.upload-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: 15px;
}

.upload-text {
  margin-bottom: 10px;
}

.upload-hint {
  font-size: 0.8em;
  color: var(--text-secondary);
  margin-top: 10px;
}

@media (max-width: 576px) {
  .file-uploader {
    padding: 15px;
  }
  
  .upload-content {
    padding: 10px 0;
  }
  
  .upload-icon {
    font-size: 36px;
  }
}
</style>
