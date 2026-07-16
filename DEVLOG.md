# 变更记录 / 操作日志（DEVLOG）

本文件用于**留存每次迭代、修改的操作日志**，按时间倒序记录具体改了什么、涉及哪些模块、为什么改。

与其它文档的分工：

- `CHANGELOG.md`：版本级发布记录，只保留用户可感知的版本归纳（`[新增]/[调整]/[修复]/[优化]`）。
- `DEVLOG.md`（本文件）：更细粒度的操作流水，记录单次改动的范围、动机、影响，便于回溯与排查。
- `docs/content/docs/progress/todo.mdx`：待办事项。
- `docs/content/docs/progress/pending-test.mdx`：已实现、待用户测试确认的变更。

## 记录规范

- 每条记录按 `## YYYY-MM-DD` 分日期分组，新的日期置于最上方（时间倒序）。
- 单条改动用 `- [类别] 一句话说明`，类别沿用 `[新增] / [调整] / [修复] / [优化]`，需要时补 `[文档]`。
- 说明后可选附 `范围:` `动机:` `影响:` 子项，用于交代改动的文件/模块、原因和潜在影响。
- 只记有实质意义的改动；纯格式化、无影响的琐碎改动可不记。
- 涉及本地存储结构、接口格式、Agent/MCP 行为等对外可感知变化的改动应重点记录。

## 项目结构速览

面向图片创作的开源工作台，纯前端直连 OpenAI 兼容接口，配套本地 Agent 与 Codex 插件。

| 目录 | 说明 |
| --- | --- |
| `web/` | 前端主应用（Vite + React + React Router + TS + Ant Design + Tailwind + Zustand） |
| `web/src/pages/` | 路由页面：`home` `canvas` `image` `video` `assets` `prompts` `config` 等 |
| `web/src/components/` | 组件：`canvas` `agent` `layout` `prompts` `ui` 等 |
| `web/src/stores/` | 全局状态，`stores/canvas/` 为画布状态 |
| `web/src/services/api/` | 外部服务请求（`image` `video` `audio` 等），浏览器直连 |
| `web/src/lib/` | 工具函数，`lib/canvas/` 画布工具、`lib/agent/` Agent 相关 |
| `canvas-agent/` | 本地 Canvas Agent，通过 MCP 连接 Codex / Claude Code 操作画布 |
| `plugins/infinite-canvas/` | Codex app 插件，注册 MCP 并拉起本地 Agent |
| `docs/` | 文档站点（Next.js + Fumadocs），内容在 `docs/content/docs/` |
| `.github/workflows/` | CI 与 GitHub Pages 发布流程 |
| 根目录 | `README.md` `AGENTS.md`（AI 开发约束）`CHANGELOG.md` `VERSION` `Dockerfile` 等 |

当前版本：见根目录 `VERSION`。开发约束详见 `AGENTS.md`。

## 操作日志

## 2026-07-16

- [修复] 修复画布视频节点选择 Kling 模型版本后请求体 `model_name` 仍为默认值(始终 kling-v1)的问题。
  - 范围: `web/src/pages/canvas/project.tsx` 的 `buildGenerationConfig`(生成用 config 构建器)补读 `klingVersion`/`klingVoice`；视频节点 3 处 metadata 写入(初始 loading、生成成功、重试成功)持久化这两个字段。
  - 动机: 画布有三个独立的 config 构建器(两个面板显示用 `buildNodeConfig` + 一个生成用 `buildGenerationConfig`)，新增的 `klingVersion` 只补了面板侧，生成侧漏读，导致 `...config` 兜底成全局默认 kling-v1。
  - 影响: 画布节点选择的 Kling 版本/音色现在能正确进入生成请求；重试时版本不再丢失。链路 `node.metadata.klingVersion → buildGenerationConfig → createKlingTask → payload.model_name` 打通。
- [调整] 扩展 Kling 模型版本与能力矩阵，UI 按版本动态展示合法选项，请求按能力构造 payload。
  - 范围: `kling-video.ts`(新增 `kling-v2-5-turbo`/`kling-v2-6`/`kling-v3` 及能力表 `KLING_CAPABILITIES` 与 `klingCapability`/`klingAudioAvailable`/`klingVoiceAvailable`/`klingHasModeSelector` 等函数)、`use-config-store.ts`(新增 `klingVoice` 字段)、`video-settings-panel.tsx`(能力驱动渲染 + 时长滑块子组件 `KlingDurationGroup`)、`video.ts`(payload 按能力带 `mode`/`generate_audio`/`generate_voice`)、`types/canvas.ts`(节点 metadata 加 `klingVersion`/`klingVoice`)、两个画布面板的 `buildNodeConfig` 与 `canvas-video-settings-popover.tsx` 摘要。
  - 动机: 各 Kling 版本对模式(std/pro)、时长(固定 5/10s vs v3 的 3–15s 区间)、音频、音色的支持不同，需按版本精确展示与发送，避免发出不支持的参数。
  - 影响: 仅单一模式的版本(v2-master 仅 std、v2-1-master 无模式)隐藏模式选择器；音频仅在支持的版本+模式出现，音色仅 v2-6 pro+开音频时出现；v3 用滑块选 3–15s。待确认: 音频/音色接口字段名暂用 `generate_audio`/`generate_voice`，需与中转站文档核对。
  - 关联: 修复 Kling 版本选择的 UI 交互(把 antd `Select` 改为 `OptionPill`)与画布节点 metadata 读回。
