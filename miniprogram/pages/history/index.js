// 历史记录与趋势
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    year: 0,
    month: 0,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    emptyDays: 0,
    days: [],
    monthRecords: [],
    avgScore: 0,
    recordCount: 0,
    goodDays: 0,
    selectedDayDetail: null,
    allRecords: []
  },

  onLoad() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1
    });
    this.loadMonthData();
  },

  onShow() {
    this.loadMonthData();
  },

  loadMonthData() {
    const userData = app.globalData.userData || {};
    const allRecords = userData.records || [];
    const { year, month } = this.data;

    // 过滤当月记录
    const monthRecords = allRecords.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    }).sort((a, b) => b.date.localeCompare(a.date));

    // 生成日历
    const daysInMonth = util.getMonthDays(year, month);
    const firstDay = util.getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const record = allRecords.find(r => r.date === dateStr);
      
      let status = '';
      if (record) {
        if (record.score >= 60) status = 'good';
        else if (record.score >= 40) status = 'normal';
        else status = 'bad';
      }
      
      days.push({
        number: i,
        date: dateStr,
        hasRecord: !!record,
        status,
        record
      });
    }

    // 统计
    const scores = monthRecords.map(r => r.score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const goodDays = scores.filter(s => s >= 60).length;

    this.setData({
      emptyDays: firstDay,
      days,
      monthRecords,
      allRecords,
      avgScore,
      recordCount: monthRecords.length,
      goodDays,
      selectedDayDetail: null
    });
  },

  prevMonth() {
    let { year, month } = this.data;
    month--;
    if (month < 1) { month = 12; year--; }
    this.setData({ year, month });
    this.loadMonthData();
  },

  nextMonth() {
    let { year, month } = this.data;
    month++;
    if (month > 12) { month = 1; year++; }
    this.setData({ year, month });
    this.loadMonthData();
  },

  showDayDetail(e) {
    const date = e.currentTarget.dataset.date;
    const record = this.data.allRecords.find(r => r.date === date);
    
    if (!record) {
      this.setData({ selectedDayDetail: null });
      util.showToast('当天无记录');
      return;
    }

    const itchLevels = util.itchLevels;
    const itch = itchLevels.find(i => i.value === record.itch);
    const areaMap = { decrease: '减少（好转）', stable: '无变化', increase: '增加（加重）' };
    const moodMap = ['很差', '不好', '一般', '不错', '很棒'];

    this.setData({
      selectedDayDetail: {
        date: record.date,
        score: record.score,
        itchLabel: itch ? itch.label : '未记录',
        areaLabel: areaMap[record.area] || '未记录',
        dietLabel: record.diet ? '✅ 成功' : '❌ 有破戒',
        moodLabel: moodMap[record.mood] || '未记录'
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
