/// TODO: Update code terminology to correspond to the new docs on the wiki. 
///       Such as, Group -> Filter
/// TODO: Add an abstraction class for Columns (as opposed to Filters)

/* 
 * Abstraction for a TwitterGroup - a subset of a user's Twitter account. 
 * Note: We have all these silly getter/setter functions so that we can
 * transparently change the internal datastructure and not affect the outer
 * code.
 */
function TwitterGroup(name, target, members, account) {
    this.account = account;
    this.name = name;
    this.target = target;
    this.member_count = 0;
    this.members = members;
    this.slots_left = 20;
}

/* Given tweet data from the Twitter API, construct an <li> object which will display it. */
TwitterGroup.prototype.render_tweet = function(tweet) {
    var relationship = this.account.get_relationship(tweet.user.id);

    /* Inspired by http://github.com/peterk/twoot */
    var tweet_obj = $('\
      <li class="tweet_container">\
          <div class="tweet_profile_image">\
              <img class="profile_image" src="' + tweet.user.profile_image_url + '" alt="' + tweet.user.name + '" />\
          </div>\
          <div class="tweet_text">\
              ' + tweet.text.
              replace(/(\w+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+)/g, '<a href="$1">$1</a>').
              replace(/[\@]+([A-Za-z0-9-_]+)/g, '<a href="http://twitter.com/$1">@$1</a>').
              replace(/[\#]+([A-Za-z0-9-_]+)/g, '<a href="http://search.twitter.com/search?q=$1">#$1</a>').
              replace(/[&lt;]+[3]/g, "<tt class='heart'>&#x2665;</tt>") + '\
          </div>\
          <div class="tweet_metadata">\
              <a class="user ' + relationship + '" href="http://twitter.com/' + tweet.user.screen_name + '">' + tweet.user.screen_name + '</a>\
              <span class="time" title="' + tweet.created_at + '">' + relative_time(tweet.created_at) + '</span>\
              via ' + tweet.source + '\
          </div>\
      </li>\
    ')

    $(tweet_obj).draggable({ delay: 100, revert: 'invalid', opacity: 0.5, zIndex: 1 });

    tweet_obj[0].member_id = tweet.user.id;
    tweet_obj[0].tweet_id = tweet.id;
    tweet_obj[0].group = this;
    tweet_obj[0].data = tweet;

    return tweet_obj;
}

TwitterGroup.prototype.is_member = function(member_id) {
    if(this.members === false) return true;
    return this.members[member_id];
}

TwitterGroup.prototype.add_member = function(member_id, tweets) {
    if(this.members[member_id]) {
        return; // Already there
    }

    if(!this.members) this.members = {};
    this.members[member_id] = true;

    /// TODO: Should this be part of this.add_tweet?
    // Transplant the tweets list items into the appropriate positions in the timeline for this group.
    var tweet_idx = 0;

    // Assume the tweets are in descending sorted order
    var existing_tweets = $("li", this.target);
    for(var i=0; i < existing_tweets.length; i++) {
        var t = existing_tweets[i];
        var cur_tweet = tweets[tweet_idx];

        if(t.tweet_id < cur_tweet.tweet_id) {
            // Insert before it, and move on to the next one
            cur_tweet.group = this;
            $(cur_tweet).insertBefore(t);

            tweet_idx++;
            this.slots_left--; /// NOTE: Technically, we should be clearing for extra slots, but we'll be lazy for now and let add_tweet do it next time.

            if(tweet_idx >= tweets.length) break;
        }
    }

    // Fill the rest at the end
    for(var i=tweet_idx; i < tweets.length; i++) {
        $(this.target).append(tweets[i]);
    }

}

TwitterGroup.prototype.remove_member = function(member_id) {
    if(this.members) this.members[member_id] = false;

    // Remove all items from this.target which are owned by member_id and return their data in a list.
    return $("li", this.target).filter(function(i) { return this.member_id == member_id; });

}

TwitterGroup.prototype.add_tweet = function(tweet) {
    var tweet_obj = this.render_tweet(tweet);
    $(this.target).prepend(tweet_obj);
    this.slots_left--;

    while(this.slots_left < 0) {
        $("li:last", this.target).remove();
        this.slots_left++;
    }
}

/* Check if a tweet belongs in this group, add it if it does. */
TwitterGroup.prototype.add_tweet_maybe = function(tweet) {
    var member_id = tweet.user.id;
    if(this.member_count === false || this.is_member(member_id)) this.add_tweet(tweet);
}

/* Abstraction for a user's Twitter account. */
function Twitter(base_target) {
    this.groups = new Array();
    this.last_update = false;
    this.last_id = false;
    this.register_group("All", base_target, false);

    // Load social graph data
    this.followers = {};
    this.following = {};

    var self = this;
    this.load_social_graph(function() {
        self.refresh();
    });
}

Twitter.prototype.load_social_graph = function(callback) {
    /// NOTE: Social graph stuff does not work right now due to a bug:
    /// http://code.google.com/p/twitter-api/issues/detail?id=318
    callback(); return;
    /// Delete the above if the bug is fixed...

    var self = this;
    // Load following
    $.getJSON("http://twitter.com/friends/ids.json?callback=?", function(data) {
        foo = data;
        $.each(data, function(i, member_id) {
            self.following[member_id] = true;
        });

        // Load followers
        $.getJSON("http://twitter.com/followers/ids.json?callback=?", function(data) {
            $.each(data, function(i, member_id) {
                self.followers[member_id] = true;
            });

            // Run callback
            callback();
        });
    });
}

Twitter.prototype.get_relationship = function(member_id) {
    if(this.followers[member_id]) {
        if(this.following[member_id]) return "mutual";
        return "stalker";
    } else if(this.following[member_id]) {
        return "stalking";
    } else {
        return "stranger";
    }
}

Twitter.prototype.register_group = function(name, target, members) {
    var group = new TwitterGroup(name, target, members, this);
    this.groups.push(group);

    /* Allow dragging between groups to add/remove members. */
    $(target).droppable({
        drop:   function(event, ui) { 
                    var tweet = ui.draggable[0];
                    $(ui.draggable).attr("style", "position: relative"); // Snap back. Is there a better way to do this?
                    if(tweet.group == group) {
                        return;
                    }
                    var member_tweets = tweet.group.remove_member(tweet.member_id);
                    group.add_member(tweet.member_id, member_tweets);
                }
    });
}

/* Inspired by http://github.com/peterk/twoot */
Twitter.prototype.refresh = function() {
    var target_url = "http://twitter.com/statuses/friends_timeline.json?callback=?";
    if(this.last_update) target_url += "&since=" + this.last_update.toGMTString();

    var self = this;

    $.getJSON(target_url, function(data) {
        /// TODO: Optimize?
        $.each(data.reverse(), function(i, tweet) {
            if(self.last_id && tweet.id <= self.last_id) return; // Skip id's which we already have.
            $.each(self.groups, function(j, group) {
                // Attempt to add the tweet to each of the groups.
                group.add_tweet_maybe(tweet);
                self.last_id = tweet.id;
            });
        });
    });

    this.last_update = new Date();

    $("#client_status").append("Last updated @ " + this.last_update.getHours() + ":" + this.last_update.getMinutes());
 
}
