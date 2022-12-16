'use strict';
/* 
cacheSize: number of elements in cache, constant, must be greater than or equal to number of asynchronous accessors / cache misses
callbackBackingStoreLoad: user-given cache(read)-miss function to load data from datastore
	takes 2 parameters: key, callback
	example:
		async function(key,callback){ 
			redis.get(key,function(data,err){ 
				callback(data); 
			}); 
		}
callbackBackingStoreSave: user-given cache(write)-miss function to save data to datastore
	takes 3 parameters: key, value, callback
	example:
		async function(key,value,callback){ 
			redis.set(key,value,function(err){ 
				callback(); 
			}); 
		}
elementLifeTimeMs: maximum miliseconds before an element is invalidated (0=infinite life-time & faster cache-hit), only invalidated at next get() or set() call with its key
flush(): all in-flight get/set accesses are awaited and all edited keys are written back to backing-store. flushes the cache.
reload(): evicts all cache to reload new values from backing store
reloadKey(): only evicts selected item (to reload its new value on next access)

*/

let Lru = function(cacheSize,callbackBackingStoreLoad,elementLifeTimeMs=1000,callbackBackingStoreSave){
	const me = this;
	const aTypeGet = 0;
	const aTypeSet = 1;
	const maxWait = elementLifeTimeMs;
	const size = parseInt(cacheSize,10);
	const mapping = new Map();
	const mappingInFlightMiss = new Map();
	const bufData = new Array(size);
	const bufVisited = new Uint8Array(size);
	const bufEdited = new Uint8Array(size);
	const bufKey = new Array(size);
	const bufTime = new Float64Array(size);
	const bufLocked = new Uint8Array(size);
	for(let i=0;i<size;i++)
	{
		let rnd = Math.random();
		mapping.set(rnd,i);		
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
		if(mapping.has(key))
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
		// stop dead-lock when many async get calls are made or if key is busy
		if(inFlightMissCtr>=size || mappingInFlightMiss.has(key))
             	{
               		setTimeout(function(){
				// get/set
				access(key,callback,aType,value);
			},0);
               		return;
	     	}
		


		if(mapping.has(key))
		{
			// slot is an element in the circular buffer of CLOCK algorithm
			let slot = mapping.get(key);

			// RAM speed data
			if( (maxWait > 0) &&  ((Date.now() - bufTime[slot]) > maxWait))
			{
				
				// if slot is locked by another operation, postpone the current operation
				if(bufLocked[slot])
				{										
					setTimeout(function(){
						access(key,callback,aType,value);
					},0);
					
				}
				else // slot is not locked and its lifespan has ended
				{
					// if it was edited, update the backing-store first
					if(bufEdited[slot] == 1)
					{
						bufLocked[slot] = 1;
						bufEdited[slot]=0;
						mappingInFlightMiss.set(key,1); // lock key
						inFlightMissCtr++;
						// update backing-store, this is async
						saveData(bufKey[slot],bufData[slot],function(){ 
							mappingInFlightMiss.delete(key);	// unlock key
							bufLocked[slot] = 0;
							inFlightMissCtr--;

							mapping.delete(key); // disable mapping for current key
							
							// re-simulate the access, async
							access(key,callback,aType,value);

						});
					}
					else
					{
						mapping.delete(key); // disable mapping for current key
						access(key,callback,aType,value);
					}
				}
				
			}
			else    // slot life span has not ended or there is no lifespan (maxWait = 0)
			{
				bufVisited[slot]=1;
				bufTime[slot] = (maxWait>0) ? Date.now() : 0;

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
			mappingInFlightMiss.set(key,1);
			
			// eviction function. least recently used data is gone, newest recently used data is assigned
			let evict = function(res){

				mapping.delete(bufKey[ctrFound]);

				bufData[ctrFound]=res;
				bufVisited[ctrFound]=0;
				bufKey[ctrFound]=key;
				bufTime[ctrFound]=(maxWait>0) ? Date.now() : 0;
				bufLocked[ctrFound]=0;

				mapping.set(key,ctrFound);
				callback(res);
				inFlightMissCtr--;
				mappingInFlightMiss.delete(key);
			
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
			me.get(key,success);
		});
	}

	this.setAwaitable = function(key,value){
		return new Promise(function(success,fail){ 
			me.set(key,value,success);
		});
	}

	// as many keys as required can be given, separated by commas
	this.getMultiple = function(callback, ... keys){
		let result = [];
		let ctr1 = keys.length;
		for(let i=0;i<ctr1;i++)
			result.push(0);
		let ctr2 = 0;
		keys.forEach(function(key){
			let ctr3 = ctr2++;
			me.get(key,function(data){
				result[ctr3] = data;
				ctr1--;
				if(ctr1==0)
				{
					callback(result);
				}
			});
		});
	};

	// as many key-value pairs ( in form of { key:foo, value:bar } ) can be given, separated by commas
	this.setMultiple = function(callback, ... keyValuePairs){
		let result = [];
		let ctr1 = keyValuePairs.length;
		for(let i=0;i<ctr1;i++)
			result.push(0);
		let ctr2 = 0;
		keyValuePairs.forEach(function(pair){
			let ctr3 = ctr2++;
			me.set(pair.key,pair.value,function(data){
				result[ctr3] = data;
				ctr1--;
				if(ctr1==0)
				{
					callback(result);
				}
			});
		});
	};

	// as many keys as required can be given, separated by commas
	this.getMultipleAwaitable = function(... keys){
		return new Promise(function(success,fail){
			me.getMultiple(success, ... keys);
		});
	};

	// as many key-value pairs ( in form of { key:foo, value:bar } ) can be given, separated by commas
	this.setMultipleAwaitable = function(... keyValuePairs){
		return new Promise(function(success,fail){
			me.setMultiple(success, ... keyValuePairs);
		});
	};

	// push all edited slots to backing-store and reset all slots lifetime to "out of date"
	this.flush = function(callback){

		function waitForReadWrite(callbackW){

			// if there are in-flight cache-misses cache-write-misses or active slot locks, then wait
			if(mappingInFlightMiss.size > 0 || bufLocked.reduce((e1,e2)=>{return e1+e2;}) > 0)
			{
				setTimeout(()=>{ waitForReadWrite(callbackW); },10);
			}
			else
				callbackW();
		}
		waitForReadWrite(async function(){  
			for(let i=0;i<size;i++)
			{
				bufTime[i]=0;
				if(bufEdited[i] == 1)
				{		
					// less concurrency pressure, less failure
					await me.setAwaitable(bufKey[i],bufData[i]);
				}
			}
			callback(); // flush complete
		});
	};
};

exports.Lru = Lru;
