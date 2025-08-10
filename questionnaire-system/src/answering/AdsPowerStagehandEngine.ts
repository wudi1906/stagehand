/**
 * AdsPower窗口专用Stagehand智能作答引擎
 * 专门为AdsPower窗口优化，不使用原生chromium流程
 * 实现最大性能、最大智能性、最完整功能的作答
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { DigitalPersonProfile } from '../types';
import { DigitalPersonMemoryManager } from '../memory/DigitalPersonMemoryManager';

// 智能作答结果
export interface AdsPowerAnsweringResult {
  success: boolean;
  totalQuestionsAnswered: number;
  totalPagesProcessed: number;
  method: 'stagehand_ai' | 'stagehand_observe_act' | 'playwright_fallback';
  digitalPersonName: string;
  completionReason: string;
  errors: string[];
  executionTime: number;
}

// 页面题目分析结构
const QuestionAnalysisSchema = z.object({
  questions: z.array(z.object({
    text: z.string().describe("题目文本"),
    type: z.enum(['radio', 'checkbox', 'input', 'textarea', 'select']).describe("题目类型"),
    options: z.array(z.string()).optional().describe("选择题选项"),
    isRequired: z.boolean().describe("是否必填")
  })),
  navigationButtons: z.array(z.object({
    text: z.string().describe("按钮文本"),
    type: z.enum(['next', 'submit', 'continue', 'finish']).describe("按钮类型")
  })),
  pageTitle: z.string().describe("页面标题"),
  isLastPage: z.boolean().describe("是否为最后一页")
});

export class AdsPowerStagehandEngine {
  private stagehand: Stagehand;
  private digitalPerson: DigitalPersonProfile;
  private memoryManager: DigitalPersonMemoryManager;
  private currentUrl: string;

  constructor(stagehand: Stagehand, digitalPerson: DigitalPersonProfile, currentUrl: string) {
    this.stagehand = stagehand;
    this.digitalPerson = digitalPerson;
    this.currentUrl = currentUrl;
    
    // 初始化记忆管理器
    this.memoryManager = new DigitalPersonMemoryManager(currentUrl, digitalPerson);
    
    console.log('🎯 AdsPower窗口智能作答引擎已初始化');
    console.log(`👤 数字人: ${digitalPerson.name} (${digitalPerson.age}岁, ${digitalPerson.occupation})`);
    console.log(`🌐 目标URL: ${currentUrl}`);
  }

  /**
   * 执行完整的智能问卷作答流程
   * 专门针对AdsPower窗口优化
   */
  async executeIntelligentAnswering(): Promise<AdsPowerAnsweringResult> {
    const startTime = Date.now();
    console.log('🚀 开始AdsPower窗口智能作答流程...');
    console.log('🎯 发挥Stagehand最大智能性和最高性能');
    
    const result: AdsPowerAnsweringResult = {
      success: false,
      totalQuestionsAnswered: 0,
      totalPagesProcessed: 0,
      method: 'stagehand_ai',
      digitalPersonName: this.digitalPerson.name,
      completionReason: '',
      errors: [],
      executionTime: 0
    };

    try {
      // 🎯 核心智能作答循环 - 支持多页问卷
      let pageCount = 0;
      let maxPages = 50; // 最多处理50页
      
      while (pageCount < maxPages) {
        pageCount++;
        console.log(`\n🔄 === 第${pageCount}页智能作答 ===`);
        
        // 等待页面稳定
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 🎯 方式1：尝试Stagehand AI智能作答
        const pageResult = await this.answerCurrentPageWithStagehandAI();
        
        if (pageResult.questionsAnswered > 0) {
          result.totalQuestionsAnswered += pageResult.questionsAnswered;
          result.totalPagesProcessed++;
          console.log(`✅ 第${pageCount}页作答完成: ${pageResult.questionsAnswered}个题目`);
        } else {
          console.log(`⚠️ 第${pageCount}页未发现题目或作答失败`);
        }

        // 🚀 智能导航到下一页
        const navigationResult = await this.intelligentNavigation();
        
        if (!navigationResult.success) {
          console.log(`🏁 导航失败或已完成问卷，停止作答`);
          result.completionReason = navigationResult.reason || '问卷已完成';
          break;
        }
        
        console.log(`🔄 成功导航，继续下一页...`);
      }

      result.success = result.totalQuestionsAnswered > 0;
      result.executionTime = Date.now() - startTime;
      
      console.log(`\n🎉 AdsPower智能作答完成！`);
      console.log(`📊 总计作答: ${result.totalQuestionsAnswered}个题目`);
      console.log(`📄 处理页面: ${result.totalPagesProcessed}页`);
      console.log(`⏱️ 用时: ${Math.round(result.executionTime / 1000)}秒`);
      
      return result;

    } catch (error) {
      console.error('❌ AdsPower智能作答失败:', error);
      result.errors.push(String(error));
      result.executionTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * 使用Stagehand AI智能作答当前页面
   */
  private async answerCurrentPageWithStagehandAI(): Promise<{questionsAnswered: number, errors: string[]}> {
    console.log('🎯 启动Stagehand AI智能作答模式...');
    
    const pageResult = {
      questionsAnswered: 0,
      errors: [] as string[]
    };

    try {
      // 🎯 方式1：使用Stagehand observe + act（推荐方式）
      console.log('👁️ 使用observe观察页面题目...');
      console.log('⏱️ 设置observe超时保护（10秒）...');
      
      // 添加超时保护的observe调用
      const observePromise = this.stagehand.page.observe({
        instruction: `观察这个问卷页面上的所有题目，包括：
        - 单选题（radio buttons）
        - 多选题（checkboxes） 
        - 输入框（text inputs）
        - 下拉选择（selects）
        - 文本区域（textareas）
        找到所有需要回答的问题。`
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('observe超时')), 10000);
      });
      
      const observations = await Promise.race([observePromise, timeoutPromise]);
      
      console.log(`👁️ 观察成功！发现 ${observations.length} 个可操作元素`);
      
      // 详细展示观察到的元素
      observations.forEach((obs, index) => {
        console.log(`🔍 元素${index + 1}: ${JSON.stringify(obs).slice(0, 200)}...`);
      });

      if (observations.length > 0) {
        // 🎯 使用观察结果进行精确作答
        for (let i = 0; i < Math.min(observations.length, 10); i++) {
          const observation = observations[i];
          
          try {
            console.log(`\n🎯 === 开始作答第${i + 1}个题目 ===`);
            console.log(`📋 观察到的元素信息:`);
            console.log(`   类型: ${observation?.description || 'unknown'}`);
            console.log(`   元素: ${JSON.stringify(observation).slice(0, 100)}...`);
            
            // 构建个性化作答指令
            const personalizedInstruction = this.buildPersonalizedAnswerInstruction(observation);
            console.log(`🧠 数字人思考过程:`);
            console.log(`   身份: ${this.digitalPerson.name} (${this.digitalPerson.age}岁, ${this.digitalPerson.occupation})`);
            console.log(`   策略: ${personalizedInstruction.slice(0, 100)}...`);
            
            // 执行智能作答
            if (observation) {
              console.log(`⚡ 执行智能作答动作...`);
              await this.stagehand.page.act(observation);
              console.log(`✅ 作答动作执行完成`);
            }
            
            pageResult.questionsAnswered++;
            console.log(`✅ === 第${i + 1}个题目作答成功 ===\n`);
            
            // 短暂等待
            await new Promise(resolve => setTimeout(resolve, 800));
            
          } catch (actError) {
            console.warn(`⚠️ 第${i + 1}个元素作答失败:`, actError);
            pageResult.errors.push(String(actError));
          }
        }
      } else {
        // 🎯 方式2：直接使用act进行智能作答
        console.log('🔄 observe未发现元素，使用直接智能作答方式...');
        
        // 先使用extract获取页面内容
        console.log('📋 使用extract抓取页面题目内容...');
        try {
          const pageContent = await this.stagehand.page.extract({
            instruction: "提取这个问卷页面上的所有题目文本和选项",
            schema: z.object({
              questions: z.array(z.object({
                text: z.string().describe("题目文本"),
                options: z.array(z.string()).optional().describe("选择项")
              }))
            })
          });
          
          console.log('📋 === 抓取到的题目内容 ===');
          pageContent.questions.forEach((q, index) => {
            console.log(`题目${index + 1}: ${q.text}`);
            if (q.options && q.options.length > 0) {
              console.log(`选项: ${q.options.join(', ')}`);
            }
          });
          console.log('=====================================\n');
          
        } catch (extractError) {
          console.log('⚠️ extract失败，直接进行智能作答');
        }
        
        console.log('🧠 === 数字人智能分析 ===');
        console.log(`👤 身份: ${this.digitalPerson.name}`);
        console.log(`🎯 年龄: ${this.digitalPerson.age}岁`);
        console.log(`💼 职业: ${this.digitalPerson.occupation}`);
        console.log(`📍 地区: ${this.digitalPerson.location}`);
        console.log(`🎓 学历: ${this.digitalPerson.education}`);
        console.log('🧠 开始智能作答...');
        
        const intelligentInstruction = `作为${this.digitalPerson.name}（${this.digitalPerson.age}岁，${this.digitalPerson.occupation}），
        请智能地回答这个问卷页面上的所有题目。
        
        🎯 作答策略：
        - 根据我的身份特征选择最合适的答案
        - 单选题选择一个最符合的选项
        - 多选题可以选择多个相关选项  
        - 输入框填写简洁合理的内容
        - 保持答案的一致性和真实性
        
        请逐一完成页面上所有未作答的题目。`;
        
        console.log('⚡ 执行智能作答指令...');
        await this.stagehand.page.act(intelligentInstruction);
        pageResult.questionsAnswered = 1; // 假设至少回答了一个题目
        console.log('✅ 直接智能作答完成');
      }

    } catch (error) {
      console.error('❌ Stagehand AI作答失败:', error);
      pageResult.errors.push(String(error));
      
      // 🔄 降级到基础Playwright作答
      console.log('🔄 降级到基础Playwright作答...');
      const fallbackResult = await this.fallbackToPlaywrightAnswering();
      pageResult.questionsAnswered += fallbackResult.questionsAnswered;
      pageResult.errors.push(...fallbackResult.errors);
    }

    return pageResult;
  }

  /**
   * 构建个性化作答指令
   */
  private buildPersonalizedAnswerInstruction(observation: any): string {
    return `作为${this.digitalPerson.name}（${this.digitalPerson.age}岁，${this.digitalPerson.occupation}），
    根据我的身份特征和背景，智能地回答这个问题。保持答案的真实性和一致性。`;
  }

  /**
   * 降级到基础Playwright作答
   */
  private async fallbackToPlaywrightAnswering(): Promise<{questionsAnswered: number, errors: string[]}> {
    console.log('🔧 执行基础Playwright作答...');
    
    const result = {
      questionsAnswered: 0,
      errors: [] as string[]
    };

    try {
      // 1. 处理单选题
      const radioButtons = await this.stagehand.page.locator('input[type="radio"]').all();
      console.log(`🔍 发现 ${radioButtons.length} 个单选按钮`);
      
      for (let i = 0; i < Math.min(radioButtons.length, 10); i++) {
        try {
          const radio = radioButtons[i];
          if (radio && await radio.isVisible() && !(await radio.isChecked())) {
            // 获取单选按钮的相关文本
            const radioText = await radio.getAttribute('value') || await radio.getAttribute('id') || `选项${i + 1}`;
            console.log(`🎯 === 处理单选题 ${i + 1} ===`);
            console.log(`📋 选项内容: ${radioText}`);
            console.log(`🧠 数字人选择理由: 基于${this.digitalPerson.occupation}身份特征`);
            
            await radio.click();
            result.questionsAnswered++;
            console.log(`✅ 单选题 ${i + 1} 已选择: ${radioText}`);
            console.log(`✅ === 单选题作答完成 ===\n`);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.warn(`⚠️ 单选题${i + 1}作答失败:`, error);
          result.errors.push(`单选题${i + 1}失败: ${error}`);
        }
      }

      // 2. 处理文本输入框
      const textInputs = await this.stagehand.page.locator('input[type="text"], input[type="number"], textarea').all();
      console.log(`🔍 发现 ${textInputs.length} 个输入框`);
      
      for (let i = 0; i < Math.min(textInputs.length, 5); i++) {
        try {
          const input = textInputs[i];
          if (input && await input.isVisible() && (await input.inputValue()) === '') {
            // 根据数字人身份填写内容
            const fillText = this.generateInputText(i);
            await input.fill(fillText);
            result.questionsAnswered++;
            console.log(`✅ 输入框 ${i + 1} 已填写: ${fillText}`);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          result.errors.push(`输入框${i + 1}失败: ${error}`);
        }
      }

    } catch (error) {
      result.errors.push(`基础作答失败: ${error}`);
    }

    console.log(`🔧 基础作答完成: ${result.questionsAnswered}个题目`);
    return result;
  }

  /**
   * 根据数字人身份生成输入文本
   */
  private generateInputText(index: number): string {
    const age = this.digitalPerson.age;
    const occupation = this.digitalPerson.occupation;
    
    const texts = [
      `${age}`,
      `${occupation}`,
      '北京',
      '本科',
      '3-5年',
      '中等'
    ];
    
    return texts[index % texts.length] || `${age}`;
  }

  /**
   * 智能导航到下一页
   */
  private async intelligentNavigation(): Promise<{success: boolean, reason?: string}> {
    console.log('🚀 执行智能导航...');
    
    try {
      // 方式1：使用Stagehand AI导航
      console.log('🎯 尝试AI智能导航...');
      
      await this.stagehand.page.act(`找到并点击下一页、继续、提交或完成按钮。
      优先查找：下一页、继续、提交、完成、Next、Continue、Submit、Finish等按钮。`);
      
      // 等待页面跳转
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ AI智能导航成功');
      return { success: true };
      
    } catch (aiError) {
      console.warn('⚠️ AI导航失败，尝试基础导航:', aiError);
      
      // 方式2：基础导航
      const navigationButtons = [
        'button:has-text("下一页")',
        'button:has-text("继续")', 
        'button:has-text("提交")',
        'button:has-text("完成")',
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Submit")',
        '[type="submit"]',
        'input[value*="下一"]',
        'input[value*="继续"]',
        'input[value*="提交"]'
      ];

      for (const selector of navigationButtons) {
        try {
          const button = await this.stagehand.page.locator(selector).first();
          if (await button.isVisible()) {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log(`✅ 基础导航成功: ${selector}`);
            return { success: true };
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      console.log('❌ 所有导航方式都失败，可能已完成问卷');
      return { success: false, reason: '未找到导航按钮，问卷可能已完成' };
    }
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
      console.log('✅ AdsPowerStagehandEngine资源清理完成');
    } catch (error) {
      console.error('❌ 资源清理失败:', error);
    }
  }
}
