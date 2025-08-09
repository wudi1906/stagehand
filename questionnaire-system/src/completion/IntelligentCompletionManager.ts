/**
 * 智能完成检测管理器
 * 完全融合web-ui的三层智能完成检测系统
 * 核心原则：宁可一直作答，也不要错误停止！
 */

import { Stagehand } from '@browserbasehq/stagehand';

// 完成检测结果接口
export interface CompletionDetectionResult {
  isSuccess: boolean;
  successType: string;
  completionScore?: number;
  shouldCleanup: boolean;
  details: string;
  detectionTime: string;
  executionTime: number;
}

// 页面状态历史接口
export interface PageStateHistory {
  timestamp: string;
  url: string;
  title: string;
  completionResult: CompletionDetectionResult;
}

// 检测配置接口
export interface DetectionConfig {
  enableStrictDetection: boolean;
  enableErrorDetection: boolean;
  enableContinuationDetection: boolean;
  maxHistoryRecords: number;
}

export class IntelligentCompletionManager {
  private stagehand: Stagehand;
  
  // 🔧 极度简化的完成检测 - 只保留最明确的完成信号
  // 原则：宁可一直作答，也不要错误停止！
  private readonly completionSignals = [
    // 只保留极度明确的完成信号，避免误判
    "问卷已完成", "调查结束", "调研已结束", "感谢您的参与",
    "survey completed", "questionnaire finished", "survey ended",
    "thank you for participating", "submission successful"
  ];
  
  // 🔧 极度简化的URL模式 - 只检测明确的完成页面
  private readonly completionUrlPatterns = [
    "thank-you", "completion", "success-page", "finished", 
    "submitted", "complete", "end-survey"
  ];
  
  // 🔧 极度简化的错误检测 - 只检测明确的技术故障
  private readonly errorKeywords = [
    "系统崩溃", "server error", "服务器故障", "网站维护中",
    "system error", "maintenance", "service unavailable"
  ];
  
  // 页面状态追踪
  private pageStateHistory: PageStateHistory[] = [];
  private lastCompletionCheck: Date | null = null;
  private completionCheckCount = 0;
  
  // 检测配置
  private config: DetectionConfig = {
    enableStrictDetection: true,
    enableErrorDetection: true,
    enableContinuationDetection: true,
    maxHistoryRecords: 10
  };
  
  constructor(stagehand: Stagehand) {
    this.stagehand = stagehand;
    console.log('🎯 智能完成检测管理器初始化完成');
    console.log('🎯 检测策略：宁可一直作答，也不要错误停止！');
  }
  
