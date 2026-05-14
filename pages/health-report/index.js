// 健康报告页面
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    loading: false,
    reportGenerated: false,
    period: 'month',
    records: [],
    habitCheckIns: [],
    supplementConfigs: [],
    reportData: {}
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const userData = app.globalData.userData || {};
    this.setData({
      records: userData.records || [],
      habitCheckIns: userData.habitCheckIns || [],
      supplementConfigs: userData.supplementConfigs || []
    });
    this.generateReport();
  },

  // 切换周期
  switchPeriod(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({ period });
    this.generateReport();
  },

  // 获取报告期内的记录
  getPeriodRecords() {
    const { records, period } = this.data;
    const now = new Date();
    let startDate = new Date('2020-01-01');

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    const startStr = util.formatDate(startDate);
    return records.filter(r => r.date >= startStr);
  },

  // 生成报告数据
  generateReport() {
    const periodRecords = this.getPeriodRecords();
    const { habitCheckIns, supplementConfigs } = this.data;

    if (periodRecords.length === 0) {
      this.setData({ reportGenerated: false, reportData: {} });
      return;
    }

    const totalDays = periodRecords.length;

    // 抗炎指数
    const scores = periodRecords.map(r => r.score || 0);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : 0;

    // 瘙痒趋势
    const itchValues = periodRecords.map(r => r.itch !== undefined ? r.itch : 2);
    const firstHalfItch = itchValues.slice(0, Math.floor(itchValues.length / 2));
    const secondHalfItch = itchValues.slice(Math.floor(itchValues.length / 2));
    const avgFirst = firstHalfItch.reduce((a, b) => a + b, 0) / (firstHalfItch.length || 1);
    const avgSecond = secondHalfItch.reduce((a, b) => a + b, 0) / (secondHalfItch.length || 1);

    let itchTrend = 'stable';
    if (avgSecond < avgFirst - 0.3) itchTrend = 'improving';
    else if (avgSecond > avgFirst + 0.3) itchTrend = 'worsening';

    // 瘙痒图表数据（取最近10条）
    const itchData = periodRecords.slice(-10).map(r => ({
      value: r.itch !== undefined ? r.itch : 2,
      shortDate: r.date ? r.date.slice(5) : '',
      date: r.date
    }));

    // 皮损变化
    const improveDays = periodRecords.filter(r => r.area === 'decrease').length;
    const stableDays = periodRecords.filter(r => r.area === 'stable').length;
    const worsenDays = periodRecords.filter(r => r.area === 'increase').length;

    // 饮食合规率
    const dietRecords = periodRecords.filter(r => r.diet !== undefined);
    const dietRate = dietRecords.length > 0
      ? Math.round(dietRecords.filter(r => r.diet).length / dietRecords.length * 100)
      : 0;

    // 心情趋势
    const moodValues = periodRecords.filter(r => r.mood !== undefined).map(r => r.mood);
    const firstHalfMood = moodValues.slice(0, Math.floor(moodValues.length / 2));
    const secondHalfMood = moodValues.slice(Math.floor(moodValues.length / 2));
    const avgMoodFirst = firstHalfMood.reduce((a, b) => a + b, 0) / (firstHalfMood.length || 1);
    const avgMoodSecond = secondHalfMood.reduce((a, b) => a + b, 0) / (secondHalfMood.length || 1);

    let moodTrend = 'stable';
    if (avgMoodSecond > avgMoodFirst + 0.3) moodTrend = 'improving';
    else if (avgMoodSecond < avgMoodFirst - 0.3) moodTrend = 'worsening';

    // 心情图表数据
    const moodEmojis = ['😞', '😔', '😐', '😊', '🥰'];
    const moodData = periodRecords.filter(r => r.mood !== undefined).slice(-10).map(r => ({
      value: r.mood,
      emoji: moodEmojis[r.mood] || '😐',
      shortDate: r.date ? r.date.slice(5) : '',
      date: r.date
    }));

    // 感染预警
    const infectionDays = periodRecords.filter(r => r.hasCold).length;

    // 润肤打卡统计
    const checkInDays = habitCheckIns.filter(c => {
      const inPeriod = periodRecords.some(r => r.date === c.date);
      const sc = c.skincare || {};
      return inPeriod && (sc.morning || sc.evening);
    }).length;
    const continuousCheckInDays = util.calcContinuousCheckInDays(habitCheckIns);
    const checkInRate = totalDays > 0 ? Math.round(checkInDays / totalDays * 100) : 0;

    // ===== 新增：补剂依从性统计 =====
    const enabledSupps = supplementConfigs.filter(s => s.enabled);
    const suppResult = util.calcSupplementsRate(habitCheckIns, supplementConfigs, periodRecords);
    
    // 统计每种补剂的打卡率
    const suppDetailData = enabledSupps.map(s => {
      let takenDays = 0;
      periodRecords.forEach(r => {
        const record = habitCheckIns.find(c => c.date === r.date);
        if (record && (record.supplements || []).some(t => t.suppId === s.id)) {
          takenDays++;
        }
      });
      return {
        name: s.name,
        icon: s.icon || '💊',
        takenDays,
        totalDays: periodRecords.length,
        rate: periodRecords.length > 0 ? Math.round(takenDays / periodRecords.length * 100) : 0
      };
    });

    this.setData({
      reportGenerated: true,
      reportData: {
        totalDays,
        averageScore,
        itchTrend,
        itchChartData: itchData,
        improveDays,
        stableDays,
        worsenDays,
        dietRate,
        moodTrend,
        moodChartData: moodData,
        infectionDays,
        checkInDays,
        continuousCheckInDays,
        checkInRate,
        // 新增：补剂数据
        suppRate: suppResult.rate,
        suppDetailData,
        enabledSuppCount: enabledSupps.length
      }
    });
  },

  // ===== 生成PDF =====
  generatePDF() {
    const that = this;
    util.showLoading('正在生成PDF...');
    this.setData({ loading: true });

    // 获取完整用户数据
    const userData = app.globalData.userData || {};
    const records = this.getPeriodRecords();
    const { habitCheckIns } = this.data;
    const today = util.formatDate();
    const periodLabel = this.data.period === 'month' ? '本月' : this.data.period === 'quarter' ? '近3个月' : '全部';

    // 调用云函数生成PDF
    wx.cloud.callFunction({
      name: 'generateReport',
      data: {
        nickname: userData.nickname || '银屑斗士',
        date: today,
        period: periodLabel,
        reportData: this.data.reportData,
        records: records,
        habitCheckIns: habitCheckIns
      },
      success(res) {
        util.hideLoading();
        that.setData({ loading: false });
        
        if (res.result && res.result.fileID) {
          // 打开PDF文件
          wx.showActionSheet({
            itemList: ['预览报告', '保存到手机'],
            success(action) {
              if (action.tapIndex === 0) {
                wx.openDocument({
                  filePath: res.result.fileID,
                  fileType: 'pdf',
                  success() {
                    console.log('PDF预览成功');
                  },
                  fail(err) {
                    that.downloadPDF(res.result.fileID);
                  }
                });
              } else {
                that.downloadPDF(res.result.fileID);
              }
            },
            fail() {
              that.downloadPDF(res.result.fileID);
            }
          });
        } else {
          util.showToast(res.result.error || '生成失败，请重试');
        }
      },
      fail(err) {
        util.hideLoading();
        that.setData({ loading: false });
        console.error('PDF生成失败:', err);
        
        // 降级：用本地方式生成简单报告
        util.showModal('生成提示', '云函数暂不可用，是否生成本地文字版报告？')
          .then(confirm => {
            if (confirm) {
              that.generateLocalReport();
            }
          });
      }
    });
  },

  // 下载PDF文件
  downloadPDF(fileID) {
    util.showLoading('正在下载...');
    wx.cloud.downloadFile({
      fileID: fileID,
      success(res) {
        util.hideLoading();
        if (res.tempFilePath) {
          wx.saveFile({
            tempFilePath: res.tempFilePath,
            success() {
              util.showToast('✅ 报告已保存到本地');
            },
            fail() {
              util.showToast('保存失败，请重试');
            }
          });
        }
      },
      fail() {
        util.hideLoading();
        util.showToast('下载失败');
      }
    });
  },

  // 本地文字版报告（云函数不可用时的降级方案）
  generateLocalReport() {
    const { reportData } = this.data;
    const lines = [
      '📊 银屑助手 - 健康报告',
      `生成日期：${util.formatDate()}`,
      `报告周期：${this.data.period === 'month' ? '本月' : this.data.period === 'quarter' ? '近3个月' : '全部'}`,
      '',
      `📋 记录天数：${reportData.totalDays} 天`,
      `📈 平均抗炎指数：${reportData.averageScore}`,
      `😊 瘙痒趋势：${reportData.itchTrend === 'improving' ? '改善 ↑' : reportData.itchTrend === 'worsening' ? '加重 ↓' : '稳定 →'}`,
      `✅ 皮损好转天数：${reportData.improveDays} 天`,
      `🍽️ 饮食合规率：${reportData.dietRate}%`,
      `😌 心情趋势：${reportData.moodTrend === 'improving' ? '变好 ↑' : reportData.moodTrend === 'worsening' ? '变差 ↓' : '稳定 →'}`,
      `🧴 润肤打卡率：${reportData.checkInRate}%`,
      `💊 补剂依从率：${reportData.suppRate}%${reportData.enabledSuppCount > 0 ? '（' + reportData.enabledSuppCount + '种补剂）' : ''}`,
      reportData.infectionDays > 0 ? `⚠️ 感染预警：报告期内有 ${reportData.infectionDays} 天咽痛/感冒` : '',
      '',
      '📌 免责声明：本报告基于自记录数据生成，仅供参考，',
      '    不能替代医生的专业诊断和建议。',
      '—— 银屑助手 · 你的温和陪伴者'
    ];

    const content = lines.filter(l => l !== '').join('\n');

    wx.showModal({
      title: '📊 健康报告（文字版）',
      content: content,
      confirmText: '复制内容',
      success(res) {
        if (res.confirm) {
          wx.setClipboardData({
            data: content,
            success() {
              util.showToast('✅ 已复制到剪贴板');
            }
          });
        }
      }
    });
  },

  // 跳转到记录页
  goRecord() {
    util.switchTab('/pages/record/index');
  }
});
