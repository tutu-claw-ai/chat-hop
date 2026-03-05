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
    // DeepSeek（待确认）
    deepseek: {
      name: 'DeepSeek',
      hostPattern: /chat\.deepseek\.com/,
      selectors: {
        container: '[class*="chat"]',
        userMessage: '[class*="user"], [class*="human"]',
        aiMessage: '[class*="assistant"], [class*="bot"]',
        bubble: '[class*="message"], [class*="bubble"]',
      },
    },
    // Kimi（待确认）
    kimi: {
      name: 'Kimi',
      hostPattern: /kimi\.moonshot\.cn/,
      selectors: {
        container: '[class*="chat"]',
        userMessage: '[class*="user"], [class*="human"]',
        aiMessage: '[class*="assistant"], [class*="bot"]',
        bubble: '[class*="message"], [class*="bubble"]',
      },
    },
    // 豆包（待确认）
    doubao: {
      name: '豆包',
      hostPattern: /chat\.doubao\.com/,
      selectors: {
        container: '[class*="chat"]',
        userMessage: '[class*="user"], [class*="human"]',
        aiMessage: '[class*="assistant"], [class*="bot"]',
        bubble: '[class*="message"], [class*="bubble"]',
      },
    },
    // 文心一言（待确认）
    yiyan: {
      name: '文心一言',
      hostPattern: /yiyan\.baidu\.com/,
      selectors: {
        container: '[class*="chat"]',
        userMessage: '[class*="user"], [class*="human"]',
        aiMessage: '[class*="assistant"], [class*="bot"]',
        bubble: '[class*="message"], [class*="bubble"]',
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
        <button class="ai-timeline-close" title="关闭">×</button>
      </div>
      <div class="ai-timeline-content">
        <div class="ai-timeline-empty">
          <p>🔍 扫描中...</p>
          <p class="ai-timeline-hint">等待检测对话消息</p>
        </div>
      </div>
      <div class="ai-timeline-footer">
        <span class="ai-timeline-count">0 条消息</span>
        <button class="ai-timeline-refresh" title="刷新">🔄</button>
      </div>
    `;
    
    sidebar.querySelector('.ai-timeline-close').addEventListener('click', () => {
      setSidebarVisible(false);
    });
    
    sidebar.querySelector('.ai-timeline-refresh').addEventListener('click', () => {
      scanMessages();
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
      toggleButton.classList.add('active');
      scanMessages();
    } else {
      sidebar.classList.remove('visible');
      toggleButton.classList.remove('active');
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
    const userMessages = container.querySelectorAll(selectors.userMessage);
    const aiMessages = container.querySelectorAll(selectors.aiMessage);
    
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
    
    const userMessages = document.querySelectorAll(selectors.userMessage);
    const aiMessages = document.querySelectorAll(selectors.aiMessage);
    
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
    messages.sort((a, b) => {
      try {
        const posA = a.element.getBoundingClientRect().top;
        const posB = b.element.getBoundingClientRect().top;
        return posA - posB;
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
    
    // 提取摘要
    const summary = text.substring(0, CONFIG.maxSummaryLength) + (text.length > CONFIG.maxSummaryLength ? '...' : '');
    
    // 生成唯一ID
    const id = `ai-msg-${role}-${index}-${Date.now()}`;
    
    return {
      id,
      element,
      role,
      content: summary,
      fullContent: text,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      index: 0,
    };
  }

  // 更新时间线UI
  function updateTimelineUI() {
    if (!sidebar) return;
    
    const content = sidebar.querySelector('.ai-timeline-content');
    const countSpan = sidebar.querySelector('.ai-timeline-count');
    
    countSpan.textContent = `${messages.length} 条消息`;
    
    if (messages.length === 0) {
      content.innerHTML = `
        <div class="ai-timeline-empty">
          <p>📭 暂无消息</p>
          <p class="ai-timeline-hint">开始对话后点击刷新</p>
        </div>
      `;
      return;
    }
    
    const html = messages.map((msg, index) => {
      const roleIcon = msg.role === 'user' ? '👤' : '🤖';
      const roleClass = msg.role === 'user' ? 'user-message' : 'assistant-message';
      const roleLabel = msg.role === 'user' ? '我' : currentPlatform.name;
      
      return `
        <div class="ai-timeline-item ${roleClass}" data-index="${index}" data-id="${msg.id}">
          <div class="ai-timeline-item-header">
            <span class="ai-timeline-role">${roleIcon} ${roleLabel}</span>
            <span class="ai-timeline-time">${msg.timestamp}</span>
          </div>
          <div class="ai-timeline-item-content">${escapeHtml(msg.content)}</div>
        </div>
      `;
    }).join('');
    
    content.innerHTML = html;
    
    // 绑定点击事件
    content.querySelectorAll('.ai-timeline-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        scrollToMessage(index);
      });
    });
  }

  // 滚动到消息
  function scrollToMessage(index) {
    const msg = messages[index];
    if (!msg || !msg.element) return;
    
    // 高亮效果
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
