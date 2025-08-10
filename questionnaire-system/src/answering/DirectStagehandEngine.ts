/**
 * 直击核心的Stagehand作答引擎
 * 排除所有干扰，专注作答！作答！作答！
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonProfile } from '../types';

export interface DirectAnsweringResult {
  success: boolean;
  totalAnswered: number;
  logs: string[];
  error?: string;
}

export class DirectStagehandEngine {
  private stagehand: Stagehand;
  private digitalPerson: DigitalPersonProfile;
  private logs: string[] = [];

  constructor(stagehand: Stagehand, digitalPerson: DigitalPersonProfile) {
    this.stagehand = stagehand;
    this.digitalPerson = digitalPerson;
    this.log('🎯 直击核心Stagehand引擎启动');
    this.log(`👤 数字人: ${digitalPerson.name} (${digitalPerson.age}岁, ${digitalPerson.occupation})`);
  }

  private log(message: string): void {
    console.log(message);
    this.logs.push(message);
  }

  /**
   * 直接执行作答 - 排除所有干扰
   */
  async executeDirectAnswering(): Promise<DirectAnsweringResult> {
    this.log('\n🚀 === 开始直击核心作答流程 ===');
    this.log('⚡ 目标：作答！作答！作答！');
    
    try {
      // 第一步：直接尝试简单的extract
      this.log('\n📋 === 第1步：页面内容提取 ===');
      
      const basicSchema = z.object({
        pageTitle: z.string().describe("页面标题"),
        hasQuestions: z.boolean().describe("页面是否包含问卷题目")
      });

      this.log('🔧 调用extract - 基础页面分析');
      const basicInfo = await this.stagehand.page.extract({
        instruction: "分析这个页面，提取页面标题，判断是否包含问卷题目",
        schema: basicSchema
      });
      
      this.log(`✅ 基础分析成功: ${basicInfo.pageTitle}`);
      this.log(`📊 包含题目: ${basicInfo.hasQuestions ? '是' : '否'}`);

      if (!basicInfo.hasQuestions) {
        this.log('⚠️ 页面不包含问卷题目');
        return { success: false, totalAnswered: 0, logs: this.logs, error: '页面不包含问卷题目' };
      }

      // 第二步：提取具体题目
      this.log('\n📝 === 第2步：题目详细提取 ===');
      
      const questionSchema = z.object({
        questions: z.array(z.object({
          text: z.string().describe("题目文本"),
          type: z.string().describe("题目类型"),
          hasOptions: z.boolean().describe("是否有选项")
        }))
      });

      this.log('🔧 调用extract - 题目详细分析');
      const questionInfo = await this.stagehand.page.extract({
        instruction: "找到页面上的所有问卷题目，提取题目文本和类型",
        schema: questionSchema
      });

      this.log(`📊 发现题目数量: ${questionInfo.questions.length}`);
      questionInfo.questions.forEach((q, i) => {
        this.log(`   题目${i+1}: ${q.text} (类型: ${q.type})`);
      });

      // 第三步：逐题作答
      this.log('\n🎯 === 第3步：开始逐题作答 ===');
      let answeredCount = 0;

      for (let i = 0; i < Math.min(questionInfo.questions.length, 3); i++) {
        const question = questionInfo.questions[i];
        
        if (!question) continue;
        
        try {
          this.log(`\n🎯 作答第${i+1}题: ${question.text}`);
          
          // 数字人思考
          const thinking = this.getDigitalPersonThinking(question);
          this.log(`🧠 数字人思考: ${thinking.answer}`);
          this.log(`💡 理由: ${thinking.reason}`);
          
          // 执行作答
          const actInstruction = this.buildActInstruction(question, thinking.answer);
          this.log(`⚡ 执行作答: ${actInstruction.slice(0, 100)}...`);
          
          await this.stagehand.page.act(actInstruction);
          
          answeredCount++;
          this.log(`✅ 第${i+1}题作答成功`);
          
          // 短暂等待
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          this.log(`❌ 第${i+1}题作答失败: ${error}`);
        }
      }

      this.log(`\n🎉 === 作答完成 ===`);
      this.log(`📊 成功作答: ${answeredCount}题`);
      
      return {
        success: answeredCount > 0,
        totalAnswered: answeredCount,
        logs: this.logs
      };

    } catch (error: any) {
      this.log(`❌ 作答流程失败: ${error.message || error}`);
      return {
        success: false,
        totalAnswered: 0,
        logs: this.logs,
        error: error.message || String(error)
      };
    }
  }

  /**
   * 数字人思考过程
   */
  private getDigitalPersonThinking(question: any): {answer: string, reason: string} {
    const { name, age, occupation } = this.digitalPerson;
    
    // 简单的推理逻辑
    const questionText = question.text.toLowerCase();
    
    if (questionText.includes('性别')) {
      if (name.includes('梦') || name.includes('娟')) {
        return { answer: '女', reason: '根据姓名特征判断' };
      } else {
        return { answer: '男', reason: '根据姓名特征判断' };
      }
    } else if (questionText.includes('年龄')) {
      return { answer: age.toString(), reason: `我今年${age}岁` };
    } else if (questionText.includes('职业')) {
      return { answer: occupation, reason: `我的职业是${occupation}` };
    } else {
      // 默认选择中性答案
      return { 
        answer: '比较满意', 
        reason: `作为${occupation}，我选择相对中性的答案` 
      };
    }
  }

  /**
   * 构建作答指令
   */
  private buildActInstruction(question: any, answer: string): string {
    const { name, occupation } = this.digitalPerson;
    
    return `作为${name}（${occupation}），在题目"${question.text}"中选择或填写"${answer}"。
    
    具体操作：
    1. 找到题目"${question.text}"
    2. 如果是选择题，点击选择"${answer}"选项
    3. 如果是输入题，在输入框中填写"${answer}"
    4. 确保操作成功完成`;
  }
}
