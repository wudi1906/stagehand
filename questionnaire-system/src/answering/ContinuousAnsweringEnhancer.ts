/**
 * 持续作答增强器
 * 完全融合web-ui的持续作答机制，实现最强的持续作答能力
 * 核心原则：宁可一直作答，也不要错误停止！
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonMemoryManager } from '../memory/DigitalPersonMemoryManager';
import { IntelligentCompletionManager } from '../completion/IntelligentCompletionManager';

// 页面状态分析结构
const PageStateSchema = z.object({
  hasQuestions: z.boolean().describe("页面是否包含问卷题目"),
  questionCount: z.number().describe("检测到的题目数量"),
  hasUnAnsweredQuestions: z.boolean().describe("是否有未作答的题目"),
  navigationOptions: z.object({
    hasNextButton: z.boolean().describe("是否有下一页按钮"),
    hasSubmitButton: z.boolean().describe("是否有提交按钮"),
    hasContinueButton: z.boolean().describe("是否有继续按钮"),
    nextButtonText: z.string().nullable().describe("下一页按钮文本"),
    submitButtonText: z.string().nullable().describe("提交按钮文本")
  }),
  pageType: z.enum(['questionnaire', 'confirmation', 'thank_you', 'error', 'unknown']).describe("页面类型"),
  completionSignals: z.array(z.string()).describe("检测到的完成信号")
});

// 导入完成检测结果接口
export type { CompletionDetectionResult } from '../completion/IntelligentCompletionManager';

// 导航操作结果
export interface NavigationResult {
  success: boolean;
  action: string;
  pageChanged: boolean;
  error?: string;
}

// 页面稳定状态
export interface PageStabilityResult {
  isStable: boolean;
  stabilityTime: number;
  changes: string[];
}

export class ContinuousAnsweringEnhancer {
  private stagehand: Stagehand;
  private maxContinuousAttempts: number = 200; // 支持200页超大型问卷
  private pageStabilityTimeout: number = 6000; // 页面稳定超时6秒，适应大型问卷
  private navigationRetryCount: number = 5; // 导航重试次数提升到5次
  private maxContinuousFailures: number = 8; // 最多连续失败8次（适应大型问卷的复杂性）
  private memoryManager: DigitalPersonMemoryManager | null = null; // 记忆管理器
  private completionManager: IntelligentCompletionManager; // 智能完成检测管理器
  
  // 完成信号关键词 - 完全对标web-ui的极简策略
  private readonly definiteCompletionSignals = [
    "问卷已完成", "调查结束", "调研已结束", "感谢您的参与",
    "survey completed", "questionnaire finished", "survey ended",
    "thank you for participating", "submission successful"
  ];
  
  // 完成页面URL特征
  private readonly completionUrlPatterns = [
    "thank-you", "completion", "success", "finished", "submitted", "complete"
  ];
  
  constructor(stagehand: Stagehand) {
    this.stagehand = stagehand;
    this.completionManager = new IntelligentCompletionManager(stagehand);
  }
  
  /**
   * 设置记忆管理器
   */
  setMemoryManager(memoryManager: DigitalPersonMemoryManager): void {
    this.memoryManager = memoryManager;
    console.log('🧠 持续作答增强器已配置记忆管理器');
  }
  
  /**
   * 执行增强的持续作答流程
   */
  async executeContinuousAnswering(): Promise<{
    totalPagesProcessed: number;
    totalQuestionsAnswered: number;
    finalStatus: string;
    completionReason: string;
  }> {
    console.log('🔄 启动增强的持续作答流程');
    console.log(`📋 配置：最多${this.maxContinuousAttempts}轮，页面稳定超时${this.pageStabilityTimeout}ms`);
    console.log(`🚀 超大问卷支持：最多连续失败${this.maxContinuousFailures}次，导航重试${this.navigationRetryCount}次`);
    
    let pagesProcessed = 0;
    let totalQuestionsAnswered = 0;
    let continuousFailures = 0;
    
    for (let attempt = 1; attempt <= this.maxContinuousAttempts; attempt++) {
      console.log(`\n🔄 === 第${attempt}/${this.maxContinuousAttempts}轮持续作答 ===`);
      
      try {
        // 步骤1: 深度页面状态分析
        const pageState = await this.performDeepPageAnalysis();
        console.log(`📊 页面状态:`, {
          hasQuestions: pageState.hasQuestions,
          questionCount: pageState.questionCount,
          pageType: pageState.pageType,
          hasNavigation: pageState.navigationOptions.hasNextButton || pageState.navigationOptions.hasSubmitButton
        });
        
        // 步骤2: 智能完成检测（融合web-ui三层检测机制）
        const completionResult = await this.completionManager.intelligentCompletionDetection(
          pageState, 
          Date.now() - attempt * 1000 // 估算执行时间
        );
        
        console.log(`🎯 智能完成检测:`, {
          isSuccess: completionResult.isSuccess,
          successType: completionResult.successType,
          shouldCleanup: completionResult.shouldCleanup,
          details: completionResult.details
        });
        
        // 如果智能检测确定完成，退出循环
        if (completionResult.isSuccess && completionResult.shouldCleanup) {
          console.log(`✅ 智能检测确认问卷完成: ${completionResult.details}`);
          return {
            totalPagesProcessed: pagesProcessed,
            totalQuestionsAnswered: totalQuestionsAnswered,
            finalStatus: 'completed',
            completionReason: completionResult.details
          };
        }
        
        // 步骤3: 如果有题目，进行智能作答
        if (pageState.hasQuestions && pageState.hasUnAnsweredQuestions) {
          console.log(`📝 开始作答 ${pageState.questionCount} 个题目...`);
          const answeredCount = await this.answerQuestionsIntelligently(pageState);
          totalQuestionsAnswered += answeredCount;
          console.log(`✅ 已作答 ${answeredCount} 个题目`);
        }
        
        // 步骤4: 智能导航到下一页
        const navigationResult = await this.performIntelligentNavigation(pageState);
        console.log(`🚀 导航结果:`, {
          success: navigationResult.success,
          action: navigationResult.action,
          pageChanged: navigationResult.pageChanged
        });
        
        if (!navigationResult.success) {
          console.log(`⚠️ 导航失败: ${navigationResult.error}`);
          continuousFailures++;
          
          if (continuousFailures >= this.maxContinuousFailures) {
            console.log(`❌ 连续导航失败${this.maxContinuousFailures}次，停止作答`);
            break;
          }
          continue;
        }
        
        // 步骤5: 等待页面稳定
        if (navigationResult.pageChanged) {
          console.log('⏳ 等待页面稳定...');
          const stabilityResult = await this.waitForPageStability();
          console.log(`📊 页面稳定状态:`, {
            isStable: stabilityResult.isStable,
            stabilityTime: stabilityResult.stabilityTime,
            changes: stabilityResult.changes.length
          });
        }
        
        pagesProcessed++;
        continuousFailures = 0; // 重置失败计数
        
        // 适应大型问卷的合理休息时间
        await new Promise(resolve => setTimeout(resolve, 1500)); // 增加到1.5秒，适应200页大型问卷
        
      } catch (error) {
        console.error(`❌ 第${attempt}轮作答异常:`, error);
        continuousFailures++;
        
        if (continuousFailures >= this.maxContinuousFailures) {
          console.log(`❌ 连续异常${this.maxContinuousFailures}次，停止作答`);
          break;
        }
      }
    }
    
    console.log(`🏁 持续作答流程结束`);
    return {
      totalPagesProcessed: pagesProcessed,
      totalQuestionsAnswered: totalQuestionsAnswered,
      finalStatus: pagesProcessed > 0 ? 'partial_completed' : 'failed',
      completionReason: `处理了${pagesProcessed}页，回答了${totalQuestionsAnswered}个问题`
    };
  }
  
  /**
   * 深度页面状态分析
   */
  private async performDeepPageAnalysis() {
    console.log('🔍 执行深度页面状态分析...');
    
    try {
      const pageState = await this.stagehand.page.extract({
        instruction: `请深度分析当前页面的状态，包括：
1. 检测所有问卷题目（单选、多选、填空、评分等）
2. 判断哪些题目还未作答
3. 找出所有导航按钮（下一页、提交、继续等）
4. 识别页面类型（问卷页、确认页、感谢页等）
5. 检测任何完成信号

请提供详细准确的分析结果。`,
        schema: PageStateSchema
      });
      
      return pageState;
      
    } catch (error) {
      console.warn('⚠️ 深度页面分析失败，尝试Gemini降级分析:', error);
      
      // 检查是否是429配额错误，如果是则尝试Gemini降级
      const errorMessage = String(error);
      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        console.log('🔄 检测到OpenAI配额用完，尝试使用Gemini进行页面分析...');
        try {
          const geminiResult = await this.fallbackToGeminiExtract({
            instruction: `请深度分析当前页面的状态，包括：
1. 检测所有问卷题目（单选、多选、填空、评分等）
2. 判断哪些题目还未作答
3. 找出所有导航按钮（下一页、提交、继续等）
4. 识别页面类型（问卷页、确认页、感谢页等）
5. 检测任何完成信号

请提供详细准确的分析结果。`,
            schema: PageStateSchema
          });
          console.log('✅ Gemini页面分析成功');
          return geminiResult;
        } catch (geminiError) {
          console.warn('❌ Gemini分析也失败，使用备用分析:', geminiError);
        }
      }
      
      // 最后的备用简化分析
      return {
        hasQuestions: true,
        questionCount: 1,
        hasUnAnsweredQuestions: true,
        navigationOptions: {
          hasNextButton: false,
          hasSubmitButton: false,
          hasContinueButton: false
        },
        pageType: 'unknown' as const,
        completionSignals: []
      };
    }
  }
  
  /**
   * Gemini降级Extract方法
   */
  private async fallbackToGeminiExtract(params: any): Promise<any> {
    console.log('🔄 创建Gemini Stagehand实例进行降级...');
    
    try {
      // 动态导入Stagehand
      const { Stagehand } = await import('@browserbasehq/stagehand');
      
      // 创建Gemini配置（使用GOOGLE_API_KEY）
      const geminiStagehand = new Stagehand({
        env: 'LOCAL',
        modelName: 'gemini-2.0-flash', // 使用标准Gemini模型名称
        enableCaching: true,
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY, // 优先使用GOOGLE_API_KEY
        localBrowserLaunchOptions: {
          cdpUrl: await this.getCurrentBrowserCdpUrl()
        }
      });
      
      await geminiStagehand.init();
      
      // 执行extract操作
      const result = await geminiStagehand.page.extract(params);
      
      console.log('✅ Gemini降级操作成功');
      return result;
      
    } catch (fallbackError) {
      console.error('❌ Gemini降级失败:', fallbackError);
      throw fallbackError;
    }
  }

  /**
   * 获取当前浏览器的CDP URL
   */
  private async getCurrentBrowserCdpUrl(): Promise<string> {
    try {
      // 尝试从当前stagehand获取CDP信息
      const currentUrl = await this.stagehand.page.url();
      console.log('🔍 当前页面URL:', currentUrl);
      
      // 从环境或全局变量获取当前运行的调试端口
      // 检查是否有全局存储的端口信息
      const currentPort = (global as any).currentAdsPowerPort || '57264'; // 从日志看到的实际端口
      const cdpUrl = `http://127.0.0.1:${currentPort}`;
      console.log('🔗 使用CDP URL:', cdpUrl);
      return cdpUrl;
    } catch (error) {
      console.warn('⚠️ 无法获取当前CDP端口，使用默认值');
      return `http://127.0.0.1:57264`; // 使用日志中显示的实际端口
    }
  }

  /**
   * 获取智能完成检测管理器
   */
  getCompletionManager(): IntelligentCompletionManager {
    return this.completionManager;
  }
  
  /**
   * 智能作答题目（融合记忆功能）
   */
  private async answerQuestionsIntelligently(pageState: any): Promise<number> {
    console.log(`📝 开始记忆增强智能作答 ${pageState.questionCount} 个题目...`);
    
    let answeredCount = 0;
    
    try {
      // 🧠 如果有记忆管理器，构建记忆增强的作答提示
      let memoryPrompt = '';
      if (this.memoryManager) {
        const progressInfo = this.memoryManager.getProgressInfo();
        const memorySummary = this.memoryManager.getMemorySummary();
        
        console.log(`🧠 记忆状态: 已作答${progressInfo.completedQuestions}题，完成率${progressInfo.completionRate.toFixed(1)}%`);
        
        // 构建记忆增强提示
        memoryPrompt = `
🧠 数字人记忆信息：
- 已作答题目数: ${progressInfo.completedQuestions}
- 当前进度: ${progressInfo.completionRate.toFixed(1)}%
- 作答风格保持一致性

📋 历史作答参考: 请保持与之前作答的一致性风格
`;
        
        // 如果有历史作答，提供参考
        if (memorySummary.questions.length > 0) {
          const recentAnswers = memorySummary.questions.slice(-3); // 最近3题
          memoryPrompt += `\n🔍 最近作答参考:\n`;
          recentAnswers.forEach((q: any, i: number) => {
            memoryPrompt += `${i + 1}. ${q.questionPreview} → ${q.answerText}\n`;
          });
        }
      }
      
      // 使用Stagehand的act能力进行记忆增强智能作答
      const enhancedPrompt = `请仔细分析并回答页面上的所有问卷题目。

${memoryPrompt}

📝 作答要求：
1. 仔细阅读题目内容
2. 根据数字人背景选择合适的答案
3. 确保所有必填题目都被回答
4. 保持作答风格的一致性
5. 对于开放性问题，给出简洁合理的回答

请逐个完成所有题目的作答。`;
      
      await this.stagehand.page.act(enhancedPrompt);
      
      // 🧠 记录作答到记忆中（简化版本）
      if (this.memoryManager) {
        const currentUrl = await this.stagehand.page.url();
        
        // 为每个题目创建记录（简化处理）
        for (let i = 0; i < pageState.questionCount; i++) {
          const questionId = this.memoryManager.recordQuestionAnswer(
            `页面${pageState.questionCount}题目${i + 1}`, // 简化的题目文本
            'mixed', // 混合类型
            [], // 选项列表
            'answered', // 作答结果
            `智能作答第${i + 1}题`, // 作答描述
            currentUrl, // 页面URL
            1, // 尝试次数
            0.9 // 信心度
          );
          
          console.log(`🧠 记录题目: ${questionId.substring(0, 8)}...`);
        }
        
        // 推进记忆位置
        this.memoryManager.advancePosition();
      }
      
      answeredCount = pageState.questionCount;
      console.log(`✅ 记忆增强作答完成 ${answeredCount} 个题目`);
      
    } catch (error) {
      console.warn('⚠️ 智能作答过程出现异常:', error);
      
      // 备用方案：尝试简单的作答
      try {
        await this.stagehand.page.act('尝试回答页面上的问卷题目');
        answeredCount = 1; // 估算作答了1个题目
        
        // 🧠 简单记录
        if (this.memoryManager) {
          const currentUrl = await this.stagehand.page.url();
          this.memoryManager.recordQuestionAnswer(
            '备用作答题目',
            'unknown',
            [],
            'backup_answered',
            '备用方案作答',
            currentUrl
          );
        }
      } catch (e) {
        console.error('❌ 备用作答方案也失败:', e);
      }
    }
    
    return answeredCount;
  }
  
  /**
   * 智能导航到下一页
   */
  private async performIntelligentNavigation(pageState: any): Promise<NavigationResult> {
    console.log('🚀 执行智能导航...');
    
    const navigationOptions = pageState.navigationOptions;
    
    // 优先级：提交按钮 > 下一页按钮 > 继续按钮 > 智能搜索
    try {
      if (navigationOptions.hasSubmitButton) {
        console.log('📤 点击提交按钮...');
        await this.stagehand.page.act(`点击"${navigationOptions.submitButtonText || '提交'}"按钮`);
        return {
          success: true,
          action: `点击提交按钮: ${navigationOptions.submitButtonText}`,
          pageChanged: true
        };
      }
      
      if (navigationOptions.hasNextButton) {
        console.log('➡️ 点击下一页按钮...');
        await this.stagehand.page.act(`点击"${navigationOptions.nextButtonText || '下一页'}"按钮`);
        return {
          success: true,
          action: `点击下一页按钮: ${navigationOptions.nextButtonText}`,
          pageChanged: true
        };
      }
      
      if (navigationOptions.hasContinueButton) {
        console.log('▶️ 点击继续按钮...');
        await this.stagehand.page.act('点击继续按钮');
        return {
          success: true,
          action: '点击继续按钮',
          pageChanged: true
        };
      }
      
      // 智能搜索导航按钮
      console.log('🔍 智能搜索导航按钮...');
      await this.stagehand.page.act('寻找并点击可以继续、下一页、提交或确认的按钮');
      return {
        success: true,
        action: '智能搜索并点击导航按钮',
        pageChanged: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ 导航操作失败: ${errorMessage}`);
      
      return {
        success: false,
        action: '导航失败',
        pageChanged: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 等待页面稳定
   */
  private async waitForPageStability(): Promise<PageStabilityResult> {
    const startTime = Date.now();
    const changes: string[] = [];
    
    try {
      // 等待网络请求完成
      await this.stagehand.page.waitForLoadState('networkidle', { timeout: this.pageStabilityTimeout });
      changes.push('网络请求已完成');
      
      // 额外等待DOM稳定
      await new Promise(resolve => setTimeout(resolve, 2000));
      changes.push('DOM结构已稳定');
      
      const stabilityTime = Date.now() - startTime;
      
      return {
        isStable: true,
        stabilityTime,
        changes
      };
      
    } catch (error) {
      console.warn('⚠️ 页面稳定等待超时，继续执行:', error);
      
      return {
        isStable: false,
        stabilityTime: Date.now() - startTime,
        changes: [...changes, '等待超时']
      };
    }
  }
  
  /**
   * 设置最大持续尝试次数
   */
  setMaxContinuousAttempts(attempts: number): void {
    this.maxContinuousAttempts = attempts;
    console.log(`🔧 设置最大持续尝试次数: ${attempts}`);
  }
  
  /**
   * 设置页面稳定超时时间
   */
  setPageStabilityTimeout(timeout: number): void {
    this.pageStabilityTimeout = timeout;
    console.log(`🔧 设置页面稳定超时: ${timeout}ms`);
  }
}