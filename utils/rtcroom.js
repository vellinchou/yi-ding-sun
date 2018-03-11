/**
 * @file rtcroom.js 多人音视频房间管理sdk
 * @author binniexu
 */

var webim = require('webim_wx.js');
var webimhandler = require('webim_handler.js');
var tls = require('tls.js');
var encrypt = require('encrypt.js');

var serverDomain = 'https://api.nilecom.cn/cloudunicomm/video.do?func=',		// 后台域名
	heart = '',				// 判断心跳变量
	requestSeq = 0,			// 请求id
	requestTask = [],		// 请求task
	// 用户信息
	accountInfo = {
		userID: '',			// 用户ID
		userName: '',		// 用户昵称
		userAvatar: '',		// 用户头像URL
		userSig: '',		// IM登录凭证
		sdkAppID: '',		// IM应用ID
		accountType: '',	// 账号集成类型
		accountMode: 0,		//帐号模式，0-表示独立模式，1-表示托管模式		
	},
	// 房间信息
	roomInfo = {
		roomID: '',			// 视频位房间ID
		roomName: '',		// 房间名称
		mixedPlayURL: '', 	// 混流地址
		pushers: [],		// 当前用户信息
		isDestory: false	// 是否已解散
	},
	// 事件
	event = {
		onGetPusherList: function () { },		// 初始化成员列表
		onPusherJoin: function () { },			// 进房通知
		onPhserQuit: function () { },			// 退房通知
		onRoomClose: function() {},				// 群解散通知
		onRecvRoomTextMsg: function() {}		// 消息通知
	};

// 随机昵称
var userName = ['林静晓','陆杨','江辰','付小司','陈小希','吴柏松','肖奈','老胡','江锐','立夏'];
// 请求数
var requestNum = 0; 	

/**
 * [request 封装request请求]
 * @param {options}
 *   url: 请求接口url
 *   data: 请求参数
 *   success: 成功回调
 *   fail: 失败回调
 *   complete: 完成回调
 */
function request(options) {
	if(!serverDomain) {
		console.log('请设置serverDomain');
		options.fail && options.fail({
			errCode: -9,
			errMsg: '请设置serverDomain'
		});
		return;
	}
	requestNum++;
	// console.log('requestNum: ',requestNum);
	requestTask[requestSeq++] = wx.request({
		url: serverDomain + options.url, 
		data: options.data || {},
		method: 'POST',
		header: {
      'content-type': 'application/x-www-form-urlencoded' // 默认值
		},
		// dataType: 'json',
		success: options.success || function() {},
		fail: options.fail || function() {},
		complete: options.complete || function() {
			requestNum--;
			// console.log('complete requestNum: ',requestNum);
		}
	});
}

/**
 * [init 初始化登录信息]
 * @param {options}
 *   data: {
 *   	serverDomain: 请求域名
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 *       
 * @return success 
 *   userName: 用户昵称
 */
function init(options) {
	if(!options || !options.data.serverDomain) {
		console.log('init参数错误',options);
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'init参数错误'
		});
		return;
	}
	serverDomain = options.data.serverDomain;
	accountInfo.userID = options.data.userID;
	accountInfo.userSig = options.data.userSig;
	accountInfo.sdkAppID = options.data.sdkAppID;
	accountInfo.accountType = options.data.accType;
	accountInfo.userName = userName[Math.floor(Math.random()*10)] || accountInfo.userID;
	accountInfo.userAvatar = '123';
	options.success && options.success({
		userName: accountInfo.userName
	});

  console.log('ftc.init === options')
  console.log(options)
  console.log(accountInfo)
}

