/**
 * 窗口监控系统
 * 完全融合web-ui的窗口关闭检测机制
 * 实现自动检测浏览器窗口关闭并触发资源清理
 */

import { UnifiedResourceCleanupManager, SessionResourceData } from './UnifiedResourceCleanupManager';
import { AdsPowerManager } from '../browser/AdsPowerManager';

// 监控状态枚举
export enum MonitoringStatus {
  IDLE = "空闲",
  MONITORING = "监控中", 
  WINDOW_CLOSED = "窗口已关闭",
  CLEANUP_IN_PROGRESS = "清理中",
  CLEANUP_COMPLETED = "清理完成",
  ERROR = "错误"
}

// 监控配置接口
export interface MonitoringConfig {
  checkInterval: number;        // 检查间隔(ms)
  maxRetries: number;          // 最大重试次数
  timeoutDuration: number;     // 超时时间(ms)
  enableAutoCleanup: boolean;  // 是否启用自动清理
}

// 监控会话接口
export interface MonitoringSession {
  sessionId: string;
  profileId: string;
  status: MonitoringStatus;
  startTime: number;
  lastCheckTime: number;
  checkCount: number;
  errorCount: number;
  
  // 资源数据
  sessionData: SessionResourceData;
  
  // 监控控制
  monitorInterval?: NodeJS.Timeout;
  stopFlag: boolean;
}

export class WindowMonitoringSystem {
  private cleanupManager: UnifiedResourceCleanupManager;
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private adsPowerManager: AdsPowerManager;
  
  // 默认监控配置
  private readonly defaultConfig: MonitoringConfig = {
    checkInterval: 10000,     // 10秒检查一次（调试优化）
    maxRetries: 3,           // 最多重试3次
    timeoutDuration: 10000,  // 10秒超时
    enableAutoCleanup: true  // 启用自动清理
  };
  
  constructor(adsPowerManager: AdsPowerManager) {
    this.cleanupManager = new UnifiedResourceCleanupManager();
    this.adsPowerManager = adsPowerManager;
    
    console.log('🛡️ 窗口监控系统初始化完成');
    console.log(`🔧 监控配置: 间隔${this.defaultConfig.checkInterval}ms, 重试${this.defaultConfig.maxRetries}次`);
  }
  
  /**
   * 开始监控会话 - 完全对标web-ui的窗口监控机制
   */
  startMonitoring(
    sessionId: string, 
    sessionData: SessionResourceData,
    config?: Partial<MonitoringConfig>
  ): void {
    const monitoringConfig = { ...this.defaultConfig, ...config };
    
    console.log(`🛡️ 开始监控会话: ${sessionId}`);
    console.log(`🖥️ 浏览器配置ID: ${sessionData.profileId}`);
    
    // 创建监控会话
    const monitoringSession: MonitoringSession = {
      sessionId,
      profileId: sessionData.profileId!,
      status: MonitoringStatus.MONITORING,
      startTime: Date.now(),
      lastCheckTime: Date.now(),
      checkCount: 0,
      errorCount: 0,
      sessionData,
      stopFlag: false
    };
    
    // 启动监控定时器
    monitoringSession.monitorInterval = setInterval(async () => {
      await this.performWindowCheck(monitoringSession, monitoringConfig);
    }, monitoringConfig.checkInterval);
    
    // 将监控定时器添加到会话数据中
    sessionData.monitorInterval = monitoringSession.monitorInterval;
    sessionData.monitorStopFlag = false;
    
    // 存储监控会话
    this.activeSessions.set(sessionId, monitoringSession);
    
    console.log(`✅ 会话 ${sessionId} 监控已启动`);
    console.log(`⏱️ 检查间隔: ${monitoringConfig.checkInterval}ms`);
  }
  
