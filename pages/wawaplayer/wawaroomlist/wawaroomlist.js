// pages/wawaolayer/wawaroomlist/wawaroomlist.js

Page({
  data: {
    wawaroomList:{},
    customRoomid:"",
    buttonClicked:false,
  },
  onLoad: function () {
    var that = this
    wx.request({
      url: "https://sxb.qcloud.com/sxb_dev/?svc=doll&cmd=roomlist",
      data: {
        platform: 4
      },
      header: {
        "content-type": "application/json"
      },
      method: "POST",
      success: function (res) {
        console.log(res)
        if (res.statusCode == 200) {
          that.setData({
            wawaroomList: res.data.data
          })
        } else {
          wx.showToast({
            title: '拉取房间列表失败',
          })
        }
      },
      fail: function () {
        wx.showToast({
          title: '拉取房间列表失败',
        })
      }
    })
  },
  inputRoomid:function(e) {
    this.setData({
      customRoomid: e.detail.value
    })
  },
  buttonClicked: function (self) {
    self.setData({
      buttonClicked: true
    })
    setTimeout(function () {
      self.setData({
        buttonClicked: false
      })
    }, 500)
  },
  enterRoom:function(e) {
    if (this.data.buttonClicked) {
      return;
    } else {
      this.buttonClicked(this);
      var id = e.currentTarget.dataset.id;
      var sdkappid = e.currentTarget.dataset.sdkappid;
      wx.navigateTo({
        url: '../wawaroom/wawaroom?roomid=' + id + "&sdkappid=" + sdkappid
      })
    }
  }
})
