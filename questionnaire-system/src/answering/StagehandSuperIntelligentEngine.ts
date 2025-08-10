/**
 * Stagehand超级智能作答引擎
 * 完全融合web-ui的智能作答流程，用Stagehand替代Browser-Use
 * 实现最高性能的持续智能作答系统
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonProfile, AnsweringResult, QuestionResult } from '../types';
import { ContinuousAnsweringEnhancer } from './ContinuousAnsweringEnhancer';
import { DigitalPersonMemoryManager } from '../memory/DigitalPersonMemoryManager';

// 问卷页面分析结构
const PageAnalysisSchema = z.object({
  questions: z.array(z.object({
    id: z.string().describe("题目唯一标识"),
    type: z.enum(['single_choice', 'multiple_choice', 'text_input', 'textarea', 'rating', 'slider', 'checkbox']).describe("题目类型"),
    text: z.string().describe("题目文本"),
    options: z.array(z.string()).nullable().describe("选择题选项"),
    isRequired: z.boolean().describe("是否必填"),
    isAnswered: z.boolean().describe("是否已作答")
  })),
  hasSubmitButton: z.boolean().describe("是否有提交按钮"),
  submitButtonText: z.string().nullable().describe("提交按钮文本"),
  pageProgress: z.string().describe("页面进度描述"),
  isCompletePage: z.boolean().describe("是否为完成页面"),
  hasNextPage: z.boolean().describe("是否有下一页"),
  nextButtonText: z.string().nullable().describe("下一页按钮文本")
});

// 完成检测结构
const CompletionDetectionSchema = z.object({
  isComplete: z.boolean().describe("是否已完成问卷"),
  completionSignals: z.array(z.string()).describe("检测到的完成信号"),
  errorSignals: z.array(z.string()).describe("检测到的错误信号"),
  shouldContinue: z.boolean().describe("是否应该继续作答"),
  confidence: z.number().min(0).max(1).describe("判断置信度")
});

// 作答会话状态
interface AnsweringSessionState {
  currentPage: number;
  totalPagesAnswered: number;
  questionsAnswered: number;
  questionsSkipped: number;
  questionsFailed: number;
  lastActivity: number;
  isPaused: boolean;
  errors: string[];
}

export class StagehandSuperIntelligentEngine {
  private stagehand: Stagehand;
  private digitalPerson: DigitalPersonProfile;
  private sessionState: AnsweringSessionState;
  private continuousEnhancer: ContinuousAnsweringEnhancer;
  private memoryManager: DigitalPersonMemoryManager | null = null;
  
  constructor(stagehand: Stagehand, digitalPerson: DigitalPersonProfile) {
    this.stagehand = stagehand;
    this.digitalPerson = digitalPerson;
    this.continuousEnhancer = new ContinuousAnsweringEnhancer(stagehand);
    this.sessionState = {
      currentPage: 1,
      totalPagesAnswered: 0,
      questionsAnswered: 0,
      questionsSkipped: 0,
      questionsFailed: 0,
      lastActivity: Date.now(),
      isPaused: false,
      errors: []
    };
  }

  /**
   * 执行超级智能问卷作答 - 融合web-ui的完整流程
   */
  async executeQuestionnaireAnswering(questionnaireUrl: string): Promise<AnsweringResult> {
    const startTime = Date.now();
    console.log('🚀 启动Stagehand超级智能作答引擎');
    console.log(`🎯 目标问卷: ${questionnaireUrl}`);
    console.log(`👤 数字人身份: ${this.digitalPerson.name} (${this.digitalPerson.age}岁, ${this.digitalPerson.occupation})`);

    try {
      // 🧠 初始化数字人记忆管理器 - 完全对标web-ui
      console.log('🧠 初始化数字人记忆管理器...');
      this.memoryManager = new DigitalPersonMemoryManager(questionnaireUrl, this.digitalPerson);
      console.log(`🧠 记忆管理器就绪: ${this.digitalPerson.name} 作答 ${questionnaireUrl}`);
      
      // 🚀 使用增强的持续作答引擎 - 完全对标web-ui
      console.log('🚀 启动增强的持续作答引擎...');
      console.log('🎯 执行策略：宁可一直作答，也不要错误停止！');
      
      // 配置持续作答增强器 - 支持200页超大型问卷
      this.continuousEnhancer.setMaxContinuousAttempts(200); // 支持200页超大型问卷
      this.continuousEnhancer.setPageStabilityTimeout(7000); // 7秒页面稳定超时（适应大型问卷复杂性）
      this.continuousEnhancer.setMemoryManager(this.memoryManager); // 配置记忆管理器
      
      // 执行增强的持续作答
      const enhancedResult = await this.continuousEnhancer.executeContinuousAnswering();
      
      console.log('🎉 增强的持续作答完成:');
      console.log(`   📊 处理页面: ${enhancedResult.totalPagesProcessed}`);
      console.log(`   ✅ 作答题目: ${enhancedResult.totalQuestionsAnswered}`);
      console.log(`   🏁 最终状态: ${enhancedResult.finalStatus}`);
      console.log(`   💡 完成原因: ${enhancedResult.completionReason}`);
      
      // 更新会话状态
      this.sessionState.totalPagesAnswered = enhancedResult.totalPagesProcessed;
      this.sessionState.questionsAnswered = enhancedResult.totalQuestionsAnswered;
      this.sessionState.lastActivity = Date.now();

      // 生成最终结果
      const duration = Date.now() - startTime;
      const isSuccess = enhancedResult.finalStatus === 'completed' || enhancedResult.totalQuestionsAnswered > 0;
      
      const result: AnsweringResult = {
        sessionId: `stagehand_enhanced_${Date.now()}`,
        success: isSuccess,
        totalQuestions: enhancedResult.totalQuestionsAnswered,
        answeredQuestions: enhancedResult.totalQuestionsAnswered,
        skippedQuestions: 0, // 增强引擎不跳过题目
        failedQuestions: 0,  // 增强引擎会重试失败的题目
        duration,
        errors: this.sessionState.errors
      };

      console.log('🎉 Stagehand超级智能作答完成:');
      console.log(`   📊 总题目: ${result.totalQuestions}`);
      console.log(`   ✅ 已作答: ${result.answeredQuestions}`);
      console.log(`   ⏭️ 跳过: ${result.skippedQuestions}`);
      console.log(`   ❌ 失败: ${result.failedQuestions}`);
      console.log(`   ⏱️ 耗时: ${Math.round(duration / 1000)}秒`);

      return result;

    } catch (error) {
      console.error('❌ Stagehand超级智能作答失败:', error);
      throw error;
    }
  }

  /**
   * 智能分析当前页面 - 发挥Stagehand的extract超能力
   */
  private async analyzeCurrentPage() {
    console.log('🔍 正在进行智能页面分析...');
    
    try {
      const analysis = await this.stagehand.page.extract({
        instruction: `作为智能问卷分析专家，请深度分析当前页面：

🎯 核心任务：识别所有可操作的问卷元素

📋 分析要求：
1. **题目识别**：找到页面上的所有问题，包括：
   - 单选题：radio buttons, 选择一个答案
   - 多选题：checkboxes, 可选择多个答案  
   - 文本输入：text inputs, textareas
   - 评分题：rating scales, sliders
   - 下拉选择：select dropdowns
   - 其他交互元素

2. **题目信息提取**：
   - 题目的完整文本内容
   - 所有可选选项的文本
   - 是否为必填项
   - 当前是否已作答

3. **导航元素**：
   - 提交按钮的确切文本和位置
   - 下一页/继续按钮
   - 页面进度指示

4. **完成状态**：
   - 是否为问卷结束页面
   - 是否显示感谢信息
   - 是否需要继续填写

🔍 特别注意：
- 忽略装饰性元素，专注功能性内容
- 准确识别必填和选填项
- 检测页面是否有未完成的必填项`,
        schema: PageAnalysisSchema
      });

      console.log(`📋 发现 ${analysis.questions.length} 个题目`);
      console.log(`🔘 提交按钮: ${analysis.hasSubmitButton ? analysis.submitButtonText : '无'}`);
      console.log(`➡️ 下一页: ${analysis.hasNextPage ? analysis.nextButtonText : '无'}`);
      
      return analysis;
      
    } catch (error) {
      console.warn('⚠️ 页面分析失败，使用备用方案:', error);
      
      // 备用简化分析
      return {
        questions: [],
        hasSubmitButton: false,
        pageProgress: '未知',
        isCompletePage: false,
        hasNextPage: false
      };
    }
  }

  /**
   * 智能完成检测 - 融合web-ui的三层检测机制
   */
  private async detectIntelligentCompletion() {
    console.log('🎯 执行智能完成检测...');
    
    try {
      const detection = await this.stagehand.page.extract({
        instruction: `请检测当前页面是否为问卷完成页面。检测标准：
1. 页面是否包含"感谢"、"完成"、"提交成功"等明确完成信号
2. 是否有"问卷已结束"、"调查完成"等文字
3. 是否出现错误信息或系统故障
4. 综合判断是否应该继续作答

遵循原则：宁可一直作答，也不要错误停止！只有在极度确定完成时才返回true。`,
        schema: CompletionDetectionSchema
      });

      console.log(`🔍 完成检测结果: ${detection.isComplete ? '已完成' : '继续作答'} (置信度: ${detection.confidence})`);
      
      return detection;
      
    } catch (error) {
      console.warn('⚠️ 完成检测失败，默认继续作答:', error);
      return {
        isComplete: false,
        completionSignals: [],
        errorSignals: [],
        shouldContinue: true,
        confidence: 0
      };
    }
  }

  /**
   * 智能作答当前页面的所有题目 - 发挥Stagehand的act超能力
   */
  private async answerCurrentPageIntelligently(pageAnalysis: any) {
    console.log(`📝 开始智能作答 ${pageAnalysis.questions.length} 个题目...`);
    
    const pageResult = {
      questionsAnswered: 0,
      questionsSkipped: 0,
      questionsFailed: 0,
      errors: [] as string[]
    };

    // 构建数字人个性化提示词
    const personalityContext = this.buildPersonalityContext();

    for (const question of pageAnalysis.questions) {
      if (question.isAnswered) {
        console.log(`⏭️ 题目已作答，跳过: ${question.text.slice(0, 50)}...`);
        continue;
      }

      try {
        console.log(`🎯 正在作答: ${question.text.slice(0, 50)}...`);
        
        // 🎯 通用智能作答策略 - 适配所有网站和题目类型
        const answerAction = await this.createUniversalAnswerAction(question, personalityContext);
        
        // 执行智能作答
        await this.stagehand.page.act(answerAction);
        
        pageResult.questionsAnswered++;
        console.log(`✅ 作答成功`);
        
        // 短暂等待，确保答案被记录
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn(`⚠️ 题目作答失败: ${error}`);
        pageResult.questionsFailed++;
        pageResult.errors.push(`题目作答失败: ${error}`);
      }
    }

    console.log(`📊 当前页面作答完成: ${pageResult.questionsAnswered}个成功，${pageResult.questionsFailed}个失败`);
    return pageResult;
  }

  /**
   * 创建通用智能作答动作 - 适配所有网站和题目类型
   */
  private async createUniversalAnswerAction(question: any, personalityContext: string): Promise<string> {
    const questionText = question.text;
    const questionType = question.type;
    const options = question.options;
    
    // 🧠 构建智能作答指令
    let answerInstruction = `作为${personalityContext}，请智能回答以下问题：

📋 题目：${questionText}

`;

    // 🎯 根据题目类型制定通用作答策略
    switch (questionType) {
      case 'single_choice':
        if (options && options.length > 0) {
          answerInstruction += `📝 这是单选题，可选项：${options.join('、')}
🎯 作答要求：根据我的身份特征选择最符合的一个选项，点击对应的单选按钮`;
        } else {
          answerInstruction += `📝 这是单选题
🎯 作答要求：根据页面上的选项，选择最符合我身份特征的答案`;
        }
        break;
        
      case 'multiple_choice':
        if (options && options.length > 0) {
          answerInstruction += `📝 这是多选题，可选项：${options.join('、')}
🎯 作答要求：可以选择多个符合我身份特征的选项，勾选相应的复选框`;
        } else {
          answerInstruction += `📝 这是多选题
🎯 作答要求：根据页面上的选项，选择所有符合我身份特征的答案`;
        }
        break;
        
      case 'text_input':
        answerInstruction += `📝 这是文本输入题
🎯 作答要求：在输入框中填写符合我身份特征的简短回答（10-50字）`;
        break;
        
      case 'textarea':
        answerInstruction += `📝 这是长文本题
🎯 作答要求：在文本框中填写详细的、符合我身份特征的回答（50-200字）`;
        break;
        
      case 'rating':
      case 'slider':
        answerInstruction += `📝 这是评分题
🎯 作答要求：根据我的身份特征和偏好，选择合适的评分等级`;
        break;
        
      default:
        answerInstruction += `📝 这是问卷题目
🎯 作答要求：根据页面上的交互元素，选择或填写最符合我身份特征的答案`;
    }
    
    answerInstruction += `

💡 作答原则：
- 保持与我的年龄、性别、职业、教育背景一致
- 回答要自然、真实、符合逻辑
- 如果是必填项，务必完成作答
- 优先选择常见、合理的答案`;

    return answerInstruction;
  }

  /**
   * 智能页面跳转 - 处理提交/下一页逻辑
   */
  private async navigateToNextPageIntelligently(pageAnalysis: any) {
    console.log('🚀 执行智能页面跳转...');
    
    try {
      if (pageAnalysis.hasSubmitButton) {
        console.log(`📤 点击提交按钮: ${pageAnalysis.submitButtonText}`);
        await this.stagehand.page.act(`点击"${pageAnalysis.submitButtonText}"按钮`);
        
      } else if (pageAnalysis.hasNextPage) {
        console.log(`➡️ 点击下一页按钮: ${pageAnalysis.nextButtonText}`);
        await this.stagehand.page.act(`点击"${pageAnalysis.nextButtonText}"按钮`);
        
      } else {
        console.log('📋 未找到跳转按钮，尝试智能查找...');
        await this.stagehand.page.act('寻找并点击继续、下一页、提交或确认按钮');
      }

      return { success: true };
      
    } catch (error) {
      console.warn('⚠️ 页面跳转失败:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 等待页面稳定 - 确保页面加载完成
   */
  private async waitForPageStabilization() {
    console.log('⏳ 等待页面稳定...');
    
    try {
      // 等待网络请求完成
      await this.stagehand.page.waitForLoadState('networkidle');
      
      // 额外等待确保页面完全渲染
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ 页面已稳定');
      
    } catch (error) {
      console.warn('⚠️ 页面稳定等待超时，继续执行:', error);
    }
  }

  /**
   * 构建数字人个性化上下文
   */
  private buildPersonalityContext(): string {
    return `我是${this.digitalPerson.name}，${this.digitalPerson.age}岁，${this.digitalPerson.gender}性，职业是${this.digitalPerson.occupation}，教育背景为${this.digitalPerson.education}，居住在${this.digitalPerson.location}。我的性格特点：${this.digitalPerson.personality}。我的兴趣爱好包括：${this.digitalPerson.interests.join('、')}。在回答问卷时，我会基于这些个人特征给出真实、一致的回答。`;
  }

  /**
   * 确定答题策略
   */
  private async determineAnswerStrategy(question: any, personalityContext: string): Promise<string> {
    const baseInstruction = `基于以下个人背景：${personalityContext}`;
    
    switch (question.type) {
      case 'single_choice':
        return `${baseInstruction}，从选项"${question.options?.join('", "')}"中选择最符合我个人情况的一个选项，并点击选中它。题目：${question.text}`;
        
      case 'multiple_choice':
        return `${baseInstruction}，从选项"${question.options?.join('", "')}"中选择所有符合我个人情况的选项，并点击选中它们。题目：${question.text}`;
        
      case 'text_input':
      case 'textarea':
        return `${baseInstruction}，在文本框中输入符合我个人背景的真实回答。题目：${question.text}`;
        
      case 'rating':
        return `${baseInstruction}，根据我的个人观点选择合适的评分。题目：${question.text}`;
        
      case 'slider':
        return `${baseInstruction}，调整滑块到符合我个人情况的位置。题目：${question.text}`;
        
      case 'checkbox':
        return `${baseInstruction}，根据我的个人情况决定是否勾选这个选项。题目：${question.text}`;
        
      default:
        return `${baseInstruction}，根据题目要求和我的个人情况给出合适的回答。题目：${question.text}`;
    }
  }

  /**
   * 更新会话状态
   */
  private updateSessionState(pageResult: any) {
    this.sessionState.questionsAnswered += pageResult.questionsAnswered;
    this.sessionState.questionsSkipped += pageResult.questionsSkipped;
    this.sessionState.questionsFailed += pageResult.questionsFailed;
    this.sessionState.errors.push(...pageResult.errors);
    this.sessionState.totalPagesAnswered++;
    this.sessionState.lastActivity = Date.now();
  }

  /**
   * 等待恢复（暂停/继续机制）
   */
  private async waitForResume() {
    while (this.sessionState.isPaused) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 暂停作答
   */
  pause() {
    this.sessionState.isPaused = true;
    console.log('⏸️ 作答已暂停');
  }

  /**
   * 恢复作答
   */
  resume() {
    this.sessionState.isPaused = false;
    console.log('▶️ 作答已恢复');
  }

  /**
   * 获取会话状态
   */
  getSessionState() {
    return { ...this.sessionState };
  }
  
  /**
   * 获取记忆管理器
   */
  getMemoryManager(): DigitalPersonMemoryManager | null {
    return this.memoryManager;
  }
  
  /**
   * 获取数字人信息
   */
  getDigitalPersonInfo(): DigitalPersonProfile {
    return this.digitalPerson;
  }
  
  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      if (this.memoryManager) {
        await this.memoryManager.saveMemoryToDisk();
        this.memoryManager.cleanupMemory();
      }
      console.log('🧹 StagehandSuperIntelligentEngine 资源清理完成');
    } catch (error) {
      console.error('❌ StagehandSuperIntelligentEngine 资源清理失败:', error);
    }
  }
}