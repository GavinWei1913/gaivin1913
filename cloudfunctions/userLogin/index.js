/**
 * 用户登录/注册 云函数
 * 
 * 支持两种注册方式：
 * 1. 短信验证码（推荐）—— 注册时需验证短信验证码
 * 2. 密码登录（原有）—— 已注册用户用密码登录
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const usersCollection = db.collection('users');
const smsCodes = db.collection('smsCodes');

exports.main = async (event, context) => {
  const { action, phone, password, smsCode } = event;
  const wxContext = cloud.getWXContext();

  if (!phone) {
    return { success: false, error: '手机号不能为空' };
  }

  try {
    switch (action) {
      // ===== 短信验证码注册 =====
      case 'registerBySms':
        return await handleRegisterBySms(phone, smsCode, wxContext);

      // ===== 短信验证码登录（免密码） =====
      case 'loginBySms':
        return await handleLoginBySms(phone, smsCode, wxContext);

      // ===== 密码登录（已有账号） =====
      case 'login':
        return await handleLoginByPassword(phone, password, wxContext);

      // ===== 密码注册（原有方式） =====
      case 'register':
        return await handleRegisterByPassword(phone, password, wxContext);

      default:
        return { success: false, error: '未知操作类型' };
    }
  } catch (err) {
    console.error('云函数执行错误:', err);
    return { success: false, error: '系统繁忙，请稍后重试' };
  }
};

/**
 * 验证短信验证码
 */
async function verifySmsCode(phone, smsCode) {
  if (!smsCode) {
    return { valid: false, error: '请输入验证码' };
  }

  const result = await smsCodes.where({
    phone,
    code: smsCode,
    used: false,
    expireAt: cloud.database().command.gt(new Date())
  }).orderBy('createTime', 'desc').limit(1).get();

  if (result.data.length === 0) {
    return { valid: false, error: '验证码错误或已过期' };
  }

  // 标记验证码已使用
  const record = result.data[0];
  await smsCodes.doc(record._id).update({
    data: { used: true }
  });

  return { valid: true };
}

/**
 * 短信验证码注册
 */
async function handleRegisterBySms(phone, smsCode, wxContext) {
  // 验证验证码
  const verifyResult = await verifySmsCode(phone, smsCode);
  if (!verifyResult.valid) {
    return { success: false, error: verifyResult.error };
  }

  // 检查手机号是否已注册
  const existing = await usersCollection.where({ phone }).get();
  if (existing.data.length > 0) {
    return { success: false, error: '该手机号已注册，请直接登录' };
  }

  // 创建新用户
  const result = await usersCollection.add({
    data: {
      phone,
      password: '',  // 短信注册用户无密码
      registerMethod: 'sms',
      openid: wxContext.OPENID,
      unionid: wxContext.UNIONID || '',
      nickname: '银屑斗士',
      avatarUrl: '',
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
      userData: {
        startDate: new Date().toISOString(),
        recordDays: 0,
        continuousRecordDays: 0,
        lastRecordDate: '',
        dietSurveyCompleted: false,
        dietAdvice: null,
        chatUsedToday: 0,
        chatDate: '',
        records: [],
        moodDiary: [],
        habitCheckIns: [],
        checkInStreak: 0,
        lastCheckInDate: '',
        favorites: [],
        badges: []
      }
    }
  });

  return {
    success: true,
    isNewUser: true,
    _id: result._id,
    message: '注册成功'
  };
}

/**
 * 短信验证码登录（免密码）
 */
async function handleLoginBySms(phone, smsCode, wxContext) {
  // 验证验证码
  const verifyResult = await verifySmsCode(phone, smsCode);
  if (!verifyResult.valid) {
    return { success: false, error: verifyResult.error };
  }

  // 查找用户
  const result = await usersCollection.where({ phone }).get();
  if (result.data.length === 0) {
    return { success: false, error: '该手机号未注册' };
  }

  const user = result.data[0];

  // 更新登录信息
  await usersCollection.doc(user._id).update({
    data: {
      lastLoginTime: db.serverDate(),
      openid: wxContext.OPENID
    }
  });

  return {
    success: true,
    isNewUser: false,
    userInfo: {
      _id: user._id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl
    },
    message: '登录成功'
  };
}

/**
 * 密码登录
 */
async function handleLoginByPassword(phone, password, wxContext) {
  const result = await usersCollection.where({ phone }).get();

  if (result.data.length === 0) {
    return { success: false, error: '该手机号未注册' };
  }

  const user = result.data[0];

  // 短信注册用户不能密码登录
  if (user.registerMethod === 'sms' && !user.password) {
    return { success: false, error: '该账号使用短信注册，请使用验证码登录' };
  }

  if (user.password !== password) {
    return { success: false, error: '密码错误' };
  }

  await usersCollection.doc(user._id).update({
    data: {
      lastLoginTime: db.serverDate(),
      openid: wxContext.OPENID
    }
  });

  return {
    success: true,
    isNewUser: false,
    userInfo: {
      _id: user._id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl
    },
    message: '登录成功'
  };
}

/**
 * 密码注册
 */
async function handleRegisterByPassword(phone, password, wxContext) {
  const existing = await usersCollection.where({ phone }).get();
  if (existing.data.length > 0) {
    return { success: false, error: '该手机号已注册，请直接登录' };
  }

  const result = await usersCollection.add({
    data: {
      phone,
      password,
      registerMethod: 'password',
      openid: wxContext.OPENID,
      unionid: wxContext.UNIONID || '',
      nickname: '银屑斗士',
      avatarUrl: '',
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
      userData: {
        startDate: new Date().toISOString(),
        recordDays: 0,
        continuousRecordDays: 0,
        lastRecordDate: '',
        dietSurveyCompleted: false,
        dietAdvice: null,
        chatUsedToday: 0,
        chatDate: '',
        records: [],
        moodDiary: [],
        habitCheckIns: [],
        checkInStreak: 0,
        lastCheckInDate: '',
        favorites: [],
        badges: []
      }
    }
  });

  return {
    success: true,
    isNewUser: true,
    _id: result._id,
    message: '注册成功'
  };
}
