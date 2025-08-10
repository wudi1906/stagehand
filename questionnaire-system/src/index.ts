/**
 * 智能问卷作答系统 - 主入口文件
 * 导出所有核心组件和类型定义
 */

// 核心系统
export { QuestionnaireSystem } from './core/QuestionnaireSystem';

// 管理器组件
export { DigitalPersonManager } from './digital-person/DigitalPersonManager';
export { QinguoProxyManager } from './proxy/QinguoProxyManager';
export { AdsPowerManager } from './browser/AdsPowerManager';
export { IntelligentAnswering } from './answering/IntelligentAnswering';
export { StagehandSuperIntelligentEngine } from './answering/StagehandSuperIntelligentEngine';
export { ContinuousAnsweringEnhancer } from './answering/ContinuousAnsweringEnhancer';
export { MemoryManager } from './memory/MemoryManager';
export { DigitalPersonMemoryManager } from './memory/DigitalPersonMemoryManager';
export { IntelligentCompletionManager } from './completion/IntelligentCompletionManager';
export { LifecycleManager } from './lifecycle/LifecycleManager';
export { StagehandConfigManager } from './stagehand/StagehandConfigManager';
export { WindowMonitoringSystem } from './lifecycle/WindowMonitoringSystem';
export { UnifiedResourceCleanupManager } from './lifecycle/UnifiedResourceCleanupManager';
export { WebInterface } from './web/WebInterface';

// 类型定义
export * from './types';

// 版本信息
export const VERSION = '1.0.0';
export const DESCRIPTION = '基于Stagehand技术栈的智能问卷作答系统';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║            🎯 智能问卷作答系统 v${VERSION}                     ║
║                基于Stagehand技术栈                           ║
╠══════════════════════════════════════════════════════════════╣
║  核心组件已加载:                                              ║
║    ✅ QuestionnaireSystem - 系统核心                        ║
║    ✅ DigitalPersonManager - 数字人档案                     ║
║    ✅ QinguoProxyManager - 青果代理                         ║
║    ✅ AdsPowerManager - 浏览器管理                          ║
║    ✅ IntelligentAnswering - 智能作答                       ║
║    🚀 StagehandSuperEngine - 超级智能引擎                 ║
║    🔄 ContinuousAnsweringEnhancer - 持续作答增强器        ║
║    ✅ MemoryManager - 记忆管理                              ║
║    🧠 DigitalPersonMemoryManager - 数字人记忆管理器       ║
║    🎯 IntelligentCompletionManager - 智能完成检测管理器   ║
║    ✅ LifecycleManager - 生命周期                           ║
║    🛡️ WindowMonitoringSystem - 窗口监控                   ║
║    🧹 UnifiedResourceCleanupManager - 资源清理             ║
║    ✅ WebInterface - Web界面                                ║
╚══════════════════════════════════════════════════════════════╝
`);