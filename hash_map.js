/*********************************************************************************
 * node_cache nodejs缓存服务
 * 文件说明：hashMap实现 参考java hashMap
 *-------------------------------------------------------------------------------
 * 版权所有: CopyRight By initphp.com
 * 您可以自由使用该源码，但是在使用过程中，请保留作者信息。尊重他人劳动成果就是尊重自己
 *-------------------------------------------------------------------------------
 * $Author:zhuli
 * $Dtime:2012-9-9
***********************************************************************************/
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
					return obj.value;
				}
			}
			addEntry(hash, key, value, index);
		}
		return false;
	}

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
	}

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
	}

	/*	
	 * 清空hashtable操作
	 * 参数：
	 * key  : key值
	 */
	this.clear = function () {
		hash_table = null;
		hash_table = new Array(hash_table_length);
		total_size = 0;
		return hash_table;
	}

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
	}

	/*	
	 * 返回hashMap长度
	 */
	this.size = function () {
		return total_size;
	}

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
	}

	/*	
	 *	经过该函数得到 哈希表 哈希地址
	 */
	var indexFor = function (hash, length) {
		return hash & (length - 1);
	}

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
}

module.exports = hash_map;