// pages/wawaolayer/wawaroom/wawaroom.js
var qcloud = require('../../../lib/index')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    videoContext: {},
    videoContext_side: {},
    canvasContext: {},
    canvasContext_side: {},
    controlCoordinate: {},
    audioCtx:{},
    playUrl: {},
    roomid: "",
    sdkappid: "",
    wsUrl: "",
    debugable: false,
    gameStart: false,
    showFront: true,
    cameraeSwitched: false,
    showTimer: false,
    left_time: 0,
    timer_count: {},
    socketOpened: false,
    coinInserted:false,
    mode:"live",
    minCache: 1.0,
    maxCache: 3.0,
    mute:true,
    exceptionTimer:{},
  },
  onFrontPlayEvent: function (e) {
    var code = e.detail.code
    console.log(code);
    if (!this.data.showFront) {
      return;
    }
    switch (code) {
      case -2301: {
        this.data.videoContext.stop();
        wx.showToast({
          title: '拉流多次失败',
        })
      }
        break;
      case 2003:  //渲染首个视频帧
      case 2009: { //视频分辨率改变
        wx.hideLoading();
      }
        break;
      case 2007: //加载中
      case 2008: { //解码器启动
        if (this.data.cameraeSwitched) {
          wx.showLoading({
            title: '加载中',
            mask: true,
          })
        }
        this.data.cameraeSwitched = false
      }
        break;
      default:
        break;
    }
  },
  onSidePlayEvent: function (e) {
    var code = e.detail.code
    console.log(code);
    if (this.data.showFront) {
      return;
    }
    switch (code) {
      case -2301: {
        this.data.canvasContext_side.stop();
        wx.showToast({
          title: '拉流多次失败',
        })
      }
        break;
      case 2003:  //渲染首个视频帧
      case 2009: { //视频分辨率改变 
        wx.hideLoading();
      }
        break;
      case 2007: //加载中
      case 2008: { //解码器启动
        if (this.data.cameraeSwitched) {
          wx.showLoading({
            title: '加载中',
            mask: true,
          })
        }
        this.data.cameraeSwitched = false
      }
        break;
      default:
        break;
    }
  },
  stop: function () {
    this.stopGame(true);
    this.data.videoContext.stop();
    this.data.videoContext_side.stop();
    wx.hideLoading();
  },

  /**
   * 正面、侧面摄像头图像切换
   */
  onSwitchCamera: function () {
    var showFront = !this.data.showFront
    this.setData({
      showFront: showFront,
    });
    this.data.cameraeSwitched = true;
    var that = this
    setTimeout(function () {
      that.data.cameraeSwitched = false
    }, 1000)
  },

  /**
   * start按钮响应
   * 获取娃娃机操作地址
   */
  onBgein: function () {
    var that = this
    wx.request({
      url: "https://sxb.qcloud.com/sxb_dev/?svc=doll&cmd=roomaddr",
      data: {
        id: "" + Date.parse(new Date()),
        appid: parseInt(this.data.sdkappid),
        groupid: parseInt(this.data.roomid)
      },
      header: {
        "content-type": "application/json"
      },
      method: "POST",
      success: function (res) {
        console.log(res.data.data)
        if (res.statusCode == 200) {
          var org_wsurl = res.data.data.WsUrl
          var real_wsurl
          if (that.data.roomid == 76432) {
            // 对于端口的处理
            var index_colon = org_wsurl.indexOf(':', org_wsurl.indexOf(':') + 1)
            var index_slash = org_wsurl.indexOf('/', index_colon + 1)
            real_wsurl = org_wsurl.substring(0, index_colon) + org_wsurl.substring(index_slash, org_wsurl.length) + "/" + org_wsurl.substring(index_colon + 1, index_slash)
          } else {
            real_wsurl = org_wsurl
          }
          console.log(real_wsurl)
          that.setData({
             wsUrl: real_wsurl
          });

          that.openControlSocket();
        } else {
          wx.showToast({
            title: 'get roomaddr failed, statusCode' + res.statusCode,
          })
        }
      },
      fail: function () {
        wx.showToast({
          title: 'get roomaddr failed, fail'
        })
      }
    })
    wx.showLoading({
      title: '游戏准备中',
      mask: true,
    })
  },

  /**
   * 控制touchstart
   */
  onControlBegin: function (event) {
    var x = event.touches[0].x;
    var y = event.touches[0].y;
    var controlCmd
    var controlCoor = this.data.controlCoordinate
    if (x > controlCoor.btn_left.x && x < controlCoor.btn_left.x + controlCoor.btn_left.width
      && y > controlCoor.btn_left.y && y < controlCoor.btn_left.y + controlCoor.btn_left.height) {
        if(this.data.showFront) {
          controlCmd = "l"
        } else {
          controlCmd = "d"
        }
    } else if (x > controlCoor.btn_right.x && x < controlCoor.btn_right.x + controlCoor.btn_right.width
      && y > controlCoor.btn_right.y && y < controlCoor.btn_right.y + controlCoor.btn_right.height) {
      if (this.data.showFront) {
        controlCmd = "r"
      } else {
        controlCmd = "u"
      }
    } else if (x > controlCoor.btn_up.x && x < controlCoor.btn_up.x + controlCoor.btn_up.width
      && y > controlCoor.btn_up.y && y < controlCoor.btn_up.y + controlCoor.btn_up.height) {
      if (this.data.showFront) {
        controlCmd = "u"
      } else {
        controlCmd = "l"
      }
    } else if (x > controlCoor.btn_down.x && x < controlCoor.btn_down.x + controlCoor.btn_down.width
      && y > controlCoor.btn_down.y && y < controlCoor.btn_down.y + controlCoor.btn_down.height) {
      if (this.data.showFront) {
        controlCmd = "d"
      } else {
        controlCmd = "r"
      }
    }
    wx.sendSocketMessage({
      data: JSON.stringify({
        "type": "Control", "data": controlCmd, "extra": Date.parse(new Date())
      })
    })
  },

  /**
   * 控制touchend
   */
  onControlEnd: function (event) {
    var x = event.changedTouches[0].x;
    var y = event.changedTouches[0].y;
    var controlCmd
    var controlCoor = this.data.controlCoordinate
    if (x > controlCoor.btn_catch.x && x < controlCoor.btn_catch.x + controlCoor.btn_catch.width
      && y > controlCoor.btn_catch.y && y < controlCoor.btn_catch.y + controlCoor.btn_catch.height) {
      this.doCatch();
      return;
    } else if (x > controlCoor.btn_left.x && x < controlCoor.btn_left.x + controlCoor.btn_left.width
      && y > controlCoor.btn_left.y && y < controlCoor.btn_left.y + controlCoor.btn_left.height) {
      if (this.data.showFront) {
        controlCmd = "A"
      } else {
        controlCmd = "S"
      }
    } else if (x > controlCoor.btn_right.x && x < controlCoor.btn_right.x + controlCoor.btn_right.width
      && y > controlCoor.btn_right.y && y < controlCoor.btn_right.y + controlCoor.btn_right.height) {
      if (this.data.showFront) {
        controlCmd = "D"
      } else {
        controlCmd = "W"
      }
    } else if (x > controlCoor.btn_up.x && x < controlCoor.btn_up.x + controlCoor.btn_up.width
      && y > controlCoor.btn_up.y && y < controlCoor.btn_up.y + controlCoor.btn_up.height) {
      if (this.data.showFront) {
        controlCmd = "W"
      } else {
        controlCmd = "A"
      }
    } else if (x > controlCoor.btn_down.x && x < controlCoor.btn_down.x + controlCoor.btn_down.width
      && y > controlCoor.btn_down.y && y < controlCoor.btn_down.y + controlCoor.btn_down.height) {
      if (this.data.showFront) {
        controlCmd = "S"
      } else {
        controlCmd = "D"
      }
    }
    wx.sendSocketMessage({
      data: JSON.stringify({
        "type": "Control", "data": controlCmd, "extra": Date.parse(new Date())
      })
    })
  },
  onLog:function () {
    var newDebugable = !this.data.debugable
    this.setData ({
      debugable: newDebugable,
    })
  },
  /**
   * 游戏结束，清理websocket。切换回live模式
   */
  stopGame: function (pageUnload) {
    wx.hideLoading()

    if (this.data.coinInserted) {
      wx.sendSocketMessage({
        data: JSON.stringify({
          "type": "Control", "data": "b", "extra": Date.parse(new Date())
        })
      })
    }

    if (this.tunnel) {
      this.tunnel.close(true);
    }
    this.setData({ tunnelStatus: 'closed' })

    clearTimeout(this.data.timer_count);

    var that = this
    //模式切换最终作用到页面上是在另外的线程，所以stop和play需要等到setData完成之后再调用
    //新版的微信发布之后，可以直接切换模式，不用stop和play，sdk内部自动做了
    this.setData({
      mode: "live",
      mute:true,
      minCache: 1.0, 
      maxCache: 3.0,
    }, function () {
      that.data.videoContext.stop();
      that.data.videoContext.play();
      that.data.videoContext_side.stop();
      that.data.videoContext_side.play();
      wx.showLoading({
        title: '加载中',
        mask: true,
      })
    });
    this.setData({
      gameStart: false,
      socketOpened: false,
      showTimer: false,
      left_time: 0,
      coinInserted:false,
    });
  },

  /**
   * 抓娃娃
   */
  doCatch: function () {
    wx.sendSocketMessage({
      data: JSON.stringify({
        "type": "Control", "data": "b", "extra": Date.parse(new Date())
      })
    })
    this.setData({
      showTimer: false,
      left_time: 0,
      coinInserted:false,
    });

    var that = this
    this.exceptionTimer = setTimeout(function () {
      that.stopGame(false)
    }, 20000)
  },

  /**
   * 打开娃娃机websocket连接，并监听娃娃机websocket服务器消息
   */
  openControlSocket: function () {
    var that = this
    var tunnel = this.tunnel = new qcloud.SocketTunnel(this.data.wsUrl)

    // 监听socket消息，包括 connect/close/error/message
    tunnel.on('connect', () => {
      console.log('WebSocket连接已打开！')
      that.setData({
        socketOpened: true,
      })
    })

    tunnel.on('close', res => {
      wx.hideLoading()
      console.log('websocket连接失败' + res + ((typeof res === 'object' && typeof res.code !== 'undefined')?res.code:''))
      if (typeof res === 'object' && typeof res.code !== 'undefined' && (res.code > 4000 || res.code < 1000)) {
        wx.showModal({
          title: '连接失败',
          showCancel:false,
          content: 'code:' + res.code + ",reason:" + res.reason,
        })
      }
      this.setData({
        socketOpened: false,
      });
    })

    tunnel.on('error', error => {
      console.log('websocket出错' + error)
      // wx.showModal({
      //   title: '连接出错',
      //   showCancel: false,
      //   content: '连接出错',
      // })
    })


    tunnel.on('message', message => {
      console.log('收到WebSocket信息！' + message.data)
      var data = JSON.parse(message.data)
      if (data.type == "Ready") {
        that.insertCoin()
      } else if (data.type == "Wait" && data.data != 0) {
        wx.showLoading({
          title: '当前有' + JSON.parse(message.data).data + '人在等待',
          mask: true,
        })
      } else if (data.type == "State" && data.data == "PLAY") {
        that.startGame()
      } else if (data.type == "Result") {
        clearTimeout(that.exceptionTimer)
        that.stopGame(false)
      } else if (data.type == "Coin") {
        that.setData({
          coinInserted:true,
        })
      } else if (data.type == "Time") {
        that.setData({
          left_time: data.data,
          showTimer: true,
        })
        that.countdown(that)
      }
    })

    // 打开信道
    tunnel.open()
  },
  /**
   * 定时器
   */
  countdown: function (that) {
    var second = that.data.left_time
    if (second == 0) {
      that.setData({
        left_time: 0,
        showTimer: false,
        coinInserted: false,
      });
      that.exceptionTimer = setTimeout(function () {
        that.stopGame(false)
      }, 10000)
      return;
    }
    var time = setTimeout(function () {
      that.setData({
        left_time: second - 1
      });
      that.countdown(that);
    }, 1000)
    that.setData({
      timer_count: time
    })
  },

  /**
   * 游戏开始，切换到RTC模式
   */
  startGame: function () {
    var that = this
    wx.hideLoading()

    //模式切换最终作用到页面上是在另外的线程，所以stop和play需要等到setData完成之后再调用
    //新版的微信发布之后，可以直接切换模式，不用stop和play，sdk内部自动做了
    this.setData({
      mode: "RTC",
      mute: true,
      minCache: 0.1, 
      maxCache: 0.2,
    }, function () {
      that.data.videoContext.stop();
      that.data.videoContext.play();
      that.data.videoContext_side.stop();
      that.data.videoContext_side.play();
      wx.showLoading({
        title: '加载中',
        mask: true,
      })
    });
    
    this.setData({
      gameStart: true,
    });
  },

  /**
   * 娃娃机投币
   */
  insertCoin: function () {
    wx.sendSocketMessage({
      data: JSON.stringify({
        "type": "Insert", "data": 1, "extra": Date.parse(new Date())
      })
    })
  },
  createContext: function () {
    this.data.videoContext = wx.createLivePlayerContext("video-livePlayer");
    this.data.videoContext_side = wx.createLivePlayerContext("video-livePlayer-side");
    this.data.audioCtx = wx.createAudioContext('myAudio')
    this.data.canvasContext = wx.createCanvasContext('controlCanvas')
    this.data.canvasContext_side = wx.createCanvasContext('controlCanvas-side')
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      roomid: options.roomid,
      sdkappid: options.sdkappid,
    })
    this.createContext();

    wx.setKeepScreenOn({
      keepScreenOn: true,
    })

    wx.showLoading({
      title: '加载中',
      mask: true,
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    var that = this
    // 拉取播放地址
    wx.request({
      url: "https://sxb.qcloud.com/sxb_dev/?svc=doll&cmd=roomurl",
      data: {
        protection: true,
        groupid: parseInt(this.data.roomid)
      },
      header: {
        "content-type": "application/json"
      },
      method: "POST",
      success: function (res) {
        console.log(res.data.data)
        if (res.statusCode == 200) {
          // liteav推的流，播放地址hardcode
          if (that.data.roomid == 76432) {
            that.setData({
              playUrl: {
                front: "rtmp://3891.liveplay.myqcloud.com/live/3891_rtmp_wawaji_front?bizid=3891&txSecret=156bf99042cdf9f6664b94f354074d43&txTime=6CDD5425",
                side: "rtmp://3891.liveplay.myqcloud.com/live/3891_rtmp_wawaji_side?bizid=3891&txSecret=726e142bc6afa2f678786af831328b92&txTime=6CDD5425",
              }
            });
          } else {
            that.setData({
              playUrl: res.data.data
            });
          }

        } else {
          wx.showToast({
            title: 'get roomurl error' + res.statusCode,
          })
        }
      },
      fail: function () {
        wx.showToast({
          title: 'get roomurl fail',
        })
      },
    })

    this.data.audioCtx.play()
    var context = this.data.canvasContext;
    var context_side = this.data.canvasContext_side;

    //获取屏幕宽度
    var screenWidth = 320;
    var pixelRatio = 2;
    try {
      var res = wx.getSystemInfoSync()
      screenWidth = res.windowWidth
      pixelRatio = res.pixelRatio
    } catch (e) {
      // Do something when catch error
    }

    //画操作按钮
    var icon_width = 50;
    var catch_width = 100;
    var margin = (screenWidth - 3 * icon_width - catch_width) / 4;
    var coor = {
      btn_left: { x: margin, y: 100 - icon_width / 2, width: icon_width, height: icon_width, },
      btn_right: { x: margin + icon_width * 2, y: 100 - icon_width / 2, width: icon_width, height: icon_width, },
      btn_up: { x: margin + icon_width, y: 100 - icon_width - 10, width: icon_width, height: icon_width, },
      btn_down: { x: margin + icon_width, y: 100 + 10, width: icon_width, height: icon_width, },
      btn_catch: { x: screenWidth - catch_width - margin, y: 100 - catch_width / 2, width: catch_width, height: catch_width, },
    }

    context.drawImage('../../Resources/control_left.png', coor.btn_left.x, coor.btn_left.y, coor.btn_left.width, coor.btn_left.height);
    context.drawImage('../../Resources/control_right.png', coor.btn_right.x, coor.btn_right.y, coor.btn_right.width, coor.btn_right.height);
    context.drawImage('../../Resources/control_up.png', coor.btn_up.x, coor.btn_up.y, coor.btn_up.width, coor.btn_up.height);
    context.drawImage('../../Resources/control_down.png', coor.btn_down.x, coor.btn_down.y, coor.btn_down.width, coor.btn_down.height);
    context.drawImage('../../Resources/catch.png', coor.btn_catch.x, coor.btn_catch.y, coor.btn_catch.width, coor.btn_catch.height);

    context_side.drawImage('../../Resources/control_left.png', coor.btn_left.x, coor.btn_left.y, coor.btn_left.width, coor.btn_left.height);
    context_side.drawImage('../../Resources/control_right.png', coor.btn_right.x, coor.btn_right.y, coor.btn_right.width, coor.btn_right.height);
    context_side.drawImage('../../Resources/control_up.png', coor.btn_up.x, coor.btn_up.y, coor.btn_up.width, coor.btn_up.height);
    context_side.drawImage('../../Resources/control_down.png', coor.btn_down.x, coor.btn_down.y, coor.btn_down.width, coor.btn_down.height);
    context_side.drawImage('../../Resources/catch.png', coor.btn_catch.x, coor.btn_catch.y, coor.btn_catch.width, coor.btn_catch.height);

    //保存坐标位置，响应touch时好区分
    this.data.controlCoordinate = coor;
    context.draw()
    context_side.draw()
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

  }
})