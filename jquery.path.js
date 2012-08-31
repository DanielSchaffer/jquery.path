/*
 * jQuery css bezier animation support -- Jonah Fox
 * version 0.0.3
 * Released under the MIT license.
 */
/*
  var path = $.path.bezier({
    start: {x:10, y:10, angle: 20, length: 0.3},
    end:   {x:20, y:30, angle: -20, length: 0.2}
  })
  $("myobj").animate({path: path}, duration)

*/

;(function($){

  $.path = {
    isPath: function(path) {
      return path &&
        path.css &&
        path.css.constructor == Function;
    }
  };

  var V = {
    rotate: function(p, degrees) {
      var radians = degrees * Math.PI / 180,
        c = Math.cos(radians),
        s = Math.sin(radians);
      return [c*p[0] - s*p[1], s*p[0] + c*p[1]];
    },
    scale: function(p, n) {
      return [n*p[0], n*p[1]];
    },
    add: function(a, b) {
      return [a[0]+b[0], a[1]+b[1]];
    },
    minus: function(a, b) {
      return [a[0]-b[0], a[1]-b[1]];
    }
  };

  $.path.bezier = function(params) {
    this.x = params.start.x;
    this.y = params.start.y;
    params.start = $.extend( {angle: 0, length: 0.3333}, params.start );
    params.end = $.extend( {angle: 0, length: 0.3333}, params.end );

    this.p1 = [params.start.x, params.start.y];
    this.p4 = [params.end.x, params.end.y];

    var v14 = V.minus( this.p4, this.p1 ),
      v12 = V.scale( v14, params.start.length ),
      v41 = V.scale( v14, -1 ),
      v43 = V.scale( v41, params.end.length );

    v12 = V.rotate( v12, params.start.angle );
    this.p2 = V.add( this.p1, v12 );

    v43 = V.rotate(v43, params.end.angle );
    this.p3 = V.add( this.p4, v43 );

    this.f1 = function(t) { return (t*t*t); };
    this.f2 = function(t) { return (3*t*t*(1-t)); };
    this.f3 = function(t) { return (3*t*(1-t)*(1-t)); };
    this.f4 = function(t) { return ((1-t)*(1-t)*(1-t)); };

    /* p from 0 to 1 */
    this.css = function(p) {
      var f1 = this.f1(p), f2 = this.f2(p), f3 = this.f3(p), f4=this.f4(p), css = {};
      css.x = this.x = ( this.p1[0]*f1 + this.p2[0]*f2 +this.p3[0]*f3 + this.p4[0]*f4 +.5 )|0;
      css.y = this.y = ( this.p1[1]*f1 + this.p2[1]*f2 +this.p3[1]*f3 + this.p4[1]*f4 +.5 )|0;
      css.left = css.x + "px";
      css.top = css.y + "px";
      return css;
    };
  };

  $.path.arc = function(params) {
    for ( var i in params ) {
      this[i] = params[i];
    }
    this.dir = this.dir || 1;

    while ( this.start > this.end && this.dir > 0 ) {
      this.start -= 360;
    }

    while ( this.start < this.end && this.dir < 0 ) {
      this.start += 360;
    }

    if(this.spiral) {
      if(this.spiral.constructor == Array && this.spiral.length > 1) {
        this.radiusStart = this.spiral[0] || 1;
        this.radiusEnd = this.spiral[1] || 1;
      } else {
        this.radiusStart = 1;
        this.radiusEnd = (this.spiral.constructor == Array ? this.spiral[0] : this.spiral) || 1;
      }
      this.radius = this.radiusStart;
      this.radiusDiff = Math.abs(this.radiusEnd - this.radiusStart);
    }

    if($.path.isPath(this.center)) {
      this.centerPath = this.center;
      this.center = [0,0];
    }

    this.css = function(p) {
      var a = ( this.start * (p ) + this.end * (1-(p )) ) * Math.PI / 180,
        css = {};

      if(this.centerPath) {
        var pos = this.centerPath.css(p);
        this.center[0] = pos.x;
        this.center[1] = pos.y;
      }

      css.x = this.x = ( Math.sin(a) * this.radius + this.center[0] +.5 )|0;
      css.y = this.y = ( Math.cos(a) * this.radius + this.center[1] +.5 )|0;
      css.left = css.x + "px";
      css.top = css.y + "px";

      if(this.spiral) {
        this.radius = this.radiusStart + (this.radiusDiff - (this.radiusDiff * p));
      }

      return css;
    };
  };

  // rotators
  $.path.rotators = {
    isRotator: function(rotator) {
      return rotator &&
        rotator.rotate &&
        rotator.rotate.constructor == Function &&
        rotator.unit;
    },
    units: {
      degrees: 'deg',
      gradians: 'grad',
      radians: 'rad',
      turns: 'turn'
    }
  };

  $.path.rotators.followPath = function() {
    this.unit = $.path.rotators.units.radians;
    this.rotate = function(p, css, prevState) {
      return Math.atan2(prevState.y - css.y, prevState.x - css.x);
    };
  };

  $.path.rotators.spin = function (params) {
    this.unit = $.path.rotators.units.degrees;
    for ( var i in params ) {
      this[i] = params[i];
    }
    this.dir = this.dir || 1;

    while ( this.start > this.end && this.dir > 0 ) {
      this.start -= 360;
    }

    while ( this.start < this.end && this.dir < 0 ) {
      this.start += 360;
    }

    this.diff = this.end - this.start;

    this.rotate = function(p, css, prevCss) {
      var pos = this.start - (this.diff - (this.diff * p));
      return pos % 360;
    };
  };

  $.fx.step.path = function(fx) {
    var prevState = $.extend(true, {}, fx.end);
    var css = fx.end.css( 1 - fx.pos );

    // note: rotation requires the transform CSS hook (https://github.com/brandonaaron/jquery-cssHooks/blob/master/transform.js)
    if($.path.rotators.isRotator(fx.end.rotator) && $.cssHooks.transform) {
      var rotation = fx.end.rotator.rotate(1 - fx.pos, css, prevState);
      $.cssHooks.transform.set( fx.elem, "rotate(" + rotation + fx.end.rotator.unit + ")" );
    }

    fx.elem.style.top = css.top;
    fx.elem.style.left = css.left;
  };

})(jQuery);