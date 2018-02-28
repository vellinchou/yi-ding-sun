// pages/main/main.js
var rtcroom = require('../../utils/rtcroom.js');
var getlogininfo = require('../../getlogininfo.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    canShow: 0,
    
    tapTime: '',		// 防止两次点击操作间隔太快
    entryInfos: [
      { icon: "../Resoddddces/liveroom.png", title: "直播体验室", navigateTo: "../liveroom/roomlist/roomlist" },
      { icon: "../Resources/doubleroom.png", title: "双人音视频", navigateTo: "../doubleroom/roomlist/roomlist" },
      { icon: "../Resources/multiroom.png", title: "多人音视频", navigateTo: "../multiroom/roomlist/roomlist" },
      { icon: "../Resources/vodplay.png", title: "点播播放器", navigateTo: "../vodplay/vodplay" },
      { icon: "../Resources/push.png", title: "RTMP推流", navigateTo: "../push/push" },
      { icon: "../Resources/play.png", title: "直播播放器", navigateTo: "../play/play" },
      { icon: "../Resources/rtplay.png", title: "低延时播放", navigateTo: "../rtplay/rtplay" }
      // { icon: "../Resources/wawaplay@2x.png", title: "在线抓娃娃", navigateTo: "../wawaplayer/wawaroomlist/wawaroomlist" }
    ],
    roomName: '',	// 房间名称
    userName: '',	// 用户名称
    room: {},	// 获取到的当前房间
    isGetLoginInfo: false,  // 是否已经获取登录信息
    firstshow: true,// 第一次显示页面
    tapTime: ''		// 防止两次点击操作间隔太快
  },

	/**
	 * [getRoomList 拉取房间列表]
	 * @return {[type]} [description]
	 */
  getRoomList: function () {
    var self = this;
    if (!self.data.isGetLoginInfo) {
      wx.showModal({
        title: '提示',
        content: '登录信息初始化中，请稍后再试',
        showCancel: false
      })
      return;
    }
    // 初始化获取房间room
    // rtcroom.getRoomList({
    //   data: {
    //     index: 0,
    //     cnt: 20
    //   },
    //   success: function (ret) {
    //     self.setData({
    //       room: ret.rooms ,
    //     });
    //     console.log('拉取房间成功,当前坐席房间：');
    //     console.log(self.data.room)
    //   },
    //   fail: function (ret) {
    //     console.log(ret);
    //     wx.showModal({
    //       title: '获取坐席失败，请登录后台查看',
    //       content: ret.errMsg,
    //       showCancel: false
    //     })
    //   }
    // });
  },

  /**
 * [goRoom 进入rtcroom页面]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
  goRoom: function (e) {
    // 防止两次点击操作间隔太快
    var nowTime = new Date();

    if (nowTime - this.data.tapTime < 1000) {
       
      return;
    }
    var self = this
      // 获取一遍 房间
    rtcroom.getRoomList({
      data: {
        index: 0,
        cnt: 20
      },
      success: function (ret) {
        self.setData({
          room: ret.rooms,
        });
        console.log('拉取房间成功,当前坐席房间：');
        console.log(self.data.room)
        if (JSON.stringify(self.data.room) == "{}") {
          wx.showModal({
            title: '提示',
            content: '当前无坐席在线，或坐席在忙，请您耐心等待！',
            showCancel: false,
            complete: function () { }
          });
          return;
        } else {
          var url = '../doubleroom/room/room?roomID=' + self.data.room.roomID + '&roomName=' + self.data.room.roomName + '&userName=' + self.data.room.userName;
          console.log(url)
          wx.navigateTo({ url: url });
          wx.showToast({
            title: '进入房间',
            icon: 'success',
            duration: 1000
          })
          

        }
      },
      fail: function (ret) {
        console.log(ret);
        wx.showModal({
          title: '获取坐席失败，请登录后台查看',
          content: ret.errMsg,
          showCancel: false
        })
      }
    });

    this.setData({ 'tapTime': nowTime });
  
  },

  onEntryTap: function (e) {
    if (this.data.canShow) {
    // if(1) {
      // 防止两次点击操作间隔太快
      var nowTime = new Date();
      if (nowTime - this.data.tapTime < 1000) {
        return;
      }
      var toUrl = this.data.entryInfos[e.currentTarget.id].navigateTo;
      console.log(toUrl);
      wx.navigateTo({
        url: toUrl,
      });
      this.setData({ 'tapTime': nowTime });
    } else {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后再试。',
        showCancel: false
      });
    }
  },

  // 点击视频报案
  onEntryDouble: function(e) {
    if (this.data.canShow) {
      // if(1) {
      // 防止两次点击操作间隔太快
      // var nowTime = new Date();
      // if (nowTime - this.data.tapTime < 1000) {
      //   return;
      // }
      // var toUrl = "../doubleroom/roomlist/roomlist" ;
      // console.log(toUrl);
      // wx.navigateTo({
      //   url: toUrl,
      // });
      // this.setData({ 'tapTime': nowTime });

      this.goRoom()

    } else {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后再试。',
        showCancel: false
      });
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log("onLoad");
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    console.log("onReady");
    if(!wx.createLivePlayerContext) {
      setTimeout(function(){
        wx.showModal({
          title: '提示',
          content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后再试。',
          showCancel: false
        });
      },0);
    } else {
      // 版本正确，允许进入
      this.data.canShow = 1;

      // 先获取登录信息
      var self = this;
      console.log(getlogininfo)
      console.log(typeof getlogininfo.getLoginInfo)
      getlogininfo.getLoginInfo({
        type: 'double_room',
        success: function (ret) {
          self.data.firstshow = false;
          self.data.isGetLoginInfo = true;
          self.getRoomList();
          console.log('我的昵称：', ret.userName);
          self.setData({
            userName: ret.userName
          });
        },
        fail: function (ret) {
          self.data.isGetLoginInfo = false;
          wx.showModal({
            title: '获取登录信息失败',
            content: ret.errMsg,
            showCancel: false,
            complete: function () {
              wx.navigateBack({});
            }
          });
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    console.log("onShow");

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    console.log("onHide");

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log("onUnload");

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log("onPullDownRefresh");

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log("onReachBottom");

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    console.log("onShareAppMessage");
    return {
      title: '腾讯视频云',
      path: '/pages/main/main',
      imageUrl: '../Resources/share.png'
    }
  }
})