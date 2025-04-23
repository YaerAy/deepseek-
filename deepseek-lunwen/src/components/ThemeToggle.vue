<script setup>
import { ref, onMounted, watch } from 'vue';
import { Moon, Sunny } from '@element-plus/icons-vue';

const isDarkMode = ref(false);

// 初始化主题
onMounted(() => {
  // 检查本地存储中的主题设置
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark-mode');
  } else {
    isDarkMode.value = false;
    document.documentElement.classList.remove('dark-mode');
  }
});

// 切换主题
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  }
};
</script>

<template>
  <div class="theme-toggle">
    <el-tooltip :content="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'" placement="bottom">
      <el-button 
        @click="toggleTheme" 
        :icon="isDarkMode ? Sunny : Moon" 
        circle
        size="small"
        class="toggle-button"
      />
    </el-tooltip>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
}

.toggle-button {
  transition: all 0.3s ease;
}
</style>
