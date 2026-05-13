/**
 * 工具函数集
 */

const formatDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTime = (date = new Date()) => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const formatDateTime = (date = new Date()) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

const getWeekDay = (date = new Date()) => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `星期${days[date.getDay()]}`;
};

const getMonthDays = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1).getDay();
};

const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

const throttle = (fn, delay = 300) => {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
};

const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({ title, icon, duration });
};

const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true });
};

const hideLoading = () => {
  wx.hideLoading();
};

const showModal = (title, content, confirmText = '确定', cancelText = '取消') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success(res) {
        resolve(res.confirm);
      }
    });
  });
};

const navigateTo = (url) => {
  wx.navigateTo({ url });
};

const navigateBack = (delta = 1) => {
  wx.navigateBack({ delta });
};

const switchTab = (url) => {
  wx.switchTab({ url });
};

// 本地存储封装
const storage = {
  get(key) {
    return wx.getStorageSync(key);
  },
  set(key, value) {
    wx.setStorageSync(key, value);
  },
  remove(key) {
    wx.removeStorageSync(key);
  },
  clear() {
    wx.clearStorageSync();
  }
};

// PASI 简化评分
const calcPASI = (area, redness, thickness, scaling) => {
  const areaScore = parseInt(area) || 0;
  const rednessScore = parseInt(redness) || 0;
  const thicknessScore = parseInt(thickness) || 0;
  const scalingScore = parseInt(scaling) || 0;
  return (rednessScore + thicknessScore + scalingScore) * areaScore;
};

// 饮食规则引擎
const dietEngine = (answers) => {
  const eatMore = [];
  const avoid = [];
  
  eatMore.push('三文鱼、沙丁鱼等深海鱼（富含Omega-3）');
  eatMore.push('菠菜、羽衣甘蓝等深色绿叶蔬菜');
  eatMore.push('蓝莓、草莓等浆果类（抗氧化）');
  eatMore.push('姜黄（天然抗炎成分）');
  eatMore.push('橄榄油（优质脂肪）');
  
  avoid.push('酒精（可能诱发炎症反应）');
  avoid.push('辛辣食物（辣椒、花椒等）');
  avoid.push('高糖食物及甜点');
  avoid.push('加工肉制品（香肠、培根等）');
  
  if (answers.stage === 'progressing' || answers.stage === 'flare') {
    avoid.push('红肉（牛肉、羊肉等，建议减少摄入）');
    eatMore.push('富含维生素D的食物（蛋黄、蘑菇）');
  }
  
  if (answers.hasArthritis === 'yes') {
    eatMore.push('富含钙质的食物（豆腐、芝麻）');
    avoid.push('高嘌呤食物（动物内脏、浓汤）');
  }
  
  if (answers.allergies && answers.allergies.length > 0) {
    if (answers.allergies.includes('gluten')) avoid.push('麸质食物（小麦、大麦等）');
    if (answers.allergies.includes('dairy')) avoid.push('乳制品（牛奶、奶酪等）');
    if (answers.allergies.includes('nightshade')) avoid.push('茄科蔬菜（番茄、茄子、辣椒）');
  }
  
  if (answers.bowel === 'constipation') {
    eatMore.push('高纤维食物（燕麦、奇亚籽、亚麻籽）');
    eatMore.push('益生菌发酵食品（无糖酸奶、泡菜）');
  } else if (answers.bowel === 'diarrhea') {
    avoid.push('生冷食物');
    eatMore.push('易消化的熟食（南瓜粥、山药）');
  }
  
  if (answers.stress === 'yes') {
    eatMore.push('富含镁的食物（南瓜籽、杏仁、黑巧克力）');
    eatMore.push('富含B族维生素的食物（全谷物、鸡蛋）');
  }
  
  return {
    eatMore: [...new Set(eatMore)],
    avoid: [...new Set(avoid)],
    disclaimer: '本建议基于排除法模型，食物不耐受存在个体差异，可尝试后观察记录。'
  };
};

// 心情天气图标映射
const moodIcons = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  storm: '⛈️',
  rainbow: '🌈'
};

// 瘙痒等级
const itchLevels = [
  { value: 0, label: '无瘙痒', icon: '😊' },
  { value: 1, label: '轻微', icon: '🙂' },
  { value: 2, label: '中度', icon: '😐' },
  { value: 3, label: '较重', icon: '😣' },
  { value: 4, label: '严重', icon: '😫' }
];

// ===== 综合习惯打卡（润肤 + 补剂）工具函数 =====

/**
 * 获取今日打卡记录
 * @param {Array} habitCheckIns
 * @returns {object} { skincare: { morning, evening }, supplements: [] }
 */
const getTodayHabitCheckIn = (habitCheckIns = []) => {
  const today = formatDate();
  const todayRecord = habitCheckIns.find(c => c.date === today);
  if (!todayRecord) {
    return {
      skincare: { morning: false, evening: false, morningTime: '', eveningTime: '' },
      supplements: []
    };
  }
  const sc = todayRecord.skincare || {};
  return {
    skincare: {
      morning: !!sc.morning,
      evening: !!sc.evening,
      morningTime: sc.morning ? formatTime(new Date(sc.morning)) : '',
      eveningTime: sc.evening ? formatTime(new Date(sc.evening)) : ''
    },
    supplements: todayRecord.supplements || []
  };
};

