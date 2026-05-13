// 我的 - 个人中心
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    nickname: '银屑斗士',
    avatarUrl: '',
    accompanyDays: 1,
    // 综合习惯打卡状态
    checkInToday: false,
    checkInStreak: 0,
    suppRate: 0,
    // 勋章
    badges: {
      hasRecord7: false,
      hasDietSurvey: false,
      hasMoodDiary: false,
      hasPhoto: false,
      hasCheckIn7: false,
      hasSuppCheckIn: false
    },
    shopItems: [
      { id: 1, emoji: '🧴', name: '无香润肤霜', desc: '温和保湿，适合敏感肌日常使用', url: 'https://example.com/shop1' },
      { id: 2, emoji: '🐟', name: '高纯度鱼油', desc: 'Omega-3 浓缩营养，辅助抗炎', url: 'https://example.com/shop2' },
      { id: 3, emoji: '☀️', name: '维生素D3', desc: '免疫调节基础营养', url: 'https://example.com/shop3' }
    ]
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  loadUserData() {
    const userData = app.globalData.userData || {};
    const badges = this.calcBadges(userData);
    const habitCheckIns = userData.habitCheckIns || [];
    const todayStatus = util.getTodayHabitCheckIn(habitCheckIns);
    const suppConfigs = userData.supplementConfigs || [];
    
    this.setData({
      nickname: userData.nickname || '银屑斗士',
      avatarUrl: userData.avatarUrl || '',
      accompanyDays: app.getAccompanyDays(),
      badges,
      checkInToday: todayStatus.skincare.morning || todayStatus.skincare.evening || todayStatus.supplements.length > 0,
      checkInStreak: util.calcContinuousCheckInDays(habitCheckIns),
      suppRate: util.calcTodaySupplementsRate(habitCheckIns, suppConfigs)
    });
  },

  calcBadges(userData) {
    const records = userData.records || [];
    const habitCheckIns = userData.habitCheckIns || [];
    const uniqueDays = new Set(records.map(r => r.date));
    const checkInDays = habitCheckIns.filter(c => {
      const sc = c.skincare || {};
      return sc.morning || sc.evening;
    }).length;
    
    // 补剂打卡天数
    const suppDays = habitCheckIns.filter(c => (c.supplements || []).length > 0).length;

    return {
      hasRecord7: uniqueDays.size >= 7,
      hasDietSurvey: !!userData.dietSurveyCompleted,
      hasMoodDiary: (userData.moodDiary || []).length > 0,
      hasPhoto: records.some(r => r.photo),
      hasCheckIn7: checkInDays >= 7,
      hasSuppCheckIn: suppDays >= 3
    };
  },

  editProfile() {
    wx.showModal({
      title: '修改昵称',
      content: '',
      placeholderText: '请输入你的昵称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim();
          app.updateUserData('nickname', name);
          this.setData({ nickname: name });
          util.showToast('昵称已更新');
        }
      }
    });
  },

  // 跳转健康报告页
  goHealthReport() {
    util.navigateTo('/pages/health-report/index');
  },

  // 跳转综合习惯打卡页
  goCheckIn() {
    util.navigateTo('/pages/skincare-checkin/index');
  },

  goMedicalMemo() {
    util.showModal('就医备忘', '就诊时记得问医生这5个问题：\n\n1. 我现在处于什么阶段？\n2. 目前的治疗方案是否需要调整？\n3. 是否有更适合我的新药？\n4. 我需要做哪些检查来监测病情？\n5. 日常生活中我需要注意什么？')
      .then(confirm => {
        if (confirm) {
          wx.setClipboardData({
            data: '银屑病就诊提问清单：\n1. 我现在处于什么阶段？\n2. 治疗方案是否需要调整？\n3. 是否有更适合我的新药？\n4. 需要做哪些检查？\n5. 日常生活中需要注意什么？',
            success: () => util.showToast('✅ 已复制到剪贴板')
          });
        }
      });
  },

  goFavorites() {
    const userData = app.globalData.userData || {};
    const favorites = userData.favorites || [];
    if (favorites.length === 0) {
      util.showToast('还没有收藏内容，去百科看看吧');
      return;
    }
    util.showToast('功能开发中，敬请期待...');
  },

  goFeedback() {
    wx.showModal({
      title: '意见反馈',
      placeholderText: '请输入你的建议或问题...',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          // 可以接入云函数保存反馈
          util.showToast('感谢你的反馈 🙏');
        }
      }
    });
  },

  joinCommunity() {
    util.showToast('请添加管理员微信加入社群');
  },

  goShop(e) {
    const url = e.currentTarget.dataset.url;
    wx.showModal({
      title: '前往购买',
      content: '即将跳转到外部商品页面',
      success: (res) => {
        if (res.confirm && url) {
          wx.setClipboardData({
            data: url,
            success: () => {
              util.showToast('链接已复制，请打开浏览器访问');
            }
          });
        }
      }
    });
  }
});
