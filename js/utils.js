/* utils.js - Miscellaneous utility functions borrowed from other sources. */

//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/array/search [rev. #2]
search = function(o, v, i){
    var h = o.length, l = -1, m;
    while(h - l > 1)
        if(o[m = h + l >> 1] < v) l = m;
        else h = m;
    return o[h] != v ? i ? h : -1 : h;
};
