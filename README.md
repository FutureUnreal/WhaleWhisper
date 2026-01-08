# WhaleWhisper

WhaleWhisper 是一个**数字人/虚拟角色框架**：提供可复用的“角色舞台（Live2D/VRM）+ 多模态交互（文本/语音）+ 智能体编排（LLM/Agent/工具调用）+ 本地记忆（SQLite）”基础能力，并提供 Web 与桌面端（Tauri）作为参考实现。

## 适用场景
- 想搭建/二次开发数字人智能体产品（聊天/沉浸式舞台/桌面挂件）
- 需要把不同厂商/本地能力（OpenAI-compatible、Dify/FastGPT/Coze 等）用统一方式接入与切换
- 希望在本地保存对话摘要与记忆（SQLite）并用于上下文补全（可选）

## 文档导航
- 架构：`docs/ARCHITECTURE.md`
- 配置：`docs/CONFIG.md`
- 协议：`docs/PROTOCOL.md`
- 路线图：`docs/ROADMAP.md`

## 快速开始

### 1) 启动后端（FastAPI）
在 `backend/` 内：

- 使用 uv（推荐）
  - `uv venv`
  - `uv pip install -e ".[dev]"`
  - `uv run uvicorn app.main:app --reload --port 8090`
- 或使用 venv + pip
  - `python -m venv .venv`
  - `.venv\\Scripts\\activate`
  - `pip install -e ".[dev]"`
  - `uvicorn app.main:app --reload --port 8090`

后端健康检查：`http://localhost:8090/health`  
WebSocket：`ws://localhost:8090/ws`  
能力接口：`/api/llm`、`/api/asr`、`/api/tts`、`/api/agent`、`/api/memory`、`/api/providers`

### 2) 启动前端（Web）
在 `frontend/` 内：
- `pnpm install`
- `pnpm --filter @whalewhisper/web dev`

如需桌面端（Tauri）构建入口：`scripts/build-desktop.ps1`（需要 Rust/Tauri 工具链）。

## 配置要点
- 后端 engine 配置：`ENGINE_CONFIG_PATH`（默认 `backend/config/engines.yaml`），详见 `docs/CONFIG.md`
- 可选鉴权：`WS_AUTH_TOKEN`（启用后客户端需先做 module.authenticate）
- 本地记忆：默认 SQLite，相关环境变量见 `backend/README.md`

## 仓库结构
- `backend/`：FastAPI 编排服务（HTTP + WS + SSE 能力端点）
- `frontend/`：pnpm workspace（web + desktop renderer + packages）
- `docs/`：架构/协议/配置/路线图
- `assets/`：静态资源（模型/素材等）

## 参与贡献
- 建议先开 Issue 描述问题/需求（复现步骤、日志、期望行为）
- PR 请尽量保持改动聚焦，并附上本地验证方式（如 `pnpm build` / `python -m compileall`）

## 参与贡献（组织说明）

- 如果你发现了一些问题，可以提Issue进行反馈，如果提完没有人回复你可以联系[保姆团队](https://github.com/datawhalechina/DOPMC/blob/main/OP.md)的同学进行反馈跟进~
- 如果你想参与贡献本项目，可以提Pull request，如果提完没有人回复你可以联系[保姆团队](https://github.com/datawhalechina/DOPMC/blob/main/OP.md)的同学进行反馈跟进~
- 如果你对 Datawhale 很感兴趣并想要发起一个新的项目，请按照[Datawhale开源项目指南](https://github.com/datawhalechina/DOPMC/blob/main/GUIDE.md)进行操作即可~

## 关注我们

<div align=center>
<p>扫描下方二维码关注公众号：Datawhale</p>
<img src="https://raw.githubusercontent.com/datawhalechina/pumpkin-book/master/res/qrcode.jpeg" width = "180" height = "180">
</div>

## LICENSE

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

本项目采用 Apache License 2.0 进行许可，详见 `LICENSE`。

## 致谢
- https://github.com/moeru-ai/airi
