<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Collection, Reading } from '@element-plus/icons-vue';

const props = defineProps({
  onTemplateSelect: Function
});

const templates = [
  {
    id: 'research',
    name: '研究论文',
    description: '适用于实验研究、调查研究等学术论文',
    structure: `# 研究论文标题

## 摘要
在此处简要概述研究目的、方法、结果和结论。

## 关键词
关键词1, 关键词2, 关键词3

## 1. 引言
### 1.1 研究背景
### 1.2 研究目的
### 1.3 研究意义

## 2. 文献综述
### 2.1 理论基础
### 2.2 相关研究

## 3. 研究方法
### 3.1 研究设计
### 3.2 数据收集
### 3.3 数据分析

## 4. 研究结果
### 4.1 主要发现
### 4.2 数据分析结果

## 5. 讨论
### 5.1 结果解释
### 5.2 与已有研究的比较
### 5.3 研究局限性

## 6. 结论与建议
### 6.1 研究结论
### 6.2 实践意义
### 6.3 未来研究方向

## 参考文献

## 附录`
  },
  {
    id: 'review',
    name: '综述论文',
    description: '对特定领域的研究现状进行总结和评价',
    structure: `# 综述论文标题

## 摘要
简要概述本综述的目的、范围、主要发现和结论。

## 关键词
关键词1, 关键词2, 关键词3

## 1. 引言
### 1.1 研究领域概述
### 1.2 综述目的与意义
### 1.3 综述范围与方法

## 2. 研究现状
### 2.1 核心概念与理论
### 2.2 研究发展历程
### 2.3 主要研究方向

## 3. 研究方法评述
### 3.1 主要研究方法
### 3.2 方法优缺点分析

## 4. 研究成果分析
### 4.1 主要研究成果
### 4.2 存在的争议
### 4.3 研究局限性

## 5. 研究趋势与展望
### 5.1 新兴研究方向
### 5.2 未解决的问题
### 5.3 未来研究建议

## 6. 结论

## 参考文献`
  },
  {
    id: 'thesis',
    name: '学位论文',
    description: '硕士或博士学位论文的基本结构',
    structure: `# 学位论文标题

## 摘要
### 中文摘要
### Abstract

## 关键词
关键词1, 关键词2, 关键词3, 关键词4, 关键词5

## 目录

## 第一章 绪论
### 1.1 研究背景
### 1.2 研究意义
### 1.3 研究目的
### 1.4 研究方法
### 1.5 论文结构

## 第二章 文献综述
### 2.1 理论基础
### 2.2 研究现状
### 2.3 研究评述

## 第三章 研究设计
### 3.1 研究框架
### 3.2 研究假设
### 3.3 研究方法
### 3.4 数据来源

## 第四章 实证分析
### 4.1 数据处理
### 4.2 描述性统计
### 4.3 实证结果
### 4.4 稳健性检验

## 第五章 研究结论与展望
### 5.1 主要研究结论
### 5.2 理论贡献
### 5.3 实践启示
### 5.4 研究局限
### 5.5 未来研究方向

## 参考文献

## 附录

## 致谢`
  },
  {
    id: 'case',
    name: '案例分析',
    description: '针对特定案例进行深入分析的论文',
    structure: `# 案例分析论文标题

## 摘要
简要概述案例背景、分析方法、主要发现和结论。

## 关键词
关键词1, 关键词2, 关键词3

## 1. 引言
### 1.1 案例背景
### 1.2 研究目的
### 1.3 案例选择理由

## 2. 文献综述
### 2.1 理论基础
### 2.2 相关研究

## 3. 研究方法
### 3.1 数据收集
### 3.2 分析框架

## 4. 案例描述
### 4.1 案例概况
### 4.2 关键事件
### 4.3 主要参与者

## 5. 案例分析
### 5.1 问题识别
### 5.2 原因分析
### 5.3 解决方案评估

## 6. 讨论
### 6.1 主要发现
### 6.2 理论意义
### 6.3 实践启示

## 7. 结论
### 7.1 研究总结
### 7.2 研究局限
### 7.3 未来研究方向

## 参考文献`
  }
];

// 选择模板
const selectTemplate = (template) => {
  if (props.onTemplateSelect) {
    props.onTemplateSelect({
      title: template.name,
      content: template.structure
    });
  }
};
</script>

<template>
  <div class="template-library">
    <div class="library-header">
      <h3><el-icon><Collection /></el-icon> 论文模板库</h3>
      <p class="library-description">选择一个模板快速开始你的论文写作</p>
    </div>
    
    <div class="templates-grid">
      <el-card 
        v-for="template in templates" 
        :key="template.id"
        class="template-card"
        shadow="hover"
        @click="selectTemplate(template)"
      >
        <template #header>
          <div class="template-header">
            <el-icon><Reading /></el-icon>
            <span>{{ template.name }}</span>
          </div>
        </template>
        <div class="template-content">
          <p>{{ template.description }}</p>
          <el-button type="primary" size="small" text>使用此模板</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.template-library {
  margin-bottom: 20px;
}

.library-header {
  margin-bottom: 15px;
}

.library-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.library-description {
  color: var(--text-secondary);
  font-size: 0.9em;
  margin-top: 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.template-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.template-card:hover {
  transform: translateY(-5px);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.template-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100px;
}

.template-content p {
  margin-top: 0;
  color: var(--text-secondary);
  font-size: 0.9em;
}

@media (max-width: 576px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>
