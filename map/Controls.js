module.exports = function()
{
    function Controls( map ){
        this.map = map;
        this.mercator = map.mercator;
    }


    var _p = Controls.prototype;


    return Controls;

}();

