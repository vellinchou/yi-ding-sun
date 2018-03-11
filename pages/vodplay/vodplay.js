// pages/play/play.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    playing: false,
    videoContext: {},

    fullScreen: false,
    playUrl: "http://200024424.vod.myqcloud.com/200024424_709ae516bdf811e6ad39991f76a4df69.f20.mp4",

  },

  onScanQR: function () {
    this.stop();
    this.createContext();
    console.log("onScaneQR");
    var self = this;
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        console.log(res);
        self.setData({
          playUrl: res.result
        })
      }
    })
  },

  onPlay: function(e) {
    this.setData({
      playing: true
    })
  },

  onPause: function(e) {
    this.setData({
      playing: false
    })
  },

  onEnded: function(e) {
    this.setData({
      playing: false
    })
  },

  onFullScreenChange: function (e) {
    this.setData({
      fullScreen: e.detail.fullScreen
    })
    console.log(e);
    wx.showToast({
      title: this.data.fullScreen ? '全屏' : '退出全屏',
    })
  },

  stop: function() {
    this.setData({
      playing: false,
      playUrl: "http://200024424.vod.myqcloud.com/200024424_709ae516bdf811e6ad39991f76a4df69.f20.mp4",

      fullScreen: false,
    })
    this.data.videoContext.stop();
  },

  createContext: function() {
    this.setData({
      videoContext: wx.createVideoContext('video-vodPlayer')
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.createContext();
    console.log(this.data.videoContext);

    wx.setKeepScreenOn({
      keepScreenOn: true,
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    this.stop();

    wx.setKeepScreenOn({
      keepScreenOn: false,
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
  
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
  
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '点播播放器',
      path: '/pages/vodplay/vodplay',
      imageUrl: '../Resources/share.png'
    }
  }
})