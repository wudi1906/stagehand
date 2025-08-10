/**
 * 最纯净的Stagehand引擎
 * 完整智能作答流程：extract → 数字人推理 → act → 导航
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonProfile } from '../types';

// 问卷页面结构定义
const QuestionnairePageSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(['single', 'multiple', 'text', 'scale']),
    options: z.array(z.string()).nullable(),
    currentAnswer: z.string().nullable()
  })),
  hasNextButton: z.boolean(),
  hasSubmitButton: z.boolean(),
  nextButtonText: z.string().nullable(),
  submitButtonText: z.string().nullable(),
  isCompleted: z.boolean()
});

export interface PureStagehandResult {
  success: boolean;
  totalAnswered: number;
  totalPages: number;
  logs: string[];
  error?: string;
}

export class PureStagehandEngine {
  private digitalPerson: DigitalPersonProfile;
  private logs: string[] = [];

  constructor(digitalPerson: DigitalPersonProfile) {
    this.digitalPerson = digitalPerson;
    this.log('🎯 最纯净Stagehand引擎启动');
    this.log(`👤 数字人: ${digitalPerson.name}`);
  }

  private log(message: string): void {
    console.log(message);
    this.logs.push(message);
  }

  /**
   * 完整智能作答流程：extract → 数字人推理 → act → 导航
   */
  async executePureAnswering(debugPort: number): Promise<PureStagehandResult> {
    this.log('\n🚀 === 完整智能作答开始 ===');
    this.log('⚡ extract → 数字人推理 → act → 导航');
    
    let stagehand: Stagehand | null = null;
    let totalAnswered = 0;
    let totalPages = 0;
    
    try {
      // 创建Stagehand实例
      this.log('\n📋 创建Stagehand实例');
      this.log(`🔗 连接到调试端口: ${debugPort}`);
      
      const geminiApiKey = process.env.GOOGLE_API_KEY;
      if (!geminiApiKey) {
        throw new Error('缺少GOOGLE_API_KEY环境变量');
      }
      
      this.log(`🔑 使用Gemini API Key: ${geminiApiKey.slice(0, 10)}...`);
      
      stagehand = new Stagehand({
        env: 'LOCAL',
        apiKey: geminiApiKey,
        modelName: 'gemini-1.5-flash',
        localBrowserLaunchOptions: {
          cdpUrl: `http://127.0.0.1:${debugPort}`
        }
      });
      
      await stagehand.init();
      this.log('✅ Stagehand实例创建并连接成功');
      
      // 验证页面
      const title = await stagehand.page.title();
      this.log(`📋 页面标题: ${title}`);
      
      // 开始持续作答循环
      let maxPages = 50; // 最多处理50页，防止无限循环
      let currentPage = 1;
      
      while (currentPage <= maxPages) {
        this.log(`\n📄 === 处理第 ${currentPage} 页 ===`);
        totalPages = currentPage;
        
        // 使用extract分析当前页面
        const pageAnalysis = await this.analyzePage(stagehand);
        
        if (!pageAnalysis) {
          this.log('❌ 页面分析失败，尝试继续');
          break;
        }
        
        if (pageAnalysis.isCompleted) {
          this.log('🎉 问卷已完成！');
          break;
        }
        
        // 作答当前页面的所有题目
        const answeredOnPage = await this.answerQuestionsOnPage(stagehand, pageAnalysis.questions);
        totalAnswered += answeredOnPage;
        
        this.log(`📊 本页作答: ${answeredOnPage} 题，总计: ${totalAnswered} 题`);
        
        // 导航到下一页或提交
        const navigated = await this.navigateToNext(stagehand, pageAnalysis);
        
        if (!navigated) {
          this.log('🏁 无法继续导航，作答结束');
          break;
        }
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        currentPage++;
      }
      
      this.log(`\n🎉 === 完整作答完成 ===`);
      this.log(`📊 总计作答: ${totalAnswered} 题`);
      this.log(`📄 总计页数: ${totalPages} 页`);
      
      return {
        success: true,
        totalAnswered,
        totalPages,
        logs: this.logs
      };

    } catch (error: any) {
      this.log(`❌ 智能作答失败: ${error.message || error}`);
      this.log(`🔍 错误详情: ${JSON.stringify(error, null, 2)}`);
      
      return {
        success: false,
        totalAnswered,
        totalPages,
        logs: this.logs,
        error: error.message || String(error)
      };
      
    } finally {
      if (stagehand) {
        try {
          this.log('🧹 清理Stagehand实例...');
          await stagehand.close();
          this.log('✅ Stagehand实例已清理');
        } catch (cleanupError) {
          this.log(`⚠️ 清理时出错: ${cleanupError}`);
        }
      }
    }
  }

  /**
   * 分析当前页面的所有题目
   */
  private async analyzePage(stagehand: Stagehand): Promise<any> {
    try {
      this.log('🔍 使用extract分析页面结构...');
      
      const analysis = await stagehand.page.extract({
        instruction: `分析这个问卷页面，识别所有题目。对于每个题目，提取：
        1. 题目文本
        2. 题目类型（单选single/多选multiple/文本text/评分scale）
        3. 所有选项
        4. 当前是否已选择答案
        同时检查页面是否有"下一页"、"提交"等导航按钮。`,
        schema: QuestionnairePageSchema
      });
      
      this.log(`📊 分析结果: 发现 ${analysis.questions?.length || 0} 个题目`);
      this.log(`🔄 导航状态: 下一页=${analysis.hasNextButton}, 提交=${analysis.hasSubmitButton}`);
      
      return analysis;
      
    } catch (error: any) {
      this.log(`❌ 页面分析失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 作答页面上的所有题目
   */
  private async answerQuestionsOnPage(stagehand: Stagehand, questions: any[]): Promise<number> {
    let answered = 0;
    
    if (!questions || questions.length === 0) {
      this.log('⚠️ 本页没有发现题目');
      return 0;
    }
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      this.log(`\n⚡ 作答第 ${i + 1} 题: ${question.text}`);
      
      // 如果已经有答案，跳过
      if (question.currentAnswer) {
        this.log(`⏭️ 题目已有答案: ${question.currentAnswer}`);
        continue;
      }
      
      // 数字人推理选择答案
      const selectedAnswer = this.getDigitalPersonAnswer(question);
      this.log(`🧠 数字人选择: ${selectedAnswer}`);
      
      try {
        // 使用act执行作答
        await this.executeAnswer(stagehand, question, selectedAnswer);
        answered++;
        this.log(`✅ 第 ${i + 1} 题作答完成`);
        
        // 短暂等待
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error: any) {
        this.log(`❌ 第 ${i + 1} 题作答失败: ${error.message}`);
      }
    }
    
    return answered;
  }

  /**
   * 数字人智能推理选择答案
   */
  private getDigitalPersonAnswer(question: any): string {
    const { name, age, gender, occupation, education, location, income, maritalStatus, personality } = this.digitalPerson;
    
    // 根据题目类型和数字人特征智能选择
    const questionText = question.text.toLowerCase();
    
    // 性别相关
    if (questionText.includes('性别') || questionText.includes('gender')) {
      return gender === 'male' ? '男' : '女';
    }
    
    // 年龄相关
    if (questionText.includes('年龄') || questionText.includes('age')) {
      if (age < 25) return question.options?.find((opt: string) => opt.includes('25岁以下')) || question.options?.[0];
      if (age < 35) return question.options?.find((opt: string) => opt.includes('25-35')) || question.options?.[1];
      return question.options?.find((opt: string) => opt.includes('35岁以上')) || question.options?.[2];
    }
    
    // 职业相关
    if (questionText.includes('职业') || questionText.includes('工作')) {
      return question.options?.find((opt: string) => opt.includes(occupation)) || 
             question.options?.find((opt: string) => opt.includes('职员')) || 
             question.options?.[0];
    }
    
    // 教育相关
    if (questionText.includes('学历') || questionText.includes('教育')) {
      return question.options?.find((opt: string) => opt.includes(education)) || 
             question.options?.find((opt: string) => opt.includes('本科')) || 
             question.options?.[1];
    }
    
    // 收入相关
    if (questionText.includes('收入') || questionText.includes('月薪')) {
      const incomeNum = parseInt(income.split('-')[0]);
      if (incomeNum < 5000) return question.options?.find((opt: string) => opt.includes('5000以下')) || question.options?.[0];
      if (incomeNum < 10000) return question.options?.find((opt: string) => opt.includes('5000-10000')) || question.options?.[1];
      return question.options?.find((opt: string) => opt.includes('10000以上')) || question.options?.[2];
    }
    
    // 网购相关
    if (questionText.includes('网购') || questionText.includes('网络购物')) {
      if (questionText.includes('是否') || questionText.includes('有没有')) {
        return '是';
      }
      if (questionText.includes('原因')) {
        return question.options?.find((opt: string) => opt.includes('方便快捷')) || 
               question.options?.find((opt: string) => opt.includes('便宜')) || 
               question.options?.[0];
      }
    }
    
    // 默认选择第一个选项
    return question.options?.[0] || '是';
  }

  /**
   * 执行具体的作答动作
   */
  private async executeAnswer(stagehand: Stagehand, question: any, answer: string): Promise<void> {
    let instruction = '';
    
    switch (question.type) {
      case 'single':
        instruction = `在题目"${question.text}"中点击选择"${answer}"选项`;
        break;
      case 'multiple':
        instruction = `在多选题"${question.text}"中勾选"${answer}"选项`;
        break;
      case 'text':
        instruction = `在题目"${question.text}"的文本框中输入"${answer}"`;
        break;
      case 'scale':
        instruction = `在评分题"${question.text}"中选择"${answer}"分`;
        break;
      default:
        instruction = `选择"${answer}"作为题目"${question.text}"的答案`;
    }
    
    await stagehand.page.act(instruction);
  }

  /**
   * 导航到下一页或提交
   */
  private async navigateToNext(stagehand: Stagehand, pageAnalysis: any): Promise<boolean> {
    try {
      if (pageAnalysis.hasNextButton && pageAnalysis.nextButtonText) {
        this.log(`🔄 点击下一页: ${pageAnalysis.nextButtonText}`);
        await stagehand.page.act(`点击"${pageAnalysis.nextButtonText}"按钮进入下一页`);
        return true;
      }
      
      if (pageAnalysis.hasSubmitButton && pageAnalysis.submitButtonText) {
        this.log(`📤 点击提交: ${pageAnalysis.submitButtonText}`);
        await stagehand.page.act(`点击"${pageAnalysis.submitButtonText}"按钮提交问卷`);
        return false; // 提交后结束
      }
      
      // 尝试通用的下一页/提交按钮
      this.log('🔄 尝试查找通用导航按钮...');
      await stagehand.page.act('点击"下一页"或"提交"按钮');
      return true;
      
    } catch (error: any) {
      this.log(`❌ 导航失败: ${error.message}`);
      return false;
    }
  }
}