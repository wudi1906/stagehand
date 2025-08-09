/**
 * 智能查询系统前端脚本
 */

// API基础URL
const API_BASE_URL = '/api';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initPage();
    
    // 绑定事件
    bindEvents();
    
    // 定时刷新状态
    setInterval(checkSystemStatus, 30000); // 每30秒检查一次状态
});

/**
 * 初始化页面
 */
function initPage() {
    // 检查系统状态
    checkSystemStatus();
    
    // 加载查询示例
    loadQueryExamples();
    
    // 加载系统配置
    loadSystemConfig();
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 查询输入框回车事件
    document.getElementById('queryInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeQuery();
        }
    });
}

/**
 * 检查系统状态
 */
function checkSystemStatus() {
    fetch(API_BASE_URL + '/smart-query/status')
        .then(response => response.json())
        .then(data => {
            updateSystemStatus(data);
        })
        .catch(error => {
            console.error('检查系统状态失败:', error);
            updateSystemStatus({ available: false, error: '连接失败' });
        });
}

/**
 * 更新系统状态显示
 */
function updateSystemStatus(status) {
    const statusIndicator = document.getElementById('systemStatus');
    const statusText = document.getElementById('systemStatusText');
    
    if (status.available) {
        statusIndicator.className = 'status-indicator status-online';
        statusText.textContent = '系统正常';
        
        // 更新详细状态
        updateSystemStatusDetails(status);
    } else {
        statusIndicator.className = 'status-indicator status-offline';
        statusText.textContent = '系统离线';
        
        // 显示错误信息
        const detailsContainer = document.getElementById('systemStatusDetails');
        detailsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                智能查询系统不可用: ${status.error || '未知错误'}
            </div>
        `;
    }
}

/**
 * 更新系统状态详情
 */
function updateSystemStatusDetails(status) {
    const container = document.getElementById('systemStatusDetails');
    
    if (!status.available) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                智能查询系统不可用
            </div>
        `;
        return;
    }
    
    const engine = status.engine || {};
    const sync = status.sync || {};
    
    const html = `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-database"></i> 数据库连接</h6>
                <div class="mb-2">
                    <span class="status-indicator ${engine.mysql_connected ? 'status-online' : 'status-offline'}"></span>
                    MySQL: ${engine.mysql_connected ? '已连接' : '未连接'}
                </div>
                <div class="mb-2">
                    <span class="status-indicator ${engine.lance_db_connected ? 'status-online' : 'status-offline'}"></span>
                    LanceDB: ${engine.lance_db_connected ? '已连接' : '未连接'}
                </div>
                <div class="mb-2">
                    <span class="status-indicator ${engine.deepseek_connected ? 'status-online' : 'status-offline'}"></span>
                    DeepSeek: ${engine.deepseek_connected ? '已连接' : '未连接'}
                </div>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-chart-bar"></i> 数据统计</h6>
                <div class="mb-2">
                    <strong>向量数据:</strong> ${engine.vector_count || 0} 条
                </div>
                <div class="mb-2">
                    <strong>最大结果:</strong> ${engine.max_results || 100} 条
                </div>
                <div class="mb-2">
                    <strong>相似度阈值:</strong> ${engine.similarity_threshold || 0.7}
                </div>
            </div>
        </div>
        
        <hr>
        
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-sync"></i> 数据同步</h6>
                <div class="mb-2">
                    <span class="status-indicator ${sync.auto_sync_enabled ? 'status-online' : 'status-offline'}"></span>
                    自动同步: ${sync.auto_sync_enabled ? '已启用' : '已禁用'}
                </div>
                <div class="mb-2">
                    <strong>同步间隔:</strong> ${sync.sync_interval_hours || 24} 小时
                </div>
                <div class="mb-2">
                    <strong>同步时间:</strong> ${sync.sync_time || '02:00'}
                </div>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-info-circle"></i> 运行状态</h6>
                <div class="mb-2">
                    <span class="status-indicator ${sync.is_running ? 'status-online' : 'status-offline'}"></span>
                    调度器: ${sync.is_running ? '运行中' : '已停止'}
                </div>
                <div class="mb-2">
                    <strong>数据库路径:</strong> ${sync.vector_db_path || 'N/A'}
                </div>
                <div class="mb-2">
                    <strong>向量数量:</strong> ${sync.vector_count || 0} 条
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * 加载查询示例
 */
function loadQueryExamples() {
    fetch(API_BASE_URL + '/smart-query/examples')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderQueryExamples(data.examples);
            } else {
                showExamplesError(data.error);
            }
        })
        .catch(error => {
            console.error('加载查询示例失败:', error);
            showExamplesError('加载失败');
        });
}

/**
 * 渲染查询示例
 */
function renderQueryExamples(examples) {
    const container = document.getElementById('queryExamples');
    
    if (!examples || examples.length === 0) {
        container.innerHTML = '<div class="text-muted">暂无查询示例</div>';
        return;
    }
    
    let html = '';
    examples.forEach(category => {
        html += `
            <div class="mb-3">
                <h6 class="text-primary">${category.title}</h6>
                <div class="row">
        `;
        
        category.examples.forEach(example => {
            html += `
                <div class="col-md-6 mb-2">
                    <div class="example-card" onclick="useExample('${example}')">
                        <i class="fas fa-lightbulb text-warning me-2"></i>
                        ${example}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * 显示示例加载错误
 */
function showExamplesError(error) {
    const container = document.getElementById('queryExamples');
    container.innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            加载查询示例失败: ${error}
        </div>
    `;
}

/**
 * 使用示例查询
 */
function useExample(example) {
    document.getElementById('queryInput').value = example;
    // 可选：自动执行查询
    // executeQuery();
}

/**
 * 执行查询
 */
function executeQuery() {
    const query = document.getElementById('queryInput').value.trim();
    
    if (!query) {
        showNotification('请输入查询内容', 'warning');
        return;
    }
    
    // 显示加载状态
    const resultsContainer = document.getElementById('resultsContainer');
    const queryResults = document.getElementById('queryResults');
    
    queryResults.style.display = 'block';
    resultsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            正在查询中...
        </div>
    `;
    
    // 执行查询
    fetch(API_BASE_URL + '/smart-query/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderQueryResults(data);
        } else {
            showQueryError(data.error);
        }
    })
    .catch(error => {
        console.error('查询失败:', error);
        showQueryError('查询请求失败');
    });
}

