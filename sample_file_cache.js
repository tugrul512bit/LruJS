let Lru = require("./lrucache.js").Lru;
let fs = require("fs");
let path = require("path");

let fileCache = new Lru(500, async function(key,callback){
  // cache-miss data-load algorithm
    fs.readFile(path.join(__dirname,key),function(err,data){
      if(err) { 								
        callback({stat:404, data:JSON.stringify(err)});
      }
      else
      {								
        callback({stat:200, data:data});
      }														
    });
},1000 /* cache element lifetime */);

// test with a file
// cache-miss
let t1 = Date.now();
fileCache.get("./test.js",function(dat){

  console.log("Cache-miss time:");
  console.log(Date.now()-t1);
  console.log("file data:");
  console.log(dat.data.length+" bytes");
  
  
  // cache-hit
  t1 = Date.now();
  fileCache.get("./test.js",function(dat){
    console.log("Cache-hit time:");
    console.log(Date.now()-t1);
    console.log("file data:");
    console.log(dat.data.length+" bytes");

  });
  
});



// cache-miss
setTimeout(function(){
  // cache-miss
  let t2 = Date.now();
  fileCache.get("./test.js",function(dat){
    console.log("Cache-miss time:");
    console.log(Date.now()-t2);
    console.log("file data:");
    console.log(dat.data.length+" bytes");

  });
},2500);

/*
output on my computer (ubuntu has its own file cache too, so it is less effective):

Cache-miss time:
13
file data:
2088 bytes

Cache-hit time:
0
file data:
2088 bytes

Cache-miss time:
1
file data:
2088 bytes

the second cache-miss is faster because of ubuntu's file cache but there is still the api latency of file-access

*/
