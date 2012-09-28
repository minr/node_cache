/*********************************************************************************
 * node_cache nodejs缓存服务
 * 文件说明：内存分片操作
 *-------------------------------------------------------------------------------
 * 版权所有: CopyRight By initphp.com
 * 您可以自由使用该源码，但是在使用过程中，请保留作者信息。尊重他人劳动成果就是尊重自己
 *-------------------------------------------------------------------------------
 * $Author:zhuli
 * $Dtime:2012-9-9
***********************************************************************************/
var mem_slab = function () {

	var page = 1024 * 1024; //分片大小 每个片默认1M大小

	var slab 		= new Array(); //分片容器，存放每个分片详细信息
	var slab_table 	= null; //片存储字段大小 对照表
	var slab_salt 	= 1.15; //存储字段大小密度 前一个page存储字段最大值 * slab_salt = 下一个page存储字段最大值
	var slab_start 	= 32; //片最小存储字段初始值

	var buffer_length	= 1024 * 1024 * 100; //内存存储长度
	var buffer 			= new Buffer(buffer_length); //存储容器
	var buffer_i		= 0; //分片记录ID


	this.init = function () {
		create_slab_table();
	}

	/*	
	 * 新增操作
	 */
	this.put = function (value, expires) {
		expires = parseInt(expires);
		var timestamp = get_timestamp();
		expires = timestamp + 1000 * expires;
		var len = value.length + 26;
		value = timestamp + '' + expires + value;

		var k = find_from_slab_table(len);

		if (!slab[k]) {
			creat_slab(k);
		}
		for (var i = 0; i < slab[k].length; i++) {
			var temp = slab[k][i];
			if (temp.clear_chunk.length > 0 ||　temp.chunk_i < temp.total_chunk) {
				break;
			} else if (temp.chunk_i == temp.total_chunk) {
				creat_slab(k);
			} else {
				continue;
			}
		}

		var temp = slab[k][i];
		if (temp.clear_chunk.length > 0) {
			var chunk_i = temp.clear_chunk.shift();
		} else {
			var chunk_i = temp.chunk_i;
			temp.chunk_i++;
		}
		var start = temp.start + slab_table[k] * chunk_i;
		var end   = temp.start + slab_table[k] * (chunk_i + 1);
		var result= buffer_set(value, start);
		if (!result) return false;

		var item = {
			'start' : start,
			'end' : end,
			'slab_k' : k,
			'buffer_i' : temp.buffer_i,
			'chunk_i' : chunk_i,
			'timestamp' : timestamp,
			'expires' : expires,
			'len' : len
		}
		console.log(slab);
		return item;
	}

	/*	
	 * 获取操作
	 */
	this.get = function (item) {
		item.end = item.start + item.len;
		var value = buffer_get(item.start, item.end);
		var mem_timestamp 	= value.substr(0, 13);
		var mem_expires 	= value.substr(13, 13);
		var mem_value 		= value.substr(26, (item.end - item.start));

		if (mem_timestamp == '0000000000000') {//缓存被清空
			return false;
		}
		if (item.timestamp != mem_timestamp || mem_expires != item.expires) { //如果缓存被占用
			return false;
		} else {
			if (mem_timestamp != mem_expires) {
				var this_time = get_timestamp();
				if (this_time > mem_expires) { //缓存失效
					this.remove(item); //清除
					return false;
				}
			}
			return mem_value;
		}
	}

	/*	
	 * 移除操作
	 */
	this.remove = function (item) {
		var value = '0000000000000' + '0000000000000';
		var result = buffer_set(value, item.start); //内存设置
		if (!result) return false;
		var temp = slab[item.slab_k];
		for (var i = 0; i < temp.length; i++) {
			if (temp[i].buffer_i == item.buffer_i) {
				var tempSlab = temp[i];
				break;
			}
		}
		if (!tempSlab) return true;
		tempSlab.clear_chunk.push(item.chunk_i);
		return true;
	}

	/*	
	 * 清除操作
	 */
	this.flush = function () {
		buffer 	= null;
		buffer 	= new Buffer(buffer_length); 
		slab  	= null;
		slab 	= new Array();
		buffer_i= 0;
		return true;
	}

	/*	
	 * 对内存进行分片
	 */
	var creat_slab = function (k) {
		var max = buffer_length / page;
		if ((buffer_i + 1) == max) {
			return false; //如果内存分配完毕，则
		} else {
			var start = buffer_i * page;
			var end	= (buffer_i + 1) * page;
			var item = {
				'buffer_i' : buffer_i, //内存分片id记录
				'start' : start, //内存起始点
				'end' : end, //内存结束点
				'clear_chunk' : [], //存放空闲内存块
				'chunk_i' : 0, //记录该slab中chunk使用情况
				'total_chunk' : Math.ceil(page / slab_table[k])  //总的chunk数量
			}
			if (!slab[k]) {
				slab[k] = new Array();
			}
			buffer_i++;
			slab[k].push(item);
			return true;
		}
	} 

	/*	
	 * 创建片存储字段大小对照表
	 * 只有在初始化的时候只创建一次
	 */
	var create_slab_table = function () {
		if (slab_table == null) {
			slab_table = new Array();
			var k = val = 0;
			do {
				var val =  Math.ceil(slab_start * Math.pow(slab_salt, k));
				if (val > page) val = page;
				slab_table[k] = val;
				k++;
			} while (val < page);
		}
	}

	/*	
	 * 折半算法查找数据长度所对应的存储内存块
	 * 参数：
	 * len  : 长度值
	 */
	var find_from_slab_table = function (len) {
		var start  = 0, end = slab_table.length, mid = 0;
		if (slab_table[slab_table.length] < len) { //超出最大长度
			return false;
		}
		while (start < end) {
			if (((start + end) % 2) == 0) {
				mid = (start + end) / 2;
			} else {
				mid = (start + end + 1) / 2;
			}
			if (mid == start || mid == end) {
				if (slab_table[start] <= len) {
					return end;
				} else {
					return start;
				}
			}
			if (slab_table[mid] < len) {
				start = mid;
			} else if (slab_table[mid] > len) {
				end = mid;
			} else {
				return mid;
			}
		}
	}

	/*	
	 * 内存数据设置
	 * 参数：
	 * value : 值
	 * start : 内存存储起始点
	 */
	var buffer_set = function (value, start) {
		return buffer.write(value, start, "utf8");
	}

	/*	
	 * 获取内存数据
	 * 参数：
	 * start : 起始点
	 * end : 结束点
	 */
	var buffer_get = function (start, end) {
		return buffer.toString("utf8", start, end);
	}

	/*	
	 * 获取时间戳
	 */
	var get_timestamp = function () {
		var timestamp = Date.parse(new Date());
		return timestamp;
	}


}
module.exports = mem_slab;