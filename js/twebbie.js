
/* 
 * Abstraction for a TwitterGroup - a subset of a user's Twitter account. 
 * Note: We have all these silly getter/setter functions so that we can
 * transparently change the internal datastructure and not affect the outer
 * code.
 */
function TwitterGroup(name, target) {
    this.name = name;
    this.target = target;
    this.member_count = 0;
    this.whitelist = {};
    this.blacklist = {};
    this.slots_left = 100;
}

/* Given tweet data from the Twitter API, construct an <li> object which will display it. */
TwitterGroup.prototype.render_tweet = function(tweet) {
    /* Inspired by http://github.com/peterk/twoot */
    var tweet_obj = $('<li>\
        <img class="profile_image" src="' + tweet.user.profile_image_url + '" alt="' + tweet.user.name + '" />\
        <span class="time" title="' + tweet.created_at + '">' + relative_time(tweet.created_at) + '</span>\
        <a class="user" href="javascript:addAddress(\'' + tweet.user.screen_name + '\')">' + tweet.user.screen_name + '</a>\
        <div class="tweet_text">' + tweet.text.replace(/(\w+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+)/g, '<a href="$1">$1</a>').replace(/[\@]+([A-Za-z0-9-_]+)/g, '<a href="http://twitter.com/$1">@$1</a>').replace(/[&lt;]+[3]/g, "<tt class='heart'>&#x2665;</tt>") + '</div></li>').draggable({ delay: 250 });
    tweet_obj[0].member_id = tweet.user.id;
    tweet_obj[0].tweet_id = tweet.id;
    tweet_obj[0].group = this;
    tweet_obj[0].data = tweet;
    return tweet_obj;
}

TwitterGroup.prototype.is_member = function(member_id) {
    return this.whitelist[member_id];
}

TwitterGroup.prototype.add_member = function(member_id, tweets) {
    if(this.whitelist[member_id]) return; // Already there

    this.whitelist[member_id] = true;

    /// TODO: Should this be part of this.add_tweet?
    // Convert tweets into list items and insert them into the appropriate positions in the timeline for this group.
    var tweet_idx = 0;

    // Assume the tweets are in descending sorted order
    var existing_tweets = $("li", this);
    for(var i=0; i < existing_tweets.length; i++) {
        var t = existing_tweets[i];
        var cur_tweet = tweets[tweet_idx];

        if(t.tweet_id < cur_tweet.id) {
            // Insert before it, and move on to the next one
            this.render_tweet(cur_tweet).insertBefore(t);

            tweet_idx++;
            this.slots_left--; /// NOTE: Technically, we should be clearing for extra slots, but we'll be lazy for now and let add_tweet do it next time.

            if(tweet_idx >= tweets.length) break;
        }
    }

    // Fill the rest at the end
    for(var i=tweet_idx; i < tweet_idx.length; i++) {
        var cur_tweet = tweets[i];
        $(this.target).append(this.render_tweet(cur_tweet));
    }


}

TwitterGroup.prototype.remove_member = function(member_id) {
    this.whitelist[member_id] = false;

    // Remove all items from this.target which are owned by member_id and return their data in a list.
    var tweet_items = $("li", this.target).filter(function(i) { return this.member_id == member_id; }).remove();
    return $.map(tweet_items, function(tweet) { return tweet.data; });

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

TwitterGroup.prototype.add_tweet_maybe = function(tweet) {
    var member_id = tweet.user.id;
    if(!this.member_count || this.is_member(member_id)) this.add_tweet(tweet);
}

/* Abstraction for a user's Twitter account. */
function Twitter(base_target) {
    this.groups = new Array();
    this.last_update = false;
    this.last_id = false;
}

Twitter.prototype.register_group = function(name, target) {
    var group = new TwitterGroup(name, target);
    this.groups.push(group);

    /* Allow dragging between groups to add/remove members. */
    $(target).droppable({
        drop:   function(event, ui) { 
                    var tweet = ui.draggable[0];
                    if(tweet.group == group) {
                        $(ui.draggable).attr("style", "position: relative"); // Snap back. Is there a better way to do this?
                        return;
                    }
                    console.log("Added member " + tweet.member_id + " to group " + group.name); 
                    var member_tweets = tweet.group.remove_member(tweet.member_id);
                    group.add_member(tweet.member_id, member_tweets);
                }
    });
}

/* Inspired by http://github.com/peterk/twoot */
Twitter.prototype.refresh = function() {
    var target_url = "http://twitter.com/statuses/friends_timeline.json?callback=?";
    if(this.last_update) target_url += "&since=" + this.last_update;

    var self = this;

    console.log("Fetching: " + target_url);
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

    this.last_update = new Date().toGMTString();
}