  /**
   * 执行窗口检查 - 核心监控逻辑
   */
  private async performWindowCheck(
    session: MonitoringSession, 
    config: MonitoringConfig
  ): Promise<void> {
    // 检查停止标志
    if (session.stopFlag || session.sessionData.monitorStopFlag) {
      this.stopMonitoring(session.sessionId, "手动停止");
      return;
    }
    
    session.checkCount++;
    session.lastCheckTime = Date.now();
    
    try {
      console.log(`🔍 执行窗口检查 ${session.checkCount}: ${session.sessionId}`);
      
      // 检查AdsPower浏览器状态
      const isWindowClosed = await this.checkAdsPowerWindowStatus(session.profileId);
      
      if (isWindowClosed) {
        console.log(`🚨 检测到窗口关闭: ${session.sessionId}`);
        session.status = MonitoringStatus.WINDOW_CLOSED;
        
        // 触发自动清理
        if (config.enableAutoCleanup) {
          await this.handleWindowClosed(session);
        }
      } else {
        // 窗口正常，重置错误计数
        session.errorCount = 0;
        
        // 定期打印监控状态（每10次检查打印一次）
        if (session.checkCount % 10 === 0) {
          console.log(`📊 监控状态更新: ${session.sessionId} - 检查${session.checkCount}次，窗口正常`);
        }
      }
      
    } catch (error) {
      session.errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 窗口检查失败 (${session.errorCount}/${config.maxRetries}): ${errorMessage}`);
      
      // 超过最大重试次数
      if (session.errorCount >= config.maxRetries) {
        console.error(`❌ 窗口检查超过最大重试次数，视为窗口关闭: ${session.sessionId}`);
        session.status = MonitoringStatus.WINDOW_CLOSED;
        
        if (config.enableAutoCleanup) {
          await this.handleWindowClosed(session);
        }
      }
    }
  }
  
  /**
   * 检查AdsPower窗口状态
   */
  private async checkAdsPowerWindowStatus(profileId: string): Promise<boolean> {
    try {
      // 调用AdsPower API检查浏览器状态  
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://local.adspower.net:50325/api/v1/browser/active?user_id=${profileId}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data: any = await response.json();
        
        // 检查浏览器是否仍在运行
        if (data.code === 0 && data.data && data.data.status === 'Active') {
          return false; // 窗口仍然打开
        } else {
          return true; // 窗口已关闭
        }
      } else {
        // API调用失败，可能是浏览器已关闭
        if (response.status === 404) {
          return true; // 404通常表示浏览器不存在
        }
        throw new Error(`AdsPower API 返回 ${response.status}`);
      }
      
    } catch (error) {
      // 网络错误或超时，需要进一步判断
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
        // 可能是网络问题，不一定是窗口关闭
        throw error;
      } else {
        // 其他错误，可能是窗口已关闭
        return true;
      }
    }
  }
  
  /**
   * 处理窗口关闭事件
   */
  private async handleWindowClosed(session: MonitoringSession): Promise<void> {
    console.log(`🚨 处理窗口关闭事件: ${session.sessionId}`);
    session.status = MonitoringStatus.CLEANUP_IN_PROGRESS;
    
    try {
      // 停止监控
      this.stopMonitoringTimer(session);
      
      // 执行全面资源清理
      console.log(`🧹 开始执行全面资源清理...`);
      const cleanupResult = await this.cleanupManager.executeComprehensiveCleanup(
        session.sessionData,
        "用户手动关闭浏览器窗口"
      );
      
      if (cleanupResult.success) {
        session.status = MonitoringStatus.CLEANUP_COMPLETED;
        console.log(`✅ 窗口关闭处理完成: ${session.sessionId}`);
        console.log(`🧹 清理耗时: ${cleanupResult.cleanupTime}ms`);
        console.log(`📊 清理阶段: ${cleanupResult.phasesCompleted}/6`);
      } else {
        session.status = MonitoringStatus.ERROR;
        console.error(`❌ 资源清理失败: ${session.sessionId}`);
        console.error(`🔍 错误详情:`, cleanupResult.errors);
      }
      
      // 从活动会话中移除
      this.activeSessions.delete(session.sessionId);
      
    } catch (error) {
      session.status = MonitoringStatus.ERROR;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 窗口关闭处理失败: ${errorMessage}`);
      
      // 即使处理失败，也要尝试停止监控
      this.stopMonitoringTimer(session);
    }
  }
  
  /**
   * 手动停止监控
   */
  stopMonitoring(sessionId: string, reason: string = "手动停止"): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ 未找到监控会话: ${sessionId}`);
      return;
    }
    
    console.log(`🛑 停止监控会话: ${sessionId} (${reason})`);
    
    // 设置停止标志
    session.stopFlag = true;
    session.sessionData.monitorStopFlag = true;
    
    // 停止定时器
    this.stopMonitoringTimer(session);
    
    // 更新状态
    session.status = MonitoringStatus.IDLE;
    
    // 从活动会话中移除
    this.activeSessions.delete(sessionId);
    
    console.log(`✅ 监控会话 ${sessionId} 已停止`);
  }
  
  /**
   * 停止监控定时器
   */
  private stopMonitoringTimer(session: MonitoringSession): void {
    if (session.monitorInterval) {
      clearInterval(session.monitorInterval);
      session.monitorInterval = undefined;
    }
    
    if (session.sessionData.monitorInterval) {
      clearInterval(session.sessionData.monitorInterval);
      session.sessionData.monitorInterval = undefined;
    }
  }
  
  /**
   * 获取监控状态
   */
  getMonitoringStatus(sessionId: string): MonitoringStatus | null {
    const session = this.activeSessions.get(sessionId);
    return session ? session.status : null;
  }
  
  /**
   * 获取所有活动会话
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }
  
  /**
   * 获取监控统计信息
   */
  getMonitoringStats(sessionId: string): any {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    return {
      sessionId: session.sessionId,
      status: session.status,
      runtime: Date.now() - session.startTime,
      checkCount: session.checkCount,
      errorCount: session.errorCount,
      lastCheck: session.lastCheckTime
    };
  }
  
  /**
   * 停止所有监控
   */
  stopAllMonitoring(): void {
    console.log(`🛑 停止所有监控会话 (共${this.activeSessions.size}个)`);
    
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => {
      this.stopMonitoring(sessionId, "系统关闭");
    });
    
    console.log(`✅ 所有监控会话已停止`);
  }
}