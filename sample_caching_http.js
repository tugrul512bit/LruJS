var http = require('http');


let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 250;
let element_life_time_miliseconds = 1000;
let html_pages = new Map();
let cache = new Lru(num_cache_elements, async function(key,callback){
	callback(html_pages.get(key));
}, element_life_time_miliseconds, async function(key,value,callback){
	html_pages.set(key,value);
	callback();
});

cache.set("/info.html","<html><body>Hello world.</body></html>",function(data){});

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
	cache.get(req.url,function(data){
	  res.write(data);
	  res.end();
	});

}).listen(8080); 
