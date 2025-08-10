/**
 * 优化的Stagehand问卷作答引擎
 * 基于最佳实践：ReAct框架 + 数字人信息融合 + 高效单策略
 * 专注于快速、智能、完整的问卷作答体验
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonProfile } from '../types';

// 优化的作答结果
export interface OptimizedAnsweringResult {
  success: boolean;
  totalQuestionsAnswered: number;
  totalPagesProcessed: number;
  digitalPersonName: string;
  completionReason: string;
  detailedLogs: string[];
  executionTime: number;
  questionsDetails: QuestionDetail[];
}

// 题目详细信息
export interface QuestionDetail {
  questionText: string;
  questionType: string;
  options?: string[];
  digitalPersonThinking: string;
  selectedAnswer: string;
  executionStatus: 'success' | 'failed';
}

// 简化高效的页面Schema
const OptimizedPageSchema = z.object({
  questions: z.array(z.object({
    text: z.string().describe("题目完整文本"),
    type: z.string().describe("题目类型：单选、多选、输入框、下拉等"),
    options: z.array(z.string()).nullable().describe("选择题的选项列表")
  })),
  hasNextButton: z.boolean().describe("是否有下一页按钮"),
  isLastPage: z.boolean().describe("是否为最后一页")
});

export class OptimizedStagehandEngine {
  private stagehand: Stagehand;
  private digitalPerson: DigitalPersonProfile;
  private detailedLogs: string[] = [];
  private questionsDetails: QuestionDetail[] = [];

  constructor(stagehand: Stagehand, digitalPerson: DigitalPersonProfile) {
    this.stagehand = stagehand;
    this.digitalPerson = digitalPerson;
    
    this.log('🎯 优化Stagehand引擎已初始化');
    this.log(`👤 数字人: ${digitalPerson.name} (${digitalPerson.age}岁, ${digitalPerson.occupation})`);
    this.log('🚀 采用ReAct框架：推理 → 行动 → 观察 → 反思');
  }

  private log(message: string): void {
    console.log(message);
    this.detailedLogs.push(message);
  }

  /**
   * 执行优化的问卷作答流程
   * 单一高效策略：extract分析 + 数字人推理 + 精确作答
   */
  async executeOptimizedAnswering(): Promise<OptimizedAnsweringResult> {
    const startTime = Date.now();
    this.log('\n🚀 === 开始优化Stagehand问卷作答 ===');
    this.log('🎯 策略：extract分析 + 数字人推理 + 精确作答');
    
    const result: OptimizedAnsweringResult = {
      success: false,
      totalQuestionsAnswered: 0,
      totalPagesProcessed: 0,
      digitalPersonName: this.digitalPerson.name,
      completionReason: '',
      detailedLogs: [],
      executionTime: 0,
      questionsDetails: []
    };

    try {
      let pageCount = 0;
      const maxPages = 20; // 限制最大页数，提高效率
      
      while (pageCount < maxPages) {
        pageCount++;
        this.log(`\n📄 === 第${pageCount}页问卷分析与作答 ===`);
        
        // 等待页面稳定
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 🧠 第一步：智能页面分析（ReAct框架的Reasoning阶段）
        const pageAnalysis = await this.performIntelligentPageAnalysis();
        
        if (!pageAnalysis || pageAnalysis.questions.length === 0) {
          this.log('⚠️ 页面分析未发现题目，可能已完成问卷');
          result.completionReason = '页面无题目，问卷可能已完成';
          break;
        }

        this.log(`📊 页面分析结果: 发现${pageAnalysis.questions.length}个题目`);
        
        // 🎯 第二步：数字人智能推理与作答（ReAct框架的Acting阶段）
        const answeredCount = await this.performDigitalPersonAnswering(pageAnalysis.questions);
        
        result.totalQuestionsAnswered += answeredCount;
        if (answeredCount > 0) {
          result.totalPagesProcessed++;
        }
        
        this.log(`✅ 第${pageCount}页作答完成: ${answeredCount}个题目`);

        // 🚀 第三步：智能导航（如果不是最后一页）
        if (!pageAnalysis.isLastPage && pageAnalysis.hasNextButton) {
          const navigationSuccess = await this.performIntelligentNavigation();
          if (!navigationSuccess) {
            this.log('🏁 导航失败，问卷作答结束');
            result.completionReason = '导航失败或已完成';
            break;
          }
          this.log('🔄 成功导航到下一页');
        } else {
          this.log('🏁 已到达最后一页，问卷作答完成');
          result.completionReason = '问卷正常完成';
          break;
        }
      }

      result.success = result.totalQuestionsAnswered > 0;
      result.executionTime = Date.now() - startTime;
      result.detailedLogs = this.detailedLogs;
      result.questionsDetails = this.questionsDetails;
      
      this.log(`\n🎉 === 优化作答完成 ===`);
      this.log(`📊 总计作答: ${result.totalQuestionsAnswered}个题目`);
      this.log(`📄 处理页面: ${result.totalPagesProcessed}页`);
      this.log(`⏱️ 总用时: ${Math.round(result.executionTime / 1000)}秒`);
      
      return result;

    } catch (error) {
      this.log(`❌ 优化作答失败: ${error}`);
      result.executionTime = Date.now() - startTime;
      result.detailedLogs = this.detailedLogs;
      result.questionsDetails = this.questionsDetails;
      return result;
    }
  }

  /**
   * 智能页面分析：使用extract提取页面结构
   */
  private async performIntelligentPageAnalysis(): Promise<any> {
    this.log('🧠 === 开始智能页面分析 ===');
    
    try {
      // 构建智能分析指令
      const analysisInstruction = `请分析这个问卷页面，提取以下信息：
      
      🔍 需要提取的内容：
      1. 页面上的所有问卷题目文本
      2. 每个题目的类型（单选、多选、输入框、下拉选择等）
      3. 选择题的所有选项
      4. 页面导航信息（是否有下一页按钮，是否为最后一页）
      
      🎯 分析要求：
      - 准确识别每个题目的完整文本
      - 正确判断题目类型
      - 完整提取所有选项
      - 准确判断页面状态`;

      this.log('📋 执行extract页面分析...');
      this.log('🔧 DEBUG: 准备调用stagehand.page.extract方法');
      this.log(`🔧 DEBUG: extract方法类型: ${typeof this.stagehand.page.extract}`);
      
      const pageAnalysis = await this.stagehand.page.extract({
        instruction: analysisInstruction,
        schema: OptimizedPageSchema
      });
      
      this.log('🔧 DEBUG: extract调用完成，返回结果');

      this.log('📊 === 页面分析结果 ===');
      this.log(`📈 题目数量: ${pageAnalysis.questions.length}`);
      this.log(`🔘 有下一页: ${pageAnalysis.hasNextButton ? '是' : '否'}`);
      this.log(`📄 最后一页: ${pageAnalysis.isLastPage ? '是' : '否'}`);
      
      // 详细展示每个题目
      pageAnalysis.questions.forEach((question: any, index: number) => {
        this.log(`\n📝 题目${index + 1}:`);
        this.log(`   文本: ${question.text}`);
        this.log(`   类型: ${question.type}`);
        if (question.options && question.options.length > 0) {
          this.log(`   选项: ${question.options.join(' | ')}`);
        }
      });
      this.log('=====================================\n');
      
      return pageAnalysis;

    } catch (error) {
      this.log(`❌ 页面分析失败: ${error}`);
      return null;
    }
  }

  /**
   * 数字人智能推理与作答：基于数字人特征进行个性化作答
   */
  private async performDigitalPersonAnswering(questions: any[]): Promise<number> {
    this.log('🎯 === 开始数字人智能推理与作答 ===');
    this.log(`👤 数字人身份: ${this.digitalPerson.name}`);
    this.log(`🎯 年龄: ${this.digitalPerson.age}岁`);
    this.log(`💼 职业: ${this.digitalPerson.occupation}`);
    this.log(`🎓 学历: ${this.digitalPerson.education}`);
    this.log(`📍 地区: ${this.digitalPerson.location}`);
    this.log(`💰 收入: ${this.digitalPerson.income}`);
    
    let answeredCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      try {
        this.log(`\n🎯 === 作答第${i + 1}题 ===`);
        this.log(`📋 题目: ${question.text}`);
        this.log(`🔍 类型: ${question.type}`);
        if (question.options && question.options.length > 0) {
          this.log(`📝 选项: ${question.options.join(' | ')}`);
        }
        
        // 🧠 数字人智能推理过程
        const reasoning = this.performDigitalPersonReasoning(question);
        this.log(`🧠 数字人思考:`);
        this.log(`   ${reasoning.thinking}`);
        this.log(`   选择: ${reasoning.answer}`);
        this.log(`   理由: ${reasoning.reason}`);
        
        // ⚡ 执行精确作答
        const actInstruction = this.buildPreciseActInstruction(question, reasoning);
        this.log(`⚡ 执行作答指令: ${actInstruction.slice(0, 100)}...`);
        
        await this.stagehand.page.act(actInstruction);
        
        // 记录题目详情
        const questionDetail: QuestionDetail = {
          questionText: question.text,
          questionType: question.type,
          options: question.options,
          digitalPersonThinking: reasoning.thinking,
          selectedAnswer: reasoning.answer,
          executionStatus: 'success'
        };
        this.questionsDetails.push(questionDetail);
        
        answeredCount++;
        this.log(`✅ === 第${i + 1}题作答成功 ===`);
        
        // 短暂等待确保操作完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.log(`❌ 第${i + 1}题作答失败: ${error}`);
        
        // 记录失败的题目详情
        const questionDetail: QuestionDetail = {
          questionText: question.text,
          questionType: question.type,
          options: question.options,
          digitalPersonThinking: '作答失败',
          selectedAnswer: '无',
          executionStatus: 'failed'
        };
        this.questionsDetails.push(questionDetail);
      }
    }

    this.log(`\n📊 本页作答统计: ${answeredCount}/${questions.length} 题成功`);
    return answeredCount;
  }

  /**
   * 数字人智能推理：基于数字人特征分析题目并选择答案
   */
  private performDigitalPersonReasoning(question: any): {thinking: string, answer: string, reason: string} {
    const { name, age, occupation, education, location, income, maritalStatus } = this.digitalPerson;
    
    // 基于数字人特征进行推理
    let thinking = `我是${name}，${age}岁，职业是${occupation}，学历${education}，住在${location}`;
    let answer = '';
    let reason = '';
    
    const questionText = question.text.toLowerCase();
    const questionType = question.type;
    const options = question.options || [];
    
    // 根据题目类型和内容进行智能推理
    if (questionText.includes('性别')) {
      // 根据姓名判断性别
      if (name.includes('女') || name.includes('娟') || name.includes('梦') || name.includes('丽')) {
        answer = '女';
        reason = '根据我的姓名特征判断';
      } else {
        answer = '男';
        reason = '根据我的姓名特征判断';
      }
    } else if (questionText.includes('年龄')) {
      answer = age.toString();
      reason = `我今年${age}岁`;
    } else if (questionText.includes('职业') || questionText.includes('工作')) {
      answer = occupation;
      reason = `我的职业是${occupation}`;
    } else if (questionText.includes('学历') || questionText.includes('教育')) {
      answer = education;
      reason = `我的学历是${education}`;
    } else if (questionText.includes('地区') || questionText.includes('城市')) {
      answer = location;
      reason = `我住在${location}`;
    } else if (questionText.includes('收入') || questionText.includes('薪资')) {
      answer = income;
      reason = `我的收入水平是${income}`;
    } else if (questionText.includes('婚姻') || questionText.includes('结婚')) {
      answer = maritalStatus === '已婚' ? '已婚' : '单身';
      reason = `我的婚姻状况是${maritalStatus}`;
    } else if (questionText.includes('网购') || questionText.includes('购物')) {
      // 根据年龄和职业推断网购习惯
      if (age < 35 && (occupation.includes('软件') || occupation.includes('设计'))) {
        answer = options.find((opt: string) => opt.includes('经常') || opt.includes('满意')) || options[0] || '经常';
        reason = '作为年轻的技术工作者，我经常网购';
      } else {
        answer = options.find((opt: string) => opt.includes('偶尔') || opt.includes('一般')) || options[1] || '偶尔';
        reason = '根据我的年龄和职业特征，偶尔网购';
      }
    } else {
      // 通用推理逻辑
      if (options.length > 0) {
        // 选择中等偏正面的选项
        answer = options.find((opt: string) => 
          opt.includes('比较满意') || 
          opt.includes('一般') || 
          opt.includes('偶尔') ||
          opt.includes('中等')
        ) || options[Math.floor(options.length / 2)] || options[0];
        reason = `基于我的身份特征，选择了相对中性的选项`;
      } else {
        answer = '符合身份特征的回答';
        reason = '根据题目要求填写合适的内容';
      }
    }
    
    thinking = `${thinking}，面对这个关于"${question.text}"的问题，我需要根据自己的身份特征来回答。`;
    
    return { thinking, answer, reason };
  }

  /**
   * 构建精确的作答指令
   */
  private buildPreciseActInstruction(question: any, reasoning: any): string {
    const baseContext = `作为${this.digitalPerson.name}（${this.digitalPerson.age}岁，${this.digitalPerson.occupation}）`;
    const questionText = question.text;
    const selectedAnswer = reasoning.answer;
    
    if (question.type.includes('单选') || question.type.includes('radio') || question.options?.length > 0) {
      return `${baseContext}，在题目"${questionText}"中选择"${selectedAnswer}"选项。
      
      🎯 具体操作：
      1. 找到题目"${questionText}"
      2. 在该题目的选项中找到"${selectedAnswer}"
      3. 点击选择该选项
      4. 确保选项被正确选中`;
      
    } else if (question.type.includes('输入') || question.type.includes('input') || question.type.includes('文本')) {
      return `${baseContext}，在题目"${questionText}"的输入框中填写"${selectedAnswer}"。
      
      🎯 具体操作：
      1. 找到题目"${questionText}"
      2. 找到该题目对应的输入框
      3. 清空输入框内容
      4. 输入"${selectedAnswer}"`;
      
    } else {
      return `${baseContext}，智能回答题目"${questionText}"，答案是"${selectedAnswer}"。
      请根据题目类型选择合适的操作方式（点击选项或填写内容）。`;
    }
  }

  /**
   * 智能导航到下一页
   */
  private async performIntelligentNavigation(): Promise<boolean> {
    this.log('🚀 === 执行智能导航 ===');
    
    try {
      const navigationInstruction = `找到并点击页面上的下一页、继续或提交按钮。
      
      🎯 查找优先级：
      1. "下一页" 按钮
      2. "继续" 按钮  
      3. "提交" 按钮
      4. "Next" 按钮
      5. "Continue" 按钮
      
      请点击找到的第一个可用按钮。`;
      
      this.log('⚡ 执行导航操作...');
      await this.stagehand.page.act(navigationInstruction);
      
      // 等待页面跳转
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      this.log('✅ 导航操作执行完成');
      return true;
      
    } catch (error) {
      this.log(`❌ 导航失败: ${error}`);
      return false;
    }
  }
}
