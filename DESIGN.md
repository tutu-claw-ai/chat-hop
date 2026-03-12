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

// 搜索结果对象（v0.9.19 简化版）
{
  id: "chat-msg-user-0-s0",           // 唯一 ID
  messageId: "chat-msg-user-0-xxx",   // 关联的消息 ID
  messageIndex: 0,                     // 消息在数组中的索引
  sentence: "匹配的句子",               // 匹配的句子文本
  contextLines: [                      // 上下文（前后各 1 句）
    { text: "前一句", isMatch: false },
    { text: "匹配的句子", isMatch: true },
    { text: "后一句", isMatch: false },
  ],
  role: "user" | "assistant",
}
```

**v0.9.19 简化说明**：
- 移除了 `sentenceStart`、`sentenceEnd`（字符偏移量不可靠）
- 移除了 `targetNode`、`targetOffset`（DOM 引用在 React/Vue 下会失效）
- 移除了 `element`、`fullContent`（不需要重复存储）
- 跳转时直接用 `messageIndex` + `sentence` 实时查找

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

#### 流程3: 搜索（v0.9.19 简化版）

```
用户输入关键词
    ↓
performSearch()
    ↓
遍历每条消息
    ├── 获取消息元素的 textContent
    ├── 按句子分割（中英文标点 + 换行）
    ├── 过滤包含关键词的句子
    └── 构建上下文（前后各 1 句）
    ↓
updateTimelineUI() - 显示搜索结果
```

**简化要点**：
- 不再记录字符偏移量
- 不再遍历文本节点
- 不再存储 DOM 引用

#### 流程4: 跳转（v0.9.19 新方案）

```
用户点击搜索结果
    ↓
scrollToMessage(index, sentence)
    ↓
clearHighlights() - 清除之前的高亮
    ↓
findScrollContainer() - 找到实际的滚动容器
    ↓
滚动到消息位置
    ├── 有滚动容器 → container.scrollTo()
    └── 无滚动容器 → element.scrollIntoView()
    ↓
setTimeout 400ms 后
    ├── 有句子 → highlightInElement() 用 <mark> 标签高亮
    └── 无句子 → flashElement() 闪烁整个消息
```

---

## 三、跳转方案设计（v0.9.19 实现）

### 3.1 问题分析

**原始方案的问题**：

1. **`window.scrollTo()` 不起作用**
   - AI 聊天页面用内部 div 滚动，不是 window
   - 需要找到实际的滚动容器

2. **字符偏移量不可靠**
   - 搜索时计算 `sentenceStart`，跳转时重新遍历
   - DOM 变化后偏移量失效
   - 分割句子时分隔符被丢弃，indexOf 找不到正确位置

3. **DOM 引用会失效**
   - `targetNode` 存的是文本节点引用
   - React/Vue 重渲染后引用失效

### 3.2 新方案：两步法

**核心思路**：先滚动到消息，再在消息内高亮

```
步骤1: 滚动到消息元素
       使用正确的滚动容器（向上查找 overflow: auto/scroll 的父元素）

步骤2: 在消息元素内高亮句子
       用 TreeWalker 遍历文本节点 + <mark> 标签包裹
```

### 3.3 核心函数

#### findScrollContainer - 找滚动容器

```javascript
function findScrollContainer(element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && 
        parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}
