// 个性化饮食问卷
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    currentStep: 0,
    totalSteps: 5,
    answers: {},
    showResult: false,
    result: null,

    questions: [
      {
        key: 'stage',
        title: '当前处于什么阶段？',
        type: 'single',
        options: [
          { value: 'stable', label: '稳定期（皮损轻微或无）' },
          { value: 'progressing', label: '进展期（有新发皮损）' },
          { value: 'flare', label: '爆发期（皮损大面积增多）' }
        ]
      },
      {
        key: 'hasArthritis',
        title: '是否有银屑病关节炎（关节肿痛）？',
        type: 'single',
        options: [
          { value: 'yes', label: '有' },
          { value: 'no', label: '没有' },
          { value: 'unsure', label: '不确定' }
        ]
      },
      {
        key: 'allergies',
        title: '你是否已知对以下食物过敏或不耐受？（可多选）',
        type: 'multi',
        options: [
          { value: 'gluten', label: '麸质（小麦、大麦等）' },
          { value: 'dairy', label: '乳制品（牛奶、奶酪）' },
          { value: 'nightshade', label: '茄科蔬菜（番茄、茄子、辣椒）' },
          { value: 'none', label: '以上都没有或不确定' }
        ]
      },
      {
        key: 'bowel',
        title: '近期的排便情况如何？',
        type: 'single',
        options: [
          { value: 'normal', label: '正常' },
          { value: 'constipation', label: '便秘' },
          { value: 'diarrhea', label: '腹泻' },
          { value: 'alternating', label: '交替（时好时坏）' }
        ]
      },
      {
        key: 'stress',
        title: '近期是否感觉压力较大？',
        type: 'single',
        options: [
          { value: 'yes', label: '是，压力较大' },
          { value: 'no', label: '还好，压力不大' }
        ]
      }
    ]
  },

  getQuestionKey(step) {
    const q = this.data.questions[step - 1];
    return q ? q.key : '';
  },

  get currentQuestion() {
    return this.data.questions[this.data.currentStep - 1];
  },

  startQuestionnaire() {
    this.setData({
      currentStep: 1,
      answers: {}
    });
  },

  selectOption(e) {
    const value = e.currentTarget.dataset.value;
    const key = this.getQuestionKey(this.data.currentStep);
    this.setData({
      [`answers.${key}`]: value
    });
  },

  toggleMultiOption(e) {
    const value = e.currentTarget.dataset.value;
    const key = this.getQuestionKey(this.data.currentStep);
    const current = this.data.answers[key] || [];
    
    let newVal;
    if (value === 'none') {
      newVal = ['none'];
    } else {
      newVal = current.includes('none') ? [value] : [...current];
      if (newVal.includes(value)) {
        newVal = newVal.filter(v => v !== value);
      } else {
        newVal.push(value);
      }
    }
    this.setData({
      [`answers.${key}`]: newVal
    });
  },

  nextStep() {
    const step = this.data.currentStep;
    const key = this.getQuestionKey(step);
    const answer = this.data.answers[key];

    // 验证当前问题是否已答
    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      util.showToast('请先回答当前问题');
      return;
    }

    if (step < this.data.totalSteps) {
      this.setData({ currentStep: step + 1 });
    } else {
      // 生成结果
      this.generateResult();
    }
  },

  generateResult() {
    const result = util.dietEngine(this.data.answers);
    this.setData({
      showResult: true,
      result
    });
  },

  saveAndBack() {
    // 保存到用户数据
    app.updateUserData('dietSurveyCompleted', true);
    app.updateUserData('dietAdvice', this.data.result);
    
    // 更新徽章
    const userData = app.globalData.userData || {};
    const badges = userData.badges || [];
    if (!badges.includes('diet')) {
      badges.push('diet');
      app.updateUserData('badges', badges);
    }

    util.showToast('✅ 饮食方案已保存', 'success');
    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  },

  restartQuestionnaire() {
    this.setData({
      currentStep: 0,
      answers: {},
      showResult: false,
      result: null
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
