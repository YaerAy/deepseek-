import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { marked } from 'marked'

// 配置marked，使其能够安全地解析用户的markdown内容
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

// 创建全局marked方法
const app = createApp(App)

// 添加全局方法
app.config.globalProperties.marked = (content) => {
  if (!content) return '';
  return marked(content);
}

// 注册Element Plus
app.use(ElementPlus)

app.mount('#app')
