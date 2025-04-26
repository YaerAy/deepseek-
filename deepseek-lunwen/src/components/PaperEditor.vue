<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import { Document, Download, Delete, Upload, Collection, Edit, Setting } from '@element-plus/icons-vue';
import { marked } from 'marked';
import FileUploader from './FileUploader.vue';
import TemplateLibrary from './TemplateLibrary.vue';

// 基本状态
const paperTitle = ref('');
const paperContent = ref('');
const editorTabs = ref('write');
const savedStatus = ref('');
const showUploader = ref(false);
const showTemplates = ref(false);

// 段落编辑相关状态
const selectedParagraph = ref('');
const paragraphStartIndex = ref(0);
const paragraphEndIndex = ref(0);
const isOptimizingParagraph = ref(false);

// 修改建议弹窗相关状态
const showSuggestionDialog = ref(false);
const suggestionTitle = ref('');
const suggestionList = ref([]);
const currentOptimizationType = ref('');

// AI生成相关状态
const apiKey = ref(localStorage.getItem('deepseekApiKey') || '');
const isGeneratingOutline = ref(false);
const isGeneratingContent = ref(false);
const outlineGenerated = ref(false);
const modelMode = ref('reasoner'); // 'reasoner' 或 'chat'
const reduceAIDetection = ref(true); // 默认启用降低AI检测率
const streamingContent = ref('');
const streamingReasoning = ref('');
const isStreaming = ref(false);

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

// 检查API密钥
const checkApiKey = () => {
  if (!apiKey.value) {
    ElMessage.error('请先设置DeepSeek API密钥');
    return false;
  }
  return true;
};

// 保存API密钥
const saveApiKey = () => {
  localStorage.setItem('deepseekApiKey', apiKey.value);
  ElMessage({
    message: 'API密钥已保存',
    type: 'success'
  });
};

// 生成论文大纲
const generateOutline = async () => {
  if (!checkApiKey()) return;

  if (!paperTitle.value.trim()) {
    ElMessage.warning('请先输入论文标题');
    return;
  }

  isGeneratingOutline.value = true;
  streamingContent.value = '';
  streamingReasoning.value = '';
  isStreaming.value = true;

  try {
    // 准备请求参数
    const requestParams = {
      assistantType: 'outline',
      userPrompt: `请根据以下论文标题，生成一个详细的学术论文大纲：\n\n${paperTitle.value}`,
      stream: true,
      max_tokens: 4000,
      apiKey: apiKey.value,
      reduceAIDetection: reduceAIDetection.value
    };

    // 创建EventSource连接
    const eventSource = new EventSource(`http://localhost:3000/api/assistant?data=${encodeURIComponent(JSON.stringify(requestParams))}`);

    // 监听消息事件
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        // 流式生成完成
        eventSource.close();
        isStreaming.value = false;
        isGeneratingOutline.value = false;

        // 将生成的大纲设置为论文内容
        paperContent.value = streamingContent.value;
        outlineGenerated.value = true;

        ElMessage({
          message: '大纲生成完成，请检查并编辑',
          type: 'success'
        });
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // 处理错误消息
        if (data.error) {
          ElMessage.error(data.message || '生成过程中发生错误');
          eventSource.close();
          isStreaming.value = false;
          isGeneratingOutline.value = false;
          return;
        }

        // 处理特殊标记
        if (data.type === 'switch_to_content') {
          return;
        }

        // 提取内容
        const chunk = data.choices[0].delta;

        if (chunk.reasoning_content) {
          streamingReasoning.value += chunk.reasoning_content;
        } else if (chunk.content) {
          streamingContent.value += chunk.content;
        }
      } catch (error) {
        console.error('解析流数据失败', error);
      }
    };

    // 监听错误
    eventSource.onerror = (error) => {
      console.error('流式连接错误', error);
      eventSource.close();
      isStreaming.value = false;
      isGeneratingOutline.value = false;
      ElMessage.error('流式连接错误');
    };
  } catch (error) {
    console.error('API请求失败', error);
    isStreaming.value = false;
    isGeneratingOutline.value = false;
    ElMessage.error(`请求失败: ${error.response?.data?.message || error.message || '未知错误'}`);
  }
};

