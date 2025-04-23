# DeepSeek论文助手后端服务

这是DeepSeek论文助手的后端服务，使用Node.js和Express构建，集成了DeepSeek的推理模型API。

## 功能

- 提供与DeepSeek API的安全集成
- 支持流式和非流式响应
- 使用环境变量安全存储API密钥
- 支持CORS，允许前端应用访问

## 安装

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

复制`.env.example`文件为`.env`，并填入您的DeepSeek API密钥：

```
DEEPSEEK_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## 使用

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

## API端点

### POST /api/chat

发送聊天请求到DeepSeek推理模型。

**请求体：**

```json
{
  "messages": [
    {"role": "system", "content": "你是一个专业的学术论文写作助手。"},
    {"role": "user", "content": "请为我生成一篇关于人工智能在医疗领域应用的论文大纲。"}
  ],
  "stream": false,
  "max_tokens": 4000
}
```

**响应：**

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "deepseek-reasoner",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "...",
        "reasoning_content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 57,
    "completion_tokens": 528,
    "total_tokens": 585
  }
}
```

## 安全注意事项

- API密钥存储在`.env`文件中，该文件不应提交到版本控制系统
- 使用Helmet中间件增强API安全性
- 限制CORS来源，只允许指定的前端应用访问