/**
 * [loginIM 登录IM]
 * @param {options}
 *   data: {
 *   	roomID: 房间ID
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 */
function loginIM(options) {
	roomInfo.isDestory = false;
	// 初始化设置参数
	webimhandler.init({
		accountMode: accountInfo.accountMode,
		accountType: accountInfo.accountType,
		sdkAppID: accountInfo.sdkAppID,
		avChatRoomId: options.roomID,
		selType: webim.SESSION_TYPE.GROUP,
		selToID: options.roomID,
		selSess: null //当前聊天会话
	});
	//当前用户身份
	var loginInfo = {
		'sdkAppID': accountInfo.sdkAppID, //用户所属应用id,必填
		'appIDAt3rd': accountInfo.sdkAppID, //用户所属应用id，必填
		'accountType': accountInfo.accountType, //用户所属应用帐号类型，必填
		'identifier': accountInfo.userID, //当前用户ID,必须是否字符串类型，选填
		'identifierNick': accountInfo.userID, //当前用户昵称，选填
		'userSig': accountInfo.userSig, //当前用户身份凭证，必须是字符串类型，选填
	};
	//监听（多终端同步）群系统消息方法，方法都定义在demo_group_notice.js文件中
	var onGroupSystemNotifys = {
		// 群被解散(全员接收)
		"5": function(notify) {
			roomInfo.isDestory = true;
			event.onRoomClose({});
		},
		"11": webimhandler.onRevokeGroupNotify, //群已被回收(全员接收)
		// 用户自定义通知(默认全员接收)
		"255": function(notify) {
			console.error('收到系统通知：',notify.UserDefinedField);
			var content = JSON.parse(notify.UserDefinedField);
			if(!roomInfo.isDestory && content && content.cmd == 'notifyPusherChange') {
				mergePushers();
			}
		} 
	};

	//监听连接状态回调变化事件
	var onConnNotify = function (resp) {
		switch (resp.ErrorCode) {
			case webim.CONNECTION_STATUS.ON:
				//webim.Log.warn('连接状态正常...');
				break;
			case webim.CONNECTION_STATUS.OFF:
				webim.Log.warn('连接已断开，无法收到新消息，请检查下你的网络是否正常');
				break;
			default:
				webim.Log.error('未知连接状态,status=' + resp.ErrorCode);
				break;
		}
	};

	//监听事件
	var listeners = {
		"onConnNotify": webimhandler.onConnNotify, //选填
		"onBigGroupMsgNotify": function (msg) {
			webimhandler.onBigGroupMsgNotify(msg, function (msgs) {
				receiveMsg(msgs);
			})
		}, //监听新消息(大群)事件，必填
		"onMsgNotify": webimhandler.onMsgNotify, //监听新消息(私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息)事件，必填
		"onGroupSystemNotifys": onGroupSystemNotifys, //监听（多终端同步）群系统消息事件，必填
		"onGroupInfoChangeNotify": webimhandler.onGroupInfoChangeNotify,
		// 'onKickedEventCall': self.onKickedEventCall // 踢人操作
	};

	//其他对象，选填
	var others = {
		'isAccessFormalEnv': true, //是否访问正式环境，默认访问正式，选填
		'isLogOn': false //是否开启控制台打印日志,默认开启，选填
	};

	if (accountInfo.accountMode == 1) { //托管模式
		webimhandler.sdkLogin(loginInfo, listeners, others, 0, afterLoginIM, options);
	} else { //独立模式
		//sdk登录
		webimhandler.sdkLogin(loginInfo, listeners, others, 0, afterLoginIM, options);
	}
}
function afterLoginIM(options) {
	if(options.errCode) {
		// webim登录失败
		console.log('webim登录失败:',options);
		options.callback.fail && options.callback.fail({
			errCode: -2,
			errMsg: '登录失败'
		});
		return;
	}
	// webim登录成功
	console.log('2.webim登录成功');
	webimhandler.applyJoinBigGroup(roomInfo.roomID, afterJoinBigGroup, {
		success: options.callback.success,
		fail: options.callback.fail
	});
}
function afterJoinBigGroup(options) {
	if(options.errCode) {
		console.log('webim进群失败: ',options);
		options.callback.fail && options.callback.fail({
			errCode: -2,
			errMsg: '登录失败'
		});
		return;
	}
	console.log('进入IM房间成功: ',roomInfo.roomID);
	options.callback.success && options.callback.success({});
}

