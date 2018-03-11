/**
 * @file liveroom.js 直播模式房间管理sdk
 * @author binniexu
 */
var webim = require('webim_wx.js');
var webimhandler = require('webim_handler.js');
var tls = require('tls.js');
var encrypt = require('encrypt.js');

var serverDomain = '',		// 后台域名
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
		isCreator: false,	// 是否为创建者
		pushers: [],		// 当前用户信息
		isLoginIM: false,	// 是否登录IM
		isJoinGroup: false,	// 是否加入群
		isDestory: false	// 是否已解散
	},
	// 事件
	event = {
		onRoomClose: function () { },		// 群解散通知
		onRecvRoomTextMsg: function () { }	// 接收消息
	};
// 随机昵称
var userName = ['林静晓', '陆杨', '江辰', '付小司', '陈小希', '吴柏松', '肖奈', '芦苇微微', '一笑奈何', '立夏'];
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
	if (!serverDomain) {
		console.log('请设置serverDomain');
		options.fail && options.fail({
			errCode: -9,
			errMsg: '请设置serverDomain'
		});
		return;
	}
	requestNum++;
	console.log('requestNum: ', requestNum);
	requestTask[requestSeq++] = wx.request({
		url: serverDomain + options.url,
		data: options.data || {},
		method: 'POST',
		header: {
			'content-type': 'application/json' // 默认值
		},
		// dataType: 'json',
		success: options.success || function () { },
		fail: options.fail || function () { },
		complete: options.complete || function () {
			requestNum--;
			console.log('complete requestNum: ', requestNum);
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
	if (!options || !options.data.serverDomain) {
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
		"5": function (notify) {
			roomInfo.isDestory = true;
			event.onRoomClose();
		},
		"11": webimhandler.onRevokeGroupNotify, //群已被回收(全员接收)
		// 用户自定义通知(默认全员接收)
		"255": function (notify) {
			console.error('收到系统通知：', notify.UserDefinedField);
			var content = JSON.parse(notify.UserDefinedField);
			if (content && content.cmd == 'notifyPusherChange') {
				
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
	if (options.errCode) {
		// webim登录失败
		console.log('webim登录失败:', options);
		options.callback.fail && options.callback.fail({
			errCode: -2,
			errMsg: '登录失败'
		});
		return;
	}
	// webim登录成功
	console.log('2.webim登录成功');
	roomInfo.isLoginIM = true;
	webimhandler.applyJoinBigGroup(roomInfo.roomID, afterJoinBigGroup, {
		success: options.callback.success,
		fail: options.callback.fail
	});
}
function afterJoinBigGroup(options) {
	if (options.errCode) {
		console.log('webim进群失败: ', options);
		options.callback.fail && options.callback.fail({
			errCode: -2,
			errMsg: '登录失败'
		});
		return;
	}
	roomInfo.isJoinGroup = true;
	console.log('进入IM房间成功: ', roomInfo.roomID);
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
	if (!msg.content) { return; }
	console.log('IM消息: ', msg);
	if (msg.fromAccountNick == '@TIM#SYSTEM') {
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
	if (!options || !options.data.msg || !options.data.msg.replace(/^\s*|\s*$/g, '')) {
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
 * [pusherHeartBeat 推流者心跳]
 * @param {options}
 */
function pusherHeartBeat(options) {
	if (options) {
		setTimeout(function () {
			proto_pusherHeartBeat();
		}, 3000);
	}
	if (heart) {
		setTimeout(function () {
			proto_pusherHeartBeat();
			pusherHeartBeat();
		}, 7000);
	}
}
function proto_pusherHeartBeat() {
	console.log('心跳请求');
	request({
		url: 'pusher_heartbeat',
		data: {
			roomID: roomInfo.roomID,
			userID: accountInfo.userID
		},
		success: function (ret) {
			if (ret.data.code) {
				console.log('心跳失败：', ret);
				return;
			}
			console.log('心跳成功', ret);
		},
		fail: function (ret) {
			console.log('心跳失败：', ret);
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
	if (!options) { 
		console.log('getRoomList参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'getRoomList参数错误'
		});
		return; 
	}
	request({
		url: 'get_room_list',
		data: {
			index: options.data.index || 0,
			cnt: options.data.cnt || 20
		},
		success: function (ret) {
			if (ret.data.code) {
				console.log('获取房间列表失败: ', ret);
				options.fail && options.fail({
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});
				return;
			}
			options.success && options.success({
				rooms: ret.data.rooms
			});
		},
		fail: function (ret) {
			console.log('获取房间列表失败: ', ret);
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
 * [getPushURL 获取推流地址]
 * @param {options}
 *   success: 成功回调
 *   fail: 失败回调
 *
 * @return success
 *   pushURL: 推流地址
 */
function getPushURL(options) {
	if (!options) { 
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
		success: function (ret) {
			if (ret.data.code) {
				console.log('获取推流地址失败: ', ret);
				options.fail && options.fail({
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});
				return;
			}
			console.log('获取推流地址成功：', ret.data.pushURL);
			options.success && options.success({
				pushURL: ret.data.pushURL
			});
		},
		fail: function (ret) {
			if(ret.errMsg == 'request:fail timeout') {
				var errCode = -1;
				var errMsg = '网络请求超时，请检查网络设置';
			}
			options.fail && options.fail({
				errCode: errCode || -1,
				errMsg: errMsg || '获取推流地址失败'
			});
		}
	});
};


/**
 * [setListener 设置监听事件]
 * @param {options}
 *   onRoomClose: 群解散通知
 *   onRecvRoomTextMsg: 消息通知
 */
function setListener(options) {
	if (!options) { console.log('setListener参数错误',options); return; }
	event.onRoomClose = options.onRoomClose || function () { };
	event.onRecvRoomTextMsg = options.onRecvRoomTextMsg || function () { };
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
	roomInfo.isCreator = true;
	roomInfo.isDestory = false;
	roomInfo.isLoginIM = false;
	roomInfo.isJoinGroup = false;
	if (!options || !options.data.roomName || !options.data.pushURL) { 
		console.log('createRoom参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'createRoom参数错误'
		});
		return; 
	}
	roomInfo.roomName = options.data.roomName;
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
		success: function (ret) {
			if (ret.data.code) {
				console.log('创建房间失败:', ret);
				options.fail && options.fail({
					errCode: ret.data.code,
					errMsg: ret.data.message + '[' + ret.data.code + ']'
				});
				return;
			}
			console.log('创建房间成功');
			roomInfo.roomID = ret.data.roomID;
			if (roomInfo.isDestory) {
				roomInfo.isDestory = false;
				destoryRoom({});
				return;
			}
			// 开始心跳
			heart = true;
			pusherHeartBeat(1);
			console.log('开始IM: ', roomInfo.roomID);
			loginIM({
				roomID: roomInfo.roomID,
				success: options.success,
				fail: options.fail
			});
		},
		fail: function (ret) {
			console.log('创建后台房间失败:', ret);
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
 * [enterRoom 进入房间]
 * @param {options}
 *   data: {  
 *   	roomID: 房间ID
 *   }
 *   success: 成功回调
 *   fail: 失败回调
 */
function enterRoom(options) {
	roomInfo.isCreator = false;
	roomInfo.isLoginIM = false;
	roomInfo.isJoinGroup = false;
	if (!options || !options.data.roomID) { 
		console.log('enterRoom参数错误',options); 
		options.fail && options.fail({
			errCode: -9,
			errMsg: 'enterRoom参数错误'
		});
		return; 
	}
	roomInfo.roomID = options.data.roomID;
	proto_enterRoom(options);
}
function proto_enterRoom(options) {
	console.log('开始IM: ', roomInfo.roomID);
	loginIM({
		roomID: roomInfo.roomID,
		success: options.success,
		fail: options.fail
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
	// webimhandler.clearSdk();
	if (roomInfo.isCreator) {
		destoryRoom(options);
	} else {
		leaveRoom(options);
	}
}

/**
 * [leaveRoom 退出房间]
 */
function leaveRoom(options) {
	// 停止心跳
	stopPusherHeartBeat();
	clearRequest();
	roomInfo.isJoinGroup && webimhandler.quitBigGroup();
	roomInfo.isLoginIM && webimhandler.logout();
}

/**
 * [destoryRoom 销毁房间]
 */
function destoryRoom(options) {
	// 停止心跳
	stopPusherHeartBeat();
	clearRequest();
	roomInfo.isJoinGroup && webimhandler.quitBigGroup();
	roomInfo.isLoginIM && webimhandler.logout();
	if(roomInfo.isDestory) return;
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
	exitRoom: exitRoom,					// 退出房间
	sendRoomTextMsg: sendRoomTextMsg,	// 发送文本消息
	setListener: setListener			// 设置监听事件
}