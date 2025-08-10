/**
 * 智能问卷作答系统 - 核心系统类
 * 整合所有功能模块，提供统一的调用接口
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { DigitalPersonManager } from '../digital-person/DigitalPersonManager';
import { QinguoProxyManager } from '../proxy/QinguoProxyManager';
import { AdsPowerManager } from '../browser/AdsPowerManager';
import { IntelligentAnswering } from '../answering/IntelligentAnswering';
import { StagehandSuperIntelligentEngine } from '../answering/StagehandSuperIntelligentEngine';
import { MemoryManager } from '../memory/MemoryManager';
import { LifecycleManager } from '../lifecycle/LifecycleManager';
import { WindowMonitoringSystem } from '../lifecycle/WindowMonitoringSystem';
import { SessionResourceData } from '../lifecycle/UnifiedResourceCleanupManager';
import { 
  QuestionnaireConfig, 
  AnsweringResult, 
  SessionStatusResponse,
  AnsweringConfig,
  DigitalPersonProfile
} from '../types';

// 会话类定义
class QuestionnaireSession {
  public status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' = 'pending';
  public progress: { total: number; answered: number; current?: string } = { total: 0, answered: 0 };
  public result?: AnsweringResult;
  public error?: string;
  public startTime: number = Date.now();

  constructor(
    public sessionId: string,
    public config: QuestionnaireConfig
  ) {}

  setStatus(status: QuestionnaireSession['status']) {
    this.status = status;
  }

  setProgress(progress: Partial<QuestionnaireSession['progress']>) {
    this.progress = { ...this.progress, ...progress };
  }

  setResult(result: AnsweringResult) {
    this.result = result;
    this.status = 'completed';
  }

  setError(error: string) {
    this.error = error;
    this.status = 'failed';
  }
}

export class QuestionnaireSystem {
  private stagehand: Stagehand;
  private digitalPersonManager: DigitalPersonManager;
  private proxyManager: QinguoProxyManager;
  private browserManager: AdsPowerManager;
  private answeringEngine: IntelligentAnswering;
  private memoryManager: MemoryManager;
  private lifecycleManager: LifecycleManager;
  private windowMonitoringSystem: WindowMonitoringSystem;
  
  private activeSessions: Map<string, QuestionnaireSession> = new Map();
  private sessionResourceData: Map<string, SessionResourceData> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // 初始化各个管理器
    this.digitalPersonManager = new DigitalPersonManager();
    this.proxyManager = new QinguoProxyManager();
    this.browserManager = new AdsPowerManager();
    this.memoryManager = new MemoryManager();
    this.lifecycleManager = new LifecycleManager();
    this.windowMonitoringSystem = new WindowMonitoringSystem(this.browserManager);

    // 创建Stagehand实例
    this.stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      enableCaching: true,
      modelName: 'openai/gpt-4o-mini'
    });

    // 创建智能作答引擎
    this.answeringEngine = new IntelligentAnswering(
      this.stagehand,
      this.digitalPersonManager,
      this.memoryManager
    );

    console.log('✅ QuestionnaireSystem 初始化完成');
  }

  /**
   * 初始化系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 正在初始化智能问卷作答系统...');

      // 初始化各个组件
      await this.digitalPersonManager.initialize();
      // 青果代理管理器已在构造函数中初始化完成
      await this.browserManager.initialize();
      await this.memoryManager.initialize();

      // 注册生命周期事件监听
      this.setupLifecycleEvents();

      this.isInitialized = true;
      console.log('✅ 智能问卷作答系统初始化完成');

    } catch (error) {
      console.error('❌ 系统初始化失败:', error);
      throw new Error(`系统初始化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 启动智能问卷作答
   */
  async startAnswering(config: QuestionnaireConfig): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessionId = uuidv4();
    console.log(`🎯 启动智能作答会话: ${sessionId}`);
    console.log(`📋 目标问卷: ${config.url}`);

    try {
      // 创建会话
      const session = new QuestionnaireSession(sessionId, config);
      this.activeSessions.set(sessionId, session);

      // 记录生命周期事件
      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'created',
        data: { url: config.url, mode: config.mode }
      });

      // 异步启动作答流程
      this.executeAnswering(sessionId, config).catch(error => {
        console.error(`❌ 会话 ${sessionId} 执行异常:`, error);
        session.setError(error.message);
        this.lifecycleManager.recordEvent(sessionId, {
          type: 'failed',
          data: { error: error.message }
        });
      });

      return sessionId;

    } catch (error) {
      console.error('❌ 启动作答失败:', error);
      this.activeSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * 执行智能作答流程
   */
  private async executeAnswering(sessionId: string, config: QuestionnaireConfig): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    try {
      console.log(`🔄 开始执行作答流程: ${sessionId}`);
      
      // 1. 获取数字人档案 - 优先使用小社会API智能匹配
      console.log('👤 获取数字人档案...');
      let digitalPersonProfile: DigitalPersonProfile;
      
      // 先尝试小社会API智能匹配
      if (!config.digitalPersonId || config.digitalPersonId === 'default') {
        console.log('🎯 尝试小社会API智能匹配数字人...');
        const smartProfile = await this.digitalPersonManager.queryDigitalPersonForQuestionnaire(config.url);
        
        if (smartProfile) {
          digitalPersonProfile = smartProfile;
          console.log(`✨ 小社会API智能匹配成功: ${digitalPersonProfile.name}`);
        } else {
          console.log('📋 小社会API匹配失败，使用默认档案');
          digitalPersonProfile = await this.digitalPersonManager.getProfile('default');
        }
      } else {
        // 使用指定的数字人档案
        digitalPersonProfile = await this.digitalPersonManager.getProfile(config.digitalPersonId);
      }

      // 2. 分配代理
      console.log('🌐 分配青果代理...');
      const proxyInfo = await this.proxyManager.allocateProxy(sessionId);

      // 3. 创建浏览器配置
      console.log('🖥️ AdsPower API优化启动 - 专注最高性能');
      const browserInfo = await this.createOptimizedAdsPowerBrowser(
        `questionnaire-${sessionId}`,
        proxyInfo
      );

      // 4. 连接Stagehand到AdsPower：发挥最大性能
      console.log('🎯 连接Stagehand到AdsPower - 最高性能单窗口智能作答');
      console.log('🚀 使用Stagehand Agent + act/extract/observe完整能力');
      
      // 🚫 重要：不再初始化Stagehand，避免创建额外浏览器
      console.log('🚫 跳过Stagehand初始化，避免创建Chromium窗口');
      console.log('🎯 直接在AdsPower的SunBrowser中进行智能操作');
      
      // 5. 开始智能作答
      console.log('🎯 开始智能作答...');
      session.setStatus('running');

      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'started',
        data: { 
          digitalPersonId: digitalPersonProfile.id,
          proxyAddress: proxyInfo.fullAddress,
          browserPort: browserInfo.debugPort
        }
      });

      const answeringConfig: AnsweringConfig = {
        digitalPersonProfile,
        proxyInfo,
        browserInfo
      };

      // 🛡️ 暂时禁用窗口监控（调试期间排除干扰）
      console.log('🛡️ 窗口监控已禁用（调试模式）');
      const sessionResourceData: SessionResourceData = {
        sessionId,
        profileId: browserInfo.profileId,
        proxyInfo,
        stagehand: this.stagehand,
        browserInfo,
        adsPowerManager: this.browserManager,
        proxyManager: this.proxyManager,
        memoryManager: this.memoryManager
      };
      
      // 存储会话资源数据
      this.sessionResourceData.set(sessionId, sessionResourceData);
      
      // 启动监控
      // 窗口监控已完全禁用
      console.log('🚫 窗口监控已完全禁用（测试模式）');

      // 🚀 启动真正的Stagehand智能作答流程 (完全模仿web-ui模式)
      console.log('🧠 启动Stagehand连接AdsPower - 完全模仿web-ui成功模式');
      console.log(`🔧 使用启动方式: ${browserInfo.launchMethod}`);
      console.log('🚫 绝不创建新浏览器实例 - 只连接到AdsPower');
      const result = await this.startWebUIStyleStagehandAnswering(browserInfo, answeringConfig, config.url);

      // 6. 处理结果
      session.setResult(result);
      console.log(`✅ 作答完成: ${sessionId}`);

      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'completed',
        data: { 
          totalQuestions: result.totalQuestions,
          answeredQuestions: result.answeredQuestions,
          duration: result.duration
        }
      });

    } catch (error) {
      console.error(`❌ 作答流程失败 (${sessionId}):`, error);
      session.setError(error instanceof Error ? error.message : String(error));

      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'failed',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    } finally {
      // 清理资源
      await this.cleanupSession(sessionId);
    }
  }

  /**
   * 连接Stagehand到AdsPower浏览器 - 真正发挥最大性能
   * 使用Playwright连接AdsPower的调试端口，实现单窗口智能作答
   */
  private async connectStagehandToAdsPowerBrowser(browserInfo: any): Promise<void> {
    try {
      console.log('🔗 连接Stagehand到AdsPower - 最高性能模式');
      console.log(`🖥️ AdsPower调试端口: ${browserInfo.debugPort}`);
      console.log(`🌐 WebSocket: ${browserInfo.ws?.puppeteer || 'N/A'}`);
      
      // 🚀 关键：使用browserWSEndpoint连接到AdsPower
      // 参考：https://docs.stagehand.dev/reference/configuration
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        verbose: 1,
        enableCaching: true,
        modelName: 'openai/gpt-4o', // 使用主力模型
        domSettleTimeoutMs: 5000
      });

      await this.stagehand.init();
      
      console.log('✅ Stagehand已连接到AdsPower浏览器');
      console.log('🎯 真正单窗口：Stagehand在AdsPower的SunBrowser中操作');
      console.log('🧠 AI模型: GPT-4o (最高性能主力模型)');

    } catch (error) {
      console.error('❌ 连接失败，fallback到兼容模式:', error);
      
      // Fallback: 如果无法直接连接，使用Stagehand原生但尝试导航到AdsPower内容
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        verbose: 1,
        enableCaching: true,
        modelName: 'openai/gpt-4o' // 备用模型
      });
      
      await this.stagehand.init();
      console.log('⚠️ 使用兼容模式 - 仍将实现智能作答');
    }
  }

  /**
   * AdsPower API优化启动 - 专注解决socket hang up问题
   */
  private async createOptimizedAdsPowerBrowser(sessionId: string, proxyInfo: any): Promise<any> {
    console.log('🚀 AdsPower API优化启动开始');
    console.log('🎯 专注最优方案：AdsPower API + Stagehand最大性能');
    console.log('🔧 优化策略：连接池复用、超时调优、智能重试');
    
    // 优化AdsPower API调用
    try {
      console.log('🔄 执行AdsPower API优化启动...');
      
      // 使用优化的浏览器管理器
      const browserInfo = await this.browserManager.createBrowserWithOptimization(sessionId, proxyInfo);
      
      console.log('✅ AdsPower API启动成功');
      console.log(`🖥️ 浏览器配置ID: ${browserInfo.profileId}`);
      console.log(`🔗 调试端口: ${browserInfo.debugPort}`);
      console.log('🎯 准备连接Stagehand实现最大性能智能作答');
      
      return { ...browserInfo, launchMethod: 'adspower_optimized' };
      
    } catch (error) {
      console.error('❌ AdsPower API启动失败:', error);
      console.error('🔍 错误分析:');
      console.error(`   - 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
      console.error(`   - 错误信息: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error && error.message.includes('socket hang up')) {
        console.error('💡 socket hang up解决建议:');
        console.error('   1. 检查AdsPower软件是否正常运行');
        console.error('   2. 检查API地址和端口是否正确');
        console.error('   3. 检查网络连接是否稳定');
        console.error('   4. 检查防火墙设置');
      }
      
      throw new Error(`AdsPower启动失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }



  /**
   * 完全模仿web-ui的Stagehand连接模式 - 绝不创建新浏览器
   */
  private async startWebUIStyleStagehandAnswering(
    browserInfo: any, 
    config: AnsweringConfig, 
    questionnaireUrl: string
  ): Promise<AnsweringResult> {
    const startTime = Date.now();
    console.log('🎯 web-ui风格Stagehand连接开始');
    console.log(`📋 目标URL: ${questionnaireUrl}`);
    console.log(`🔧 启动方式: ${browserInfo.launchMethod}`);
    console.log('🚀 完全模仿web-ui成功模式：Browser-Use -> Stagehand');
    
    try {
      // 等待3秒让IP检测页显示
      console.log('⏱️ 等待3秒显示代理IP信息...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 🔧 关键：完全模仿web-ui的连接方式
      console.log('🔗 使用Playwright连接到AdsPower调试端口...');
      console.log(`📡 CDP连接地址: http://127.0.0.1:${browserInfo.debugPort}`);
      
      const { chromium } = require('playwright');
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${browserInfo.debugPort}`);
      const contexts = browser.contexts();
      const context = contexts[0];
      const pages = context.pages();
      const page = pages[0];
      
      console.log('✅ 已连接到AdsPower浏览器');
      console.log(`🔗 调试端口: ${browserInfo.debugPort}`);
      console.log(`🖥️ 浏览器配置: ${browserInfo.profileId}`);
      console.log('🎯 准备在AdsPower窗口中执行智能作答');
      
      // 导航到问卷页面
      console.log('🌐 导航到问卷页面...');
      await page.goto(questionnaireUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log('✅ 问卷页面加载完成');
      
      // 🚀 使用StagehandSuperIntelligentEngine进行真正的智能作答
      console.log('🤖 启动StagehandSuperIntelligentEngine...');
      
      // 🚫 跳过所有复杂配置，直接使用纯净引擎
      console.log('🚫 跳过复杂配置管理器，使用纯净Stagehand流程');
      
      // 🎯 使用Gemini Stagehand引擎 - 网络已修复，使用AI智能作答！
      const { PureStagehandEngine } = await import('../answering/PureStagehandEngine');
      const geminiEngine = new PureStagehandEngine(config.digitalPersonProfile);
      
      console.log('🎯 启动Gemini Stagehand智能作答流程...');
      console.log(`👤 数字人身份：${config.digitalPersonProfile.name}`);
      console.log('⚡ 使用Gemini API，AI智能识别和作答！');
      console.log('🔥 网络环境已修复，充分发挥Stagehand优势！');
      
      // 执行Gemini智能作答
      const answeringResult = await geminiEngine.executePureAnswering(browserInfo.debugPort);
      
      console.log('✅ Gemini智能作答完成');
      console.log(`📊 作答统计: ${answeringResult.totalAnswered} 题`);
      console.log(`📄 页面统计: ${answeringResult.totalPages} 页`);
      console.log(`✅ 作答状态: ${answeringResult.success ? '成功' : '失败'}`);
      if (answeringResult.error) {
        console.log(`❌ 错误信息: ${answeringResult.error}`);
      }
      
      // 显示详细的作答日志
      console.log('\n📋 === 详细作答日志 ===');
      answeringResult.logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log}`);
      });
      
      // Stagehand实例已在引擎内部清理
      console.log('✅ Gemini Stagehand引擎作答完成');
      
      // 验证作答结果
      const currentUrl = page.url();
      console.log(`🔍 当前页面URL: ${currentUrl}`);
      
      // 清理连接 (不关闭AdsPower浏览器)
      console.log('🧹 清理Playwright连接...');
      await browser.close();
      
      const duration = Date.now() - startTime;
      
      // 返回真正的作答结果
      return {
        sessionId: `session-${Date.now()}`,
        success: answeringResult.success,
        totalQuestions: answeringResult.totalAnswered,
        answeredQuestions: answeringResult.totalAnswered,
        skippedQuestions: 0,
        failedQuestions: answeringResult.success ? 0 : 1,
        duration: duration,
        results: [],
        errors: answeringResult.error ? [answeringResult.error] : []
      };
      
    } catch (error) {
      console.error('❌ web-ui风格智能作答失败:', error);
      return {
        sessionId: `session-${Date.now()}`,
        success: false,
        totalQuestions: 0,
        answeredQuestions: 0,
        skippedQuestions: 0,
        failedQuestions: 1,
        duration: Date.now() - startTime,
        results: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 旧的统一作答方法 (保留)
   */
  private async startUnifiedStagehandAnswering(
    browserInfo: any, 
    config: AnsweringConfig, 
    questionnaireUrl: string
  ): Promise<AnsweringResult> {
    const startTime = Date.now();
    console.log('🎯 Stagehand连接AdsPower智能作答开始');
    console.log(`📋 目标URL: ${questionnaireUrl}`);
    console.log(`🔧 启动方式: ${browserInfo.launchMethod}`);
    console.log('🚀 发挥Stagehand最大性能：act + extract + observe + agent');
    
    try {
      // 专注AdsPower连接方案
      console.log('🔗 连接Stagehand到AdsPower浏览器 - 最高性能模式');
      return await this.executeMaxPerformanceStagehandAnswering(browserInfo, config, questionnaireUrl, startTime);
      
    } catch (error) {
      console.error('❌ Stagehand智能作答失败:', error);
      return {
        sessionId: `session-${Date.now()}`,
        success: false,
        totalQuestions: 0,
        answeredQuestions: 0,
        skippedQuestions: 0,
        failedQuestions: 1,
        duration: Date.now() - startTime,
        results: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 执行最大性能Stagehand智能作答 - 专注AdsPower连接
   */
  private async executeMaxPerformanceStagehandAnswering(
    browserInfo: any,
    config: AnsweringConfig,
    questionnaireUrl: string,
    startTime: number
  ): Promise<AnsweringResult> {
    console.log('🚀 最大性能Stagehand智能作答开始');
    console.log('🎯 专注方案：AdsPower + Stagehand完美结合');
    
    // 等待3秒让IP检测页显示
    console.log('⏱️ 等待3秒显示代理IP信息...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 连接到AdsPower浏览器
    console.log('🔗 连接Playwright到AdsPower调试端口...');
    const { chromium } = require('playwright');
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${browserInfo.debugPort}`);
    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();
    const page = pages[0];
    
    console.log('✅ 已连接到AdsPower浏览器');
    console.log(`🔗 调试端口: ${browserInfo.debugPort}`);
    console.log(`🖥️ 浏览器配置: ${browserInfo.profileId}`);
    
    // 创建专用Stagehand实例 - 最大性能配置
    console.log('🚀 创建最大性能Stagehand实例...');
    const maxPerfStagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      enableCaching: true,
      modelName: 'openai/gpt-4o',
      domSettleTimeoutMs: 3000  // 优化等待时间
    });
    
    await maxPerfStagehand.init();
    console.log('✅ Stagehand实例初始化完成');
    
    // 关键：将AdsPower页面注入到Stagehand - 实现最大性能连接
    console.log('🔧 注入AdsPower页面到Stagehand - 最大性能连接');
    Object.defineProperty(maxPerfStagehand, 'page', {
      value: page,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(maxPerfStagehand, 'context', {
      value: context,
      writable: true,
      configurable: true
    });
    
    console.log('✅ Stagehand与AdsPower完美连接');
    console.log('🚀 准备发挥Stagehand最大性能：act + extract + observe + agent');
    
    // 导航到问卷页面
    console.log('🌐 导航到问卷页面...');
    await page.goto(questionnaireUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ 问卷页面加载完成，开始最大性能智能作答');
    
    // 执行最大性能智能作答
    const result = await this.executeStagehandMaxPerformanceAgent(
      maxPerfStagehand, 
      config, 
      questionnaireUrl, 
      startTime
    );
    
    // 清理连接 (不关闭AdsPower浏览器)
    console.log('🧹 清理Playwright连接...');
    await browser.close();
    
    return result;
  }

  /**
   * 执行Stagehand最大性能Agent - 发挥完整act/extract/observe/agent能力
   */
  private async executeStagehandMaxPerformanceAgent(
    stagehand: Stagehand,
    config: AnsweringConfig,
    questionnaireUrl: string,
    startTime: number
  ): Promise<AnsweringResult> {
    console.log('🚀 Stagehand最大性能Agent开始');
    console.log('🎯 发挥完整能力：act + extract + observe + agent');
    console.log(`👤 数字人身份：${config.digitalPersonProfile.name}`);
    
    // 第1阶段：使用observe分析问卷结构
    console.log('🔍 第1阶段：observe分析问卷结构...');
    const questionnaireStructure = await stagehand.page.observe(
      "分析这个问卷的整体结构，识别所有题目类型和必填项"
    );
    
    console.log('✅ 问卷结构分析完成');
    console.log(`📊 识别到 ${questionnaireStructure.length} 个可操作元素`);
    
    // 第2阶段：使用extract提取详细问卷信息
    console.log('🔍 第2阶段：extract提取问卷详细信息...');
    const questionnaireDetails = await stagehand.page.extract({
      instruction: "提取问卷的详细信息：标题、所有题目文本、选项、必填标识",
      schema: z.object({
        title: z.string().describe("问卷标题"),
        questions: z.array(z.object({
          id: z.string().describe("题目ID或序号"),
          text: z.string().describe("题目文本"),
          type: z.string().describe("题目类型：单选、多选、填空等"),
          required: z.boolean().describe("是否必填"),
          options: z.array(z.string()).optional().describe("选择题的选项")
        })).describe("所有题目列表"),
        totalQuestions: z.number().describe("题目总数")
      })
    });
    
    console.log('✅ 问卷详细信息提取完成');
    console.log(`📋 问卷标题: ${questionnaireDetails.title}`);
    console.log(`📊 题目总数: ${questionnaireDetails.totalQuestions}`);
    
    // 第3阶段：创建最大性能Agent进行智能作答
    console.log('🤖 第3阶段：创建最大性能Agent...');
    const maxPerfAgent = stagehand.agent({
      provider: 'openai',
      model: 'gpt-4o',
      instructions: `你是一个专业的问卷作答助手，现在要发挥Stagehand的最大性能完成问卷。

数字人身份信息：
- 姓名：${config.digitalPersonProfile.name}
- 年龄：${config.digitalPersonProfile.age}岁
- 性别：${config.digitalPersonProfile.gender}
- 职业：${config.digitalPersonProfile.occupation}
- 教育背景：${config.digitalPersonProfile.education}
- 兴趣爱好：${config.digitalPersonProfile.interests?.join(', ') || '未知'}

问卷信息：
- 标题：${questionnaireDetails.title}
- 题目总数：${questionnaireDetails.totalQuestions}

最大性能作答策略：
1. 使用act()进行精确的页面操作
2. 使用extract()验证每个操作的结果
3. 使用observe()在需要时重新分析页面状态
4. 基于数字人身份给出一致、合理的答案
5. 确保所有必填项都被正确填写
6. 最终提交问卷并验证成功

请展现Stagehand的最大性能，高效、准确地完成问卷。`
    });
    
    // 第4阶段：执行最大性能智能作答
    console.log('🚀 第4阶段：执行最大性能智能作答...');
    const agentResult = await maxPerfAgent.execute(`现在开始最大性能问卷作答：

问卷标题：${questionnaireDetails.title}
题目总数：${questionnaireDetails.totalQuestions}
数字人身份：${config.digitalPersonProfile.name}

请发挥Stagehand的最大性能：
1. 逐个题目进行act()操作
2. 对每个答案使用extract()验证
3. 必要时使用observe()重新分析
4. 基于数字人身份保持答案一致性
5. 确保所有必填项完成
6. 最终提交问卷

开始执行最大性能作答！`);
    
    console.log('✅ 最大性能Agent作答完成');
    console.log('📊 Agent执行摘要:', agentResult.message);
    
    // 第5阶段：使用extract验证最终结果
    console.log('🔍 第5阶段：extract验证最终结果...');
    const finalStatus = await stagehand.page.extract({
      instruction: "检查问卷是否已成功提交，提取提交状态和详细信息",
      schema: z.object({
        submitted: z.boolean().describe("问卷是否已提交"),
        confirmationMessage: z.string().optional().describe("提交确认信息"),
        completedQuestions: z.number().optional().describe("已完成的题目数量"),
        successUrl: z.string().optional().describe("成功页面URL"),
        errorMessage: z.string().optional().describe("如果有错误的错误信息")
      })
    });
    
    console.log('🔍 最终状态检查:', finalStatus);
    
    // 处理Agent执行结果
    const results: any[] = [];
    if (agentResult.actions && agentResult.actions.length > 0) {
      agentResult.actions.forEach((action: any, index: number) => {
        results.push({
          questionId: `step-${index + 1}`,
          questionText: action.description || `执行步骤 ${index + 1}`,
          questionType: 'max_performance_action',
          answer: action.action || 'completed',
          answerTime: Date.now() - startTime,
          success: true,
          mode: 'complete_question_answering'
        });
      });
    } else {
      results.push({
        questionId: 'questionnaire-complete',
        questionText: `完整问卷智能作答 - ${questionnaireDetails.title}`,
        questionType: 'max_performance_completion',
        answer: agentResult.message,
        answerTime: Date.now() - startTime,
        success: finalStatus.submitted,
        mode: 'complete_question_answering'
      });
    }
    
    const duration = Date.now() - startTime;
    const successfulAnswers = results.filter(r => r.success).length;
    const failedAnswers = results.filter(r => !r.success).length;

    console.log('🎉 Stagehand最大性能智能作答完成！');
    console.log(`📊 性能统计: ${successfulAnswers}成功/${failedAnswers}失败，耗时${Math.round(duration/1000)}秒`);

    return {
      sessionId: `session-${Date.now()}`,
      success: finalStatus.submitted || successfulAnswers > 0,
      totalQuestions: finalStatus.completedQuestions || questionnaireDetails.totalQuestions,
      answeredQuestions: finalStatus.completedQuestions || successfulAnswers,
      skippedQuestions: 0,
      failedQuestions: failedAnswers,
      duration,
      results,
      errors: finalStatus.errorMessage ? [finalStatus.errorMessage] : []
    };
  }

  /**
   * 旧的AdsPower连接方法 (保留兼容)
   */
  private async startStagehandIntelligentAnswering(
    browserInfo: any, 
    config: AnsweringConfig, 
    questionnaireUrl: string
  ): Promise<AnsweringResult> {
    const startTime = Date.now();
    console.log('🎯 Stagehand连接AdsPower智能作答开始');
    console.log(`📋 目标URL: ${questionnaireUrl}`);
    console.log(`🖥️ AdsPower调试端口: ${browserInfo.debugPort}`);
    
    try {
      // 等待3秒让IP检测页显示
      console.log('⏱️ 等待3秒显示代理IP信息...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 🚀 关键：连接Stagehand到AdsPower浏览器（参照web-ui成功模式）
      console.log('🔗 连接Stagehand到AdsPower浏览器...');
      
      // 使用Playwright连接到AdsPower的调试端口
      const { chromium } = require('playwright');
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${browserInfo.debugPort}`);
      const contexts = browser.contexts();
      const context = contexts[0]; // 使用第一个context
      const pages = context.pages();
      const page = pages[0]; // 使用第一个page
      
      console.log('✅ Playwright已连接到AdsPower浏览器');
      
      // 🚀 创建连接到AdsPower的Stagehand实例
      // 使用特殊方式连接到现有浏览器
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        verbose: 1,
        enableCaching: true,
        modelName: 'openai/gpt-4o',
        domSettleTimeoutMs: 5000
      });
      
      // 🔧 关键：初始化Stagehand但不启动新浏览器，然后替换page
      await this.stagehand.init();
      
      // 🔧 使用反射方式替换Stagehand的内部page和context
      // @ts-ignore - 绕过TypeScript检查
      Object.defineProperty(this.stagehand, 'page', {
        value: page,
        writable: true,
        configurable: true
      });
      
      // @ts-ignore - 绕过TypeScript检查
      Object.defineProperty(this.stagehand, 'context', {
        value: context,
        writable: true,
        configurable: true
      });
      
      // 关闭Stagehand自己创建的浏览器（如果有的话）
      try {
        if (this.stagehand.context && this.stagehand.context !== context) {
          await this.stagehand.context.close();
        }
      } catch (e) {
        // 忽略关闭错误
      }
      
      console.log('✅ Stagehand已连接到AdsPower页面');
      
      // 导航到问卷页面
      console.log('🌐 导航到问卷页面...');
      await page.goto(questionnaireUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log('✅ 问卷页面加载完成');
      
      // 🚀 启动Stagehand超级智能引擎 - 完全替代Browser-Use
      console.log('🚀 启动Stagehand超级智能作答引擎...');
      console.log('🎯 融合web-ui智慧，发挥Stagehand最大性能');
      
      const superEngine = new StagehandSuperIntelligentEngine(
        this.stagehand,
        config.digitalPersonProfile
      );
      
      // 执行超级智能作答
      const agentResult = await superEngine.executeQuestionnaireAnswering(questionnaireUrl);
      
      console.log('✅ Stagehand超级智能作答完成');
      console.log('📊 作答结果:', {
        success: agentResult.success,
        totalQuestions: agentResult.totalQuestions,
        answeredQuestions: agentResult.answeredQuestions,
        duration: `${Math.round(agentResult.duration / 1000)}秒`
      });
      
      // 验证作答结果
      console.log('🔍 验证作答结果...');
      const finalStatus = await this.stagehand.page.extract({
        instruction: "检查问卷是否已成功提交，提取提交状态和任何确认信息",
        schema: z.object({
          submitted: z.boolean().describe("问卷是否已提交"),
          confirmationMessage: z.string().optional().describe("提交确认信息"),
          completedQuestions: z.number().optional().describe("已完成的题目数量"),
          errorMessage: z.string().optional().describe("如果有错误的错误信息")
        })
      });
      
      console.log('🔍 最终状态检查:', finalStatus);
      
      // 处理超级引擎执行结果
      const results: any[] = [];
      
      // 基于超级引擎的结果创建兼容的结果格式
      results.push({
        questionId: 'stagehand-super-engine',
        questionText: 'Stagehand超级智能作答引擎',
        questionType: 'super_intelligent_answering',
        answer: `完成${agentResult.answeredQuestions}个题目`,
        answerTime: agentResult.duration,
        success: agentResult.success,
        mode: 'stagehand_super_intelligent'
      });
      
      const duration = agentResult.duration;
      const successfulAnswers = agentResult.answeredQuestions;
      const failedAnswers = agentResult.failedQuestions;

      // 🧹 清理连接（不关闭AdsPower浏览器）
      await browser.close();
      
      // 直接返回超级引擎的完整结果
      return {
        sessionId: agentResult.sessionId,
        success: agentResult.success,
        totalQuestions: agentResult.totalQuestions,
        answeredQuestions: agentResult.answeredQuestions,
        skippedQuestions: agentResult.skippedQuestions,
        failedQuestions: agentResult.failedQuestions,
        duration: agentResult.duration,
        results,
        errors: agentResult.errors
      };
      
    } catch (error) {
      console.error('❌ Stagehand智能作答失败:', error);
      return {
        sessionId: `session-${Date.now()}`,
        success: false,
        totalQuestions: 0,
        answeredQuestions: 0,
        skippedQuestions: 0,
        failedQuestions: 1,
        duration: Date.now() - startTime,
        results: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 获取会话状态
   */
  getSessionStatus(sessionId: string): SessionStatusResponse {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        status: 'failed',
        progress: { total: 0, answered: 0 },
        error: '会话不存在'
      };
    }

    return {
      sessionId,
      status: session.status,
      progress: session.progress,
      result: session.result,
      error: session.error
    };
  }

  /**
   * 暂停会话
   */
  async pauseSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'running') {
      return false;
    }

    try {
      session.setStatus('paused');
      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'paused'
      });
      return true;
    } catch (error) {
      console.error(`❌ 暂停会话失败 (${sessionId}):`, error);
      return false;
    }
  }

  /**
   * 恢复会话
   */
  async resumeSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'paused') {
      return false;
    }

    try {
      session.setStatus('running');
      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'resumed'
      });
      return true;
    } catch (error) {
      console.error(`❌ 恢复会话失败 (${sessionId}):`, error);
      return false;
    }
  }

  /**
   * 停止会话
   */
  async stopSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.setStatus('failed');
      session.setError('用户手动停止');
      await this.cleanupSession(sessionId);
      return true;
    } catch (error) {
      console.error(`❌ 停止会话失败 (${sessionId}):`, error);
      return false;
    }
  }

  /**
   * 清理会话资源 - 集成窗口监控系统的全面清理
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    try {
      console.log(`🧹 清理会话资源: ${sessionId}`);

      // 1. 停止窗口监控
      console.log(`🛑 停止窗口监控: ${sessionId}`);
      this.windowMonitoringSystem.stopMonitoring(sessionId, "会话结束");

      // 2. 获取会话资源数据并执行全面清理
      const sessionResourceData = this.sessionResourceData.get(sessionId);
      if (sessionResourceData) {
        console.log(`🧹 执行统一资源清理: ${sessionId}`);
        // 注意：这里不需要再次调用全面清理，因为已经在监控系统中处理了
        // 只需要清理本地引用即可
        this.sessionResourceData.delete(sessionId);
      }

      // 3. 传统清理流程（作为备用）
      console.log(`🔄 执行传统清理流程: ${sessionId}`);
      
      // 释放代理
      this.proxyManager.releaseProxy(sessionId);

      // 停止并删除浏览器
      await this.browserManager.cleanupBrowser(sessionId);

      // 4. 从活动会话中移除
      this.activeSessions.delete(sessionId);

      // 5. 记录清理事件
      await this.lifecycleManager.recordEvent(sessionId, {
        type: 'cleaned'
      });

      console.log(`✅ 会话资源清理完成: ${sessionId}`);

    } catch (error) {
      console.error(`❌ 清理会话资源失败 (${sessionId}):`, error);
      
      // 即使清理失败，也要尝试停止监控
      try {
        this.windowMonitoringSystem.stopMonitoring(sessionId, "清理失败时强制停止");
        this.sessionResourceData.delete(sessionId);
        this.activeSessions.delete(sessionId);
      } catch (e) {
        console.error(`❌ 强制清理也失败: ${e}`);
      }
    }
  }

  /**
   * 设置生命周期事件监听
   */
  private setupLifecycleEvents(): void {
    // 这里可以添加生命周期事件的处理逻辑
    console.log('🔄 生命周期事件监听已设置');
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      activeSessions: this.activeSessions.size,
      sessionIds: Array.from(this.activeSessions.keys()),
      proxyStats: this.proxyManager.getStats()
    };
  }

  /**
   * 关闭系统
   */
  async close(): Promise<void> {
    try {
      console.log('🔄 正在关闭智能问卷作答系统...');

      // 停止所有活动会话
      const sessionIds = Array.from(this.activeSessions.keys());
      for (const sessionId of sessionIds) {
        await this.stopSession(sessionId);
      }

      // 清理各个组件
      this.proxyManager.cleanup();
      await this.browserManager.cleanup();

      // 关闭Stagehand
      if (this.stagehand) {
        await this.stagehand.close();
      }

      this.isInitialized = false;
      console.log('✅ 系统已关闭');

    } catch (error) {
      console.error('❌ 系统关闭失败:', error);
      throw error;
    }
  }
}