/**
 * 生命周期管理器
 * 负责记录和管理系统各个组件的生命周期事件
 */

import fs from 'fs/promises';
import path from 'path';
import { LifecycleEvent } from '../types';

export class LifecycleManager {
  private events: Map<string, LifecycleEvent[]> = new Map();
  private dataDir: string;
  private eventsFile: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'lifecycle');
    this.eventsFile = path.join(this.dataDir, 'lifecycle_events.json');
    console.log('🔄 生命周期管理器初始化完成');
  }

  /**
   * 初始化生命周期管理器
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 初始化生命周期管理器...');
      
      // 确保数据目录存在
      await this.ensureDataDirectory();
      
      // 加载现有事件数据
      await this.loadEventsFromFile();
      
      console.log(`✅ 生命周期管理器初始化完成，已加载 ${this.getTotalEventsCount()} 个事件记录`);
      
    } catch (error) {
      console.warn('⚠️ 生命周期管理器初始化失败，将使用内存模式:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 确保数据目录存在
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`📁 创建生命周期数据目录: ${this.dataDir}`);
    }
  }

  /**
   * 从文件加载事件数据
   */
  private async loadEventsFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.eventsFile, 'utf-8');
      const eventsData: { [sessionId: string]: LifecycleEvent[] } = JSON.parse(data);
      
      Object.entries(eventsData).forEach(([sessionId, events]) => {
        this.events.set(sessionId, events);
      });
      
      console.log(`📥 从文件加载了 ${Object.keys(eventsData).length} 个会话的事件记录`);
      
    } catch (error) {
      console.log('📝 没有找到现有事件文件，将创建新的事件存储');
    }
  }

  /**
   * 将事件数据保存到文件
   */
  private async saveEventsToFile(): Promise<void> {
    try {
      const eventsData: { [sessionId: string]: LifecycleEvent[] } = {};
      
      this.events.forEach((events, sessionId) => {
        eventsData[sessionId] = events;
      });
      
      const data = JSON.stringify(eventsData, null, 2);
      await fs.writeFile(this.eventsFile, data, 'utf-8');
      
      console.log(`💾 保存了 ${Object.keys(eventsData).length} 个会话的事件记录到文件`);
      
    } catch (error) {
      console.error('❌ 保存事件文件失败:', error);
    }
  }

  /**
   * 记录生命周期事件
   */
  async recordEvent(sessionId: string, event: Omit<LifecycleEvent, 'timestamp'>): Promise<void> {
    try {
          const lifecycleEvent: LifecycleEvent = {
      ...event,
      timestamp: Date.now()
    };
      
      if (!this.events.has(sessionId)) {
        this.events.set(sessionId, []);
      }
      
      this.events.get(sessionId)!.push(lifecycleEvent);
      
      console.log(`📝 记录生命周期事件 [${sessionId}]: ${event.type}`);
      
      // 定期保存到文件
      if (this.getTotalEventsCount() % 50 === 0) {
        await this.saveEventsToFile();
      }
      
    } catch (error) {
      console.error('❌ 记录生命周期事件失败:', error);
    }
  }

  /**
   * 获取会话的所有事件
   */
  getSessionEvents(sessionId: string): LifecycleEvent[] {
    return this.events.get(sessionId) || [];
  }

  /**
   * 获取会话的最新事件
   */
  getLatestEvent(sessionId: string): LifecycleEvent | null {
    const events = this.events.get(sessionId);
    if (!events || events.length === 0) {
      return null;
    }
    
    return events[events.length - 1] || null;
  }

  /**
   * 获取指定类型的事件
   */
  getEventsByType(sessionId: string, eventType: LifecycleEvent['type']): LifecycleEvent[] {
    const events = this.events.get(sessionId) || [];
    return events.filter(event => event.type === eventType);
  }

  /**
   * 获取会话持续时间
   */
  getSessionDuration(sessionId: string): number | null {
    const events = this.events.get(sessionId);
    if (!events || events.length === 0) {
      return null;
    }
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    
    if (!firstEvent || !lastEvent) {
      return null;
    }
    
    return lastEvent.timestamp - firstEvent.timestamp;
  }

  /**
   * 获取会话状态
   */
  getSessionStatus(sessionId: string): {
    status: string;
    duration: number | null;
    eventCount: number;
    lastEvent: LifecycleEvent | null;
  } {
    const events = this.events.get(sessionId) || [];
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    
    return {
      status: lastEvent?.type || 'unknown',
      duration: this.getSessionDuration(sessionId),
      eventCount: events.length,
      lastEvent: lastEvent || null
    };
  }

  /**
   * 获取所有活动会话
   */
  getActiveSessions(): string[] {
    const activeSessions: string[] = [];
    
    this.events.forEach((events, sessionId) => {
      const lastEvent = events[events.length - 1];
      if (lastEvent && !['completed', 'failed', 'cleaned'].includes(lastEvent.type)) {
        activeSessions.push(sessionId);
      }
    });
    
    return activeSessions;
  }

  /**
   * 获取已完成的会话
   */
  getCompletedSessions(): string[] {
    const completedSessions: string[] = [];
    
    this.events.forEach((events, sessionId) => {
      const lastEvent = events[events.length - 1];
      if (lastEvent && lastEvent.type === 'completed') {
        completedSessions.push(sessionId);
      }
    });
    
    return completedSessions;
  }

  /**
   * 获取失败的会话
   */
  getFailedSessions(): string[] {
    const failedSessions: string[] = [];
    
    this.events.forEach((events, sessionId) => {
      const lastEvent = events[events.length - 1];
      if (lastEvent && lastEvent.type === 'failed') {
        failedSessions.push(sessionId);
      }
    });
    
    return failedSessions;
  }

  /**
   * 清理会话事件
   */
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      await this.recordEvent(sessionId, {
        type: 'cleaned'
      });
      
      console.log(`🧹 会话生命周期清理完成: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ 清理会话生命周期失败:', error);
    }
  }

  /**
   * 删除会话的所有事件
   */
  async deleteSessionEvents(sessionId: string): Promise<boolean> {
    try {
      if (this.events.has(sessionId)) {
        this.events.delete(sessionId);
        await this.saveEventsToFile();
        console.log(`🗑️ 删除会话事件: ${sessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 删除会话事件失败:', error);
      return false;
    }
  }

  /**
   * 清理旧事件
   */
  async cleanupOldEvents(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffTime = Date.now() - maxAge;
      let cleanedCount = 0;
      
      this.events.forEach((events, sessionId) => {
        const lastEvent = events[events.length - 1];
        if (lastEvent && lastEvent.timestamp < cutoffTime) {
          this.events.delete(sessionId);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        await this.saveEventsToFile();
        console.log(`🧹 清理了 ${cleanedCount} 个过期会话的事件记录`);
      }
      
    } catch (error) {
      console.error('❌ 清理旧事件失败:', error);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    const totalSessions = this.events.size;
    const activeSessions = this.getActiveSessions().length;
    const completedSessions = this.getCompletedSessions().length;
    const failedSessions = this.getFailedSessions().length;
    const totalEvents = this.getTotalEventsCount();
    
    return {
      totalSessions,
      activeSessions,
      completedSessions,
      failedSessions,
      totalEvents,
      successRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      averageEventsPerSession: totalSessions > 0 ? totalEvents / totalSessions : 0
    };
  }

  /**
   * 获取总事件数量
   */
  private getTotalEventsCount(): number {
    let total = 0;
    this.events.forEach(events => {
      total += events.length;
    });
    return total;
  }

  /**
   * 导出事件数据
   */
  async exportEvents(): Promise<{ [sessionId: string]: LifecycleEvent[] }> {
    const eventsData: { [sessionId: string]: LifecycleEvent[] } = {};
    
    this.events.forEach((events, sessionId) => {
      eventsData[sessionId] = events;
    });
    
    return eventsData;
  }

  /**
   * 导入事件数据
   */
  async importEvents(eventsData: { [sessionId: string]: LifecycleEvent[] }): Promise<number> {
    try {
      let importCount = 0;
      
      Object.entries(eventsData).forEach(([sessionId, events]) => {
        this.events.set(sessionId, events);
        importCount += events.length;
      });
      
      await this.saveEventsToFile();
      console.log(`📥 导入了 ${Object.keys(eventsData).length} 个会话的 ${importCount} 个事件记录`);
      
      return importCount;
      
    } catch (error) {
      console.error('❌ 导入事件失败:', error);
      return 0;
    }
  }

  /**
   * 关闭生命周期管理器
   */
  async close(): Promise<void> {
    try {
      await this.saveEventsToFile();
      console.log('💾 生命周期管理器已关闭，数据已保存');
    } catch (error) {
      console.error('❌ 关闭生命周期管理器失败:', error);
    }
  }
}