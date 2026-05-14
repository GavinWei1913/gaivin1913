// 药品认知专题页
const dataModule = require('../../utils/data');
const util = require('../../utils/util');

Page({
  data: {
    hormoneLevels: dataModule.hormoneLevels,
    riskOintments: dataModule.riskOintments
  },

  goBack() {
    wx.navigateBack();
  },

  goNMPA() {
    wx.showModal({
      title: '前往官方查询',
      content: '即将跳转国家药品监督管理局官网',
      success(res) {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'https://www.nmpa.gov.cn/',
            success: () => {
              util.showToast('官网链接已复制，请打开浏览器访问');
            }
          });
        }
      }
    });
  }
});
