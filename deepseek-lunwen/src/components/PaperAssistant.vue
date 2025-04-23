<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import axios from 'axios';
import { marked } from 'marked';

const apiKey = ref('');
const userPrompt = ref('');
const isLoading = ref(false);
const isStreaming = ref(false);
const streamingContent = ref('');
const streamingReasoning = ref('');
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

// 发送请求到后端服务器
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
  isStreaming.value = true;
  streamingContent.value = '';
  streamingReasoning.value = '';

  try {
    // 准备请求参数
    const requestParams = {
      messages: [
        { role: 'system', content: '你是一个专业的学术论文写作助手。' },
        { role: 'user', content: userPrompt.value }
      ],
      stream: true,
      max_tokens: 4000,
      apiKey: apiKey.value // 将API密钥传递给后端
    };

    // 创建EventSource连接
    const eventSource = new EventSource(`http://localhost:3000/api/chat?data=${encodeURIComponent(JSON.stringify(requestParams))}`);

    // 监听消息事件
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        // 流式生成完成
        eventSource.close();
        isStreaming.value = false;
        isLoading.value = false;

        // 添加响应到历史记录
        assistantResponses.value.unshift({
          prompt: userPrompt.value,
          response: streamingContent.value,
          reasoning: streamingReasoning.value,
          showReasoning: false,
          timestamp: new Date().toLocaleString()
        });

        // 保存历史记录到本地存储
        localStorage.setItem('assistantResponses', JSON.stringify(assistantResponses.value));

        ElMessage({
          message: '成功获取回复',
          type: 'success'
        });
        return;
      }

      try {
        const data = JSON.parse(event.data);

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
      isLoading.value = false;
      ElMessage.error('流式连接错误');
    };
  } catch (error) {
    console.error('API请求失败', error);
    isStreaming.value = false;
    isLoading.value = false;
    ElMessage.error(`请求失败: ${error.response?.data?.message || error.message || '未知错误'}`);
  }
};

