<script setup>
import { ref } from 'vue';
import PaperEditor from './components/PaperEditor.vue';
import PaperAssistant from './components/PaperAssistant.vue';
import ThemeToggle from './components/ThemeToggle.vue';
</script>

<template>
  <div class="paper-app theme-transition">
    <header>
      <div class="header-content">
        <h1>DeepSeek论文写作助手</h1>
        <div class="header-actions">
          <ThemeToggle />
        </div>
      </div>
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
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  overflow-x: hidden;
}

#app {
  width: 100%;
  height: 100%;
}

.paper-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

header {
  background-color: var(--header-bg);
  color: var(--header-text);
  padding: 1rem;
  box-shadow: var(--shadow);
  width: 100%;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 10px;
}

main {
  flex: 1;
  padding: 1.5rem 1rem;
  width: 100%;
}

.container {
  display: flex;
  gap: 30px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

footer {
  background-color: var(--footer-bg);
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--footer-text);
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .container {
    max-width: 100%;
    padding: 0 10px;
  }
}

@media (max-width: 1100px) {
  .container {
    flex-direction: column;
  }

  main {
    padding: 1rem 0.5rem;
  }
}

@media (max-width: 576px) {
  header h1 {
    font-size: 1.3rem;
  }

  main {
    padding: 0.5rem;
  }

  .container {
    gap: 10px;
  }
}
</style>
