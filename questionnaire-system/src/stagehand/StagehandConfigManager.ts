/**
 * Stagehand智能配置管理器
 * 实现OpenAI → Gemini自动降级策略
 */

import { Stagehand } from '@browserbasehq/stagehand';

export interface StagehandConfig {
  env: 'LOCAL' | 'BROWSERBASE';
  modelName: string;
  enableCaching: boolean;
  apiKey?: string;
  localBrowserLaunchOptions?: any;
}

export interface FallbackConfig {
  primary: {
    provider: 'openai' | 'google';
    modelName: string;
    apiKey: string;
  };
  fallback: {
    provider: 'google' | 'openai';
    modelName: string;
    apiKey: string;
  };
}

export class StagehandConfigManager {
  private config: FallbackConfig;

  constructor() {
    this.config = {
      primary: {
        provider: 'openai',
        modelName: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY || ''
      },
      fallback: {
        provider: 'google',
        modelName: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        apiKey: process.env.GEMINI_API_KEY || ''
      }
    };
  }

  /**
   * 创建Stagehand实例，支持智能降级
   */
  async createStagehand(options: Partial<StagehandConfig> = {}): Promise<Stagehand> {
    console.log('🚀 启动Stagehand智能配置管理器...');
    
    // 首先尝试主要API（OpenAI）
    try {
      console.log('🔄 尝试主要配置: OpenAI GPT-4o');
      const primaryConfig = this.buildPrimaryConfig(options);
      
      const stagehand = new Stagehand(primaryConfig);
      
      // 测试API连接
      await this.testStagehandConnection(stagehand);
      
      console.log('✅ 主要配置成功: OpenAI GPT-4o');
      return stagehand;
      
    } catch (primaryError) {
      console.warn('⚠️ 主要配置失败，启动降级策略:', primaryError);
      
      // 降级到备用API（Gemini）
      try {
        console.log('🔄 尝试降级配置: Gemini 2.0 Flash');
        const fallbackConfig = this.buildFallbackConfig(options);
        
        const stagehand = new Stagehand(fallbackConfig);
        
        // 测试API连接
        await this.testStagehandConnection(stagehand);
        
        console.log('✅ 降级配置成功: Gemini 2.0 Flash');
        return stagehand;
        
      } catch (fallbackError) {
        console.error('❌ 所有配置都失败:', fallbackError);
        throw new Error(`Stagehand初始化失败：主要API失败(${primaryError}), 降级API也失败(${fallbackError})`);
      }
    }
  }

  /**
   * 构建主要配置（OpenAI）
   */
  private buildPrimaryConfig(options: Partial<StagehandConfig>): StagehandConfig {
    if (!this.config.primary.apiKey) {
      throw new Error('OPENAI_API_KEY环境变量未设置');
    }

    return {
      env: 'LOCAL',
      modelName: this.config.primary.modelName,
      enableCaching: true,
      apiKey: this.config.primary.apiKey,
      ...options
    };
  }

  /**
   * 构建降级配置（Gemini）
   */
  private buildFallbackConfig(options: Partial<StagehandConfig>): StagehandConfig {
    if (!this.config.fallback.apiKey) {
      throw new Error('GEMINI_API_KEY环境变量未设置');
    }

    return {
      env: 'LOCAL',
      modelName: this.config.fallback.modelName,
      enableCaching: true,
      apiKey: this.config.fallback.apiKey,
      ...options
    };
  }

  /**
   * 测试Stagehand连接
   */
  private async testStagehandConnection(stagehand: Stagehand): Promise<void> {
    try {
      await stagehand.init();
      console.log('🔍 Stagehand连接测试成功');
    } catch (error) {
      console.error('🔍 Stagehand连接测试失败:', error);
      throw error;
    }
  }

