#!/bin/bash

# ============================================
# 🎯 环境配置脚本 - 一键设置API密钥
# ============================================

echo "🔧 正在创建 .env 文件..."

# 创建 .env 文件
cat > .env << 'EOF'
# ============================================
# 🎯 智能问卷作答系统 - 实际环境配置
# ⚠️ 此文件包含敏感信息，已被.gitignore保护
# ============================================

# 🌐 小社会系统API配置
XIAOSHE_API_URL=http://localhost:5001

# 🔑 青果代理配置
QINGUO_BUSINESS_ID=xnxmcc4a
QINGUO_AUTH_KEY=A942CE1E
QINGUO_AUTH_PWD=B9FCD013057A
QINGUO_TUNNEL_HOST=tun-szbhry.qg.net
QINGUO_TUNNEL_PORT=17790

# 🖥️ AdsPower浏览器管理配置
ADSPOWER_API_URL=http://local.adspower.net:50325/api/v1
ADSPOWER_SERIAL_NUMBER=cd606f2e

# 🤖 OpenAI配置
OPENAI_API_KEY=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
OPENAI_MODEL=gpt-4o

# 🔮 Gemini配置（运行时降级API）
GEMINI_API_KEY=AIzaSyAfmaTObVEiq6R_c62T4jeEpyf6yp4WCP8
GOOGLE_API_KEY=AIzaSyAfmaTObVEiq6R_c62T4jeEpyf6yp4WCP8
GEMINI_MODEL=gemini-2.0-flash

# 🌐 Web服务器配置
WEB_PORT=5004

# 📋 系统配置
DEFAULT_DIGITAL_PERSON_ID=student_tech

# 🎯 作答配置
MAX_RETRY_ATTEMPTS=3
ANSWER_TIMEOUT=30000
PAGE_LOAD_TIMEOUT=60000

# 🔧 调试配置
DEBUG_MODE=false
LOG_LEVEL=info
ENABLE_MEMORY_CACHE=true
ENABLE_PROXY_CACHE=true
EOF

echo "✅ .env 文件创建成功！"
echo "🔒 API密钥已安全配置"
echo "🚀 现在可以启动服务测试运行时降级功能了"
echo ""
echo "📋 配置的API:"
echo "   🤖 OpenAI: ✅ (主要API)"
echo "   🔮 Gemini: ✅ (降级API)"
echo ""
echo "🎯 下一步: npm run dev"