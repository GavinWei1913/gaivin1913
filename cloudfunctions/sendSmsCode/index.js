/**
 * 发送短信验证码云函数
 * 
 * 【重要】正式上线需要配置腾讯云短信服务
 * 当前默认使用"控制台输出模式"方便开发调试
 * 
 * 腾讯云短信配置：
 * 1. 在 https://console.cloud.tencent.com/sms 开通短信服务
 * 2. 创建短信签名和模板
 * 3. 将 SecretId / SecretKey 填入环境变量
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const smsCodes = db.collection('smsCodes');

// ======= 配置区 =======
const CONFIG = {
  // 开发模式: true = 不真正发短信，验证码打印在云函数日志里
  DEV_MODE: true,
  
  // 验证码有效期（分钟）
  CODE_EXPIRE_MINUTES: 5,
  
  // 同一手机号每天最多发送次数
  DAILY_LIMIT: 10,
  
  // 短信模板（腾讯云短信）
  SMS_SIGN: '银屑助手',
  SMS_TEMPLATE_ID: '1234567', // 替换为你的模板ID
  
  // 腾讯云API密钥（生产环境需配置）
  SECRET_ID: '',
  SECRET_KEY: ''
};

exports.main = async (event, context) => {
  const { phone } = event;
  const wxContext = cloud.getWXContext();

  // ===== 参数校验 =====
  if (!phone) {
    return { success: false, error: '手机号不能为空' };
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: '请输入正确的手机号' };
  }

  try {
    // ===== 频率限制 =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // 查询当天已发送次数
    const countResult = await smsCodes.where({
      phone,
      createTime: cloud.database().command.gte(today)
    }).count();

    if (countResult.total >= CONFIG.DAILY_LIMIT) {
      return {
        success: false,
        error: `今日验证码发送已达上限（${CONFIG.DAILY_LIMIT}次），请明天再试`
      };
    }

    // ===== 生成6位验证码 =====
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expireAt = new Date(Date.now() + CONFIG.CODE_EXPIRE_MINUTES * 60 * 1000);

    // ===== 存储验证码到数据库 =====
    await smsCodes.add({
      data: {
        phone,
        code,
        openid: wxContext.OPENID,
        createTime: cloud.database().serverDate(),
        expireAt,
        used: false
      }
    });

    // ===== 发送短信 =====
    if (CONFIG.DEV_MODE) {
      // 开发模式：仅打印日志，不真正发送
      console.log(`\n📱 [开发模式] 验证码已生成`);
      console.log(`   手机号: ${phone}`);
      console.log(`   验证码: ${code}`);
      console.log(`   有效期: ${CONFIG.CODE_EXPIRE_MINUTES} 分钟`);
      console.log(`   过期时间: ${expireAt.toISOString()}\n`);
    } else {
      // 生产模式：调用腾讯云短信API（需要配置密钥）
      await sendSmsViaTencent(phone, code);
    }

    return {
      success: true,
      message: '验证码已发送',
      // 开发模式下返回验证码（方便调试）；生产模式不返回
      debugCode: CONFIG.DEV_MODE ? code : undefined
    };

  } catch (err) {
    console.error('发送验证码失败:', err);
    return { success: false, error: '发送失败，请稍后重试' };
  }
};

/**
 * 腾讯云短信发送（生产环境用）
 * 文档：https://cloud.tencent.com/document/product/382/43194
 */
async function sendSmsViaTencent(phone, code) {
  // 这里需要引入 tencentcloud-sdk-nodejs
  // 安装: npm install tencentcloud-sdk-nodejs
  /*
  const tencentcloud = require('tencentcloud-sdk-nodejs');
  const SmsClient = tencentcloud.sms.v20210111.Client;
  
  const client = new SmsClient({
    credential: {
      secretId: CONFIG.SECRET_ID,
      secretKey: CONFIG.SECRET_KEY,
    },
    region: 'ap-guangzhou',
  });
  
  await client.SendSms({
    PhoneNumberSet: [`+86${phone}`],
    TemplateID: CONFIG.SMS_TEMPLATE_ID,
    SignName: CONFIG.SMS_SIGN,
    TemplateParamSet: [code, String(CONFIG.CODE_EXPIRE_MINUTES)],
  });
  */
  
  // 占位：实际发送时取消上面注释
  console.log(`[生产模式] 向 ${phone} 发送验证码 ${code}`);
}

// 也支持批量删除过期验证码（可定时触发）
async function cleanExpiredCodes() {
  const now = new Date();
  await smsCodes.where({
    expireAt: cloud.database().command.lt(now)
  }).remove();
}
