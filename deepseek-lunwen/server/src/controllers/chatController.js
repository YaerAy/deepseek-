import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化OpenAI客户端的函数
const createOpenAIClient = (apiKey) => {
  return new OpenAI({
    apiKey: apiKey || process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
  });
};

/**
 * 处理聊天完成请求
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
/**
 * 处理流式聊天完成请求（GET方法，用于EventSource）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export const handleStreamChatCompletion = async (req, res) => {
  try {
    // 从查询参数中获取数据
    const data = req.query.data ? JSON.parse(decodeURIComponent(req.query.data)) : null;

    if (!data) {
      return res.status(400).json({
        status: 'error',
        message: '缺少请求数据'
      });
    }

    const { messages, apiKey, max_tokens } = data;

    // 验证请求
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请求必须包含有效的消息数组'
      });
    }

    // 验证API密钥
    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: '缺少API密钥'
      });
    }

    // 创建OpenAI客户端
    const openai = createOpenAIClient(apiKey);

    // 构建请求参数
    const requestParams = {
      model: 'deepseek-reasoner', // 使用DeepSeek的推理模型
      messages,
      stream: true
    };

    // 如果提供了max_tokens，添加到请求参数中
    if (max_tokens) {
      requestParams.max_tokens = max_tokens;
    }

    // 设置响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 初始化变量跟踪当前生成的是推理内容还是最终回答
    let isGeneratingReasoning = true;

    // 调用DeepSeek API
    const stream = await openai.chat.completions.create(requestParams);

    // 处理流式响应
    for await (const chunk of stream) {
      // 检查是否切换了从推理内容到最终回答
      if (isGeneratingReasoning && chunk.choices[0].delta.content) {
        isGeneratingReasoning = false;
        // 发送一个特殊标记来通知前端切换显示区域
        res.write(`data: {"type":"switch_to_content"}\n\n`);
      }

      const data = JSON.stringify({
        id: chunk.id,
        object: chunk.object,
        created: chunk.created,
        model: chunk.model,
        type: isGeneratingReasoning ? "reasoning" : "content",
        choices: chunk.choices.map(choice => ({
          index: choice.index,
          delta: {
            role: choice.delta.role,
            content: choice.delta.content,
            reasoning_content: choice.delta.reasoning_content
          },
          finish_reason: choice.finish_reason
        }))
      });

      res.write(`data: ${data}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('DeepSeek API调用错误:', error);

    // 返回适当的错误响应
    res.status(error.status || 500).json({
      status: 'error',
      message: error.message || '调用DeepSeek API时发生错误',
      type: error.type,
      code: error.code
    });
  }
};

/**
 * 处理聊天完成请求（POST方法）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export const handleChatCompletion = async (req, res) => {
  try {
    const { messages, stream = false, max_tokens, apiKey } = req.body;

    // 验证请求
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请求必须包含有效的消息数组'
      });
    }

    // 验证API密钥
    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: '缺少API密钥'
      });
    }

    // 创建OpenAI客户端
    const openai = createOpenAIClient(apiKey);

    // 构建请求参数
    const requestParams = {
      model: 'deepseek-reasoner', // 使用DeepSeek的推理模型
      messages,
      stream,
    };

    // 如果提供了max_tokens，添加到请求参数中
    if (max_tokens) {
      requestParams.max_tokens = max_tokens;
    }

    // 调用DeepSeek API
    if (stream) {
      // 流式响应
      const stream = await openai.chat.completions.create(requestParams);

      // 设置响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 初始化变量跟踪当前生成的是推理内容还是最终回答
      let isGeneratingReasoning = true;

      // 处理流式响应
      for await (const chunk of stream) {
        // 检查是否切换了从推理内容到最终回答
        if (isGeneratingReasoning && chunk.choices[0].delta.content) {
          isGeneratingReasoning = false;
          // 发送一个特殊标记来通知前端切换显示区域
          res.write(`data: {"type":"switch_to_content"}\n\n`);
        }

        const data = JSON.stringify({
          id: chunk.id,
          object: chunk.object,
          created: chunk.created,
          model: chunk.model,
          type: isGeneratingReasoning ? "reasoning" : "content",
          choices: chunk.choices.map(choice => ({
            index: choice.index,
            delta: {
              role: choice.delta.role,
              content: choice.delta.content,
              reasoning_content: choice.delta.reasoning_content
            },
            finish_reason: choice.finish_reason
          }))
        });

        res.write(`data: ${data}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // 非流式响应
      const completion = await openai.chat.completions.create(requestParams);

      // 构建响应
      const response = {
        id: completion.id,
        object: completion.object,
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map(choice => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
            reasoning_content: choice.message.reasoning_content
          },
          finish_reason: choice.finish_reason
        })),
        usage: completion.usage
      };

      res.status(200).json(response);
    }
  } catch (error) {
    console.error('DeepSeek API调用错误:', error);

    // 返回适当的错误响应
    res.status(error.status || 500).json({
      status: 'error',
      message: error.message || '调用DeepSeek API时发生错误',
      type: error.type,
      code: error.code
    });
  }
};