/**
 * 计算连续打卡天数（润肤早晚任一即可）
 */
const calcContinuousCheckInDays = (habitCheckIns = []) => {
  let days = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const record = habitCheckIns.find(c => c.date === dateStr);
    if (record) {
      const sc = record.skincare || {};
      if (sc.morning || sc.evening) {
        days++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return days;
};

/**
 * 计算总打卡天数（润肤）
 */
const calcTotalCheckInDays = (habitCheckIns = []) => {
  return habitCheckIns.filter(c => {
    const sc = c.skincare || {};
    return sc.morning || sc.evening;
  }).length;
};

/**
 * 计算本月打卡天数（润肤）
 */
const calcMonthCheckInDays = (habitCheckIns = []) => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return habitCheckIns.filter(c => {
    const sc = c.skincare || {};
    if (!sc.morning && !sc.evening) return false;
    const d = new Date(c.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
};

/**
 * 生成打卡月历数据
 */
const generateMonthCalendar = (habitCheckIns = [], year, month) => {
  const daysInMonth = getMonthDays(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = formatDate();
  const result = [];
  
  for (let i = 0; i < firstDay; i++) {
    result.push({ day: 0, morning: false, evening: false, isToday: false, isEmpty: true, suppCount: 0 });
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = habitCheckIns.find(c => c.date === dateStr);
    const sc = record ? (record.skincare || {}) : {};
    result.push({
      day: d,
      morning: !!sc.morning,
      evening: !!sc.evening,
      isToday: dateStr === today,
      isEmpty: false,
      suppCount: record ? (record.supplements || []).length : 0
    });
  }
  
  return result;
};

/**
 * 获取今日补剂打卡状态
 */
const getTodaySupplementsStatus = (habitCheckIns = [], supplementConfigs = []) => {
  const today = formatDate();
  const todayRecord = habitCheckIns.find(c => c.date === today);
  const takenSupps = todayRecord ? (todayRecord.supplements || []) : [];
  
  return supplementConfigs.filter(s => s.enabled).map(s => ({
    ...s,
    taken: takenSupps.some(t => t.suppId === s.id),
    takenTime: takenSupps.find(t => t.suppId === s.id)?.time || ''
  }));
};

/**
 * 计算今日补剂完成率
 */
const calcTodaySupplementsRate = (habitCheckIns = [], supplementConfigs = []) => {
  const enabledSupps = supplementConfigs.filter(s => s.enabled);
  if (enabledSupps.length === 0) return 100;
  
  const today = formatDate();
  const todayRecord = habitCheckIns.find(c => c.date === today);
  const takenCount = todayRecord ? (todayRecord.supplements || []).length : 0;
  
  return Math.round(takenCount / enabledSupps.length * 100);
};

/**
 * 计算补剂总完成率（一段时间内）
 */
const calcSupplementsRate = (habitCheckIns = [], supplementConfigs = [], periodRecords = []) => {
  const enabledCount = supplementConfigs.filter(s => s.enabled).length;
  if (enabledCount === 0 || periodRecords.length === 0) return { rate: 100, days: 0 };
  
  let totalTaken = 0;
  let totalPossible = 0;
  
  periodRecords.forEach(r => {
    const record = habitCheckIns.find(c => c.date === r.date);
    if (record) {
      totalTaken += (record.supplements || []).length;
      totalPossible += enabledCount;
    }
  });
  
  return {
    rate: totalPossible > 0 ? Math.round(totalTaken / totalPossible * 100) : 0,
    days: periodRecords.length
  };
};

/**
 * 检查当前时间是否需要补剂提醒
 */
const checkSupplementReminder = (reminderTimes = []) => {
  const now = formatTime();
  const currentMinutes = parseInt(now.split(':')[0]) * 60 + parseInt(now.split(':')[1]);
  
  for (const rt of reminderTimes) {
    if (!rt.enabled) continue;
    const [h, m] = rt.time.split(':').map(Number);
    const reminderMinutes = h * 60 + m;
    const diff = Math.abs(currentMinutes - reminderMinutes);
    if (diff <= 15) { // 15分钟内
      return rt;
    }
  }
  return null;
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  getWeekDay,
  getMonthDays,
  getFirstDayOfMonth,
  debounce,
  throttle,
  showToast,
  showLoading,
  hideLoading,
  showModal,
  navigateTo,
  navigateBack,
  switchTab,
  storage,
  calcPASI,
  dietEngine,
  moodIcons,
  itchLevels,
  // 综合习惯打卡工具函数
  getTodayHabitCheckIn,
  getTodaySupplementsStatus,
  calcTodaySupplementsRate,
  calcContinuousCheckInDays,
  calcTotalCheckInDays,
  calcMonthCheckInDays,
  calcSupplementsRate,
  generateMonthCalendar,
  checkSupplementReminder
};
