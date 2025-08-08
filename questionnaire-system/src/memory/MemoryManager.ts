/**
 * 记忆管理器
 * 负责缓存问题答案和观察结果，提高作答效率
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { MemoryRecord } from '../types';

export class MemoryManager {
  private memoryCache: Map<string, MemoryRecord> = new Map();
  private dataDir: string;
  private memoryFile: string;
  private maxCacheSize: number = 10000;
  private cacheHitCount: number = 0;
  private cacheMissCount: number = 0;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'memory');
    this.memoryFile = path.join(this.dataDir, 'questionnaire_memory.json');
    console.log('🧠 记忆管理器初始化完成');
  }

  /**
   * 初始化记忆管理器
   */
  async initialize(): Promise<void> {
    try {
      console.log('🧠 初始化记忆管理器...');
      
      // 确保数据目录存在
      await this.ensureDataDirectory();
      
      // 加载现有记忆数据
      await this.loadMemoryFromFile();
      
      console.log(`✅ 记忆管理器初始化完成，已加载 ${this.memoryCache.size} 条记忆记录`);
      
    } catch (error) {
      console.warn('⚠️ 记忆管理器初始化失败，将使用内存模式:', error instanceof Error ? error.message : String(error));
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
      console.log(`📁 创建记忆数据目录: ${this.dataDir}`);
    }
  }

  /**
   * 从文件加载记忆数据
   */
  private async loadMemoryFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.memoryFile, 'utf-8');
      const memoryRecords: MemoryRecord[] = JSON.parse(data);
      
      memoryRecords.forEach(record => {
        const key = this.generateMemoryKey(record.digitalPersonId, record.questionnaireId, record.questionHash);
        this.memoryCache.set(key, record);
      });
      
      console.log(`📥 从文件加载了 ${memoryRecords.length} 条记忆记录`);
      
    } catch (error) {
      console.log('📝 没有找到现有记忆文件，将创建新的记忆存储');
    }
  }

  /**
   * 将记忆数据保存到文件
   */
  private async saveMemoryToFile(): Promise<void> {
    try {
      const memoryRecords = Array.from(this.memoryCache.values());
      const data = JSON.stringify(memoryRecords, null, 2);
      await fs.writeFile(this.memoryFile, data, 'utf-8');
      
      console.log(`💾 保存了 ${memoryRecords.length} 条记忆记录到文件`);
      
    } catch (error) {
      console.error('❌ 保存记忆文件失败:', error);
    }
  }

  /**
   * 生成记忆键
   */
  private generateMemoryKey(digitalPersonId: string, questionnaireId: string, questionHash: string): string {
    return `${digitalPersonId}:${questionnaireId}:${questionHash}`;
  }

  /**
   * 生成问题哈希
   */
  private generateQuestionHash(questionText: string): string {
    return crypto.createHash('md5').update(questionText.toLowerCase().trim()).digest('hex');
  }

  /**
   * 缓存观察结果
   */
  async cacheObserveResult(
    digitalPersonId: string,
    questionnaireId: string,
    questionText: string,
    answer: string | string[],
    success: boolean,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const questionHash = this.generateQuestionHash(questionText);
      const memoryKey = this.generateMemoryKey(digitalPersonId, questionnaireId, questionHash);
      
      const memoryRecord: MemoryRecord = {
        id: `${memoryKey}_${Date.now()}`,
        digitalPersonId,
        questionnaireId,
        questionHash,
        questionText,
        answer,
        timestamp: Date.now(),
        success,
        context
      };
      
      this.memoryCache.set(memoryKey, memoryRecord);
      
      // 如果缓存过大，清理旧记录
      if (this.memoryCache.size > this.maxCacheSize) {
        await this.cleanupOldMemories();
      }
      
      // 定期保存到文件
      if (this.memoryCache.size % 100 === 0) {
        await this.saveMemoryToFile();
      }
      
      console.log(`🧠 缓存记忆: ${questionText.substring(0, 50)}... -> ${typeof answer === 'string' ? answer.substring(0, 30) : '[多选]'}`);
      
    } catch (error) {
      console.error('❌ 缓存记忆失败:', error);
    }
  }

  /**
   * 获取缓存的记忆
   */
  async getMemory(
    digitalPersonId: string,
    questionnaireId: string,
    questionText: string
  ): Promise<MemoryRecord | null> {
    try {
      const questionHash = this.generateQuestionHash(questionText);
      const memoryKey = this.generateMemoryKey(digitalPersonId, questionnaireId, questionHash);
      
      const memory = this.memoryCache.get(memoryKey);
      
      if (memory) {
        this.cacheHitCount++;
        console.log(`🎯 命中记忆: ${questionText.substring(0, 50)}...`);
        return memory;
      } else {
        this.cacheMissCount++;
        return null;
      }
      
    } catch (error) {
      console.error('❌ 获取记忆失败:', error);
      return null;
    }
  }

  /**
   * 检查是否有相似问题的记忆
   */
  async findSimilarMemory(
    digitalPersonId: string,
    questionText: string
  ): Promise<MemoryRecord | null> {
    try {
      const normalizedQuestion = questionText.toLowerCase().trim();
      
      for (const memory of this.memoryCache.values()) {
        if (memory.digitalPersonId === digitalPersonId) {
          const similarity = this.calculateTextSimilarity(
            normalizedQuestion,
            memory.questionText.toLowerCase().trim()
          );
          
          if (similarity > 0.8) { // 相似度阈值
            console.log(`🔍 找到相似记忆 (相似度: ${Math.round(similarity * 100)}%): ${memory.questionText.substring(0, 50)}...`);
            return memory;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 查找相似记忆失败:', error);
      return null;
    }
  }

  /**
   * 计算文本相似度（简单版本）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 清理旧记忆
   */
  private async cleanupOldMemories(): Promise<void> {
    try {
      const memories = Array.from(this.memoryCache.entries());
      
      // 按时间戳排序，删除最旧的记录
      memories.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = memories.slice(0, Math.floor(this.maxCacheSize * 0.1)); // 删除10%的旧记录
      
      toDelete.forEach(([key]) => {
        this.memoryCache.delete(key);
      });
      
      console.log(`🧹 清理了 ${toDelete.length} 条旧记忆记录`);
      
    } catch (error) {
      console.error('❌ 清理旧记忆失败:', error);
    }
  }

  /**
   * 获取指定数字人的所有记忆
   */
  getMemoriesByDigitalPerson(digitalPersonId: string): MemoryRecord[] {
    return Array.from(this.memoryCache.values())
      .filter(memory => memory.digitalPersonId === digitalPersonId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取指定问卷的所有记忆
   */
  getMemoriesByQuestionnaire(questionnaireId: string): MemoryRecord[] {
    return Array.from(this.memoryCache.values())
      .filter(memory => memory.questionnaireId === questionnaireId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 删除记忆
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      for (const [key, memory] of this.memoryCache.entries()) {
        if (memory.id === memoryId) {
          this.memoryCache.delete(key);
          console.log(`🗑️ 删除记忆: ${memory.questionText.substring(0, 50)}...`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ 删除记忆失败:', error);
      return false;
    }
  }

  /**
   * 清空所有记忆
   */
  async clearAllMemories(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.cacheHitCount = 0;
      this.cacheMissCount = 0;
      
      // 删除文件
      try {
        await fs.unlink(this.memoryFile);
      } catch {
        // 文件可能不存在，忽略错误
      }
      
      console.log('🧹 已清空所有记忆');
      
    } catch (error) {
      console.error('❌ 清空记忆失败:', error);
    }
  }

  /**
   * 获取记忆统计信息
   */
  getStats(): any {
    const totalRequests = this.cacheHitCount + this.cacheMissCount;
    const hitRate = totalRequests > 0 ? this.cacheHitCount / totalRequests : 0;
    
    return {
      totalRecords: this.memoryCache.size,
      cacheHitRate: Math.round(hitRate * 100) / 100,
      cacheHits: this.cacheHitCount,
      cacheMisses: this.cacheMissCount,
      totalRequests,
      maxCacheSize: this.maxCacheSize
    };
  }

  /**
   * 导出记忆数据
   */
  async exportMemories(): Promise<MemoryRecord[]> {
    return Array.from(this.memoryCache.values());
  }

  /**
   * 导入记忆数据
   */
  async importMemories(memories: MemoryRecord[]): Promise<number> {
    try {
      let importCount = 0;
      
      memories.forEach(memory => {
        const key = this.generateMemoryKey(memory.digitalPersonId, memory.questionnaireId, memory.questionHash);
        this.memoryCache.set(key, memory);
        importCount++;
      });
      
      await this.saveMemoryToFile();
      console.log(`📥 导入了 ${importCount} 条记忆记录`);
      
      return importCount;
      
    } catch (error) {
      console.error('❌ 导入记忆失败:', error);
      return 0;
    }
  }

  /**
   * 关闭记忆管理器
   */
  async close(): Promise<void> {
    try {
      await this.saveMemoryToFile();
      console.log('💾 记忆管理器已关闭，数据已保存');
    } catch (error) {
      console.error('❌ 关闭记忆管理器失败:', error);
    }
  }
}