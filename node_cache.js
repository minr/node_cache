
/*	
 * mem 内存操作
 */
var mem = function () {
	
	var slab_start = 32;	//默认最小存储地址，默认32字节
	var slab_salt = 1.15;	//存储字段大小密度 前一个page存储字段最大值 * slab_salt = 下一个page存储字段最大值
	var page = 1024 * 1024;	//分片默认大小 每个片默认1M大小
	var slab_table = null;	//分片关系值对照表
	
	var slab = new Array(); //分片容器，存放每个分片详细信
	
	var max_reserve_buffer = 1024 * 1024 * 2; //后备内存数,主要用于内存分配完毕后临时分配的item容器
	reserve_buffer_info = {
		'item_id' : 0,
		'total_item' : Math.floor(max_reserve_buffer / page),
		'clear_time_list' : [], //自动清空列表，如果后备内存也被分配完，会从这个后备内存中通过算法计算出要被清空的item
	};
	
	var buffer_length = 1024 * 1024 * 2 + 1000; //内存存储长度
	var buffer = new Buffer(buffer_length + max_reserve_buffer); //存储容器
	var buffer_info			= {
		'mem_used' : 0,
		'mem_unused' : buffer_length,
		'item_id' : 0,
		'last_update_time' : 0,
		'start_time' : 0,
		'total_slab' : 0,
		'total_item' : Math.floor(buffer_length / page),
		'cmd_get' : 0,
		'cmd_set' : 0,
		'get_hits' : 0,
		'get_misses' : 0,
		'bytes_read' : 0,
		'bytes_written' : 0,
		'pid' : process.pid
	}; //存储容器详细信息
	
	this.init = function () {
		create_slab_table();
		console.log(this.set('asdasdasd111111111111111111111111', 10));
	}
	
	this.set = function (value, expires) {
		value 	= value.toString();
		expires = parseInt(expires);
		var timestamp = get_timestamp();
		expires = timestamp + 1000 * expires;
		var len = value.length;
		
		var k = find_from_slab_table(len);
		return k;
	}
	
	/*	
	 * 创建分片容器，该容器是一个数组，根据slab_table的k值关系存储
	 * slab[k] 存放（例如0-32字段长度存储块）的buffer分割后的item
	 * （将buffer分割成大小1M的数据段，并标上id号）容器
	 * item被分配到各自的slab后，将不再回收和重建
	 */
	var create_slab = function (k) {
		var max = buffer_info.total_item;
		var item_id = buffer_info.item_id;
		if (item_id == max) { //如果item分配完毕，则启动后备内存分配和清理机制
			return create_reserve_slab(k);
		} else {
			var mem_start = item_id *　page;
			var mem_end	= (item_id + 1) * page;
			var timestamp = get_timestamp();
			var item = {
				'j' : 0, //chunk分配自动计数器
				'mem_start' : mem_start,
				'mem_end' : mem_end,
				'item_id' : item_id,	//itemid
				'len' : slab_table[k],	//该item存放的单位字符串长度
				'total_chunk' : Math.floor(page / slab_table[k]), //总chunk数
				'create_time' : timestamp,
				'last_update_time' : timestamp,
				'freelist' : [], //空闲模块管理，存放j的数组，在内存块失效后就会将j添加到这边来
				'used' : [], //已使用，数组格式，数组key值为j
				'is_reserve' : 0, //是否是后备的内存空间item，不是0，是1
			};
			
			//如果该slab还没初始化，则初始化为数组格式
			if (!slab[k]) { 
				slab[k] = new Array();
				buffer_info.total_slab++; 
			}
			
			buffer_info.item_id++;
			
			slab[k].push(item);
			return true;
		}
	}
	
	/*	
	 * 内存分配完毕后，将从后备的100M内存中进行分配item
	 * 由于已经分配的item是不回收和覆盖的，内存使用完毕之后，就会启动这个后备的内存块
	 * 如果后备内存块也分配完毕了，后备内存块就会进行lru策略，将不太使用的后备内存中的item给清除，分配给需要的模块
	 */
	var create_reserve_slab = function (k) {
		var item_id = reserve_buffer_info.item_id;
		var max = reserve_buffer_info.total_item;
		if (item_id == max) { //如果后备内存分配完毕，走lru清理机制
			item_id = lru_slab();
		}
		var start = (buffer.length - max_reserve_buffer);
		var mem_start = start + (item_id *　page); //内存起始点
		var mem_end	= start + (item_id + 1) * page;
		var timestamp = get_timestamp();
		
		var item = {
			'j' : 0, //chunk分配自动计数器
			'mem_start' : mem_start,
			'mem_end' : mem_end,
			'item_id' : item_id,	//itemid
			'len' : slab_table[k],	//该item存放的单位字符串长度
			'total_chunk' : Math.floor(page / slab_table[k]), //总chunk数
			'create_time' : timestamp,
			'last_update_time' : timestamp,
			'freelist' : [], //空闲模块管理，存放j的数组，在内存块失效后就会将j添加到这边来
			'used' : [], //已使用，数组格式，数组key值为j
			'is_reserve' : 1, //是否是后备的内存空间item，不是0，是1
		};
		
		//如果该slab还没初始化，则初始化为数组格式
		if (!slab[k]) { 
			slab[k] = new Array();
			buffer_info.total_slab++; 
		}
		
		reserve_buffer_info.item_id++;
		reserve_buffer_info.clear_time_list[item_id] = {
			'k' : k,
			'last_update_time' : timestamp
		};
		
		slab[k].push(item);
		return true;
	}
	
	/*	
	 * lru策略，清除最后更新时间最久的item
	 */
	var lru_slab = function () {
		var timestamp = get_timestamp();
		var clear_time_list = reserve_buffer_info.clear_time_list;
		var j = 0;
		var max = 0;
		for (var i  = 0; i < clear_time_list.length; i++) {
			var thisTime = timestamp - clear_time_list[i].last_update_time;
			if (i == 0) {
				j = i;
				max = timestamp - thisTime;
			} else {	
				if (max < thisTime) {
					max = thisTime;
					j = i;
				}	
			}
		}
		var k = clear_time_list[j].k;
		for (var z = 0; z < slab[k].length; z++) {
			var temp = slab[k][z];
			if (temp.is_reserve == 1 && temp.item_id == j) {
				delete(slab[k][z]);
				break;
			}
		}
		return j;
	}
	
	/*	
	 * 创建slab_table 分片存储字段字符串大小 关系对照表
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
			
			buffer_info.start_time = get_timestamp();
			
		}
	}

	/*	
	 * 折半算法查找数据长度所对应的存储chunk块长度
	 * 参数：
	 * len  : 长度值
	 * 返回：
	 * k : 分片对照表的key值，非常重要
	 * slab_table[k] 就可以获取存储chunk的长度值
	 */
	var find_from_slab_table = function (len) {
		len = parseInt(len);
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
	};
	
	/*	
	 * 获取时间戳
	 */
	var get_timestamp = function () {
		var timestamp = Date.parse(new Date());
		return timestamp;
	};
	
	/*	
	 * 内存数据设置
	 * 参数：
	 * value : 值
	 * start : 内存存储起始点
	 */
	var buffer_set = function (value, start) {
		return buffer.write(value, start, "utf8");
	};

	/*	
	 * 获取内存数据
	 * 参数：
	 * start : 起始点
	 * end : 结束点
	 */
	var buffer_get = function (start, end) {
		return buffer.toString("utf8", start, end);
	};
	
};

