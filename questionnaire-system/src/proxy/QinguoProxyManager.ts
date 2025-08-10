/**
 * 青果代理管理器 - 纯净版本
 * 只负责生成代理配置，不进行网络测试
 */

export interface ProxyInfo {
  sessionId: string;
  fullAddress: string;
  host: string;
  port: number;
  username: string;
  password: string;
  type?: string;
  ipInfo?: any;
}

export interface QinguoProxyConfig {
  businessId?: string;
  authKey?: string;
  authPwd?: string;
  tunnelHost?: string;
  tunnelPort?: string;
}

export class QinguoProxyManager {
  private businessId: string;
  private authKey: string;
  private authPwd: string;
  private tunnelHost: string;
  private tunnelPort: string;
  private allocatedProxies: Map<string, ProxyInfo> = new Map();
  private proxyUsageStats: Map<string, number> = new Map();

  constructor(config?: QinguoProxyConfig) {
    this.businessId = config?.businessId || process.env.QINGUO_BUSINESS_ID || 'xnxmcc4a';
    this.authKey = config?.authKey || process.env.QINGUO_AUTH_KEY || 'A942CE1E';
    this.authPwd = config?.authPwd || process.env.QINGUO_AUTH_PWD || 'B9FCD013057A';
    this.tunnelHost = config?.tunnelHost || process.env.QINGUO_TUNNEL_HOST || 'tun-szbhry.qg.net';
    this.tunnelPort = config?.tunnelPort || process.env.QINGUO_TUNNEL_PORT || '17790';

    console.log('🌐 青果代理管理器初始化完成');
    console.log(`📡 代理服务器: ${this.tunnelHost}:${this.tunnelPort}`);
    console.log(`🏢 业务ID: ${this.businessId}`);
    console.log(`🔑 认证密钥: ${this.authKey.slice(0, 4)}****`);
    console.log(`💡 采用纯净配置策略，不进行网络测试`);
  }

  /**
   * 分配代理 - 直接返回配置
   */
  async allocateProxy(sessionId: string): Promise<ProxyInfo> {
    console.log(`🔄 为会话 ${sessionId} 分配青果代理...`);
    
    // 如果已经为此会话分配了代理，直接返回
    if (this.allocatedProxies.has(sessionId)) {
      const existing = this.allocatedProxies.get(sessionId)!;
      console.log(`♻️ 使用现有代理: ${existing.fullAddress}`);
      return existing;
    }

    // 生成代理配置
    const proxySessionId = this.generateSessionId();
    console.log(`🔧 为会话 ${sessionId} 创建隧道代理配置...`);
    
    const proxyInfo: ProxyInfo = {
      sessionId: proxySessionId,
      fullAddress: `${this.tunnelHost}:${this.tunnelPort}`,
      host: this.tunnelHost,
      port: parseInt(this.tunnelPort),
      username: this.authKey,
      password: this.authPwd,
      type: 'http',
      ipInfo: {
        success: true,
        status: 'ready',
        note: '代理配置已准备就绪',
        ip: 'dynamic',
        location: '青果隧道代理',
        isp: '青果网络',
        timestamp: new Date().toISOString()
      }
    };

    // 记录分配
    this.allocatedProxies.set(sessionId, proxyInfo);
    this.proxyUsageStats.set(sessionId, Date.now());
    
    console.log(`✅ 代理分配成功: ${proxyInfo.fullAddress}`);
    console.log(`📡 代理通道详情:`);
    console.log(`   - 地址: ${proxyInfo.fullAddress}`);
    console.log(`   - 认证: ${proxyInfo.username}@****`);
    console.log(`   - 会话: ${proxyInfo.sessionId}`);
    console.log(`🌍 代理IP信息:`);
    console.log(`   ✅ IP地址: ${proxyInfo.ipInfo.ip}`);
    console.log(`   📍 状态: ${proxyInfo.ipInfo.status}`);
    console.log(`   ⏰ 时间戳: ${new Date().toLocaleString('zh-CN')}`);
    
    return proxyInfo;
  }

  /**
   * 释放代理
   */
  async releaseProxy(sessionId: string): Promise<boolean> {
    try {
      if (this.allocatedProxies.has(sessionId)) {
        const proxy = this.allocatedProxies.get(sessionId)!;
        console.log(`🗑️ 已释放会话 ${sessionId} 的代理: ${proxy.fullAddress}`);
        this.allocatedProxies.delete(sessionId);
        this.proxyUsageStats.delete(sessionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ 释放代理失败 (${sessionId}):`, error);
      return false;
    }
  }

  /**
   * 获取代理统计信息
   */
  getStats(): any {
    return {
      totalAllocated: this.allocatedProxies.size,
      activeSessions: Array.from(this.allocatedProxies.keys()),
      usageStats: Object.fromEntries(this.proxyUsageStats)
    };
  }

  /**
   * 清理所有代理
   */
  cleanup(): void {
    console.log('🧹 清理所有代理资源...');
    this.allocatedProxies.clear();
    this.proxyUsageStats.clear();
    console.log('✅ 代理资源清理完成');
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random1 = Math.floor(Math.random() * 100);
    const random2 = Math.floor(Math.random() * 100000);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${this.authKey}_${timestamp}_1_${random2}_${randomStr}`;
  }
}