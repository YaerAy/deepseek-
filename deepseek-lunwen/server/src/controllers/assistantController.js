import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { getFullPrompt } from '../utils/prompts.js';

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
 * 获取不同助手类型的系统提示语
 * @param {string} assistantType - 助手类型
 * @param {boolean} reduceAIDetection - 是否添加降低AI检测率的提示词
 * @returns {string} 系统提示语
 */
const getSystemPrompt = (assistantType, reduceAIDetection = true) => {
  return getFullPrompt(assistantType, reduceAIDetection);
};

/**
 * 处理助手请求
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export const handleAssistantRequest = async (req, res) => {
  try {
    const {
      assistantType,
      userPrompt,
      apiKey,
      stream = false,
      max_tokens = 4000,
      model = 'deepseek-reasoner', // 默认使用推理模型
      reduceAIDetection = true // 默认启用降低AI检测率
    } = req.body;

    // 验证请求
    if (!userPrompt) {
      return res.status(400).json({
        status: 'error',
        message: '请求必须包含提示语'
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

    // 获取系统提示语，传入降低AI检测率的选项
    const systemPrompt = getSystemPrompt(assistantType, reduceAIDetection);

    // 构建消息数组
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // 构建请求参数
    const requestParams = {
      model, // 使用指定的模型
      messages,
      stream,
      max_tokens
    };

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

/**
 * 处理流式助手请求（GET方法，用于EventSource）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export const handleStreamAssistantRequest = async (req, res) => {
  try {
    // 从查询参数中获取数据
    const data = req.query.data ? JSON.parse(decodeURIComponent(req.query.data)) : null;

    if (!data) {
      return res.status(400).json({
        status: 'error',
        message: '缺少请求数据'
      });
    }

    const {
      assistantType,
      userPrompt,
      apiKey,
      max_tokens = 4000,
      model = 'deepseek-reasoner', // 默认使用推理模型
      reduceAIDetection = true // 默认启用降低AI检测率
    } = data;

    // 验证请求
    if (!userPrompt) {
      return res.status(400).json({
        status: 'error',
        message: '请求必须包含提示语'
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

    // 获取系统提示语，传入降低AI检测率的选项
    const systemPrompt = getSystemPrompt(assistantType, reduceAIDetection);

    // 构建消息数组
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // 构建请求参数
    const requestParams = {
      model, // 使用指定的模型
      messages,
      stream: true,
      max_tokens
    };

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

    // 尝试发送错误响应
    try {
      res.write(`data: ${JSON.stringify({
        error: true,
        message: error.message || '调用DeepSeek API时发生错误'
      })}\n\n`);
      res.end();
    } catch (e) {
      console.error('发送错误响应失败:', e);
    }
  }
};
