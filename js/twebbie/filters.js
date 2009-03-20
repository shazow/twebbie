/* filters.js - Twebbie message filters. */

/* Interface for a TwebbieFilter */
function TwebbieFilter(name, source) {}
TwebbieFilter.prototype = {
    passes_filter: function() {}
}

/*********************************************************************/

function WhitelistFilter(name, source) {
    this.name = name;
    this.source = source;
    this.__init__();
}

WhitelistFilter.prototype.__init__ = function() {
    var self = this;

    this.members = {};
    this.slots_left = 200;
    this.container = $('<ul id="filter_id-' + name + '" class="twebbie-filter" />');
    this.container[0].filter = self;

    this.container.droppable({
        drop:   function(event, ui) { 
        /// TODO: This wont actually work for WhitelistFilter, only BlacklistFilter. FIXME
                    var tweet = ui.draggable[0];
                    $(ui.draggable).attr("style", "position: relative"); // Snap back. Is there a better way to do this?

                    var parent_filter = tweet.parentNode.filter;
                    if (parent_filter == self) return;

                    // Migrate the member from the old filter to the new filter
                    var refugees = $.makeArray(parent_filter.remove_member(tweet.member_id));
                    var more_refugees = $.makeArray(self.add_member(tweet.member_id));
                    refugees = $.merge(refugees, more_refugees);

                    // Immigrate all the refugees
                    self.immigrate_tweets(refugees);
                }
    });
}

WhitelistFilter.prototype.passes_filter = function(member_id) {
    return this.members[member_id];
}

/* Insert a collection of tweets while keeping in mind the appropriate order and limits. */
WhitelistFilter.prototype.immigrate_tweets = function(tweets) {
    console.log("Immigrating " + tweets.length + " tweets to " + this.name);
    /// TODO: Should this be part of this.add_tweet?
    // Transplant the tweets list items into the appropriate positions in the timeline for this group.
    var tweet_idx = 0;

    // Assume the tweets are in descending sorted order
    var existing_tweets = $("li", this.container);
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
        $(this.container).append(tweets[i]);
    }
}

WhitelistFilter.prototype.add_member = function(member_id) {
    if(this.members[member_id]) return; // Already present
    console.log("Whitelisting member " + member_id + " to " + this.name);
    this.members[member_id] = true;

    return $([]);
}

WhitelistFilter.prototype.remove_member = function(member_id) {
    if(this.members) this.members[member_id] = false;
    console.log("Un-whitelisting member " + member_id + " to " + this.name);

    // Remove all items from this.container which are owned by member_id and return their data in a list.
    return $("li", this.container).filter(function(i) { return this.member_id == member_id; });
}

WhitelistFilter.prototype.add_tweet = function(tweet) {
    var tweet_obj = this.source.render_msg(tweet);
    $(this.container).prepend(tweet_obj);
    this.slots_left--;

    while(this.slots_left < 0) {
        $("li:last", this.container).remove();
        this.slots_left++;
    }
}

/* Check if a tweet belongs in this filter, add it if it does. */
WhitelistFilter.prototype.inject = function(tweet) {
    var member_id = tweet.user.id;
    if(this.passes_filter(member_id)) this.add_tweet(tweet);
}


/*********************************************************************/

/// TODO: Is there a better way to do inheritance?

function BlacklistFilter(name, source) {
    this.name = name;
    this.source = source;
    this.__init__();
}

BlacklistFilter.prototype.passes_filter = function(member_id) {
    return !this.members[member_id];
}

/// TODO: This is too similar to WhitelistFilter.add_member... figure out a clever way to merge the code.
BlacklistFilter.prototype.add_member = function(member_id) {
    if(this.members) this.members[member_id] = false;
    console.log("Un-blacklisting member " + member_id + " to " + this.name);

    return $([]);
}

/// TODO: This is too similar to WhitelistFilter.remove_member... figure out a clever way to merge the code.
BlacklistFilter.prototype.remove_member = function(member_id) {
    if(this.members[member_id]) return; // Already present
    console.log("Blacklisting member " + member_id + " to " + this.name);
    this.members[member_id] = true;

    // Remove all items from this.container which are owned by member_id and return their data in a list.
    return $("li", this.container).filter(function(i) { return this.member_id == member_id; });
}

BlacklistFilter.prototype.__init__ = WhitelistFilter.prototype.__init__;
BlacklistFilter.prototype.add_tweet = WhitelistFilter.prototype.add_tweet;
BlacklistFilter.prototype.immigrate_tweets = WhitelistFilter.prototype.immigrate_tweets;
BlacklistFilter.prototype.inject = WhitelistFilter.prototype.inject;
