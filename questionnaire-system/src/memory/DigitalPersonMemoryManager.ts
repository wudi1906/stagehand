/**
 * 数字人记忆管理系统
 * 完全融合web-ui的数字人作答一致性记忆管理机制
 * 确保同一数字人在同一问卷中的作答一致性
 */

import { createHash } from 'crypto';
import { DigitalPersonProfile } from '../types';

// 题目记录接口
export interface QuestionRecord {
  questionId: string;          // 题目唯一ID
  questionText: string;        // 题目文本
  questionType: string;        // 题目类型：single_choice, multiple_choice, text_input等
  options: string[];           // 选项列表（如果有）
  answer: any;                 // 作答结果
  answerText: string;          // 作答文本描述
  pageUrl: string;             // 题目所在页面
  timestamp: number;           // 作答时间
  attempts: number;            // 尝试次数
  confidence: number;          // 作答信心度
}

// 问卷记忆接口
export interface QuestionnaireMemory {
  questionnaireId: string;     // 问卷ID
  digitalPersonId: string;     // 数字人ID
  startTime: number;           // 开始时间
  questions: Record<string, QuestionRecord>; // 题目记录
  questionOrder: string[];     // 题目顺序
  currentPosition: number;     // 当前位置
  totalQuestions: number;      // 总题目数
  completedQuestions: number;  // 已完成题目数
}

// 题目特征接口
interface QuestionFeatures {
  normalizedText: string;
  normalizedOptions: string[];
  keywords: Set<string>;
  optionKeywords: Set<string>;
  textLength: number;
  optionCount: number;
}

// 一致性作答建议接口
export interface ConsistentAnswerSuggestion {
  suggestedAnswer: any;
  suggestedAnswerText: string;
  referenceQuestionId: string;
  referenceQuestionText: string;
  similarityReason: string;
  confidence: number;
}

// 进度信息接口
export interface ProgressInfo {
  currentPosition: number;
  totalQuestions: number;
  completedQuestions: number;
  completionRate: number;
  elapsedTime: number;
  digitalPersonId: string;
  questionnaireId: string;
}

export class DigitalPersonMemoryManager {
  private questionnaireUrl: string;
  private digitalPersonInfo: DigitalPersonProfile;
  private questionnaireId: string;
  private digitalPersonId: string;
  private memory: QuestionnaireMemory;
  
  constructor(questionnaireUrl: string, digitalPersonInfo: DigitalPersonProfile) {
    this.questionnaireUrl = questionnaireUrl;
    this.digitalPersonInfo = digitalPersonInfo;
    
    // 生成ID
    this.questionnaireId = this.generateQuestionnaireId(questionnaireUrl);
    this.digitalPersonId = this.generateDigitalPersonId(digitalPersonInfo);
    
    // 初始化记忆
    this.memory = {
      questionnaireId: this.questionnaireId,
      digitalPersonId: this.digitalPersonId,
      startTime: Date.now(),
      questions: {},
      questionOrder: [],
      currentPosition: 0,
      totalQuestions: 0,
      completedQuestions: 0
    };
    
    console.log(`🧠 数字人记忆管理器初始化: ${this.digitalPersonId.substring(0, 8)}...@${this.questionnaireId.substring(0, 8)}...`);
  }
  
  /**
   * 生成问卷ID
   */
  private generateQuestionnaireId(url: string): string {
    return createHash('md5').update(url).digest('hex').substring(0, 12);
  }
  
  /**
   * 生成数字人ID
   */
  private generateDigitalPersonId(personInfo: DigitalPersonProfile): string {
    // 基于关键身份信息生成稳定ID
    const keyInfo = `${personInfo.name || ''}_${personInfo.age || ''}_${personInfo.gender || ''}`;
    return createHash('md5').update(keyInfo).digest('hex').substring(0, 10);
  }
  
  /**
   * 标准化题目文本，用于相似性比较
   */
  private normalizeQuestionText(text: string): string {
    // 移除多余空白字符
    text = text.replace(/\s+/g, ' ').trim();
    // 移除标点符号
    text = text.replace(/[^\w\s]/g, '');
    // 转换为小写
    return text.toLowerCase();
  }
  
  /**
   * 提取题目特征用于相似性比较
   */
  private extractQuestionFeatures(questionText: string, options: string[]): QuestionFeatures {
    const normalizedText = this.normalizeQuestionText(questionText);
    const normalizedOptions = options.map(opt => this.normalizeQuestionText(opt));
    
    // 提取关键词
    const keywords = new Set(normalizedText.split(' ').filter(word => word.length > 2));
    const optionKeywords = new Set<string>();
    
    normalizedOptions.forEach(opt => {
      opt.split(' ').filter(word => word.length > 2).forEach(word => {
        optionKeywords.add(word);
      });
    });
    
    return {
      normalizedText,
      normalizedOptions,
      keywords,
      optionKeywords,
      textLength: normalizedText.length,
      optionCount: options.length
    };
  }
  
