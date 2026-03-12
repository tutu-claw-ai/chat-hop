# ChatHop 设计文档

> 最后更新: 2026-03-12
> 作者: Tutu

---

## 一、产品需求

### 1.1 核心功能

**ChatHop** 是一个 Chrome 扩展，为多个 AI 聊天平台提供侧边栏时间线导航。

**用户痛点**：
- AI 对话越来越长，滚动找之前的消息很麻烦
- 想快速定位到某个话题的讨论位置
- 想搜索对话内容并跳转到对应位置

**核心功能**：
1. **侧边栏导航** - 在页面右侧显示消息时间线
2. **消息摘要** - 每条消息显示前 60 字符的摘要
3. **点击跳转** - 点击时间线项，滚动到对应消息
4. **搜索功能** - 按关键词搜索对话内容
5. **精确跳转** - 搜索结果跳转到包含关键词的具体句子

### 1.2 支持平台

| 平台 | 域名 | 状态 |
|------|------|------|
| 千问 | qianwen.com, tongyi.aliyun.com | ✅ |
| 元宝 | yuanbao.tencent.com | ✅ |
| 豆包 | doubao.com | ✅ |
| Kimi | kimi.com, moonshot.cn | ✅ |
| DeepSeek | chat.deepseek.com | ✅ |
| 文心一言 | yiyan.baidu.com | ✅ |
| MiniMax | agent.minimaxi.com | ✅ |
| ChatGPT | chatgpt.com | ✅ |
| Grok | grok.com | ✅ |
| Claude | claude.ai | ✅ |
| Gemini | gemini.google.com | ✅ |

---

## 二、当前设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   AI 聊天页面                        │
│  ┌─────────────────────────────────┐ ┌───────────┐  │
│  │                                 │ │ ChatHop   │  │
│  │         消息区域                 │ │ 侧边栏    │  │
│  │                                 │ │           │  │
│  │  [用户消息1]                    │ │ 消息列表  │  │
│  │  [AI消息1]                      │ │ 或        │  │
│  │  [用户消息2]                    │ │ 搜索结果  │  │
│  │  [AI消息2]                      │ │           │  │
│  │  ...                            │ │           │  │
│  │                                 │ └───────────┘  │
│  │                                 │      🐰 浮球   │
│  └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

### 2.2 核心数据结构

```javascript
// 消息对象
{
  id: "chat-msg-user-0-1234567890",  // 唯一 ID
  element: HTMLElement,               // DOM 元素引用
  role: "user" | "assistant",         // 角色
  content: "摘要内容...",              // 摘要（前 60 字符）
  fullContent: "完整内容...",          // 完整文本
  index: 0,                           // 在消息数组中的位置
}

// 搜索结果对象
{
  id: "chat-msg-user-0-1234567890-sentence-0-100",
  messageId: "chat-msg-user-0-1234567890",
  sentence: "匹配的句子",
  sentenceStart: 100,                 // 句子在消息文本中的起始位置
  sentenceEnd: 115,                   // 句子在消息文本中的结束位置
  targetNode: TextNode,               // 包含句子的文本节点
  targetOffset: 50,                   // 句子在文本节点中的偏移量
  contextLines: [...],                // 上下文句子
  role: "user" | "assistant",
  element: HTMLElement,
  fullContent: "完整内容...",
}
```

### 2.3 核心流程

#### 流程1: 初始化

```
页面加载
    ↓
detectPlatform() - 检测当前平台
    ↓
setup()
    ├── createToggleButton() - 创建浮球
    ├── createSidebar() - 创建侧边栏
    ├── startObserving() - 监听 DOM 变化
    └── setTimeout(scanMessages, 1500) - 延迟扫描消息
```

#### 流程2: 扫描消息

```
scanMessages()
    ↓
查找消息容器 (container)
    ↓
查找用户消息和 AI 消息 (querySelectorAll)
    ↓
extractMessageInfo() - 提取每条消息的信息
    ↓
sortMessagesByPosition() - 按 DOM 位置排序
    ↓
updateTimelineUI() - 更新侧边栏 UI
```

#### 流程3: 搜索

