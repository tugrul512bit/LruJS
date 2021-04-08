"use strict";
console.log("tests will take several seconds. results will be shown at end.");
let Lru = require("./lrucache.js").Lru;
let benchData = {hits:0, misses:0, total:0, expires:0, evict:0, evictCtr:0, access50:0, miss50:0};
let errorCheck = {	
	"cache_hit_test":"failed",
	"cache_miss_test":"failed",
	"cache_expire_test":"failed",
	"cache_eviction_test":"failed",
	"cache_50%_hit_ratio":"failed"
};
process.on('exit',function(){
	console.log(errorCheck);
});


let cache = new Lru(1000, async function(key,callback){
    if(key.indexOf("cache_eviction_test")===-1 && key.indexOf("cache_50_hit_ratio_test")===-1)
    setTimeout(function(){
        callback(key+" processed");
	if(key === "cache_miss_test")
	{
		errorCheck[key]="ok";
	}	

	if(key === "cache_hit_test")
	{
		benchData.misses++;
	}

	if(key === "cache_expire_test")
	{
		benchData.expires++;
		if(benchData.expires===2)
			errorCheck[key]="ok";
	}
	
    },1000);
    else if(key === "cache_eviction_test")
    {
	callback(key+" processed");
	benchData.evict++;
	if(benchData.evict === 2)
		errorCheck[key]="ok";
    }
    else
    {
        callback(key+" processed");
	if(key.indexOf("cache_50_hit_ratio_test")!==-1)
	{
		benchData.miss50++;
	}
    }
},1000);

cache.get("cache_miss_test",function(data){  });

for(let i=0;i<5;i++)
{
	
	cache.get("cache_hit_test",function(data){
		benchData.total++;
		if(benchData.total - benchData.misses === 4 && benchData.misses === 1)
		{
			errorCheck["cache_hit_test"]="ok";
		}
	});
}

cache.get("cache_expire_test",function(data){
	setTimeout(function(){
		cache.get("cache_expire_test",function(data){});
	},1500);
});

setTimeout(function(){

	cache.get("cache_eviction_test",function(data){ 
		
		for(let i=0;i<999;i++)
		{
			cache.get("cache_eviction_test_count"+i,function(data){
				benchData.evictCtr++;
				if(benchData.evictCtr===999)
					cache.get("cache_eviction_test",function(data){ });
			});
		}
	});
},3000);

setTimeout(function(){

	let ctrMax = 100; // don't pick too low value, causes some uncertainity on 50% hit ratio
	function repeat(cur){
		if(cur>0)
		for(let i=0;i<900;i++)
		{
			cache.get("cache_50_hit_ratio_test"+parseInt(Math.random()*2000,10),function(data){
				benchData.access50++;
				if(benchData.access50===900)
				{			
					benchData.access50=0;		
					if(benchData.miss50>400*ctrMax && benchData.miss50< 500*ctrMax)
						errorCheck["cache_50%_hit_ratio"]="ok";		
					repeat(cur-1);			
				}
			});
		}
	}

	repeat(ctrMax);
},5000);
