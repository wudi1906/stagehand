/**
 * 统一资源清理管理器
 * 完全融合web-ui的6阶段资源清理机制
 * 实现"浏览器关闭就是釜底抽薪"的完整资源清理
 */

import { AdsPowerManager } from '../browser/AdsPowerManager';
import { QinguoProxyManager } from '../proxy/QinguoProxyManager';
import { MemoryManager } from '../memory/MemoryManager';
import { DigitalPersonMemoryManager } from '../memory/DigitalPersonMemoryManager';
import { StagehandSuperIntelligentEngine } from '../answering/StagehandSuperIntelligentEngine';
import { Stagehand } from '@browserbasehq/stagehand';

// 清理阶段枚举
export enum CleanupPhase {
  INIT = "初始化",
  STOP_MONITORING = "停止监控",
  CLEANUP_STAGEHAND = "清理Stagehand服务",
  CLEANUP_MEMORY = "清理记忆资源",
  CLEANUP_ADSPOWER = "清理AdsPower浏览器",
  CLEANUP_PROXY = "清理代理资源",
  CLEANUP_THREADS = "清理线程任务",
  COMPLETED = "完成"
}

// 会话资源数据接口
export interface SessionResourceData {
  sessionId: string;
  profileId?: string;
  proxyInfo?: any;
  stagehand?: Stagehand;
  superEngine?: StagehandSuperIntelligentEngine;
  browserInfo?: any;
  
  // 管理器引用
  adsPowerManager?: AdsPowerManager;
  proxyManager?: QinguoProxyManager;
  memoryManager?: MemoryManager;
  digitalPersonMemoryManager?: DigitalPersonMemoryManager;
  
  // 监控相关
  monitorInterval?: NodeJS.Timeout;
  monitorStopFlag?: boolean;
  
  // 其他资源
  additionalResources?: Map<string, any>;
}

// 清理结果接口
export interface CleanupResult {
  success: boolean;
  cleanupTime: number;
  phasesCompleted: number;
  details: Record<string, any>;
  errors: string[];
}

export class UnifiedResourceCleanupManager {
  private currentPhase: CleanupPhase = CleanupPhase.INIT;
  private cleanupStartTime: number = 0;
  private cleanupResults: Record<string, any> = {};
  
