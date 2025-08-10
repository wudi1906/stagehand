/**
 * 本地Playwright引擎
 * 完全不依赖外部API，直接使用Playwright进行页面操作
 * 专注作答！作答！作答！
 */

import { Page } from 'playwright';
import { DigitalPersonProfile } from '../types';

export interface LocalPlaywrightResult {
  success: boolean;
  totalAnswered: number;
  logs: string[];
  error?: string;
}

export class LocalPlaywrightEngine {
  private page: Page;
  private digitalPerson: DigitalPersonProfile;
  private logs: string[] = [];

  constructor(page: Page, digitalPerson: DigitalPersonProfile) {
    this.page = page;
    this.digitalPerson = digitalPerson;
    this.log('🎯 本地Playwright引擎启动');
    this.log(`👤 数字人: ${digitalPerson.name} (${digitalPerson.age}岁, ${digitalPerson.occupation})`);
  }

  private log(message: string): void {
    console.log(message);
    this.logs.push(message);
  }

  /**
   * 本地直接作答流程 - 不依赖任何外部API
   */
  async executeLocalAnswering(): Promise<LocalPlaywrightResult> {
    this.log('\n🚀 === 本地Playwright作答开始 ===');
    this.log('⚡ 完全不依赖外部API，直接操作页面元素！');
    
    try {
      // 测试页面连接
      this.log('\n📋 测试页面连接');
      const title = await this.page.title();
      this.log(`✅ 页面标题: ${title}`);
      
      let answeredCount = 0;
      
      // 第一题：性别选择
      this.log('\n⚡ 作答第1题：性别选择');
      
      try {
        // 根据数字人性别选择
        const gender = this.getDigitalPersonGender();
        this.log(`🧠 数字人性别判断: ${gender}`);
        
        if (gender === '女') {
          // 点击女选项
          await this.page.click('input[value="女"], input[type="radio"][name*="性别"]:nth-of-type(2), label:has-text("女")');
          this.log('✅ 已选择"女"选项');
        } else {
          // 点击男选项
          await this.page.click('input[value="男"], input[type="radio"][name*="性别"]:nth-of-type(1), label:has-text("男")');
          this.log('✅ 已选择"男"选项');
        }
        
        answeredCount++;
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        this.log(`⚠️ 第1题作答失败: ${error}`);
      }
      
      // 第二题：网购经历
      this.log('\n⚡ 作答第2题：网购经历');
      
      try {
        // 根据数字人年龄和职业判断网购经历
        const hasOnlineShopping = this.digitalPerson.age >= 20; // 20岁以上一般都有网购经历
        this.log(`🧠 数字人网购判断: ${hasOnlineShopping ? '有' : '无'}网购经历`);
        
        if (hasOnlineShopping) {
          await this.page.click('input[value="是"], label:has-text("是")');
          this.log('✅ 已选择"是"（有网购经历）');
        } else {
          await this.page.click('input[value="否"], label:has-text("否")');
          this.log('✅ 已选择"否"（无网购经历）');
        }
        
        answeredCount++;
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        this.log(`⚠️ 第2题作答失败: ${error}`);
      }
      
      // 第三题：网购原因（多选）
      this.log('\n⚡ 作答第3题：网购原因（多选）');
      
      try {
        // 根据数字人职业特点选择网购原因
        const reasons = this.getShoppingReasons();
        this.log(`🧠 数字人网购原因: ${reasons.join('、')}`);
        
        // 选择"方便快捷，节省时间"
        if (reasons.includes('方便快捷')) {
          await this.page.click('input[type="checkbox"]:has-text("方便快捷"), label:has-text("方便快捷")');
          this.log('✅ 已选择"方便快捷，节省时间"');
        }
        
        // 选择"品种齐全"
        if (reasons.includes('品种齐全')) {
          await this.page.click('input[type="checkbox"]:has-text("品种齐全"), label:has-text("品种齐全")');
          this.log('✅ 已选择"品种齐全"');
        }
        
        // 选择"价格便宜"
        if (reasons.includes('价格便宜')) {
          await this.page.click('input[type="checkbox"]:has-text("价格便宜"), label:has-text("价格便宜")');
          this.log('✅ 已选择"价格便宜"');
        }
        
        answeredCount++;
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        this.log(`⚠️ 第3题作答失败: ${error}`);
      }
      
      // 尝试提交或下一页
      this.log('\n⚡ 尝试提交或进入下一页');
      
      try {
        // 查找提交按钮
        const submitSelectors = [
          'button:has-text("提交")',
          'button:has-text("下一页")',
          'button:has-text("继续")',
          'input[type="submit"]',
          'button[type="submit"]',
          '.submit-btn',
          '.next-btn'
        ];
        
        for (const selector of submitSelectors) {
          try {
            const button = await this.page.$(selector);
            if (button) {
              await button.click();
              this.log(`✅ 已点击提交按钮: ${selector}`);
              break;
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        await this.page.waitForTimeout(2000);
        
      } catch (error) {
        this.log(`⚠️ 提交失败: ${error}`);
      }

      this.log(`\n🎉 === 本地作答完成 ===`);
      this.log(`📊 成功作答: ${answeredCount}题`);
      
      return {
        success: answeredCount > 0,
        totalAnswered: answeredCount,
        logs: this.logs
      };

    } catch (error: any) {
      this.log(`❌ 本地作答失败: ${error.message || error}`);
      return {
        success: false,
        totalAnswered: 0,
        logs: this.logs,
        error: error.message || String(error)
      };
    }
  }

  /**
   * 根据数字人姓名判断性别
   */
  private getDigitalPersonGender(): string {
    const name = this.digitalPerson.name;
    // 简单的性别判断逻辑
    if (name.includes('梦') || name.includes('娟') || name.includes('丽') || name.includes('美')) {
      return '女';
    }
    return '男';
  }

  /**
   * 根据数字人特征选择网购原因
   */
  private getShoppingReasons(): string[] {
    const { occupation, age, income } = this.digitalPerson;
    const reasons = [];
    
    // 年轻人更注重方便快捷
    if (age <= 30) {
      reasons.push('方便快捷');
    }
    
    // 技术类职业更注重品种齐全
    if (occupation.includes('工程师') || occupation.includes('设计师')) {
      reasons.push('品种齐全');
    }
    
    // 收入较低的更注重价格
    if (typeof income === 'string' && income.includes('8000-12000')) {
      reasons.push('价格便宜');
    }
    
    // 默认至少选择方便快捷
    if (reasons.length === 0) {
      reasons.push('方便快捷');
    }
    
    return reasons;
  }
}
