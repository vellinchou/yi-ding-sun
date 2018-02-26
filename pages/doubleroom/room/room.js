// pages/doubleroom/room/room.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    role: 'enter',    // 表示双人会话的角色，取值'enter'表示加入者，'create'表示创建者
    roomid: '',       // 房间id
    roomname: '',     // 房间名称
    username: '',     // 用户名称
    config: {         //cameraview对应的配置项
      aspect: '3:4',  //设置画面比例，取值为'3:4'或者'9:16'
      minBitrate: 200,//设置码率范围为[minBitrate,maxBitrate]，双人建议设置为200~600
      maxBitrate: 600,
      beauty: 5,      //美颜程度，取值为0~9
      muted: false,   //设置推流是否静音
      camera: true,   //设置前后置摄像头，true表示前置
      operate: '',    //设置操作类型，目前只有一种'stop'，表示停止
      debug: false    //是否显示log
    },                      
    styles: {         //设置cameraview的大小
      width: '49vw',
      height: '65.33vw'
    },
    event: 0,       // 推流事件透传
    member: {},     //双人对端成员信息

    inputMsg: '',     // input信息
    comment: [],      // 评论区信息

    toview: '',     // 滚动条位置
    isShow: false,  // 是否显示页面
  },
  /**
   * 通知事件
   * onGetMemberList：初始化成员列表
   * onMemberJoin：有人进入房间通知
   * onMemberQuit：有人退出房间通知
   * onRoomClose：房间解散通知
   * onRecvRoomTextMsg：收到其他成员文本消息通知
   * onFail：错误回调
   */
  onNotify: function (e) {
    var self = this;
    switch(e.detail.type) {
      case 'onGetMemberList': {
        /*
          进入房间后，房间内目前已经有哪些用户通过此通知返回，可以根据此通知来展示其他用户视频信息，
          本方案可以应用于多人与双人会话，针对双人会话，此处返回的用户列表只有一条
          e.detail.members：表示其他用户列表信息，在双人场景下只有一条，所以这里直接取e.detail.members[0]
        */
        self.data.member = e.detail.members[0];
        self.data.member.loading = false;
        self.data.member.playerContext = wx.createLivePlayerContext('rtcplayer');
        // 页面处于隐藏时候不触发渲染
        self.data.isShow && self.setData({ member: self.data.member });
        break;
      }
      case 'onMemberJoin': {
        /*
          当有新的用户进入时会通知出来，可以根据此通知来展示新进入用户信息
          本方案可以应用于多人与双人会话，针对双人会话，此处返回的用户信息只有一条
          e.detail.members：表示新进入用户列表信息，在双人场景下只有一条，所以这里直接取e.detail.members[0]
        */
        self.data.member = e.detail.members[0];
        self.data.member.loading = false;
        self.data.member.playerContext = wx.createLivePlayerContext('rtcplayer');
        // 页面处于隐藏时候不触发渲染
        self.data.isShow && self.setData({ member: self.data.member });
        break;
      }
      case 'onMemberQuit': {
        /*
          当有用户退出时会通知出来
          e.detail.members：表示退出用户列表信息，此处双人场景只有一个人，有人退出就直接将对端成员信息置为空
        */
        self.setData({ member: {} });
        break;
      }
      case 'onRoomClose': {
        /*
          房间关闭时会收到此通知，客户可以提示用户房间已经关闭，做清理操作
        */
        self.data.config.operate = 'stop';
        self.setData({
          config: self.data.config
        });

        self.data.member.playerContext && self.data.member.playerContext.stop();
        wx.showModal({
          title: '提示',
          content: e.detail.errMsg || '房间已解散',
          showCancel: false,
          complete: function () {
            var pages = getCurrentPages();
            console.log(pages, pages.length, pages[pages.length - 1].__route__);
            if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/doubleroom/room/room')) {
              wx.navigateBack({ delta: 1 });
            }
          }
        });
        break;
      }
      case 'onRecvRoomTextMsg': {
        /*
          收到房间用户的消息通知
          e.detail.content.textMsg：表示消息内容、
          e.detail.content.nickName：表示用户昵称
          e.detail.content.time：表示消息的接收时间
        */
        var self = this;
        self.data.comment.push({
          content: e.detail.content.textMsg,
          name: e.detail.content.nickName,
          time: e.detail.content.time
        });
        self.setData({
          comment: self.data.comment,
          toview: ''
        });
        // 滚动条置底
        self.setData({
          toview: 'scroll-bottom'
        });
        break;
      }
      case 'onFail': {
        /*
          各种内部错误，客户可以给出错误提示，做清理操作
          e.detail.errMsg：表示错误消息
        */
        self.data.config.operate = 'stop';
        self.setData({
          config: self.data.config
        });

        self.data.member.playerContext && self.data.member.playerContext.stop();

        wx.showModal({
          title: '提示',
          content: e.detail.errMsg,
          showCancel: false,
          complete: function () {
            var pages = getCurrentPages();
            console.log(pages, pages.length, pages[pages.length - 1].__route__);
            if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/doubleroom/room/room')) {
              wx.navigateBack({ delta: 1 });
            }
          }
        });
        break;
      }
    }
  },
  onPush: function(e){
    this.setData({ event: e.detail.code });
  },
  onPlay: function(e) {
    var self = this;
    switch (e.detail.code) {
      case 2007: {
        console.log('视频播放loading: ', e);
        self.data.member.loading = true;
        break;
      }
      case 2004: {
        console.log('视频播放开始: ', e);
        self.data.member.loading = false;
        break;
      }
      default: {
        console.log('拉流情况：', e);
      }
    }
    self.setData({
      member: self.data.member
    });
  },
  bindInputMsg: function (e) {
    this.data.inputMsg = e.detail.value;
  },
  sendComment: function() {
    this.setData({ inputMsg: this.data.inputMsg });
    // 再发一条空，避免两次出现重复字符串没发生变化，不会再发送
    this.setData({ inputMsg: '' });
  },
  changeCamera: function() {
    this.data.config.camera = !this.data.config.camera;
    this.setData({
      config: this.data.config
    });
  },
  setBeauty: function () {
    this.data.config.beauty = (this.data.config.beauty == 0 ? 5 : 0);
    this.setData({
      config: this.data.config
    });
  },
  changeMute: function () {
    this.data.config.muted = !this.data.config.muted;
    this.setData({
      config: this.data.config
    });
  },
  showLog: function () {
    this.data.config.debug = !this.data.config.debug;
    this.setData({
      config: this.data.config
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('room.js onLoad');
    var time = new Date();
    time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
    console.log('*************开始多人音视频：' + time + '**************');
    this.data.role = 'enter';
    this.data.roomid = options.roomID;
    this.data.roomname = options.roomName;
    this.data.username = options.userName;
    this.setData({
      role: this.data.role,
      roomid: this.data.roomid,
      roomname: this.data.roomname,
      username: this.data.username
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    var self = this;
    if (!self.data.username) {
      wx.showModal({
        title: '提示',
        content: '登录信息还未获取到，请稍后再试',
        showCancel: false,
        complete: function () {
          var pages = getCurrentPages();
          console.log(pages, pages.length, pages[pages.length - 1].__route__);
          if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/doubleroom/room/room')) {
            wx.navigateBack({ delta: 1 });
          }
        }
      });
      return;
    }
    // 设置房间标题
    wx.setNavigationBarTitle({ title: self.data.roomname });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    console.log('room.js onShow');
    var self = this;
    self.data.isShow = true;
    self.setData({
      member: self.data.member
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    var self = this;
    console.log('room.js onHide');
    self.data.isShow = false;
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log('room.js onUnload');
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
      title: '双人音视频',
      path: '/pages/doubleroom/roomlist/roomlist',
      imageUrl: '/pages/Resources/share.png'
    }
  }
})