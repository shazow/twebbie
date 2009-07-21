/* columns.js - Twebbie visual columns which render filters. */

function Twebbie() {
    Twebbie.instance = this; // There can only be one!
    var self = this;

    this.columns = [];
    this.filters = [];
    this.sources = [];

    var default_source = new TwitterAccount();
    var default_filter = new BlacklistFilter("Twebbie", default_source); /// TODO: Remove default_source param once tweet data is abstracted in a self-rendering object
    var default_column = new Column("Twebbie", default_filter);

    this.sources.push(default_source);
    this.filters.push(default_filter);
    this.columns.push(default_column);

    // Subscribe each filter to the default source.
    $.each(this.filters, function(j, filter) {
        default_source.subscribe_filter(filter);
    });

    // Register UI elements
    $("#twebbie-add-whitelist").click(function(e) {
        var f = new WhitelistFilter("Whitelist Filter", self.sources[0]);
        self.add_column("Whitelist", f);
    });

    $("#twebbie-add-geoloc").click(function(e) {
        var f = new GeolocFilter("Location Filter", self.sources[0]);
        var address = prompt("Location address to filter within 300km?");
        self.add_column("Location: " + address, f);
        f.set_location(address, function() {});
    });
}

Twebbie.prototype.refresh = function() {
    // Refresh every source
    $.each(this.sources, function(i, source) { source.refresh(); });
}

Twebbie.prototype.add_column = function(name, filter) {
    var source = this.sources[0];
    source.subscribe_filter(filter);
    var column = new Column(name, filter);

    this.filters.push(filter);
    this.columns.push(column);
}

function Column(name, filter) {
    this.filter = filter;
    var title = '<h2 class="ui-helper-reset ui-widget-header ui-corner-all">' + name + '</h2>';

    this.container = $('<div class="twebbie-column ui-widget-content ui-corner-all" />');
    this.container.append(title);
    this.container.append(filter.container);

    $("#twebbie").append(this.container);
}

Column.prototype.change_filter = function(filter) {
    $('.twebbie-filter', this.container).replaceWith(filter.container);
    $('h2', this.container).text(filter.title);
}

Column.prototype.set_title = function(text) {
    $("h2", this.container).text(text)
}
