# 🎯 智能问卷作答系统

基于 Stagehand 技术栈的智能问卷自动作答系统，支持数字人档案、代理管理和完整生命周期管理。

## ✨ 核心特性

- 🤖 **智能作答**: 基于 Stagehand 的高精度页面理解和操作
- 👤 **数字人档案**: 5个内置高质量数字人，支持外部API扩展
- 🌐 **代理管理**: 青果隧道代理，多格式认证，自动IP获取
- 🖥️ **AdsPower集成**: 800x600桌面端浏览器，完美指纹配置
- 📊 **生命周期管理**: 完整的创建-执行-清理流程
- 🎛️ **Web管理界面**: 直观的操作界面和实时状态监控

## 🚀 快速开始

### 1. 环境配置

```bash
# 复制配置文件
cp env.example .env

# 编辑配置文件，填入真实的API密钥
nano .env
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动系统

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

### 4. 访问系统

打开浏览器访问: http://localhost:5004

## 📁 项目结构

```
questionnaire-system/
├── src/
│   ├── core/           # 核心系统逻辑
│   ├── types/          # TypeScript 类型定义
│   ├── proxy/          # 青果代理管理
│   ├── browser/        # AdsPower 浏览器管理
│   ├── answering/      # 智能作答引擎
│   ├── digital-person/ # 数字人档案管理
│   ├── memory/         # 记忆和缓存管理
│   ├── lifecycle/      # 生命周期管理
│   └── web/           # Web 界面
├── data/              # 运行时数据
├── dist/              # 编译输出
└── docs/              # 文档
```

## 🛡️ 安全说明

- 所有 API 密钥通过环境变量管理
- `.env` 文件已在 `.gitignore` 中忽略
- 请勿将真实密钥提交到版本控制

## 📖 详细文档

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解部署指南和安全最佳实践。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License