// app.js
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'your-env-id', // 请替换为实际环境ID
      traceUser: true
    });

    // 获取系统信息
    const sysInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = sysInfo;
    this.globalData.statusBarHeight = sysInfo.statusBarHeight;
    this.globalData.screenWidth = sysInfo.screenWidth;
    this.globalData.screenHeight = sysInfo.screenHeight;

    // 获取用户登录信息
    this.getUserInfo();
    
    // 初始化用户数据
    this.initUserData();
  },

  globalData: {
    // 系统信息
    systemInfo: null,
    statusBarHeight: 0,
    screenWidth: 375,
    screenHeight: 667,
    
    // 用户数据
    userInfo: null,
    openid: '',
    
    // 主色调
    primaryColor: '#2E7D5B',
    purpleColor: '#B39DDB',
    bgColor: '#F5F7FA',
    
    // API 配置 - 腾讯混元
    hunyuanConfig: {
      appId: '',     // 请替换
      secretId: '',  // 请替换
      secretKey: '', // 请替换
    },
    
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

  // 获取用户信息
  getUserInfo() {
    const that = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success(res) {
              that.globalData.userInfo = res.userInfo;
            }
          });
        }
      }
    });
  },

  // 初始化用户数据
  initUserData() {
    const userData = wx.getStorageSync('userData');
    if (userData) {
      this.globalData.userData = userData;
      // 确保旧数据中有新字段
      let needUpdate = false;
      
      // 兼容旧数据：skinCareCheckIns → habitCheckIns
      if (!userData.habitCheckIns) {
        // 如果旧数据有润肤打卡记录，迁移过来
        const oldCheckIns = userData.skinCareCheckIns || [];
        userData.habitCheckIns = oldCheckIns.map(c => ({
          date: c.date,
          skincare: { morning: c.morning || null, evening: c.evening || null },
          supplements: [] // 旧的没有补剂数据
        }));
        needUpdate = true;
      }
      
      if (!userData.supplementConfigs) {
        userData.supplementConfigs = JSON.parse(JSON.stringify(this.globalData.defaultSupplements));
        needUpdate = true;
      }
      
      if (!userData.supplementReminderTimes) {
        // 默认提醒时间
        userData.supplementReminderTimes = [
          { id: 'morning', label: '早晨补剂', time: '08:00', enabled: true },
          { id: 'lunch', label: '午餐补剂', time: '12:00', enabled: false },
          { id: 'evening', label: '晚间补剂', time: '20:00', enabled: false }
        ];
        needUpdate = true;
      }
      
      if (!userData.checkInStreak) {
        userData.checkInStreak = 0;
        needUpdate = true;
      }
      if (!userData.lastCheckInDate) {
        userData.lastCheckInDate = '';
        needUpdate = true;
      }
      
      if (needUpdate) {
        this.globalData.userData = userData;
        wx.setStorageSync('userData', userData);
      }
    } else {
      // 初始化默认用户数据
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
        // 综合习惯打卡
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
    wx.setStorageSync('userData', userData);
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
