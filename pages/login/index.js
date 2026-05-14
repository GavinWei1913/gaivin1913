// 登录/注册页面 - 支持短信验证码
const app = getApp();

Page({
  data: {
    // 表单数据
    phone: '',
    password: '',
    confirmPwd: '',
    smsCode: '',
    
    // 界面模式
    showRegister: false,   // 密码注册模式
    showSmsLogin: false,   // 短信验证码模式
    
    // 密码可见
    showPwd: false,
    showPwd2: false,
    
    // 加载状态
    loading: false,
    errorMsg: '',
    
    // 验证码倒计时
    smsCooldown: 0,
    isExistingUser: false, // 短信模式：用户是否已存在
  },

  onLoad() {
    // 如果已登录，直接跳转首页
    if (app.globalData.isLoggedIn) {
      this.goHome();
    }
  },

  // ==================== 输入事件 ====================

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
    this.clearError();
    // 输入手机号时检查是否已注册（短信模式）
    if (this.data.showSmsLogin) {
      this.checkPhoneExists(e.detail.value);
    }
  },

  onPwdInput(e) {
    this.setData({ password: e.detail.value });
    this.clearError();
  },

  onConfirmPwdInput(e) {
    this.setData({ confirmPwd: e.detail.value });
    this.clearError();
  },

  onSmsCodeInput(e) {
    this.setData({ smsCode: e.detail.value });
    this.clearError();
    // 6位验证码自动提交
    if (e.detail.value.length === 6) {
      this.handleSmsLogin();
    }
  },

  // ==================== 切换模式 ====================

  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd });
  },

  togglePwd2() {
    this.setData({ showPwd2: !this.data.showPwd2 });
  },

  // 密码登录/注册切换
  switchMode() {
    this.setData({
      showRegister: !this.data.showRegister,
      showSmsLogin: false,
      password: '',
      confirmPwd: '',
      smsCode: '',
      errorMsg: ''
    });
  },

  // 显示短信验证码面板
  showSmsPanel() {
    this.setData({
      showSmsLogin: true,
      showRegister: false,
      password: '',
      confirmPwd: '',
      smsCode: '',
      errorMsg: '',
      smsCooldown: 0
    });
    if (this.data.phone) {
      this.checkPhoneExists(this.data.phone);
    }
  },

  // 隐藏短信验证码面板
  hideSmsPanel() {
    this.setData({
      showSmsLogin: false,
      smsCode: '',
      errorMsg: ''
    });
  },

  // ==================== 错误处理 ====================

  showError(msg) {
    this.setData({ errorMsg: msg });
    setTimeout(() => {
      this.setData({ errorMsg: '' });
    }, 3000);
  },

  clearError() {
    if (this.data.errorMsg) {
      this.setData({ errorMsg: '' });
    }
  },

  // ==================== 校验 ====================

  validatePhone() {
    const phone = this.data.phone.trim();
    if (!phone) {
      this.showError('请输入手机号');
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.showError('请输入正确的11位手机号');
      return false;
    }
    return true;
  },

  validatePassword() {
    const pwd = this.data.password;
    if (!pwd) {
      this.showError('请输入密码');
      return false;
    }
    if (pwd.length < 6) {
      this.showError('密码至少6位');
      return false;
    }
    if (pwd.length > 20) {
      this.showError('密码不能超过20位');
      return false;
    }
    return true;
  },

  // ==================== 检查手机号是否已注册 ====================

  async checkPhoneExists(phone) {
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) return;
    
    try {
      // 先尝试云函数
      if (app.globalData.cloudReady) {
        const res = await wx.cloud.callFunction({
          name: 'userLogin',
          data: { action: 'checkPhone', phone: phone.trim() }
        });
        if (res.result && res.result.exists !== undefined) {
          this.setData({ isExistingUser: res.result.exists });
          return;
        }
      }
      // 降级：本地检查
      const users = wx.getStorageSync('registeredUsers') || {};
      this.setData({ isExistingUser: !!users[phone.trim()] });
    } catch (e) {
      // 静默处理
    }
  },

  // ==================== 发送短信验证码 ====================

  async sendSmsCode() {
    if (this.data.smsCooldown > 0) return;
    if (!this.validatePhone()) return;

    const phone = this.data.phone.trim();
    this.setData({ loading: true });

    try {
      // 尝试通过云函数发送
      if (app.globalData.cloudReady) {
        const res = await wx.cloud.callFunction({
          name: 'sendSmsCode',
          data: { phone }
        });

        if (res.result && res.result.success) {
          // 开发模式：在控制台显示验证码
          if (res.result.debugCode) {
            wx.showToast({
              title: `验证码: ${res.result.debugCode}（开发模式）`,
              icon: 'none',
              duration: 4000
            });
          } else {
            wx.showToast({ title: '验证码已发送，请查收短信', icon: 'none' });
          }
          this.startCooldown();
        } else {
          this.showError(res.result.error || '发送失败');
        }
      } else {
        // 云不可用：本地模拟发送
        wx.showToast({
          title: '云环境未配置，使用本地测试模式',
          icon: 'none',
          duration: 2000
        });
        // 生成本地验证码
        const localCode = String(Math.floor(100000 + Math.random() * 900000));
        const smsStore = wx.getStorageSync('smsCodes') || {};
        smsStore[phone] = {
          code: localCode,
          expireAt: Date.now() + 5 * 60 * 1000,
          used: false
        };
        wx.setStorageSync('smsCodes', smsStore);
        
        wx.showModal({
          title: '📱 本地测试验证码',
          content: `验证码: ${localCode}\n有效期5分钟`,
          showCancel: false
        });
        this.startCooldown();
      }
    } catch (e) {
      this.showError('发送失败，请检查网络后重试');
      console.error('发送验证码错误:', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 验证码倒计时
  startCooldown() {
    let cd = 60;
    this.setData({ smsCooldown: cd });
    const timer = setInterval(() => {
      cd--;
      if (cd <= 0) {
        clearInterval(timer);
        this.setData({ smsCooldown: 0 });
      } else {
        this.setData({ smsCooldown: cd });
      }
    }, 1000);
  },

  // ==================== 短信验证码登录/注册 ====================

  async handleSmsLogin() {
    if (this.data.loading) return;
    if (!this.validatePhone()) return;

    const smsCode = this.data.smsCode.trim();
    if (!smsCode) {
      this.showError('请输入验证码');
      return;
    }
    if (smsCode.length !== 6) {
      this.showError('验证码为6位数字');
      return;
    }

    this.setData({ loading: true });
    this.clearError();

    const phone = this.data.phone.trim();
    const that = this;

    // 优先通过云函数验证
    if (app.globalData.cloudReady) {
      try {
        const action = this.data.isExistingUser ? 'loginBySms' : 'registerBySms';
        const res = await wx.cloud.callFunction({
          name: 'userLogin',
          data: { action, phone, smsCode }
        });

        if (res.result && res.result.success) {
          this.saveLoginSuccess(phone, res.result);
        } else {
          this.showError(res.result.error || '验证失败');
          this.setData({ loading: false });
        }
      } catch (e) {
        // 云函数失败，降级到本地验证
        this.localSmsLogin(phone, smsCode, (err, result) => {
          that.setData({ loading: false });
          if (err) {
            that.showError(err);
          } else {
            that.saveLoginSuccess(phone, result);
          }
        });
      }
    } else {
      // 本地验证
      this.localSmsLogin(phone, smsCode, (err, result) => {
        this.setData({ loading: false });
        if (err) {
          this.showError(err);
        } else {
          this.saveLoginSuccess(phone, result);
        }
      });
    }
  },

  // 本地短信验证（云不可用时降级）
  localSmsLogin(phone, smsCode, callback) {
    try {
      const smsStore = wx.getStorageSync('smsCodes') || {};
      const record = smsStore[phone];

      if (!record) {
        callback('请先获取验证码');
        return;
      }
      if (record.used) {
        callback('验证码已使用，请重新获取');
        return;
      }
      if (Date.now() > record.expireAt) {
        callback('验证码已过期，请重新获取');
        return;
      }
      if (record.code !== smsCode) {
        callback('验证码错误');
        return;
      }

      // 标记已使用
      record.used = true;
      smsStore[phone] = record;
      wx.setStorageSync('smsCodes', smsStore);

      // 保存登录状态
      const users = wx.getStorageSync('registeredUsers') || {};
      if (!users[phone]) {
        // 新用户自动注册
        users[phone] = { 
          password: '', 
          registerMethod: 'sms',
          registerTime: Date.now() 
        };
        wx.setStorageSync('registeredUsers', users);
        callback(null, { success: true, isNewUser: true, message: '注册成功' });
      } else {
        callback(null, { success: true, isNewUser: false, message: '登录成功' });
      }
    } catch (e) {
      callback('验证失败: ' + e.message);
    }
  },

  // 登录成功处理
  saveLoginSuccess(phone, result) {
    const loginInfo = { phone, loginTime: Date.now(), registerMethod: 'sms' };
    wx.setStorageSync('loginInfo', loginInfo);
    app.globalData.isLoggedIn = true;
    app.globalData.phoneNumber = phone;

    this.setData({ loading: false });
    wx.showToast({
      title: result.isNewUser ? '🎉 注册成功，欢迎加入！' : '✅ 登录成功',
      icon: 'none',
      duration: 1500
    });
    setTimeout(() => this.goHome(), 1500);
  },

  // ==================== 密码登录 ====================

  handleLogin() {
    if (this.data.loading) return;

    if (!this.validatePhone()) return;
    if (!this.validatePassword()) return;

    this.setData({ loading: true });
    this.clearError();

    const phone = this.data.phone.trim();
    const password = this.data.password;
    const that = this;

    app.doLogin(phone, password, (err, result) => {
      that.setData({ loading: false });
      if (err) {
        that.showError(err);
      } else {
        wx.showToast({
          title: result.isNewUser ? '🎉 欢迎加入' : '登录成功',
          icon: 'none',
          duration: 1500
        });
        setTimeout(() => that.goHome(), 1500);
      }
    });
  },

  // ==================== 密码注册 ====================

  handleRegister() {
    if (this.data.loading) return;

    if (!this.validatePhone()) return;
    if (!this.validatePassword()) return;

    if (this.data.password !== this.data.confirmPwd) {
      this.showError('两次密码输入不一致');
      return;
    }

    this.setData({ loading: true });
    this.clearError();

    const phone = this.data.phone.trim();
    const password = this.data.password;
    const that = this;

    app.doRegister(phone, password, (err, result) => {
      that.setData({ loading: false });
      if (err) {
        that.showError(err);
      } else {
        wx.showToast({
          title: '🎉 注册成功，欢迎你！',
          icon: 'none',
          duration: 1500
        });
        setTimeout(() => that.goHome(), 1500);
      }
    });
  },

  // ==================== 跳过登录（游客模式） ====================

  handleSkip() {
    app.skipLogin();
    wx.showToast({
      title: '游客模式（部分功能受限）',
      icon: 'none',
      duration: 1500
    });
    setTimeout(() => this.goHome(), 1500);
  },

  // ==================== 跳转首页 ====================

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