  /**
   * 计算题目相似性
   */
  private calculateQuestionSimilarity(features1: QuestionFeatures, features2: QuestionFeatures): number {
    // 文本相似性（使用简单的Levenshtein距离）
    const textSimilarity = this.calculateStringSimilarity(features1.normalizedText, features2.normalizedText);
    
    // 关键词相似性
    const keywords1 = features1.keywords;
    const keywords2 = features2.keywords;
    const commonKeywords = new Set([...keywords1].filter(k => keywords2.has(k)));
    const totalKeywords = new Set([...keywords1, ...keywords2]);
    const keywordSimilarity = totalKeywords.size > 0 ? commonKeywords.size / totalKeywords.size : 0;
    
    // 选项相似性
    const options1 = new Set(features1.normalizedOptions);
    const options2 = new Set(features2.normalizedOptions);
    const commonOptions = new Set([...options1].filter(o => options2.has(o)));
    const totalOptions = new Set([...options1, ...options2]);
    const optionSimilarity = totalOptions.size > 0 ? commonOptions.size / totalOptions.size : 0;
    
    // 选项数量相似性
    const optionCountSimilarity = features1.optionCount === features2.optionCount ? 1.0 : 0.5;
    
    // 综合相似性计算 (加权平均) - 完全对标web-ui
    const totalSimilarity = (
      textSimilarity * 0.4 +
      keywordSimilarity * 0.3 +
      optionSimilarity * 0.2 +
      optionCountSimilarity * 0.1
    );
    
    return totalSimilarity;
  }
  
  /**
   * 计算字符串相似性（简化版）
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    // 使用简化的编辑距离算法
    const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i]![0] = i;
    for (let j = 0; j <= len2; j++) matrix[0]![j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1]![len2]!) / maxLen;
  }
  
  /**
   * 查找相似题目
   */
  findSimilarQuestion(questionText: string, options: string[], similarityThreshold: number = 0.8): QuestionRecord | null {
    const currentFeatures = this.extractQuestionFeatures(questionText, options);
    
    let bestMatch: QuestionRecord | null = null;
    let bestSimilarity = 0.0;
    
    for (const questionRecord of Object.values(this.memory.questions)) {
      const storedFeatures = this.extractQuestionFeatures(questionRecord.questionText, questionRecord.options);
      const similarity = this.calculateQuestionSimilarity(currentFeatures, storedFeatures);
      
      if (similarity > similarityThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = questionRecord;
      }
    }
    
    if (bestMatch) {
      console.log(`🔍 找到相似题目 (相似度: ${bestSimilarity.toFixed(2)}): ${bestMatch.questionId.substring(0, 8)}...`);
      console.log(`   原题目: ${bestMatch.questionText.substring(0, 100)}...`);
      console.log(`   原作答: ${bestMatch.answerText}`);
    }
    
    return bestMatch;
  }
  
  /**
   * 生成题目ID
   */
  generateQuestionId(questionText: string, pageUrl: string): string {
    const normalizedText = this.normalizeQuestionText(questionText);
    const combined = `${pageUrl}|${normalizedText}`;
    return createHash('md5').update(combined).digest('hex').substring(0, 16);
  }
  
  /**
   * 记录题目作答
   */
  recordQuestionAnswer(
    questionText: string,
    questionType: string,
    options: string[],
    answer: any,
    answerText: string,
    pageUrl: string,
    attempts: number = 1,
    confidence: number = 1.0
  ): string {
    const questionId = this.generateQuestionId(questionText, pageUrl);
    
    // 创建题目记录
    const questionRecord: QuestionRecord = {
      questionId,
      questionText,
      questionType,
      options,
      answer,
      answerText,
      pageUrl,
      timestamp: Date.now(),
      attempts,
      confidence
    };
    
    // 如果是新题目，添加到记录中
    if (!(questionId in this.memory.questions)) {
      this.memory.questions[questionId] = questionRecord;
      this.memory.questionOrder.push(questionId);
      this.memory.totalQuestions = Object.keys(this.memory.questions).length;
      this.memory.completedQuestions += 1;
      
      console.log(`📝 记录新题目作答: ${questionId.substring(0, 8)}... (${this.memory.completedQuestions}/${this.memory.totalQuestions})`);
      console.log(`   题目: ${questionText.substring(0, 100)}...`);
      console.log(`   作答: ${answerText}`);
    } else {
      // 更新现有记录
      this.memory.questions[questionId] = questionRecord;
      console.log(`🔄 更新题目作答: ${questionId.substring(0, 8)}...`);
    }
    
    return questionId;
  }
  
