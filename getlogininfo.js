/**
 * 获取登录信息
 */
var rtcroom = require('./utils/rtcroom.js');
var liveroom = require('./utils/liveroom.js');
var config = require('./config.js');

function getLoginInfo(options) {
  wx.request({
    url: config.url + config.domain + 'get_im_login_info',
    data: { userIDPrefix: 'weixin' },
    method: 'POST',
    header: {
      'content-type': 'application/x-www-form-urlencoded' // 默认值
    },
    success: function (ret) {
      if (ret.data.code) {
        console.log('获取IM登录信息失败');
        options.fail && options.fail({
          errCode: ret.data.code,
          errMsg: ret.data.message + '[' + ret.data.code + ']'
        });
        return;
      }
      console.log('获取IM登录信息成功: ', ret.data);
      // ret.data.serverDomain = config.url + '/weapp/' + options.type + '/';
      ret.data.serverDomain = config.url + config.domain;
      switch (options.type) {
        case 'multi_room': {
          rtcroom.init({
            data: ret.data,
            success: options.success,
            fail: options.fail
          });
          
          break;
        }
        case 'double_room': {
          rtcroom.init({
            data: ret.data,
            success: options.success,
            fail: options.fail
          });
          break;
        }
        case 'live_room': {
          liveroom.init({
            data: ret.data,
            success: options.success,
            fail: options.fail
          });
          break;
        }
      }
    },
    fail: function (ret) {
      console.log(config.url + config.domain + 'get_im_login_info')
      console.log('获取IM登录信息失败: ', ret);
      if (ret.errMsg == 'request:fail timeout') {
        var errCode = -1;
        var errMsg = '网络请求超时，请检查网络设置';
      }
      options.fail && options.fail({
        errCode: errCode || -1,
        errMsg: errMsg || '获取IM登录信息失败'
      });
    }
  });
}

module.exports = {
  getLoginInfo: getLoginInfo
};