  /**
   * 智能答题完成检测
   * 完全对标web-ui的三层检测机制
   */
  async intelligentCompletionDetection(agentResult: any, executionTime: number): Promise<CompletionDetectionResult> {
    try {
      console.log('🎯 开始智能完成检测...');
      this.completionCheckCount++;
      
      // 获取当前页面信息
      const currentUrl = await this.stagehand.page.url();
      const currentTitle = await this.stagehand.page.title();
      
      console.log(`🔍 检测页面: ${currentUrl}`);
      console.log(`📄 页面标题: ${currentTitle}`);
      
      // 获取页面内容
      let bodyText = '';
      try {
        bodyText = await this.stagehand.page.locator('body').textContent() || '';
      } catch (error) {
        console.warn(`⚠️ 获取页面内容失败:`, error);
        bodyText = '';
      }
      
      const bodyTextLower = bodyText.toLowerCase();
      
      // 1. 检测严格完成标志
      const hasStrictCompletion = await this.detectStrictCompletionSignals(currentUrl, bodyTextLower);
      
      // 2. 检测错误指示器
      const hasErrorIndicators = await this.detectErrorIndicators(bodyTextLower);
      
      // 3. 检测问卷继续状态（简化版）
      const stillInQuestionnaire = await this.detectQuestionnaireContinuation(bodyTextLower);
      
      let completionResult: CompletionDetectionResult;
      
      // 4. 极度宽松的判断逻辑 - 优先保证继续作答
      // 原则：宁可一直作答，也不要错误停止！
      if (hasStrictCompletion) {
        // 只有检测到极度明确的完成信号才算完成
        completionResult = {
          isSuccess: true,
          successType: "complete",
          completionScore: 0.95,
          shouldCleanup: true,
          details: "检测到明确的问卷结束信号",
          detectionTime: new Date().toISOString(),
          executionTime
        };
        console.log("✅ 智能检测：检测到明确结束信号，问卷已完成");
        
      } else {
        // 所有其他情况都继续作答！
        // 包括：有错误指示、仍在问卷中、不确定状态 = 一律继续
        completionResult = {
          isSuccess: false,
          successType: "continue_answering",
          shouldCleanup: false,
          details: "继续智能作答流程，确保所有题目都能完成",
          detectionTime: new Date().toISOString(),
          executionTime
        };
        console.log("🔄 智能检测：继续作答流程（优先保证完整作答）");
      }
      
      // 记录检测历史
      this.recordDetectionHistory(currentUrl, currentTitle, completionResult);
      
      return completionResult;
      
    } catch (error) {
      console.error(`❌ 智能完成检测异常:`, error);
      
      // 异常时默认继续作答
      const errorResult: CompletionDetectionResult = {
        isSuccess: false,
        successType: "detection_error",
        shouldCleanup: false,
        details: `检测过程异常: ${error instanceof Error ? error.message : String(error)}`,
        detectionTime: new Date().toISOString(),
        executionTime
      };
      
      return errorResult;
    }
  }
  
  /**
   * 检测严格完成信号 - 极度简化版，只检测最明确的完成信号
   */
  private async detectStrictCompletionSignals(currentUrl: string, bodyText: string): Promise<boolean> {
    try {
      console.log('🔍 严格完成信号检测...');
      
      // 🔧 极度简化：只检测最明确的完成信号，不进行复杂的问卷页面判断
      // 原则：宁可一直作答，也不要错误停止！
      
      // 1. 检查URL是否包含明确的完成标识
      const urlLower = currentUrl.toLowerCase();
      for (const pattern of this.completionUrlPatterns) {
        if (urlLower.includes(pattern)) {
          console.log(`✅ URL检测到明确完成信号: ${pattern}`);
          return true;
        }
      }
      
      // 2. 检查页面内容是否包含明确的完成信号
      for (const signal of this.completionSignals) {
        if (bodyText.includes(signal.toLowerCase())) {
          console.log(`✅ 页面内容检测到明确完成信号: ${signal}`);
          return true;
        }
      }
      
      // 3. 检查是否有明确的完成元素
      const completionSelectors = [
        'text="问卷已完成"', 
        'text="survey completed"', 
        'text="questionnaire finished"',
        'text="thank you"',
        'text="submission successful"'
      ];
      
      for (const selector of completionSelectors) {
        try {
          const elementCount = await this.stagehand.page.locator(selector).count();
          if (elementCount > 0) {
            console.log(`✅ 页面元素检测到明确完成信号: ${selector}`);
            return true;
          }
        } catch (error) {
          // 忽略单个元素检测错误
          continue;
        }
      }
      
      console.log('🔄 未检测到明确完成信号，继续作答');
      return false;
      
    } catch (error) {
      console.error(`❌ 严格完成信号检测异常:`, error);
      return false; // 异常时继续作答
    }
  }
  
