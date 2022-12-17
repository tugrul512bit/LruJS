// todo: make direct-mapped cache client of Lru cache for extra performance on cache-miss of direct-mapped and extra performance on cache-hits of Lru.
//  direct_mapped.get()--miss?yes--> lru.get()--miss?yes--> return backing_store[key];
//                            no--> RAM              no--> eviction search in RAM
//  direct_mapped.set()--miss?yes--> lru.set()--miss?yes--> backing_store[key]=value;return;
//                            no--> RAM              no--> eviction search in RAM
