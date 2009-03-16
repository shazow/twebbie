/* columns.js - Twebbie visual columns which render filters. */

function Column(filter) {
    this.filter = filter;
    var title = '<h2 class="ui-helper-reset ui-widget-header ui-corner-all">' + filter.name + '</h2>';

    this.container = $('<div class="twebbie-column ui-widget-content ui-corner-all" />');
    this.container.append(title);
    this.container.append(filter.container);

    $("#twebbie").append(container);
}

Column.prototype.change_filter = function(filter) {
    $('.twebbie-filter', this.container).replaceWith(filter.container);
    $('h2', this.container).text(filter.title);
}
