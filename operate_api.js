/*********************************************************************************
 * node_cache nodejs缓存服务
 * 文件说明：提供对外操作的api
 *-------------------------------------------------------------------------------
 * 版权所有: CopyRight By initphp.com
 * 您可以自由使用该源码，但是在使用过程中，请保留作者信息。尊重他人劳动成果就是尊重自己
 *-------------------------------------------------------------------------------
 * $Author:zhuli
 * $Dtime:2012-9-9
***********************************************************************************/
var operate_api = function () {

	var hash_map = require('./hash_map');
	var hash_map = new hash_map;
	var mem = require('./mem');
	var mem_slab = new mem;
	

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
		if (key == undefined || value == undefined) return false;
		expires = (expires == undefined) ? 0 : parseInt(expires);
		
		var item = hash_map.get(key);
		if (item) {
			hash_map.remove(item);
		}
		
		var ret = mem_slab.set(value, expires);
		if (!ret) return false;
		return hash_map.put(key, ret);
	}

	/*	
	 * 获取值
	 * 结构：
	 * key : 键
	 */
	this.get = function (key) {
		if (key == undefined) return false;
		var item = hash_map.get(key);
		if (!item) return false;
		return mem_slab.get(item);
	}
	
	/*	
	 * 删除值
	 */
	this.remove = function (key) {
		if (key == undefined) return false;
		var item = hash_map.get(key);
		if (!item) return true;
		hash_map.remove(key);
		return mem_slab.remove(key);
	}	

}

module.exports = operate_api;