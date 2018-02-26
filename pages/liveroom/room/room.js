// pages/liveroom/room/room.js
var liveroom = require('../../../utils/liveroom.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		type: '',   		// 类型：create为创建房间，不传为进入房间
		roomID: '', 		// 房间ID
		roomName: '',   	// 房间名称
		userName: '',		// 用户昵称
		pushURL: '',    	// 推流地址
		playURL: '',     	// 拉流信息
		comment: [],    	// 评论信息
		myComment: '',		// 评论内容
		playerContext: {},  // liveplayer context
		pusherContext: {},  // livepusher context
		liveData: {
			camera: true,   // 摄像头
			beauty: 5,      // 美颜
			mute: false,    // 静音
			debug: false    // 调试
		},
		toview: '', 		// 滚动条位置
		unload: 0,   		// 页面是否unload
		startX: 0, 			//开始x坐标
		startY: 0,			//开始y坐标
		commentshow: true	// 是否显示评论
	},
	touchstart: function(e) {
		console.log('touchstart')
		this.setData({
			startX: e.changedTouches[0].clientX,
			startY: e.changedTouches[0].clientY
		})
	},
	touchmove: function (e) {
		console.log('touchmove')
		var that = this,
		index = e.currentTarget.dataset.index,//当前索引
		startX = that.data.startX,//开始X坐标
		startY = that.data.startY,//开始Y坐标
		touchMoveX = e.changedTouches[0].clientX,//滑动变化坐标
		touchMoveY = e.changedTouches[0].clientY,//滑动变化坐标
		//获取滑动角度
		angle = that.angle({ X: startX, Y: startY }, { X: touchMoveX, Y: touchMoveY });
		//滑动超过30度角 return
		if (Math.abs(angle) > 30) return;
		if (touchMoveX < startX) {
			//右滑
			console.log('右滑')
			that.setData({
				commentshow: false
			})
		} else {
			//左滑
			console.log('左滑')
			that.setData({
				commentshow: true
			})
		} 
	},
	/**
	 * 计算滑动角度
	 * @param {Object} start 起点坐标
	 * @param {Object} end 终点坐标
	 */
	angle: function (start, end) {
		var _X = end.X - start.X,
		_Y = end.Y - start.Y
		//返回角度 /Math.atan()返回数字的反正切值
		return 360 * Math.atan(_Y / _X) / (2 * Math.PI);
	},
	/**
	 * 创建房间
	 */
	create: function () {
		var self = this;
		liveroom.createRoom({
      data: { 
        roomName: self.data.roomName,
        pushURL: self.data.pushURL
      },
      success: function(ret) {
          // 创建房间成功之后操作
      },
      fail: function(ret) {
        console.log(ret);
        if(!self.data.unload) {
          self.data.pusherContext.stop();
          wx.showModal({
            title: '创建房间失败',
            content: ret.errMsg,
            showCancel: false,
            complete: function() {
              wx.navigateBack({});
            }
          });
        }
      }
  });
	},
	/**
	 * 进入房间
	 */
	enter: function (options) {
		var self = this;
		liveroom.setListener({
			onRoomClose: self.onRoomClose,
			onRecvRoomTextMsg: self.onRecvRoomTextMsg
		});
		liveroom.enterRoom({
			data: {
				roomID: self.data.roomID
			},
			success: function (ret) {

			},
			fail: function (ret) {
				if (!self.data.unload) {
          wx.showModal({
            title: '进入房间失败',
            content: ret.errMsg,
            showCancel: false,
            complete: function () {
              wx.navigateBack({});
            }
          });
          self.data.playerContext.stop();
				}
			}
		});
	},
	/**
	 * 离开房间
	 */
	exit: function () {
		liveroom.exitRoom({});
	},
	/**
	 * 房间解散通知
	 */
	onRoomClose: function (ret) {
		var self = this;
		console.log('收到解散通知');
    // if (self.data.type != 'create') {
    if (!self.data.unload) {
      wx.showModal({
        title: '提示',
        content: '群已解散',
        showCancel: false,
        complete: function () {
          wx.navigateBack({});
        }
      });
      self.data.playerContext.stop();
		}
		self.data.type = '';
	},
	/**
	 * 文本消息消息通知
	 */
	onRecvRoomTextMsg: function (ret) {
		var self = this;
		self.data.comment.push({
			content: ret.textMsg,
			name: ret.nickName,
			time: ret.time
		});
		if(self.data.comment.length > 5) {
			self.data.comment.shift();
		}
		self.setData({
			comment: self.data.comment,
			toview: ''
		});
		self.setData({
			toview: 'scroll-bottom'
		});
	},
	/**
	 * 推流状态事件
	 */
	onPush: function (ret) {
		var self = this;
		switch (ret.detail.code) {
			case 1002: {
				console.log('推流成功：', ret.detail.code);
				if (!self.data.isInRoom) {
					self.setData({ isInRoom: 1 });
          self.create();
				}
				break;
			};
			case -1301: {
				console.log('打开摄像头失败: ', ret.detail.code);
				wx.showModal({
					title: '提示',
					content: '打开摄像头失败',
					showCancel: false,
					complete: function() {
						wx.navigateBack({});
					}
				});
				break;
			};
			case -1302: {
				console.log('打开麦克风失败: ', ret.detail.code);
				wx.showModal({
					title: '提示',
					content: '打开麦克风失败',
					showCancel: false,
					complete: function() {
						wx.navigateBack({});
					}
				});
				break;
			};
			case -1307: {
				console.log('推流连接断开: ', ret.detail.code);
				wx.showModal({
					title: '提示',
					content: '推流断开，请检查网络设置',
					showCancel: false,
					complete: function() {
						wx.navigateBack({});
					}
				});
				break;
			};
			default: {
				console.log('推流情况：', ret.detail.code);
			}
		}
	},
	/**
	 * 切换摄像头
	 */
	changeCamera: function () {
		this.data.pusherContext.switchCamera({});
		this.data.liveData.camera = !this.data.liveData.camera;
		this.setData({
			liveData: this.data.liveData
		});
	},
	/**
	 * 美颜
	 */
	setBeauty: function () {
		this.data.liveData.beauty = (this.data.liveData.beauty == 0 ? 5 : 0);
		console.log('beauty',this.data.liveData.beauty);
		this.setData({
			liveData: this.data.liveData
		});
	},
	/**
	 * 静音
	 */
	changeMute: function () {
		this.data.liveData.mute = !this.data.liveData.mute;
		this.setData({
			liveData: this.data.liveData
		});
	},
	/**
	 * debug模式
	 */
	showLog: function () {
		this.data.liveData.debug = !this.data.liveData.debug;
		this.setData({
			liveData: this.data.liveData
		});
	},
	/**
	 * 绑定评论框
	 */
	bindMyComment: function (e) {
		this.setData({ myComment: e.detail.value });
	},
	/**
	 * 发送评论
	 */
	sendComment: function () {
		var self = this;
		var nowTime = new Date();
		if (nowTime - self.data.tapTime < 1000) {
			return;
		}
		self.setData({ 'tapTime': nowTime });
		var content = self.data.myComment;
		// 评论为空则不发布，trim评论信息
		if (!content.replace(/^\s*|\s*$/g, '')) return;
		liveroom.sendRoomTextMsg({
			data: { msg: content },
			success: function (ret) {
				console.log('发送评论成功');
				wx.showToast({
					title: '发送评论成功',
					icon: 'success',
					duration: 2000
				})
			}
		});
		self.setData({ myComment: '' });
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		console.log('room.js onLoad');
		var time = new Date();
		time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
		console.log('*************开始多人音视频：' + time + '**************');
		var self = this;
    self.data.unload = 0;
    self.data.type = options.type;
    self.data.roomName = options.roomName;
    self.data.userName = options.userName;
    self.data.roomID = options.roomID;
    self.data.playURL = options.accelerateURL;
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {
		var self = this;
    if (!self.data.userName || !self.data.roomName) {
      wx.showModal({
        title: '提示',
        content: '登录信息还未获取到，请稍后再试',
        showCancel: false,
        complete: function () {
          wx.navigateBack({});
        }
      });
      return;
    }
		// 设置房间标题
		wx.setNavigationBarTitle({ title: self.data.roomName });
		self.setData({
			userName: self.data.userName || '',
			playURL: self.data.playURL || ''
		},function() {
      // 观众模式
      if (self.data.playURL && self.data.type != 'create') {
        self.data.playerContext = wx.createLivePlayerContext('player');
        self.enter();
      }
        
    });
    // 主播模式
		if (self.data.type == 'create') {
      liveroom.getPushURL({
        success: function (ret) {
          self.setData({
            pushURL: ret.pushURL
          }, function () {
              liveroom.setListener({
                  onRoomClose: self.onRoomClose,
                  onRecvRoomTextMsg: self.onRecvRoomTextMsg
              });
              self.data.pusherContext = wx.createLivePusherContext('pusher');
              console.log('start pusherContext：', self.data.pusherContext);
          });
        },
        fail: function (ret) {
          console.log('拉取流地址失败: ', ret);
          if (!self.data.unload) {
            wx.showModal({
              title: '提示',
              content: '拉取流地址失败',
              showCancel: false,
              complete: function() {
                wx.navigateBack({});
              }
            });
          }
        }
      });
    }
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {
		console.log('room.js onShow');
		var self = this;
		console.log('play playerContext', self.data.playerContext);
		self.data.playerContext && self.data.playerContext.play();
    // ios resume有问题
		// self.data.pusherContext.resume();
	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () {
		var self = this;
		console.log('room.js onHide');
		console.log('stop playerContext', self.data.playerContext);
		self.data.playerContext && self.data.playerContext.stop();
		// self.data.pusherContext.pause();
	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {
		console.log('room.js onUnload');
		var self = this;
		self.exit();
		console.log('stop pusherContext：', self.data.pusherContext, self.data.playerContext);
		self.data.pusherContext && self.data.pusherContext.stop();
		self.data.playerContext && self.data.playerContext.stop();
		// 重置信息
		self.setData({
			unload: 1,
			pushUrl: '',
			player: {},
			pusherContext: {},
			playerContext: {}
		});
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
      title: '直播体验室',
      path: '/pages/liveroom/roomlist/roomlist',
      imageUrl: '../../Resources/share.png'
    }
	}
})