/**
 * 最简单的测试引擎 - 绕过所有复杂逻辑
 * 直接测试Stagehand基础功能！
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { DigitalPersonProfile } from '../types';

export interface SimpleTestResult {
  success: boolean;
  totalAnswered: number;
  logs: string[];
  error?: string;
}

export class SimpleTestEngine {
  private stagehand: Stagehand;
  private digitalPerson: DigitalPersonProfile;
  private logs: string[] = [];

  constructor(stagehand: Stagehand, digitalPerson: DigitalPersonProfile) {
    this.stagehand = stagehand;
    this.digitalPerson = digitalPerson;
    this.log('🎯 最简单测试引擎启动');
    this.log(`👤 数字人: ${digitalPerson.name}`);
  }

  private log(message: string): void {
    console.log(message);
    this.logs.push(message);
  }

  /**
   * 最简单的测试流程
   */
  async executeSimpleTest(): Promise<SimpleTestResult> {
    this.log('\n🚀 === 最简单测试开始 ===');
    this.log('⚡ 目标：绕过所有干扰，直接测试Stagehand！');
    
    try {
      // 测试1：最基础的页面信息获取
      this.log('\n📋 测试1：获取页面标题');
      const title = await this.stagehand.page.title();
      this.log(`✅ 页面标题: ${title}`);
      
      // 测试2：最简单的act操作
      this.log('\n⚡ 测试2：执行简单act操作');
      this.log('🎯 尝试点击第一个性别选项（女）');
      
      await this.stagehand.page.act('点击"女"选项');
      
      this.log('✅ act操作执行完成');
      
      // 测试3：再次尝试act操作
      this.log('\n⚡ 测试3：执行第二个act操作');
      this.log('🎯 尝试点击"是"选项（网购经历）');
      
      await this.stagehand.page.act('在问题"你过去3个月是否曾经在网络上购买东西?"中点击"是"选项');
      
      this.log('✅ 第二个act操作执行完成');

      // 测试4：多选题测试
      this.log('\n⚡ 测试4：执行多选题act操作');
      this.log('🎯 选择网购原因：方便快捷、节省时间');
      
      await this.stagehand.page.act('在多选题"你选择网络购物的主要原因是？"中选择"方便快捷，节省时间"');
      
      this.log('✅ 多选题act操作执行完成');

      this.log('\n🎉 === 简单测试完成 ===');
      this.log('📊 成功执行了基础的Stagehand操作');
      
      return {
        success: true,
        totalAnswered: 3,
        logs: this.logs
      };

    } catch (error: any) {
      this.log(`❌ 测试失败: ${error.message || error}`);
      this.log(`🔍 错误详情: ${JSON.stringify(error, null, 2)}`);
      return {
        success: false,
        totalAnswered: 0,
        logs: this.logs,
        error: error.message || String(error)
      };
    }
  }
}
