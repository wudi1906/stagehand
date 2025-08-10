/**
 * AdsPower浏览器管理器
 * 负责管理AdsPower浏览器实例，参考web-ui项目的AdsPowerBrowserManager
 */

import axios from 'axios';
import { ProxyInfo } from '../proxy/QinguoProxyManager';

export interface BrowserInfo {
  profileId: string;
  debugPort: number;
  name: string;
  isActive: boolean;
  ws?: {
    puppeteer?: string;
    selenium?: string;
  };
}

export class AdsPowerManager {
  private baseUrl: string;
  private serialNumber: string; // 改名为serialNumber以匹配AdsPower术语
  private activeBrowsers: Map<string, BrowserInfo> = new Map();
  private profileNameCounter: number = 0;

  constructor(baseUrl?: string) {
    // 支持多种AdsPower接口地址配置，优先级从高到低
    this.baseUrl = baseUrl || 
                   process.env.ADSPOWER_API_URL || 
                   'http://127.0.0.1:50325/api/v1';  // 更新为新的默认地址
                   
    this.serialNumber = process.env.ADSPOWER_API_KEY || 'cd606f2e6e4558c9c9f2980e7017b8e9';
    
    console.log(`🌟 AdsPower管理器初始化，API地址: ${this.baseUrl}`);
    console.log(`🔑 Serial Number: ${this.serialNumber.substring(0, 8)}...`);
  }

  /**
   * 初始化管理器 - 自动检测可用的AdsPower接口
   */
  async initialize(): Promise<void> {
    console.log('🌟 初始化AdsPower浏览器管理器...');
    console.log(`🔍 当前API地址: ${this.baseUrl}`);
    console.log(`🔑 Serial Number: ${this.serialNumber.substring(0, 8)}...`);

    // 智能接口检测：自动尝试多个可能的接口地址
    const detectedUrl = await this.autoDetectAdsPowerInterface();
    if (detectedUrl) {
      this.baseUrl = detectedUrl;
      console.log(`✅ 自动检测到可用接口: ${this.baseUrl}`);
    }

    // 智能高性能模式：尝试连接AdsPower
    try {
      await this.testConnection();
      await this.cleanupOrphanedBrowsers();
      console.log('✅ AdsPower高性能模式已启用 - 代理浏览器可用');
    } catch (error) {
      console.warn('⚠️ AdsPower连接失败，将以降级模式运行:', error instanceof Error ? error.message : String(error));
      console.log('💡 AdsPower连接配置待优化，将使用Stagehand原生高性能模式');
      console.log('📍 提示：确保AdsPower软件已启动，API地址正确');
      // 不抛出错误，允许系统使用Stagehand原生模式继续运行
    }
  }

  /**
   * 自动检测可用的AdsPower接口地址
   */
  private async autoDetectAdsPowerInterface(): Promise<string | null> {
    console.log('🔍 开始自动检测AdsPower接口地址...');
    
    // 可能的接口地址列表（按优先级排序）
    const possibleUrls = [
      'http://127.0.0.1:50325/api/v1',           // 新版本默认地址
      'http://localhost:50325/api/v1',           // 本地回环地址
      'http://local.adspower.net:50325/api/v1',  // 旧版本域名地址
      'http://local.adspower.com:50325/api/v1',  // 可能的域名变体
      'http://192.168.1.100:50325/api/v1',       // 局域网地址示例（实际应动态获取）
    ];
    
    // 如果有环境变量指定，优先使用
    if (process.env.ADSPOWER_API_URL) {
      possibleUrls.unshift(process.env.ADSPOWER_API_URL);
    }
    
    for (const url of possibleUrls) {
      console.log(`🔍 测试接口: ${url}`);
      
      try {
        const response = await axios.get(`${url}/browser/start?user_id=connection_test`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200) {
          console.log(`✅ 接口检测成功: ${url}`);
          return url;
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`❌ 接口检测失败: ${url} (${errorMsg})`);
        
        // 如果是404或API响应错误，说明服务是运行的，只是endpoint不对
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log(`💡 服务运行中但API路径可能有变化: ${url}`);
        }
      }
    }
    