/*	
 * hash_map	用于缓存key => value对应的hash关系表
 */
var hash_map = function () {

	var hash_table_length = 1024 * 1024; //2的幂次方
	var hash_table = new Array(hash_table_length); //hashTable表
	var total_size = 0; //总长度

	/*	
	 * 新增hashmap值
	 * 参数：
	 * key  : key值
	 * value: 原始Value值
	 */
	this.put = function (key, value) {
		if (key != null) {
			var hash = hashCode(key); //进过hashCode，将key转化成整型
			var index = indexFor(hash, hash_table.length);
			//从冲突链表中查询KEY键是否存在，存在的话覆盖新值
			for (var obj = hash_table[index]; obj != null; obj = obj.next) {
				if (obj.hash == hash && obj.key == key) {
					obj.value = value;
					return true;
				}
			}
			addEntry(hash, key, value, index);
			return true;
		}
		return false;
	};

	/*	
	 * 获取hashmap对应值
	 * 参数：
	 * key  : key值
	 */
	this.get = function (key) {
		if (key != null) {
			var hash = hashCode(key); //进过hashCode，将key转化成整型
			var index = indexFor(hash, hash_table.length);
			for (var obj = hash_table[index]; obj != null; obj = obj.next) {
				if (obj.hash == hash && obj.key == key) {
					return obj.value;
				}
			}
		}
		return false;
	};

	/*	
	 * 删除一个hash值
	 * 参数：
	 * key  : key值
	 */
	this.remove = function (key) {
		if (key != null) {
			var hash  = hashCode(key); //进过hashCode，将key转化成整型
			var index = indexFor(hash, hash_table.length);
			var entry = hash_table[index];
			var e = entry;
			while (e != null) { //循环跑链表,将需要删除值的next对象放到前一个对象的next中
				var next = e.next;
				if (e.hash == hash && e.key == key) {
					if (entry == e) {
						hash_table[index] = next;
					} else {
						entry.next = next;
					}
					total_size--;
					return true;
				}
				entry = e;
				e = next;
			}
		} 
		return false;
	};

	/*	
	 * 清空hashtable操作
	 * 参数：
	 * key  : key值
	 */
	this.flush = function () {
		hash_table = null;
		hash_table = new Array(hash_table_length);
		total_size = 0;
		return hash_table;
	};

	/*	
	 * 判断KEY值是否存在
	 * 参数：
	 * key  : key值
	 */
	this.isSet = function (key) {
		if (key != null) {
			var hash = hashCode(key); //进过hashCode，将key转化成整型
			var index = indexFor(hash, hash_table.length);
			for (var obj = hash_table[index]; obj != null; obj = obj.next) {
				if (obj.hash == hash && obj.key == key) {
					return true;
				}
			}
		}
		return false;
	};

	/*	
	 * 返回hashMap长度
	 */
	this.size = function () {
		return total_size;
	};

	/*	
	 * 解决hash冲突的链表结构
	 * 参数：
	 * hash : hash值，key经过hashCode的值
	 * key  : key值
	 * value: 原始Value值
	 * index: hashTable 索引值
	 */
	var addEntry = function (hash, key, value, index) {
		 var entry = hash_table[index];
		 var item  = {
		 	"hash"	: hash,
		 	"key"  	: key,
		 	"value"	: value,
		 	"next"	: entry
		 };
		 hash_table[index] = item;
		 total_size++; //统计数据表总长度
	};

	/*	
	 *	经过该函数得到 哈希表 哈希地址
	 */
	var indexFor = function (hash, length) {
		return hash & (length - 1);
	};

	/*	
	 *	通过hashCode函数，将key转化成整型
	 */
	var hashCode = function (key) {
		var h = 0, off = 0;
		var length = key.length;
		for (var i = 0; i < length; i++) {
			var temp = key.charCodeAt(off++);
			h = 31 * h + temp;
			if (h > 0x7fffffff || h < 0x80000000) {
			    h = h & 0xffffffff;
			}
		}
		h ^= (h >>> 20) ^ (h >>> 12);
		return h ^ (h >>> 7) ^ (h >>> 4);
	};
};
var mem = new mem();
mem.init();