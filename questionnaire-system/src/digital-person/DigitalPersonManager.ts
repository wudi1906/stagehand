/**
 * 数字人档案管理器
 * 负责管理数字人档案，支持内置档案和小社会API
 */

import axios from 'axios';
import { DigitalPersonProfile } from '../types';

export class DigitalPersonManager {
  private profiles: Map<string, DigitalPersonProfile> = new Map();
  private xiaosheApiUrl: string;
  private defaultProfiles: DigitalPersonProfile[] = [];

  constructor() {
    this.xiaosheApiUrl = process.env.XIAOSHE_API_URL || 'http://localhost:5001';
    this.initializeDefaultProfiles();
    console.log('👤 数字人档案管理器初始化完成');
  }

  /**
   * 初始化默认数字人档案
   */
  private initializeDefaultProfiles(): void {
    this.defaultProfiles = [
      {
        id: 'student_tech',
        name: '李小明',
        age: 22,
        gender: '男',
        education: '本科在读',
        occupation: '计算机科学学生',
        location: '北京',
        interests: ['编程', '游戏', '科技', '音乐'],
        personality: '好奇心强，喜欢探索新技术，性格开朗，善于思考',
        background: '计算机科学专业大四学生，对人工智能和软件开发有浓厚兴趣'
      },
      {
        id: 'office_worker',
        name: '王小红',
        age: 28,
        gender: '女',
        education: '硕士',
        occupation: '市场营销专员',
        location: '上海',
        interests: ['阅读', '旅行', '美食', '健身'],
        personality: '细心认真，善于沟通，有责任心，注重工作生活平衡',
        background: '工商管理硕士，在互联网公司从事市场营销工作3年'
      },
      {
        id: 'teacher',
        name: '张老师',
        age: 35,
        gender: '女',
        education: '硕士',
        occupation: '中学教师',
        location: '广州',
        interests: ['教育', '读书', '园艺', '摄影'],
        personality: '耐心负责，喜欢帮助他人，有教育情怀，注重细节',
        background: '教育学硕士，从事中学语文教学工作10年，深受学生喜爱'
      },
      {
        id: 'freelancer',
        name: '陈自由',
        age: 30,
        gender: '男',
        education: '本科',
        occupation: '自由设计师',
        location: '深圳',
        interests: ['设计', '艺术', '咖啡', '电影'],
        personality: '创意丰富，追求自由，独立思考，有艺术气质',
        background: '平面设计专业毕业，自由职业者，为多家公司提供设计服务'
      },
      {
        id: 'retiree',
        name: '刘大爷',
        age: 62,
        gender: '男',
        education: '高中',
        occupation: '退休工人',
        location: '天津',
        interests: ['太极拳', '象棋', '养花', '京剧'],
        personality: '性格温和，经验丰富，喜欢传统文化，乐于助人',
        background: '机械厂退休工人，有丰富的人生阅历，热心社区事务'
      }
    ];

    // 将默认档案加载到缓存中
    this.defaultProfiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });

    console.log(`📋 已加载 ${this.defaultProfiles.length} 个默认数字人档案`);
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    console.log('👤 初始化数字人档案管理器...');
    
    // 智能高性能模式：优先尝试小社会API，失败则使用内置档案
    try {
      console.log('🌐 尝试连接小社会API...');
      await this.testXiaosheAPI();
      console.log('✅ 小社会API连接成功，高性能模式已启用');
      
      // 尝试从API加载更多档案
      await this.loadProfilesFromAPI();
      
    } catch (error) {
      console.warn('⚠️ API获取失败，使用默认档案:', error instanceof Error ? error.message : String(error));
      console.log('💡 小社会API配置待优化，当前使用内置高性能数字人档案');
      console.log('📍 提示：检查XIAOSHE_API_URL环境变量和服务状态');
    }

    console.log(`✅ 数字人档案管理器初始化完成，共 ${this.profiles.size} 个档案可用`);
  }

  /**
   * 测试小社会API连接
   */
  private async testXiaosheAPI(): Promise<void> {
    try {
      const response = await axios.get(`${this.xiaosheApiUrl}/api/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ 小社会API连接测试成功');
      } else {
        throw new Error(`API返回状态码: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`小社会API连接失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从API加载档案
   */
  private async loadProfilesFromAPI(): Promise<void> {
    try {
      const response = await axios.get(`${this.xiaosheApiUrl}/api/digital-persons`, {
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((apiProfile: any) => {
          const profile: DigitalPersonProfile = {
            id: apiProfile.id || `api_${Date.now()}`,
            name: apiProfile.name || '未知',
            age: apiProfile.age || 25,
            gender: apiProfile.gender || '未知',
            education: apiProfile.education || '本科',
            occupation: apiProfile.occupation || '职员',
            location: apiProfile.location || '北京',
            interests: apiProfile.interests || ['生活'],
            personality: apiProfile.personality || '友善开朗',
            background: apiProfile.background,
            preferences: apiProfile.preferences
          };
          
          this.profiles.set(profile.id, profile);
        });
        
        console.log(`📥 从API加载了 ${response.data.length} 个额外档案`);
      }
      
    } catch (error) {
      console.warn('⚠️ 从API加载档案失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 获取数字人档案
   */
  async getProfile(profileId?: string): Promise<DigitalPersonProfile> {
    // 如果没有指定ID，使用默认档案
    if (!profileId || profileId === 'default') {
      profileId = 'student_tech';
    }

    // 首先从缓存中查找
    if (this.profiles.has(profileId)) {
      const profile = this.profiles.get(profileId)!;
      console.log(`👤 使用数字人档案: ${profile.name} (${profile.id})`);
      return profile;
    }

    // 尝试从API获取
    try {
      console.log(`🌐 从API获取档案: ${profileId}`);
      const response = await axios.get(`${this.xiaosheApiUrl}/api/digital-persons/${profileId}`, {
        timeout: 5000
      });
      
      if (response.data) {
        const apiProfile = response.data;
        const profile: DigitalPersonProfile = {
          id: apiProfile.id || profileId,
          name: apiProfile.name || '未知',
          age: apiProfile.age || 25,
          gender: apiProfile.gender || '未知',
          education: apiProfile.education || '本科',
          occupation: apiProfile.occupation || '职员',
          location: apiProfile.location || '北京',
          interests: apiProfile.interests || ['生活'],
          personality: apiProfile.personality || '友善开朗',
          background: apiProfile.background,
          preferences: apiProfile.preferences
        };
        
        // 缓存到本地
        this.profiles.set(profile.id, profile);
        console.log(`✅ 从API获取档案成功: ${profile.name}`);
        return profile;
      }
    } catch (error) {
      console.warn(`⚠️ 从API获取档案失败 (${profileId}):`, error instanceof Error ? error.message : String(error));
    }

    // 如果API失败，返回默认档案
    const defaultProfile = this.profiles.get('student_tech')!;
    console.log(`📋 使用默认档案: ${defaultProfile.name}`);
    return defaultProfile;
  }

  /**
   * 获取所有可用档案列表
   */
  getAllProfiles(): DigitalPersonProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * 创建自定义档案
   */
  createCustomProfile(profile: Omit<DigitalPersonProfile, 'id'>): DigitalPersonProfile {
    const customProfile: DigitalPersonProfile = {
      id: `custom_${Date.now()}`,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      education: profile.education,
      occupation: profile.occupation,
      location: profile.location,
      interests: profile.interests,
      personality: profile.personality,
      background: profile.background,
      preferences: profile.preferences
    };
    
    this.profiles.set(customProfile.id, customProfile);
    console.log(`✅ 创建自定义档案: ${customProfile.name} (${customProfile.id})`);
    
    return customProfile;
  }

  /**
   * 更新档案
   */
  updateProfile(profileId: string, updates: Partial<DigitalPersonProfile>): boolean {
    if (this.profiles.has(profileId)) {
      const existingProfile = this.profiles.get(profileId)!;
      const updatedProfile = { ...existingProfile, ...updates };
      this.profiles.set(profileId, updatedProfile);
      
      console.log(`✅ 档案更新成功: ${updatedProfile.name} (${profileId})`);
      return true;
    }
    
    console.warn(`⚠️ 档案不存在: ${profileId}`);
    return false;
  }

  /**
   * 删除档案
   */
  deleteProfile(profileId: string): boolean {
    if (this.profiles.has(profileId)) {
      // 不允许删除默认档案
      if (this.defaultProfiles.some(p => p.id === profileId)) {
        console.warn(`⚠️ 不能删除默认档案: ${profileId}`);
        return false;
      }
      
      this.profiles.delete(profileId);
      console.log(`✅ 档案删除成功: ${profileId}`);
      return true;
    }
    
    console.warn(`⚠️ 档案不存在: ${profileId}`);
    return false;
  }

  /**
   * 获取档案统计信息
   */
  getStats(): any {
    return {
      totalProfiles: this.profiles.size,
      defaultProfiles: this.defaultProfiles.length,
      customProfiles: this.profiles.size - this.defaultProfiles.length,
      profileIds: Array.from(this.profiles.keys())
    };
  }
}