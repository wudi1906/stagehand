/**
 * 高级使用示例
 * 展示系统的高级功能：记忆管理、暂停恢复、自定义配置等
 */

import { QuestionnaireSystem } from '../core/QuestionnaireSystem';
import { DigitalPersonManager } from '../digital-person/DigitalPersonManager';

async function advancedUsageExample(): Promise<void> {
  console.log('🎯 智能问卷作答系统 - 高级使用示例');

  const system = new QuestionnaireSystem();

  try {
    // 1. 初始化系统
    await system.initialize();

    // 2. 获取系统状态
    console.log('📊 系统状态:', system.getSystemStatus());

    // 3. 批量作答示例
    const questionnaireUrls = [
      'https://example1.com/questionnaire',
      'https://example2.com/questionnaire',
      'https://example3.com/questionnaire'
    ];

    const sessions: string[] = [];

    for (let i = 0; i < questionnaireUrls.length; i++) {
      const url = questionnaireUrls[i];
      if (!url) continue; // 跳过undefined的URL
      console.log(`🎯 启动作答 ${i + 1}/${questionnaireUrls.length}: ${url}`);

      const sessionId = await system.startAnswering({
        url: url, // 明确指定url
        mode: 'auto',
        digitalPersonId: ['student_tech', 'office_worker', 'teacher', 'freelancer', 'retiree'][i % 5], // 轮换使用不同数字人
        timeout: 600000, // 10分钟
        retryLimit: 5
      });

      sessions.push(sessionId);
      console.log(`✅ 会话 ${sessionId} 已启动`);

      // 等待一段时间再启动下一个
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 4. 监控所有会话
    console.log('📊 开始监控所有会话...');
    const monitorSessions = setInterval(async () => {
      let allCompleted = true;

      for (const sessionId of sessions) {
        const status = system.getSessionStatus(sessionId);
        console.log(`📋 ${sessionId}: ${status.status} (${status.progress?.answered || 0}/${status.progress?.total || 0})`);

        if (status.status === 'running' || status.status === 'pending') {
          allCompleted = false;
        }

        // 演示暂停和恢复功能
        if ((status.progress?.answered || 0) === 5 && status.status === 'running') {
          console.log(`⏸️ 暂停会话: ${sessionId}`);
          await system.pauseSession(sessionId);

          // 5秒后恢复
          setTimeout(async () => {
            console.log(`▶️ 恢复会话: ${sessionId}`);
            await system.resumeSession(sessionId);
          }, 5000);
        }
      }

      if (allCompleted) {
        console.log('✅ 所有会话已完成');
        clearInterval(monitorSessions);

        // 5. 输出最终统计
        console.log('📊 最终统计:');
        const systemStats = system.getSystemStatus();
        console.log(`   - 活动会话: ${systemStats.activeSessions}`);
        console.log(`   - 总会话: ${systemStats.sessionIds.length}`);

        // 6. 关闭系统
        await system.close();
      }
    }, 10000); // 每10秒检查一次

  } catch (error) {
    console.error('❌ 高级示例执行失败:', error);
    await system.close();
  }
}

async function customDigitalPersonExample(): Promise<void> {
  console.log('👤 自定义数字人档案示例');

  const digitalPersonManager = new DigitalPersonManager();
  await digitalPersonManager.initialize();

  // 创建自定义数字人档案
  const customProfile = digitalPersonManager.createCustomProfile({
    name: '张程序员',
    age: 29,
    gender: '男',
    education: '硕士',
    occupation: '前端工程师',
    location: '深圳市南山区',
    interests: ['编程', 'AI', '游戏', '科技'],
    personality: '逻辑思维强，喜欢探索新技术，注重用户体验',
    background: '计算机科学硕士，专注于前端技术3年，对AI和自动化工具很感兴趣',
    preferences: {
      workStyle: '敏捷开发，注重代码质量',
      technology: '偏爱现代化技术栈',
      learning: '持续学习新技术和最佳实践'
    }
  });

  console.log('✅ 自定义数字人档案已添加');
  console.log('📊 数字人统计:', digitalPersonManager.getStats());
  console.log('👤 自定义档案:', customProfile);
}

async function memorySystemExample(): Promise<void> {
  console.log('🧠 记忆系统示例');
  
  // 这里可以展示记忆系统的使用方法
  // 比如：查看缓存命中率、导出记忆数据等
  console.log('💡 记忆系统功能:');
  console.log('   - 自动缓存问题答案');
  console.log('   - 减少重复的LLM调用');
  console.log('   - 支持记忆导出和导入');
  console.log('   - 基于数字人ID+问卷ID的联合键');
  console.log('   - 智能相似问题匹配');
  console.log('   - 自动清理过期记忆');
}

// 运行示例
if (require.main === module) {
  console.log('选择要运行的示例:');
  console.log('1. 高级作答示例');
  console.log('2. 自定义数字人示例');
  console.log('3. 记忆系统示例');

  const exampleType = process.argv[2] || '1';

  switch (exampleType) {
    case '1':
      advancedUsageExample();
      break;
    case '2':
      customDigitalPersonExample();
      break;
    case '3':
      memorySystemExample();
      break;
    default:
      console.log('无效的示例类型，运行默认示例');
      advancedUsageExample();
  }
}