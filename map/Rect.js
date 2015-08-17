
module.exports = function()
{
    /**
     * the physical representation of the map box
     * @param x
     * @param y
     * @param _w
     * @param _h
     * @constructor
     */

    function Rect( x,y,w,h ) {

        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

    }
    Rect.prototype =
    {
        get x(){ return this._x;}, set x( value ){ this._x = value; return this._x; },
        get y(){ return this._y;}, set y( value ){ this._y = value; return this._y; },
        get w(){ return this._w;}, set w( value ){ this._w = value; return this._w; },
        get h(){ return this._h;}, set h( value ){ this._h = value; return this._h; }
    };

    function containsPoint( _x, _y )
    {
        if( _x < this.x     ) return false;
        if( _y < this.y      ) return false;
        if( _x > this.x + this.w    ) return false;
        return _y <= this.y + this.h;
    }

    function isContained( _x, _y, _w, _h )
    {
        return ( this.x >= _x
        &&      this.y >= _y
        &&      this.x + this.w <= _x + _w
        &&      this.y + this.h <= _y + _h );
    }

    function intersect( _x, _y, _w, _h )
    {
        return !(  _x > this.x + this.w || _x+_w < this.x || _y > this.y + this.h || _y+_h< this.y );
    }

    function intersection( other )
    {
        if( this.intersect( other.x, other.y, other.x + other.w, other.y + other.h ) )
        {
            var x = Math.max( this.x, other.x );
            var y = Math.max( this.y, other.y );
            var w = Math.min( this.x + this.w, other.x + other.w ) - x;
            var h = Math.min( this.y + this.h, other.y + other.h ) - y;
            return new Rect( x,y,w,h );
        }
        return null;
    }

    var _p = Rect.prototype;

    _p.constructor = Rect;
    _p.containsPoint = containsPoint;
    _p.isContained = isContained;
    _p.intersect = intersect;
    _p.intersection = intersection;

    return Rect;

}();