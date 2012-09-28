var operate_api = function () {

	var hash_map = require('./hash_map');
	var hash_map = new hash_map;
	var mem_slab = require('./mem_slab');
	var mem_slab = new mem_slab;
	

	this.init = function () {
		mem_slab.init();
	}

	/*	
	 * 设置数据
	 * 结构：
	 * key : 键
	 * value : 值
	 * expires : 缓存时间
	 */
	this.set = function (key, value, expires) {
		expires = (expires == undefined) ? 0 : parseInt(expires);
		var item = hash_map.get(key); //获取hashValue，如果存在，先清空之前数据，再设置
		if (item) mem_slab.remove(item);
		var result = mem_slab.put(value, expires);
		if (!result) return false;
		return hash_map.put(key, result);
	}

	/*	
	 * 获取值
	 * 结构：
	 * key : 键
	 */
	this.get = function (key) {
		var item = hash_map.get(key);
		if (!item) return false;
		return mem_slab.get(item);
	}

	/*	
	 * 删除值
	 * 结构：
	 * key : 键
	 */
	this.remove = function (key) {
		var item = hash_map.get(key);
		if (!item) return true;
		hash_map.remove(key);
		return mem_slab.remove(item);
	}	

}

module.exports = operate_api;