"use strict"

// backing-store
var fs = require("fs");

// LRU cache
let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 950;
let element_life_time_miliseconds = 10000;

let cache = new Lru(num_cache_elements, async function(key,callback){
	fs.readFile(key, function(err, buf) {
		if (err) console.log(err);
	  	callback(buf.toString());
	});
}, element_life_time_miliseconds, async function(key,value,callback){
	fs.writeFile(key, value, (err) => {
	 	 if (err) console.log(err);
	  	 callback();
	});
});

const N_repeat = 10;
const N_bench = 2000;
const N_concurrency = 20;
const N_dataset = 1000;

function randomKey(){ return Math.floor(Math.random()*N_dataset); }

// without LRU caching
async function benchWithout(callback){

	for(let i=0;i<N_bench;i+=N_concurrency){
		let ctr = 0;
		let w8 = new Promise((success,fail)=>{
			for(let j=0;j<N_concurrency;j++)
			{
				fs.writeFile("./testfolder/file"+randomKey(),Math.random().toString(), function (err) {
					fs.readFile("./testfolder/file"+randomKey(), function (err, result) {
						ctr++;
						if(ctr == N_concurrency)
						{
							success(1);
						}	
					});
				});
			}
		});
		let result = await w8;

	}
	callback();
}

// with LRU caching
async function benchWith(callback){
	for(let i=0;i<N_bench;i+=N_concurrency){
		let ctr = 0;
		let w8 = new Promise((success,fail)=>{
			for(let j=0;j<N_concurrency;j++)
			{
				cache.set("./testfolder/file"+randomKey(),Math.random().toString(), function (result) {
					cache.get("./testfolder/file"+randomKey(), function (result) {
						ctr++;
						if(ctr == N_concurrency)
						{
							success(1);
						}	
					});
				});
			}
		});
		let result = await w8;

	}
	callback();
}

let ctr = 0;
function restartWithoutLRU(callback){
	let t = Date.now();
	benchWithout(function(){
		console.log("without LRU: "+(Date.now() - t)+" milliseconds");
		ctr++;
		if(ctr != N_repeat)
		{
			restartWithoutLRU(callback);
		}
		else
		{
			ctr=0;
			callback();
		}
	});
}

function restartWithLRU(){
	let t = Date.now();
	benchWith(function(){
		console.log("with LRU: "+(Date.now() - t)+" milliseconds");
		ctr++;
		if(ctr != N_repeat)
		{
			restartWithLRU();
		}
		
	});
}


restartWithoutLRU(restartWithLRU);
