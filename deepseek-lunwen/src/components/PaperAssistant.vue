<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import axios from 'axios';

const apiKey = ref('');
const userPrompt = ref('');
const isLoading = ref(false);
const assistantResponses = ref([]);
const selectedAssistantType = ref('outline');

// 助手类型选项
const assistantTypes = [
  { value: 'outline', label: '论文大纲生成' },
  { value: 'abstract', label: '摘要润色' },
  { value: 'polish', label: '内容润色' },
  { value: 'reference', label: '文献引用格式化' },
  { value: 'translate', label: '中英互译' },
  { value: 'custom', label: '自定义' }
];

// 每种类型的预设提示语
const presetPrompts = {
  outline: '请为我生成一篇关于以下主题的学术论文大纲：',
  abstract: '请润色以下论文摘要，使其更加学术化、专业化：',
  polish: '请润色以下论文段落，保持学术风格，增强逻辑性：',
  reference: '请将以下文献信息转换为APA格式：',
  translate: '请将以下内容翻译成英文(或中文)，保持学术风格：',
  custom: ''
};

// 监听助手类型变化，更新提示语
watch(selectedAssistantType, (newType) => {
  if (newType !== 'custom') {
    userPrompt.value = presetPrompts[newType];
  }
});

// 保存API密钥
const saveApiKey = () => {
  localStorage.setItem('deepseekApiKey', apiKey.value);
  ElMessage({
    message: 'API密钥已保存',
    type: 'success'
  });
};

// 加载API密钥
const loadApiKey = () => {
  const savedKey = localStorage.getItem('deepseekApiKey');
  if (savedKey) {
    apiKey.value = savedKey;
  }
};

// 初始化时加载API密钥
loadApiKey();

// 发送请求到DeepSeek API
const sendToDeepSeekApi = async () => {
  if (!apiKey.value) {
    ElMessage.error('请先设置DeepSeek API密钥');
    return;
  }
  
  if (!userPrompt.value.trim()) {
    ElMessage.warning('请输入提示语');
    return;
  }
  
  isLoading.value = true;
  const loadingInstance = ElLoading.service({ 
    target: '.assistant-content',
    text: '正在向DeepSeek请求中...'
  });
  
  try {
    // 这里是示例API请求，实际使用时需要根据DeepSeek API的文档调整
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的学术论文写作助手。' },
        { role: 'user', content: userPrompt.value }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`
      }
    });
    
    // 添加响应到历史记录
    assistantResponses.value.unshift({
      prompt: userPrompt.value,
      response: response.data.choices[0].message.content,
      timestamp: new Date().toLocaleString()
    });
    
    // 保存历史记录到本地存储
    localStorage.setItem('assistantResponses', JSON.stringify(assistantResponses.value));
    
    ElMessage({
      message: '成功获取回复',
      type: 'success'
    });
  } catch (error) {
    console.error('API请求失败', error);
    ElMessage.error(`请求失败: ${error.message || '未知错误'}`);
  } finally {
    isLoading.value = false;
    loadingInstance.close();
  }
};

// 加载历史记录
const loadResponseHistory = () => {
  try {
    const history = JSON.parse(localStorage.getItem('assistantResponses'));
    if (history && Array.isArray(history)) {
      assistantResponses.value = history;
    }
  } catch (error) {
    console.error('加载历史记录失败', error);
  }
};

// 清空历史记录
const clearHistory = () => {
  assistantResponses.value = [];
  localStorage.removeItem('assistantResponses');
  ElMessage({
    message: '历史记录已清空',
    type: 'info'
  });
};

// 初始化时加载历史记录
loadResponseHistory();

// 复制内容到剪贴板
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage({
      message: '已复制到剪贴板',
      type: 'success'
    });
  }).catch(err => {
    ElMessage.error('复制失败');
    console.error('复制失败:', err);
  });
};
</script>

<template>
  <div class="paper-assistant">
    <div class="assistant-header">
      <h2>论文写作助手</h2>
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
            <small>您需要<a href="https://www.deepseek.com" target="_blank">DeepSeek</a>的API密钥才能使用此功能</small>
          </p>
        </div>
      </el-popover>
    </div>

    <div class="assistant-settings">
      <el-form label-position="top">
        <el-form-item label="选择助手类型">
          <el-select v-model="selectedAssistantType" placeholder="选择助手类型">
            <el-option
              v-for="item in assistantTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="提示语">
          <el-input
            v-model="userPrompt"
            type="textarea"
            placeholder="输入您的提示语..."
            :rows="5"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="sendToDeepSeekApi" :loading="isLoading">
            发送请求
          </el-button>
          <el-button @click="clearHistory" type="danger" plain>
            清空历史
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="assistant-content">
      <template v-if="assistantResponses.length > 0">
        <h3>历史记录</h3>
        <el-collapse>
          <el-collapse-item 
            v-for="(item, index) in assistantResponses" 
            :key="index"
            :title="`${item.timestamp} - ${item.prompt.substring(0, 30)}...`"
          >
            <div class="response-item">
              <div class="response-prompt">
                <strong>提示语：</strong>
                <p>{{ item.prompt }}</p>
              </div>
              <div class="response-content">
                <strong>DeepSeek回复：</strong>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="copyToClipboard(item.response)"
                  class="copy-btn"
                >
                  复制
                </el-button>
                <div class="markdown-content" v-html="marked(item.response)"></div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </template>
      <el-empty v-else description="暂无历史记录" />
    </div>
  </div>
</template>

<style scoped>
.paper-assistant {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  max-width: 550px;
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 10px;
}

.assistant-settings {
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 20px;
}

.assistant-content {
  flex: 1;
  overflow-y: auto;
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
  color: #909399;
  font-size: 0.8em;
}

.response-item {
  margin-bottom: 20px;
}

.response-prompt {
  margin-bottom: 10px;
  color: #606266;
}

.response-content {
  position: relative;
  border-left: 3px solid #409EFF;
  padding-left: 10px;
}

.copy-btn {
  position: absolute;
  right: 0;
  top: 0;
}

.markdown-content {
  margin-top: 10px;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
}
</style>