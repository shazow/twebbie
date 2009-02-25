/* 
 * Abstraction for a TwitterGroup - a subset of a user's Twitter account. 
 * Note: We have all these silly getter/setter functions so that we can
 * transparently change the internal datastructure and not affect the outer
 * code.
 */
function TwitterGroup(name, target) {
    this.name = name;
    this.target = target;
    this.members = false
    this.slots_left = 100;
}

TwitterGroup.prototype.is_member = function(member_id) {
    return this.members[member_id];
}

TwitterGroup.prototype.add_member = function(member_id) {
    return this.members[member_id] = true;
}

TwitterGroup.prototype.remove_member = function(member_id) {
    return this.members[member_id] = false;
}

TwitterGroup.prototype.add_tweet = function(tweet) {
    $("<li></li>").html($()).prependTo(this.target);
    this.slots_left--;

    if(this.slots_left>0) return;
    $("li:last", this.target).remove();
}

TwitterGroup.prototype.add_tweet_maybe = function(tweet) {
    var member_id = tweet.user.id;
    if(this.is_member(member_id)) this.add_tweet(tweet);
}

/* Abstraction for a user's Twitter account. */
function Twitter() {
    var base_group = TwitterGroup("Everything Else");
    this.groups = new Array(base_group);
}

Twitter.prototype.
