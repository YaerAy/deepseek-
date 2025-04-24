import './assets/main.css'
import './assets/theme.css'

import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { marked } from 'marked'

// 配置marked，使其能够安全地解析用户的markdown内容
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

// 创建Vue应用实例
const app = createApp(App)

// 注册Element Plus
app.use(ElementPlus, { size: 'default' })

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局提供marked
app.config.globalProperties.$marked = marked

app.mount('#app')
