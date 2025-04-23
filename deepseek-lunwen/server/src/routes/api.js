import express from 'express';
import { handleChatCompletion, handleStreamChatCompletion } from '../controllers/chatController.js';

const router = express.Router();

// 聊天完成端点 - POST方法
router.post('/chat', handleChatCompletion);

// 聊天完成端点 - GET方法（用于EventSource流式请求）
router.get('/chat', handleStreamChatCompletion);

export default router;
