# React 18 + TypeScript + Redux Toolkit + MUI 项目初始化指南

本文档概述从零开始在当前目录下搭建新项目的主要步骤，并说明每一步的目的与关键配置。

## 1. 环境准备

- 推荐 Node.js `>= 18`，以获得现代语法支持与兼容性。
- 建议使用 `npm` `>= 9` 或 `pnpm`、`yarn` 等新版本包管理器；旧版 npm（如 6.x）在执行 `npm create vite@latest` 时会报错。
- 全局安装 `corepack`（`npm install -g corepack`）可以方便启用 `pnpm`/`yarn`。

## 2. 使用 Vite 初始化项目

在目标目录执行：

```bash
npm create vite@latest . -- --template react-ts
# 若旧版 npm 不支持上述语法，可改为：
npm install -g create-vite
create-vite . --template react-ts
```

目的：Vite 提供极速开发服务器与现代打包配置，React + TS 模板已经内置 TypeScript、ESLint 和基础脚本。

完成后安装依赖：

```bash
npm install
```

## 3. 安装核心依赖

### 3.1 状态管理

```bash
npm install @reduxjs/toolkit react-redux
```

- Redux Toolkit 简化 store 配置，`createAsyncThunk` 能处理异步流程。
- React-Redux 提供 React 绑定。

### 3.2 UI 框架

```bash
npm install @mui/material @mui/icons-material @mui/lab @emotion/react @emotion/styled
```

- MUI 提供组件库与主题能力，`@emotion/*` 是其默认样式引擎。

### 3.3 类型与工具

模板已内置 TypeScript，如需额外类型可按需安装（例如接口返回值的类型定义）。

## 4. 代码规范配置

模板已有基础 ESLint 配置。建议补充：

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

并在项目根目录新增 `.prettierrc` 与 `.prettierignore`，同时在 `.eslintrc` 中启用 `plugin:prettier/recommended`，实现 ESLint 与 Prettier 协同。

常用脚本：

```json
"scripts": {
  "lint": "eslint \"src/**/*.{ts,tsx}\"",
  "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\""
}
```

目的：保持代码风格统一，减少团队沟通成本，即使是个人项目也可避免日后维护困难。

## 5. 单元测试与 Mock

### 5.1 Jest + React Testing Library

```bash
npm install -D jest ts-jest @types/jest @testing-library/react @testing-library/jest-dom
```

初始化 Jest 配置：

```bash
npx ts-jest config:init
```

常见配置项：

- `testEnvironment: "jsdom"`：支持 DOM API。
- `setupFilesAfterEnv` 引入 `@testing-library/jest-dom`。

在 `package.json` 增加：

```json
"scripts": {
  "test": "jest"
}
```

### 5.2 MSW（Mock Service Worker）

```bash
npm install -D msw
```

- 在 `src/mocks/handlers.ts` 定义接口 Mock。
- 在测试环境通过 `setupTests.ts` 启动 `msw` 服务器。
- 可在开发调试时启用浏览器端 Worker，避免依赖真实后端。

目的：隔离外部依赖，提升测试稳定性，便于异步场景的验收。

## 6. Redux Toolkit 基本结构建议

- `src/app/store.ts`：集中创建 store。
- `src/features/*`：按业务模块划分 slice。
- 使用 `createSlice` 定义 reducer 和 action，使用 `createAsyncThunk` 处理异步逻辑。
- 在组件中使用 `useAppDispatch`、`useAppSelector` 封装类型安全的 hooks。

## 7. 目录与别名

- 通过 `tsconfig.json` 的 `paths` 配置常用别名（例如 `@/components/*`）。
- 在 `vite.config.ts` 中同步配置 `resolve.alias`，保持构建与 IDE 解析一致。

## 8. CI/CD 基础

即使是个人项目，也建议建立持续集成流程以自动执行检查：

1. 使用 GitHub Actions。
2. 创建 `.github/workflows/ci.yml`，在 `push`/`pull_request` 时运行：
   - `npm install`
   - `npm run lint`
   - `npm run test -- --runInBand`
   - 可选：如果有构建需求，运行 `npm run build`

目的：自动回归测试、检测格式问题、确保提交质量。

## 9. 进一步扩展

- 结合 `React Router`（`npm install react-router-dom`）构建路由。
- 接入国际化（例如 `react-i18next`）。
- 使用 `msw` + Storybook 构建独立组件体验环境。

## 10. 初始化完成后的检查清单

- [ ] `npm run dev` 可启动开发服务器。
- [ ] `npm run lint` 无报错。
- [ ] `npm run test` 通过基础示例测试。
- [ ] Git 提交规范（如使用 `commitlint`/`husky`）是否需要补充。
- [ ] README 中记录技术栈、脚手架、运行命令。

完成以上步骤，即可基于 React 18 + TypeScript + Redux Toolkit + MUI 构建具有测试与规范保障的前端工程。