  /**
   * 检测错误指示器 - 极度宽松，几乎不检测错误（优先保证继续作答）
   */
  private async detectErrorIndicators(bodyText: string): Promise<boolean> {
    try {
      // 原则：宁可一直作答，也不要错误停止！
      // 只检测极少数明确的技术错误，忽略所有正常的问卷提示
      
      console.log('🔍 错误检测：采用极度宽松策略，优先保证继续作答');
      
      // 只检查极少数明确的技术故障
      for (const keyword of this.errorKeywords) {
        if (bodyText.includes(keyword.toLowerCase())) {
          console.warn(`⚠️ 检测到明确的技术错误: ${keyword}`);
          return true;
        }
      }
      
      // 完全跳过元素检测，避免误判正常的必填字段、提示等
      // 注释掉所有元素检测逻辑
      
      // 默认返回false，表示没有错误，继续作答
      console.log('✅ 错误检测：未发现明确错误，继续作答流程');
      return false;
      
    } catch (error) {
      console.warn(`⚠️ 错误指示器检测异常:`, error);
      // 异常时也返回false，继续作答
      return false;
    }
  }
  
  /**
   * 检测问卷继续状态 - 极度简化版
   */
  private async detectQuestionnaireContinuation(bodyText: string): Promise<boolean> {
    try {
      // 🔧 极度简化：默认认为仍在问卷中，优先保证继续作答
      // 原则：宁可一直作答，也不要错误停止！
      console.log('🔄 问卷继续状态检测：默认继续作答');
      return true;
      
    } catch (error) {
      console.error(`❌ 问卷继续状态检测异常:`, error);
      return true; // 异常时也继续作答
    }
  }
  
  /**
   * 记录检测历史
   */
  private recordDetectionHistory(url: string, title: string, completionResult: CompletionDetectionResult): void {
    const historyRecord: PageStateHistory = {
      timestamp: new Date().toISOString(),
      url,
      title,
      completionResult
    };
    
    this.pageStateHistory.push(historyRecord);
    
    // 限制历史记录长度
    if (this.pageStateHistory.length > this.config.maxHistoryRecords) {
      this.pageStateHistory = this.pageStateHistory.slice(-this.config.maxHistoryRecords);
    }
    
    this.lastCompletionCheck = new Date();
    
    console.log(`📝 记录检测历史: ${url} -> ${completionResult.successType}`);
  }
  
  /**
   * 获取检测历史
   */
  getDetectionHistory(): PageStateHistory[] {
    return [...this.pageStateHistory];
  }
  
  /**
   * 重置检测历史
   */
  resetDetectionHistory(): void {
    this.pageStateHistory = [];
    this.lastCompletionCheck = null;
    this.completionCheckCount = 0;
    console.log('🔄 检测历史已重置');
  }
  
  /**
   * 获取检测统计
   */
  getDetectionStats(): any {
    return {
      totalChecks: this.completionCheckCount,
      lastCheck: this.lastCompletionCheck?.toISOString(),
      historyCount: this.pageStateHistory.length,
      completionCount: this.pageStateHistory.filter(h => h.completionResult.isSuccess).length,
      continuationCount: this.pageStateHistory.filter(h => !h.completionResult.isSuccess).length
    };
  }
  
  /**
   * 更新检测配置
   */
  updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 检测配置已更新:', this.config);
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): DetectionConfig {
    return { ...this.config };
  }
  
  /**
   * 强制检测完成（用于测试或特殊情况）
   */
  forceCompletion(reason: string = "强制完成"): CompletionDetectionResult {
    const result: CompletionDetectionResult = {
      isSuccess: true,
      successType: "forced_completion",
      completionScore: 1.0,
      shouldCleanup: true,
      details: reason,
      detectionTime: new Date().toISOString(),
      executionTime: 0
    };
    
    console.log(`🔴 强制完成检测: ${reason}`);
    return result;
  }
  
  /**
   * 强制继续（用于测试或特殊情况）
   */
  forceContinuation(reason: string = "强制继续"): CompletionDetectionResult {
    const result: CompletionDetectionResult = {
      isSuccess: false,
      successType: "forced_continuation",
      shouldCleanup: false,
      details: reason,
      detectionTime: new Date().toISOString(),
      executionTime: 0
    };
    
    console.log(`🔄 强制继续检测: ${reason}`);
    return result;
  }
}