/**
 * [receiveMsg 接收消息处理]
 * @param {options}
 *
 * @return event.onRecvRoomTextMsg 
 *   roomID: 房间ID
 *   userID: 用户ID
 *   nickName: 用户昵称
 *   headPic: 用户头像
 *   textMsg: 文本消息
 *   time: 消息时间
 */
function receiveMsg(msg) {
	if (!msg.content) {  return; }
	console.log('IM消息: ',msg);
	if(msg.fromAccountNick == '@TIM#SYSTEM') {
		msg.fromAccountNick = '';
		msg.content = msg.content.split(';');
		msg.content = msg.content[0];
		msg.time = '';
	} else { 
		var time = new Date();
		var h = time.getHours()+'', m = time.getMinutes()+'', s = time.getSeconds()+'';
		h.length == 1 ? (h='0'+h) : '';
		m.length == 1 ? (m='0'+m) : '';
		s.length == 1 ? (s='0'+s) : '';
		time = h + ':' + m + ':' + s;
		msg.time = time;
		var contentObj,newContent;
		newContent = msg.content.split('}}');
		contentObj = JSON.parse(newContent[0] + '}}');
		if(contentObj.cmd == 'CustomTextMsg') {
			msg.nickName = contentObj.data.nickName;
			msg.headPic = contentObj.data.headPic;
			var content = '';
			for(var i = 1; i < newContent.length; i++) {
				if(i == newContent.length - 1) 
					content += newContent[i];
				else content += newContent[i] + '}}';
			}
			msg.content = content;
		}
	}
	event.onRecvRoomTextMsg({
		roomID: roomInfo.roomID,
		userID: msg.fromAccountNick,
		nickName: msg.nickName,
		headPic: msg.headPic,
		textMsg: msg.content,
		time: msg.time
	});
};

/**
 * [sendRoomTextMsg 发送文本消息]
 * @param {options}
 *   data: {
 *   	msg: 文本消息
 *   }
 */
function sendRoomTextMsg(options) {
	if(!options || !options.data.msg || !options.data.msg.replace(/^\s*|\s*$/g, '')) {
		console.log('sendRoomTextMsg参数错误',options);
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'sendRoomTextMsg参数错误'
		});
		return;
	}
	webimhandler.sendCustomMsg({
		data: '{"cmd":"CustomTextMsg","data":{"nickName":"'+accountInfo.userName+'","headPic":"'+accountInfo.userAvatar+'"}}',
		text: options.data.msg
	},function() {
		options.success && options.success();
	});
}

/**
 * [mergePushers pushers merge操作]
 * @param {options}
 *
 * @return event.onPusherJoin 
 *   pushers: 进房人员列表
 *   
 * @return event.onPhserQuit
 *   pushers: 退房人员列表
 */
function mergePushers() {
	getPushers({
		type: 1,
		success: function(ret) {
			/**
			 * enterPushers：新进推流人员信息
			 * leavePushers：退出推流人员信息
			 * ishave：用于判断去重操作
			 */
			var enterPushers = [],leavePushers = [],ishave = 0;
			console.log('去重操作');
			console.log('旧',roomInfo.pushers);
			console.log('新',ret.pushers);
			ret.pushers.forEach(function(val1){
				ishave = 0;
				roomInfo.pushers.forEach(function(val2) {
					if(val1.userID == val2.userID) {
						ishave = 1;
					}
				});
				if(!ishave)
					enterPushers.push(val1);
				ishave = 0;
			});
			roomInfo.pushers.forEach(function(val1) {
				ishave = 0;
				ret.pushers.forEach(function(val2) {
					if(val1.userID == val2.userID) {
						ishave = 1;
					}
				});
				if(!ishave)
					leavePushers.push(val1);
				ishave = 0;
			});
			// 重置roomInfo.pushers
			roomInfo.pushers = ret.pushers;
			// 通知有人进入房间
			if(enterPushers.length) {
				event.onPusherJoin({
					pushers: enterPushers
				});
			}
			// 通知有人退出房间
			if(leavePushers.length) {
				event.onPhserQuit({
					pushers: leavePushers
				});
			}
		},
		fail: function(ret) {
			event.onRoomClose({
				errCode: ret.errCode,
				errMsg: ret.errMsg
			});
		}
	});
};

