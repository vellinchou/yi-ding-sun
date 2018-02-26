var rtcroom = require('../../../utils/rtcroom.js');

Page({
    /**
     * 页面的初始数据
     */
    data: {
      role: 'enter',      // 表示双人会话的角色，取值'enter'表示加入者，'create'表示创建者
      roomid: '',         // 房间id
      roomname: '',       // 房间名称
      username: '',       // 用户名称
      config: {           //cameraview对应的配置项
        aspect: '3:4',     //设置画面比例，取值为'3:4'或者'9:16'
        minBitrate: 200,   //设置码率范围为[minBitrate,maxBitrate]，四人建议设置为200~400
        maxBitrate: 400,
        beauty: 5,        //美颜程度，取值为0~9
        muted: false,     //设置推流是否静音
        debug: false,     //是否显示log
        camera: true,     //设置前后置摄像头，true表示前置
        operate: ''       //设置操作类型，目前只有一种'stop'，表示停止
      },            
      styles: {           //设置cameraview的大小
        width: '49vw',
        height: '65.33vw'
      },
      event: 0,               //推流事件透传
      members: [{}, {}, {}],  //多人其他用户信息
      isShow: false,          // 是否显示页面
    },
    /**
    * 通知事件
    * onGetMemberList：初始化成员列表
    * onMemberJoin：有人进群通知
    * onMemberQuit：有人退群通知
    * onRoomClose：房间解散通知
    * onFail：错误回调
    */
    onNotify: function (e) {
      var self = this;
      switch (e.detail.type) {
        case 'onGetMemberList': {
          /*
            进入房间后，房间内目前已经有哪些用户通过此通知返回，可以根据此通知来展示其他用户视频信息，
            e.detail.members：表示其他用户列表信息
          */
          e.detail.members.forEach(function (val) {
            val.loading = false;
            val.playerContext = wx.createLivePlayerContext(val.userID);
          });
          for(var i = 0; i < 3; i++) {
            if (e.detail.members[i]) {
              self.data.members[i] = e.detail.members[i];
            }
          }
          // 页面处于隐藏时候不触发渲染
          self.data.isShow && self.setData({ members: self.data.members });
          break;
        }
        case 'onMemberJoin': {
          /*
            当有新的用户进入时会通知出来，可以根据此通知来展示新进入用户信息
            e.detail.members：表示新进入用户列表信息
          */
          e.detail.members.forEach(function (val) {
            val.loading = false;
            val.playerContext = wx.createLivePlayerContext(val.userID);
            for (var i = 0; i < 3; i++) {
              if (!self.data.members[i].userID) {
                self.data.members[i] = val;
                break;
              }
            }
          });
          // 页面处于隐藏时候不触发渲染
          self.data.isShow && self.setData({ members: self.data.members });
          break;
        }
        case 'onMemberQuit': {
          /*
            当有用户退出时会通知出来
            e.detail.members：表示退出用户列表信息
          */
          e.detail.members.forEach(function(val){
            for (var i = 0; i < 3; i++) {
              if (self.data.members[i].userID == val.userID) {
                self.data.members[i] = {};
              }
            }
          });
          // 页面处于隐藏时候不触发渲染
          self.data.isShow && self.setData({ members: self.data.members });
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
          self.data.members.forEach(function (val) {
            val.playerContext && val.playerContext.stop();
          });
          wx.showModal({
            title: '提示',
            content: e.detail.errMsg || '房间已解散',
            showCancel: false,
            complete: function () {
              var pages = getCurrentPages();
              console.log(pages, pages.length, pages[pages.length - 1].__route__);
              if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/multiroom/room/room')) {
                wx.navigateBack({ delta: 1 });
              }
            }
          });
          break;
        }
        case 'onFail': {
          /*
            收到房间用户的消息通知
            e.detail.content.textMsg：表示消息内容、
            e.detail.content.nickName：表示用户昵称
            e.detail.content.time：表示消息的接收时间
          */
          self.data.config.operate = 'stop';
          self.setData({
            config: self.data.config
          });
          self.data.members.forEach(function (val) {
            val.playerContext && val.playerContext.stop();
          });
          wx.showModal({
            title: '提示',
            content: e.detail.errMsg,
            showCancel: false,
            complete: function () {
              var pages = getCurrentPages();
              console.log(pages, pages.length, pages[pages.length - 1].__route__);
              if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/multiroom/room/room')) {
                wx.navigateBack({ delta: 1 });
              }
            }
          });
          break;
        }
      }
    },
    onPush: function (e) {
      this.setData({ event: e.detail.code });
    },
    onPlay: function (e) {
      var self = this;
      self.data.members.forEach(function(val){
        if(e.currentTarget.id == val.userID) {
          switch (e.detail.code) {
            case 2007: {
              console.log('视频播放loading: ', e);
              val.loading = true;
              break;
            }
            case 2004: {
              console.log('视频播放开始: ', e);
              val.loading = false;
              break;
            }
            default: {
              console.log('拉流情况：', e);
            }
          }
        }
      });
      self.setData({
        members: self.data.members
      })
    },
    changeCamera: function () {
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
      this.data.role = options.type;
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
            if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/multiroom/room/room')) {
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
        members: self.data.members
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
        title: '多人音视频',
        path: '/pages/multiroom/roomlist/roomlist',
        imageUrl: '/pages/Resources/share.png'
      }
    }
})