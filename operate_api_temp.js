var operate_api = function () {

	var hash_map = require('./hash_map');
	var hash_map = new hash_map;
	var mem_slab = require('./mem_slab');
	var mem_slab = new mem_slab;

	this.init = function () {
		mem_slab.init();
		var key = 'username';
		var value = 'zhuli';
		mem_slab.put('sadasdasda111111111111', 0);

		this.set('username', 'zhuli');
		console.log(this.get('username'));
		this.set('username2', 'zhuli111111112', 10);
		console.log(this.get('username2'));
		this.set('username2', 'zhuli111111111', 10);	
		console.log(this.get('username2'));
	
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
		var hashValue = hash_map.get(key); //获取hashValue，如果存在，先清空之前数据，再设置
		if (hashValue) {
			mem_slab.clear(hashValue);
		}
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
		var hashValue = hash_map.get(key);
		if (!hashValue) return false;
		hashValue.end = hashValue.start + hashValue.len;
		return mem_slab.get(hashValue);
	}	
}

module.exports = operate_api;