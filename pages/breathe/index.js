// 5分钟正念呼吸
const util = require('../../utils/util');

Page({
  data: {
    isBreathing: false,
    isInhale: true,
    guideText: '点击开始',
    elapsedSeconds: 0,
    formattedTime: '5:00',
    timer: null,
    
    // 呼吸周期参数（秒）
    inhaleDuration: 4,
    holdDuration: 2,
    exhaleDuration: 4,
    totalDuration: 300 // 5分钟
  },

  onUnload() {
    this.stopTimer();
  },

  toggleBreathe() {
    if (this.data.isBreathing) {
      this.stopTimer();
      this.setData({ isBreathing: false, guideText: '已暂停' });
    } else {
      this.startBreathe();
    }
  },

  startBreathe() {
    if (this.data.elapsedSeconds >= this.data.totalDuration) {
      this.resetBreathe();
      return;
    }

    this.setData({
      isBreathing: true,
      isInhale: true,
      guideText: '吸气...'
    });

    // 开始呼吸循环
    this.startBreathingCycle();

    // 启动计时器（每秒更新）
    this.data.timer = setInterval(() => {
      const remaining = this.data.totalDuration - this.data.elapsedSeconds - 1;
      if (remaining <= 0) {
        // 完成
        this.stopTimer();
        this.setData({
          elapsedSeconds: this.data.totalDuration,
          formattedTime: '0:00',
          isBreathing: false,
          guideText: '🎉 完成！'
        });
        wx.showToast({ title: '正念呼吸完成 🌿', icon: 'none', duration: 2000 });
        return;
      }

      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      this.setData({
        elapsedSeconds: this.data.elapsedSeconds + 1,
        formattedTime: `${mins}:${String(secs).padStart(2, '0')}`
      });
    }, 1000);
  },

  startBreathingCycle() {
    const cycleDuration = (this.data.inhaleDuration + this.data.holdDuration + this.data.exhaleDuration) * 1000;
    
    this.data.breathTimer = setInterval(() => {
      if (!this.data.isBreathing) {
        clearInterval(this.data.breathTimer);
        return;
      }

      // 吸气阶段
      this.setData({ isInhale: true, guideText: '吸气...' });
      
      setTimeout(() => {
        if (!this.data.isBreathing) return;
        // 屏息
        this.setData({ guideText: '屏息...' });
        
        setTimeout(() => {
          if (!this.data.isBreathing) return;
          // 呼气
          this.setData({ isInhale: false, guideText: '呼气...' });
        }, this.data.holdDuration * 1000);
      }, this.data.inhaleDuration * 1000);

    }, cycleDuration);
  },

  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.data.timer = null;
    }
    if (this.data.breathTimer) {
      clearInterval(this.data.breathTimer);
      this.data.breathTimer = null;
    }
  },

  resetBreathe() {
    this.stopTimer();
    this.setData({
      isBreathing: false,
      isInhale: true,
      guideText: '点击开始',
      elapsedSeconds: 0,
      formattedTime: '5:00'
    });
  },

  goBack() {
    this.stopTimer();
    wx.navigateBack();
  },

  stopPropagation() {}
});
