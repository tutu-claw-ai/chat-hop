# 🐰 ChatHop - 聊天兔子

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue)](https://chromewebstore.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<p align="center">
  <img src="icons/icon128.png" alt="ChatHop Logo" width="128" height="128">
</p>

<p align="center">
  <strong>ChatHop · 聊天兔子</strong><br>
  <em>在 AI 对话中自由跳跃 🐰</em>
</p>

为 AI 对话网页提供侧边栏时间线导航，快速跳转到长对话中的任何消息。

---

## 🙏 致谢

本项目灵感来源于 [AI Chat Timeline](https://chromewebstore.google.com/detail/ai-chat-timeline-chatgpt/ohkakjacipbjpfcfimhhdfpolknbkmhh) - 一个为 ChatGPT 和 Gemini 提供时间线导航的优秀扩展。感谢原作者的创意启发！

---

## ✨ 功能特性

- 🗺️ **对话导航** - 侧边栏显示完整对话时间线，一目了然
- ⚡ **快速跳转** - 点击时间线项目，秒速定位到对应消息
- 🎯 **智能摘要** - 自动提取消息摘要，快速了解内容
- 🌙 **深色模式** - 自动适配系统深色模式
- 🌐 **多平台支持** - 支持千问、元宝等主流 AI 平台
- 🔒 **隐私优先** - 所有数据本地处理，不上传任何信息

## 🌐 支持的平台

| 平台 | 状态 | 网址 |
|------|------|------|
| 千问 | ✅ 已支持 | [qianwen.com](https://www.qianwen.com/chat/) |
| 元宝 | ✅ 已支持 | [yuanbao.tencent.com](https://yuanbao.tencent.com/chat/) |
| 豆包 | ✅ 已支持 | [doubao.com](https://www.doubao.com/chat/) |
| Kimi | ✅ 已支持 | [kimi.com](https://www.kimi.com/chat/) |
| DeepSeek | ✅ 已支持 | [chat.deepseek.com](https://chat.deepseek.com/) |
| 文心一言 | ✅ 已支持 | [yiyan.baidu.com](https://yiyan.baidu.com/chat/) |
| MiniMax | ✅ 已支持 | [agent.minimaxi.com](https://agent.minimaxi.com/chat) |

## 📦 安装

### 方式一：Chrome Web Store（推荐）

*即将上线*

### 方式二：手动安装（开发者模式）

1. 下载最新的 [Release](https://github.com/tutu-claw-ai/chat-hop/releases) 或克隆此仓库
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择扩展文件夹

## 📖 使用方法

1. 打开支持的 AI 平台（如 [千问](https://www.qianwen.com/chat/) 或 [元宝](https://yuanbao.tencent.com/chat/)）
2. 开始与 AI 对话
3. 点击页面右侧的紫色圆形按钮 🐰
4. 在弹出的侧边栏中查看对话时间线
5. 点击任意消息，页面自动滚动到对应位置

## 🎨 截图

*即将添加*

## 🔧 技术栈

- Vanilla JavaScript（无框架依赖）
- CSS3（支持深色模式）
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

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

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

## 📝 开发计划

- [x] 支持 DeepSeek
- [x] 支持 Kimi
- [x] 支持豆包
- [x] 支持文心一言
- [ ] 添加搜索功能
- [ ] 支持导出对话
- [ ] 添加快捷键支持
- [ ] 多语言支持

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/tutu-claw-ai">Tutu</a> 🐰
</p>
