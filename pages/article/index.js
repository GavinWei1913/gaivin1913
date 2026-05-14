// 文章详情
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    article: {},
    isFavorited: false
  },

  onLoad() {
    const article = app.globalData.currentArticle || {};
    this.setData({ article });
    
    // 检查是否已收藏
    const userData = app.globalData.userData || {};
    const favorites = userData.favorites || [];
    this.setData({ isFavorited: favorites.includes(article.id) });
  },

  toggleFavorite() {
    const userData = app.globalData.userData || {};
    let favorites = userData.favorites || [];
    const id = this.data.article.id;

    if (favorites.includes(id)) {
      favorites = favorites.filter(f => f !== id);
      this.setData({ isFavorited: false });
      util.showToast('已取消收藏');
    } else {
      favorites.push(id);
      this.setData({ isFavorited: true });
      util.showToast('已收藏 ❤️');
    }

    app.updateUserData('favorites', favorites);
  },

  goBack() {
    wx.navigateBack();
  }
});
