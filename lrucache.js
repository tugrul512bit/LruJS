'use strict';
/* 
cacheSize: number of elements in cache, constant, must be greater than or equal to number of asynchronous accessors / cache misses
callbackBackingStoreLoad: user-given cache-miss function to load data from datastore
elementLifeTimeMs: maximum miliseconds before an element is invalidated, only invalidated at next get() call with its key
*/

let Lru = function(cacheSize,callbackBackingStoreLoad,elementLifeTimeMs=1000){
	let me = this;
	let maxWait = elementLifeTimeMs;
	let size = parseInt(cacheSize,10);
	let mapping = {};
	let mappingInFlightMiss = {};
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
	let inFlightMissCtr = 0;
	this.get = function(key,callbackPrm){
		
		let callback = callbackPrm;
		
		// stop dead-lock when many async get calls are made
		if(inFlightMissCtr>=size)
             	{
               		setTimeout(function(){
				me.get(key,function(newData){
					callback(newData);
				});
			},0);
               		return;
	     	}
		
		// delay the request towards end of the cache-miss completion
		if(key in mappingInFlightMiss)
		{

			setTimeout(function(){
				me.get(key,function(newData){
					callback(newData);
				});
			},0);
			return;
		}

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
				// give slot a second chance before eviction
				if(!buf[ctr].locked && buf[ctr].visited)
				{
					buf[ctr].visited=false;
				}
				ctr++;
				if(ctr >= size)
				{
					ctr=0;
				}

				// eviction conditions
				if(!buf[ctrEvict].locked && !buf[ctrEvict].visited)
				{
					// evict
					buf[ctrEvict].locked = true;
					inFlightMissCtr++;
					ctrFound = ctrEvict;
				}

				ctrEvict++;
				if(ctrEvict >= size)
				{
					ctrEvict=0;
				}
			}
			
			mappingInFlightMiss[key]=true;
			let f = function(res){
				delete mapping[buf[ctrFound].key];
				buf[ctrFound] = {data: res, visited:false, key:key, time:Date.now(), locked:false};
				mapping[key] = ctrFound;
				callback(buf[ctrFound].data);
				inFlightMissCtr--;
				delete mappingInFlightMiss[key];		
			};
			loadData(key,f);

		}
	};
};

exports.Lru = Lru;