    console.log('⚠️ 所有接口检测都失败了');
    return null;
  }

  /**
   * 测试AdsPower连接 - 使用官方推荐的API状态检查
   */
  private async testConnection(): Promise<void> {
    try {
      // 使用AdsPower官方推荐的API状态检查接口
      console.log(`🧪 测试AdsPower连接: ${this.baseUrl}/browser/start`);
      
      // 先测试API状态 - 用一个不存在的user_id来测试API是否响应
      const response = await axios.get(`${this.baseUrl}/browser/start?user_id=connection_test`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 AdsPower API响应状态: ${response.status}`);
      
      if (response.status === 200) {
        // 即使是错误响应(如Profile does not exist)，也说明API是通的
        if (response.data.code === -1 && response.data.msg.includes('does not exist')) {
          console.log('✅ AdsPower API服务正常运行');
          console.log('📋 API地址验证成功，可以进行浏览器管理操作');
        } else if (response.data.code === 0) {
          console.log('✅ AdsPower连接测试成功');
          console.log('📋 API服务完全正常');
        } else {
          const errorMsg = response.data.msg || '未知错误';
          console.log(`⚠️ AdsPower API响应: ${errorMsg}`);
          console.log('💡 API服务运行正常，但可能需要配置用户档案');
        }
      } else {
        throw new Error(`AdsPower API HTTP错误: ${response.status}`);
      }
      
    } catch (error) {
      const isConnectionError = axios.isAxiosError(error) && (
        error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' ||
        error.response?.status === 404
      );
      
      if (isConnectionError) {
        console.log('💡 AdsPower启动指南：');
        console.log('   1. 从应用程序启动AdsPower软件');
        console.log('   2. 等待本地API服务启动（端口50325）');
        console.log('   3. 重新运行本系统即可获得完整浏览器管理功能');
        console.log('   💪 当前将使用Stagehand原生高性能浏览器模式');
        
        throw new Error('AdsPower软件未启动，将使用原生模式');
      } else {
        console.log('💡 AdsPower配置信息：');
        console.log('   1. 确保AdsPower软件已启动');
        console.log('   2. 本地服务运行在端口50325');
        console.log('   3. 配置ADSPOWER_SERIAL_NUMBER环境变量');
        throw new Error(`AdsPower配置需要优化: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * 清理遗留的浏览器实例
   */
  private async cleanupOrphanedBrowsers(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/browser/list`);
      const browsers = response.data?.data || [];
      
      // 查找可能是之前创建但未清理的浏览器 (修复浏览器名称匹配)
      const questionnaireBrowsers = browsers.filter((browser: any) => 
        browser.name && (
          browser.name.includes('questionnaire-') || 
          browser.name.includes('StagehandQuestionnaire')
        )
      );
      
      if (questionnaireBrowsers.length > 0) {
        console.log(`🧹 发现 ${questionnaireBrowsers.length} 个可能的遗留浏览器`);
        
        for (const browser of questionnaireBrowsers) {
          try {
            // 先尝试停止，如果404说明已经不存在了
            await this.stopBrowser(browser.user_id);
            await this.deleteBrowserProfile(browser.user_id);
            console.log(`🗑️ 清理遗留浏览器: ${browser.name}`);
          } catch (error) {
            // 404错误是正常的，说明浏览器已经不存在
            if (error instanceof Error && error.message.includes('404')) {
              console.log(`💡 浏览器 ${browser.user_id} 已不存在，无需清理`);
            } else {
              console.warn(`⚠️ 清理浏览器 ${browser.user_id} 失败:`, error instanceof Error ? error.message : String(error));
            }
          }
        }
      } else {
        console.log(`✅ 未发现需要清理的遗留浏览器`);
      }
      
    } catch (error) {
      console.warn('⚠️ 清理遗留浏览器时出错:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 创建优化的浏览器实例 - 专注解决socket hang up问题
   */
  async createBrowserWithOptimization(sessionId: string, proxyInfo?: ProxyInfo): Promise<BrowserInfo> {
    console.log('🚀 AdsPower优化启动开始');
    console.log('🔧 优化策略：连接复用、超时调优、智能重试');
    
    const maxRetries = 3;
    const retryDelay = 2000; // 2秒重试间隔
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试第 ${attempt}/${maxRetries} 次优化启动...`);
        
        // 使用优化的创建逻辑
        const result = await this.createBrowserOptimized(sessionId, proxyInfo);
        
        console.log(`✅ 第 ${attempt} 次尝试成功！`);
        return result;
        
      } catch (error) {
        console.log(`⚠️ 第 ${attempt} 次尝试失败:`, error instanceof Error ? error.message : String(error));
        
        if (attempt < maxRetries) {
          console.log(`⏱️ 等待 ${retryDelay/1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('❌ 所有重试尝试都失败了');
          throw error;
        }
      }
    }
    
    throw new Error('AdsPower优化启动最终失败');
  }

  /**
   * 优化的浏览器创建逻辑
   */
  private async createBrowserOptimized(sessionId: string, proxyInfo?: ProxyInfo): Promise<BrowserInfo> {
    console.log('🔧 执行优化的浏览器创建逻辑...');
    
    // 1. 创建浏览器配置
    const profileId = await this.createBrowserProfile(sessionId, proxyInfo);
    console.log(`✅ 浏览器配置创建成功: ${profileId}`);
    
    // 2. 使用优化的启动参数
    const browserInfo = await this.startBrowserOptimized(profileId, proxyInfo);
    console.log(`✅ 浏览器启动成功，调试端口: ${browserInfo.debugPort}`);
    
    // 3. 记录活跃浏览器
    this.activeBrowsers.set(profileId, browserInfo);
    
    return browserInfo;
  }

  /**
   * 优化的浏览器启动方法 - 解决socket hang up
   */
  private async startBrowserOptimized(profileId: string, proxyInfo?: ProxyInfo): Promise<BrowserInfo> {
    console.log('🚀 优化的浏览器启动方法开始');
    
    // 优化的axios配置
    const optimizedAxios = axios.create({
      timeout: 30000,  // 30秒超时
      maxRedirects: 3,
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      },
      // 关键：优化HTTP连接
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
      }
    });
    
    const url = `${this.baseUrl}/browser/start`;
    const params = {
      user_id: profileId,
      serial_number: this.serialNumber,
      launch_args: JSON.stringify(this.generateOptimizedLaunchArgs()),
      ip_tab: 1,
      new_first_tab: 1,
      open_tabs: 0
    };
    
    console.log('🔧 发起优化的API请求...');
    console.log(`📡 URL: ${url}`);
    console.log(`🔑 Profile ID: ${profileId}`);
    
    try {
      const response = await optimizedAxios.get(url, { params });
      
      if (response.status === 200) {
        const result = response.data;
        if (result.code === 0) {
          const data = result.data;
          console.log('✅ AdsPower启动成功');
          console.log(`🔗 调试端口: ${data.debug_port}`);
          console.log(`🌐 WebSocket: ${JSON.stringify(data.ws)}`);
          
          return {
            profileId,
            debugPort: data.debug_port,
            name: profileId,
            isActive: true,
            ws: data.ws
          };
        } else {
          throw new Error(`AdsPower API错误: ${result.msg}`);
        }
      } else {
        throw new Error(`HTTP错误: ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
          console.error('🔍 检测到socket hang up错误');
          console.error('💡 可能的解决方案：');
          console.error('   1. 增加超时时间');
          console.error('   2. 优化连接复用');
          console.error('   3. 减少launch_args参数');
        }
        throw new Error(`网络连接错误: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 生成优化的启动参数 - 减少启动负担
   */
  private generateOptimizedLaunchArgs(): string[] {
    return [
      '--window-size=800,600',
      '--window-position=100,100',
      '--force-device-scale-factor=1',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate'
      // 减少了一些可能导致启动问题的参数
    ];
  }

  /**
   * 创建浏览器实例 (保留原方法兼容性)
   */
  async createBrowser(sessionId: string, proxyInfo?: ProxyInfo): Promise<BrowserInfo> {
    try {
      console.log(`🖥️ 为会话 ${sessionId} 创建AdsPower浏览器...`);
      
      // 生成唯一的浏览器配置名称
      const browserName = `StagehandQuestionnaire-${sessionId}-${Date.now()}`;
      
      // 创建浏览器配置
      const profileId = await this.createBrowserProfile(browserName, proxyInfo);
      
      // 启动浏览器
      const browserInfo = await this.startBrowser(profileId, proxyInfo);
      
      this.activeBrowsers.set(sessionId, browserInfo);
      
      console.log(`✅ 浏览器创建成功: ${browserName}`);
      console.log(`🔗 调试端口: ${browserInfo.debugPort}`);
      
      return browserInfo;
      
    } catch (error) {
      console.error(`❌ 创建浏览器失败 (${sessionId}):`, error);
      throw new Error(`创建浏览器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 准备浏览器配置 - 完全参照web-ui成功配置
   */
  private prepareBrowserConfig(name: string, proxyInfo?: ProxyInfo, config?: any): any {
    const baseConfig: any = {
      group_id: 6741757, // 关键：web-ui项目中的default_group_id
      user_name: name,
      serial_number: this.serialNumber, // 关键：API认证参数在body中
      open_urls: [], // 不自动打开URL
      
      // 🔧 完全对标web-ui成功的桌面端fingerprint_config
      fingerprint_config: {
        browser_kernel_config: {
          version: 'ua_auto',  // web-ui使用ua_auto智能匹配最新Chrome内核
          type: 'chrome'       // 强制桌面端，不使用移动端
        },
        screen_resolution: '800_600',  // 使用较小的桌面端分辨率
        automatic_timezone: '1',       // web-ui使用字符串'1'
        language: ['zh-CN', 'zh', 'en-US', 'en'],  // 中文桌面端语言
        // 🔧 关键修复：强制桌面端设备配置 (完全对标web-ui)
        device_name_switch: '1',  // 掩盖设备名称
        platform: 'Win32',       // 强制Windows平台
        device_scale: '1',        // 桌面端缩放比例
        mobile: '0',              // 强制非移动端 (web-ui使用字符串)
        touch: '0',               // 强制无触摸 (web-ui使用字符串)
        // 🔧 关键修复：强制指定桌面端User-Agent，覆盖ua_auto可能的移动端UA
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        fonts: ['system'],
        canvas: 1,  // 使用数值而不是字符串 (对标web-ui)
        webgl: 1,   // 使用数值而不是字符串
        audio: 1,   // 使用数值而不是字符串
        location: 'ask',
        webrtc: 'disabled',
        do_not_track: 'default',
        hardware_concurrency: '4',  // web-ui使用字符串
        device_memory: '8',         // web-ui使用字符串
        flash: 'block'
        // 🔧 强制桌面端配置，禁用任何移动端特征
      }
    };

    if (proxyInfo) {
      // 🔧 完全对标web-ui的代理配置格式
      baseConfig.user_proxy_config = {
        proxy_type: 'http',  // 🔧 青果代理使用http类型（参照web-ui成功配置）
        proxy_host: proxyInfo.host,
        proxy_port: typeof proxyInfo.port === 'string' ? parseInt(proxyInfo.port) : proxyInfo.port,
        proxy_user: proxyInfo.username,
        proxy_password: proxyInfo.password,
        proxy_soft: 'other'
      };
      
      console.log(`🌐 配置代理到AdsPower: ${proxyInfo.host}:${proxyInfo.port}`);
      console.log(`🔑 代理认证: ${proxyInfo.username.slice(0, 8)}****`);
      console.log(`📡 代理配置详情: ${JSON.stringify(baseConfig.user_proxy_config, null, 2)}`);
      console.log(`✅ 代理配置已添加到AdsPower浏览器配置中`);
    } else {
      console.log(`⚠️ 未配置代理 - AdsPower将使用直连模式`);
    }

    // 合并用户自定义配置
    if (config) {
      Object.assign(baseConfig, config);
    }

    return baseConfig;
  }

  /**
   * 创建浏览器配置文件
   */
  async createBrowserProfile(name: string, proxyInfo?: ProxyInfo): Promise<string> {
    try {
      const config = this.prepareBrowserConfig(name, proxyInfo);
      
      console.log(`🔧 创建浏览器配置: ${name}`);
      console.log(`📋 配置详情:`);
      console.log(`   - 内核: Chrome ${config.fingerprint_config.browser_kernel_config.version}`);
      console.log(`   - 分辨率: ${config.fingerprint_config.screen_resolution}`);
      console.log(`   - 平台: ${config.fingerprint_config.platform}`);
      console.log(`   - 移动端: ${config.fingerprint_config.mobile} (应该是'0')`);
      console.log(`   - 触摸: ${config.fingerprint_config.touch} (应该是'0')`);
      console.log(`   - User-Agent: ${config.fingerprint_config.ua.substring(0, 50)}...`);
      console.log(`   - 代理: ${proxyInfo ? '已配置' : '未配置'}`);
      console.log(`✅ 强制桌面端配置已应用 (完全对标web-ui成功配置)`);
      
      // 参照web-ui：使用/user/create端点
      const response = await axios.post(`${this.baseUrl}/user/create`, config, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.code === 0 && response.data.data?.id) {
        const profileId = response.data.data.id;
        console.log(`✅ 浏览器配置创建成功: ${profileId}`);
        return profileId;
      } else {
        throw new Error(`创建失败: ${response.data.msg || '未知错误'}`);
      }
      
    } catch (error) {
      console.error('❌ 创建浏览器配置失败:', error);
      if (axios.isAxiosError(error)) {
        console.error('📡 API响应:', error.response?.data);
        console.error('📡 状态码:', error.response?.status);
      }
      throw error;
    }
  }

  /**
   * 启动浏览器 - 参照web-ui的完整实现
   */
  private async startBrowser(profileId: string, proxyInfo?: ProxyInfo): Promise<BrowserInfo> { // Added proxyInfo parameter
    try {
      // 🔧 构建启动参数 - 完全参照web-ui桌面端配置
      const windowIndex = 0; // 暂时使用固定值，可扩展为动态
      const row = Math.floor(windowIndex / 2);
      const col = windowIndex % 2;
      const windowX = 100 + col * 850;  // 窗口间距50px，完全对标web-ui
      const windowY = 100 + row * 650;  // 窗口间距50px，完全对标web-ui
      
      const launchArgs = [
        "--window-size=800,600",      // 800x600小窗口，适合问卷填写
        `--window-position=${windowX},${windowY}`,  // 动态位置，避免重叠
        
        // 🔧 强制桌面端视口和设备特征
        "--force-device-scale-factor=1",  // 强制桌面端缩放
        "--disable-notifications",     // 禁用通知
        "--no-first-run",             // 跳过首次运行
        "--disable-default-apps",     // 禁用默认应用
        "--disable-extensions",       // 禁用扩展
        "--disable-plugins",          // 禁用插件
        "--disable-java",             // 禁用Java
        "--disable-web-security",     // 禁用Web安全策略
        "--disable-features=VizDisplayCompositor",  // 禁用移动端特性
        
        // 🔧 新增：禁用AdsPower默认页面行为
        "--disable-background-timer-throttling",  // 禁用后台定时器限制
        "--disable-backgrounding-occluded-windows",  // 禁用后台窗口
        "--disable-renderer-backgrounding",  // 禁用渲染器后台化
        "--disable-background-networking",  // 禁用后台网络
        "--disable-sync",  // 禁用同步
        "--disable-translate",  // 禁用翻译
        "--disable-web-resources",  // 禁用Web资源
        "--disable-component-update",  // 禁用组件更新
        "--disable-domain-reliability",  // 禁用域名可靠性
        "--disable-features=TranslateUI",  // 禁用翻译UI
        "--disable-ipc-flooding-protection",  // 禁用IPC洪水保护
        "--disable-hang-monitor",  // 禁用挂起监控
        "--disable-prompt-on-repost",  // 禁用重新发布提示
        "--disable-background-mode",  // 禁用后台模式
        
        // 🔧 网络相关优化
        "--aggressive-cache-discard"  // 积极缓存丢弃
      ];

      // 参照web-ui：使用GET请求和查询参数 + AdsPower官方文档配置
      const params = {
        user_id: profileId,
        serial_number: this.serialNumber,
        launch_args: JSON.stringify(launchArgs),
        
        // 🔧 关键：根据AdsPower官方文档添加IP检测页配置
        ip_tab: 1,  // 打开IP检测页（默认值，确保显示）
        new_first_tab: 1,  // 使用新版IP检测页
        open_tabs: 0  // 不打开历史页面，只显示IP检测页
      };

      const response = await axios.get(`${this.baseUrl}/browser/start`, { params });
      
      if (response.data?.code === 0 && response.data?.data?.ws?.puppeteer) {
        // 从WebSocket URL中提取调试端口
        const wsUrl = response.data.data.ws.puppeteer;
        const match = wsUrl.match(/:(\d+)/);
        
        if (match) {
          const debugPort = parseInt(match[1]);
          console.log(`🚀 浏览器启动成功，调试端口: ${debugPort}`);
          console.log(`🔧 启动参数数量: ${launchArgs.length}个`);
          console.log(`📱 窗口配置: ${windowX},${windowY} (800x600)`);
          console.log(`🌍 代理状态: ${proxyInfo ? '已配置' : '未配置'}`);
          
          // 返回完整的BrowserInfo对象，包含ws信息
          const browserInfo: BrowserInfo = {
            profileId,
            debugPort,
            name: profileId,
            isActive: true,
            ws: response.data.data.ws
          };
          
          return browserInfo;
        } else {
          throw new Error('无法从WebSocket URL中提取调试端口');
        }
      } else {
        throw new Error(`启动失败: ${response.data?.msg || '未知错误'}`);
      }
      
    } catch (error) {
      console.error('❌ 启动浏览器失败:', error);
      if (axios.isAxiosError(error)) {
        console.error('📡 API响应:', error.response?.data);
      }
      throw error;
    }
  }

  /**
   * 停止浏览器
   */
  private async stopBrowser(profileId: string): Promise<void> {
    try {
      // 参照web-ui：使用GET请求传递查询参数
      const params = {
        user_id: profileId,
        serial_number: this.serialNumber
      };
      
      const response = await axios.get(`${this.baseUrl}/browser/stop`, { params });
      
      if (response.data.code === 0) {
        console.log(`✅ 浏览器停止成功: ${profileId}`);
      } else {
        console.warn(`⚠️ 停止浏览器警告: ${response.data.msg}`);
      }
      
    } catch (error) {
      console.error(`❌ 停止浏览器失败 (${profileId}):`, error);
      // 不抛出错误，允许继续清理流程
    }
  }

  /**
   * 删除浏览器配置文件
   */
  private async deleteBrowserProfile(profileId: string): Promise<void> {
    try {
      // 参照web-ui：使用/user/delete端点，传递user_ids数组
      const requestBody = {
        user_ids: [profileId],  // 注意：这里是数组格式
        serial_number: this.serialNumber
      };
      
      const response = await axios.post(`${this.baseUrl}/user/delete`, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.code === 0) {
        console.log(`✅ 浏览器配置删除成功: ${profileId}`);
      } else {
        console.warn(`⚠️ 删除浏览器配置警告: ${response.data.msg}`);
      }
      
    } catch (error) {
      console.error(`❌ 删除浏览器配置失败 (${profileId}):`, error);
      // 不抛出错误，允许继续清理流程
    }
  }

  /**
   * 清理会话的浏览器资源
   */
  async cleanupBrowser(sessionId: string): Promise<void> {
    try {
      const browserInfo = this.activeBrowsers.get(sessionId);
      if (!browserInfo) {
        console.log(`📝 会话 ${sessionId} 没有关联的浏览器`);
        return;
      }

      console.log(`🧹 清理会话 ${sessionId} 的浏览器资源...`);

      // 停止浏览器
      await this.stopBrowser(browserInfo.profileId);

      // 删除浏览器配置
      await this.deleteBrowserProfile(browserInfo.profileId);

      // 从活动列表中移除
      this.activeBrowsers.delete(sessionId);

      console.log(`✅ 浏览器资源清理完成: ${sessionId}`);

    } catch (error) {
      console.error(`❌ 清理浏览器资源失败 (${sessionId}):`, error);
    }
  }

  /**
   * 获取活动浏览器信息
   */
  getActiveBrowsers(): Map<string, BrowserInfo> {
    return new Map(this.activeBrowsers);
  }

  /**
   * 清理所有浏览器资源
   */
  async cleanup(): Promise<void> {
    console.log('🧹 清理所有AdsPower浏览器资源...');

    const sessionIds = Array.from(this.activeBrowsers.keys());
    for (const sessionId of sessionIds) {
      await this.cleanupBrowser(sessionId);
    }

    console.log('✅ AdsPower资源清理完成');
  }
}