// 生成论文内容
const generateContent = async () => {
  if (!checkApiKey()) return;

  if (!paperTitle.value.trim()) {
    ElMessage.warning('请先输入论文标题');
    return;
  }

  if (!paperContent.value.trim()) {
    ElMessage.warning('请先生成或编辑论文大纲');
    return;
  }

  isGeneratingContent.value = true;
  streamingContent.value = '';
  streamingReasoning.value = '';
  isStreaming.value = true;

  try {
    // 准备请求参数
    const requestParams = {
      assistantType: 'custom',
      userPrompt: `请根据以下论文标题和大纲，生成完整的学术论文内容：\n\n标题：${paperTitle.value}\n\n大纲：\n${paperContent.value}`,
      stream: true,
      max_tokens: 8000,
      apiKey: apiKey.value,
      reduceAIDetection: reduceAIDetection.value
    };

    // 根据模型模式选择不同的模型
    if (modelMode.value === 'reasoner') {
      requestParams.model = 'deepseek-reasoner';
    } else {
      requestParams.model = 'deepseek-chat';
    }

    // 创建EventSource连接
    const eventSource = new EventSource(`http://localhost:3000/api/assistant?data=${encodeURIComponent(JSON.stringify(requestParams))}`);

    // 监听消息事件
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        // 流式生成完成
        eventSource.close();
        isStreaming.value = false;
        isGeneratingContent.value = false;

        // 将生成的内容设置为论文内容
        paperContent.value = streamingContent.value;

        // 保存草稿
        saveDraft();

        ElMessage({
          message: '论文内容生成完成',
          type: 'success'
        });
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // 处理错误消息
        if (data.error) {
          ElMessage.error(data.message || '生成过程中发生错误');
          eventSource.close();
          isStreaming.value = false;
          isGeneratingContent.value = false;
          return;
        }

        // 处理特殊标记
        if (data.type === 'switch_to_content') {
          return;
        }

        // 提取内容
        const chunk = data.choices[0].delta;

        if (chunk.reasoning_content) {
          streamingReasoning.value += chunk.reasoning_content;
        } else if (chunk.content) {
          streamingContent.value += chunk.content;
        }
      } catch (error) {
        console.error('解析流数据失败', error);
      }
    };

    // 监听错误
    eventSource.onerror = (error) => {
      console.error('流式连接错误', error);
      eventSource.close();
      isStreaming.value = false;
      isGeneratingContent.value = false;
      ElMessage.error('流式连接错误');
    };
  } catch (error) {
    console.error('API请求失败', error);
    isStreaming.value = false;
    isGeneratingContent.value = false;
    ElMessage.error(`请求失败: ${error.response?.data?.message || error.message || '未知错误'}`);
  }
};

// 处理段落选择
const handleParagraphSelect = (event) => {
  // 如果不是在写作模式或者正在生成内容，则不处理
  if (editorTabs.value !== 'write' || isGeneratingOutline.value || isGeneratingContent.value) {
    return;
  }

  // 获取textarea元素
  const textArea = event.target;

  // 获取选中的文本
  const selectedText = paperContent.value.substring(textArea.selectionStart, textArea.selectionEnd).trim();

  // 更新选中的段落内容
  selectedParagraph.value = selectedText;

  if (!selectedText) {
    return;
  }

  console.log("文本已选中:", selectedText, "长度:", selectedText.length);

  // 保存选中文本在整个内容中的位置
  paragraphStartIndex.value = textArea.selectionStart;
  paragraphEndIndex.value = textArea.selectionEnd;
};



