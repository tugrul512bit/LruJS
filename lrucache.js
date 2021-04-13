'use strict';
/* 
cacheSize: number of elements in cache, constant, must be greater than or equal to number of asynchronous accessors / cache misses
callbackBackingStoreLoad: user-given cache-miss function to load data from datastore
elementLifeTimeMs: maximum miliseconds before an element is invalidated, only invalidated at next get() call with its key
*/

let Lru = function(cacheSize,callbackBackingStoreLoad,elementLifeTimeMs=1000){
	const me = this;
	
	const maxWait = elementLifeTimeMs;
	const size = parseInt(cacheSize,10);
	const mapping = {};
	const mappingInFlightMiss = {};
	const bufData = new Array(size);
	const bufVisited = new Uint8Array(size);
	const bufKey = new Array(size);
	const bufTime = new Float64Array(size);
	const bufLocked = new Uint8Array(size);
	for(let i=0;i<size;i++)
	{
		let rnd = Math.random();
		mapping[rnd] = i;
		
		bufData[i]="";
		bufVisited[i]=0;
		bufKey[i]=rnd;
		bufTime[i]=0;
		bufLocked[i]=0;
	}
	let ctr = 0;
	let ctrEvict = parseInt(cacheSize/2,10);
	const loadData = callbackBackingStoreLoad;
	let inFlightMissCtr = 0;
	this.reload=function(){
		for(let i=0;i<size;i++)
		{
			bufTime[i]=0;
		}
	};
	this.get = function(keyPrm,callbackPrm){
		const key = keyPrm;
		const callback = callbackPrm;
		
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
			let slot = mapping[key];
			// RAM speed data
			if((Date.now() - bufTime[slot]) > maxWait)
			{
				
				if(bufLocked[slot])
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
				bufVisited[slot]=1;
				bufTime[slot] = Date.now();
				callback(bufData[slot]);
			}
		}
		else
		{
			// datastore loading + cache eviction
			let ctrFound = -1;
			while(ctrFound===-1)
			{
				// give slot a second chance before eviction
				if(!bufLocked[ctr] && bufVisited[ctr])
				{
					bufVisited[ctr]=0;
				}
				ctr++;
				if(ctr >= size)
				{
					ctr=0;
				}

				// eviction conditions
				if(!bufLocked[ctrEvict] && !bufVisited[ctrEvict])
				{
					// evict
					bufLocked[ctrEvict] = 1;
					inFlightMissCtr++;
					ctrFound = ctrEvict;
				}

				ctrEvict++;
				if(ctrEvict >= size)
				{
					ctrEvict=0;
				}
			}
			
			mappingInFlightMiss[key]=1;
			let f = function(res){
				delete mapping[bufKey[ctrFound]];

				bufData[ctrFound]=res;
				bufVisited[ctrFound]=0;
				bufKey[ctrFound]=key;
				bufTime[ctrFound]=Date.now();
				bufLocked[ctrFound]=0;

				mapping[key] = ctrFound;
				callback(bufData[ctrFound]);
				inFlightMissCtr--;
				delete mappingInFlightMiss[key];		
			};
			loadData(key,f);

		}
	};
};

exports.Lru = Lru;