// 非流式请求的备用方法
const sendToDeepSeekApiNonStream = async () => {
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
    text: '正在处理请求中...'
  });

  try {
    // 调用后端服务器API
    const response = await axios.post('http://localhost:3000/api/chat', {
      messages: [
        { role: 'system', content: '你是一个专业的学术论文写作助手。' },
        { role: 'user', content: userPrompt.value }
      ],
      stream: false,
      max_tokens: 4000,
      apiKey: apiKey.value // 将API密钥传递给后端
    });

    // 提取响应内容
    const content = response.data.choices[0].message.content;
    const reasoningContent = response.data.choices[0].message.reasoning_content || '';

    // 添加响应到历史记录
    assistantResponses.value.unshift({
      prompt: userPrompt.value,
      response: content,
      reasoning: reasoningContent, // 存储推理过程
      showReasoning: false, // 默认隐藏推理过程
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
    ElMessage.error(`请求失败: ${error.response?.data?.message || error.message || '未知错误'}`);
  } finally {
    isLoading.value = false;
    if (loadingInstance) {
      loadingInstance.close();
    }
  }
};

// 加载历史记录
const loadResponseHistory = () => {
  try {
    const history = JSON.parse(localStorage.getItem('assistantResponses'));
    if (history && Array.isArray(history)) {
      // 确保每个历史记录项都有showReasoning属性
      assistantResponses.value = history.map(item => ({
        ...item,
        showReasoning: item.showReasoning || false
      }));
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
            <small>您需要<a href="https://platform.deepseek.com/api_keys" target="_blank">DeepSeek</a>的API密钥才能使用此功能</small>
          </p>
        </div>
      </el-popover>
      <el-tooltip content="使用DeepSeek-R1推理模型" placement="bottom">
        <el-tag type="success" effect="dark" style="margin-left: 8px">推理增强</el-tag>
      </el-tooltip>
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
            :rows="6"
            resize="vertical"
            :autosize="{ minRows: 4, maxRows: 10 }"
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
      <!-- 流式生成区域 -->
      <div v-if="isStreaming" class="streaming-container">
        <div class="streaming-header">
          <h3>正在生成中...</h3>
          <el-progress :percentage="70" :indeterminate="true" />
        </div>

        <div v-if="streamingReasoning" class="streaming-section">
          <div class="streaming-section-header">
            <strong>推理过程：</strong>
          </div>
          <div class="streaming-content reasoning-bg" v-html="marked.parse(streamingReasoning)"></div>
        </div>

        <div v-if="streamingContent" class="streaming-section">
          <div class="streaming-section-header">
            <strong>最终回答：</strong>
          </div>
          <div class="streaming-content" v-html="marked.parse(streamingContent)"></div>
        </div>
      </div>

      <!-- 历史记录区域 -->
      <template v-if="!isStreaming && assistantResponses.length > 0">
        <div class="history-header">
          <h3>历史记录</h3>
          <el-tooltip content="清空历史记录" placement="top">
            <el-button size="small" type="danger" @click="clearHistory" circle plain icon="Delete" />
          </el-tooltip>
        </div>
        <el-collapse accordion>
          <el-collapse-item
            v-for="(item, index) in assistantResponses"
            :key="index"
            :title="`${item.timestamp} - ${item.prompt.substring(0, 30)}...`"
          >
            <div class="response-item">
              <div class="response-prompt">
                <div class="prompt-header">
                  <strong>提示语：</strong>
                  <el-button
                    size="small"
                    type="info"
                    @click="copyToClipboard(item.prompt)"
                    plain
                  >
                    复制提示语
                  </el-button>
                </div>
                <p>{{ item.prompt }}</p>
              </div>
              <div class="response-content">
                <div class="response-header">
                  <strong>DeepSeek回复：</strong>
                  <div class="response-actions">
                    <el-button
                      size="small"
                      type="primary"
                      @click="copyToClipboard(item.response)"
                    >
                      复制回复
                    </el-button>
                    <el-button
                      size="small"
                      type="success"
                      @click="userPrompt = item.prompt"
                    >
                      再次使用
                    </el-button>
                  </div>
                </div>
                <div class="markdown-content" v-html="marked.parse(item.response || '')"></div>

                <div v-if="item.reasoning" class="reasoning-section">
                  <div class="reasoning-header">
                    <el-divider>
                      <el-tooltip content="显示/隐藏推理过程" placement="top">
                        <el-button
                          size="small"
                          @click="item.showReasoning = !item.showReasoning"
                          :type="item.showReasoning ? 'primary' : 'info'"
                          plain
                        >
                          {{ item.showReasoning ? '隐藏推理过程' : '显示推理过程' }}
                        </el-button>
                      </el-tooltip>
                    </el-divider>
                  </div>
                  <div v-show="item.showReasoning" class="reasoning-content">
                    <div v-html="marked.parse(item.reasoning || '')"></div>
                  </div>
                </div>
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
  flex: 2; /* 调整助手的比例 */
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

.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.assistant-settings {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-secondary);
  font-size: 0.8em;
}

.response-item {
  margin-bottom: 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.response-prompt {
  margin-bottom: 15px;
  color: var(--text-secondary);
  background-color: rgba(0, 0, 0, 0.02);
  padding: 10px;
  border-radius: 4px;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.response-content {
  position: relative;
  border-left: 3px solid var(--highlight-color);
  padding-left: 15px;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.response-actions {
  display: flex;
  gap: 8px;
  margin-top: 5px;
}

.markdown-content {
  margin-top: 10px;
  background-color: var(--markdown-bg);
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  transition: background-color 0.3s ease;
}

.reasoning-section {
  margin-top: 15px;
}

.reasoning-header {
  margin: 10px 0;
}

.reasoning-content {
  background-color: rgba(64, 158, 255, 0.05);
  border-left: 3px solid var(--highlight-color);
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 0.95em;
  transition: all 0.3s ease;
  max-height: 500px;
  overflow-y: auto;
}

/* 流式生成相关样式 */
.streaming-container {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 20px;
  margin-bottom: 20px;
}

.streaming-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
}

.streaming-header h3 {
  margin: 0;
  color: var(--highlight-color);
  display: flex;
  align-items: center;
  gap: 10px;
}

.streaming-section {
  margin-bottom: 20px;
}

.streaming-section-header {
  margin-bottom: 10px;
  font-size: 1.1em;
}

.streaming-content {
  background-color: var(--markdown-bg);
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  min-height: 100px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.reasoning-bg {
  background-color: rgba(64, 158, 255, 0.05);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .paper-assistant {
    padding: 15px;
  }

  .assistant-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .assistant-header h2 {
    margin-bottom: 10px;
  }

  .prompt-header,
  .response-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .response-actions {
    margin-top: 10px;
    width: 100%;
    justify-content: space-between;
  }

  .markdown-content {
    padding: 10px;
    font-size: 0.9em;
  }
}
</style>