// 优化选中的段落
const optimizeParagraph = async (optimizationType) => {
  if (!checkApiKey()) return;

  if (!selectedParagraph.value.trim()) {
    ElMessage.warning('请先选择段落');
    return;
  }

  // 保存当前选中的段落，防止在API请求过程中被清空
  const currentSelectedParagraph = selectedParagraph.value;
  const currentStartIndex = paragraphStartIndex.value;
  const currentEndIndex = paragraphEndIndex.value;

  isOptimizingParagraph.value = true;
  currentOptimizationType.value = optimizationType;

  // 显示加载状态
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在生成修改建议...',
    background: 'rgba(0, 0, 0, 0.7)'
  });

  try {
    // 准备请求参数
    let prompt = '';
    let dialogTitle = '';

    // 使用更简洁的提示词
    switch (optimizationType) {
      case 'polish':
        dialogTitle = '润色建议';
        prompt = `任务：分析段落并提供5条润色建议，使其更流畅专业\n段落：${currentSelectedParagraph}\n以简洁的列表形式输出建议，每条不超过15字，不要解释。`;
        break;
      case 'expand':
        dialogTitle = '扩展建议';
        prompt = `任务：分析段落并提供5条扩展建议\n段落：${currentSelectedParagraph}\n以简洁的列表形式输出建议，每条不超过15字，不要解释。`;
        break;
      case 'simplify':
        dialogTitle = '简化建议';
        prompt = `任务：分析段落并提供5条简化建议\n段落：${currentSelectedParagraph}\n以简洁的列表形式输出建议，每条不超过15字，不要解释。`;
        break;
      case 'academic':
        dialogTitle = '学术化建议';
        prompt = `任务：分析段落并提供5条学术化建议\n段落：${currentSelectedParagraph}\n以简洁的列表形式输出建议，每条不超过15字，不要解释。`;
        break;
      default:
        dialogTitle = '优化建议';
        prompt = `任务：分析段落并提供5条改进建议\n段落：${currentSelectedParagraph}\n以简洁的列表形式输出建议，每条不超过15字，不要解释。`;
    }

    const requestParams = {
      assistantType: 'polish',
      userPrompt: prompt,
      stream: true, // 使用流式响应
      max_tokens: 500, // 减少最大token数
      temperature: 0.7, // 添加温度参数，使响应更快
      apiKey: apiKey.value,
      reduceAIDetection: reduceAIDetection.value
    };

    // 根据模型模式选择不同的模型
    if (modelMode.value === 'reasoner') {
      requestParams.model = 'deepseek-reasoner';
    } else {
      requestParams.model = 'deepseek-chat';
    }

    // 创建一个变量来存储流式响应的内容
    let streamedContent = '';

    // 创建EventSource连接
    const eventSource = new EventSource(`http://localhost:3000/api/assistant?data=${encodeURIComponent(JSON.stringify(requestParams))}`);

    // 监听消息事件
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        // 流式生成完成
        eventSource.close();

        // 解析建议列表
        const suggestionItems = parseSuggestions(streamedContent);

        // 显示建议弹窗
        suggestionTitle.value = dialogTitle;
        suggestionList.value = suggestionItems;

        // 确保弹窗中显示的是当前选中的段落
        selectedParagraph.value = currentSelectedParagraph;
        paragraphStartIndex.value = currentStartIndex;
        paragraphEndIndex.value = currentEndIndex;

        showSuggestionDialog.value = true;

        // 关闭加载状态
        loadingInstance.close();

        isOptimizingParagraph.value = false;

        ElMessage({
          message: '已生成修改建议',
          type: 'success'
        });

        return;
      }

      try {
        const data = JSON.parse(event.data);

        // 处理错误消息
        if (data.error) {
          ElMessage.error(data.message || '生成过程中发生错误');
          eventSource.close();
          loadingInstance.close();
          isOptimizingParagraph.value = false;
          return;
        }

        // 提取内容
        const chunk = data.choices[0].delta;

        if (chunk.content) {
          streamedContent += chunk.content;

          // 更新加载状态文本，显示进度
          loadingInstance.setText(`正在生成修改建议...(已生成${streamedContent.length}个字符)`);
        }
      } catch (error) {
        console.error('解析流数据失败', error);
      }
    };

    // 监听错误
    eventSource.onerror = (error) => {
      console.error('流式连接错误', error);
      eventSource.close();
      loadingInstance.close();
      isOptimizingParagraph.value = false;
      ElMessage.error('流式连接错误');
    };
  } catch (error) {
    console.error('API请求失败', error);
    ElMessage.error(`请求失败: ${error.response?.data?.message || error.message || '未知错误'}`);
    loadingInstance.close();
    isOptimizingParagraph.value = false;
  }
};

