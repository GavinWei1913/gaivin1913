// AI情绪对话 - 小愈
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    messages: [],
    inputText: '',
    isLoading: false,
    scrollToId: '',
    remaining: 0,
    limit: 10,
    messageIdCounter: 1,

    // 腾讯混元API配置（需替换为实际值）
    apiConfig: {
      appId: '',
      secretId: '',
      secretKey: '',
      region: 'ap-guangzhou'
    }
  },

  onLoad() {
    const remaining = app.getTodayChatLimit();
    this.setData({
      remaining,
      limit: app.globalData.dailyChatLimit
    });

    // 提示用户对话限制
    if (remaining <= 0) {
      util.showToast('今日对话次数已用完');
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 发送消息
  async sendMessage() {
    const text = this.data.inputText.trim();
    if (!text) return;
    if (this.data.isLoading) return;
    if (this.data.remaining <= 0) {
      util.showToast('今日对话次数已用完，明天再来吧');
      return;
    }

    // 添加用户消息
    const userMsg = {
      id: this.data.messageIdCounter++,
      role: 'user',
      content: text,
      time: Date.now()
    };

    this.setData({
      inputText: '',
      messages: [...this.data.messages, userMsg],
      isLoading: true,
      remaining: this.data.remaining - 1
    });

    // 滚动到底部
    this.scrollToBottom();

    try {
      // 调用腾讯混元API
      const aiReply = await this.callHunyuanAPI(text);
      
      // 扣除一次对话次数
      app.useChat();

      // 添加AI回复
      const aiMsg = {
        id: this.data.messageIdCounter++,
        role: 'ai',
        content: aiReply,
        time: Date.now()
      };

      this.setData({
        messages: [...this.data.messages, aiMsg],
        isLoading: false
      });

      this.scrollToBottom();

    } catch (err) {
      console.error('AI对话失败:', err);
      
      // 降级：使用本地回复
      const fallbackReply = this.getFallbackReply(text);
      
      const aiMsg = {
        id: this.data.messageIdCounter++,
        role: 'ai',
        content: fallbackReply,
        time: Date.now()
      };

      this.setData({
        messages: [...this.data.messages, aiMsg],
        isLoading: false
      });

      this.scrollToBottom();
    }
  },

  // 调用腾讯混元 API
  async callHunyuanAPI(userMessage) {
    // 注意：此处需要替换为实际的腾讯混元API调用
    // 由于小程序前端直接调用需要配置安全域名，建议通过云函数中转
    
    try {
      // 通过云函数调用
      const result = await wx.cloud.callFunction({
        name: 'hunyuanChat',
        data: {
          message: userMessage,
          history: this.data.messages.slice(-10).map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content
          }))
        }
      });
      
      if (result.result && result.result.reply) {
        return result.result.reply;
      }
      throw new Error('云函数返回异常');
      
    } catch (err) {
      console.error('云函数调用失败，使用本地回复:', err);
      return this.getFallbackReply(userMessage);
    }
  },

  // 本地降级回复（API不可用时使用）
  getFallbackReply(text) {
    const replies = [
      '嗯，我在听。能再多说说你的感受吗？',
      '谢谢你愿意和我分享这些。面对银屑病的反复确实不容易，你已经做得很好了。',
      '听起来你今天心情不太好。要不要试试深呼吸？先别急着想太多，慢慢来。',
      '皮损的变化确实会让人困扰，但请记住，这不代表你不好。你的价值远不止于此。',
      '你提到的这些感受，很多病友也经历过。你并不孤单。',
      '我注意到你今天说的话里有些负面情绪。能告诉我最近发生了什么特别的事吗？',
      '身体的康复需要时间，情绪的恢复也是。请对自己多一些耐心。',
      '有时候，仅仅是承认自己"今天不太好"，就是一种勇气。谢谢你信任我。'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollToId: 'scroll-bottom' });
    }, 100);
  },

  switchVoice() {
    // 语音输入功能（需要微信录音权限）
    const that = this;
    wx.showActionSheet({
      itemList: ['录音输入'],
      success(res) {
        if (res.tapIndex === 0) {
          wx.showToast({ title: '语音功能开发中', icon: 'none' });
        }
      }
    });
  },

  showChatInfo() {
    wx.showModal({
      title: '对话说明',
      content: `小愈是情绪支持伙伴，提供共情倾听和正念引导。\n\n今日剩余对话：${this.data.remaining} 次\n\n所有对话内容加密存储。\n\n如有严重焦虑抑郁情绪，请寻求专业心理医生帮助。`
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
