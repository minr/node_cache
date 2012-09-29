/*********************************************************************************
 * node_cache nodejs缓存服务
 * 文件说明：实现TCP服务器
 *-------------------------------------------------------------------------------
 * 版权所有: CopyRight By initphp.com
 * 您可以自由使用该源码，但是在使用过程中，请保留作者信息。尊重他人劳动成果就是尊重自己
 *-------------------------------------------------------------------------------
 * $Author:zhuli
 * $Dtime:2012-9-9
***********************************************************************************/
var tcp_server = function () {

	var net = require("net"); 
	var port= 27016;
	var buf = {};
	var buffer = new Buffer(1024 * 1024 * 100);

	var operate_api = require('./operate_api');
	var operate_api = new operate_api;

	/*	
	 *	运行node_cache缓存服务器
	 */
	this.init = function () {
		operate_api.init();

		var server = net.createServer(function(socket) {
			var commandArr = []; //存放指令
			socket.write('hello, welcome to node_cache, you can command help');
			socket.on("data", function(data) { // 接收到客户端数据
				if (data == '\r\n') {
					var result = parseCommand(commandArr, socket);
					socket.write(result.toString() + '\r\n');
					commandArr = [];
				} else {
					commandArr.push(data);
				}	
			});
		}).listen(port);
		console.log('Tcp Server is Start, port:' + port);
	};

	var parseCommand = function (commandArr, socket) {
		var commandStr = commandArr.join('').toString();
		commandStr = commandStr.trim();
		commandBuf = [];
		commandBuf = commandStr.split(/\s+/g);
		if (commandBuf[0] == 'exit') {
			socket.end('bye');
		} else if (commandBuf[0] == 'set') {
			return operate_api.set(commandBuf[1], commandBuf[2], commandBuf[3]);
		} else if (commandBuf[0] == 'get')  {
			return operate_api.get(commandBuf[1]);
		} else if (commandBuf[0] == 'flush')  {
			return operate_api.flush();
		} else if (commandBuf[0] == 'remove') {
			return operate_api.remove(commandBuf[1]);
		} else if (commandBuf[0] == 'status') {
			return operate_api.status();
		}
		return true;
	}


}

module.exports = tcp_server;