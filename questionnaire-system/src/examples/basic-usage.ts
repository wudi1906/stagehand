/**
 * 基础使用示例
 * 展示如何使用智能问卷作答系统
 */

import { QuestionnaireSystem } from '../core/QuestionnaireSystem';

async function basicUsageExample(): Promise<void> {
  console.log('🎯 智能问卷作答系统 - 基础使用示例');

  // 1. 创建问卷系统实例
  const system = new QuestionnaireSystem();

  try {
    // 2. 初始化系统
    console.log('🚀 正在初始化系统...');
    await system.initialize();

    // 3. 启动智能作答
    console.log('🎯 启动智能作答...');
    const sessionId = await system.startAnswering({
      url: 'https://example.com/questionnaire',
      mode: 'auto', // 自动模式：智能选择最佳策略
      digitalPersonId: 'student_tech', // 指定数字人档案
      timeout: 300000, // 5分钟超时
      retryLimit: 3 // 最多重试3次
    });

    console.log(`✅ 作答会话已启动: ${sessionId}`);

    // 4. 监控作答进度
    const checkProgress = setInterval(async () => {
      const status = system.getSessionStatus(sessionId);
      console.log(`📊 作答进度: ${status.progress?.answered}/${status.progress?.total} - ${status.status}`);

      if (status.status === 'completed') {
        console.log('✅ 作答完成！');
        console.log('📋 结果:', status.result);
        clearInterval(checkProgress);
        // 关闭系统
        await system.close();
      } else if (status.status === 'failed') {
        console.log('❌ 作答失败:', status.error);
        clearInterval(checkProgress);
        // 关闭系统
        await system.close();
      }
    }, 5000);

  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    await system.close();
  }
}

// 运行示例
if (require.main === module) {
  basicUsageExample();
}