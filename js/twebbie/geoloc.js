/* Geolocation-related stuff for Twebbie */

function GoogleGeocoder(API_KEY) {
    this.API_KEY = API_KEY;

    this.cache = {};
    this.queue = [];

    this.disabled_until = new Date();
    this.request_interval = 1000; // Time (in milliseconds) between queries
    this.throttle_interval = 1000 * 60; // Time (in milliseconds) to wait when the API gets angry
}

GoogleGeocoder.prototype.delay_until = function() {
    var now = new Date();
    var until = ( this.disable_until > now ) ? this.disable_until : now;
    until = now.setTime(until.getTime() + this.request_interval);
    return new Date(until);
}

GoogleGeocoder.prototype.delay_for = function() {
    /* Number of milliseconds to delay for. */
    return this.delay_until().getTime() - (new Date()).getTime();
}

GoogleGeocoder.prototype.set_throttle_delay = function() {
    this.disable_until = (new Date()).getTime() + this.throttle_interval;
}

GoogleGeocoder.prototype.set_cache = function(key, value) {
    debug("GoogleGeocoder cache: " + key + " => " + value);
    this.cache[key] = value;
}

GoogleGeocoder.prototype._process_queue = function() {
    if(!this.queue.length) return;

    var item = this.queue.pop();
    var address = item[0];
    var callback = item[1];

    var target_url = "http://maps.google.com/maps/geo?q=" + escape(address) +"&output=json&oe=utf8&sensor=false&key=" + this.API_KEY + "&callback=?";

    var self = this;
    $.getJSON(target_url, function(data) {
        if(data.Status.code != 200 || !data.Placemark) {
            if(data.Status.code == 620) {
                self.set_throttle_delay();
                log("Google is angry, backing off until: " + this.delay_until());
            } else {
                self.set_cache(address, [0, 0]);
            }
            return; // Fail
        }

        var coords = data['Placemark'][0]['Point']['coordinates'];
        var r = [coords[0], coords[1]];
        self.set_cache(address, r);

        callback(r);
    });
}

GoogleGeocoder.prototype.process_queue = function() {
    var r = this._process_queue();
    setTimeout("Geocoder.process_queue()", this.delay_for());
    return r;
}

GoogleGeocoder.prototype.geocode = function(address, callback) {
    if(address.length==0) return;
    // TODO: Parse iPhone: x,y coords

    // Check cache
    if(this.cache[address]) return callback(this.cache[address]);

    // Shove it into the queue
    this.queue.push([address, callback]);
}

/* Singleton Geocoder */

var Geocoder = new function() {
    setTimeout("Geocoder.process_queue()", 1000);
    return new GoogleGeocoder();
}

/* Location Filter */

function GeolocFilter(name, source) {
    this.name = name;
    this.source = source;
    this.__init__();
}

GeolocFilter.prototype.__init__ = function() {
    this.geocoder = Geocoder;

    this.coords = [0, 0]; // Longitude, latitude
    this.radius = 200; // In km

    this.slots_left = 200;
    this.container = $('<ul id="filter_id-' + this.name + '" class="twebbie-filter" />');
    this.container[0].filter = self;
}

GeolocFilter.prototype.passes_filter = function(address, callback) {
    var self = this;
    this.geocoder.geocode(address, function(r) {
        var d = distance_between(self.coords, r);
        debug("GeolocFilter.passes_filter: distance(" + address +") = " + d);
        if(d <= self.radius) callback();
    });
}

GeolocFilter.prototype.set_location = function(address, callback) {
    var self = this;
    this.geocoder.geocode(address, function(r) {
        self.coords = r;
        callback();
    });
}

GeolocFilter.prototype.notify = function(tweet) {
    var self = this;
    var address = tweet.user.location;
    this.passes_filter(address, function() {
        self.add_tweet(tweet); // On success...
    });
}

GeolocFilter.prototype.add_tweet = TwebbieFilter.prototype.add_tweet;

var get_lnglat_disable_until = new Date();

function get_lnglat(address, callback) {
    if(!address || address.length==0) return;

    // TODO: Parse iPhone: x,y coords
    if(geoloc_cache[address]) {
        return callback(geoloc_cache[address]);
    }

    if(get_lnglat_disable_until > (new Date())) {
        log("Google is still angry, not touching geoloc for: " + address);
        return;
    }

    var target_url = "http://maps.google.com/maps/geo?q=" + escape(address) +"&output=json&oe=utf8&sensor=false&callback=?";

    $.getJSON(target_url, function(data) {
        if(data.Status.code != 200 || !data.Placemark) {
            geoloc_cache[address] = [0, 0];

            if(data.Status.code == 620) {
                // Google is angry, back off.
                log("Google is angry, backing off.");
                get_lnglat_disable_until.setTime(get_lnglat_disable_until.getTime() + 60 * 1 * 100);
            }
            return; // Fail
        }

        var coords = data['Placemark'][0]['Point']['coordinates'];
        var r = [coords[0], coords[1]];
        geoloc_cache[address] = r;
        callback(r);
    });
}

/** Utility functions **/

/* Borrowed from http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points */
function distance_between(coords1, coords2) {
    var lng1 = coords1[0], lat1 = coords1[1];
    var lng2 = coords2[0], lat2 = coords2[1];
    var R = 6371; // Radius of the earth in km

    var d_lat = (lat2-lat1).toRad();
    var d_lng = (lng2-lng1).toRad();

    var a = Math.sin(d_lat/2) * Math.sin(d_lat/2) +
            Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
            Math.sin(d_lng/2) * Math.sin(d_lng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km

    return d
}

function km_to_miles(d) {
    return d * 0.621371192;
}

