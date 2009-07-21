/* Geolocation-related stuff for Twebbie */

function GoogleGeocoder(API_KEY) {
    this.API_KEY = API_KEY;

    this.cache = {};
    this.queue = [];

    this.disabled_until = new Date();
    this.request_interval = 1000; // Time (in milliseconds) between queries
    this.throttle_interval = 1000 * 60; // Time (in milliseconds) to wait when the API gets angry
    this.last_hit_cached = false;
}

GoogleGeocoder.prototype.delay_until = function() {
    var now = new Date();

    if(this.last_hit_cached) {
        this.last_hit_cached = false;
        return new Date(Math.max(now, this.disable_until));
    }

    var until = ( this.disable_until > now ) ? this.disable_until : now;
    until = now.setTime(until.getTime() + this.request_interval);
    return new Date(until);
}

GoogleGeocoder.prototype.delay_for = function() {
    /* Number of milliseconds to delay for. */
    return Math.max(1, this.delay_until().getTime() - (new Date()).getTime());
}

GoogleGeocoder.prototype.set_throttle_delay = function() {
    this.disable_until = new Date((new Date()).getTime() + this.throttle_interval);
}

GoogleGeocoder.prototype.set_cache = function(key, value) {
    this.cache[key] = value;
}

GoogleGeocoder.prototype.get_cache = function(key) {
    var value = this.cache[key];
    if(value) {
        debug("GoogleGeocoder cached hit: " + key);
        this.last_hit_cached = true;
        return value;
    }
}

GoogleGeocoder.prototype._process_queue = function() {
    if(!this.queue.length) return;

    var item = this.queue.pop();
    var address = item[0];
    var callback = item[1];

    // Check cache
    var coords = this.get_cache(address);
    if(coords) return callback(coords);

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
    var delay = this.delay_for();
    setTimeout("Geocoder.process_queue()", delay);
    return r;
}

GoogleGeocoder.prototype.geocode = function(address, callback) {
    if(!address || address.length==0) return;
    // TODO: Parse iPhone: x,y coords

    // Check cache
    var coords = this.get_cache(address);
    if(coords) return callback(coords);

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
    this.radius = 300; // In km

    this.slots_left = 200;
    this.container = $('<ul id="filter_id-' + this.name + '" class="twebbie-filter" />');
    this.container[0].filter = self;
}

GeolocFilter.prototype.passes_filter = function(address, callback) {
    if(!address) return false;

    var self = this;
    this.geocoder.geocode(address, function(r) {
        var d = distance_between(self.coords, r);
        log("Geocoded: " + address +", distance: " + d);
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