// 解析AI返回的建议文本，提取出建议列表
const parseSuggestions = (text) => {
  // 清理文本，移除可能的前导和尾随文本
  const cleanedText = text.replace(/^(.*?)\s*?(?=\d+\.|[-*])/s, '').trim();

  // 尝试匹配数字列表项 (1. 2. 等)
  const numberListPattern = /\d+\.\s+(.+?)(?=\n\d+\.|\n*$)/gs;
  let matches = [...cleanedText.matchAll(numberListPattern)];

  if (matches.length > 0) {
    return matches.map(match => match[1].trim());
  }

  // 尝试匹配破折号列表项 (- 等)
  const dashListPattern = /[-*]\s+(.+?)(?=\n[-*]|\n*$)/gs;
  matches = [...cleanedText.matchAll(dashListPattern)];

  if (matches.length > 0) {
    return matches.map(match => match[1].trim());
  }

  // 如果没有找到列表格式，按行分割并过滤掉空行和太短的行
  const lines = cleanedText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 3); // 过滤掉太短的行

  // 如果分割后的行数太少，可能是没有正确识别列表格式
  // 尝试更宽松的匹配方式
  if (lines.length < 3) {
    // 尝试匹配任何看起来像列表项的内容
    const anyListPattern = /(?:^|\n)(?:\d+\.|\-|\*|\(\d+\)|\（\d+\）)?\s*(.+?)(?=\n|$)/g;
    matches = [...cleanedText.matchAll(anyListPattern)];
    if (matches.length > 0) {
      return matches.map(match => match[1].trim())
        .filter(item => item.length > 3);
    }
  }

  return lines;
};

// 应用修改建议到原文
const applySuggestion = (optimizedContent) => {
  // 替换原文中的段落
  const beforeText = paperContent.value.substring(0, paragraphStartIndex.value);
  const afterText = paperContent.value.substring(paragraphEndIndex.value);
  paperContent.value = beforeText + optimizedContent + afterText;

  // 关闭弹窗
  showSuggestionDialog.value = false;

  // 清除选中的段落
  selectedParagraph.value = '';

  ElMessage({
    message: '已应用修改',
    type: 'success'
  });
};

