/**
 * Web界面管理器
 * 提供HTTP API和Web界面，用于控制问卷作答系统
 */

import express from 'express';
import cors from 'cors';
import { QuestionnaireSystem } from '../core/QuestionnaireSystem';
import { StartAnsweringRequest, StartAnsweringResponse, SessionStatusResponse } from '../types';

export class WebInterface {
  private app: express.Application;
  private server: any;
  private port: number;
  private questionnaireSystem: QuestionnaireSystem;

  constructor(questionnaireSystem: QuestionnaireSystem) {
    this.app = express();
    this.port = parseInt(process.env.WEB_PORT || '5004');
    this.questionnaireSystem = questionnaireSystem;
    
    this.setupMiddleware();
    this.setupRoutes();
    
    console.log('🌐 Web界面管理器初始化完成');
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static('public'));
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        system: this.questionnaireSystem.getSystemStatus()
      });
    });

    // 获取系统状态
    this.app.get('/api/status', (req, res) => {
      try {
        const status = this.questionnaireSystem.getSystemStatus();
        res.json({ success: true, data: status });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 启动智能作答
    this.app.post('/api/start-answering', async (req, res) => {
      try {
        const request: StartAnsweringRequest = req.body;
        
        if (!request.url) {
          res.status(400).json({
            success: false,
            error: '缺少问卷URL'
          } as StartAnsweringResponse);
          return;
        }

        console.log(`🎯 收到作答请求: ${request.url}`);

        const sessionId = await this.questionnaireSystem.startAnswering({
          url: request.url,
          mode: request.config?.mode || 'auto',
          digitalPersonId: request.config?.digitalPersonId,
          proxyConfig: request.config?.proxyConfig,
          browserConfig: request.config?.browserConfig,
          timeout: request.config?.timeout,
          retryLimit: request.config?.retryLimit
        });

        res.json({
          success: true,
          sessionId,
          message: '智能作答已启动'
        } as StartAnsweringResponse);

      } catch (error) {
        console.error('❌ 启动作答失败:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        } as StartAnsweringResponse);
      }
    });

    // 获取会话状态
    this.app.get('/api/session/:sessionId/status', (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const status = this.questionnaireSystem.getSessionStatus(sessionId);
        res.json(status);
      } catch (error) {
        res.status(500).json({
          sessionId: req.params.sessionId,
          status: 'failed',
          progress: { total: 0, answered: 0 },
          error: error instanceof Error ? error.message : String(error)
        } as SessionStatusResponse);
      }
    });

    // 暂停会话
    this.app.post('/api/session/:sessionId/pause', async (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const success = await this.questionnaireSystem.pauseSession(sessionId);
        
        res.json({
          success,
          message: success ? '会话已暂停' : '暂停失败'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 恢复会话
    this.app.post('/api/session/:sessionId/resume', async (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const success = await this.questionnaireSystem.resumeSession(sessionId);
        
        res.json({
          success,
          message: success ? '会话已恢复' : '恢复失败'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 停止会话
    this.app.post('/api/session/:sessionId/stop', async (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const success = await this.questionnaireSystem.stopSession(sessionId);
        
        res.json({
          success,
          message: success ? '会话已停止' : '停止失败'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 主页面
    this.app.get('/', (req, res) => {
      res.send(this.generateIndexHTML());
    });

    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: '接口不存在'
      });
    });

    // 错误处理
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Web接口错误:', err);
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      });
    });
  }

  /**
   * 生成主页面HTML
   */
  private generateIndexHTML(): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能问卷作答系统</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 90%;
            max-width: 600px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .title {
            color: #333;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            color: #666;
            font-size: 1rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }
        
        .input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        
        .input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
            width: 100%;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .status {
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 6px;
            display: none;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .features {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #e1e5e9;
        }
        
        .feature-list {
            list-style: none;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            color: #666;
        }
        
        .feature-icon {
            margin-right: 0.5rem;
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🎯 智能问卷作答系统</h1>
            <p class="subtitle">基于Stagehand技术栈的高性能AI作答解决方案</p>
        </div>
        
        <form id="answeringForm">
            <div class="form-group">
                <label class="label" for="url">问卷链接</label>
                <input 
                    type="url" 
                    id="url" 
                    class="input" 
                    placeholder="请输入问卷的完整URL地址"
                    required
                />
            </div>
            
            <button type="submit" class="button" id="submitButton">
                🚀 开始智能作答
            </button>
        </form>
        
        <div id="status" class="status"></div>
        
        <div class="features">
            <ul class="feature-list">
                <li class="feature-item">
                    <span class="feature-icon">🤖</span>
                    <span>AI智能识别问题类型</span>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">👤</span>
                    <span>数字人档案系统</span>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">🌐</span>
                    <span>青果代理 + AdsPower</span>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">🧠</span>
                    <span>智能记忆缓存</span>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">⚡</span>
                    <span>高性能作答引擎</span>
                </li>
                <li class="feature-item">
                    <span class="feature-icon">📊</span>
                    <span>实时进度监控</span>
                </li>
            </ul>
        </div>
    </div>
    
    <script>
        const form = document.getElementById('answeringForm');
        const submitButton = document.getElementById('submitButton');
        const statusDiv = document.getElementById('status');
        
        function showStatus(message, type = 'info') {
            statusDiv.textContent = message;
            statusDiv.className = \`status \${type}\`;
            statusDiv.style.display = 'block';
        }
        
        function hideStatus() {
            statusDiv.style.display = 'none';
        }
        
        async function checkSessionStatus(sessionId) {
            try {
                const response = await fetch(\`/api/session/\${sessionId}/status\`);
                const status = await response.json();
                
                if (status.status === 'completed') {
                    showStatus(\`✅ 作答完成！成功回答 \${status.result?.answeredQuestions || 0} 个问题\`, 'success');
                    submitButton.disabled = false;
                    submitButton.textContent = '🚀 开始智能作答';
                    return false; // 停止轮询
                } else if (status.status === 'failed') {
                    showStatus(\`❌ 作答失败: \${status.error || '未知错误'}\`, 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = '🚀 开始智能作答';
                    return false; // 停止轮询
                } else if (status.status === 'running') {
                    const progress = status.progress;
                    showStatus(\`📝 正在作答... \${progress.answered}/\${progress.total} (\${progress.current || ''})\`, 'info');
                    return true; // 继续轮询
                } else {
                    showStatus(\`⏳ 状态: \${status.status}\`, 'info');
                    return true; // 继续轮询
                }
            } catch (error) {
                showStatus(\`❌ 获取状态失败: \${error.message}\`, 'error');
                submitButton.disabled = false;
                submitButton.textContent = '🚀 开始智能作答';
                return false; // 停止轮询
            }
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = document.getElementById('url').value;
            if (!url) {
                showStatus('请输入问卷URL', 'error');
                return;
            }
            
            submitButton.disabled = true;
            submitButton.textContent = '🔄 启动中...';
            showStatus('正在启动智能作答系统...', 'info');
            
            try {
                const response = await fetch('/api/start-answering', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus(\`✅ 作答会话已启动: \${result.sessionId}\`, 'success');
                    
                    // 开始轮询状态
                    const pollInterval = setInterval(async () => {
                        const shouldContinue = await checkSessionStatus(result.sessionId);
                        if (!shouldContinue) {
                            clearInterval(pollInterval);
                        }
                    }, 2000);
                    
                } else {
                    showStatus(\`❌ 启动失败: \${result.error}\`, 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = '🚀 开始智能作答';
                }
                
            } catch (error) {
                showStatus(\`❌ 请求失败: \${error.message}\`, 'error');
                submitButton.disabled = false;
                submitButton.textContent = '🚀 开始智能作答';
            }
        });
        
        // 页面加载时获取系统状态
        window.addEventListener('load', async () => {
            try {
                const response = await fetch('/api/health');
                const health = await response.json();
                console.log('系统状态:', health);
            } catch (error) {
                console.warn('获取系统状态失败:', error);
            }
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * 启动Web服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🌐 Web服务器已启动`);
          console.log(`📡 访问地址: http://localhost:${this.port}`);
          console.log(`🎯 API文档: http://localhost:${this.port}/api/health`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ 端口 ${this.port} 已被占用`);
            reject(new Error(`端口 ${this.port} 已被占用`));
          } else {
            console.error('❌ Web服务器启动失败:', error);
            reject(error);
          }
        });

      } catch (error) {
        console.error('❌ Web服务器启动失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 停止Web服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error: any) => {
          if (error) {
            console.error('❌ Web服务器停止失败:', error);
            reject(error);
          } else {
            console.log('✅ Web服务器已停止');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 获取服务器状态
   */
  getServerInfo(): any {
    return {
      port: this.port,
      isRunning: !!this.server,
      urls: {
        main: `http://localhost:${this.port}`,
        health: `http://localhost:${this.port}/api/health`,
        status: `http://localhost:${this.port}/api/status`
      }
    };
  }
}