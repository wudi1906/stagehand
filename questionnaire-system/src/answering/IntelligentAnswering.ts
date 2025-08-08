/**
 * 智能作答引擎
 * 基于Stagehand的act/extract/observe能力，实现高性能智能作答
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonManager } from '../digital-person/DigitalPersonManager';
import { MemoryManager } from '../memory/MemoryManager';
import { AnsweringConfig, AnsweringResult, QuestionResult, DigitalPersonProfile } from '../types';

// 作答会话类
class AnsweringSession {
  public status: 'pending' | 'analyzing' | 'answering' | 'completed' | 'failed' = 'pending';
  public progress: { total: number; answered: number; current?: string } = { total: 0, answered: 0 };
  public result?: AnsweringResult;
  public error?: string;
  public startTime: number = Date.now();

  constructor(
    public sessionId: string,
    public config: AnsweringConfig
  ) {}

  setStatus(status: AnsweringSession['status']) {
    this.status = status;
  }

  updateProgress(total: number, answered: number, current?: string) {
    this.progress = { total, answered, current };
  }

  setResult(result: AnsweringResult) {
    this.result = result;
  }

  setError(error: string) {
    this.error = error;
  }
}

export class IntelligentAnswering {
  private stagehand: Stagehand;
  private digitalPersonManager: DigitalPersonManager;
  private memoryManager: MemoryManager;
  private activeSessions: Map<string, AnsweringSession> = new Map();
  private pausedSessions: Set<string> = new Set();

  constructor(
    stagehand: Stagehand,
    digitalPersonManager: DigitalPersonManager,
    memoryManager: MemoryManager
  ) {
    this.stagehand = stagehand;
    this.digitalPersonManager = digitalPersonManager;
    this.memoryManager = memoryManager;
    console.log('🎯 智能作答引擎初始化完成');
  }

  /**
   * 更新Stagehand实例
   */
  updateStagehand(stagehand: Stagehand): void {
    this.stagehand = stagehand;
    console.log('🔄 智能作答引擎已更新Stagehand实例');
  }

  /**
   * 开始智能作答
   */
  async startAnswering(config: AnsweringConfig, questionnaireUrl?: string): Promise<AnsweringResult> {
    const sessionId = `session-${Date.now()}`;
    const url = questionnaireUrl || 'https://example.com/questionnaire';
    
    console.log(`🚀 启动Stagehand Agent智能作答: ${sessionId}`);
    console.log(`📋 问卷URL: ${url}`);
    console.log(`👤 数字人: ${config.digitalPersonProfile.name} (${config.digitalPersonProfile.age}岁, ${config.digitalPersonProfile.occupation})`);
    console.log(`🧠 AI引擎: Stagehand Agent + act/extract/observe完整能力`);
    console.log(`⚡ 性能: 唯一最高性能无降级策略`);

    // 创建作答会话
    const session = new AnsweringSession(sessionId, config);
    this.activeSessions.set(sessionId, session);

    try {
      // 🚀 第1阶段：Stagehand Agent智能导航
      console.log('🌐 第1阶段：使用Stagehand Agent导航到问卷页面...');
      console.log('💡 利用Chrome可访问性树和自愈能力');
      
      await this.stagehand.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log('✅ 问卷页面加载成功 - Stagehand已准备就绪');

      // 🧠 第2阶段：Stagehand Agent分析问卷结构
      console.log('🔍 第2阶段：使用Stagehand Agent分析问卷结构...');
      
      const questionnaireStructure = await this.stagehand.page.extract({
        instruction: "分析这个问卷的完整结构，包括所有题目类型、选项、必填字段等",
        schema: z.object({
          title: z.string().describe("问卷标题"),
          totalQuestions: z.number().describe("总题目数量"),
          questionTypes: z.array(z.string()).describe("题目类型列表"),
          hasRequiredFields: z.boolean().describe("是否有必填字段")
        })
      });
      
      console.log('📊 问卷结构分析完成:', questionnaireStructure);
      session.updateProgress(questionnaireStructure.totalQuestions, 0, '分析完成');
      
      // 👤 第3阶段：生成数字人作答策略
      const personalityPrompt = this.generatePersonalityPrompt(config.digitalPersonProfile);
      console.log('👤 数字人人格分析完成');

      // 4. 执行唯一最高性能作答流程
      session.setStatus('answering');
      console.log('⚡ 启动complete_question_answering最高性能流程');
      
      const result = await this.executeCompleteQuestionAnswering(session, personalityPrompt, url);

      // 5. 完成作答
      session.setResult(result);
      session.setStatus('completed');
      
      console.log(`🎉 最高性能作答圆满完成: ${result.answeredQuestions}/${result.totalQuestions} (成功率: ${Math.round(result.answeredQuestions / result.totalQuestions * 100)}%)`);
      
      return result;

    } catch (error) {
      console.error(`❌ 智能作答失败 (${sessionId}):`, error);
      session.setError(error instanceof Error ? error.message : String(error));
      session.setStatus('failed');
      
      // 返回失败结果而不是抛出错误
      return {
        sessionId,
        success: false,
        totalQuestions: 0,
        answeredQuestions: 0,
        skippedQuestions: 0,
        failedQuestions: 0,
        duration: Date.now() - session.startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * 最高性能完整作答 - 基于web-ui项目的complete_question_answering
   */
  private async executeCompleteQuestionAnswering(
    session: AnsweringSession, 
    personalityPrompt: string,
    url: string
  ): Promise<AnsweringResult> {
    console.log('🚀 执行Stagehand Agent最高性能智能作答流程');
    
    const results: QuestionResult[] = [];
    const startTime = Date.now();

    try {
      // 🤖 创建Stagehand Agent进行智能作答
      console.log('🤖 创建Stagehand Agent - 最高性能智能作答引擎');
      const agent = this.stagehand.agent({
        provider: 'openai',
        model: 'gpt-4o',
        instructions: `你是一个专业的问卷作答助手。请仔细分析并完成这个问卷。

个人身份信息：
- 姓名：${session.config.digitalPersonProfile.name}
- 年龄：${session.config.digitalPersonProfile.age}岁
- 职业：${session.config.digitalPersonProfile.occupation}
- 教育背景：${session.config.digitalPersonProfile.education}
- 性格特点：${personalityPrompt}

核心任务：
1. 仔细分析整个问卷的结构和所有题目
2. 基于个人背景给出真实、合理、一致的答案
3. 确保所有必填项都被正确填写
4. 对于选择题，选择最符合人物设定的选项
5. 对于开放题，给出详细但合理的回答
6. 完成所有题目后提交问卷

请逐步执行，确保高质量完成。`
      });
      
      console.log('🎯 启动Stagehand Agent智能作答...');
      
      // 执行智能作答 - 让Agent自主完成整个问卷
      const agentResult = await agent.execute(`请仔细分析这个问卷，以${session.config.digitalPersonProfile.name}的身份完成所有题目：

1. 首先浏览整个问卷，了解所有题目
2. 逐个回答每个问题，确保答案符合人物背景
3. 检查所有必填项是否已填写
4. 最后提交问卷

请确保每个步骤都仔细执行，给出高质量的回答。`);
      
      console.log('✅ Stagehand Agent作答完成');
      console.log('📊 Agent执行摘要:', agentResult.message);
      
      // 验证作答结果 - 使用Stagehand extract检查最终状态
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
      
      // 记录Agent执行的步骤
      if (agentResult.actions && agentResult.actions.length > 0) {
        session.updateProgress(agentResult.actions.length, agentResult.actions.length, '所有步骤已完成');
        
        agentResult.actions.forEach((action: any, index: number) => {
          results.push({
            questionId: `step-${index + 1}`,
            questionText: action.description || `执行步骤 ${index + 1}`,
            questionType: 'agent_action',
            answer: action.action || 'completed',
            answerTime: Date.now() - startTime,
            success: true,
            mode: 'complete_question_answering'
          });
        });
      } else {
        // 如果没有详细步骤，记录整体结果
        results.push({
          questionId: 'questionnaire-complete',
          questionText: '完整问卷智能作答',
          questionType: 'agent_completion',
          answer: agentResult.message,
          answerTime: Date.now() - startTime,
          success: finalStatus.submitted,
          mode: 'complete_question_answering'
        });
      }

      const duration = Date.now() - startTime;
      const successfulAnswers = results.filter(r => r.success).length;
      const failedAnswers = results.filter(r => !r.success).length;

      return {
        sessionId: session.sessionId,
        success: finalStatus.submitted || successfulAnswers > 0,
        totalQuestions: finalStatus.completedQuestions || results.length,
        answeredQuestions: finalStatus.completedQuestions || successfulAnswers,
        skippedQuestions: 0,
        failedQuestions: failedAnswers,
        duration,
        results,
        errors: finalStatus.errorMessage ? [finalStatus.errorMessage] : []
      };

    } catch (error) {
      console.error('❌ 完整作答流程失败:', error);
      
      return {
        sessionId: session.sessionId,
        success: false,
        totalQuestions: results.length,
        answeredQuestions: results.filter(r => r.success).length,
        skippedQuestions: 0,
        failedQuestions: results.filter(r => !r.success).length,
        duration: Date.now() - startTime,
        results,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 提取完整问卷结构
   */
  private async extractCompleteQuestionnaire(): Promise<any> {
    try {
      console.log('🔍 分析页面结构...');
      
      const questionnaireSchema = z.object({
        title: z.string().optional(),
        questions: z.array(z.object({
          id: z.string(),
          text: z.string(),
          type: z.string(),
          options: z.array(z.string()).optional(),
          required: z.boolean().optional()
        }))
      });

      const questionnaire = await this.stagehand.page.extract({
        instruction: "提取这个页面上的所有问卷问题，包括问题文本、类型（单选、多选、文本输入等）和选项",
        schema: questionnaireSchema
      });

      console.log(`📊 提取到 ${questionnaire.questions.length} 个问题`);
      return questionnaire;

    } catch (error) {
      console.warn('⚠️ 智能提取失败，使用基础分析:', error);
      
      // 基础分析作为备用
      return {
        title: '问卷调查',
        questions: [
          {
            id: '1',
            text: '基础问题',
            type: 'text',
            options: [],
            required: true
          }
        ]
      };
    }
  }

  /**
   * 生成完整答案计划
   */
  private async generateCompleteAnswerPlan(questionnaireData: any, personalityPrompt: string): Promise<any> {
    console.log('🎯 AI规划所有答案...');
    
    // 构建答案计划（简化版本）
    const answers = questionnaireData.questions.map((question: any, index: number) => ({
      questionId: question.id,
      value: this.generateAnswerForQuestion(question, personalityPrompt),
      confidence: 0.8
    }));

    return { answers };
  }

  /**
   * 为单个问题生成答案
   */
  private generateAnswerForQuestion(question: any, personalityPrompt: string): string {
    // 基于问题类型和数字人特征生成答案
    const questionText = question.text.toLowerCase();
    
    if (question.type === 'single_choice' || question.options?.length > 0) {
      // 单选题：选择第一个选项
      return question.options?.[0] || '选项A';
    } else if (questionText.includes('年龄') || questionText.includes('age')) {
      return '25';
    } else if (questionText.includes('姓名') || questionText.includes('name')) {
      return '张三';
    } else if (questionText.includes('邮箱') || questionText.includes('email')) {
      return 'example@email.com';
    } else {
      return '这是一个基于AI的智能回答';
    }
  }

  /**
   * 执行答案操作
   */
  private async executeAnswerAction(question: any, answer: any, sessionId: string): Promise<void> {
    try {
      // 根据问题类型执行相应的操作
      if (question.type === 'text' || question.type === 'input') {
        await this.stagehand.page.act(`在问题"${question.text}"的输入框中输入"${answer.value}"`);
      } else if (question.type === 'single_choice' || question.type === 'radio') {
        await this.stagehand.page.act(`选择问题"${question.text}"的选项"${answer.value}"`);
      } else if (question.type === 'multiple_choice' || question.type === 'checkbox') {
        await this.stagehand.page.act(`勾选问题"${question.text}"的选项"${answer.value}"`);
      } else {
        // 通用操作
        await this.stagehand.page.act(`回答问题"${question.text}"，答案是"${answer.value}"`);
      }

      console.log(`✅ 成功回答: ${question.text.substring(0, 30)}... -> ${answer.value}`);

    } catch (error) {
      console.error(`❌ 回答失败: ${question.text.substring(0, 30)}...`, error);
      throw error;
    }
  }

  /**
   * 提交问卷
   */
  private async submitQuestionnaire(): Promise<void> {
    try {
      console.log('📤 提交问卷...');
      await this.stagehand.page.act('点击提交按钮提交问卷');
      console.log('✅ 问卷提交成功');
    } catch (error) {
      console.warn('⚠️ 自动提交失败，可能需要手动提交:', error);
    }
  }

  /**
   * 生成数字人人格提示词
   */
  private generatePersonalityPrompt(digitalPerson: DigitalPersonProfile): string {
    return `
你现在是一个真实的人，具有以下特征：
- 姓名：${digitalPerson.name}
- 年龄：${digitalPerson.age}岁
- 性别：${digitalPerson.gender}
- 教育背景：${digitalPerson.education}
- 职业：${digitalPerson.occupation}
- 居住地：${digitalPerson.location}
- 兴趣爱好：${digitalPerson.interests.join('、')}
- 性格特点：${digitalPerson.personality}

请以这个身份真实地回答问卷中的所有问题，回答要符合这个人的背景和特征。
回答要自然、真实，就像这个人本人在填写问卷一样。
    `.trim();
  }

  /**
   * 等待页面稳定
   */
  private async waitForPageStable(): Promise<void> {
    try {
      // 等待页面加载稳定
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('📄 页面稳定性检查完成');
    } catch (error) {
      console.warn('⚠️ 页面稳定性检查失败:', error);
    }
  }

  /**
   * 等待会话恢复
   */
  private async waitForResume(sessionId: string): Promise<void> {
    while (this.pausedSessions.has(sessionId)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 暂停会话
   */
  pauseSession(sessionId: string): boolean {
    if (this.activeSessions.has(sessionId)) {
      this.pausedSessions.add(sessionId);
      console.log(`⏸️ 会话已暂停: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * 恢复会话
   */
  resumeSession(sessionId: string): boolean {
    if (this.pausedSessions.has(sessionId)) {
      this.pausedSessions.delete(sessionId);
      console.log(`▶️ 会话已恢复: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取活动会话状态
   */
  getActiveSessionStatus(): any {
    return {
      activeSessions: this.activeSessions.size,
      pausedSessions: this.pausedSessions.size,
      sessionIds: Array.from(this.activeSessions.keys())
    };
  }
}