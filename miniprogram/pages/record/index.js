// 记录页 - 病程管理核心区
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    // 记录状态
    hasTodayRecord: false,
    recordDays: 0,
    continuousDays: 0,
    monthRecordDays: 0,
    antiInflammatoryScore: 0,

    // 综合习惯打卡入口
    checkInStreak: 0,
    suppRate: 0,
    checkInStatusText: '今日尚未打卡',

    // 快捷记录数据
    selectedItch: { value: -1, label: '点我选择', emoji: '😊' },
    areaValue: '',
    areaLabel: '点我选择',
    areaEmoji: '📋',
    dietSuccess: false,
    dietLabel: '点我选择',
    dietEmoji: '🍽️',
    selectedMood: { value: -1, label: '点我选择', emoji: '😌' },

    // 更多记录
    showMoreRecords: false,
    hasCold: false,
    hasInjury: false,
    medication: '',
    supplements: [],

    // Picker 显示
    showItchPicker: false,
    showMoodPicker: false,
    showAreaPicker: false,

    // 选项数据
    itchLevels: util.itchLevels,
    moodLevels: [
      { value: 0, label: '很差', icon: '😞' },
      { value: 1, label: '不好', icon: '😔' },
      { value: 2, label: '一般', icon: '😐' },
      { value: 3, label: '不错', icon: '😊' },
      { value: 4, label: '很棒', icon: '🥰' }
    ]
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const userData = app.globalData.userData || {};
    const today = util.formatDate();
    const todayRecord = (userData.records || []).find(r => r.date === today);

    // 综合习惯打卡数据（润肤 + 补剂）
    const habitCheckIns = userData.habitCheckIns || [];
    const todayCheckIn = util.getTodayHabitCheckIn(habitCheckIns);
    const checkInStreak = util.calcContinuousCheckInDays(habitCheckIns);
    const suppConfigs = userData.supplementConfigs || [];
    const suppRate = util.calcTodaySupplementsRate(habitCheckIns, suppConfigs);
    
    let checkInStatusText = '今日尚未打卡';
    const sc = todayCheckIn.skincare;
    if (sc.morning && sc.evening) {
      checkInStatusText = suppRate === 100 ? '✅ 习惯全部完成' : '✅ 润肤已完成，补剂' + suppRate + '%';
    } else if (sc.morning) {
      checkInStatusText = '🌅 早上已润肤，记得晚间';
    } else if (sc.evening) {
      checkInStatusText = '🌙 晚间已润肤';
    } else if (todayCheckIn.supplements.length > 0) {
      checkInStatusText = '💊 补剂已打卡 ' + todayCheckIn.supplements.length + ' 项';
    }

    this.setData({
      recordDays: userData.recordDays || 0,
      continuousDays: userData.continuousRecordDays || 0,
      monthRecordDays: this.calcMonthRecordDays(userData.records || []),
      hasTodayRecord: !!todayRecord,
      checkInStreak,
      suppRate,
      checkInStatusText
    });

    if (todayRecord) {
      this.setData({
        antiInflammatoryScore: todayRecord.score || 0,
        selectedItch: { value: todayRecord.itch, label: this.getItchLabel(todayRecord.itch), emoji: this.getItchEmoji(todayRecord.itch) },
        areaValue: todayRecord.area,
        areaLabel: this.getAreaLabel(todayRecord.area),
        areaEmoji: this.getAreaEmoji(todayRecord.area),
        dietSuccess: todayRecord.diet,
        dietLabel: todayRecord.diet ? '✅ 成功' : '❌ 有破戒',
        dietEmoji: todayRecord.diet ? '✅' : '❌',
        selectedMood: { value: todayRecord.mood, label: this.getMoodLabel(todayRecord.mood), emoji: this.getMoodEmoji(todayRecord.mood) },
        hasCold: todayRecord.hasCold || false,
        hasInjury: todayRecord.hasInjury || false,
        medication: todayRecord.medication || '',
        supplements: todayRecord.supplements || []
      });
    }
  },

  calcMonthRecordDays(records) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  },

  // ===== 综合习惯打卡入口 =====
  goCheckIn() {
    util.navigateTo('/pages/skincare-checkin/index');
  },

  // ===== 瘙痒 =====
  showItchPicker() { this.setData({ showItchPicker: true }); },
  hideItchPicker() { this.setData({ showItchPicker: false }); },
  selectItch(e) {
    const value = parseInt(e.currentTarget.dataset.value);
    this.setData({
      selectedItch: { value, label: this.getItchLabel(value), emoji: this.getItchEmoji(value) },
      showItchPicker: false
    });
  },
  getItchLabel(value) {
    const item = util.itchLevels.find(i => i.value === value);
    return item ? item.label : '未记录';
  },
  getItchEmoji(value) {
    const item = util.itchLevels.find(i => i.value === value);
    return item ? item.icon : '😊';
  },

  // ===== 皮损面积 =====
  showAreaPicker() { this.setData({ showAreaPicker: true }); },
  hideAreaPicker() { this.setData({ showAreaPicker: false }); },
  selectArea(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      areaValue: value,
      areaLabel: this.getAreaLabel(value),
      areaEmoji: this.getAreaEmoji(value),
      showAreaPicker: false
    });
  },
  getAreaLabel(value) {
    const map = { decrease: '减少（好转）', stable: '无变化', increase: '增加（加重）' };
    return map[value] || '未记录';
  },
  getAreaEmoji(value) {
    const map = { decrease: '✅', stable: '➖', increase: '🔴' };
    return map[value] || '📋' ;
  },

  // ===== 忌口 =====
  toggleDiet() {
    const newVal = !this.data.dietSuccess;
    this.setData({
      dietSuccess: newVal,
      dietLabel: newVal ? '✅ 成功' : '❌ 有破戒',
      dietEmoji: newVal ? '✅' : '❌'
    });
  },

  // ===== 心情 =====
  showMoodPicker() { this.setData({ showMoodPicker: true }); },
  hideMoodPicker() { this.setData({ showMoodPicker: false }); },
  selectMood(e) {
    const value = parseInt(e.currentTarget.dataset.value);
    this.setData({
      selectedMood: { value, label: this.getMoodLabel(value), emoji: this.getMoodEmoji(value) },
      showMoodPicker: false
    });
  },
  getMoodLabel(value) {
    const item = this.data.moodLevels.find(i => i.value === value);
    return item ? item.label : '未记录';
  },
  getMoodEmoji(value) {
    const item = this.data.moodLevels.find(i => i.value === value);
    return item ? item.icon : '😌';
  },

  // ===== 更多记录 =====
  toggleMoreRecords() {
    this.setData({ showMoreRecords: !this.data.showMoreRecords });
  },
  toggleCold(e) { this.setData({ hasCold: e.detail.value }); },
  toggleInjury(e) { this.setData({ hasInjury: e.detail.value }); },
  inputMedication(e) { this.setData({ medication: e.detail.value }); },
  toggleSupplement(e) {
    const supp = e.currentTarget.dataset.supp;
    let list = [...this.data.supplements];
    if (list.includes(supp)) {
      list = list.filter(s => s !== supp);
    } else {
      list.push(supp);
    }
    this.setData({ supplements: list });
  },

  // ===== 拍照 =====
  takePhoto() {
    const that = this;
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success(res) {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        wx.chooseImage({
          count: 1,
          sourceType,
          success(res) {
            const tempPath = res.tempFilePaths[0];
            util.showToast('照片已保存');
            that.setData({ lastPhoto: tempPath });
          }
        });
      }
    });
  },

  // ===== 开始快速记录（无记录时点击） =====
  startQuickRecord() {
    this.setData({ showMoreRecords: true });
  },

  // ===== 保存记录 =====
  submitRecord() {
    const that = this;

    // 验证
    if (this.data.selectedItch.value === -1) {
      util.showToast('请选择瘙痒程度');
      return;
    }
    if (!this.data.areaValue) {
      util.showToast('请选择皮损面积变化');
      return;
    }
    if (this.data.selectedMood.value === -1) {
      util.showToast('请选择心情');
      return;
    }

    // 计算抗炎指数
    const itchScore = 5 - this.data.selectedItch.value;
    const areaScore = this.data.areaValue === 'decrease' ? 5 : this.data.areaValue === 'stable' ? 3 : 1;
    const dietScore = this.data.dietSuccess ? 5 : 1;
    const moodScore = this.data.selectedMood.value + 1;
    const totalScore = Math.round((itchScore + areaScore + dietScore + moodScore) / 20 * 100);

    const today = util.formatDate();
    const record = {
      date: today,
      itch: this.data.selectedItch.value,
      area: this.data.areaValue,
      diet: this.data.dietSuccess,
      mood: this.data.selectedMood.value,
      hasCold: this.data.hasCold,
      hasInjury: this.data.hasInjury,
      medication: this.data.medication,
      supplements: this.data.supplements,
      score: totalScore,
      photo: this.data.lastPhoto || '',
      timestamp: Date.now()
    };

    // 更新全局数据
    const userData = app.globalData.userData || {};
    let records = userData.records || [];
    const existingIndex = records.findIndex(r => r.date === today);
    
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    userData.recordDays = (userData.recordDays || 0) + (existingIndex >= 0 ? 0 : 1);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = util.formatDate(yesterday);
    const hadYesterday = records.some(r => r.date === yesterdayStr);
    userData.continuousRecordDays = hadYesterday ? (userData.continuousRecordDays || 0) + 1 : 1;

    userData.records = records;
    app.globalData.userData = userData;
    wx.setStorageSync('userData', userData);

    util.showToast(existingIndex >= 0 ? '✅ 记录已更新' : '✅ 记录成功', 'success');
    
    setTimeout(() => {
      that.loadData();
    }, 500);
  },

  // ===== 跳转历史记录 =====
  goHistory() {
    util.navigateTo('/pages/history/index');
  },

  // 阻止事件冒泡
  stopPropagation() {}
});
