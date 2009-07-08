/* Geolocation-related stuff for Twebbie */

geoloc_cache = {};

function GeolocFilter(name, source) {
    this.name = name;
    this.source = source;
    this.__init__();
}

GeolocFilter.prototype.__init__ = function() {
    this.coords = [0, 0]; // Longitude, latitude
    this.radius = 200; // In km

    this.slots_left = 200;
    this.container = $('<ul id="filter_id-' + this.name + '" class="twebbie-filter" />');
    this.container[0].filter = self;
}

GeolocFilter.prototype.passes_filter = function(address, callback) {
    if(this.coords[0] == 0 && this.coords[0] == 0) {
        return; // Not ready yet.
    }

    var self = this;
    get_lnglat(address, function(r) {
        var d = distance_between(self.coords, r);
        if(d <= self.radius) callback();
    });
}

GeolocFilter.prototype.set_location = function(address, callback) {
    var self = this;
    get_lnglat(address, function(r) {
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
    if(address.length==0) return;

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
                get_lnglat_disable_until.setTime(get_lnglat_disable_until.getTime() + 60 * 5 * 100);
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