```
用户输入关键词
    ↓
performSearch()
    ↓
遍历每条消息
    ├── TreeWalker 遍历所有文本节点
    ├── 记录每个文本节点的位置 (nodePositions)
    ├── 按句子分割消息内容
    ├── 找到匹配的句子
    ├── 记录句子的精确位置 (sentenceStart, sentenceEnd)
    └── 找到包含句子的文本节点 (targetNode)
    ↓
updateTimelineUI() - 显示搜索结果
```

#### 流程4: 跳转

```
用户点击时间线项
    ↓
scrollToMessage(index, sentence, sentenceStart, sentenceEnd)
    ↓
有精确位置？
    ├── 是 → 创建 Range → 滚动到 Range 位置 → 高亮文本
    └── 否 → scrollIntoView 滚动到整个消息
```

---

## 三、当前问题

### 3.1 Bug: Range.scrollIntoView 不存在

**错误信息**：
```
TypeError: range.scrollIntoView is not a function
```

**根本原因**：
- `scrollIntoView()` 是 `Element` 的方法
- `Range` 对象没有 `scrollIntoView()` 方法

**错误代码** (content.js:802):
```javascript
range.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

**正确的做法**：
```javascript
// 方法1: 使用 Range 的 getBoundingClientRect
const rect = range.getBoundingClientRect();
window.scrollTo({
  top: rect.top + window.scrollY - window.innerHeight / 2,
  behavior: 'smooth'
});

