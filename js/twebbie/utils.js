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

/* Borrowed from http://github.com/peterk/twoot/ */
function refresh_time() {
    // get all span.time and recalc from title attribute
    $('span.time').each(function() {
        $(this).text(relative_time($(this).attr("title")));
    })
}

/* Borrowed from http://github.com/seaofclouds/tweet/ */
function relative_time(time_value) {
    var parsed_date = Date.parse(time_value);
    var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
    var delta = parseInt((relative_to.getTime() - parsed_date) / 1000);
    if(delta < 60) {
    return 'less than a minute ago';
    } else if(delta < 120) {
    return 'about a minute ago';
    } else if(delta < (45*60)) {
    return (parseInt(delta / 60)).toString() + ' minutes ago';
    } else if(delta < (90*60)) {
    return 'about an hour ago';
    } else if(delta < (24*60*60)) {
    return 'about ' + (parseInt(delta / 3600)).toString() + ' hours ago';
    } else if(delta < (48*60*60)) {
    return '1 day ago';
    } else {
    return (parseInt(delta / 86400)).toString() + ' days ago';
    }
}


function log(msg) {
    var now = new Date();
    var zero_padding = (now.last_update.getMinutes() < 10) ? "0" : "";
    var time = this.last_update.getHours() + ":" + zeroPadding + this.last_update.getMinutes();
    $("#client_status").html('<span class="time">' + time + '</span> ' + msg);
}