// 根据建议生成改进后的内容
const generateImprovedContent = async () => {
  if (!checkApiKey()) return;

  // 确保我们有选中的段落
  if (!selectedParagraph.value.trim()) {
    ElMessage.warning('无法应用修改：段落选择已丢失');
    showSuggestionDialog.value = false;
    return;
  }

  isOptimizingParagraph.value = true;

  // 显示加载状态
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在应用修改建议...',
    background: 'rgba(0, 0, 0, 0.7)'
  });

  try {
    // 选择最重要的3-5条建议，减少token使用量
    const topSuggestions = suggestionList.value.slice(0, 5);

    // 准备更简洁的提示词
    let prompt = '';
    switch (currentOptimizationType.value) {
      case 'polish':
        prompt = `任务：根据以下建议润色段落\n段落：${selectedParagraph.value}\n建议：${topSuggestions.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n直接输出修改后的完整段落，不要解释。`;
        break;
      case 'expand':
        prompt = `任务：根据以下建议扩展段落\n段落：${selectedParagraph.value}\n建议：${topSuggestions.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n直接输出修改后的完整段落，不要解释。`;
        break;
      case 'simplify':
        prompt = `任务：根据以下建议简化段落\n段落：${selectedParagraph.value}\n建议：${topSuggestions.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n直接输出修改后的完整段落，不要解释。`;
        break;
      case 'academic':
        prompt = `任务：根据以下建议使段落更学术化\n段落：${selectedParagraph.value}\n建议：${topSuggestions.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n直接输出修改后的完整段落，不要解释。`;
        break;
      default:
        prompt = `任务：根据以下建议优化段落\n段落：${selectedParagraph.value}\n建议：${topSuggestions.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n直接输出修改后的完整段落，不要解释。`;
    }

    const requestParams = {
      assistantType: 'polish',
      userPrompt: prompt,
      stream: true, // 使用流式响应
      max_tokens: 1000, // 减少最大token数
      temperature: 0.7, // 添加温度参数，使响应更快
      apiKey: apiKey.value,
      reduceAIDetection: reduceAIDetection.value
    };

    // 根据模型模式选择不同的模型
    if (modelMode.value === 'reasoner') {
      requestParams.model = 'deepseek-reasoner';
    } else {
      requestParams.model = 'deepseek-chat';
    }

    // 创建一个变量来存储流式响应的内容
    let streamedContent = '';

    // 创建EventSource连接
    const eventSource = new EventSource(`http://localhost:3000/api/assistant?data=${encodeURIComponent(JSON.stringify(requestParams))}`);

    // 监听消息事件
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        // 流式生成完成
        eventSource.close();

        // 应用修改
        applySuggestion(streamedContent);

        // 关闭加载状态
        loadingInstance.close();

        isOptimizingParagraph.value = false;
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // 处理错误消息
        if (data.error) {
          ElMessage.error(data.message || '生成过程中发生错误');
          eventSource.close();
          loadingInstance.close();
          isOptimizingParagraph.value = false;
          return;
        }

        // 提取内容
        const chunk = data.choices[0].delta;

        if (chunk.content) {
          streamedContent += chunk.content;

          // 更新加载状态文本，显示进度
          loadingInstance.setText(`正在应用修改建议...(已生成${streamedContent.length}个字符)`);
        }
      } catch (error) {
        console.error('解析流数据失败', error);
      }
    };

    // 监听错误
    eventSource.onerror = (error) => {
      console.error('流式连接错误', error);
      eventSource.close();
      loadingInstance.close();
      isOptimizingParagraph.value = false;
      ElMessage.error('流式连接错误');
      showSuggestionDialog.value = false;
    };

  } catch (error) {
    console.error('API请求失败', error);
    ElMessage.error(`请求失败: ${error.response?.data?.message || error.message || '未知错误'}`);
    loadingInstance.close();
    showSuggestionDialog.value = false;
    isOptimizingParagraph.value = false;
  }
};

// 清除选中的段落
const clearSelection = () => {
  selectedParagraph.value = '';
};

// 监听文档点击事件，清除选中的段落
onMounted(() => {
  // 当用户点击文档其他区域时，清除选中的段落
  document.addEventListener('click', handleDocumentClick);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  // 清理自动保存定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  // 清理文档点击事件监听器
  document.removeEventListener('click', handleDocumentClick);
});

