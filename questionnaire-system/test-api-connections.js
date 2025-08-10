/**
 * API连接测试工具
 * 测试OpenAI和Gemini API的连接状态
 */

require('dotenv').config();

// 测试OpenAI API
async function testOpenAI() {
  console.log('\n🔵 === 测试OpenAI API ===');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ 缺少OPENAI_API_KEY环境变量');
    return false;
  }
  
  console.log(`🔑 OpenAI API Key: ${apiKey.slice(0, 20)}...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: '你好，这是一个连接测试'
          }
        ],
        max_tokens: 50
      })
    });
    
    console.log(`📡 HTTP状态码: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI API连接成功');
      console.log(`💬 响应内容: ${data.choices[0].message.content}`);
      return true;
    } else {
      const errorData = await response.json();
      console.log('❌ OpenAI API连接失败');
      console.log(`💬 错误信息: ${JSON.stringify(errorData, null, 2)}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ OpenAI API连接异常');
    console.log(`💬 错误详情: ${error.message}`);
    console.log(`🔍 错误类型: ${error.name}`);
    
    if (error.cause) {
      console.log(`🔍 错误原因: ${error.cause.message || error.cause}`);
    }
    
    return false;
  }
}

// 测试Gemini API
async function testGemini() {
  console.log('\n🟢 === 测试Gemini API ===');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('❌ 缺少GOOGLE_API_KEY环境变量');
    return false;
  }
  
  console.log(`🔑 Gemini API Key: ${apiKey.slice(0, 20)}...`);
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: '你好，这是一个连接测试'
              }
            ]
          }
        ]
      })
    });
    
    console.log(`📡 HTTP状态码: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Gemini API连接成功');
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        console.log(`💬 响应内容: ${data.candidates[0].content.parts[0].text}`);
      } else {
        console.log(`💬 响应数据: ${JSON.stringify(data, null, 2)}`);
      }
      return true;
    } else {
      const errorData = await response.text();
      console.log('❌ Gemini API连接失败');
      console.log(`💬 错误信息: ${errorData}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Gemini API连接异常');
    console.log(`💬 错误详情: ${error.message}`);
    console.log(`🔍 错误类型: ${error.name}`);
    
    if (error.cause) {
      console.log(`🔍 错误原因: ${error.cause.message || error.cause}`);
    }
    
    return false;
  }
}

// 测试网络连接
async function testNetworkConnectivity() {
  console.log('\n🌐 === 测试网络连接 ===');
  
  const testUrls = [
    'https://www.google.com',
    'https://api.openai.com',
    'https://generativelanguage.googleapis.com'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`🔍 测试连接: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`✅ ${url} - 状态码: ${response.status}`);
      
    } catch (error) {
      console.log(`❌ ${url} - 连接失败: ${error.message}`);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始API连接测试...');
  console.log(`⏰ 测试时间: ${new Date().toLocaleString()}`);
  
  // 测试网络连接
  await testNetworkConnectivity();
  
  // 测试API
  const openaiSuccess = await testOpenAI();
  const geminiSuccess = await testGemini();
  
  console.log('\n📊 === 测试结果汇总 ===');
  console.log(`🔵 OpenAI API: ${openaiSuccess ? '✅ 成功' : '❌ 失败'}`);
  console.log(`🟢 Gemini API: ${geminiSuccess ? '✅ 成功' : '❌ 失败'}`);
  
  if (!openaiSuccess && !geminiSuccess) {
    console.log('\n⚠️ 所有API都无法连接，可能的原因：');
    console.log('   1. 网络防火墙限制');
    console.log('   2. 需要配置代理');
    console.log('   3. VPN设置问题');
    console.log('   4. DNS解析问题');
  } else if (openaiSuccess || geminiSuccess) {
    console.log('\n✅ 至少有一个API可用，可以继续使用Stagehand');
  }
  
  console.log('\n🏁 测试完成');
}

// 运行测试
runTests().catch(console.error);
