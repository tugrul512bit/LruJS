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

// test with own file
// cache-miss
let t1 = Date.now();
fileCache.get("./test.js",function(dat){

  console.log("Cache-miss time:");
  console.log(Date.now()-t1);
  console.log("file data:");
  console.log(dat.data.toString());
  
  
  // cache-hit
  t1 = Date.now();
  fileCache.get("./test.js",function(dat){
    console.log("Cache-hit time:");
    console.log(Date.now()-t1);
    console.log("file data:");
    console.log(dat.data.toString());

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
    console.log(dat.data.toString());

  });
},2500);