// 文档点击事件处理函数
const handleDocumentClick = (event) => {
  // 如果弹窗已打开，不清除选中的段落
  if (showSuggestionDialog.value) {
    return;
  }

  // 如果点击的不是文本区域，则清除选中的段落
  const textArea = document.querySelector('.content-input textarea');
  if (event.target !== textArea) {
    clearSelection();
  }
};
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

    <!-- AI生成功能区域 -->
    <div class="ai-generation-section">
      <div class="section-header">
        <h3>AI辅助生成</h3>

        <el-popover
          placement="bottom"
          :width="300"
          trigger="click"
        >
          <template #reference>
            <el-button type="info" size="small">API设置</el-button>
          </template>
          <div class="api-settings">
            <h3>DeepSeek API设置</h3>
            <el-input
              v-model="apiKey"
              placeholder="输入DeepSeek API密钥"
              show-password
              clearable
            />
            <div class="settings-actions">
              <el-button type="primary" @click="saveApiKey">保存密钥</el-button>
            </div>
            <p class="api-help">
              <small>您需要<a href="https://platform.deepseek.com/api_keys" target="_blank">DeepSeek</a>的API密钥才能使用此功能</small>
            </p>
          </div>
        </el-popover>
      </div>

      <div class="ai-controls">
        <div class="model-selection">
          <span class="control-label">模型模式：</span>
          <el-radio-group v-model="modelMode" size="small">
            <el-radio-button label="reasoner">推理模式</el-radio-button>
            <el-radio-button label="chat">对话模式</el-radio-button>
          </el-radio-group>
        </div>

        <div class="ai-detection-toggle">
          <el-tooltip content="启用后会使用特殊提示词，使生成内容更像人类撰写，降低AI检测率" placement="top">
            <el-switch
              v-model="reduceAIDetection"
              active-text="降低AI检测率"
              inactive-text=""
              class="ai-detection-switch"
            />
          </el-tooltip>
        </div>
      </div>

      <div class="generation-buttons">
        <el-button
          type="primary"
          @click="generateOutline"
          :loading="isGeneratingOutline"
          :icon="Edit"
        >
          生成论文大纲
        </el-button>
        <el-button
          type="success"
          @click="generateContent"
          :loading="isGeneratingContent"
          :icon="Setting"
          :disabled="!paperContent.trim()"
        >
          生成论文内容
        </el-button>
      </div>

      <!-- 流式生成区域 -->
      <div v-if="isStreaming" class="streaming-container">
        <div class="streaming-header">
          <h3>正在生成中...</h3>
          <el-progress :percentage="70" :indeterminate="true" />
        </div>

        <div v-if="streamingReasoning && modelMode === 'reasoner'" class="streaming-section">
          <div class="streaming-section-header">
            <strong>推理过程：</strong>
          </div>
          <div class="streaming-content reasoning-bg" v-html="marked(streamingReasoning)"></div>
        </div>

        <div v-if="streamingContent" class="streaming-section">
          <div class="streaming-section-header">
            <strong>生成内容：</strong>
          </div>
          <div class="streaming-content" v-html="marked(streamingContent)"></div>
        </div>
      </div>
    </div>

    <FileUploader v-if="showUploader" :onFileLoaded="handleFileLoaded" />

    <TemplateLibrary v-if="showTemplates" :onTemplateSelect="handleTemplateSelect" />

    <div class="editor-body" v-if="editorTabs === 'write'">
      <!-- 段落工具栏 -->
      <div class="paragraph-toolbar">
        <div class="toolbar-label">段落工具：</div>
        <div class="toolbar-buttons">
          <el-tooltip content="润色段落" placement="top">
            <el-button
              :type="selectedParagraph ? 'primary' : 'default'"
              size="small"
              :icon="Edit"
              :disabled="!selectedParagraph"
              @click="optimizeParagraph('polish')"
              :loading="isOptimizingParagraph"
            >
              润色
            </el-button>
          </el-tooltip>
          <el-tooltip content="扩展内容" placement="top">
            <el-button
              :type="selectedParagraph ? 'success' : 'default'"
              size="small"
              :icon="Document"
              :disabled="!selectedParagraph"
              @click="optimizeParagraph('expand')"
              :loading="isOptimizingParagraph"
            >
              扩展
            </el-button>
          </el-tooltip>
          <el-tooltip content="简化段落" placement="top">
            <el-button
              :type="selectedParagraph ? 'warning' : 'default'"
              size="small"
              :icon="Setting"
              :disabled="!selectedParagraph"
              @click="optimizeParagraph('simplify')"
              :loading="isOptimizingParagraph"
            >
              简化
            </el-button>
          </el-tooltip>
          <el-tooltip content="学术化处理" placement="top">
            <el-button
              :type="selectedParagraph ? 'info' : 'default'"
              size="small"
              :icon="Collection"
              :disabled="!selectedParagraph"
              @click="optimizeParagraph('academic')"
              :loading="isOptimizingParagraph"
            >
              学术化
            </el-button>
          </el-tooltip>
        </div>
        <div class="selection-info" v-if="selectedParagraph">
          <span>已选择 {{ selectedParagraph.length }} 个字符</span>
        </div>
      </div>
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
        class="content-input enhanced-editor"
        resize="vertical"
        :autosize="{ minRows: 20, maxRows: 40 }"
        @mouseup="handleParagraphSelect($event)"
        @contextmenu="handleParagraphSelect($event)"
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

    <!-- 修改建议弹窗 -->
    <el-dialog
      v-model="showSuggestionDialog"
      :title="suggestionTitle"
      width="50%"
      :close-on-click-modal="false"
      :show-close="true"
    >
      <div class="suggestion-dialog-content">
        <div class="selected-paragraph">
          <h4>选中的段落：</h4>
          <div class="paragraph-content">{{ selectedParagraph }}</div>
        </div>

        <div class="suggestion-list">
          <h4>修改建议：</h4>
          <el-scrollbar height="300px">
            <ul>
              <li v-for="(suggestion, index) in suggestionList" :key="index" class="suggestion-item">
                <div class="suggestion-text">{{ suggestion }}</div>
              </li>
            </ul>
          </el-scrollbar>
        </div>

        <div class="suggestion-actions">
          <el-button @click="showSuggestionDialog = false">关闭</el-button>
          <el-button type="primary" @click="generateImprovedContent">应用这些建议</el-button>
        </div>
      </div>
    </el-dialog>
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

