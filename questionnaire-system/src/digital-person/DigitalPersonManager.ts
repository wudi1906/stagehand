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
   * 加载小社会系统备用方案数字人 - 包含完整的小社会数据结构
   */
  private loadXiaosheFallbackProfiles(): void {
    console.log('🔄 加载小社会系统备用方案数字人...');
    
    // 完整的小社会数据结构模拟 - 基于实际的小社会系统返回格式
    const xiaosheFallbackProfiles = [
      {
        // 学生群体
        id: 'xiaoshe_fallback_student_001',
        name: '张伟',
        age: 22,
        gender: '男',
        education: '本科',
        profession: '软件工程师',
        occupation: '软件工程师',
        location: '北京',
        地区: '北京',
        interests: ['编程', '游戏', '电影', '音乐'],
        兴趣爱好: ['编程', '游戏', '电影', '音乐'],
        personality: '友善开朗',
        性格特点: '友善开朗',
        性格: '友善开朗',
        background: '软件工程师，收入8000-12000，单身，与父母同住',
        背景信息: '软件工程师，收入8000-12000，单身，与父母同住',
        consumption_habits: '理性消费，关注性价比',
        消费习惯: '理性消费，关注性价比',
        favorite_brands: ['小米', '华为', '网易', '腾讯'],
        喜爱品牌: ['小米', '华为', '网易', '腾讯'],
        medical_history: '无重大疾病史',
        病史: '无重大疾病史',
        income: '8000-12000',
        收入: '8000-12000',
        marital_status: '单身',
        婚姻状态: '单身',
        family_status: '与父母同住',
        relationships: [
          {
            human_name_1: '张伟',
            human_name_2: '李明',
            relationship_type: '同事',
            relationship_strength: 0.8,
            start_date: '2023-01-15',
            end_date: null,
            created_at: '2024-01-01',
            updated_at: '2024-08-10'
          }
        ],
        residence: '北京市海淀区',
        residence_city: '海淀区',
        residence_province: '北京市',
        residence_country: '中国'
      },
      {
        // 职场白领群体
        id: 'xiaoshe_fallback_worker_002',
        name: '王强',
        age: 30,
        gender: '男',
        education: '本科',
        profession: '软件工程师',
        occupation: '软件工程师',
        location: '北京',
        地区: '北京',
        interests: ['技术', '阅读', '健身', '旅行'],
        兴趣爱好: ['技术', '阅读', '健身', '旅行'],
        personality: '友善开朗',
        性格特点: '友善开朗',
        性格: '友善开朗',
        background: '软件工程师，收入12000-18000，已婚，两人世界',
        背景信息: '软件工程师，收入12000-18000，已婚，两人世界',
        consumption_habits: '品质消费，追求生活品质',
        消费习惯: '品质消费，追求生活品质',
        favorite_brands: ['苹果', '特斯拉', '星巴克', '耐克'],
        喜爱品牌: ['苹果', '特斯拉', '星巴克', '耐克'],
        medical_history: '无重大疾病史',
        病史: '无重大疾病史',
        income: '12000-18000',
        收入: '12000-18000',
        marital_status: '已婚',
        婚姻状态: '已婚',
        family_status: '两人世界',
        relationships: [
          {
            human_name_1: '王强',
            human_name_2: '张伟',
            relationship_type: '同事',
            relationship_strength: 0.8,
            start_date: '2023-01-15',
            end_date: null,
            created_at: '2024-01-01',
            updated_at: '2024-08-10'
          }
        ],
        residence: '北京市朝阳区',
        residence_city: '朝阳区',
        residence_province: '北京市',
        residence_country: '中国'
      },
      {
        // 管理层群体
        id: 'xiaoshe_fallback_manager_003',
        name: '李明智',
        age: 35,
        gender: '男',
        education: '本科',
        profession: '产品经理',
        occupation: '产品经理',
        location: '北京',
        地区: '北京',
        interests: ['管理', '商业', '投资', '运动'],
        兴趣爱好: ['管理', '商业', '投资', '运动'],
        personality: '友善开朗',
        性格特点: '友善开朗',
        性格: '友善开朗',
        background: '产品经理，收入20000-30000，已婚，有孩子',
        背景信息: '产品经理，收入20000-30000，已婚，有孩子',
        consumption_habits: '高端消费，注重品牌和品质',
        消费习惯: '高端消费，注重品牌和品质',
        favorite_brands: ['奔驰', '苹果', '路易威登', '星巴克'],
        喜爱品牌: ['奔驰', '苹果', '路易威登', '星巴克'],
        medical_history: '无重大疾病史',
        病史: '无重大疾病史',
        income: '20000-30000',
        收入: '20000-30000',
        marital_status: '已婚',
        婚姻状态: '已婚',
        family_status: '有孩子',
        relationships: [
          {
            human_name_1: '李明智',
            human_name_2: '陈梦',
            relationship_type: '同事',
            relationship_strength: 0.764607,
            start_date: '2021-02-15',
            end_date: null,
            created_at: '2024-01-01',
            updated_at: '2025-06-22'
          }
        ],
        residence: '北京市朝阳区',
        residence_city: '朝阳区',
        residence_province: '北京市',
        residence_country: '中国'
      },
      {
        // 设计师群体
        id: 'xiaoshe_fallback_designer_004',
        name: '陈梦',
        age: 27,
        gender: '女',
        education: '本科',
        profession: 'UI设计师',
        occupation: 'UI设计师',
        location: '北京',
        地区: '北京',
        interests: ['设计', '艺术', '美食', '旅行'],
        兴趣爱好: ['设计', '艺术', '美食', '旅行'],
        personality: '友善开朗',
        性格特点: '友善开朗',
        性格: '友善开朗',
        background: 'UI设计师，收入10000-15000，单身，独居',
        背景信息: 'UI设计师，收入10000-15000，单身，独居',
        consumption_habits: '时尚消费，关注设计和美学',
        消费习惯: '时尚消费，关注设计和美学',
        favorite_brands: ['苹果', '无印良品', '优衣库', '星巴克'],
        喜爱品牌: ['苹果', '无印良品', '优衣库', '星巴克'],
        medical_history: '无重大疾病史',
        病史: '无重大疾病史',
        income: '10000-15000',
        收入: '10000-15000',
        marital_status: '单身',
        婚姻状态: '单身',
        family_status: '独居',
        relationships: [
          {
            human_name_1: '陈梦',
            human_name_2: '李明智',
            relationship_type: '同事',
            relationship_strength: 0.764607,
            start_date: '2021-02-15',
            end_date: null,
            created_at: '2024-01-01',
            updated_at: '2025-06-22'
          }
        ],
        residence: '北京市朝阳区',
        residence_city: '朝阳区',
        residence_province: '北京市',
        residence_country: '中国'
      },
      {
        // 财务人员群体
        id: 'xiaoshe_fallback_finance_005',
        name: '张小娟',
        age: 27,
        gender: '女',
        education: '本科',
        profession: '财务',
        occupation: '财务',
        location: '北京',
        地区: '北京',
        interests: ['理财', '阅读', '瑜伽', '烘焙'],
        兴趣爱好: ['理财', '阅读', '瑜伽', '烘焙'],
        personality: '友善开朗',
        性格特点: '友善开朗',
        性格: '友善开朗',
        background: '财务，收入8000-12000，单身，与室友合租',
        背景信息: '财务，收入8000-12000，单身，与室友合租',
        consumption_habits: '节俭消费，理性规划',
        消费习惯: '节俭消费，理性规划',
        favorite_brands: ['招商银行', '支付宝', '京东', '网易云音乐'],
        喜爱品牌: ['招商银行', '支付宝', '京东', '网易云音乐'],
        medical_history: '无重大疾病史',
        病史: '无重大疾病史',
        income: '8000-12000',
        收入: '8000-12000',
        marital_status: '单身',
        婚姻状态: '单身',
        family_status: '与室友合租',
        relationships: [
          {
            human_name_1: '张小娟',
            human_name_2: '陈梦',
            relationship_type: '朋友',
            relationship_strength: 0.65,
            start_date: '2022-03-10',
            end_date: null,
            created_at: '2024-01-01',
            updated_at: '2024-08-10'
          }
        ],
        residence: '北京市海淀区',
        residence_city: '海淀区',
        residence_province: '北京市',
        residence_country: '中国'
      }
    ];

    console.log(`🌟 加载小社会备用数字人信息 (总数: ${xiaosheFallbackProfiles.length}):`);
    
    // 转换为系统需要的格式
    xiaosheFallbackProfiles.forEach((human: any, index: number) => {
      const profile: DigitalPersonProfile = {
        id: human.id,
        name: human.name || human.姓名,
        age: typeof human.age === 'string' ? parseInt(human.age) : human.age,
        gender: human.gender || human.性别,
        education: human.education || human.学历,
        occupation: human.profession || human.occupation || human.职业,
        location: human.location || human.地区,
        interests: human.interests || human.兴趣爱好,
        personality: human.personality || human.性格特点 || human.性格,
        background: human.background || human.背景信息,
        preferences: {
          consumption_habits: human.consumption_habits || human.消费习惯,
          favorite_brands: human.favorite_brands || human.喜爱品牌,
          medical_history: human.medical_history || human.病史,
          income: human.income || human.收入,
          marital_status: human.marital_status || human.婚姻状态,
          family_status: human.family_status,
          relationships: human.relationships,
          residence: human.residence,
          residence_city: human.residence_city,
          residence_province: human.residence_province,
          residence_country: human.residence_country
        }
      };
      
      this.profiles.set(profile.id, profile);
      console.log(`👤 加载小社会备用数字人 ${index + 1}: ${profile.name} (${profile.age}岁, ${profile.occupation})`);
      console.log(`   📍 位置: ${profile.location}, 教育: ${profile.education}`);
      console.log(`   💡 性格: ${profile.personality}`);
      console.log(`   💰 收入: ${profile.preferences?.income}`);
      console.log(`   👥 婚姻状况: ${profile.preferences?.marital_status}`);
    });
    
    console.log(`📥 备用方案加载完成，共 ${xiaosheFallbackProfiles.length} 个完整的小社会数据结构数字人`);
  }

  /**
   * 初始化管理器 - 增加小社会系统备用方案
   */
  async initialize(): Promise<void> {
    console.log('👤 初始化数字人档案管理器...');
    
    // 智能高性能模式：优先尝试小社会API，失败则使用备用方案
    try {
      console.log('🌐 尝试连接小社会API...');
      await this.testXiaosheAPI();
      console.log('✅ 小社会API连接成功，高性能模式已启用');
      
      // 尝试从API加载更多档案
      await this.loadProfilesFromAPI();
      
    } catch (error) {
      console.warn('⚠️ 小社会API连接失败，启动备用方案:', error instanceof Error ? error.message : String(error));
      console.log('🔄 激活本地模拟小社会数字人备用方案...');
      
      // 启动备用方案：加载模拟的小社会数字人
      this.loadXiaosheFallbackProfiles();
      console.log('✅ 本地备用方案启动成功，包含完整的小社会数据结构');
    }

    console.log(`✅ 数字人档案管理器初始化完成，共 ${this.profiles.size} 个档案可用`);
  }

  /**
   * 测试小社会API连接 - 完全对标web-ui实现
   */
  private async testXiaosheAPI(): Promise<void> {
    try {
      console.log(`🔍 测试小社会API连接: ${this.xiaosheApiUrl}/api/smart-query/query`);
      
      // 使用web-ui相同的smart-query接口进行测试
      const testQuery = {
        query: '测试连接',
        limit: 1
      };
      
      console.log(`📋 测试请求参数:`, JSON.stringify(testQuery, null, 2));
      
      // 🎯 优化：增加重试机制和更长的超时时间
      const response = await axios.post(`${this.xiaosheApiUrl}/api/smart-query/query`, testQuery, {
        timeout: 30000, // 增加到30秒，适应系统启动时的网络延迟
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 小社会API响应状态码: ${response.status}`);
      console.log(`📋 响应数据结构:`, JSON.stringify(response.data, null, 2));
      
      if (response.status === 200) {
        console.log('✅ 小社会API连接测试成功');
        console.log(`📋 API地址: ${this.xiaosheApiUrl}/api/smart-query/query`);
        
        // 验证响应格式
        if (response.data?.success) {
          console.log(`✅ 小社会API响应格式验证成功`);
        } else {
          console.warn(`⚠️ 小社会API响应格式异常，但连接正常`);
        }
      } else {
        throw new Error(`API返回状态码: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ 小社会API连接详细错误信息:`);
      console.error(`   🔗 API地址: ${this.xiaosheApiUrl}/api/smart-query/query`);
      console.error(`   📋 错误类型: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   💬 错误消息: ${error instanceof Error ? error.message : String(error)}`);
      
      if (axios.isAxiosError(error)) {
        console.error(`   📡 HTTP状态: ${error.response?.status || '无响应'}`);
        console.error(`   🔗 请求URL: ${error.config?.url || '未知'}`);
        console.error(`   ⏱️ 超时设置: ${error.config?.timeout || '未设置'}ms`);
      }
      
      throw new Error(`小社会API连接失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从API加载档案 - 使用smart-query接口
   */
  private async loadProfilesFromAPI(): Promise<void> {
    try {
      // 使用web-ui相同的smart-query接口查询多个数字人
      const queryParams = {
        query: '获取多种类型的数字人档案，包括学生、白领、退休人员等',
        limit: 5
      };
      
      console.log(`🔍 查询小社会API: ${JSON.stringify(queryParams, null, 2)}`);
      
      const response = await axios.post(`${this.xiaosheApiUrl}/api/smart-query/query`, queryParams, {
        timeout: 30000, // 增加到30秒，与测试API保持一致
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 小社会API响应状态: ${response.status}`);
      
      if (response.status === 200 && response.data?.success) {
        const digitalHumans = response.data.results || [];
        
        console.log(`🌟 获取小社会数字人信息 (总数: ${digitalHumans.length}):`);
        
        digitalHumans.forEach((human: any, index: number) => {
          // 完全对标web-ui的小社会API数据格式
          const profile: DigitalPersonProfile = {
            id: human.id || `xiaoshe_${Date.now()}_${index}`,
            name: human.name || human.姓名 || '未知',
            age: typeof human.age === 'string' ? parseInt(human.age) : (human.age || human.年龄 || 25),
            gender: human.gender || human.性别 || '未知',
            education: human.education || human.学历 || '本科',
            occupation: human.profession || human.occupation || human.职业 || '职员',
            location: human.location || human.地区 || '北京',
            interests: human.interests || human.兴趣爱好 || ['生活'],
            personality: human.personality || human.性格特点 || human.性格 || '友善开朗',
            background: human.background || human.背景信息 || `${human.profession || '职员'}，收入${human.income || '未知'}，${human.marital_status || ''}，${human.family_status || ''}`,
            preferences: {
              consumption_habits: human.consumption_habits || human.消费习惯,
              favorite_brands: human.favorite_brands || human.喜爱品牌 || [],
              medical_history: human.medical_history || human.病史,
              income: human.income || human.收入,
              marital_status: human.marital_status || human.婚姻状态
            }
          };
          
          this.profiles.set(profile.id, profile);
          console.log(`👤 加载小社会数字人 ${index + 1}: ${profile.name} (${profile.age}岁, ${profile.occupation})`);
          console.log(`   📍 位置: ${profile.location}, 教育: ${profile.education}`);
          console.log(`   💡 性格: ${profile.personality}`);
          if (profile.preferences?.income) {
            console.log(`   💰 收入: ${profile.preferences.income}`);
          }
        });
        
        console.log(`📥 从小社会API加载了 ${digitalHumans.length} 个额外档案`);
      } else {
        console.warn(`⚠️ 小社会API响应异常: ${response.data?.error || '未知错误'}`);
      }
      
    } catch (error) {
      console.warn('⚠️ 从小社会API加载档案失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 智能查询小社会数字人 - 根据问卷需求获取最适合的数字人（带备用方案）
   */
  async queryDigitalPersonForQuestionnaire(questionnaireUrl: string): Promise<DigitalPersonProfile | null> {
    try {
      // 根据问卷URL分析目标群体
      let queryText = '获取1个通用数字人档案';
      
      if (questionnaireUrl.includes('student') || questionnaireUrl.includes('学生') || questionnaireUrl.includes('大学')) {
        queryText = '获取1个大学生数字人档案，年龄20-25岁';
      } else if (questionnaireUrl.includes('shopping') || questionnaireUrl.includes('购物') || questionnaireUrl.includes('消费')) {
        queryText = '获取1个有购物经验的成年数字人档案，25-40岁';
      } else if (questionnaireUrl.includes('health') || questionnaireUrl.includes('健康') || questionnaireUrl.includes('医疗')) {
        queryText = '获取1个关注健康的成年数字人档案，30-50岁';
      } else if (questionnaireUrl.includes('work') || questionnaireUrl.includes('工作') || questionnaireUrl.includes('职场')) {
        queryText = '获取1个有工作经验的职场数字人档案，25-45岁';
      }
      
      console.log(`🎯 为问卷智能匹配数字人: ${queryText}`);
      
      const queryParams = {
        query: queryText,
        limit: 1
      };
      
      const response = await axios.post(`${this.xiaosheApiUrl}/api/smart-query/query`, queryParams, {
        timeout: 30000, // 增加到30秒，确保稳定连接
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data?.success) {
        const digitalHumans = response.data.results || [];
        
        if (digitalHumans.length > 0) {
          const human = digitalHumans[0];
          const profile: DigitalPersonProfile = {
            id: human.id || `xiaoshe_smart_${Date.now()}`,
            name: human.name || human.姓名 || '智能匹配用户',
            age: typeof human.age === 'string' ? parseInt(human.age) : (human.age || human.年龄 || 25),
            gender: human.gender || human.性别 || '未知',
            education: human.education || human.学历 || '本科',
            occupation: human.profession || human.occupation || human.职业 || '职员',
            location: human.location || human.地区 || '北京',
            interests: human.interests || human.兴趣爱好 || ['生活'],
            personality: human.personality || human.性格特点 || human.性格 || '友善开朗',
            background: human.background || human.背景信息 || `${human.profession || '职员'}，收入${human.income || '未知'}`,
            preferences: {
              consumption_habits: human.consumption_habits || human.消费习惯,
              favorite_brands: human.favorite_brands || human.喜爱品牌 || [],
              medical_history: human.medical_history || human.病史,
              income: human.income || human.收入,
              marital_status: human.marital_status || human.婚姻状态,
              family_status: human.family_status,
              relationships: human.relationships,
              residence: human.residence,
              residence_city: human.residence_city,
              residence_province: human.residence_province,
              residence_country: human.residence_country
            }
          };
          
          console.log(`🌟 小社会API智能匹配成功: ${profile.name} (${profile.age}岁, ${profile.occupation})`);
          console.log(`   📍 特征: ${profile.location}, ${profile.education}, ${profile.personality}`);
          
          return profile;
        }
      }
      
      console.warn(`⚠️ 小社会API智能匹配失败，使用备用档案`);
      return null;
      
    } catch (error) {
      console.warn(`⚠️ 小社会API智能查询失败:`, error instanceof Error ? error.message : String(error));
      console.log(`🔄 启动智能备用方案匹配...`);
      
      // 备用方案：从本地备用档案中智能选择
      return this.queryFromFallbackProfiles(questionnaireUrl);
    }
  }

  /**
   * 从备用档案中智能选择适合的数字人
   */
  private queryFromFallbackProfiles(questionnaireUrl: string): DigitalPersonProfile | null {
    console.log(`🔍 从备用档案中智能匹配数字人...`);
    
    // 获取所有备用档案
    const fallbackProfiles = Array.from(this.profiles.values()).filter(p => 
      p.id.startsWith('xiaoshe_fallback_')
    );
    
    if (fallbackProfiles.length === 0) {
      console.warn(`⚠️ 没有可用的备用档案`);
      return null;
    }
    
    // 根据问卷URL智能匹配
    let selectedProfile: DigitalPersonProfile;
    
    if (questionnaireUrl.includes('student') || questionnaireUrl.includes('学生') || questionnaireUrl.includes('大学')) {
      // 选择学生群体
      selectedProfile = fallbackProfiles.find(p => p.age <= 25) || fallbackProfiles[0]!;
      console.log(`🎯 匹配学生群体: ${selectedProfile.name}`);
    } else if (questionnaireUrl.includes('shopping') || questionnaireUrl.includes('购物') || questionnaireUrl.includes('消费')) {
      // 选择有购买力的群体
      selectedProfile = fallbackProfiles.find(p => 
        p.preferences?.income && !p.preferences.income.includes('8000')
      ) || fallbackProfiles[2] || fallbackProfiles[0]!; // 默认选择管理层或第一个
      console.log(`🎯 匹配消费群体: ${selectedProfile.name}`);
    } else if (questionnaireUrl.includes('work') || questionnaireUrl.includes('工作') || questionnaireUrl.includes('职场')) {
      // 选择职场经验丰富的
      selectedProfile = fallbackProfiles.find(p => p.age >= 28) || fallbackProfiles[1] || fallbackProfiles[0]!;
      console.log(`🎯 匹配职场群体: ${selectedProfile.name}`);
    } else {
      // 随机选择一个
      selectedProfile = fallbackProfiles[Math.floor(Math.random() * fallbackProfiles.length)]!;
      console.log(`🎯 随机匹配: ${selectedProfile.name}`);
    }
    
    console.log(`✅ 备用方案匹配成功: ${selectedProfile.name} (${selectedProfile.age}岁, ${selectedProfile.occupation})`);
    console.log(`   📍 特征: ${selectedProfile.location}, ${selectedProfile.education}, ${selectedProfile.personality}`);
    console.log(`   💰 收入: ${selectedProfile.preferences?.income}`);
    
    return selectedProfile;
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