/**
 * [pusherHeartBeat 推流者心跳]
 * @param {options}
 */
function pusherHeartBeat(options) {
	if(options) {
		setTimeout(function(){
			proto_pusherHeartBeat();
		},3000);
	}
	if(heart) {
		setTimeout(function(){
			proto_pusherHeartBeat();
			pusherHeartBeat();
		},7000);
	}
}
function proto_pusherHeartBeat(){
	console.log('心跳请求');
	request({
		url: 'pusher_heartbeat',
		data: {
			roomID: roomInfo.roomID,
			userID: accountInfo.userID
		},
		success: function(ret) {
			if(ret.data.code) {
				console.log('心跳失败：',ret);
				return;
			}
			console.log('心跳成功',ret);
		},
		fail: function(ret) {
			console.log('心跳失败：',ret);
		}
	});
}

/**
 * [stopPusherHeartBeat 停止推流者心跳]
 * @param {options}
 */
function stopPusherHeartBeat() {
	heart = false;
}

/**
 * [getRoomList 获取房间列表]
 * @param {options}
 *   data: {
 *   	index: 获取的房间开始索引，从0开始计算
 *   	cnt: 获取的房间个数
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 *
 * @return success
 *   rooms: 房间列表信息
 */
function getRoomList(options) {
	if(!options) { 
		console.log('getRoomList参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'getRoomList参数错误'
		});
		return; 
	}
	request({
    url: 'free_room',   // 获取nile free_roomrtc
		data: {

			index: options.data.index || 0,
			cnt: options.data.cnt || 20
		},
		success: function(ret) {
			if(ret.data.code) {
				console.log('获取房间列表失败: ',ret);
				options.fail && options.fail({
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});
				return;
			}
			options.success && options.success({
				rooms: ret.data.room
			});
		},
		fail: function(ret) {
			console.log('获取房间列表失败: ',ret);
			if(ret.errMsg == 'request:fail timeout') {
				var errCode = -1;
				var errMsg = '网络请求超时，请检查网络设置';
			}
			options.fail && options.fail({
				errCode: errCode || -1,
				errMsg: errMsg || '获取房间列表失败'
			});
		}
	});
}

/**
 * 
 * [getPushURL 获取推流地址]
 * @param {options}
 *   success: 成功回调
 *   fail: 失败回调
 *
 * @return success
 *   pushURL: 推流地址
 */
function getPushURL(options) {
	if(!options) { 
		console.log('getPushURL参数错误',options);
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'getPushURL参数错误'
		});
		return; 
	}
	request({
		url: 'get_push_url',
		data: {
			userID: accountInfo.userID
		},
		success: function(ret) {
			if(ret.data.code) {
				console.log('获取推流地址失败: ',ret);
				options.fail && options.fail({  
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});	
				return;
			}
			console.log('获取推流地址成功：',ret.data.pushURL);
			options.success && options.success({
				pushURL: ret.data.pushURL
			});
		},
		fail: function(ret) {
			if(ret.errMsg == 'request:fail timeout') {
				var errCode = -1;
				var errMsg = '网络请求超时，请检查网络设置';
			}
			options.fail && options.fail({  
				errCode: errCode || -3,
				errMsg: errMsg || '获取推流地址失败'
			});	
		}
	});
};

/**
 * [getPushers 拉取所有主播信息]
 * @param {options}
 *   success: 成功回调
 *   fail: 失败回调
 *
 * @return success
 *   mixedPlayURL: 混流地址
 *   pushers: 房间成员
 */
