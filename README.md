# WhaleWhisper - 鲸语

<div align="center">

<div align="center">
<p>我们需要一只鲸鱼</p>
<img src="./assets/page.png" width="180">
</div>

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6.svg)](https://www.typescriptlang.org/)

**模块化的数字人/虚拟角色智能体框架**

[特性](#-核心特性) • [开发状态](#-开发状态) • [快速开始](#-快速开始) • [贡献](#-参与贡献)

</div>

---

## 📖 项目简介

WhaleWhisper 是一个**模块化的数字人/虚拟角色框架**，为开发者提供完整的数字人智能体解决方案。

**核心能力：**
- **角色舞台**：支持 Live2D/VRM 模型渲染，可根据对话内容自动调用表情和动作
- **多模态交互**：文本对话 + 语音识别(ASR) + 语音合成(TTS)
- **智能体编排**：LLM 推理 + Agent 工作流 + 工具调用
- **本地记忆**：基于 SQLite 的对话记忆与上下文管理
- **多端支持**：Web 应用 + Tauri 桌面端

## ✨ 核心特性

- **智能表情动作**：基于 LLM 返回内容自动触发角色表情和动作，增强交互真实感
- **统一接入层**：兼容 OpenAI、Dify、FastGPT、Coze 等多种 LLM 服务
- **灵活配置**：YAML 配置驱动，快速切换不同 AI 能力提供商
- **实时通信**：支持 WebSocket 和 Server-Sent Events (SSE)
- **记忆系统**：自动保存对话历史，支持长期记忆与摘要
- **可扩展架构**：模块化设计，易于定制和扩展

## 🎯 适用场景

- 数字人聊天助手、虚拟主播原型开发
- 集成多家 AI 服务商能力的统一调度
- 需要对话记忆和上下文管理的对话系统
- 虚拟角色交互体验探索

## 🏗️ 技术栈

- **后端**：FastAPI, SQLAlchemy, WebSocket/SSE
- **前端**：Vue 3, TypeScript, Tauri, Pixi.js
- **AI**：兼容 OpenAI/Dify/Coze/FastGPT 等协议

## 🚧 开发状态

本项目正在积极开发中，部分功能可能尚未完全稳定：

- ✅ **对话系统**：基本可用
- ✅ **记忆系统**：完整实现
- ✅ **智能表情动作**：Live2D 自动表情动作控制已实现
- ⚠️ **Live2D/VRM 渲染**：部分功能调试中
- ⚠️ **AI 服务商集成**：部分提供商还在测试
- 🔨 **桌面端**：持续优化中

欢迎提交 Issue 反馈问题或建议！

## 🚀 快速开始

### 前置要求

- Python 3.8+
- Node.js 16+
- pnpm 8+

### 1️⃣ 启动后端

```bash
cd backend

# 方式一：使用 uv（推荐）
uv venv
uv pip install -e ".[dev]"
uv run uvicorn app.main:app --reload --port 8090

# 方式二：使用传统 venv
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8090
```

**验证服务：**
- 健康检查：http://localhost:8090/health
- WebSocket：ws://localhost:8090/ws
- API 端点：`/api/llm`、`/api/asr`、`/api/tts`、`/api/agent`、`/api/memory`、`/api/providers`

### 2️⃣ 启动前端

```bash
cd frontend

# 安装依赖
pnpm install

# 启动 Web 开发服务器
pnpm --filter @whalewhisper/web dev

# 构建桌面应用（可选，需要 Rust/Tauri 工具链）
# 使用 scripts/build-desktop.ps1
```

访问 http://localhost:5173 即可使用。

## ⚙️ 配置说明

### Engine 配置

编辑 `backend/config/engines.yaml` 配置 LLM/ASR/TTS 等能力提供商：

```yaml
llm:
  default: openai
  providers:
    openai:
      api_key: "your-api-key"
      model: "gpt-4"
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENGINE_CONFIG_PATH` | Engine 配置文件路径 | `backend/config/engines.yaml` |
| `WS_AUTH_TOKEN` | WebSocket 鉴权令牌（可选） | - |
| `DATABASE_URL` | 数据库连接字符串 | SQLite 本地文件 |

## 📁 项目结构

```
WhaleWhisper/
├── backend/          # FastAPI 后端服务
│   ├── app/         # 应用核心代码
│   ├── config/      # 配置文件
│   └── tests/       # 单元测试
├── frontend/         # 前端工作空间（pnpm workspace）
│   ├── web/         # Web 应用
│   ├── desktop/     # Tauri 桌面应用
│   └── packages/    # 共享组件库
├── docs/            # 项目文档
├── assets/          # 静态资源（模型、素材）
└── scripts/         # 构建与部署脚本
```

## 🤝 参与贡献

我们欢迎所有形式的贡献！无论是报告问题、提出建议还是提交代码。

### 如何贡献

1. **报告问题**：在 [Issues](https://github.com/datawhalechina/WhaleWhisper/issues) 中描述问题、复现步骤和日志
2. **提交 PR**：
   - Fork 本仓库
   - 创建特性分支：`git checkout -b feature/your-feature`
   - 提交改动：`git commit -m 'Add some feature'`
   - 推送分支：`git push origin feature/your-feature`
   - 提交 Pull Request

### 贡献指南

- PR 请保持改动聚焦，避免混合多个功能
- 提交前请运行测试：`pnpm build` / `python -m compileall`
- 遵循现有代码风格和项目规范
- 如果 PR 长时间无回复，可联系 [Datawhale 保姆团队](https://github.com/datawhalechina/DOPMC/blob/main/OP.md)

## 🌐 关注我们

<div align="center">
<p>扫描下方二维码关注公众号：Datawhale</p>
<img src="https://raw.githubusercontent.com/datawhalechina/pumpkin-book/master/res/qrcode.jpeg" width="180" height="180">
</div>

## 📄 开源协议

本项目采用 [Apache License 2.0](LICENSE) 进行许可。

## 🙏 致谢

感谢以下项目的启发和参考：
- [airi](https://github.com/moeru-ai/airi) - 数字人交互框架

