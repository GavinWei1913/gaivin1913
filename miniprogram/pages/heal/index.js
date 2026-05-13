// 疗愈页 - 心理陪伴与情绪舒缓
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    chatRemaining: 0,
    playingId: null,
    audioList: [
      { id: 1, icon: '🧘', title: '助眠冥想', desc: '引导式冥想，帮助你安然入睡', duration: '15:00' },
      { id: 2, icon: '🌊', title: '焦虑舒缓', desc: '缓解焦虑情绪，找回内心平静', duration: '12:00' },
      { id: 3, icon: '💆', title: '疼痛安抚', desc: '正念身体扫描，与不适感共处', duration: '20:00' },
      { id: 4, icon: '🌅', title: '晨间能量', desc: '开启积极一天的冥想练习', duration: '8:00' }
    ]
  },

  onLoad() {
    this.updateChatRemaining();
  },

  onShow() {
    this.updateChatRemaining();
  },

  updateChatRemaining() {
    const remaining = app.getTodayChatLimit();
    this.setData({ chatRemaining: remaining });
  },

  // 跳转AI对话
  goAIChat() {
    if (this.data.chatRemaining <= 0) {
      util.showToast('今日对话次数已用完，明天再来吧');
      return;
    }
    util.navigateTo('/pages/ai-chat/index');
  },

  // 跳转呼吸练习
  goBreathe() {
    util.navigateTo('/pages/breathe/index');
  },

  // 播放音频（模拟）
  playAudio(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.playingId === id) {
      this.setData({ playingId: null });
      util.showToast('已暂停');
    } else {
      this.setData({ playingId: id });
      util.showToast('正在播放...');
    }
  },

  // 跳转心情日记
  goMoodDiary() {
    util.navigateTo('/pages/mood-diary/index');
  }
});
