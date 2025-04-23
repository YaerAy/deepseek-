<script setup>
import { ref } from 'vue';
import PaperEditor from './components/PaperEditor.vue';
import PaperAssistant from './components/PaperAssistant.vue';
</script>

<template>
  <div class="paper-app">
    <header>
      <h1>DeepSeek论文写作助手</h1>
    </header>

    <main>
      <div class="container">
        <PaperEditor />
        <PaperAssistant />
      </div>
    </main>

    <footer>
      <p>© {{ new Date().getFullYear() }} DeepSeek论文助手</p>
    </footer>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: #f5f7fa;
  color: #333;
}

.paper-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background-color: #409EFF;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

main {
  flex: 1;
  padding: 2rem;
}

.container {
  display: flex;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

footer {
  background-color: #f0f2f5;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #606266;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}
</style>
