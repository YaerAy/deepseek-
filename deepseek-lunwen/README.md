# DeepSeek论文写作助手

这是一个使用DeepSeek大模型作为后端的论文写作助手应用，帮助用户撰写、编辑和优化学术论文。

## 功能特点

- 使用DeepSeek-R1推理模型，提供高质量的论文写作辅助
- 支持论文大纲生成、摘要润色、内容润色等多种功能
- 提供论文模板库，快速开始论文写作
- 支持文件上传和导出
- 支持暗色模式
- 响应式设计，适配各种屏幕尺寸

## 项目结构

```
deepseek-lunwen/
├─ public/              # 静态资源
├─ server/              # 后端服务器
│   ├─ src/             # 后端源代码
│   ├─ .env             # 环境变量（包含API密钥）
│   └─ package.json     # 后端依赖
├─ src/                 # 前端源代码
│   ├─ assets/          # 样式和资源
│   ├─ components/      # Vue组件
│   └─ main.js          # 入口文件
├─ index.html           # HTML模板
└─ package.json         # 前端依赖
```

## 安装和使用

### 后端设置

1. 进入server目录：

```bash
cd server
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：

复制`.env.example`文件为`.env`，可以选择性地填入默认的DeepSeek API密钥（用户也可以在前端输入自己的密钥）：

```
DEEPSEEK_API_KEY=your_default_api_key_here
```

4. 启动后端服务器：

```bash
npm run dev
```

### 前端设置

1. 在项目根目录安装依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 在浏览器中访问应用：

```
http://localhost:5173
```

## 使用指南

1. **论文编辑器**：
   - 使用左侧的编辑器撰写论文
   - 支持Markdown格式
   - 可以保存草稿、导出为Markdown文件
   - 可以使用模板库快速开始

2. **论文助手**：
   - 选择助手类型（大纲生成、摘要润色等）
   - 输入提示语
   - 查看DeepSeek模型的回复
   - 可以查看模型的推理过程

## 技术栈

- 前端：Vue 3, Element Plus, Marked.js
- 后端：Node.js, Express, OpenAI SDK
- API：DeepSeek API (deepseek-reasoner模型)

## 注意事项

- 用户可以在前端输入自己的API密钥，密钥会安全地传递给后端并用于调用DeepSeek API
- 用户的API密钥会加密存储在浏览器的本地存储中，不会在服务器上持久化存储
- 可以在后端的`.env`文件中设置默认的API密钥，请勿将其提交到版本控制系统
- 使用DeepSeek-R1推理模型会消耗更多的token，请注意API使用量

## 生产环境构建

```bash
npm run build
```