function getPushers(options) {
	if(!options) { 
		console.log('getPushers参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'getPushers参数错误'
		});
		return; 
	}
	request({
    url: 'get_pushers&roomID=' + roomInfo.roomID,
		success: function(ret) {
			if(ret.data.code) {
				console.log('拉取所有主播信息失败: ',ret);
				options.fail && options.fail({  
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});	
				return;
			}
			console.log('拉取所有主播信息成功',ret.data.pushers);
			var returnPushers = [],isInRoom = 0;
			ret.data.pushers.forEach(function(val){
				if(val.userID != accountInfo.userID) {
					returnPushers.push(val);
				} else {
					isInRoom = 1;
				}
			});
			if(options.type && !isInRoom) {
				options.fail && options.fail({  
					errCode: -1,
					errMsg: '您已退群'
				});	
				return;
			}
			options.success && options.success({
				mixedPlayURL: ret.data.mixedPlayURL,
				pushers: returnPushers
			});
		},
		fail: function(ret) {
			if(ret.errMsg == 'request:fail timeout') {
				var errCode = -1;
				var errMsg = '网络请求超时，请检查网络设置';
			}
			options.fail && options.fail({  
				errCode: errCode || -1,
				errMsg: errMsg || '拉取所有主播信息失败'
			});	
		}
	});
}

/**
 * [setListener 设置监听事件]
 * @param {options}
 *   onGetPusherList: 初始化成员列表
 *   onPusherJoin: 进房通知
 *   onPhserQuit: 退房通知
 *   onRoomClose: 群解散通知
 *   onRecvRoomTextMsg: 消息通知
 */
function setListener(options) {
	if(!options) { console.log('setListener参数错误',options); return; }
	event.onGetPusherList = options.onGetPusherList || function () { };
	event.onPusherJoin = options.onPusherJoin || function () { };
	event.onPhserQuit = options.onPhserQuit || function () { };
	event.onRoomClose = options.onRoomClose || function() {};
	event.onRecvRoomTextMsg = options.onRecvRoomTextMsg  || function() {};
}

/**
 * [createRoom 创建房间]
 * @param {options}
 *   data: {
 *   	roomName: 房间名称
 *    	pushURL: 推流地址
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 */
function createRoom(options) {
	roomInfo.isDestory = false;
	if(!options || !options.data.roomName || !options.data.pushURL) { 
		console.log('createRoom参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'createRoom参数错误'
		});
		return; 
	}
	roomInfo.roomName = options.data.roomName;
	roomInfo.pushers = [];
	proto_createRoom(options);
}
function proto_createRoom(options) {
	request({
		url: 'create_room',
		data: {
			userID: accountInfo.userID,
			roomName: roomInfo.roomName,
			userName: accountInfo.userName,
			userAvatar: accountInfo.userAvatar,
			pushURL: options.data.pushURL
		},
		success: function(ret) {
			if(ret.data.code) {
				console.log('创建房间失败:',ret);
				options.fail && options.fail({
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});	
				return;
			}
			console.log('创建房间成功');
			roomInfo.roomID = ret.data.roomID;
			if(roomInfo.isDestory) {
				roomInfo.isDestory = false;
				exitRoom({});
				return;
			}
			// 开始心跳
			heart = true;
			pusherHeartBeat(1);
			console.log('开始IM: ',roomInfo.roomID);
			loginIM({
				roomID: roomInfo.roomID,
				success: options.success,
				fail: options.fail
			});
		},
		fail: function(ret) {
			console.log('创建后台房间失败:',ret);
			if(ret.errMsg == 'request:fail timeout') {
				var errCode = -1;
				var errMsg = '网络请求超时，请检查网络设置';
			}
			 options.fail && options.fail({  
				errCode: errCode || -3,
				errMsg: errMsg || '创建房间失败'
			});
		}
	});
}

