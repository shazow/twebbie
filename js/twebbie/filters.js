/* filters.js - Twebbie message filters. */

/* Interface for a TwebbieFilter */
function TwebbieFilter() {}
TwebbieSource.prototype = {
    is_member: function()
}

/*********************************************************************/

function WhitelistFilter(name) {
    this.name = name;
    this.members = {};

    this.slots_left = 200;
    this.container = $('<ul id="' + name + '-filter" class="twebbie-filter" />');
}

WhitelistFilter.prototype.is_member = function(member_id) {
    return this.members[member_id];
}

WhitelistFilter.prototype.add_member = function(member_id, tweets) {
    if(this.members[member_id]) return; // Already present
    this.members[member_id] = true;

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
        $(this.target).append(tweets[i]);
    }
}

WhitelistFilter.prototype.remove_member = function(member_id) {
    if(this.members) this.members[member_id] = false;

    // Remove all items from this.target which are owned by member_id and return their data in a list.
    return $("li", this.target).filter(function(i) { return this.member_id == member_id; });
}


WhitelistFilter.prototype.add_tweet = function(tweet) {
    var tweet_obj = render_tweet(tweet);
    $(this.target).prepend(tweet_obj);
    this.slots_left--;

    while(this.slots_left < 0) {
        $("li:last", this.target).remove();
        this.slots_left++;
    }
}

/* Check if a tweet belongs in this filter, add it if it does. */
WhitelistFilter.prototype.inject = function(tweet) {
    var member_id = tweet.user.id;
    if(this.is_member(member_id)) this.add_tweet(tweet);
}


/*********************************************************************/


function BlacklistFilter(name) {
    this.name = name;
    this.members = {};

    this.slots_left = 200;
    this.container = $('<ul id="' + name + '-filter" />');
}

BlacklistFilter.prototype.is_member = function(member_id) {
    return !this.members[member_id];
}

BlacklistFilter.prototype.add_member = WhitelistFilter.prototype.remove_member;
BlacklistFilter.prototype.remove_member = Whitelist.prototype.add_member;
BlacklistFilter.prototype.add_tweet = WhitelistFilter.prototype.add_tweet;
BlacklistFilter.prototype.inject = WhitelistFilter.prototype.inject;