// 方法2: 找到包含 Range 的最近块级元素，用 element.scrollIntoView
const container = range.startContainer.parentElement;
const blockElement = container.closest('p, div, section, article');
if (blockElement) {
  blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 方法3: 使用 Selection API + CSS 高亮（不依赖滚动）
// 先滚动到消息元素，再用 CSS 高亮目标文本
```

### 3.2 设计问题

#### 问题1: 搜索时重复遍历文本节点

**现状**：
- `performSearch()` 中用 TreeWalker 遍历文本节点
- `scrollToMessage()` 中又用 TreeWalker 遍历文本节点

**问题**：
- 重复计算，性能浪费
- 两次遍历可能得到不同的结果（DOM 可能变化）

#### 问题2: 句子位置计算复杂且不可靠

**现状**：
```javascript
// 按句子分割
const sentences = allText.split(/[。\n！？；;!?]+/).filter(s => s.trim());

// 尝试找到句子在 allText 中的位置
let matchIndex = allTextLower.indexOf(sentenceLower, searchStart);
```

**问题**：
- 分割后的句子可能找不到原始位置（分隔符被去掉了）
- 同一个句子出现多次时，位置计算可能不准确
- 跨文本节点的句子处理不正确

#### 问题3: targetNode 记录了但没用上

**现状**：
- `performSearch()` 记录了 `targetNode` 和 `targetOffset`
- `scrollToMessage()` 完全忽略这些信息，重新遍历

---

## 四、正确的设计方案

### 4.1 跳转方案选择

#### 方案A: 滚动到消息 + CSS 高亮目标句子

**优点**：
- 简单可靠，不依赖 Range API
- 不需要精确计算文本位置
- 兼容性好

**缺点**：
- 不能精确滚动到句子位置
- 如果消息很长，用户需要手动找句子

**实现**：
```javascript
function scrollToMessage(index, sentence) {
  const msg = messages[index];
  
  // 1. 滚动到消息元素
  msg.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // 2. 如果有句子，用 CSS 高亮
  if (sentence && sentence.length > 10) {
    highlightSentenceInElement(msg.element, sentence);
  }
}

function highlightSentenceInElement(element, sentence) {
  // 使用 window.find 在元素内搜索
  // 或者用 CSS ::highlight API (新标准)
}
```

#### 方案B: 使用 Range + getBoundingClientRect 滚动

**优点**：
- 可以精确滚动到句子位置
- 可以高亮选中的文本

**缺点**：
- 实现复杂
- 需要正确计算 Range 位置
- 可能跨多个文本节点

**实现**：
```javascript
function scrollToMessage(index, sentence, sentenceStart, sentenceEnd) {
  const msg = messages[index];
  
  if (sentence && sentenceStart !== null) {
    // 1. 创建 Range
    const range = createRangeFromPosition(msg.element, sentenceStart, sentenceEnd);
    
    if (range) {
      // 2. 滚动到 Range 位置
      const rect = range.getBoundingClientRect();
      window.scrollTo({
        top: rect.top + window.scrollY - window.innerHeight / 2,
        behavior: 'smooth'
      });
      
      // 3. 高亮文本
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      return;
    }
  }
  
  // 回退到消息级滚动
  msg.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

#### 方案C: 使用 anchor 元素

**优点**：
- 浏览器原生支持
- 不需要计算位置

**缺点**：
- 需要修改页面 DOM（插入 anchor）
- 可能影响页面结构

### 4.2 推荐方案

**推荐方案B**，但需要修复当前实现：

1. **修复 Range 滚动**：使用 `getBoundingClientRect()` 而不是 `scrollIntoView()`
2. **简化位置记录**：直接记录文本节点引用，而不是重新遍历
3. **正确处理跨节点**：如果句子跨多个文本节点，创建多个 Range

---

## 五、代码模块划分

### 5.1 当前代码结构

```
content.js (900+ 行)
├── 配置 (CONFIG, PLATFORM_CONFIGS)
├── 状态 (sidebarVisible, messages, sidebar, ...)
├── 平台检测 (detectPlatform)
├── 初始化 (init, setup)
├── UI 创建 (createToggleButton, createSidebar)
├── 消息扫描 (scanMessages, scanMessagesFallback, extractMessageInfo, sortMessagesByPosition)
├── 搜索 (performSearch, highlightText)
├── UI 更新 (updateTimelineUI)
├── 跳转 (scrollToMessage) ← 问题在这里
├── DOM 监听 (startObserving)
└── 工具函数 (escapeHtml)
```

### 5.2 建议重构

将 `scrollToMessage` 拆分为多个函数：

```javascript
// 滚动到消息（主入口）
function scrollToMessage(index, sentence, sentenceStart, sentenceEnd) {
  const msg = messages[index];
  
  if (sentence && sentenceStart !== null) {
    // 尝试精确跳转
    if (scrollToSentence(msg.element, sentenceStart, sentenceEnd)) {
      return;
    }
  }
  
  // 回退到消息级滚动
  scrollToElement(msg.element);
}

// 精确跳转到句子
function scrollToSentence(element, start, end) {
  const range = createRangeFromPosition(element, start, end);
  if (!range) return false;
  
  // 滚动到 Range 位置
  const rect = range.getBoundingClientRect();
  window.scrollTo({
    top: rect.top + window.scrollY - window.innerHeight / 2,
    behavior: 'smooth'
  });
  
  // 高亮文本
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  return true;
}

// 从位置创建 Range
function createRangeFromPosition(element, start, end) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let textNode;
  let allText = '';
  let nodePositions = [];
  
  while ((textNode = walker.nextNode())) {
    nodePositions.push({
      node: textNode,
      start: allText.length,
      end: allText.length + textNode.length,
    });
    allText += textNode.textContent;
  }
  
  // 找到包含 start 的节点
  for (const pos of nodePositions) {
    if (pos.start <= start && pos.end > start) {
      const range = document.createRange();
      range.setStart(pos.node, start - pos.start);
      
      // 检查 end 是否在同一个节点
      if (pos.end >= end) {
        range.setEnd(pos.node, end - pos.start);
      } else {
        // 跨节点，找下一个节点
        // ...（需要处理）
      }
      
      return range;
    }
  }
  
  return null;
}

// 滚动到元素
function scrollToElement(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // 高亮效果
  const originalBg = element.style.backgroundColor;
  element.style.transition = 'background-color 0.3s';
  element.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
  
  setTimeout(() => {
    element.style.backgroundColor = originalBg;
  }, 2000);
}
```

---

## 六、待修复的 Bug 列表

### P0 - 必须修复

| Bug | 描述 | 解决方案 |
|-----|------|----------|
| Range.scrollIntoView | Range 对象没有 scrollIntoView 方法 | 使用 getBoundingClientRect + window.scrollTo |

### P1 - 应该修复

| Bug | 描述 | 解决方案 |
|-----|------|----------|
| 重复遍历 | performSearch 和 scrollToMessage 都遍历文本节点 | 直接使用记录的 targetNode |
| 跨节点句子 | 句子可能跨多个文本节点 | 正确处理 Range 跨节点情况 |

### P2 - 可以优化

| 问题 | 描述 | 解决方案 |
|------|------|----------|
| 代码过长 | content.js 900+ 行 | 拆分为多个模块 |
| 句子位置计算复杂 | 分割后重新查找位置 | 直接记录位置不分割 |

---

## 七、测试用例

### 7.1 跳转测试

```javascript
// 测试1: 正常模式跳转
// - 点击时间线项
// - 期望: 滚动到对应消息，高亮消息

// 测试2: 搜索模式跳转（句子在单个文本节点）
// - 搜索关键词，点击搜索结果
// - 期望: 滚动到对应句子，高亮句子

// 测试3: 搜索模式跳转（句子跨多个文本节点）
// - 搜索跨多个文本节点的句子
// - 期望: 正确滚动并高亮

// 测试4: 搜索模式跳转（句子多次出现）
// - 搜索出现多次的句子
// - 期望: 点击哪个就跳转到哪个，不是第一个
```

### 7.2 搜索测试

```javascript
// 测试1: 基本搜索
// - 输入关键词
// - 期望: 显示包含关键词的句子

// 测试2: 搜索无结果
// - 输入不存在的关键词
// - 期望: 显示"未找到匹配的内容"

// 测试3: 清空搜索
// - 清空搜索框
// - 期望: 显示所有消息
```

---

## 八、API 参考

### 8.1 相关 DOM API

```javascript
// Element.scrollIntoView() - 滚动到元素
element.scrollIntoView({ behavior: 'smooth', block: 'start' });

// Range.getBoundingClientRect() - 获取 Range 的位置
const rect = range.getBoundingClientRect();
// rect.top, rect.left, rect.width, rect.height

// window.scrollTo() - 滚动窗口
window.scrollTo({
  top: 100,
  behavior: 'smooth'
});

// Selection API - 选中文本
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);

// TreeWalker - 遍历文本节点
const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
while ((node = walker.nextNode())) {
  // 处理文本节点
}

// Range API - 创建文本范围
const range = document.createRange();
range.setStart(textNode, startOffset);
range.setEnd(textNode, endOffset);
```

### 8.2 Range 注意事项

1. **Range 没有 scrollIntoView 方法** - 这是 Element 的方法
2. **Range 可能跨多个节点** - 需要正确处理
3. **Range offset 必须在有效范围内** - 否则抛出异常
4. **Range 的 start/end 必须在同一文档** - 不能跨 iframe

---

## 九、开发指南

### 9.1 如何添加新平台

1. 在 `PLATFORM_CONFIGS` 中添加配置：
```javascript
newPlatform: {
  name: '新平台',
  hostPattern: /newplatform\.com/,
  selectors: {
    container: '[class*="chat-container"]',
    userMessage: '[class*="user-message"]',
    aiMessage: '[class*="ai-message"]',
    bubble: '[class*="bubble"]',
  },
},
```

2. 测试选择器是否正确
3. 特殊情况（如豆包的 aiIndicator）添加特殊处理

### 9.2 如何调试

1. 打开 Chrome DevTools
2. 查看 Console 中的 `[ChatHop]` 日志
3. 检查 `messages` 和 `filteredMessages` 数组
4. 测试选择器：`document.querySelectorAll('[class*="xxx"]')`

### 9.3 常见问题

| 问题 | 解决方案 |
|------|----------|
| 找不到消息 | 检查选择器是否正确 |
| 跳转不工作 | 检查 Range 创建是否成功 |
| 搜索无结果 | 检查 TreeWalker 是否遍历到文本节点 |
| 高亮不显示 | 检查 Selection API 是否正确调用 |

---

## 十、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.9.9 | 2026-03-12 | 修复跳转问题（未完成） |
| v0.9.8 | 2026-03-11 | 添加搜索功能 |
| v0.9.0 | 2026-03-07 | 支持 11 个平台 |
| v0.1.0 | 2026-03-01 | 初始版本 |

---

*最后更新: 2026-03-12 | 作者: Tutu*