/**
 * [joinPusher 加入推流]
 * @param {options}
 *   data: {  
 *   	roomID: 房间ID
 *   	pushURL: 推流地址
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 */
function joinPusher(options) {
	if(!options || !options.data.roomID || !options.data.pushURL) { 
		console.log('joinPusher参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'joinPusher参数错误'
		});
		return; 
	}
	roomInfo.roomID = options.data.roomID;
	proto_enterRoom(options);
}
function proto_enterRoom(options) {
	loginIM({
		roomID: roomInfo.roomID,
		success: function() {
			request({
				url: 'add_pusher',
				data: {
					roomID: roomInfo.roomID,
					userID: accountInfo.userID,
					userName: accountInfo.userName,
					userAvatar: accountInfo.userAvatar,
					pushURL: options.data.pushURL
				},
				success: function(ret) {
					if(ret.data.code) {
						console.log('加入推流失败:',ret);
						options.fail && options.fail({
							errCode: ret.data.code,
							errMsg: ret.data.message + '[' + ret.data.code + ']'
						});
						return;
					}
					console.log('加入推流成功');
					// 开始心跳
					heart = true;
					pusherHeartBeat(1);
				},
				fail: function(ret) {
					console.log('加入推流失败:',ret);
					if(ret.errMsg == 'request:fail timeout') {
						var errCode = -1;
						var errMsg = '网络请求超时，请检查网络设置';
					}
					options.fail && options.fail({
						errCode: errCode || -4,
						errMsg: errMsg || '加入推流失败'
					});
				}
			});
		},
		fail: options.fail
	});
	
}

/**
 * [enterRoom 进入房间]
 * @param {options}
 *   data: {  
 *   	roomID: 房间ID
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 */
function enterRoom(options) {
	if(!options || !options.data.roomID) { 
		console.log('enterRoom参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'enterRoom参数错误'
		});
		return; 
	}
	roomInfo.roomID = options.data.roomID;
	getPushers({
		success: function(ret) {
			roomInfo.mixedPlayURL = ret.mixedPlayURL;
			roomInfo.pushers = ret.pushers;
			options.success && options.success({});
			event.onGetPusherList({
				roomID: roomInfo.roomID,
				mixedPlayURL: roomInfo.mixedPlayURL,
				pushers: roomInfo.pushers
			});
		},
		fail: function(ret) {
			options.fail && options.fail({
				errCode: ret.errCode,
				errMsg: ret.errMsg || '拉取主播信息失败'
			});
		}
	});
}

/**
 * [clearRequest 中断请求]
 * @param {options}
 */
function clearRequest() {
	for(var i = 0; i < requestSeq; i++) {
		requestTask[i].abort();
	}
	requestTask = [];
	requestSeq = 0;
}

/**
 * [exitRoom 退出房间]
 * @param {options}
 */
function exitRoom(options) {
	// 停止心跳
	stopPusherHeartBeat();
	clearRequest();
	webimhandler.quitBigGroup();
	webimhandler.logout();
	if(roomInfo.isDestory) return;
	roomInfo.isDestory = true;
	request({
		url: 'delete_pusher',
		data: {
			roomID: roomInfo.roomID,
			userID: accountInfo.userID
		},
		success: function(ret) {
			if(ret.data.code) {
				console.log('退出推流失败:',ret);
				options.fail && options.fail({
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});
				return;
			}
			console.log('退出推流成功');
			roomInfo.roomID = '';
			options.success && options.success({});
		},
		fail: function(ret) {
			console.log('退出推流失败:',ret);
			if(ret.errMsg == 'request:fail timeout') {
				var errCode = -1;
				var errMsg = '网络请求超时，请检查网络设置';
			}
			options.fail && options.fail({
				errCode: errCode || -1,
				errMsg: errMsg || '退出推流失败'
			});
		}
	});
}

/**
 * 对外暴露函数
 * @type {Object}
 */
module.exports = {
	init: init,							// 初始化
	getRoomList: getRoomList,			// 拉取房间列表
	getPushURL: getPushURL,				// 拉取推流地址
	createRoom: createRoom,				// 创建房间
	enterRoom: enterRoom,				// 加入房间
	joinPusher: joinPusher,				// 加入推流
	exitRoom: exitRoom,					// 退出房间
	sendRoomTextMsg: sendRoomTextMsg,	// 发送文本消息
	setListener: setListener			// 设置监听事件
}