- [新增] 新增 Docker 开发环境配置，支持容器内热重载，代码改动自动同步到浏览器。
  - 范围: 新增 `docker-compose.dev.yml`；修改 `web/vite.config.ts` 添加环境变量控制的轮询开关。
  - 动机: 默认 `docker-compose.yml` 拉远程预构建镜像，本地改动不生效；生产 Dockerfile 走静态构建，不适合开发调试。
  - 影响: 开发时可用 `docker compose -f docker-compose.dev.yml up -d` 启动带 HMR 的容器，挂载源码 + node_modules 匿名卷保护依赖；Vite 轮询开关(`VITE_DEV_POLLING`)仅在容器内生效，不影响本地 `bun run dev` 和生产构建。
  - 注意: Windows/Mac 下 Docker bind mount 收不到原生文件事件，必须开启轮询(`usePolling: true`)才能触发 HMR。
- [修复] 修复 Docker 镜像源配置，移除已失效的网易镜像站(`hub-mirror.c.163.com`)避免所有 docker.io 镜像拉取失败。
  - 范围: `~/.docker/daemon.json` 的 `registry-mirrors` 配置。
  - 动机: 网易镜像站 DNS 解析失败导致 `oven/bun:1.3.13` 等镜像无法拉取，阻塞开发容器启动。
  - 影响: 删除失效源后，Docker 会直接走官方源或备用镜像源(如 `mirror.baidubce.com`)，需重启 Docker Desktop 生效。
- [修复] 修复画布连线新建节点时对 `CanvasNodeType.Group` 的无效比较（该分支参数类型不含 Group，比较恒为真的死代码）。
  - 范围: `web/src/pages/canvas/project.tsx` 连线创建节点回调。
  - 动机: TS 报 `error TS2367`（类型无重叠的无意义比较），属既有问题，非本次 Kling 改动引入。
  - 影响: 移除冗余判断，行为不变，类型检查恢复通过。
- [调整] Kling 调用格式适配中转站：改为单 API Key 鉴权，固定 `/kling/v1/videos/{text2video|image2video}` 路径，并新增模型版本选择。
  - 范围: `video.ts`(去 JWT、改 Bearer key、修正路径、version 作 model_name)、`use-config-store.ts`(新增 `klingVersion` 字段、去掉 Kling 的 secretKey 校验)、`app-config-modal.tsx`(移除 Secret Key 字段、改回 API Key 标签)、`kling-video.ts`(新增 `klingVersionOptions` 与 `normalizeKlingVersion`)、`video-settings-panel.tsx`(新增模型版本下拉)。
  - 动机: 实际接入的是中转站(如 `api.vectorengine.ai`)，中转站已封装 JWT，只需单 Key；且需要在界面直接选 Kling 模型版本(V1 / V1.5 / V1.6 / V2 Master / V2.1 / V2.1 Master)。
  - 影响: Kling 渠道只填一个 API Key；模型列表里的模型名仅用于路由，真实版本由视频设置的「模型版本」下拉决定并作为 `model_name` 发送；官方直连双密钥 JWT 方式不再支持。
- [新增] Kling 调用格式完整实现(视频生成)，支持文生视频与首尾帧图生视频任务。
  - 范围: `use-config-store.ts`(类型与默认 baseUrl)、`app-config-modal.tsx`(UI 渠道配置)、`video.ts`(建任务与轮询)、`kling-video.ts`(参数归一化)、`video-settings-panel.tsx`(Kling 专用设置面板)、`image.ts`/`audio.ts`(拦截非视频模态)、`video/index.tsx`(历史记录展示)。
  - 动机: 用户需要接入 Kling 官方 API，现有 OpenAI 和 Gemini 格式不覆盖 Kling 的双密钥 JWT 鉴权和专有接口规范。
  - 影响: 渠道配置新增 Kling 调用格式选项，需填 Access Key + Secret Key；视频设置面板根据渠道自动切换为 Kling 模式(标准/专业、16:9/9:16/1:1、5s/10s)；图片/音频/文本模型选 Kling 渠道时报错提示仅支持视频。
- [文档] 新增 `DEVLOG.md` 变更记录 / 操作日志文档，用于留存后续迭代与修改的操作流水。
  - 范围: 项目根目录，新增文件；补充项目结构速览与记录规范。
  - 动机: `CHANGELOG.md` 只做版本级归纳，缺少细粒度的单次改动流水，不便回溯与排查。
  - 影响: 仅新增文档，不涉及代码与运行行为。
