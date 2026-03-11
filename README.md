# 🐰 ChatHop - 聊天兔子

> **Chrome 浏览器扩展** - 为 AI 对话网页提供侧边栏时间线导航

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue)](https://chromewebstore.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/tutu-claw-ai/chat-hop)](https://github.com/tutu-claw-ai/chat-hop/releases)

<p align="center">
  <img src="icons/icon128.png" alt="ChatHop Logo" width="128" height="128">
</p>

<p align="center">
  <strong>ChatHop · 聊天兔子</strong><br>
  <em>在 AI 对话中自由跳跃 🐰</em>
</p>

快速跳转到长对话中的任何消息，支持 ChatGPT、Claude、Kimi、DeepSeek 等 11 个主流 AI 平台。

---

## 🙏 致谢

本项目灵感来源于 [AI Chat Timeline](https://chromewebstore.google.com/detail/ai-chat-timeline-chatgpt/ohkakjacipbjpfcfimhhdfpolknbkmhh) - 一个为 ChatGPT 和 Gemini 提供时间线导航的优秀扩展。感谢原作者的创意启发！

---

## ✨ 功能特性

- 🗺️ **对话导航** - 侧边栏显示完整对话时间线，一目了然
- ⚡ **快速跳转** - 点击时间线项目，秒速定位到对应消息
- 🔍 **搜索功能** - 在对话中搜索关键词，快速找到特定内容
- 🎯 **智能摘要** - 自动提取消息摘要，快速了解内容
- 🌙 **深色模式** - 自动适配系统深色模式
- 🎨 **精美视觉** - 渐变配色，悬停动画，流畅体验
- 🌐 **多平台支持** - 支持 11 个主流 AI 平台
- 🔒 **隐私优先** - 所有数据本地处理，不上传任何信息

## 🌐 支持的平台

| 平台 | 状态 | 网址 |
|------|------|------|
| 千问 (Qianwen) | ✅ 已支持 | [qianwen.com](https://www.qianwen.com/chat/) |
| 元宝 (Yuanbao) | ✅ 已支持 | [yuanbao.tencent.com](https://yuanbao.tencent.com/chat/) |
| 豆包 (Doubao) | ✅ 已支持 | [doubao.com](https://www.doubao.com/chat/) |
| Kimi | ✅ 已支持 | [kimi.com](https://www.kimi.com/chat/) |
| DeepSeek | ✅ 已支持 | [chat.deepseek.com](https://chat.deepseek.com/) |
| 文心一言 (Yiyan) | ✅ 已支持 | [yiyan.baidu.com](https://yiyan.baidu.com/chat/) |
| MiniMax | ✅ 已支持 | [agent.minimaxi.com](https://agent.minimaxi.com/chat) |
| ChatGPT | ✅ 已支持 | [chatgpt.com](https://chatgpt.com/) |
| Grok | ✅ 已支持 | [grok.com](https://grok.com/) |
| Claude | ✅ 已支持 | [claude.ai](https://claude.ai/) |
| Gemini | ⚠️ 未测试 | [gemini.google.com](https://gemini.google.com/) |

## 📦 安装

### 方式一：Chrome Web Store（推荐）

*即将上线*

### 方式二：手动安装（开发者模式）

1. 从 [Releases](https://github.com/tutu-claw-ai/chat-hop/releases) 下载最新版本的 zip 文件
2. 解压到任意文件夹
3. 打开 Chrome，访问 `chrome://extensions/`
4. 开启右上角的「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择解压后的文件夹

## 📖 使用方法

1. 打开支持的 AI 平台（如 [ChatGPT](https://chatgpt.com/) 或 [Kimi](https://kimi.com/)）
2. 开始与 AI 对话
3. 点击页面右侧的 🐰 兔子按钮
4. 在弹出的侧边栏中查看对话时间线
5. 点击任意消息，页面自动滚动到对应位置

## 🎨 视觉特性

- **渐变配色** - 用户消息暖色调，AI 消息冷色调
- **悬停动画** - 卡片浮起效果，流畅过渡
- **激活高亮** - 当前消息发光边框
- **深色模式** - 完美适配系统主题

## 🔧 技术栈

- Vanilla JavaScript（无框架依赖）
- CSS3（渐变、动画、深色模式）
- Chrome Extension Manifest V3

## 📁 项目结构

```
chat-hop/
├── manifest.json      # 扩展配置
├── content.js         # 内容脚本（核心逻辑）
├── styles.css         # 样式文件
├── popup.html         # 弹出页面
├── popup.js           # 弹出页面脚本
└── icons/             # 图标资源
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 添加新平台支持

要添加新的 AI 平台支持，只需在 `content.js` 的 `PLATFORM_CONFIGS` 中添加配置：

```javascript
newPlatform: {
  name: '新平台名称',
  hostPattern: /platform\.domain\.com/,
  selectors: {
    container: '[class*="消息容器选择器"]',
    userMessage: '[class*="用户消息选择器"]',
    aiMessage: '[class*="AI消息选择器"]',
    bubble: '[class*="消息气泡选择器"]',
  },
},
```

## 📝 更新日志

### v0.9.15
- 🐛 **修复精确跳转**: 改进 window.find() 滚动逻辑
  - 先滚动到消息元素，确保句子在可见区域内
  - 再次调整滚动位置，将高亮文本移到视口中央
  - 添加平滑滚动效果
- 🔄 **自动重新搜索**: 滚动加载新内容时自动更新搜索结果
  - 检测到新消息时自动重新执行搜索
  - 无需手动刷新搜索
  - 智能防抖，避免性能问题

### v0.9.14
- 🎯 **精确跳转**：搜索结果现在可以精确跳转到匹配的句子，- 🔍 使用 `window.find()` API 高亮并定位到具体文本
- ✨ 浏览器原生高亮效果，- 🎨 更好的用户体验

### v0.9.13
- 🐛 修复：搜索结果点击无法跳转的问题
- 🎨 优化：大幅减少搜索结果卡片高度（更紧凑）
- 📏 上下文从前后各 2 行改为 1 行
- 💄 减小字体大小和内边距，提升可读性

### v0.9.12
- 🔍 搜索功能重构：按句子搜索，显示上下文
- 📂 搜索栏改为图标展开式，节省空间
- 📋 每个搜索结果显示关键词前后 2 行上下文
- 🎯 点击搜索结果跳转到具体句子位置
- ⌨️ ESC 键：有内容时清空，无内容时收起搜索框

### v0.9.11
- 🔍 **改进搜索功能**：
  - 搜索栏改为图标触发，节省空间
  - 按句子搜索，更精确
  - 显示上下文（前后各 2 行），便于阅读
  - 关键词高亮，一目了然
  - 点击结果跳转到具体句子位置
- ⌨️ ESC 键：第一次清空搜索，第二次收起搜索框

### v0.9.7
- 🔗 底部添加 GitHub 图标链接
- 优化 footer 布局

### v0.9.6
- 🐛 修复：删除无用的刷新按钮（已有自动监听）
- 💡 底部显示 "已显示 X 条 · 滚动页面加载更多"
- 解决虚拟滚动导致的用户困惑

### v0.9.5
- 🐛 修复：去掉假的时间显示
- 现在只显示角色图标和消息摘要，更简洁实用

### v0.9.4
- 🐰 更换简约风格兔子图标
- 修复耳朵被切掉的问题

### v0.9.2
- 🎨 视觉升级：渐变配色、悬停动画、激活高亮
- ✨ 立体感增强：阴影、浮起效果
- 💫 微交互：点击涟漪、平滑过渡

### v0.9.1
- 🌐 新增 Gemini 支持
- ✅ 支持 11 个 AI 平台

### v0.9.0
- 🎉 初始发布
- 支持 10 个主流 AI 平台

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/tutu-claw-ai">Tutu</a> 🐰
</p>
