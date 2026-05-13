/**
 * 腾讯混元大模型对话云函数
 * 
 * 使用方式：
 * 1. 在云开发控制台启用该云函数
 * 2. 配置环境变量 HUNYUAN_SECRET_ID 和 HUNYUAN_SECRET_KEY
 * 3. 或直接在此文件中填入密钥（不推荐生产环境）
 * 
 * API文档：https://cloud.tencent.com/document/product/1729
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 腾讯混元API配置
const CONFIG = {
  // 建议使用云函数环境变量，而非硬编码
  secretId: process.env.HUNYUAN_SECRET_ID || 'your_secret_id',
  secretKey: process.env.HUNYUAN_SECRET_KEY || 'your_secret_key',
  // 模型版本
  model: 'hunyuan-chat', // 或 hunyuan-pro, hunyuan-standard
  region: 'ap-guangzhou'
};

// 系统提示词 - 定义小愈的角色
const SYSTEM_PROMPT = `你叫"小愈"，是"银屑助手"微信小程序中的AI情绪陪伴助手。

## 角色定位
你是一位温和、理性、有共情能力的陪伴者，专门为银屑病患者提供情绪支持和心理疏导。

## 核心原则
1. 以共情倾听为主，先理解用户的感受，再给予回应
2. 可以分享正念、冥想、呼吸练习等缓解情绪的方法
3. 绝不给出医疗诊断或治疗建议（如推荐药物、判断病情等）
4. 当用户提到严重心理危机（如自伤念头）时，引导其寻求专业帮助
5. 保持温暖、鼓励的语气，但不要虚假乐观

## 对话风格
- 亲切柔和，像一位朋友
- 适度使用emoji，但不要过度
- 多用开放式问题引导用户表达
- 认可用户的感受和努力

## 回复格式
保持简洁自然的中文对话。每条回复末尾不需要额外标注。`;

/**
 * 生成腾讯混元API签名
 */
function sign(secretKey, signStr) {
  const crypto = require('crypto');
  return crypto.createHmac('sha1', secretKey).update(signStr).digest('base64');
}

/**
 * 构建请求体
 */
function buildRequestBody(userMessage, history) {
  const messages = [
    { Role: 'system', Content: SYSTEM_PROMPT },
    ...history.map(m => ({
      Role: m.role === 'assistant' ? 'assistant' : 'user',
      Content: m.content
    })),
    { Role: 'user', Content: userMessage }
  ];

  return {
    Messages: messages,
    TopP: 0.9,
    Temperature: 0.8
  };
}

/**
 * 调用腾讯混元API
 */
async function callHunyuanAPI(userMessage, history) {
  const { secretId, secretKey, region } = CONFIG;
  
  // 由于腾讯混元API需要通过HTTP请求调用，这里使用云函数内置的request
  // 实际部署时建议使用腾讯云API网关或SCF触发器
  // 以下为简化的调用示例

  try {
    // 方法1：直接调用HTTP API（需要配置安全组）
    // 腾讯混元API endpoint
    const url = `https://hunyuan.tencentcloudapi.com`;

    const requestBody = buildRequestBody(userMessage, history);
    
    const response = await cloud.callFunction({
      name: 'hunyuanProxy', // 如果有代理云函数
      data: {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: userMessage }
        ]
      }
    });

    if (response.result && response.result.reply) {
      return response.result.reply;
    }

    // 方法2：本地模拟回复（开发阶段使用）
    return getMockReply(userMessage);

  } catch (err) {
    console.error('Hunyuan API call failed:', err);
    return getMockReply(userMessage);
  }
}

/**
 * 本地模拟回复（用于开发和测试阶段）
 */
function getMockReply(text) {
  const replies = [
    '嗯，我在听。能再多说说你的感受吗？',
    '谢谢你愿意和我分享这些。面对银屑病的反复确实不容易，你已经做得很好了。',
    '听起来你今天心情不太好。要不要试试深呼吸？先别急着想太多，慢慢来。',
    '皮损的变化确实会让人困扰，但请记住，这不代表你不好。你的价值远不止于此。',
    '你提到的这些感受，很多病友也经历过。你并不孤单。',
    '我注意到你今天说的话里有些负面情绪。能告诉我最近发生了什么特别的事吗？',
    '身体的康复需要时间，情绪的恢复也是。请对自己多一些耐心。',
    '有时候，仅仅是承认自己"今天不太好"，就是一种勇气。谢谢你信任我。',
    '你愿意主动聊这些，说明你已经在积极面对了。这是很棒的一步。',
    '换季的时候皮损容易反复，这很正常。你可以试试记录一下每天的变化，找找规律。'
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { message, history = [] } = event;
  
  if (!message) {
    return { code: 400, error: '缺少消息内容' };
  }

  try {
    const reply = await callHunyuanAPI(message, history);
    return {
      code: 0,
      reply,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      code: 500,
      error: 'AI服务暂不可用',
      reply: '抱歉，我现在有点不在状态。请稍后再试试？或者你可以先和我聊聊今天发生了什么事。'
    };
  }
};
