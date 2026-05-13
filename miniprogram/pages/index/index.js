// 百科首页
const app = getApp();
const dataModule = require('../../utils/data');
const util = require('../../utils/util');

Page({
  data: {
    // 搜索
    searchKeyword: '',
    
    // 饮食Tab
    activeDietTab: 'avoid',
    
    // 分类
    activeCategory: '全部',
    
    // 文章列表
    allArticles: dataModule.articles,
    filteredArticles: dataModule.articles,
    
    // 饮食数据
    avoidFoods: dataModule.avoidFoods,
    recommendFoods: dataModule.recommendFoods,
    
    // 用户数据
    userData: {},
    dietAdvice: null
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  loadUserData() {
    const userData = app.globalData.userData || {};
    const dietAdvice = userData.dietAdvice || null;
    this.setData({
      userData,
      dietAdvice
    });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  onSearch(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    if (!keyword) {
      this.setData({ filteredArticles: this.data.allArticles });
      return;
    }
    
    const filtered = this.data.allArticles.filter(item => 
      item.title.toLowerCase().includes(keyword) || 
      item.summary.toLowerCase().includes(keyword)
    );
    
    this.setData({ filteredArticles: filtered });
    
    if (filtered.length === 0) {
      util.showToast('未找到相关内容，试试其他关键词');
    }
  },

  // 跳转药品认知专题页
  goDrugKnowledge() {
    util.navigateTo('/pages/drug/index');
  },

  // 跳转知识详情
  goKnowledgeDetail(e) {
    const id = e.currentTarget.dataset.id;
    const articles = [
      {
        id: 1,
        title: '消字号 vs 国药准字',
        content: '🔬 消字号与国药准字的本质区别\n\n【国药准字】\n代表该药品经过国家药品监督管理局（NMPA）严格审批，通过了临床试验验证，有明确的有效成分、适应症、用法用量和不良反应信息。审批周期通常2-5年。\n\n【消字号】\n属于卫生消毒用品的批号，仅需备案即可上市，审批门槛极低。消字号产品只能标注"消毒杀菌"功能，绝不能宣称对任何疾病有治疗效果。\n\n⚠️ 风险：\n一些不良商家利用消字号审批快的漏洞，在产品中违规添加激素，却宣称"纯天然""无激素"。消费者使用了这类产品可能出现：\n- 激素依赖性皮炎\n- 皮肤萎缩变薄\n- 毛细血管扩张（红血丝）\n- 停药后反跳加重\n\n✅ 建议：\n购买皮肤用药时，先看包装上的批号。凡标注"消字号"却宣称治疗皮肤病的产品，一律保持警惕。'
      },
      {
        id: 2,
        title: '读懂激素分级表',
        content: '📊 外用糖皮质激素强度分级\n\n激素并非"洪水猛兽"，合理使用是银屑病治疗的重要手段。但不同强度的激素适合不同部位和皮损类型：\n\n【4级 - 超强效】\n代表药物：氯倍他索丙酸酯 0.05%\n使用：短期用于手足等角化厚的部位，不超过2周\n风险：不可用于面部、颈部、褶皱处\n\n【3级 - 强效】\n代表药物：糠酸莫米松、哈西奈德\n使用：躯干四肢中重度皮损\n风险：连续使用不宜超过4周\n\n【2级 - 中效】\n代表药物：丁酸氢化可的松 0.1%\n使用：轻度至中度皮损\n风险：相对安全，可用于短期维持\n\n【1级 - 弱效】\n代表药物：氢化可的松 0.5%-2.5%\n使用：面部、褶皱处、婴幼儿\n风险：低，适合短期使用\n\n💡 关键原则：\n• 面部、腋下、腹股沟等薄嫩部位，只能用弱效或中效\n• 儿童用量减半，优先选择弱效\n• 不要突然停用激素，需逐步减量\n• 长期使用建议"间歇疗法"（周末停药或减量）'
      },
      {
        id: 3,
        title: '"纯植物一抹就好"的真相',
        content: '🌿 那些号称"纯植物"的真相\n\n在银屑病患者的社群和电商平台上，经常能看到这样的广告：\n\n"纯草本提取，不含激素，一抹就好！"\n"祖传秘方，纯中药成分，根治牛皮癣！"\n\n🔍 真相是什么？\n\n1. 监管部门多次抽检发现：市面上宣称"纯植物"的消字号皮肤产品中，超过60%被检出含有违禁添加的糖皮质激素。\n\n2. 为什么"一抹就好"？\n   — 因为加了强效激素（如氯倍他索）\n   — 激素快速压制炎症，短期内看起来"好了"\n   — 但停药后往往出现剧烈反弹，比之前更严重\n\n3. 真正的纯植物产品：\n   — 不可能"一抹就好"\n   — 通常起效缓慢\n   — 需要长期坚持使用\n\n4. 如何识别陷阱：\n   ✅ 看批号：国药准字 > 消字号\n   ✅ 看成分表：标注清楚的成分比"秘方"可靠\n   ✅ 看品牌：选择正规药企产品\n   ✅ 看渠道：通过医院或正规药店购买\n\n⚠️ 记住：银屑病目前没有"根治"的神药，任何宣称"根治""断根"的产品都是骗局。规范治疗、科学管理是唯一正确的道路。'
      }
    ];
    
    const article = articles.find(a => a.id === id);
    if (article) {
      // 存入全局用于详情页显示
      app.globalData.currentArticle = article;
      util.navigateTo('/pages/article/index');
    }
  },

  // 切换饮食Tab
  switchDietTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeDietTab: tab });
  },

  // 跳转饮食问卷
  goDietQuestionnaire() {
    util.navigateTo('/pages/diet-questionnaire/index');
  },

  // 切换分类
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    let filtered = this.data.allArticles;
    
    if (cat !== '全部') {
      filtered = this.data.allArticles.filter(item => item.category === cat);
    }
    
    this.setData({
      activeCategory: cat,
      filteredArticles: filtered
    });
  },

  // 跳转文章详情
  goArticleDetail(e) {
    const id = e.currentTarget.dataset.id;
    const article = this.data.allArticles.find(a => a.id === id);
    if (article) {
      app.globalData.currentArticle = article;
      util.navigateTo('/pages/article/index');
    }
  }
});
