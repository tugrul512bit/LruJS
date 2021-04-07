'use strict';
let Lru = function(cacheSize,callbackBackingStoreLoad,elementLifeTimeMs=1000){
	let me = this;
	let maxWait = elementLifeTimeMs;
	let size = parseInt(cacheSize,10);
	let mapping = {};
	let buf = [];
	for(let i=0;i<size;i++)
	{
		let rnd = Math.random();
		mapping[rnd] = i;
		buf.push({data:"",visited:false, key:rnd, time:0, locked:false});
	}
	let ctr = 0;
	let ctrEvict = parseInt(cacheSize/2,10);
	let loadData = callbackBackingStoreLoad;
	this.get = function(key,callbackPrm){
		
		let callback = callbackPrm;
		if(key in mapping)
		{

			// RAM speed data
			if((Date.now() - buf[mapping[key]].time) > maxWait)
			{
				
				if(buf[mapping[key]].locked)
				{					
					setTimeout(function(){
						me.get(key,function(newData){
							callback(newData);
						});
					},0);
					return;
				}
				else
				{
					delete mapping[key];
					me.get(key,function(newData){
						callback(newData);
					});
					
				}
				
			}
			else
			{
				buf[mapping[key]].visited=true;
				buf[mapping[key]].time = Date.now();
				callback(buf[mapping[key]].data);
			}
		}
		else
		{
			// datastore loading + cache eviction
			let ctrFound = -1;
			while(ctrFound===-1)
			{
				if(!buf[ctr].locked && buf[ctr].visited)
				{
					buf[ctr].visited=false;
				}
				ctr++;
				if(ctr >= size)
				{
					ctr=0;
				}

				if(!buf[ctrEvict].locked && !buf[ctrEvict].visited)
				{
					// evict
					buf[ctrEvict].locked = true;
					ctrFound = ctrEvict;
				}

				ctrEvict++;
				if(ctrEvict >= size)
				{
					ctrEvict=0;
				}
			}
			delete mapping[buf[ctrFound].key];
			mapping[key] = ctrFound;
		
			loadData(key,function(res){
				buf[ctrFound] = {data: res, visited:false, key:key, time:Date.now(), locked:false};
				callback(buf[ctrFound].data);
				
			});

		}
	};
};

exports.Lru = Lru;
