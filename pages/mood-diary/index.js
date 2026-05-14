// 心情日记
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    todayDate: '',
    weekDay: '',
    selectedMood: '',
    diaryContent: '',
    diaryList: [],
    editingDiaryId: null
  },

  onLoad() {
    const now = new Date();
    this.setData({
      todayDate: util.formatDate(now),
      weekDay: util.getWeekDay(now)
    });
    this.loadDiaries();
  },

  onShow() {
    this.loadDiaries();
  },

  loadDiaries() {
    const userData = app.globalData.userData || {};
    const diaryList = (userData.moodDiary || []).sort((a, b) => b.date.localeCompare(a.date));
    this.setData({ diaryList });
  },

  selectMood(e) {
    const mood = e.currentTarget.dataset.mood;
    this.setData({ selectedMood: mood });
  },

  inputDiary(e) {
    this.setData({ diaryContent: e.detail.value });
  },

  saveDiary() {
    if (!this.data.selectedMood) {
      util.showToast('请选择今天的心情');
      return;
    }
    if (!this.data.diaryContent.trim()) {
      util.showToast('请写下一些内容');
      return;
    }

    const userData = app.globalData.userData || {};
    let diaries = userData.moodDiary || [];
    
    const moodIcons = { sunny: '☀️', cloudy: '⛅', rainy: '🌧️', storm: '⛈️', rainbow: '🌈' };
    const moodIcon = moodIcons[this.data.selectedMood] || '☀️';

    if (this.data.editingDiaryId) {
      // 更新已有日记
      diaries = diaries.map(d => d.id === this.data.editingDiaryId ? {
        ...d,
        mood: moodIcon,
        moodType: this.data.selectedMood,
        content: this.data.diaryContent,
        updatedAt: Date.now()
      } : d);
    } else {
      // 新增日记
      diaries.push({
        id: Date.now().toString(),
        date: this.data.todayDate,
        mood: moodIcon,
        moodType: this.data.selectedMood,
        content: this.data.diaryContent,
        createdAt: Date.now()
      });
    }

    app.updateUserData('moodDiary', diaries);
    
    // 更新徽章
    const badges = userData.badges || [];
    if (!badges.includes('mood')) {
      badges.push('mood');
      app.updateUserData('badges', badges);
    }

    util.showToast(this.data.editingDiaryId ? '✅ 已更新' : '✅ 已保存', 'success');
    
    // 重置
    this.setData({
      selectedMood: '',
      diaryContent: '',
      editingDiaryId: null
    });
    this.loadDiaries();
  },

  editDiary(e) {
    const id = e.currentTarget.dataset.id;
    const diary = this.data.diaryList.find(d => d.id === id);
    if (diary) {
      this.setData({
        selectedMood: diary.moodType,
        diaryContent: diary.content,
        editingDiaryId: id
      });
      wx.pageScrollTo({ scrollTop: 0 });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