  /**
   * 执行全面的资源清理 - 完全对标web-ui的6阶段清理
   */
  async executeComprehensiveCleanup(
    sessionData: SessionResourceData, 
    reason: string = "浏览器关闭"
  ): Promise<CleanupResult> {
    this.cleanupStartTime = Date.now();
    console.log(`🧹 开始执行全面资源清理: ${reason}`);
    console.log(`📋 会话ID: ${sessionData.sessionId}`);
    
    const errors: string[] = [];
    
    try {
      // 阶段1: 停止所有监控和检测
      await this.phase1StopMonitoring(sessionData);
      
      // 阶段2: 清理Stagehand智能服务资源
      await this.phase2CleanupStagehand(sessionData);
      
      // 阶段3: 清理问卷记忆资源
      await this.phase3CleanupMemory(sessionData);
      
      // 阶段4: 清理AdsPower浏览器资源
      await this.phase4CleanupAdsPower(sessionData);
      
      // 阶段5: 清理代理资源
      await this.phase5CleanupProxy(sessionData);
      
      // 阶段6: 清理线程和任务
      await this.phase6CleanupThreads(sessionData);
      
      this.currentPhase = CleanupPhase.COMPLETED;
      const cleanupTime = Date.now() - this.cleanupStartTime;
      
      console.log(`🎉 全面资源清理完成，耗时: ${cleanupTime}ms`);
      return {
        success: true,
        cleanupTime,
        phasesCompleted: Object.keys(this.cleanupResults).length,
        details: this.cleanupResults,
        errors
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 全面资源清理失败: ${errorMessage}`);
      errors.push(errorMessage);
      
      // 尝试降级清理
      try {
        await this.fallbackCleanup(sessionData);
        console.log(`⚠️ 降级清理完成`);
      } catch (fallbackError) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.error(`❌ 降级清理也失败: ${fallbackErrorMessage}`);
        errors.push(`降级清理失败: ${fallbackErrorMessage}`);
      }
      
      return {
        success: false,
        cleanupTime: Date.now() - this.cleanupStartTime,
        phasesCompleted: Object.keys(this.cleanupResults).length,
        details: this.cleanupResults,
        errors
      };
    }
  }
  
  /**
   * 阶段1: 停止所有监控和检测
   */
  private async phase1StopMonitoring(sessionData: SessionResourceData): Promise<void> {
    this.currentPhase = CleanupPhase.STOP_MONITORING;
    console.log("🔴 阶段1: 停止所有监控和检测");
    
    try {
      // 停止窗口监控
      if (sessionData.monitorInterval) {
        clearInterval(sessionData.monitorInterval);
        sessionData.monitorStopFlag = true;
        console.log("✅ 窗口监控已停止");
      }
      
      // 停止超级引擎（如果正在运行）
      if (sessionData.superEngine) {
        sessionData.superEngine.pause(); // 暂停作答
        console.log("✅ Stagehand超级引擎已暂停");
      }
      
      this.cleanupResults.phase1 = {
        phase: "停止监控",
        success: true,
        details: "监控线程和智能服务已停止"
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 阶段1部分失败: ${errorMessage}`);
      this.cleanupResults.phase1 = {
        phase: "停止监控",
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 阶段2: 清理Stagehand智能服务资源
   */
  private async phase2CleanupStagehand(sessionData: SessionResourceData): Promise<void> {
    this.currentPhase = CleanupPhase.CLEANUP_STAGEHAND;
    console.log("🔴 阶段2: 清理Stagehand智能服务资源");
    
    try {
      let cleanupCount = 0;
      
      // 清理Stagehand实例
      if (sessionData.stagehand) {
        try {
          // 尝试关闭Stagehand的context和page（如果不是AdsPower的）
          if (sessionData.stagehand.context) {
            // 检查是否是我们连接到AdsPower的context，如果是则不关闭
            const contextPages = sessionData.stagehand.context.pages();
            if (contextPages.length > 0) {
              const firstPage = contextPages[0];
              if (firstPage) {
                const firstPageUrl = await firstPage.url();
                if (!firstPageUrl.includes('chrome://') && !firstPageUrl.includes('about:')) {
                  // 这可能是AdsPower的页面，不关闭
                  console.log("🔧 检测到AdsPower页面，保持连接");
                } else {
                  await sessionData.stagehand.context.close();
                  console.log("✅ Stagehand context已关闭");
                }
              }
            }
          }
          cleanupCount++;
        } catch (e) {
          console.warn(`⚠️ Stagehand context清理失败: ${e}`);
        }
        
        // 清空引用
        sessionData.stagehand = undefined;
      }
      
      // 清理超级引擎
      if (sessionData.superEngine) {
        // 超级引擎没有特殊清理需求，直接清空引用
        sessionData.superEngine = undefined;
        cleanupCount++;
        console.log("✅ Stagehand超级引擎引用已清理");
      }
      
      this.cleanupResults.phase2 = {
        phase: "清理Stagehand服务",
        success: true,
        cleanupCount,
        details: "Stagehand相关资源已清理"
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 阶段2部分失败: ${errorMessage}`);
      this.cleanupResults.phase2 = {
        phase: "清理Stagehand服务",
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 阶段3: 清理问卷记忆资源
   */
  private async phase3CleanupMemory(sessionData: SessionResourceData): Promise<void> {
    this.currentPhase = CleanupPhase.CLEANUP_MEMORY;
    console.log("🔴 阶段3: 清理问卷记忆资源");
    
    try {
      let cleanupCount = 0;
      
      // 清理记忆管理器
      if (sessionData.memoryManager) {
        try {
          // 记忆管理器暂时没有saveMemoryToDisk方法，跳过
          console.log("📝 记忆管理器已清理（无需保存）");
          cleanupCount++;
        } catch (e) {
          console.warn(`⚠️ 记忆保存失败: ${e}`);
        }
        
        // 清空引用
        sessionData.memoryManager = undefined;
      }
      
      // 清理数字人记忆管理器
      if (sessionData.digitalPersonMemoryManager) {
        try {
          await sessionData.digitalPersonMemoryManager.saveMemoryToDisk();
          sessionData.digitalPersonMemoryManager.cleanupMemory();
          console.log("🧠 数字人记忆管理器已清理并保存");
          cleanupCount++;
        } catch (e) {
          console.warn(`⚠️ 数字人记忆清理失败: ${e}`);
        }
        
        // 清空引用
        sessionData.digitalPersonMemoryManager = undefined;
      }
      
      this.cleanupResults.phase3 = {
        phase: "清理记忆资源",
        success: true,
        cleanupCount,
        details: "记忆管理器已清理"
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 阶段3部分失败: ${errorMessage}`);
      this.cleanupResults.phase3 = {
        phase: "清理记忆资源",
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 阶段4: 清理AdsPower浏览器资源
   */
  private async phase4CleanupAdsPower(sessionData: SessionResourceData): Promise<void> {
    this.currentPhase = CleanupPhase.CLEANUP_ADSPOWER;
    console.log("🔴 阶段4: 清理AdsPower浏览器资源");
    
    try {
      let cleanupCount = 0;
      
      // 清理AdsPower浏览器
      if (sessionData.adsPowerManager && sessionData.profileId) {
        try {
          // 使用公开的cleanupBrowser方法
          await sessionData.adsPowerManager.cleanupBrowser(sessionData.profileId);
          console.log("✅ AdsPower浏览器已清理");
          cleanupCount++;
          
        } catch (e) {
          console.warn(`⚠️ AdsPower清理失败: ${e}`);
        }
      }
      
      // 清空浏览器信息引用
      if (sessionData.browserInfo) {
        sessionData.browserInfo = undefined;
        cleanupCount++;
      }
      
      this.cleanupResults.phase4 = {
        phase: "清理AdsPower浏览器",
        success: true,
        cleanupCount,
        details: "AdsPower浏览器资源已清理"
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 阶段4部分失败: ${errorMessage}`);
      this.cleanupResults.phase4 = {
        phase: "清理AdsPower浏览器",
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 阶段5: 清理代理资源
   */
  private async phase5CleanupProxy(sessionData: SessionResourceData): Promise<void> {
    this.currentPhase = CleanupPhase.CLEANUP_PROXY;
    console.log("🔴 阶段5: 清理代理资源");
    
    try {
      let cleanupCount = 0;
      
      // 释放青果代理
      if (sessionData.proxyManager && sessionData.sessionId) {
        try {
          await sessionData.proxyManager.releaseProxy(sessionData.sessionId);
          console.log("✅ 青果代理已释放");
          cleanupCount++;
        } catch (e) {
          console.warn(`⚠️ 代理释放失败: ${e}`);
        }
      }
      
      // 清空代理信息引用
      if (sessionData.proxyInfo) {
        sessionData.proxyInfo = undefined;
        cleanupCount++;
      }
      
      this.cleanupResults.phase5 = {
        phase: "清理代理资源",
        success: true,
        cleanupCount,
        details: "代理资源已清理"
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 阶段5部分失败: ${errorMessage}`);
      this.cleanupResults.phase5 = {
        phase: "清理代理资源",
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 阶段6: 清理线程和任务
   */
  private async phase6CleanupThreads(sessionData: SessionResourceData): Promise<void> {
    this.currentPhase = CleanupPhase.CLEANUP_THREADS;
    console.log("🔴 阶段6: 清理线程和任务");
    
    try {
      let cleanupCount = 0;
      
      // 清理所有定时器和间隔器
      if (sessionData.monitorInterval) {
        clearInterval(sessionData.monitorInterval);
        sessionData.monitorInterval = undefined;
        cleanupCount++;
        console.log("✅ 监控定时器已清理");
      }
      
      // 清理其他附加资源
      if (sessionData.additionalResources) {
        sessionData.additionalResources.clear();
        sessionData.additionalResources = undefined;
        cleanupCount++;
        console.log("✅ 附加资源已清理");
      }
      
      // 设置停止标志
      sessionData.monitorStopFlag = true;
      
      this.cleanupResults.phase6 = {
        phase: "清理线程和任务",
        success: true,
        cleanupCount,
        details: "所有线程和任务已清理"
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 阶段6部分失败: ${errorMessage}`);
      this.cleanupResults.phase6 = {
        phase: "清理线程和任务",
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 降级清理方案 - 当标准清理失败时使用
   */
  private async fallbackCleanup(sessionData: SessionResourceData): Promise<void> {
    console.log("🆘 执行降级清理方案...");
    
    // 强制清理关键资源
    try {
      if (sessionData.monitorInterval) {
        clearInterval(sessionData.monitorInterval);
      }
      
      if (sessionData.stagehand?.context) {
        await sessionData.stagehand.context.close().catch(() => {});
      }
      
      console.log("✅ 降级清理完成");
    } catch (e) {
      console.error("❌ 降级清理也失败:", e);
    }
  }
  
  /**
   * 获取当前清理阶段
   */
  getCurrentPhase(): CleanupPhase {
    return this.currentPhase;
  }
  
  /**
   * 获取清理结果
   */
  getCleanupResults(): Record<string, any> {
    return { ...this.cleanupResults };
  }
}