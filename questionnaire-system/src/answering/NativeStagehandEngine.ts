/**
 * 原生Stagehand智能作答引擎
 * 完全基于Stagehand官方最佳实践，不过度复杂化
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

export interface AnsweringResult {
  success: boolean;
  questionsAnswered: number;
  method: 'ai_native' | 'ai_fallback' | 'basic_playwright';
  error?: string;
}

export class NativeStagehandEngine {
  private stagehand: Stagehand;
  private page: any;

  constructor(stagehand: Stagehand) {
    this.stagehand = stagehand;
    this.page = stagehand.page;
  }

  /**
   * 执行智能问卷作答 - 原生Stagehand方式
   */
  async answerQuestionnaire(digitalPersonName: string = '张伟'): Promise<AnsweringResult> {
    console.log('🚀 启动原生Stagehand智能作答引擎...');
    console.log(`👤 数字人身份: ${digitalPersonName}`);

    try {
      // 方式1：尝试原生Stagehand AI作答
      return await this.tryNativeAIAnswering(digitalPersonName);
    } catch (aiError) {
      console.warn('⚠️ 原生AI作答失败，尝试Gemini降级...', aiError);
      
      try {
        // 方式2：Gemini降级作答
        return await this.tryGeminiFallback(digitalPersonName);
      } catch (geminiError) {
        console.warn('⚠️ Gemini降级失败，使用基础作答...', geminiError);
        
        // 方式3：基础Playwright作答
        return await this.tryBasicAnswering();
      }
    }
  }

  /**
   * 方式1：原生Stagehand AI作答
   */
  private async tryNativeAIAnswering(digitalPersonName: string): Promise<AnsweringResult> {
    console.log('🎯 方式1：使用原生Stagehand AI作答...');
    
    let questionsAnswered = 0;

    // 使用原生observe + act模式
    console.log('👁️ 观察问卷题目...');
    const observations = await this.page.observe({
      instruction: "找到页面上所有的问卷题目和选项，准备依次作答"
    });

    console.log(`👁️ 观察到 ${observations.length} 个可操作元素`);

    // 针对每个观察到的元素进行智能作答
    for (let i = 0; i < Math.min(observations.length, 10); i++) { // 限制最多处理10个元素
      const observation = observations[i];
      
      try {
        console.log(`🎯 智能作答第 ${i + 1} 个元素...`);
        
        // 使用observe的结果直接act（Stagehand推荐方式）
        await this.page.act(observation);
        questionsAnswered++;
        
        console.log(`✅ 第 ${i + 1} 个元素作答完成`);
        
        // 短暂等待
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`⚠️ 第 ${i + 1} 个元素作答失败:`, error);
      }
    }

    // 如果没有observe到元素，使用直接act方式
    if (observations.length === 0) {
      console.log('🔄 未观察到具体元素，使用直接智能作答...');
      
      await this.page.act(`作为一个叫${digitalPersonName}的大学生，智能地回答这个问卷页面上的所有题目。包括性别、年龄、网购习惯等问题。`);
      questionsAnswered = 1;
    }

    return {
      success: true,
      questionsAnswered,
      method: 'ai_native'
    };
  }

  /**
   * 方式2：Gemini降级作答
   */
  private async tryGeminiFallback(digitalPersonName: string): Promise<AnsweringResult> {
    console.log('🔄 方式2：使用Gemini降级作答...');
    
    // 创建Gemini Stagehand实例
    const geminiStagehand = new Stagehand({
      env: 'LOCAL',
      enableCaching: false,
    });

    try {
      await geminiStagehand.init();
      
      // 连接到当前页面
      const geminiPage = geminiStagehand.page;
      await geminiPage.goto(this.page.url());
      
      // 使用Gemini进行智能作答
      await geminiPage.act(`作为一个叫${digitalPersonName}的大学生，回答这个问卷的所有题目`);
      
      await geminiStagehand.close();
      
      return {
        success: true,
        questionsAnswered: 1,
        method: 'ai_fallback'
      };
      
    } catch (error) {
      if (geminiStagehand) {
        await geminiStagehand.close();
      }
      throw error;
    }
  }

  /**
   * 方式3：基础Playwright作答
   */
  private async tryBasicAnswering(): Promise<AnsweringResult> {
    console.log('🔧 方式3：使用基础Playwright作答...');
    
    let questionsAnswered = 0;

    try {
      // 1. 尝试回答性别问题
      const maleOption = await this.page.locator('text=男').first();
      if (await maleOption.isVisible()) {
        await maleOption.click();
        questionsAnswered++;
        console.log('✅ 已选择性别：男');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 2. 尝试回答网购问题
      const yesOption = await this.page.locator('text=是').first();
      if (await yesOption.isVisible()) {
        await yesOption.click();
        questionsAnswered++;
        console.log('✅ 已选择网购：是');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 3. 查找并填写其他可能的输入框
      const inputs = await this.page.locator('input[type="text"], input[type="number"], textarea').all();
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        try {
          await inputs[i].fill('22'); // 简单填写
          questionsAnswered++;
          console.log(`✅ 已填写输入框 ${i + 1}`);
        } catch (error) {
          console.warn(`⚠️ 填写输入框 ${i + 1} 失败:`, error);
        }
      }

      return {
        success: questionsAnswered > 0,
        questionsAnswered,
        method: 'basic_playwright'
      };

    } catch (error) {
      return {
        success: false,
        questionsAnswered,
        method: 'basic_playwright',
        error: String(error)
      };
    }
  }

  /**
   * 智能导航到下一页
   */
  async navigateToNext(): Promise<boolean> {
    console.log('🚀 智能导航到下一页...');
    
    try {
      // 方式1：使用AI导航
      await this.page.act("点击下一页、继续、或提交按钮");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } catch (aiError) {
      console.warn('⚠️ AI导航失败，使用基础导航...', aiError);
      
      try {
        // 方式2：基础导航
        const nextButtons = [
          'text=下一页',
          'text=继续',
          'text=提交',
          'text=next',
          'text=continue',
          'text=submit',
          '[type="submit"]',
          'button:has-text("下")',
          'button:has-text("继")',
          'button:has-text("提")'
        ];

        for (const selector of nextButtons) {
          try {
            const button = await this.page.locator(selector).first();
            if (await button.isVisible()) {
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              console.log(`✅ 使用选择器导航成功: ${selector}`);
              return true;
            }
          } catch (error) {
            // 继续尝试下一个选择器
          }
        }

        console.warn('⚠️ 未找到可用的导航按钮');
        return false;
      } catch (error) {
        console.error('❌ 基础导航也失败:', error);
        return false;
      }
    }
  }
}
