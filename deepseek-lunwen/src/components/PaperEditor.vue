<script setup>
import { ref, watch, computed, inject } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { Document, Download, Delete, Upload, Collection } from '@element-plus/icons-vue';
import { marked } from 'marked';
import FileUploader from './FileUploader.vue';
import TemplateLibrary from './TemplateLibrary.vue';

const paperTitle = ref('');
const paperContent = ref('');
const editorTabs = ref('write');
const isLoading = ref(false);
const savedStatus = ref('');
const showUploader = ref(false);
const showTemplates = ref(false);

// 保存草稿
const saveDraft = () => {
  localStorage.setItem('paperDraft', JSON.stringify({
    title: paperTitle.value,
    content: paperContent.value,
    timestamp: new Date().toLocaleString()
  }));
  savedStatus.value = '已保存 - ' + new Date().toLocaleString();
  ElMessage({
    message: '草稿已保存到本地',
    type: 'success'
  });
};

// 载入草稿
const loadDraft = () => {
  try {
    const draft = JSON.parse(localStorage.getItem('paperDraft'));
    if (draft) {
      paperTitle.value = draft.title || '';
      paperContent.value = draft.content || '';
      savedStatus.value = '上次保存 - ' + draft.timestamp;
      ElMessage({
        message: '草稿已载入',
        type: 'success'
      });
    }
  } catch (error) {
    console.error('加载草稿失败', error);
    ElMessage.error('加载草稿失败');
  }
};

// 清空编辑器
const clearEditor = () => {
  paperTitle.value = '';
  paperContent.value = '';
  savedStatus.value = '';
  ElMessage({
    message: '编辑器已清空',
    type: 'info'
  });
};

// 处理文件上传
const handleFileLoaded = (data) => {
  if (paperTitle.value || paperContent.value) {
    if (!confirm('当前编辑器中有内容，是否覆盖？')) {
      return;
    }
  }

  paperTitle.value = data.title;
  paperContent.value = data.content;
  saveDraft();
  showUploader.value = false;
};

// 处理模板选择
const handleTemplateSelect = (data) => {
  if (paperTitle.value || paperContent.value) {
    if (!confirm('当前编辑器中有内容，是否覆盖？')) {
      return;
    }
  }

  paperTitle.value = data.title;
  paperContent.value = data.content;
  saveDraft();
  showTemplates.value = false;
};

// 自动保存
let autoSaveTimer = null;
const setupAutoSave = () => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    if (paperTitle.value || paperContent.value) {
      saveDraft();
    }
  }, 60000); // 每分钟自动保存
};

// 初始化时载入草稿
loadDraft();
setupAutoSave();

// 导出为Markdown
const exportMarkdown = () => {
  const markdown = `# ${paperTitle.value}\n\n${paperContent.value}`;
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${paperTitle.value || '论文'}.md`;
  link.click();
  ElMessage({
    message: '已导出为Markdown文件',
    type: 'success'
  });
};

// 统计字数
const wordCount = computed(() => {
  return paperContent.value.length;
});
</script>

<template>
  <div class="paper-editor">
    <div class="editor-header">
      <h2>论文编辑器</h2>
      <div class="editor-tabs">
        <el-radio-group v-model="editorTabs" size="large">
          <el-radio-button label="write">撰写</el-radio-button>
          <el-radio-button label="preview">预览</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="editor-actions">
      <div class="action-group">
        <el-button type="primary" @click="saveDraft" :icon="Document">保存草稿</el-button>
        <el-button @click="loadDraft" :icon="Download">载入草稿</el-button>
        <el-button @click="clearEditor" :icon="Delete">清空</el-button>
        <el-button type="success" @click="exportMarkdown" :icon="Download">导出</el-button>
      </div>

      <div class="action-group">
        <el-button type="info" @click="showUploader = !showUploader" :icon="Upload">
          {{ showUploader ? '隐藏上传器' : '上传文件' }}
        </el-button>
        <el-button type="warning" @click="showTemplates = !showTemplates" :icon="Collection">
          {{ showTemplates ? '隐藏模板' : '论文模板' }}
        </el-button>
      </div>

      <span class="save-status">{{ savedStatus }}</span>
    </div>

    <FileUploader v-if="showUploader" :onFileLoaded="handleFileLoaded" />

    <TemplateLibrary v-if="showTemplates" :onTemplateSelect="handleTemplateSelect" />

    <div class="editor-body" v-if="editorTabs === 'write'">
      <el-input
        v-model="paperTitle"
        placeholder="输入论文标题"
        class="title-input"
        maxlength="100"
        show-word-limit
      />
      <el-input
        v-model="paperContent"
        type="textarea"
        placeholder="输入论文内容，支持Markdown格式"
        :rows="25"
        class="content-input"
        resize="vertical"
        :autosize="{ minRows: 20, maxRows: 40 }"
      />
      <div class="editor-footer">
        <span class="word-count">字数统计: {{ wordCount }}</span>
      </div>
    </div>

    <div class="preview-area" v-else>
      <div class="preview-content">
        <h1>{{ paperTitle || '无标题' }}</h1>
        <div v-html="marked.parse(paperContent || '')"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paper-editor {
  flex: 3; /* 增加编辑器的比例 */
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止flex子项溢出 */
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  width: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.editor-tabs {
  margin-bottom: 10px;
}

.editor-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.action-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.title-input {
  margin-bottom: 20px;
  font-size: 1.2em;
}

.content-input {
  font-family: 'Courier New', Courier, monospace;
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-footer {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.word-count {
  color: var(--text-secondary);
  font-size: 0.9em;
}

.save-status {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.9em;
}

.preview-area {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 20px;
  background-color: var(--preview-bg);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.preview-content {
  max-width: 800px;
  margin: 0 auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .paper-editor {
    padding: 15px;
  }

  .editor-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .editor-tabs {
    margin-top: 10px;
    align-self: center;
  }

  .editor-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .action-group {
    justify-content: center;
    margin-bottom: 10px;
  }

  .save-status {
    width: 100%;
    text-align: center;
    margin-top: 10px;
    margin-left: 0;
  }
}
</style>