/**
 * 渲染查询结果
 */
function renderQueryResults(data) {
    const container = document.getElementById('resultsContainer');
    
    // 缓存查询结果供详情页面使用
    window.lastQueryResults = data;
    
    // 存储完整的persona数据到全局变量，供详情页面直接使用
    window.personaDataCache = {};
    if (data.results) {
        data.results.forEach(persona => {
            window.personaDataCache[persona.id] = persona;
        });
    }
    
    console.log('缓存查询结果:', data);
    console.log('缓存的persona数据:', window.personaDataCache);
    
    if (!data.results || data.results.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                未找到符合条件的数字人
            </div>
        `;
        return;
    }
    
    // 显示查询统计
    let html = `
        <div class="alert alert-success">
            <div class="row">
                <div class="col-md-8">
                    <i class="fas fa-check-circle"></i>
                    查询完成，找到 <strong>${data.count}</strong> 个符合条件的数字人
                </div>
                <div class="col-md-4 text-end">
                    <small class="text-muted">
                        结构化: ${data.structured_count || 0} | 语义: ${data.semantic_count || 0}
                    </small>
                </div>
            </div>
        </div>
    `;
    
    // 显示解析结果
    if (data.parsed_query) {
        html += `
            <div class="alert alert-light">
                <h6><i class="fas fa-brain"></i> 查询解析结果</h6>
                <div class="row">
                    <div class="col-md-6">
                        <strong>结构化条件:</strong>
                        <ul class="mb-0">
                            ${Object.entries(data.parsed_query.structured || {}).map(([key, value]) => 
                                value && value !== '不限' ? `<li>${key}: ${value}</li>` : ''
                            ).join('')}
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <strong>语义关键词:</strong>
                        <span class="badge bg-secondary">${data.parsed_query.semantic || '无'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 显示结果列表
    data.results.forEach(persona => {
        const initials = persona.name ? persona.name.substring(0, 1) : '?';
        const score = persona._score ? (persona._score * 100).toFixed(1) : 'N/A';
        const similarityScore = persona.similarity_score ? (persona.similarity_score * 100).toFixed(1) : 'N/A';
        
        html += `
            <div class="result-card">
                <div class="row align-items-start">
                    <div class="col-auto">
                        <div class="persona-avatar">${initials}</div>
                    </div>
                    <div class="col">
                        <div class="row">
                            <div class="col-md-8">
                                <!-- 基本信息 -->
                                <h6 class="mb-1">${persona.name || '未知'}</h6>
                                <p class="text-muted mb-2">
                                    ${persona.gender || '未知'} | ${persona.age || '?'}岁 (${persona.age_group || '未知'}) | ${persona.profession || '未知职业'}
                                </p>
                                
                                <!-- 地理和教育信息 -->
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i class="fas fa-map-marker-alt"></i> ${persona.residence || '未知地区'} | 
                                        <i class="fas fa-graduation-cap"></i> ${persona.education || '未知学历'} | 
                                        <i class="fas fa-ring"></i> ${persona.marital_status || '未知'} | 
                                        <i class="fas fa-wallet"></i> ${persona.income_level || '未知收入'}
                                    </small>
                                </div>
                                
                                <!-- 当前状态信息 -->
                                <div class="mb-2">
                                    <small><strong>当前状态:</strong></small>
                                    <div class="d-flex flex-wrap gap-1 mt-1">
                                        ${persona.current_mood ? `<span class="badge bg-info" title="心情">${persona.current_mood}</span>` : ''}
                                        ${persona.current_energy ? `<span class="badge bg-success" title="能量">${persona.current_energy}</span>` : ''}
                                        ${persona.current_activity ? `<span class="badge bg-warning text-dark" title="活动">${persona.current_activity}</span>` : ''}
                                        ${persona.current_location ? `<span class="badge bg-secondary" title="位置">${persona.current_location}</span>` : ''}
                                    </div>
                                </div>
                                
                                <!-- 健康和设备信息 -->
                                <div class="mb-2">
                                    <small><strong>其他信息:</strong></small>
                                    <div class="d-flex flex-wrap gap-1 mt-1">
                                        ${persona.phone_brand ? `<span class="badge bg-dark" title="手机品牌"><i class="fas fa-mobile-alt"></i> ${persona.phone_brand}</span>` : ''}
                                        ${persona.health_status && Array.isArray(persona.health_status) && persona.health_status.length > 0 ? 
                                            persona.health_status.map(status => `<span class="badge bg-light text-dark" title="健康状况"><i class="fas fa-heartbeat"></i> ${status}</span>`).join('') : 
                                            (persona.health_status ? `<span class="badge bg-light text-dark" title="健康状况"><i class="fas fa-heartbeat"></i> ${persona.health_status}</span>` : '')
                                        }
                                    </div>
                                </div>
                                
                                <!-- 品牌偏好 -->
                                ${persona.favorite_brands && persona.favorite_brands.length > 0 ? `
                                    <div class="mb-2">
                                        <small><strong>品牌偏好:</strong></small>
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${persona.favorite_brands.slice(0, 5).map(brand => `<span class="badge bg-primary" title="喜爱品牌">${brand}</span>`).join('')}
                                            ${persona.favorite_brands.length > 5 ? `<span class="badge bg-primary">+${persona.favorite_brands.length - 5}</span>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- 个人特质 -->
                                ${persona.attributes && persona.attributes.性格 && Array.isArray(persona.attributes.性格) ? `
                                    <div class="mb-2">
                                        <small><strong>性格特质:</strong></small>
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${persona.attributes.性格.map(trait => `<span class="badge bg-light text-dark" title="性格特质">${trait}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- 匹配标签 -->
                                <div class="d-flex flex-wrap gap-1">
                                    ${persona.residence ? `<span class="badge bg-info" title="居住地">${persona.residence}</span>` : ''}
                                    ${persona.profession_category ? `<span class="badge bg-secondary" title="职业类别">${persona.profession_category}</span>` : ''}
                                    ${persona._structured_match ? `<span class="badge bg-success" title="结构化匹配"><i class="fas fa-check"></i> 结构匹配</span>` : ''}
                                    ${persona._semantic_match ? `<span class="badge bg-warning" title="语义匹配"><i class="fas fa-brain"></i> 语义匹配</span>` : ''}
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <!-- 匹配度信息 -->
                                <div class="mb-2">
                                    <div class="mb-1">
                                        <strong>相关性: ${score}%</strong>
                                    </div>
                                    <div class="mb-2">
                                        <small class="text-muted">相似度: ${similarityScore}%</small>
                                    </div>
                                </div>
                                
                                <!-- 操作按钮 -->
                                <div class="d-grid gap-2">
                                    <button class="btn btn-sm btn-outline-primary" onclick="viewPersonaDetail(${persona.id})" title="查看完整详情">
                                        <i class="fas fa-eye"></i> 查看详情
                                    </button>
                                    ${persona.medical_records && persona.medical_records.length > 0 ? `
                                        <button class="btn btn-sm btn-outline-info" onclick="viewPersonaDetail(${persona.id})" title="有就医记录">
                                            <i class="fas fa-user-md"></i> 就医记录 (${persona.medical_records.length})
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * 显示查询错误
 */
function showQueryError(error) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i>
            查询失败: ${error}
        </div>
    `;
}

/**
 * 查看数字人详情
 */
function viewPersonaDetail(personaId) {
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('personaDetailModal'));
    modal.show();
    
    // 重置内容为加载状态
    const contentContainer = document.getElementById('personaDetailContent');
    contentContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            加载详情中...
        </div>
    `;
    
    // 直接从缓存中获取完整的persona数据
    console.log('查看数字人详情，ID:', personaId);
    console.log('可用的缓存数据:', Object.keys(window.personaDataCache || {}));
    
    if (window.personaDataCache && window.personaDataCache[personaId]) {
        const personaData = window.personaDataCache[personaId];
        console.log('使用缓存的完整数字人数据:', personaData);
        console.log('家庭成员数据:', personaData.family_members);
        
        if (personaData.family_members && personaData.family_members.children) {
            console.log('孩子数据:', personaData.family_members.children);
            console.log('孩子数量:', personaData.family_members.children.length);
        }
        
        // 直接渲染详情
        renderPersonaDetail(personaData);
    } else {
        // 如果缓存中没有数据，显示错误信息
        console.error('缓存中未找到数字人数据，ID:', personaId);
        contentContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                未找到数字人详情数据，请重新查询
            </div>
        `;
    }
}

/**
 * 渲染数字人详情
 */
function renderPersonaDetail(persona) {
    const container = document.getElementById('personaDetailContent');
    
    // 调试日志
    console.log('renderPersonaDetail 接收到的数据:', persona);
    console.log('家庭成员数据:', persona.family_members);
    if (persona.family_members) {
        console.log('配偶数据:', persona.family_members.spouse);
        console.log('孩子数据:', persona.family_members.children);
        console.log('孩子数量:', persona.family_members.children ? persona.family_members.children.length : 0);
    }
    
    // 更新模态框标题
    document.getElementById('personaDetailModalLabel').innerHTML = `
        <i class="fas fa-user"></i> ${persona.name || '未知'} - 详细信息
    `;
    
    // 构建详情HTML
    const html = `
        <div class="row">
            <!-- 基本信息卡片 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-id-card"></i> 基本信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-auto">
                                <div class="persona-avatar" style="width: 80px; height: 80px; font-size: 2rem;">
                                    ${persona.name ? persona.name.substring(0, 1) : '?'}
                                </div>
                            </div>
                            <div class="col">
                                <h5>${persona.name || '未知'}</h5>
                                <p class="text-muted mb-1">ID: ${persona.id}</p>
                                <p class="text-muted mb-1">全名: ${persona.full_name || persona.name || '未知'}</p>
                                <p class="text-muted mb-0">显示名: ${persona.display_name || persona.name || '未知'}</p>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="col-6">
                                <strong>性别:</strong> ${persona.gender || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>年龄:</strong> ${persona.age || '未知'}岁
                            </div>
                            <div class="col-6">
                                <strong>年龄组:</strong> ${persona.age_group || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>职业:</strong> ${persona.profession || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>职业类别:</strong> ${persona.profession_category || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>教育:</strong> ${persona.education || persona.education_level || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>婚姻状况:</strong> ${persona.marital_status || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>收入水平:</strong> ${persona.income_level || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 地理信息卡片 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-map-marker-alt"></i> 地理信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12 mb-2">
                                <strong>出生地:</strong> ${persona.birthplace || '未知'}
                            </div>
                            <div class="col-12 mb-2">
                                <strong>居住地:</strong> ${persona.residence || '未知'}
                            </div>
                            <div class="col-12 mb-2">
                                <strong>居住城市:</strong> ${persona.residence_city || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 设备信息卡片 -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-mobile-alt"></i> 设备信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12">
                                <strong>手机品牌:</strong> ${persona.phone_brand || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- 当前状态卡片 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-heartbeat"></i> 当前状态</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6 mb-2">
                                <strong>心情:</strong> 
                                <span class="badge bg-info">${persona.current_mood || persona.mood || '平静'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>能量:</strong> 
                                <span class="badge bg-success">${persona.current_energy || persona.energy || '充沛'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>活动:</strong> 
                                <span class="badge bg-warning">${persona.current_activity || persona.activity || '休息'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>位置:</strong> 
                                <span class="badge bg-secondary">${persona.current_location || persona.location || '家中'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 健康信息卡片 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-user-md"></i> 健康信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <strong>健康状况:</strong>
                            <div class="mt-1">
                                ${persona.health_status ? 
                                    (Array.isArray(persona.health_status) ? 
                                        persona.health_status.map(status => `<span class="badge bg-light text-dark me-1">${status}</span>`).join('') :
                                        `<span class="badge bg-light text-dark">${persona.health_status}</span>`
                                    ) : 
                                    '<span class="badge bg-light text-dark">身体健康</span>'
                                }
                            </div>
                        </div>
                        ${persona.medical_records && persona.medical_records.length > 0 ? `
                            <div class="mb-2">
                                <strong>就医记录:</strong>
                                <div class="mt-1">
                                    ${persona.medical_records.map(record => `
                                        <div class="small text-muted">
                                            ${record.date}: ${record.condition} - ${record.hospital}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- 家庭成员信息卡片 -->
            ${(() => {
                console.log('准备渲染家庭成员，persona.family_members:', persona.family_members);
                if (persona.family_members && persona.family_members.children) {
                    console.log('孩子数据存在，数量:', persona.family_members.children.length);
                    persona.family_members.children.forEach((child, index) => {
                        console.log(`孩子${index + 1}:`, child.name, child);
                    });
                }
                return renderFamilyMembersCard(persona.family_members);
            })()}
            
            <!-- 品牌偏好卡片 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-heart"></i> 品牌偏好</h6>
                    </div>
                    <div class="card-body">
                        ${persona.favorite_brands && persona.favorite_brands.length > 0 ? `
                            <div class="d-flex flex-wrap gap-1">
                                ${persona.favorite_brands.map(brand => `
                                    <span class="badge bg-primary">${brand}</span>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">暂无品牌偏好信息</p>'}
                    </div>
                </div>
            </div>
            
            <!-- 查询匹配信息卡片 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-search"></i> 查询匹配信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6 mb-2">
                                <strong>相关性评分:</strong> 
                                <span class="badge bg-info">${persona.query_relevance_score ? (persona.query_relevance_score * 100).toFixed(1) + '%' : 'N/A'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>相似度评分:</strong> 
                                <span class="badge bg-success">${persona.similarity_score ? (persona.similarity_score * 100).toFixed(1) + '%' : 'N/A'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>结构化匹配:</strong> 
                                <span class="badge ${persona.structured_match ? 'bg-success' : 'bg-secondary'}">${persona.structured_match ? '是' : '否'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>语义匹配:</strong> 
                                <span class="badge ${persona.semantic_match ? 'bg-warning' : 'bg-secondary'}">${persona.semantic_match ? '是' : '否'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 其他属性信息 -->
        ${persona.attributes && Object.keys(persona.attributes).length > 0 ? `
            <div class="row">
                <div class="col-12">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6><i class="fas fa-tags"></i> 其他属性</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                ${Object.entries(persona.attributes).map(([key, value]) => `
                                    <div class="col-md-6 mb-2">
                                        <strong>${key}:</strong> ${value}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <!-- 原始数据（调试用） -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-code"></i> 原始数据 <small class="text-muted">(共 ${Object.keys(persona).length} 个字段)</small></h6>
                    </div>
                    <div class="card-body">
                        <pre class="bg-light p-3 rounded" style="max-height: 300px; overflow-y: auto; font-size: 0.8rem;">
${JSON.stringify(persona, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * 加载系统配置
 */
function loadSystemConfig() {
    // 加载同步配置
    fetch(API_BASE_URL + '/smart-query/sync/config')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderSyncConfig(data.config);
            } else {
                showSyncConfigError(data.error);
            }
        })
        .catch(error => {
            console.error('加载同步配置失败:', error);
            showSyncConfigError('加载失败');
        });
}

/**
 * 渲染同步配置
 */
function renderSyncConfig(config) {
    const container = document.getElementById('syncConfigSection');
    
    const html = `
        <form id="syncConfigForm">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">
                            <i class="fas fa-toggle-on"></i> 自动同步
                        </label>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="autoSync" 
                                ${config.auto_sync_enabled ? 'checked' : ''}>
                            <label class="form-check-label" for="autoSync">
                                启用自动数据同步
                            </label>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="syncInterval" class="form-label">
                            <i class="fas fa-clock"></i> 同步间隔（小时）
                        </label>
                        <input type="number" class="form-control" id="syncInterval" 
                            min="1" max="168" value="${config.sync_interval_hours || 24}">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="syncTime" class="form-label">
                            <i class="fas fa-calendar-alt"></i> 同步时间
                        </label>
                        <input type="time" class="form-control" id="syncTime" 
                            value="${config.sync_time || '02:00'}">
                    </div>
                </div>
                <div class="col-md-6 d-flex align-items-end">
                    <button type="button" class="btn btn-primary w-100" onclick="updateSyncConfig()">
                        <i class="fas fa-save"></i> 保存配置
                    </button>
                </div>
            </div>
        </form>
        
        <div class="mt-3">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <strong>说明:</strong> 数据同步将把MySQL中的数字人数据向量化并存储到LanceDB中，用于语义搜索。
                建议在系统负载较低的时间进行同步。
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * 显示同步配置错误
 */
function showSyncConfigError(error) {
    const container = document.getElementById('syncConfigSection');
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i>
            加载同步配置失败: ${error}
        </div>
    `;
}

/**
 * 更新同步配置
 */
function updateSyncConfig() {
    const autoSync = document.getElementById('autoSync').checked;
    const syncInterval = parseInt(document.getElementById('syncInterval').value);
    const syncTime = document.getElementById('syncTime').value;
    
    // 验证输入
    if (syncInterval < 1 || syncInterval > 168) {
        showNotification('同步间隔必须在1-168小时之间', 'error');
        return;
    }
    
    const config = {
        auto_sync: autoSync,
        interval_hours: syncInterval,
        sync_time: syncTime
    };
    
    fetch(API_BASE_URL + '/smart-query/sync/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('同步配置已更新', 'success');
            // 重新加载状态
            checkSystemStatus();
        } else {
            showNotification('更新配置失败: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('更新配置失败:', error);
        showNotification('更新配置失败', 'error');
    });
}

/**
 * 手动同步
 */
function manualSync(type) {
    const button = event.target;
    const originalText = button.innerHTML;
    
    // 显示加载状态
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中...';
    button.disabled = true;
    
    fetch(API_BASE_URL + '/smart-query/sync/manual', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: type })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            // 重新加载状态
            checkSystemStatus();
        } else {
            showNotification('同步失败: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('同步失败:', error);
        showNotification('同步请求失败', 'error');
    })
    .finally(() => {
        // 恢复按钮状态
        button.innerHTML = originalText;
        button.disabled = false;
    });
}

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * 渲染家庭成员信息卡片
 */
function renderFamilyMembersCard(familyMembers, isNestedView = false) {
    console.log('=== renderFamilyMembersCard 详细调试 ===');
    console.log('传入的familyMembers:', familyMembers);
    console.log('familyMembers类型:', typeof familyMembers);
    
    if (!familyMembers) {
        console.log('familyMembers为空，返回空字符串');
        return '';
    }
    
    // 详细检查孩子数据
    console.log('familyMembers.children:', familyMembers.children);
    console.log('familyMembers.children类型:', typeof familyMembers.children);
    console.log('familyMembers.children是否为数组:', Array.isArray(familyMembers.children));
    if (familyMembers.children) {
        console.log('familyMembers.children长度:', familyMembers.children.length);
        familyMembers.children.forEach((child, index) => {
            console.log(`孩子${index + 1}数据:`, child);
        });
    }
    
    // 检查是否有任何家庭成员
    const hasSpouse = familyMembers.spouse;
    const hasChildren = familyMembers.children && familyMembers.children.length > 0;
    
    console.log('家庭成员检查结果:', {
        hasSpouse: !!hasSpouse,
        hasChildren: hasChildren,
        childrenLength: familyMembers.children ? familyMembers.children.length : 0
    });
    
    if (!hasSpouse && !hasChildren) {
        console.log('没有配偶和孩子，返回空字符串');
        return '';
    }
    
    let html = `
        <div class="col-md-12">
            <div class="card mb-3">
                <div class="card-header">
                    <h6><i class="fas fa-users"></i> 家庭成员 
                        <span class="badge bg-info ms-2">${familyMembers.family_type || '未知家庭类型'}</span>
                    </h6>
                </div>
                <div class="card-body">
    `;
    
    // 配偶信息
    if (hasSpouse) {
        const spouse = familyMembers.spouse;
        console.log('渲染配偶:', spouse.name);
        html += `
            <div class="family-member-section mb-3">
                <h6 class="text-danger mb-2"><i class="fas fa-heart"></i> 配偶</h6>
                <div class="family-member-card p-3 border rounded clickable-spouse" 
                     onclick="viewSpouseDetail(${spouse.id})" style="cursor: pointer;">
                    <div class="d-flex align-items-center">
                        <div class="family-member-avatar me-3" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #dc3545, #c82333); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
                            ${spouse.name ? spouse.name.substring(0, 1) : '?'}
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${spouse.name || '未知'} <i class="fas fa-external-link-alt ms-2 text-primary" style="font-size: 12px;"></i></h6>
                            <p class="text-muted mb-1">${spouse.age}岁 · ${spouse.gender} · ${spouse.profession || '未知职业'}</p>
                            <div class="d-flex gap-1 mb-1">
                                <span class="badge bg-light text-dark">${spouse.current_mood || '平静'}</span>
                                <span class="badge bg-light text-dark">${spouse.current_activity || '休息'}</span>
                            </div>
                            <div class="small text-muted">
                                <i class="fas fa-mobile-alt"></i> ${spouse.phone_brand || '未知'} · 
                                <i class="fas fa-graduation-cap"></i> ${spouse.education || '未知'}
                            </div>
                        </div>
                    </div>
                    <div class="family-member-hover-hint"><small class="text-primary">点击查看详细信息</small></div>
                </div>
            </div>
        `;
        
        // 存储配偶数据
        window.familyMemberData = window.familyMemberData || {};
        window.familyMemberData[`spouse_${spouse.id}`] = spouse;
    }
    
    // 孩子信息
    if (hasChildren) {
        console.log('开始渲染孩子，数量:', familyMembers.children.length);
        html += `
            <div class="family-member-section mb-3">
                <h6 class="text-success mb-2"><i class="fas fa-child"></i> 孩子 (${familyMembers.children.length}人)</h6>
        `;
        
        familyMembers.children.forEach((child, index) => {
            console.log(`正在渲染孩子${index + 1}:`, child.name, 'ID:', child.id);
            html += `
                <div class="family-member-card p-3 border rounded mb-2 clickable-child" 
                     onclick="viewChildDetail(${child.id})" style="cursor: pointer;">
                    <div class="d-flex align-items-center">
                        <div class="family-member-avatar me-3" style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #28a745, #20c997); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${child.name ? child.name.substring(0, 1) : '?'}
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${child.name || '未知'} <i class="fas fa-external-link-alt ms-2 text-primary" style="font-size: 12px;"></i></h6>
                            <p class="text-muted mb-1">${child.age}岁 · ${child.gender} · ${child.profession || '学生'}</p>
                            <div class="d-flex gap-1 mb-1">
                                <span class="badge bg-light text-dark">${child.current_mood || '开心'}</span>
                                <span class="badge bg-light text-dark">${child.current_activity || '学习'}</span>
                                <span class="badge bg-light text-dark">${child.current_energy || '充沛'}</span>
                            </div>
                            <div class="small text-muted mb-1">
                                <i class="fas fa-map-marker-alt"></i> ${child.current_location || '家中'} · 
                                <i class="fas fa-mobile-alt"></i> ${child.phone_brand || '无'}
                            </div>
                            ${child.favorite_brands && child.favorite_brands.length > 0 ? `
                                <div class="small text-muted">
                                    <i class="fas fa-heart"></i> 喜爱: ${child.favorite_brands.slice(0, 3).join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="family-member-hover-hint"><small class="text-primary">点击查看详细信息</small></div>
                </div>
            `;
            
            // 存储孩子数据
            window.familyMemberData = window.familyMemberData || {};
            window.familyMemberData[`child_${child.id}`] = child;
            console.log(`孩子${index + 1}数据已存储到 child_${child.id}`);
        });
        
        html += '</div>';
        console.log('孩子渲染完成');
    } else {
        console.log('hasChildren为false，跳过孩子渲染');
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    console.log('生成的HTML长度:', html.length);
    console.log('生成的HTML片段（前500字符）:', html.substring(0, 500));
    return html;
}

// 查看配偶详情
function viewSpouseDetail(spouseId) {
    const spouseData = window.familyMemberData[`spouse_${spouseId}`];
    if (spouseData) {
        showFamilyMemberDetail(spouseData, '配偶详情');
    }
}

// 查看孩子详情
function viewChildDetail(childId) {
    const childData = window.familyMemberData[`child_${childId}`];
    if (childData) {
        showFamilyMemberDetail(childData, '孩子详情');
    }
}

/**
 * 显示家庭成员详细信息弹出框
 */
function showFamilyMemberDetail(persona, title) {
    // 创建模态框HTML，添加嵌套样式类
    const modalHtml = `
        <div class="modal fade modal-nested" id="familyMemberDetailModal" tabindex="-1" aria-labelledby="familyMemberDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="familyMemberDetailModalLabel">
                            <i class="fas fa-user"></i> ${title} - ${persona.name || '未知'}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${renderFamilyMemberDetailContent(persona)}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的模态框
    const existingModal = document.getElementById('familyMemberDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加新的模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('familyMemberDetailModal'));
    modal.show();
    
    // 模态框关闭后清理
    document.getElementById('familyMemberDetailModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

/**
 * 渲染家庭成员详细信息内容
 */
function renderFamilyMemberDetailContent(persona) {
    const avatarText = persona.name ? persona.name.substring(0, 1) : '?';
    
    let html = `
        <div class="row">
            <!-- 基本信息 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-id-card"></i> 基本信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="text-center mb-3">
                            <div class="persona-avatar-large" style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #007bff, #0056b3); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 32px; margin-bottom: 10px;">
                                ${avatarText}
                            </div>
                            <h5>${persona.name || '未知'}</h5>
                            <p class="text-muted">ID: ${persona.id || '未知'}</p>
                            <p class="text-muted">全名: ${persona.full_name || persona.name || '未知'}</p>
                            <p class="text-muted">显示名: ${persona.display_name || persona.name || '未知'}</p>
                        </div>
                        <div class="row">
                            <div class="col-6">
                                <strong>年龄:</strong> ${persona.age || '未知'}岁
                            </div>
                            <div class="col-6">
                                <strong>年龄组:</strong> ${persona.age_group || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>性别:</strong> ${persona.gender || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>职业:</strong> ${persona.profession || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>职业类别:</strong> ${persona.profession_category || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>教育:</strong> ${persona.education || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>教育水平:</strong> ${persona.education_level || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>婚姻:</strong> ${persona.marital_status || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>收入水平:</strong> ${persona.income_level || '未知'}
                            </div>
                            <div class="col-6">
                                <strong>手机:</strong> ${persona.phone_brand || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 地理信息 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-map-marker-alt"></i> 地理信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12 mb-2">
                                <strong>出生地:</strong> ${persona.birthplace || '未知'}
                            </div>
                            <div class="col-12 mb-2">
                                <strong>居住地:</strong> ${persona.residence || '未知'}
                            </div>
                            <div class="col-12 mb-2">
                                <strong>居住城市:</strong> ${persona.residence_city || persona.city || '未知'}
                            </div>
                            <div class="col-12 mb-2">
                                <strong>所在城市:</strong> ${persona.city || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 当前状态 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-heartbeat"></i> 当前状态</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6 mb-2">
                                <strong>心情:</strong> 
                                <span class="badge bg-primary">${persona.current_mood || '平静'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>精力:</strong> 
                                <span class="badge bg-success">${persona.current_energy || '正常'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>活动:</strong> 
                                <span class="badge bg-info">${persona.current_activity || '休息'}</span>
                            </div>
                            <div class="col-6 mb-2">
                                <strong>位置:</strong> 
                                <span class="badge bg-warning">${persona.current_location || '未知'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 健康信息 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-medkit"></i> 健康信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <strong>健康状况:</strong>
                            <div class="mt-1">
                                ${persona.health_status && Array.isArray(persona.health_status) ? 
                                    persona.health_status.map(status => `<span class="badge bg-success me-1">${status}</span>`).join('') :
                                    `<span class="badge bg-success">${persona.health_status || '身体健康'}</span>`
                                }
                            </div>
                        </div>
                        ${persona.medical_records && persona.medical_records.length > 0 ? `
                            <div class="mb-2">
                                <strong>就医记录:</strong>
                                <div class="mt-1">
                                    ${persona.medical_records.map(record => {
                                        if (typeof record === 'string') {
                                            return `<div class="small text-muted mb-1">• ${record}</div>`;
                                        } else if (typeof record === 'object') {
                                            return `<div class="small text-muted mb-1">• ${record.date || ''}: ${record.condition || ''} - ${record.hospital || ''}</div>`;
                                        }
                                        return '';
                                    }).join('')}
                                </div>
                            </div>
                        ` : '<div class="text-muted">暂无就医记录</div>'}
                    </div>
                </div>
            </div>
            
            <!-- 设备信息 -->
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-mobile-alt"></i> 设备信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12">
                                <strong>手机品牌:</strong> ${persona.phone_brand || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 品牌偏好 -->
            ${persona.favorite_brands && persona.favorite_brands.length > 0 ? `
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6><i class="fas fa-heart"></i> 品牌偏好</h6>
                        </div>
                        <div class="card-body">
                            <div class="d-flex flex-wrap gap-2">
                                ${persona.favorite_brands.map(brand => `<span class="badge bg-light text-dark">${brand}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- 查询匹配信息 -->
            <div class="col-md-12">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-search"></i> 查询匹配信息</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <strong>相关度评分:</strong> ${(persona.query_relevance_score || persona.similarity_score || 0).toFixed(3)}
                            </div>
                            <div class="col-md-3">
                                <strong>结构化匹配:</strong> ${persona.structured_match ? '是' : '否'}
                            </div>
                            <div class="col-md-3">
                                <strong>语义匹配:</strong> ${persona.semantic_match ? '是' : '否'}
                            </div>
                            <div class="col-md-3">
                                <strong>原始数据字段:</strong> ${Object.keys(persona).length}个
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加简化的家庭信息（嵌套视图，不显示父母和兄弟姐妹，配偶和孩子不可点击）
    if (persona.family_members) {
        html += renderFamilyMembersCard(persona.family_members, true);
    }
    
    return html;
} 