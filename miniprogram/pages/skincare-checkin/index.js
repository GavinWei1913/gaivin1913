// 综合习惯打卡页面（润肤 + 营养补剂）
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    // Tab 切换
    activeTab: 'skincare', // 'skincare' | 'supplement'
    
    // 润肤打卡数据
    continuousDays: 0,
    totalDays: 0,
    monthDays: 0,
    todayMorning: false,
    todayEvening: false,
    morningTime: '',
    eveningTime: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    calendarDays: [],
    
    // 补剂打卡数据
    supplementConfigs: [],
    todaySupplements: [],
    todaySuppRate: 0,
    suppReminderTimes: [],
    
    // 弹窗
    showSuppManage: false,
    editingSupp: null,
    showReminderSettings: false,
    
    // 当前提醒状态
    activeReminder: null
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const userData = app.globalData.userData || {};
    const habitCheckIns = userData.habitCheckIns || [];
    
    // ===== 润肤数据 =====
    const todayStatus = util.getTodayHabitCheckIn(habitCheckIns);
    const continuousDays = util.calcContinuousCheckInDays(habitCheckIns);
    const totalDays = util.calcTotalCheckInDays(habitCheckIns);
    const monthDays = util.calcMonthCheckInDays(habitCheckIns);
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const calendarDays = util.generateMonthCalendar(habitCheckIns, year, month);

    // ===== 补剂数据 =====
    const supplementConfigs = userData.supplementConfigs || [];
    const todaySupplements = util.getTodaySupplementsStatus(habitCheckIns, supplementConfigs);
    const todaySuppRate = util.calcTodaySupplementsRate(habitCheckIns, supplementConfigs);
    const suppReminderTimes = userData.supplementReminderTimes || [];

    this.setData({
      continuousDays,
      totalDays,
      monthDays,
      todayMorning: todayStatus.skincare.morning,
      todayEvening: todayStatus.skincare.evening,
      morningTime: todayStatus.skincare.morningTime,
      eveningTime: todayStatus.skincare.eveningTime,
      year,
      month,
      calendarDays,
      supplementConfigs,
      todaySupplements,
      todaySuppRate,
      suppReminderTimes
    });

    // 检查是否有待触发的提醒
    this.checkReminders();
  },

  // ===== Tab 切换 =====
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // ===== 提醒检查 =====
  checkReminders() {
    const reminder = util.checkSupplementReminder(this.data.suppReminderTimes);
    if (reminder) {
      this.setData({ activeReminder: reminder });
    }
  },

  dismissReminder() {
    this.setData({ activeReminder: null });
  },

  // ===== 润肤打卡 =====
  doMorningCheckIn() {
    if (this.data.todayMorning) {
      util.showToast('✅ 早上已打卡');
      return;
    }
    this.doCheckIn('morning', '🌅 早上好！润肤打卡成功 ✨');
  },

  doEveningCheckIn() {
    if (this.data.todayEvening) {
      util.showToast('✅ 晚上已打卡');
      return;
    }
    this.doCheckIn('evening', '🌙 晚安！润肤打卡成功 ✨');
  },

  doCheckIn(period, successMsg) {
    const userData = app.globalData.userData || {};
    let habitCheckIns = userData.habitCheckIns || [];
    const today = util.formatDate();
    
    let todayRecord = habitCheckIns.find(c => c.date === today);
    if (todayRecord) {
      if (!todayRecord.skincare) todayRecord.skincare = {};
      todayRecord.skincare[period] = Date.now();
    } else {
      habitCheckIns.push({
        date: today,
        skincare: {
          morning: period === 'morning' ? Date.now() : null,
          evening: period === 'evening' ? Date.now() : null
        },
        supplements: []
      });
    }

    userData.habitCheckIns = habitCheckIns;
    app.globalData.userData = userData;
    wx.setStorageSync('userData', userData);

    // 更新连续天数
    const streak = util.calcContinuousCheckInDays(habitCheckIns);
    userData.checkInStreak = streak;
    wx.setStorageSync('userData', userData);

    util.showToast(successMsg, 'success');
    
    setTimeout(() => {
      this.loadData();
    }, 500);
  },

  // ===== 补剂打卡 =====
  toggleSupplement(e) {
    const suppId = e.currentTarget.dataset.suppid;
    const userData = app.globalData.userData || {};
    let habitCheckIns = userData.habitCheckIns || [];
    const today = util.formatDate();
    
    let todayRecord = habitCheckIns.find(c => c.date === today);
    if (!todayRecord) {
      todayRecord = {
        date: today,
        skincare: { morning: null, evening: null },
        supplements: []
      };
      habitCheckIns.push(todayRecord);
    }
    
    const supps = todayRecord.supplements || [];
    const existingIndex = supps.findIndex(s => s.suppId === suppId);
    
    if (existingIndex >= 0) {
      // 取消打卡
      supps.splice(existingIndex, 1);
      util.showToast('已取消');
    } else {
      // 打卡
      supps.push({
        suppId: suppId,
        time: Date.now()
      });
      util.showToast('✅ 已记录', 'success');
    }
    
    todayRecord.supplements = supps;
    userData.habitCheckIns = habitCheckIns;
    app.globalData.userData = userData;
    wx.setStorageSync('userData', userData);
    
    setTimeout(() => {
      this.loadData();
    }, 300);
  },

  // ===== 补剂管理 =====
  openSuppManage() {
    this.setData({ showSuppManage: true });
  },

  closeSuppManage() {
    this.setData({ showSuppManage: false, editingSupp: null });
  },

  addSupplement() {
    const configs = this.data.supplementConfigs;
    const newSupp = {
      id: 'supp_' + Date.now(),
      name: '',
      dosage: '',
      time: '随餐服用',
      icon: '💊',
      color: '#81C784',
      enabled: true
    };
    configs.push(newSupp);
    this.updateSuppConfigs(configs);
    util.showToast('已添加新补剂，请编辑名称');
  },

  toggleSuppEnabled(e) {
    const suppId = e.currentTarget.dataset.suppid;
    const configs = this.data.supplementConfigs.map(s => {
      if (s.id === suppId) {
        return { ...s, enabled: !s.enabled };
      }
      return s;
    });
    this.updateSuppConfigs(configs);
  },

  deleteSupplement(e) {
    const suppId = e.currentTarget.dataset.suppid;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个补剂吗？',
      success(res) {
        if (res.confirm) {
          const configs = that.data.supplementConfigs.filter(s => s.id !== suppId);
          that.updateSuppConfigs(configs);
          util.showToast('已删除');
        }
      }
    });
  },

  editSupplement(e) {
    const suppId = e.currentTarget.dataset.suppid;
    const supp = this.data.supplementConfigs.find(s => s.id === suppId);
    this.setData({ editingSupp: JSON.parse(JSON.stringify(supp)) });
  },

  saveEditSupp() {
    const edited = this.data.editingSupp;
    if (!edited || !edited.name.trim()) {
      util.showToast('请输入补剂名称');
      return;
    }
    const configs = this.data.supplementConfigs.map(s => {
      if (s.id === edited.id) return edited;
      return s;
    });
    this.updateSuppConfigs(configs);
    this.setData({ editingSupp: null });
    util.showToast('✅ 已保存', 'success');
  },

  cancelEditSupp() {
    this.setData({ editingSupp: null });
  },

  inputEditSuppName(e) {
    const val = e.detail.value;
    this.setData({ 'editingSupp.name': val });
  },

  inputEditSuppDosage(e) {
    const val = e.detail.value;
    this.setData({ 'editingSupp.dosage': val });
  },

  inputEditSuppTime(e) {
    const val = e.detail.value;
    this.setData({ 'editingSupp.time': val });
  },

  selectSuppIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({ 'editingSupp.icon': icon });
  },

  updateSuppConfigs(configs) {
    const userData = app.globalData.userData || {};
    userData.supplementConfigs = configs;
    app.globalData.userData = userData;
    wx.setStorageSync('userData', userData);
    this.setData({ supplementConfigs: configs });
  },

  // ===== 提醒设置 =====
  openReminderSettings() {
    this.setData({ showReminderSettings: true });
  },

  closeReminderSettings() {
    this.setData({ showReminderSettings: false });
    this.loadData();
  },

  toggleReminder(e) {
    const rtId = e.currentTarget.dataset.rtid;
    const times = this.data.suppReminderTimes.map(rt => {
      if (rt.id === rtId) return { ...rt, enabled: !rt.enabled };
      return rt;
    });
    this.updateReminderTimes(times);
  },

  changeReminderTime(e) {
    const rtId = e.currentTarget.dataset.rtid;
    const that = this;
    const rt = this.data.suppReminderTimes.find(r => r.id === rtId);
    
    wx.showPickerModal ? wx.showPickerModal({
      title: '选择提醒时间',
      value: rt.time,
      success(time) {
        const times = that.data.suppReminderTimes.map(r => {
          if (r.id === rtId) return { ...r, time };
          return r;
        });
        that.updateReminderTimes(times);
      }
    }) : wx.showModal({
      title: '提醒时间',
      content: `当前：${rt.time}\n请在微信订阅消息中设置精准时间提醒`,
      confirmText: '知道了'
    });
  },

  updateReminderTimes(times) {
    const userData = app.globalData.userData || {};
    userData.supplementReminderTimes = times;
    app.globalData.userData = userData;
    wx.setStorageSync('userData', userData);
    this.setData({ suppReminderTimes: times });
  },

  // ===== 订阅消息授权 =====
  subscribeReminder() {
    wx.requestSubscribeMessage({
      tmplIds: [],
      success(res) {
        util.showToast('订阅成功，将在提醒时间推送');
      },
      fail(err) {
        if (err.errCode === 20004) {
          util.showToast('已拒绝订阅，可到设置中开启');
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    util.navigateBack();
  }
});
