// ChatHop - Content Script
// 聊天兔子 - 为多个 AI 平台提供侧边栏时间线导航

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    sidebarWidth: 280,
    animationDuration: 300,
    maxSummaryLength: 60,
    observeDebounce: 500,
    searchContextLines: 1, // 搜索结果显示的上下文行数（前后各 1 行）
  };

  // 平台配置 - 根据不同平台设置不同的选择器
  const PLATFORM_CONFIGS = {
    // 千问
    qianwen: {
      name: '千问',
      hostPattern: /qianwen\.com|tongyi\.aliyun\.com/,
      selectors: {
        container: '[class*="message-list-scroll-container"]',
        userMessage: '[class*="questionItem"]',
        aiMessage: '[class*="answerItem"]',
        bubble: '[class*="bubble"]',
      },
    },
    // 元宝
    yuanbao: {
      name: '元宝',
      hostPattern: /yuanbao\.tencent\.com/,
      selectors: {
        container: '[class*="agent-chat__list"]',
        userMessage: '[class*="agent-chat__list__item--human"]',
        aiMessage: '[class*="agent-chat__list__item--ai"]',
        bubble: '[class*="agent-chat__bubble"]',
      },
    },
    // 豆包
    doubao: {
      name: '豆包',
      hostPattern: /doubao\.com/,
      selectors: {
        container: '[class*="message-list-"]',
        userMessage: '[class*="message-block-container"]',
        aiMessage: '[class*="message-block-container"]',
        bubble: '[class*="container-PvPoAn"]',
        // 豆包需要特殊处理：AI消息包含 flow-markdown-body
        aiIndicator: '[class*="flow-markdown-body"]',
      },
    },
    // Kimi
    kimi: {
      name: 'Kimi',
      hostPattern: /kimi\.com|moonshot\.cn/,
      selectors: {
        container: '[class*="chat-content-list"]',
        userMessage: '[class*="chat-content-item-user"]',
        aiMessage: '[class*="chat-content-item-assistant"]',
        bubble: '[class*="user-content"], [class*="markdown-container"]',
      },
    },
    // DeepSeek
    deepseek: {
      name: 'DeepSeek',
      hostPattern: /chat\.deepseek\.com/,
      selectors: {
        container: 'body',
        userMessage: '.ds-message.d29f3d7d',
        aiMessage: '.ds-message:not(.d29f3d7d)',
        bubble: '.ds-message',
      },
    },

    // 文心一言
    yiyan: {
      name: '文心一言',
      hostPattern: /yiyan\.baidu\.com/,
      selectors: {
        container: '[class*="chatViewer"]',
        userMessage: '[class*="questionBox"]',
        aiMessage: '[class*="answerBox"]',
        bubble: '[class*="questionText"], [class*="answerBox"]',
      },
    },
    // MiniMax
    minimax: {
      name: 'MiniMax',
      hostPattern: /agent\.minimaxi\.com/,
      selectors: {
        container: '.messages-container',
        userMessage: '.message.sent',
        aiMessage: '.message.received',
        bubble: '.message-content',
      },
    },
    // ChatGPT
    chatgpt: {
      name: 'ChatGPT',
      hostPattern: /chatgpt\.com/,
      selectors: {
        container: 'main',
        userMessage: '[data-message-author-role="user"]',
        aiMessage: '[data-message-author-role="assistant"]',
        bubble: '[class*="text-message"]',
      },
    },
    // Grok
    grok: {
      name: 'Grok',
      hostPattern: /grok\.com/,
      selectors: {
        container: 'main',
        userMessage: '[class*="items-end"] .message-bubble',
        aiMessage: '[class*="items-start"] .message-bubble',
        bubble: '.message-bubble',
      },
    },
    // Claude
    claude: {
      name: 'Claude',
      hostPattern: /claude\.ai/,
      selectors: {
        container: 'body',
        userMessage: '[data-testid="user-message"]',
        aiMessage: '[data-testid="user-message"]', // 占位，实际用特殊处理
        bubble: '[data-testid="user-message"], [class*="font-claude-response"]:not([class*="response-body"])',
        // Claude AI 消息需要特殊处理：找包含 font-claude-response 的容器
        aiContainerPattern: 'group relative',
      },
    },
    // Gemini
    gemini: {
      name: 'Gemini',
      hostPattern: /gemini\.google\.com/,
      selectors: {
        container: 'body',
        userMessage: 'user-query',
        aiMessage: 'model-response',
        bubble: '.query-content, message-content',
      },
    },
  };

  // 状态
  let sidebarVisible = false;
  let messages = [];
  let sidebar = null;
  let toggleButton = null;
  let observer = null;
  let currentPlatform = null;
  let searchQuery = ''; // 搜索关键词
  let filteredMessages = []; // 过滤后的消息

  // 检测当前平台
  function detectPlatform() {
    const hostname = window.location.hostname;
    for (const [key, config] of Object.entries(PLATFORM_CONFIGS)) {
      if (config.hostPattern.test(hostname)) {
        return { key, ...config };
      }
    }
    return null;
  }

  // 初始化
  function init() {
    currentPlatform = detectPlatform();
    
    if (!currentPlatform) {
      console.log('[ChatHop] 不支持当前平台');
      return;
    }
    
    console.log('[ChatHop] 检测到平台: ${currentPlatform.name}');
    console.log('[ChatHop] 初始化扩展...');
    
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setTimeout(setup, 1000);
    }
  }

  // 设置
  function setup() {
    createToggleButton();
    createSidebar();
    startObserving();
    
    // 初始扫描消息
    setTimeout(scanMessages, 1500);
    
    console.log('[ChatHop] 扩展已加载');
  }

  // 创建切换按钮
  function createToggleButton() {
    if (document.getElementById('ai-timeline-toggle')) {
      toggleButton = document.getElementById('ai-timeline-toggle');
      return;
    }
    
    toggleButton = document.createElement('div');
    toggleButton.id = 'ai-timeline-toggle';
    toggleButton.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 简约风兔子 - 耳朵完整显示 -->
        <ellipse cx="16" cy="23" rx="7" ry="6" fill="white"/>
        <circle cx="16" cy="15" r="5.5" fill="white"/>
        <ellipse cx="11" cy="6" rx="2.5" ry="6" fill="white"/>
        <ellipse cx="21" cy="6" rx="2.5" ry="6" fill="white"/>
        <!-- 眼睛 -->
        <circle cx="14" cy="14" r="1" fill="rgba(0,0,0,0.7)"/>
        <circle cx="18" cy="14" r="1" fill="rgba(0,0,0,0.7)"/>
        <!-- 鼻子 -->
        <ellipse cx="16" cy="17" rx="0.8" ry="0.5" fill="rgba(0,0,0,0.2)"/>
      </svg>
    `;
    toggleButton.title = '切换对话时间线';
    toggleButton.addEventListener('click', toggleSidebar);
    document.body.appendChild(toggleButton);
  }

  // 创建侧边栏
  function createSidebar() {
    if (document.getElementById('ai-timeline-sidebar')) {
      sidebar = document.getElementById('ai-timeline-sidebar');
      return;
    }

    sidebar = document.createElement('div');
    sidebar.id = 'ai-timeline-sidebar';
    sidebar.innerHTML = `
      <div class="ai-timeline-header">
        <h3>🐰 ChatHop</h3>
        <span class="ai-timeline-platform">${currentPlatform.name}</span>
        <button class="ai-timeline-search-toggle" title="搜索">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <button class="ai-timeline-close" title="关闭">×</button>
      </div>
      <div class="ai-timeline-search-container">
        <div class="ai-timeline-search">
          <input type="text" class="ai-timeline-search-input" placeholder="搜索关键词..." />
          <button class="ai-timeline-search-clear" title="清空">×</button>
        </div>
      </div>
      <div class="ai-timeline-content">
        <div class="ai-timeline-empty">
          <p>🔍 扫描中...</p>
          <p class="ai-timeline-hint">等待检测对话消息</p>
        </div>
      </div>
      <div class="ai-timeline-footer">
        <span class="ai-timeline-count">已显示 0 条 · 滚动页面加载更多</span>
        <a class="ai-timeline-github" href="https://github.com/tutu-claw-ai/chat-hop" target="_blank" title="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </div>
    `;

    // 关闭按钮
    sidebar.querySelector('.ai-timeline-close').addEventListener('click', () => {
      setSidebarVisible(false);
    });

    // 搜索图标切换
    const searchToggle = sidebar.querySelector('.ai-timeline-search-toggle');
    const searchContainer = sidebar.querySelector('.ai-timeline-search-container');
    const searchInput = sidebar.querySelector('.ai-timeline-search-input');
    const searchClear = sidebar.querySelector('.ai-timeline-search-clear');

    searchToggle.addEventListener('click', () => {
      const isVisible = searchContainer.classList.toggle('visible');
      if (isVisible) {
        searchInput.focus();
      } else {
        // 收起时清空搜索
        searchInput.value = '';
        searchQuery = '';
        performSearch();
      }
    });

    // 实时搜索
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      performSearch();
    });

    // 清空搜索
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      performSearch();
      searchInput.focus();
    });

    // ESC 键清空并收起
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (searchQuery) {
          // 有内容时，先清空
          searchInput.value = '';
          searchQuery = '';
          performSearch();
        } else {
          // 无内容时，收起搜索框
          searchContainer.classList.remove('visible');
        }
      }
    });

    document.body.appendChild(sidebar);
  }

  // 切换侧边栏显示
  function toggleSidebar() {
    setSidebarVisible(!sidebarVisible);
  }

  // 设置侧边栏显示状态
  function setSidebarVisible(visible) {
    sidebarVisible = visible;
    if (visible) {
      sidebar.classList.add('visible');
      toggleButton.style.display = 'none'; // 侧边栏打开时隐藏浮球
      scanMessages();
    } else {
      sidebar.classList.remove('visible');
      toggleButton.style.display = 'flex'; // 侧边栏关闭时显示浮球
    }
  }

  // 扫描消息
  function scanMessages() {
    console.log(`[ChatHop] 扫描 ${currentPlatform.name} 消息...`);
    messages = [];
    
    const selectors = currentPlatform.selectors;
    
    // 查找消息容器
    const container = document.querySelector(selectors.container);
    
    if (!container) {
      console.log('[ChatHop] 未找到消息容器，尝试备用方法');
      // 备用：直接在整个页面查找
      scanMessagesFallback();
      return;
    }
    
    // 查找用户消息和 AI 消息
    let userMessages = Array.from(container.querySelectorAll(selectors.userMessage));
    let aiMessages = [];
    
    // Claude 特殊处理：AI 消息需要找容器
    if (currentPlatform.key === 'claude' && selectors.aiContainerPattern) {
      const aiContainers = new Set();
      container.querySelectorAll('[class*="font-claude-response"]:not([class*="response-body"])').forEach(el => {
        const container = el.closest(`[class*="${selectors.aiContainerPattern}"]`);
        if (container) aiContainers.add(container);
      });
      aiMessages = Array.from(aiContainers);
    } else {
      aiMessages = Array.from(container.querySelectorAll(selectors.aiMessage));
    }
    
    console.log(`[ChatHop] 找到 ${userMessages.length} 个用户消息, ${aiMessages.length} 个 AI 消息`);
    
    // 处理用户消息
    userMessages.forEach((el, index) => {
      const msg = extractMessageInfo(el, 'user', index);
      if (msg) {
        messages.push(msg);
      }
    });
    
    // 处理 AI 消息
    aiMessages.forEach((el, index) => {
      const msg = extractMessageInfo(el, 'assistant', index);
      if (msg) {
        messages.push(msg);
      }
    });
    
    // 按 DOM 位置排序
    sortMessagesByPosition();
    
    console.log(`[ChatHop] 共找到 ${messages.length} 条消息`);
    updateTimelineUI();
  }

  // 备用扫描方法
  function scanMessagesFallback() {
    const selectors = currentPlatform.selectors;
    
    let userMessages = Array.from(document.querySelectorAll(selectors.userMessage));
    let aiMessages = [];
    
    // Claude 特殊处理
    if (currentPlatform.key === 'claude' && selectors.aiContainerPattern) {
      const aiContainers = new Set();
      document.querySelectorAll('[class*="font-claude-response"]:not([class*="response-body"])').forEach(el => {
        const container = el.closest(`[class*="${selectors.aiContainerPattern}"]`);
        if (container) aiContainers.add(container);
      });
      aiMessages = Array.from(aiContainers);
    } else {
      aiMessages = Array.from(document.querySelectorAll(selectors.aiMessage));
    }
    
    userMessages.forEach((el, index) => {
      const msg = extractMessageInfo(el, 'user', index);
      if (msg) messages.push(msg);
    });
    
    aiMessages.forEach((el, index) => {
      const msg = extractMessageInfo(el, 'assistant', index);
      if (msg) messages.push(msg);
    });
    
    sortMessagesByPosition();
    
    console.log(`[ChatHop] 备用扫描: ${messages.length} 条消息`);
    updateTimelineUI();
  }

  // 按位置排序消息
  function sortMessagesByPosition() {
    // 使用 DOM 顺序而不是视口位置
    messages.sort((a, b) => {
      try {
        // compareDocumentPosition 返回：
        // 2: a 在 b 之后
        // 4: a 在 b 之前
        const position = a.element.compareDocumentPosition(b.element);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      } catch (e) {
        return 0;
      }
    });
    
    messages.forEach((msg, index) => {
      msg.index = index;
    });
  }

  // 提取消息信息
  function extractMessageInfo(element, role, index) {
    const selectors = currentPlatform.selectors;
    
    // 获取文本内容
    const bubbleEl = element.querySelector(selectors.bubble) || element;
    let text = '';
    
    if (bubbleEl) {
      text = bubbleEl.textContent?.trim() || '';
    }
    
    if (!text || text.length < 2) {
      text = element.textContent?.trim() || '';
    }
    
    if (!text || text.length < 2) return null;
    
    // 豆包特殊处理：通过 aiIndicator 判断是否为 AI 消息
    if (currentPlatform.key === 'doubao' && selectors.aiIndicator) {
      const hasAiContent = element.querySelector(selectors.aiIndicator);
      role = hasAiContent ? 'assistant' : 'user';
    }
    
    // 提取摘要
    const summary = text.substring(0, CONFIG.maxSummaryLength) + (text.length > CONFIG.maxSummaryLength ? '...' : '');

    // 生成唯一ID
    const id = `chat-msg-${role}-${index}-${Date.now()}`;

    return {
      id,
      element,
      role,
      content: summary,
      fullContent: text,
      index: 0,
    };
  }

  // 执行搜索（按句子搜索）
  function performSearch() {
    if (!searchQuery) {
      // 清空搜索，显示所有消息
      filteredMessages = [];
    } else {
      // 按句子搜索
      const query = searchQuery.toLowerCase();
      filteredMessages = [];

      messages.forEach(msg => {
        // 按句子分割（支持多种分隔符）
        const sentences = msg.fullContent.split(/[。\n！？；;!?]+/).filter(s => s.trim());

        sentences.forEach((sentence, sentenceIndex) => {
          if (sentence.toLowerCase().includes(query)) {
            // 获取上下文（只显示前后各 1 行）
            const contextLines = [];

            // 前面的句子（只显示 1 行）
            if (sentenceIndex > 0) {
              contextLines.push({ text: sentences[sentenceIndex - 1], isMatch: false });
            }

            // 当前匹配的句子
            contextLines.push({ text: sentence, isMatch: true });

            // 后面的句子（只显示 1 行）
            if (sentenceIndex < sentences.length - 1) {
              contextLines.push({ text: sentences[sentenceIndex + 1], isMatch: false });
            }

            filteredMessages.push({
              id: `${msg.id}-sentence-${sentenceIndex}`,
              messageId: msg.id,
              sentence: sentence,
              contextLines: contextLines,
              role: msg.role,
              element: msg.element,
              fullContent: msg.fullContent,
            });
          }
        });
      });
    }

    updateTimelineUI();
  }

  // 高亮文本中的关键词
  function highlightText(text, query) {
    if (!query) return escapeHtml(text);

    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query);

    // 创建正则表达式（不区分大小写）
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    // 替换为高亮 span
    return escapedText.replace(regex, '<span class="ai-timeline-highlight">$1</span>');
  }

  // 更新时间线UI
  function updateTimelineUI() {
    if (!sidebar) return;

    const content = sidebar.querySelector('.ai-timeline-content');
    const countSpan = sidebar.querySelector('.ai-timeline-count');

    // 搜索模式
    if (searchQuery) {
      // 更新计数
      countSpan.textContent = `找到 ${filteredMessages.length} 处匹配 · 共 ${messages.length} 条消息`;

      // 空结果
      if (filteredMessages.length === 0) {
        content.innerHTML = `
          <div class="ai-timeline-empty">
            <p>🔍 未找到匹配的内容</p>
            <p class="ai-timeline-hint">尝试其他关键词</p>
          </div>
        `;
        return;
      }

      // 渲染搜索结果（句子片段）
      const html = filteredMessages.map((result) => {
        const roleIcon = result.role === 'user' ? '👤' : '🤖';
        const roleClass = result.role === 'user' ? 'user-message' : 'assistant-message';
        const roleLabel = result.role === 'user' ? '我' : currentPlatform.name;

        // 渲染上下文
        const contextHtml = result.contextLines.map(line => {
          const lineClass = line.isMatch ? 'ai-timeline-search-match' : 'ai-timeline-search-context';
          const lineText = line.isMatch ? highlightText(line.text, searchQuery) : escapeHtml(line.text);
          return `<div class="${lineClass}">${lineText}</div>`;
        }).join('');

        return `
          <div class="ai-timeline-search-result ${roleClass}" data-id="${result.id}" data-message-id="${result.messageId}">
            <div class="ai-timeline-search-result-header">
              <span class="ai-timeline-role">${roleIcon} ${roleLabel}</span>
            </div>
            <div class="ai-timeline-search-result-context">
              ${contextHtml}
            </div>
          </div>
        `;
      }).join('');

      content.innerHTML = html;

      // 绑定点击事件 - 精确跳转到句子
      content.querySelectorAll('.ai-timeline-search-result').forEach(item => {
        item.addEventListener('click', () => {
          const messageId = item.dataset.messageId;
          const resultId = item.dataset.id;
          const result = filteredMessages.find(r => r.id === resultId);
          const originalIndex = messages.findIndex(m => m.id === messageId);
          if (originalIndex !== -1 && result) {
            scrollToMessage(originalIndex, result.sentence);
          }
        });
      });

    } else {
      // 正常模式 - 显示所有消息
      countSpan.textContent = `已显示 ${messages.length} 条 · 滚动页面加载更多`;

      // 空状态
      if (messages.length === 0) {
        content.innerHTML = `
          <div class="ai-timeline-empty">
            <p>📭 暂无消息</p>
            <p class="ai-timeline-hint">开始对话后会自动显示</p>
          </div>
        `;
        return;
      }

      // 渲染消息列表
      const html = messages.map((msg) => {
        const roleIcon = msg.role === 'user' ? '👤' : '🤖';
        const roleClass = msg.role === 'user' ? 'user-message' : 'assistant-message';
        const roleLabel = msg.role === 'user' ? '我' : currentPlatform.name;

        return `
          <div class="ai-timeline-item ${roleClass}" data-id="${msg.id}">
            <div class="ai-timeline-item-header">
              <span class="ai-timeline-role">${roleIcon} ${roleLabel}</span>
            </div>
            <div class="ai-timeline-item-content">${escapeHtml(msg.content)}</div>
          </div>
        `;
      }).join('');

      content.innerHTML = html;

      // 绑定点击事件
      content.querySelectorAll('.ai-timeline-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const originalIndex = messages.findIndex(m => m.id === id);
          if (originalIndex !== -1) {
            scrollToMessage(originalIndex);
          }
        });
      });
    }
  }

  // 滚动到消息（支持精确跳转到句子）
  function scrollToMessage(index, sentence = null) {
    const msg = messages[index];
    if (!msg || !msg.element) return;

    // 如果提供了句子，尝试精确跳转到该句子
    if (sentence && sentence.length > 10) {
      // 使用 window.find() 精确搜索并高亮句子
      // 先清空之前的搜索
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }

      // 使用 window.find() 搜索句子
      const found = window.find(sentence, false, false, true, false, true, false);

      if (found) {
        // 成功找到并高亮句子
        console.log(`[ChatHop] 精确定位到句子: ${sentence.substring(0, 30)}...`);
        return;
      }
    }

    // 如果没有句子或找不到，回退到滚动到整个消息
    const originalBg = msg.element.style.backgroundColor;
    const originalTransition = msg.element.style.transition;
    msg.element.style.transition = 'background-color 0.3s';
    msg.element.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';

    // 滚动到元素顶端
    msg.element.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 移除高亮
    setTimeout(() => {
      msg.element.style.backgroundColor = originalBg;
      setTimeout(() => {
        msg.element.style.transition = originalTransition;
      }, 300);
    }, 2000);

    // 高亮时间线项
    sidebar.querySelectorAll('.ai-timeline-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  }

  // 开始监听DOM变化
  function startObserving() {
    if (observer) {
      observer.disconnect();
    }
    
    let debounceTimer;
    observer = new MutationObserver((mutations) => {
      const hasRelevantChange = mutations.some(mutation => {
        const target = mutation.target;
        const className = (target.className || '').toString();
        return (
          className.includes('chat') ||
          className.includes('message') ||
          className.includes('question') ||
          className.includes('answer') ||
          className.includes('bubble') ||
          className.includes('agent')
        );
      });
      
      if (hasRelevantChange || mutations.length > 5) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (sidebarVisible) {
            scanMessages();
          }
        }, CONFIG.observeDebounce);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });
  }

  // HTML转义
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 启动
  init();
})();