/* AI生成功能区域样式 */
.ai-generation-section {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.02);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: var(--text-primary);
}

.api-settings {
  padding: 10px;
}

.settings-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.api-help {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.8em;
}

.ai-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.model-selection {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-label {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.generation-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

/* 流式生成相关样式 */
.streaming-container {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 15px;
  margin-bottom: 15px;
}

.streaming-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.streaming-header h3 {
  margin: 0;
  color: var(--highlight-color);
  display: flex;
  align-items: center;
  gap: 10px;
}

.streaming-section {
  margin-bottom: 15px;
}

.streaming-section-header {
  margin-bottom: 10px;
  font-size: 1em;
}

.streaming-content {
  background-color: var(--markdown-bg);
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  min-height: 100px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.reasoning-bg {
  background-color: rgba(64, 158, 255, 0.05);
}

/* 增强编辑器样式 */
.enhanced-editor {
  position: relative;
}

.enhanced-editor :deep(.el-textarea__inner) {
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.6;
  padding: 15px;
  transition: all 0.3s ease;
  border-color: var(--border-color);
  background-color: var(--card-bg-color);
}

.enhanced-editor :deep(.el-textarea__inner:focus) {
  border-color: var(--highlight-color);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.enhanced-editor :deep(.el-textarea__inner:hover) {
  border-color: var(--highlight-color);
}

/* 段落选择样式 */
::selection {
  background-color: rgba(64, 158, 255, 0.2);
  color: var(--text-primary);
}

/* 段落工具栏样式 */
.paragraph-toolbar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 10px 15px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
}

.toolbar-label {
  font-weight: bold;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toolbar-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}

.toolbar-buttons .el-button {
  transition: all 0.2s ease;
}

.toolbar-buttons .el-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selection-info {
  color: var(--text-secondary);
  font-size: 0.9em;
  white-space: nowrap;
  background-color: rgba(64, 158, 255, 0.1);
  padding: 4px 10px;
  border-radius: 4px;
  animation: fadeIn 0.3s ease;
}

/* 段落菜单样式 */
.paragraph-menu {
  position: fixed;
  z-index: 1000;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 10px;
  min-width: 200px;
  border: 1px solid var(--border-color);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}

.menu-header span {
  font-weight: bold;
  color: var(--text-primary);
}

.close-btn {
  padding: 2px;
}

.menu-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-options .el-button {
  width: 100%;
  justify-content: center;
}

/* 修改建议弹窗样式 */
.suggestion-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.selected-paragraph {
  background-color: var(--markdown-bg);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.selected-paragraph h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 1em;
}

.paragraph-content {
  white-space: pre-wrap;
  color: var(--text-secondary);
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.5;
  max-height: 150px;
  overflow-y: auto;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.suggestion-list h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 1em;
}

.suggestion-list ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.suggestion-item {
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s ease;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: rgba(64, 158, 255, 0.05);
}

.suggestion-text {
  line-height: 1.5;
}

.suggestion-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
</style>