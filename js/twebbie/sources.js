/* sources.js - Twebbie message sources. */

/* Interface for a TwebbieSource */
function TwebbieSource() {}
TwebbieSource.prototype = {
    refresh: function() {},
    get_relationship: function() {},
    seconds_since_refresh: function() {},
    subscribe_filter: function(filter) {},
    render_msg: function(obj) {}
}

/*********************************************************************/

/* Timeline from the authenticated user's Twitter account. */
function TwitterAccount() {
    this.last_update = false;
    this.last_id = false;

    this.filters = [];
    this.msg_cache = []; // Used to populate new filters

    this.max_msg_cache = 200;
    this.max_refresh_rate = 90; // Seconds

    this.followers = {};
    this.following = {};

    var self = this;
    this.load_social_graph(function() {
        self.refresh();
    });
}

TwitterAccount.prototype.seconds_since_refresh = function() {
    var now = new Date();
    return (now - this.last_update)/1000;
}

TwitterAccount.prototype.refresh = function() {
    if (this.seconds_since_refresh() < this.max_refresh_rate) return;

    var target_url = "http://twitter.com/statuses/friends_timeline.json?callback=?";
    if (this.last_update) target_url += "&since=" + this.last_update.toGMTString();

    var self = this;

    $.getJSON(target_url, function(data) {
        $.each(data.reverse(), function(i, tweet) {
            // Skip id's we already have, and track the latest id
            if (self.last_id && tweet.id <= self.last_id) return;
            self.last_id = tweet.id;

            // Append tweet to message cache
            if (self.msg_cache.length >= self.max_msg_cache) self.msg_cache.shift();
            self.msg_cache.push(tweet);

            // Notify each filter of the new tweet
            $.each(self.filters, function(j, filter) { filter.notify(tweet); });
        });
    });
    this.last_update = new Date();

    log("Updated source: TwitterAccount");
}

TwitterAccount.prototype.subscribe_filter = function(filter) {
    this.filters.push(filter);

    // Populate the filter with cached messages
    $.each(this.msg_cache, function(i, tweet) { filter.notify(tweet); });
}

TwitterAccount.prototype.load_social_graph = function(callback) {
    var self = this;

    // Load following
    $.getJSON("http://twitter.com/friends/ids.json?callback=?", function(data) {
        $.each(data, function(i, member_id) { self.following[member_id] = true; });

        // Load followers
        $.getJSON("http://twitter.com/followers/ids.json?callback=?", function(data) {
            $.each(data, function(i, member_id) { self.followers[member_id] = true; });

            // Run callback
            callback();
        });
    });
}

TwitterAccount.prototype.get_relationship = function(member_id) {
    if(this.followers[member_id]) {
        if(this.following[member_id]) return "mutual";
        return "stalker";
    } else if(this.following[member_id]) {
        return "stalking";
    } else {
        return "stranger";
    }
}

TwitterAccount.prototype.render_msg = function(tweet) {
    /// TODO: Abstract tweets in a self-rendering object instead of this...
    var relationship = this.get_relationship(tweet.user.id);

    /* Inspired by http://github.com/peterk/twoot */
    var tweet_obj = $('\
      <li class="tweet_container ui-widget ui-widget-content ui-corner-all">\
          <div class="tweet_profile_image">\
              <img class="profile_image" src="' + tweet.user.profile_image_url + '" alt="' + tweet.user.name + '" title="' + tweet.user.name + ' (' + tweet.user.screen_name + ')"/>\
          </div>\
          <div class="tweet_text">\
              ' + tweet.text.
              replace(/(\w+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+)/g, '<a href="$1">$1</a>').
              replace(/[\@]+([A-Za-z0-9-_]+)/g, '<a href="http://twitter.com/$1">@$1</a>').
              replace(/[\#]+([A-Za-z0-9-_]+)/g, '<a href="http://search.twitter.com/search?q=$1">#$1</a>').
              replace(/[&lt;]+[3]/g, "<tt class='heart'>&#x2665;</tt>") + '\
          </div>\
          <div class="tweet_metadata">\
              <span class="ui-icon tweep_relationship ' + relationship + '" title="' + relationship + '"></span><a href="http://twitter.com/' + tweet.user.screen_name + '">' + tweet.user.screen_name + '</a>\
              <a href="http://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id + '" class="time" title="' + tweet.created_at + '">' + relative_time(tweet.created_at) + '</a>\
              via ' + tweet.source + '\
          </div>\
      </li>\
    ');

    $(tweet_obj).draggable({ delay: 100, revert: 'invalid', opacity: 0.5, zIndex: 1 });

    tweet_obj[0].member_id = tweet.user.id;
    tweet_obj[0].tweet_id = tweet.id;

    return tweet_obj;
}

/*********************************************************************/

/* Timeline from a Twitter search query. */
function TwitterSearch() {
    /// TODO: ...
}
