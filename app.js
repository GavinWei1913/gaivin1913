// app.js
App({
  onLaunch() {
    try {
      // 初始化云开发（用 try-catch 防止因 env 错误导致白屏）
      wx.cloud.init({
        env: 'your-env-id', // ← 请在云开发控制台开通后，替换为你的环境ID
        traceUser: true
      });
      this.globalData.cloudReady = true;
    } catch (e) {
      console.warn('云初始化失败（可忽略，继续加载本地功能）:', e);
      this.globalData.cloudReady = false;
    }

    // 获取系统信息
    try {
      const sysInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = sysInfo;
      this.globalData.statusBarHeight = sysInfo.statusBarHeight;
      this.globalData.screenWidth = sysInfo.screenWidth;
      this.globalData.screenHeight = sysInfo.screenHeight;
    } catch (e) {
      console.warn('获取系统信息失败:', e);
    }

    // 检查登录状态
    this.checkLoginState();

    // 初始化用户本地数据
    this.initUserData();
  },

  globalData: {
    // 系统信息
    cloudReady: false,
    systemInfo: null,
    statusBarHeight: 0,
    screenWidth: 375,
    screenHeight: 667,

    // 登录状态
    isLoggedIn: false,
    phoneNumber: '',
    loginSkipped: false,

    // 用户数据
    userInfo: null,
    openid: '',

    // 主色调
    primaryColor: '#2E7D5B',
    purpleColor: '#B39DDB',
    bgColor: '#F5F7FA',

    // AI对话限制
    dailyChatLimit: 10,

    // 应用配置
    appName: '银屑助手',
    appVersion: '1.0.0',
    accompanyDays: 0,

    // 默认保健品列表
    defaultSupplements: [
      { id: 'vitd', name: '维生素D', dosage: '1000-2000 IU', time: '早餐后', icon: '☀️', color: '#FFB74D', enabled: true },
      { id: 'fishoil', name: '鱼油', dosage: '1000 mg', time: '随餐服用', icon: '🐟', color: '#4FC3F7', enabled: true },
      { id: 'probiotic', name: '益生菌', dosage: '1 粒', time: '空腹', icon: '🦠', color: '#81C784', enabled: false },
      { id: 'curcumin', name: '姜黄素', dosage: '500 mg', time: '随餐服用', icon: '🌿', color: '#FF8A65', enabled: false },
      { id: 'zinc', name: '锌', dosage: '15-30 mg', time: '随餐服用', icon: '⚡', color: '#CE93D8', enabled: false }
    ]
  },

  // ===== 登录相关 =====

  // 检查登录状态
  checkLoginState() {
    try {
      const loginInfo = wx.getStorageSync('loginInfo');
      if (loginInfo && loginInfo.phone) {
        this.globalData.isLoggedIn = true;
        this.globalData.phoneNumber = loginInfo.phone;
      } else {
        this.globalData.isLoggedIn = false;
        this.globalData.phoneNumber = '';
      }
    } catch (e) {
      this.globalData.isLoggedIn = false;
    }
  },

  // 执行登录
  doLogin(phone, password, callback) {
    const that = this;
    
    // 如果云环境可用，通过云函数登录
    if (this.globalData.cloudReady) {
      wx.cloud.callFunction({
        name: 'userLogin',
        data: { action: 'login', phone, password },
        success: (res) => {
          if (res.result && res.result.success) {
            // 保存登录信息
            const loginInfo = { phone, loginTime: Date.now() };
            wx.setStorageSync('loginInfo', loginInfo);
            that.globalData.isLoggedIn = true;
            that.globalData.phoneNumber = phone;
            if (callback) callback(null, res.result);
          } else {
            if (callback) callback(res.result.error || '登录失败');
          }
        },
        fail: (err) => {
          // 云函数不可用时，使用本地简易登录
          that._localLogin(phone, password, callback);
        }
      });
    } else {
      // 云不可用时，使用本地简易登录
      this._localLogin(phone, password, callback);
    }
  },

  // 本地简易登录（云不可用时的降级方案）
  _localLogin(phone, password, callback) {
    try {
      const users = wx.getStorageSync('registeredUsers') || {};
      
      if (users[phone]) {
        // 已注册，验证密码
        if (users[phone].password === password) {
          const loginInfo = { phone, loginTime: Date.now() };
          wx.setStorageSync('loginInfo', loginInfo);
          this.globalData.isLoggedIn = true;
          this.globalData.phoneNumber = phone;
          if (callback) callback(null, { success: true, isNewUser: false });
        } else {
          if (callback) callback('密码错误');
        }
      } else {
        // 未注册 → 自动注册并登录
        users[phone] = { password, registerTime: Date.now() };
        wx.setStorageSync('registeredUsers', users);
        const loginInfo = { phone, loginTime: Date.now() };
        wx.setStorageSync('loginInfo', loginInfo);
        this.globalData.isLoggedIn = true;
        this.globalData.phoneNumber = phone;
        if (callback) callback(null, { success: true, isNewUser: true });
      }
    } catch (e) {
      if (callback) callback('登录失败: ' + e.message);
    }
  },

  // 注册
  doRegister(phone, password, callback) {
    const that = this;

    if (this.globalData.cloudReady) {
      wx.cloud.callFunction({
        name: 'userLogin',
        data: { action: 'register', phone, password },
        success: (res) => {
          if (res.result && res.result.success) {
            const loginInfo = { phone, loginTime: Date.now() };
            wx.setStorageSync('loginInfo', loginInfo);
            that.globalData.isLoggedIn = true;
            that.globalData.phoneNumber = phone;
            if (callback) callback(null, res.result);
          } else {
            if (callback) callback(res.result.error || '注册失败');
          }
        },
        fail: (err) => {
          // 云函数不可用，使用本地注册
          that._localRegister(phone, password, callback);
        }
      });
    } else {
      this._localRegister(phone, password, callback);
    }
  },

  _localRegister(phone, password, callback) {
    try {
      const users = wx.getStorageSync('registeredUsers') || {};
      if (users[phone]) {
        if (callback) callback('该手机号已注册，请直接登录');
        return;
      }
      users[phone] = { password, registerTime: Date.now() };
      wx.setStorageSync('registeredUsers', users);
      
      const loginInfo = { phone, loginTime: Date.now() };
      wx.setStorageSync('loginInfo', loginInfo);
      this.globalData.isLoggedIn = true;
      this.globalData.phoneNumber = phone;
      if (callback) callback(null, { success: true, isNewUser: true });
    } catch (e) {
      if (callback) callback('注册失败: ' + e.message);
    }
  },

  // 退出登录
  doLogout(callback) {
    wx.removeStorageSync('loginInfo');
    this.globalData.isLoggedIn = false;
    this.globalData.phoneNumber = '';
    if (callback) callback();
  },

  // 跳过登录（临时使用，可配置是否允许）
  skipLogin() {
    this.globalData.loginSkipped = true;
    this.globalData.isLoggedIn = true; // 视为已登录（游客模式）
    wx.setStorageSync('loginInfo', { guest: true, loginTime: Date.now() });
  },

  // ===== 用户数据相关 =====

  // 获取用户信息（兼容原有 wx.getUserInfo 已废弃的情况）
  getUserInfo() {
    // 新版微信使用头像昵称填写能力，无需授权
    // 保留旧接口兼容
  },

  // 初始化用户数据
  initUserData() {
    try {
      const userData = wx.getStorageSync('userData');
      if (userData) {
        this.globalData.userData = userData;
        let needUpdate = false;

        // 兼容旧数据：skinCareCheckIns → habitCheckIns
        if (!userData.habitCheckIns) {
          const oldCheckIns = userData.skinCareCheckIns || [];
          userData.habitCheckIns = oldCheckIns.map(c => ({
            date: c.date,
            skincare: { morning: c.morning || null, evening: c.evening || null },
            supplements: []
          }));
          needUpdate = true;
        }

        if (!userData.supplementConfigs) {
          userData.supplementConfigs = JSON.parse(JSON.stringify(this.globalData.defaultSupplements));
          needUpdate = true;
        }

        if (!userData.supplementReminderTimes) {
          userData.supplementReminderTimes = [
            { id: 'morning', label: '早晨补剂', time: '08:00', enabled: true },
            { id: 'lunch', label: '午餐补剂', time: '12:00', enabled: false },
            { id: 'evening', label: '晚间补剂', time: '20:00', enabled: false }
          ];
          needUpdate = true;
        }

        if (!userData.checkInStreak) { userData.checkInStreak = 0; needUpdate = true; }
        if (!userData.lastCheckInDate) { userData.lastCheckInDate = ''; needUpdate = true; }

        if (needUpdate) {
          this.globalData.userData = userData;
          wx.setStorageSync('userData', userData);
        }
      } else {
        const defaultData = {
          nickname: '银屑斗士',
          avatarUrl: '',
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
          supplementConfigs: JSON.parse(JSON.stringify(this.globalData.defaultSupplements)),
          supplementReminderTimes: [
            { id: 'morning', label: '早晨补剂', time: '08:00', enabled: true },
            { id: 'lunch', label: '午餐补剂', time: '12:00', enabled: false },
            { id: 'evening', label: '晚间补剂', time: '20:00', enabled: false }
          ],
          checkInStreak: 0,
          lastCheckInDate: '',
          favorites: [],
          badges: []
        };
        this.globalData.userData = defaultData;
        wx.setStorageSync('userData', defaultData);
      }
    } catch (e) {
      console.warn('初始化用户数据失败:', e);
    }
  },

  // 计算陪伴天数
  getAccompanyDays() {
    const userData = this.globalData.userData || {};
    if (userData.startDate) {
      const start = new Date(userData.startDate);
      const now = new Date();
      const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      return diff + 1;
    }
    return 1;
  },

  // 更新用户数据
  updateUserData(key, value) {
    const userData = this.globalData.userData || {};
    userData[key] = value;
    this.globalData.userData = userData;
    try {
      wx.setStorageSync('userData', userData);
    } catch (e) {
      console.warn('保存用户数据失败:', e);
    }
  },

  // 获取今日可用AI对话次数
  getTodayChatLimit() {
    const userData = this.globalData.userData || {};
    const today = new Date().toDateString();

    if (userData.chatDate !== today) {
      userData.chatDate = today;
      userData.chatUsedToday = 0;
      this.updateUserData('chatDate', today);
      this.updateUserData('chatUsedToday', 0);
      return this.globalData.dailyChatLimit;
    }

    return Math.max(0, this.globalData.dailyChatLimit - (userData.chatUsedToday || 0));
  },

  // 使用一次AI对话
  useChat() {
    const userData = this.globalData.userData || {};
    const today = new Date().toDateString();

    if (userData.chatDate !== today) {
      userData.chatDate = today;
      userData.chatUsedToday = 0;
    }

    userData.chatUsedToday = (userData.chatUsedToday || 0) + 1;
    this.updateUserData('chatDate', userData.chatDate);
    this.updateUserData('chatUsedToday', userData.chatUsedToday);
  }
});