```

#### highlightInElement - 高亮句子

```javascript
function highlightInElement(element, sentence) {
  clearHighlights();
  
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node;
  const lowerSentence = sentence.toLowerCase();

  while ((node = walker.nextNode())) {
    const idx = node.textContent.toLowerCase().indexOf(lowerSentence);
    if (idx === -1) continue;

    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + sentence.length);

    const mark = document.createElement('mark');
    mark.className = 'chathop-highlight';
    range.surroundContents(mark);

    // 3 秒后淡出
    setTimeout(() => {
      mark.classList.add('chathop-highlight-fade');
      setTimeout(() => mark.replaceWith(document.createTextNode(mark.textContent)), 500);
    }, 3000);

    return true;
  }
  return false;
}
```

#### scrollToMessage - 主入口

```javascript
function scrollToMessage(index, sentence) {
  const msg = messages[index];
  if (!msg || !msg.element) return;

  clearHighlights();

  const element = msg.element;
  const scrollContainer = findScrollContainer(element);

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const msgRect = element.getBoundingClientRect();
    const offset = msgRect.top - containerRect.top;
    scrollContainer.scrollTo({
      top: scrollContainer.scrollTop + offset - 80,
      behavior: 'smooth'
    });
  } else {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 等滚动完成后再高亮
  setTimeout(() => {
    if (sentence) {
      if (!highlightInElement(element, sentence)) {
        flashElement(element);  // 高亮失败，闪烁整个消息
      }
    } else {
      flashElement(element);
    }
  }, 400);
}
```

### 3.4 方案优点

| 优点 | 说明 |
|------|------|
| 不依赖字符偏移量 | 跳转时实时查找，简单可靠 |
| 正确处理滚动容器 | 向上查找 overflow: auto/scroll 的父元素 |
| 高亮用 `<mark>` 标签 | 可视效果好，不依赖 Selection API |
| 搜索结果数据结构简单 | 只需要 `messageIndex` + `sentence` |
| 代码量减少 | 从 900+ 行减少到 837 行 |

---

## 四、代码模块划分

### 4.1 当前代码结构（v0.9.19）

```
content.js (837 行)
├── 配置 (CONFIG, PLATFORM_CONFIGS)
├── 状态 (sidebarVisible, messages, sidebar, ...)
├── 平台检测 (detectPlatform)
├── 初始化 (init, setup)
├── UI 创建 (createToggleButton, createSidebar)
├── 消息扫描 (scanMessages, scanMessagesFallback, extractMessageInfo, sortMessagesByPosition)
├── 搜索 (performSearch, highlightText)
├── UI 更新 (updateTimelineUI)
├── 跳转 (scrollToMessage, findScrollContainer, highlightInElement, clearHighlights, flashElement)
├── DOM 监听 (startObserving)
└── 工具函数 (escapeHtml)
```

---

## 五、CSS 样式

### 5.1 高亮样式

```css
/* 搜索高亮 */
.chathop-highlight {
  background: rgba(255, 200, 0, 0.45) !important;
  border-radius: 2px;
  padding: 1px 0;
  transition: background 0.5s ease;
}

.chathop-highlight-fade {
  background: transparent !important;
}

/* 消息闪烁 */
@keyframes chathop-flash-anim {
  0%, 100% { background-color: transparent; }
  25% { background-color: rgba(102, 126, 234, 0.15); }
  50% { background-color: rgba(102, 126, 234, 0.25); }
  75% { background-color: rgba(102, 126, 234, 0.15); }
}

.chathop-flash {
  animation: chathop-flash-anim 2s ease;
  border-radius: 8px;
}
```

---

## 六、已知问题与改进方向

### 6.1 已修复（v0.9.19）

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| `window.scrollTo()` 不起作用 | ✅ 已修复 | `findScrollContainer()` 找实际滚动容器 |
| 字符偏移量不可靠 | ✅ 已修复 | 改用 `messageIndex` + `sentence` 实时查找 |
| DOM 引用失效 | ✅ 已修复 | 不再存储 DOM 引用 |
| 代码过于复杂 | ✅ 已改善 | 减少 60+ 行，简化数据结构 |

### 6.2 待改进（P2）

| 问题 | 说明 | 优先级 |
|------|------|--------|
| 消息 ID 生成不稳定 | 用 `index + timestamp` 生成，新消息插入后 ID 变化 | 低 |
| 代码未模块化 | 837 行单文件 | 低 |
| 缺少错误边界 | try-catch 很少 | 低 |
| console.log 调试信息 | 生产环境应该移除 | 低 |

---

## 七、测试用例

### 7.1 跳转测试

```javascript
// 测试1: 正常模式跳转
// - 点击时间线项
// - 期望: 滚动到对应消息，消息闪烁

// 测试2: 搜索模式跳转
// - 搜索关键词，点击搜索结果
// - 期望: 滚动到对应消息，句子被高亮（黄色背景）

// 测试3: 高亮自动消失
// - 点击搜索结果后
// - 期望: 3 秒后高亮淡出

// 测试4: 点击新结果清除旧高亮
// - 点击结果 A，再点击结果 B
// - 期望: A 的高亮消失，B 被高亮
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

## 八、开发指南

### 8.1 如何添加新平台

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

### 8.2 如何调试

1. 打开 Chrome DevTools
2. 查看 Console 中的 `[ChatHop]` 日志
3. 检查 `messages` 和 `filteredMessages` 数组
4. 测试选择器：`document.querySelectorAll('[class*="xxx"]')`

### 8.3 常见问题

| 问题 | 解决方案 |
|------|----------|
| 找不到消息 | 检查选择器是否正确 |
| 跳转不工作 | 检查 `findScrollContainer` 是否找到容器 |
| 搜索无结果 | 检查句子分割逻辑 |
| 高亮不显示 | 检查 CSS 是否加载 |

---

## 九、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.9.19 | 2026-03-12 | **重写跳转逻辑**：使用滚动容器 + mark 高亮，简化搜索数据结构 |
| v0.9.18 | 2026-03-12 | 修复 Range.scrollIntoView 错误 |
| v0.9.8 | 2026-03-11 | 添加搜索功能 |
| v0.9.0 | 2026-03-07 | 支持 11 个平台 |
| v0.1.0 | 2026-03-01 | 初始版本 |

---

*最后更新: 2026-03-12 13:40 | 作者: Tutu*