  /**
   * 创建带有运行时降级功能的Stagehand实例
   */
  async createStagehandWithRuntimeFallback(options: Partial<StagehandConfig> = {}): Promise<Stagehand> {
    console.log('🚀 启动Stagehand运行时降级模式...');
    
    try {
      // 首先尝试OpenAI
      console.log('🔄 尝试主要配置: OpenAI GPT-4o');
      const primaryConfig = this.buildPrimaryConfig(options);
      const stagehand = new Stagehand(primaryConfig);
      await this.testStagehandConnection(stagehand);
      
      // 包装Stagehand的方法，添加运行时降级
      this.wrapStagehandWithFallback(stagehand);
      
      console.log('✅ 主要配置成功: OpenAI GPT-4o (已启用运行时降级)');
      
      // 创建包装器应用函数，供外部调用
      (stagehand as any).applyRuntimeFallback = () => {
        console.log('🔧 重新应用运行时降级包装器...');
        this.wrapStagehandWithFallback(stagehand);
      };
      
      return stagehand;
      
    } catch (primaryError) {
      console.warn('⚠️ 主要配置失败，直接使用降级配置:', primaryError);
      
      // 直接使用Gemini配置
      try {
        console.log('🔄 使用降级配置: Gemini 2.0 Flash');
        const fallbackConfig = this.buildFallbackConfig(options);
        const stagehand = new Stagehand(fallbackConfig);
        await this.testStagehandConnection(stagehand);
        
        console.log('✅ 降级配置成功: Gemini 2.0 Flash');
        return stagehand;
        
      } catch (fallbackError) {
        console.error('❌ 所有配置都失败:', fallbackError);
        throw new Error(`Stagehand初始化失败：主要API失败(${primaryError}), 降级API也失败(${fallbackError})`);
      }
    }
  }

  /**
   * 包装Stagehand方法，添加运行时降级
   */
  private wrapStagehandWithFallback(stagehand: Stagehand): void {
    const originalPage = stagehand.page;
    
    if (originalPage) {
      // 包装extract方法
      const originalExtract = originalPage.extract.bind(originalPage);
      (originalPage as any).extract = async (...args: any[]) => {
        console.log('🔧 运行时包装器：正在执行extract操作...');
        try {
          const result = await (originalExtract as any)(...args);
          console.log('✅ 运行时包装器：extract操作成功');
          return result;
        } catch (error: any) {
          console.log('⚠️ 运行时包装器：extract操作出错:', error?.message || String(error));
          if (this.isQuotaError(error)) {
            console.warn('⚠️ OpenAI配额已用完，运行时降级到Gemini...');
            return await this.fallbackToGemini(stagehand, 'extract', args);
          }
          throw error;
        }
      };

      // 包装act方法
      const originalAct = originalPage.act.bind(originalPage);
      (originalPage as any).act = async (...args: any[]) => {
        console.log('🔧 运行时包装器：正在执行act操作...');
        try {
          const result = await (originalAct as any)(...args);
          console.log('✅ 运行时包装器：act操作成功');
          return result;
        } catch (error: any) {
          console.log('⚠️ 运行时包装器：act操作出错:', error?.message || String(error));
          if (this.isQuotaError(error)) {
            console.warn('⚠️ OpenAI配额已用完，运行时降级到Gemini...');
            return await this.fallbackToGemini(stagehand, 'act', args);
          }
          throw error;
        }
      };

      // 包装observe方法
      const originalObserve = originalPage.observe.bind(originalPage);
      originalPage.observe = async (...args: any[]) => {
        try {
          return await originalObserve(...args);
        } catch (error: any) {
          if (this.isQuotaError(error)) {
            console.warn('⚠️ OpenAI配额已用完，运行时降级到Gemini...');
            return await this.fallbackToGemini(stagehand, 'observe', args);
          }
          throw error;
        }
      };
    }
  }

  /**
   * 检查是否是配额错误
   */
  private isQuotaError(error: any): boolean {
    const errorMessage = error?.message || String(error);
    return errorMessage.includes('429') || 
           errorMessage.includes('quota') || 
           errorMessage.includes('exceeded your current quota');
  }

  /**
   * 降级到Gemini执行操作
   */
  private async fallbackToGemini(stagehand: Stagehand, method: string, args: any[]): Promise<any> {
    console.log(`🔄 运行时降级：使用Gemini执行${method}操作...`);
    
    try {
      // 创建新的Gemini Stagehand实例
      const fallbackConfig = this.buildFallbackConfig({
        localBrowserLaunchOptions: {
          cdpUrl: `http://127.0.0.1:54207` // 使用固定端口，实际应从日志获取
        }
      });
      
      const geminiStagehand = new Stagehand(fallbackConfig);
      await geminiStagehand.init();
      
      // 执行对应方法
      const page = geminiStagehand.page;
      const methodFn = (page as any)[method];
      
      if (methodFn) {
        const result = await methodFn.apply(page, args);
        console.log(`✅ Gemini${method}操作成功`);
        return result;
      } else {
        throw new Error(`方法 ${method} 在Gemini Stagehand中不存在`);
      }
      
    } catch (fallbackError) {
      console.error(`❌ Gemini降级也失败:`, fallbackError);
      throw fallbackError;
    }
  }

  /**
   * 获取当前配置信息
   */
  getConfigInfo(): FallbackConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 Stagehand配置已更新');
  }
}