  /**
   * 获取一致性作答建议
   */
  getConsistentAnswerSuggestion(questionText: string, options: string[]): ConsistentAnswerSuggestion | null {
    const similarQuestion = this.findSimilarQuestion(questionText, options);
    
    if (similarQuestion) {
      const questionIndex = this.memory.questionOrder.indexOf(similarQuestion.questionId);
      return {
        suggestedAnswer: similarQuestion.answer,
        suggestedAnswerText: similarQuestion.answerText,
        referenceQuestionId: similarQuestion.questionId,
        referenceQuestionText: similarQuestion.questionText,
        similarityReason: `与第${questionIndex + 1}题相似`,
        confidence: similarQuestion.confidence
      };
    }
    
    return null;
  }
  
  /**
   * 获取作答进度信息
   */
  getProgressInfo(): ProgressInfo {
    const elapsedTime = Date.now() - this.memory.startTime;
    const completionRate = this.memory.totalQuestions > 0 
      ? (this.memory.completedQuestions / this.memory.totalQuestions * 100) 
      : 0;
    
    return {
      currentPosition: this.memory.currentPosition,
      totalQuestions: this.memory.totalQuestions,
      completedQuestions: this.memory.completedQuestions,
      completionRate,
      elapsedTime,
      digitalPersonId: this.digitalPersonId,
      questionnaireId: this.questionnaireId
    };
  }
  
  /**
   * 推进当前位置
   */
  advancePosition(): void {
    this.memory.currentPosition += 1;
    console.log(`➡️ 作答位置推进: ${this.memory.currentPosition}/${this.memory.totalQuestions}`);
  }
  
  /**
   * 获取记忆摘要
   */
  getMemorySummary(): any {
    const questionSummaries = this.memory.questionOrder.map((questionId, index) => {
      const record = this.memory.questions[questionId];
      if (!record) {
        return {
          position: index + 1,
          questionId,
          questionPreview: "未找到记录",
          answerText: "未知",
          attempts: 0,
          confidence: 0
        };
      }
      
      return {
        position: index + 1,
        questionId,
        questionPreview: record.questionText.length > 100 
          ? record.questionText.substring(0, 100) + "..." 
          : record.questionText,
        answerText: record.answerText,
        attempts: record.attempts,
        confidence: record.confidence
      };
    });
    
    const elapsedTime = Date.now() - this.memory.startTime;
    
    return {
      questionnaireInfo: {
        questionnaireId: this.memory.questionnaireId,
        digitalPersonId: this.memory.digitalPersonId,
        startTime: this.memory.startTime,
        elapsedTime
      },
      progress: this.getProgressInfo(),
      questions: questionSummaries
    };
  }
  
  /**
   * 导出完整记忆
   */
  exportMemory(): any {
    return {
      memory: this.memory,
      digitalPersonInfo: this.digitalPersonInfo,
      questionnaireUrl: this.questionnaireUrl
    };
  }
  
  /**
   * 导入记忆
   */
  importMemory(memoryData: any): void {
    try {
      this.memory = memoryData.memory;
      console.log(`📥 成功导入记忆: ${Object.keys(this.memory.questions).length}个题目记录`);
    } catch (error) {
      console.error(`❌ 导入记忆失败:`, error);
    }
  }
  
  /**
   * 清理所有记忆资源
   */
  cleanupMemory(): void {
    try {
      if (this.memory) {
        // 清理所有题目记录
        this.memory.questions = {};
        
        // 重置计数器和位置信息
        this.memory.totalQuestions = 0;
        this.memory.completedQuestions = 0;
        this.memory.currentPosition = 0;
        
        // 清理作答历史
        this.memory.questionOrder = [];
        
        console.log("🧹 数字人记忆资源已清理");
      } else {
        console.log("ℹ️ 无记忆资源需要清理");
      }
    } catch (error) {
      console.error("❌ 清理记忆资源失败:", error);
    }
  }
  
  /**
   * 获取数字人身份信息
   */
  getDigitalPersonInfo(): DigitalPersonProfile {
    return this.digitalPersonInfo;
  }
  
  /**
   * 获取问卷ID
   */
  getQuestionnaireId(): string {
    return this.questionnaireId;
  }
  
  /**
   * 获取数字人ID
   */
  getDigitalPersonId(): string {
    return this.digitalPersonId;
  }
  
  /**
   * 保存记忆到磁盘（预留方法）
   */
  async saveMemoryToDisk(): Promise<void> {
    try {
      // 预留实现 - 可以保存到文件系统或数据库
      const memoryData = this.exportMemory();
      console.log(`💾 记忆保存功能准备就绪，数据大小: ${JSON.stringify(memoryData).length} 字符`);
    } catch (error) {
      console.error("❌ 保存记忆到磁盘失败:", error);
    }
  }
}