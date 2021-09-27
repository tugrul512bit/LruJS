'use strict';
/* 
cacheSize: number of elements in cache, constant, must be greater than or equal to number of asynchronous accessors / cache misses
callbackBackingStoreLoad: user-given cache-miss function to load data from datastore
elementLifeTimeMs: maximum miliseconds before an element is invalidated, only invalidated at next get() call with its key
reload: evicts all cache to reload new values from backing store
reloadKey: only evicts selected item (to reload its new value on next access)
*/

let Lru = function(cacheSize,callbackBackingStoreLoad,elementLifeTimeMs=1000,callbackBackingStoreSave){
	const me = this;
	const aTypeGet = 0;
	const aTypeSet = 1;
	const maxWait = elementLifeTimeMs;
	const size = parseInt(cacheSize,10);
	const mapping = {};
	const mappingInFlightMiss = {};
	const bufData = new Array(size);
	const bufVisited = new Uint8Array(size);

	// todo: add write-cache operations. set(key,value,callback) setMultiple(keys, values, callback) setAwaitable(key,value) setMultipleAwaitable(keys,values)
	const bufEdited = new Uint8Array(size);

	const bufKey = new Array(size);
	const bufTime = new Float64Array(size);
	const bufLocked = new Uint8Array(size);
	for(let i=0;i<size;i++)
	{
		let rnd = Math.random();
		mapping[rnd] = i;
		
		bufData[i]="";
		bufVisited[i]=0;
		bufEdited[i]=0;
		bufKey[i]=rnd;
		bufTime[i]=0;
		bufLocked[i]=0;
	}
	let ctr = 0;
	let ctrEvict = parseInt(cacheSize/2,10);
	const loadData = callbackBackingStoreLoad;
	const saveData = callbackBackingStoreSave;
	let inFlightMissCtr = 0;
	// refresh all items time-span in cache
	this.reload=function(){
		for(let i=0;i<size;i++)
		{
			bufTime[i]=0;
		}
	};
	// refresh item time-span in cache by triggering eviction
	this.reloadKey=function(key){
		if(key in mapping)
		{
			bufTime[mapping[key]]=0;
		}
	};

	// get value by key
	this.get = function(keyPrm,callbackPrm){
		// aType=0: get
		access(keyPrm,callbackPrm,aTypeGet);
	};

	// set value by key (callback returns same value)
	this.set = function(keyPrm,valuePrm,callbackPrm){
		// aType=1: set
		access(keyPrm,callbackPrm,aTypeSet,valuePrm);
	};
	
	// aType=0: get
	// aType=1: set
	function access(keyPrm,callbackPrm,aType,valuePrm){
		
		const key = keyPrm;
		const callback = callbackPrm;
		const value = valuePrm;
		// stop dead-lock when many async get calls are made
		if(inFlightMissCtr>=size)
             	{
               		setTimeout(function(){
				// get/set
				access(key,function(newData){
					callback(newData);
				},aType,value);
			},0);
               		return;
	     	}
		
		// if key is busy, then delay the request towards end of the cache-miss completion
		if(key in mappingInFlightMiss)
		{
			
			setTimeout(function(){
				// get/set
				access(key,function(newData){
					callback(newData);
				},aType,value);
			},0);
			return;
		}

		if(key in mapping)
		{
			// slot is an element in the circular buffer of CLOCK algorithm
			let slot = mapping[key];

			// RAM speed data
			if((Date.now() - bufTime[slot]) > maxWait)
			{
				
				// if slot is locked by another operation, postpone the current operation
				if(bufLocked[slot])
				{										
					setTimeout(function(){
						access(key,function(newData){
							callback(newData);
						},aType,value);
					},0);
					
				}
				else // slot is not locked and its lifespan has ended
				{
					// if it was edited, update the backing-store first
					if(bufEdited[slot] == 1)
					{
						bufLocked[slot] = 1;
						bufEdited[slot]=0;
						mappingInFlightMiss[key] = 1; // lock key
						inFlightMissCtr++;
						// update backing-store, this is async
						saveData(bufKey[slot],bufData[slot],function(){ 
							delete mappingInFlightMiss[key];	// unlock key
							bufLocked[slot] = 0;
							inFlightMissCtr--;

							delete mapping[key]; // disable mapping for current key
							
							// re-simulate the access, async
							access(key,function(newData){
								callback(newData);
							},aType,value);

						});
					}
					else
					{
						delete mapping[key]; // disable mapping for current key
						access(key,function(newData){
							
							callback(newData);
						},aType,value);
					}
				}
				
			}
			else    // slot life span has not ended
			{
				bufVisited[slot]=1;
				bufTime[slot] = Date.now();

				// if it is a "set" operation
				if(aType == aTypeSet)
				{	
					bufEdited[slot] = 1; // later used when data needs to be written to data-store (write-cache feature)
					bufData[slot] = value;
				}
				callback(bufData[slot]);
			}
		}
		else
		{
			// datastore loading + cache eviction
			let ctrFound = -1;
			let oldVal = 0;
			let oldKey = 0;
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
					// eviction preparations, lock the slot
					bufLocked[ctrEvict] = 1;
					inFlightMissCtr++;
					ctrFound = ctrEvict;
					oldVal = bufData[ctrFound];
					oldKey = bufKey[ctrFound];
				}

				ctrEvict++;
				if(ctrEvict >= size)
				{
					ctrEvict=0;
				}
			}
			
			// user-requested key is now asynchronously in-flight & locked for other operations
			mappingInFlightMiss[key]=1;
			
			// eviction function. least recently used data is gone, newest recently used data is assigned
			let evict = function(res){

				delete mapping[bufKey[ctrFound]];

				bufData[ctrFound]=res;
				bufVisited[ctrFound]=0;
				bufKey[ctrFound]=key;
				bufTime[ctrFound]=Date.now();
				bufLocked[ctrFound]=0;

				mapping[key] = ctrFound;
				callback(res);
				inFlightMissCtr--;
				delete mappingInFlightMiss[key];
			
			};

			// if old data was edited, send it to data-store first, then fetch new data
			if(bufEdited[ctrFound] == 1)
			{
				if(aType == aTypeGet)
					bufEdited[ctrFound] = 0;

				// old edited data is sent back to data-store
				saveData(oldKey,oldVal,function(){ 
					if(aType == aTypeGet)
						loadData(key,evict);
					else if(aType == aTypeSet)
						evict(value);
				});
			}
			else
			{
				if(aType == aTypeSet)
					bufEdited[ctrFound] = 1;
				if(aType == aTypeGet)
					loadData(key,evict);
				else if(aType == aTypeSet)
					evict(value);	
			}
		}
	};

	this.getAwaitable = function(key){
		return new Promise(function(success,fail){ 
			me.get(key,function(data){
				success(data);
			});
		});
	}

	this.getMultiple = function(callback, ... keys){
		let result = [];
		let ctr = keys.length;
		for(let i=0;i<ctr;i++)
			result.push(0);
		let ctr2 = 0;
		keys.forEach(function(key){
			me.get(key,function(data){
				result[ctr2++] = data;
				ctr--;
				if(ctr==0)
				{
					callback(result);
				}
			});
		});
	};


	this.getMultipleAwaitable = function(... keys){
		return new Promise(function(success,fail){
			me.getMultiple(function(results){
				success(results);
			}, ... keys);
		});
	};
};

exports.Lru = Lru;
