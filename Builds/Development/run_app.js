/*
-----INSERT OLD AND NEW PATCH NOTES-----
text

-----TO FIX-----
Keep circle red when dragging away from original X coordinate.
Stop window to extend vertically when teachermode is enabled (draw_spline()).

-----TO DO/CHANGE-----
Split axis_definition into X-axis (line, labels), Y-axis (line, labels) and axis-arrow (for adjustability).
Change spline StrokeColor and StrokeWidth to variables from user input.

-----ALERTS-----
Switched x/y positions of min/max in Response array! Adjust in (old) grading code of question in Question Bank!
In case a min/max outside domain of the spline is found, a simple solution is used by redefining the min/max to the edge of the domain.
*/

function runApp(array, type) {
    console.log("Starting app...");
    console.log(" *** 2.11 *** "); /* new version by Mario is 2.11, 7 february 2023 */
    console.log("Loading app dependencies...");
    /*jQuery.getScript('https://online-exams-mobius.tudelft.nl/web/Masterclass/Public_Html/cubic_spline.js', function() {*/
    jQuery.getScript('https://tudelft-exercise.mobius.cloud/web/Cie4305000/Public_Html/HTML_test/cubic_spline_original.js', function() {
        console.log("Loaded 'cubic_spline.js'");
        jQuery.getScript('https://tudelft-exercise.mobius.cloud/web/Cie4305000/Public_Html/HTML_test/paper-full.js', function() {
        /*jQuery.getScript('https://online-exams-mobius.tudelft.nl/web/Masterclass/Public_Html/paper-full.min.js', function() {*/
            console.log("Loaded 'paper-full_min.js'");
            console.log("...Loaded app dependencies");
            /* Constructs PaperScope().
                Constructs Tool() for interaction with mouse & keyboard.
                Sets #myCanvas size.
                Setup PaperScope with #myCanvas. */
            var scope = new paper.PaperScope();
            var tool = new scope.Tool();
            $("#myCanvas").width( canvasDef.width );
            $("#myCanvas").height( canvasDef.height );
            scope.setup($("#myCanvas")[0]);
            console.log("Canvas project setup. Ready for drawing and interaction.");
            
            /* Initialize a bunch of variables */
            var hitOptions = 
                {
                segments: true,
                curves: false,
                stroke: true,
                fill: false,
                tolerance: 10
                };
            var mouseDraggedFrom;
            var movedby;
            var selected_x = null;
            var selected_y = null ;
            var y_axis_coordinate;
            var x_axis_coordinate;
            var x_view_major_steps
            var y_view_major_steps
            var PointsLocation = [];
            var pathsPointsfitsX =[];
            var pathsPointsfitsY =[];
            var drawnPoints = new scope.Group();
            var splinePoints = new scope.Group();
            var PermanentElements = new scope.Group();
            var correctanswerGradebook = false;
            
            draw_axis();
            console.log("Axes and grid are drawn");
            
            if (type==1) {
                console.log("type = 1 : " + array);
                buttons();
                interact();
            }
            else if (type==2) {
                /* array = "[[fitted spline] , [user browser coor] , [user axis coor] , [spline coor minimum] , [spline coor maximum]]" 
                    --spline coor miminum/maximum are only elements if getResponse got called (graded) */
                console.log("type = 2 : " + array);
                var res =  JSON.parse(array);
                var fitted_spline = res[0];
                var user_browser = res[1];

                for (i = 0 ; i < user_browser.length ; i++) {
                    /* Adds the drawn points regardless of interactive or gradebook mode,
                        otherwise no spline is drawn */
                    PointsLocation.push(new scope.Point(user_browser[i][0], user_browser[i][1]));
                }
                
                if (gradebook) {
                    /* Adds the response (fitted spline) for the gradebook.
                       This requires the spline coordinates in axis format to be transformed to browser format */
                    for (i = 0 ; i < fitted_spline.length ; i++) {
                        pathsPointsfitsX.push(AxisXtoBrowserX(fitted_spline[i][0]));
                        pathsPointsfitsY.push(AxisYtoBrowserY(fitted_spline[i][1]));
                    }
                    draw_spline();
                } 
                else {
                    /* Adds the response (fitted spline) when interactive mode is still true. */
                    for (i = 0 ; i < user_browser.length ; i++) {
                        pathsPointsfitsX.push(user_browser[i][0]);
                        pathsPointsfitsY.push(user_browser[i][1]);
                    }
                    buttons();
                    interact();
                    draw_spline();
                }
            } 
            else if (type==3) {
                console.log("type = 3 : " + array);
                /* array = $answer (i.e., "[[x1,y1],[...],[xn,yn]]") */
                var res2 = JSON.parse(array); /* parses $answer string and returns same string without " ". */
                var res =  JSON.parse(res2); /* parses again to get actual javascript array (i.e., [[x1,y1],[...],[xn,yn]]) */
                for (i = 0 ; i < res.length ; i++) {
                    correctanswerGradebook = true;
                    PointsLocation.push(new scope.Point(AxisXtoBrowserX(res[i][0]), AxisYtoBrowserY(res[i][1]) ) );
                    pathsPointsfitsX.push(AxisXtoBrowserX(res[i][0]));
                    pathsPointsfitsY.push(AxisYtoBrowserY(res[i][1]));
                }
                draw_spline();
            }
            else {
                console.log("Error! incorrect type for RunApp(array,type). Type is 1, 2 or 3.");
            }

            function draw_label_text(digit, x1, y1, LabelJustification, LabelColor, LabelFontSize, LabelShowZero, LabelNumberPrecision) {
                var text = new scope.PointText(new scope.Point(x1, y1));
                text.justification = LabelJustification;
                text.fillColor = LabelColor;
                text.fontSize = LabelFontSize;
                if (!LabelShowZero) {
                    text.content = digit.toFixed(LabelNumberPrecision);
                }
                return text;                            
            };

            function draw_line(x1, y1, x2, y2, width, colour) {
                var new_line = new scope.Path([new scope.Point(x1, y1), new scope.Point(x2, y2)]);
                new_line.strokeWidth = width;
                new_line.strokeColor = new scope.Color(colour) ;
                return new_line;
            };

            function draw_arrow(startP, endP) {
                /* add axis line */
                var axisline = new scope.Path();
                axisline.strokeColor = axis_definition.AxisLineColor;
                axisline.strokeWidth = axis_definition.AxisLineThickness ;
                axisline.add(startP);
                axisline.add(endP); 
                PermanentElements.addChild(axisline);
                /* add arrow head
                    arrow head is constructed from a vector object
                    the vector consists of three points that create a '^','>','<','v' shape,
                    depending on function input. */
                var vector = endP.subtract(startP);
                vector.length = axis_definition.AxisArrowSize;
                var vectorItem = new scope.Path([
                    endP.add(vector.rotate(axis_definition.AxisArrowAngle)),
                    endP,
                    endP.add(vector.rotate(-axis_definition.AxisArrowAngle))
                ]);
                vectorItem.strokeWidth = axis_definition.AxisArrowLineThickness;
                vectorItem.strokeColor = axis_definition.AxisArrowLineColor;
                PermanentElements.addChild(vectorItem);
            };

            function BrowserXtoAxisX(x_loc){
                if (!axis_definition.xAxisFlipped) {
                    return (x_loc - (Math.abs(axes[0])/major_grid_lines.xStep * x_view_major_steps + canvasDef.hPad))/x_view_major_steps*major_grid_lines.xStep ;
                } 
                else {
                    return -(x_loc - (Math.abs(axes[1])/major_grid_lines.xStep * x_view_major_steps + canvasDef.hPad))/x_view_major_steps*major_grid_lines.xStep ;
                }
            };

            function BrowserYtoAxisY(y_loc){
                if (!axis_definition.yAxisFlipped) {
                    return (-y_loc + (Math.abs(axes[3])/major_grid_lines.yStep * y_view_major_steps + canvasDef.vPad))/y_view_major_steps*major_grid_lines.yStep;
                } 
                else {
                    return -(-y_loc - Math.abs(axes[3])/major_grid_lines.yStep * y_view_major_steps - canvasDef.vPad + canvasDef.height )/y_view_major_steps*major_grid_lines.yStep;
                }
            };

            function AxisXtoBrowserX(x_loc){
                if (!axis_definition.xAxisFlipped) {
                    return x_loc*x_view_major_steps/major_grid_lines.xStep + (Math.abs(axes[0])/major_grid_lines.xStep * x_view_major_steps + canvasDef.hPad);
                } 
                else {
                    return -x_loc*x_view_major_steps/major_grid_lines.xStep + (Math.abs(axes[1])/major_grid_lines.xStep * x_view_major_steps + canvasDef.hPad);
                }
            };

            function AxisYtoBrowserY(y_loc){
                if (!axis_definition.yAxisFlipped) {
                    return -y_loc*y_view_major_steps/major_grid_lines.yStep + (Math.abs(axes[3])/major_grid_lines.yStep * y_view_major_steps + canvasDef.vPad);
                } 
                else {
                    return y_loc*y_view_major_steps/major_grid_lines.yStep - Math.abs(axes[3])/major_grid_lines.yStep * y_view_major_steps - canvasDef.vPad + canvasDef.height;
                }
            };

            function even_fix(getal, waarde){
                if ((navigator.userAgent.indexOf("Chrome") !== -1)) {
                    return getal + waarde;
                } 
                else {
                    return getal;
                }
            };                

            function draw_axis() {
                /* Draws permenant part of canvas (i.e., the axis, gridlines and labels) */
                /* Remove everything */
                PermanentElements.removeChildren();
                /* Compute distance between minor check marks in browser coordinate system.
                    Round because browser coordinates are always integers. */
                var x_view_minor_step = Math.round((canvasDef.width  - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0]) / minor_grid_lines.xStep)));
                var y_view_minor_step = Math.round((canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2]) / minor_grid_lines.yStep)));
                /* Recalculate canvas size. */
                canvasDef.width  = x_view_minor_step * ((Math.abs(axes[1] - axes[0]) / minor_grid_lines.xStep)) + canvasDef.hPad*2;
                canvasDef.height = y_view_minor_step * ((Math.abs(axes[3] - axes[2]) / minor_grid_lines.yStep)) + canvasDef.vPad*2;
                $("#myCanvas").width( canvasDef.width );
                $("#myCanvas").height( canvasDef.height );
                scope.viewSize = [canvasDef.width, canvasDef.height]; 
                console.log("Re-sizing canvas (width x height): " + canvasDef.width + " x " + canvasDef.height);

                /* Compute distance between major check marks in browser coordinate system.
                    Round because browser coordinates are always integers. */
                x_view_major_steps = Math.round((canvasDef.width  - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0]) / major_grid_lines.xStep)));
                y_view_major_steps = Math.round((canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2]) / major_grid_lines.yStep)));
                
                /* Set deltax for extra points when clicking min/max button */
                try { 
                    if (deltax !== "") {
                        deltax = parseFloat(deltax);
                    } 
                    else {
                        deltax = (minor_grid_lines.xStep * x_view_major_steps / 2.0) ;
                    }
                } 
                catch {
                    deltax = (minor_grid_lines.xStep * x_view_major_steps / 2.0) ;
                }

                /* Set deltay for extra points when clicking min/max button */
                try {
                    if (deltay !== "") {
                        deltay = parseFloat(deltay);
                    } 
                    else {
                        deltay = (minor_grid_lines.yStep * y_view_major_steps / 5.0);
                    }	 
                } 
                catch {
                    deltay = (minor_grid_lines.yStep * y_view_major_steps / 5.0);
                }
                
                /* y-axis position validation and set its x_coordinate */
                if (axis_definition.y_axis_position != "auto" ) {
                    if (axis_definition.y_axis_position == "left") {
                        x_axis_coordinate = canvasDef.hPad;
                    } 
                    else if (axis_definition.y_axis_position == "right") {
                        x_axis_coordinate = canvasDef.width - canvasDef.hPad;
                    }
                    else {
                        console.log("y axis position undefined, selector: " + axis_definition.y_axis_position + " unknown. [auto, left, right]");
                        errormessages = "y axis position undefined, selector: " + axis_definition.y_axis_position + " unknown. [auto, left, right]";
                    }
                } 
                else {
                    if ((axes[0] > 0 && axes[1] > 0) || (axes[0] < 0 && axes[1] < 0)) {
                        /* x_axis coordinates always larger/smaller than 0 (i.e., no intersection with y_axis at 0) */
                        x_axis_coordinate = canvasDef.hPad; 
                    } 
                    else if (axes[0] == 0 && !axis_definition.xAxisFlipped) {
                        /* (left) x_axis starts at 0 and positive to the right */
                        x_axis_coordinate = canvasDef.hPad;
                    } 
                    else if (axes[0] == 0 && axis_definition.xAxisFlipped) {
                        x_axis_coordinate = canvasDef.width-canvasDef.hPad;
                        /* (right) x_axis starts at 0 and positive to the left (flipped) */
                    } 
                    else if (axis_definition.xAxisFlipped) {
                        /* x_axis is flipped, set to x = 0 coordinate */
                        x_axis_coordinate = -Math.abs(axes[0]) / major_grid_lines.xStep * x_view_major_steps - canvasDef.hPad + canvasDef.width; 
                    } 
                    else {
                        /* Set to x = 0 coordinate */
                        x_axis_coordinate = Math.abs(axes[0])/major_grid_lines.xStep * x_view_major_steps  + canvasDef.hPad;
                    }
                }

                /* x-axis position validation and set its y_coordinate */
                if (axis_definition.x_axis_position != "auto" ) {
                    if (axis_definition.x_axis_position == "top") {
                        y_axis_coordinate = canvasDef.vPad;
                    } 
                    else if (axis_definition.x_axis_position == "bottom") {
                        y_axis_coordinate = canvasDef.height-canvasDef.vPad;
                    } 
                    else {
                        console.log("x axis position undefined, selector: " + axis_definition.x_axis_position + " unknown. [auto, top, bottom]");
                        errormessages ="x axis position undefined, selector: " + axis_definition.x_axis_position + " unknown. [auto, top, bottom]";
                    }
                } 
                else {
                    if ((axes[2] > 0 && axes[3] > 0) || (axes[2] < 0 && axes[3] < 0)) {
                        /* y_axis coordinates always larger/smaller than 0 (i.e., no intersection with x_axis at 0) */
                        y_axis_coordinate = canvasDef.vPad;
                    } 
                    else if (axes[2] == 0 && !axis_definition.yAxisFlipped) {
                        /* (bottom) y_axis starts at 0 and positive upwards */
                        y_axis_coordinate = canvasDef.height-canvasDef.vPad;
                    } 
                    else if (axes[2] == 0 && axis_definition.yAxisFlipped) {
                        /* (top) y_axis starts at 0 and positive downwards */
                        y_axis_coordinate = canvasDef.vPad;
                    } 
                    else if (axis_definition.yAxisFlipped) {
                        /* y_axis is flipped, set to y = 0 coordinate */
                        y_axis_coordinate = -Math.abs(axes[3])/major_grid_lines.yStep * y_view_major_steps  - canvasDef.vPad + canvasDef.height; 
                    } 
                    else {
                        /* Set to y = 0 coordinate */
                        y_axis_coordinate = (Math.abs(axes[3])/major_grid_lines.yStep * y_view_major_steps  + canvasDef.vPad); 
                    }
                }

                if (!axis_definition.xAxisFlipped) {
                    if (axis_definition.xAxisArrow) {
                        /* Draw x_axis, not flipped. Extend line 0.5*hPad beyond draw area */
                        draw_arrow(new scope.Point(canvasDef.hPad,y_axis_coordinate), new scope.Point(canvasDef.width - canvasDef.hPad/2,y_axis_coordinate));
                    }
                    /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                    var x_temp = even_fix(canvasDef.hPad, 0.5);
                    for (var i = axes[0]; i <= axes[1] ; i = i + major_grid_lines.xStep) {
                        /* Draw major vertical grid line */
                        PermanentElements.addChild(draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, major_grid_lines.lineWidth, major_grid_lines.lineColor));
                        /* Draw major vertical checkmark */
                        PermanentElements.addChild(draw_line(x_temp, y_axis_coordinate + major_grid_lines.checkmark_offset, x_temp, 
                            y_axis_coordinate - major_grid_lines.checkmark_offset, major_grid_lines.checkmark_width, major_grid_lines.checkmark_color));
                        /* Draw x_axis major checkmark labels */
                        PermanentElements.addChild(draw_label_text(i, x_temp + axis_definition.xLabelPositionHorizontal, y_axis_coordinate + axis_definition.xLabelPositionVertical, 
                            axis_definition.xLabelJustification, axis_definition.xLabelColor, axis_definition.xLabelFontSize, axis_definition.xLabelShowZero ,axis_definition.xLabelNumberPrecision));
                        x_temp = (x_temp + x_view_major_steps);
                    }
                } 
                else {
                    /* Draw x_axis, flipped. Extend line 0.5*hPad beyond draw area */
                    if (axis_definition.xAxisArrow) {
                        draw_arrow(new scope.Point(canvasDef.width - canvasDef.hPad, y_axis_coordinate), new scope.Point(canvasDef.hPad/2, y_axis_coordinate));
                    }
                    /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                    x_temp = even_fix(canvasDef.width - canvasDef.hPad, -0.5);
                    for (var i = axes[0]; i <= axes[1] ; i = i + major_grid_lines.xStep) {
                        /* Draw major vertical grid line */
                        PermanentElements.addChild(draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, major_grid_lines.lineWidth, major_grid_lines.lineColor));
                        /* Draw major vertcial checkmark */
                        PermanentElements.addChild(draw_line(x_temp, y_axis_coordinate + major_grid_lines.checkmark_offset, x_temp, y_axis_coordinate - major_grid_lines.checkmark_offset, 
                            major_grid_lines.checkmark_width, major_grid_lines.checkmark_color));
                        /* Draw x_axis major checkmark labels */
                        PermanentElements.addChild(draw_label_text(i, x_temp + axis_definition.xLabelPositionHorizontal, y_axis_coordinate + axis_definition.xLabelPositionVertical, 
                            axis_definition.xLabelJustification, axis_definition.xLabelColor, axis_definition.xLabelFontSize , axis_definition.xLabelShowZero ,axis_definition.xLabelNumberPrecision));
                        x_temp = (x_temp - x_view_major_steps);
                    }
                }

                if (!axis_definition.yAxisFlipped) {
                    if (axis_definition.yAxisArrow) {
                        /* Draw y_axis, not flipped. Extend line 0.5*vPad beyond draw area */
                        draw_arrow(new scope.Point(x_axis_coordinate, canvasDef.height - canvasDef.vPad), new scope.Point(x_axis_coordinate, canvasDef.vPad/2));
                    }
                    /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                    var y_temp = even_fix(canvasDef.vPad, 0.5);
                    for (var i = axes[3]; i >= axes[2] ; i = i - major_grid_lines.yStep) {
                        /* Draw major horizontal grid line */
                        PermanentElements.addChild(draw_line(canvasDef.hPad, y_temp, canvasDef.width-canvasDef.vPad, y_temp ,major_grid_lines.lineWidth, major_grid_lines.lineColor));
                        /* Draw major horizontal checkmark */
                        PermanentElements.addChild(draw_line(x_axis_coordinate + major_grid_lines.checkmark_offset, y_temp, x_axis_coordinate - major_grid_lines.checkmark_offset, 
                            y_temp, major_grid_lines.checkmark_width, major_grid_lines.checkmark_color));
                        /* Draw y_axis major checkmark labels */
                        PermanentElements.addChild(draw_label_text(i, x_axis_coordinate + axis_definition.yLabelPositionHorizontal, y_temp + axis_definition.yLabelPositionVertical, 
                            axis_definition.yLabelJustification, axis_definition.yLabelColor, axis_definition.yLabelFontSize ,axis_definition.yLabelShowZero, axis_definition.yLabelNumberPrecision));
                        y_temp = y_temp + y_view_major_steps;
                    }
                } else {
                    if (axis_definition.yAxisArrow){
                        /* Draw y_axis, flipped. Extend line 0.5*vPad beyond draw area */
                        draw_arrow(new scope.Point(x_axis_coordinate, canvasDef.vPad), new scope.Point(x_axis_coordinate, canvasDef.height-canvasDef.vPad/2));
                    }
                    /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                    var y_temp = even_fix(canvasDef.vPad, 0.5);
                    for (var i = axes[2]; i <= axes[3] ; i = i + major_grid_lines.yStep) {
                        /* Draw major horizontal grid line */
                        PermanentElements.addChild(draw_line(canvasDef.hPad, y_temp, canvasDef.width - canvasDef.vPad, y_temp, major_grid_lines.lineWidth, major_grid_lines.lineColor));
                        /* Draw major horizontal checkmark */
                        PermanentElements.addChild(draw_line(x_axis_coordinate + major_grid_lines.checkmark_offset, y_temp, x_axis_coordinate - major_grid_lines.checkmark_offset, y_temp,
                            major_grid_lines.checkmark_width, major_grid_lines.checkmark_color));
                        /* Draw y_axis major checkmark labels */
                        PermanentElements.addChild(draw_label_text(i, x_axis_coordinate + axis_definition.yLabelPositionHorizontal, y_temp + axis_definition.yLabelPositionVertical, 
                            axis_definition.yLabelJustification, axis_definition.yLabelColor, axis_definition.yLabelFontSize, axis_definition.yLabelShowZero, axis_definition.yLabelNumberPrecision));
                        y_temp = y_temp + y_view_major_steps;
                    }
                }

                /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                x_temp = even_fix(canvasDef.hPad, 0.5);
                for (var i = axes[0]; i <= axes[1] ; i = i + minor_grid_lines.xStep) {
                    /* Draw minor vertical grid line */
                    PermanentElements.addChild(draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, minor_grid_lines.lineWidth, minor_grid_lines.lineColor));
                    /* Draw minor vertical check mark */
                    PermanentElements.addChild(draw_line(x_temp, y_axis_coordinate + minor_grid_lines.checkmark_offset, x_temp, y_axis_coordinate - minor_grid_lines.checkmark_offset,
                        minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color));
                    x_temp = (x_temp + x_view_minor_step);
                }

                /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                y_temp = even_fix(canvasDef.vPad, 0.5);
                for (var i = axes[3]; i >= axes[2] ; i = i - minor_grid_lines.yStep) {
                    /* Draw minor horizontal grid line */
                    PermanentElements.addChild(draw_line(canvasDef.hPad, y_temp, canvasDef.width - canvasDef.vPad, y_temp, minor_grid_lines.lineWidth, minor_grid_lines.lineColor));
                    /* Draw minor vertical check mark */
                    PermanentElements.addChild(draw_line(x_axis_coordinate + minor_grid_lines.checkmark_offset, y_temp, x_axis_coordinate - minor_grid_lines.checkmark_offset, y_temp,
                        minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color));
                    y_temp = y_temp + y_view_minor_step;
                }

                /* x_axis name label */
                if (axis_definition.xAxisName != "") {
                    var text = new scope.PointText(new scope.Point(canvasDef.width/2 + axis_definition.xAxisNameHorizontal, y_axis_coordinate+axis_definition.xAxisNameVertical));
                    text.justification = axis_definition.xAxisNameJustification;
                    text.fillColor = axis_definition.xAxisNameFontColor;
                    text.fontSize = axis_definition.xAxisNameFontSize;
                    text.content = axis_definition.xAxisName;
                    PermanentElements.addChild(text);
                }

                /* y_axis name label */
                if (axis_definition.yAxisName != "") {
                    var text = new scope.PointText(new scope.Point(x_axis_coordinate + axis_definition.yAxisNameHorizontal, canvasDef.height/2 + axis_definition.yAxisNameVertical));
                    text.rotate(axis_definition.yAxisNameOrientation);
                    text.justification = axis_definition.yAxisNameJustification;
                    text.fillColor = axis_definition.yAxisNameFontColor;
                    text.fontSize = axis_definition.yAxisNameFontSize;
                    text.content =  axis_definition.yAxisName;
                    PermanentElements.addChild(text);
                }
                
                /* Draw background line(s) */
                for (var property in backgroundlines) {
                    if (backgroundlines.hasOwnProperty(property)) {
                        var lineObject = backgroundlines[property];
                        var x_val = lineObject.x;
                        var y_val = lineObject.y;
                        var lineSpline = new MonotonicCubicSpline(x_val, y_val);
                        var linePath = new scope.Path();
                        linePath.strokeWidth = backgroundlines.lineThickness;

                        /* If GreyShade < 0, use lineColor for strokeColor.
                            Otherwise, ignore lineColor and use GreyShade */
                        if (lineObject.lineColorGreyShade < 0) {
                            linePath.strokeColor = lineObject.lineColor;
                        } 
                        else {
                            linePath.strokeColor = new scope.Color(lineObject.lineColorGreyShade);
                        }

                        /* Add points to create background spine */
                        if (AxisXtoBrowserX(x_val[0]) > AxisXtoBrowserX(x_val[x_val.length-1])) {
                            for (var pointX = AxisXtoBrowserX(x_val[0]); pointX >= AxisXtoBrowserX(x_val[x_val.length-1]); pointX = pointX - draw_step) {
                                var temp_y = lineSpline.interpolate(BrowserXtoAxisX(pointX));
                                var temp = new scope.Point(pointX, AxisYtoBrowserY(temp_y));
                                if ((!(lineObject.hasOwnProperty("x_limit_max")) || ((lineObject.hasOwnProperty("x_limit_max")) && AxisXtoBrowserX(lineObject.x_limit_max) <= pointX)) && (!(lineObject.hasOwnProperty("x_limit_min")) || ((lineObject.hasOwnProperty("x_limit_min")) && AxisXtoBrowserX(lineObject.x_limit_min) >= pointX))) {
                                        linePath.add(temp); 
                                }
                            }
                        } 
                        else {
                            for (var pointX = AxisXtoBrowserX(x_val[0]); pointX <= AxisXtoBrowserX(x_val[x_val.length-1]); pointX = pointX + draw_step) {
                                var temp_y = lineSpline.interpolate(BrowserXtoAxisX(pointX));
                                var temp = new scope.Point(pointX, AxisYtoBrowserY(temp_y));
                                if ((!(lineObject.hasOwnProperty("x_limit_max")) || ((lineObject.hasOwnProperty("x_limit_max")) && AxisXtoBrowserX(lineObject.x_limit_max) >= pointX)) &&  (!(lineObject.hasOwnProperty("x_limit_min")) || ((lineObject.hasOwnProperty("x_limit_min")) && AxisXtoBrowserX(lineObject.x_limit_min) <= pointX))) {
                                    linePath.add(temp); 
                                }
                            }
                        }
                        
                        if (!(lineObject.hasOwnProperty("x_limit_max")) || ((lineObject.hasOwnProperty("x_limit_max")) &&  (lineObject.x_limit_max >= x_val[x_val.length-1]))) {
                            linePath.add(new scope.Point(AxisXtoBrowserX(x_val[x_val.length-1]), AxisYtoBrowserY(y_val[x_val.length-1])));
                        }
                        PermanentElements.addChild(linePath);
                    }
                }
                /* Adds all Child objects to the active layer:
                    x_axis, y_axis, x_axis labels, y_axis labels,
                    major grid lines, minor grid lines,
                    major checkmarks, minor checkmarks,
                    major checkmark labels,
                    backgroundline */
                scope.project.activeLayer.addChild(PermanentElements);
            };

            function draw_spline() {
                if (teachermode) {
                    /* Draw extra information for teachers:
                        HTML table for drawn points (x,y)
                        Display any error message */
                    var teacherDiv = document.createElement('div');
                    teacherDiv.id = 'teacher';
                    teacherDiv.className = 'teacher';
                    teacherDiv.style="overflow-y:scroll; height:500px";
                    document.getElementsByTagName('body')[0].appendChild(teacherDiv);

                    var temptext = "<table style='width:80%'>";
                    temptext = temptext + "<tr> <th> x: </th> <th> y: </th> </tr>";
                    for (points = 0 ; points < PointsLocation.length ; points++ ) {
                        temptext = temptext + "<tr> <th>" + BrowserXtoAxisX(PointsLocation[points].x) + 
                                                "</th> <th>" + BrowserYtoAxisY(PointsLocation[points].y) + 
                                                "</th> </tr>";
                    }
                    temptext = temptext + "</table>";                                                                                                         
                    document.getElementById("teacher").innerHTML = errormessages + "<br/>" + "Drawn points <br/>" + temptext;
                }

                if (PointsLocation.length != 0 ) {
                    /* Remove drawn points and spline */
                    drawnPoints.removeChildren();
                    splinePoints.removeChildren();
                    
                    /******POINTS BY USER******/
                    var pointsToStringBrowserCoor = ""; /* Create string for browser coordinates */
                    var pointsToStringAxisCoor = ""; /* Create string for axis coordinates */
                    /* Add points to be drawn if not displaying Gradebook */
                    if (!correctanswerGradebook) {
                        for (i = 0 ; i < PointsLocation.length ; i++ ) {
                            pointsToStringBrowserCoor = pointsToStringBrowserCoor + "[" + PointsLocation[i].x + "," + PointsLocation[i].y + "],";   
                            pointsToStringAxisCoor = pointsToStringAxisCoor + "[" + BrowserXtoAxisX(PointsLocation[i].x) + "," + BrowserYtoAxisY(PointsLocation[i].y) + "],";
                            
                            var circle_radius = 5;
                            var circle = new scope.Shape.Circle(PointsLocation[i], circle_radius);
                            circle.strokeColor = 'black';
                            /* If circle is selected, change fillColor to red */
                            if (selected_x !== null && selected_y !== null && (Math.abs(PointsLocation[i].x - selected_x) < hitOptions.tolerance)) {
                                circle.fillColor = 'red';
                            }
                            drawnPoints.addChild(circle);
                        }
                    }
                    
                    /******POINTS FOR SPLINE******/
                    var lineSpline = new scope.Path();
                    lineSpline.strokeColor = 'red';
                    lineSpline.strokeWidth = 1.7;
                    
                    var pointsForMinMaxX = [];
                    var pointsForMinMaxY = [];
                    var mySpline = new MonotonicCubicSpline(pathsPointsfitsX, pathsPointsfitsY);
                    AnswerStr = "[[";
                    /* Add points to draw lines between to create fitted spline.
                        Also, add those points to AnswerStr */
                    for (var pointX = PointsLocation[0].x; pointX <= PointsLocation[PointsLocation.length-1].x; pointX = pointX + draw_step) {
                        var pointY = mySpline.interpolate(pointX);
                        lineSpline.add(new scope.Point(pointX,pointY));
                        AnswerStr = AnswerStr + "[" + BrowserXtoAxisX(pointX) + "," + BrowserYtoAxisY(pointY) + "],";
                        pointsForMinMaxX.push(BrowserXtoAxisX(pointX));
                        pointsForMinMaxY.push(BrowserYtoAxisY(pointY));
                    } 
                                                    
                    lineSpline.add(new scope.Point(PointsLocation[PointsLocation.length-1].x, mySpline.interpolate(PointsLocation[PointsLocation.length-1].x)));
                    splinePoints.addChild(lineSpline);

                    /* Slice off last comma from "[x1,y1],[...],[xn,yn]," */
                    pointsToStringBrowserCoor = pointsToStringBrowserCoor.slice(0, -1);
                    pointsToStringAxisCoor = pointsToStringAxisCoor.slice(0, -1);
                    AnswerStr = AnswerStr.slice(0, -1);

                    /* finds fitted points that have maximum/minimum y-coordinate */
                    var max_y = Math.max.apply(null, pointsForMinMaxY);
                    var min_y = Math.min.apply(null, pointsForMinMaxY);

                    /* finds index of max/min fitted points */    
                    val_pos_max = pointsForMinMaxY.indexOf(max_y);
                    val_pos_min = pointsForMinMaxY.indexOf(min_y);

                    /* gets x-coordinate of said max/min fitted points */
                    var max_x = pointsForMinMaxX[val_pos_max];
                    var min_x = pointsForMinMaxX[val_pos_min];
                    
                    /* prevent min/max to be outside axes domain, simple solution */
                    if (min_x < axes[0]) {
                        min_x = axes[0];
                        min_y = mySpline.interpolate(min_x);
                    }
                    if (max_x > axes[1]) {
                        max_x = axes[1];
                        max_y = mySpline.interpolate(max_x);
                    }
                    /* Append the three arrays and min/max to the empty AnswerStr array */
                    AnswerStr = AnswerStr + "] , [" + pointsToStringBrowserCoor + "] , ["+ pointsToStringAxisCoor + "] , [[" + String(max_x) + "," + String(max_y) + " ]] , [[" + String(min_x) + "," + String(min_y) + "]]]";
                } 
                /* Draw the points and lines of the spline */
                scope.project.activeLayer.addChild(drawnPoints);
                scope.project.activeLayer.addChild(splinePoints);
            };

            function interact() {
                tool.onMouseDrag = function(click) {
                    mouseDraggedFrom = click.point;
                    movedby = click.delta;
                    var results =[];
                    for (var i = 0 ; i < PointsLocation.length ; i++) {
                        if (mouseDraggedFrom.getDistance(PointsLocation[i], false) < hitOptions.tolerance){
                            /* check if it's only one points, then move if more than 1 point, remove them */
                            results.push(i);
                        }
                    }
                    for (i = (results.length-1) ; i >= 1 ; i--) {
                        PointsLocation.splice(results[i], 1);
                        pathsPointsfitsX.splice(results[i], 1);
                        pathsPointsfitsY.splice(results[i], 1);
                    }

                    PointsLocation[results[0]] = new scope.Point(mouseDraggedFrom.x + movedby.x,mouseDraggedFrom.y + movedby.y);
                    pathsPointsfitsY[results[0]] = mouseDraggedFrom.y + movedby.y;
                    pathsPointsfitsX[results[0]] = mouseDraggedFrom.x + movedby.x;
                    draw_spline();
                };

                tool.onMouseDown = function(click) {
                    var hitPoint = new scope.Point(click.event.offsetX, click.event.offsetY);
                    var hitResult = drawnPoints.hitTest(hitPoint, hitOptions);
                    if (!hitResult) {
                        if (selected_x !== null || selected_y !== null ) {
                            selected_x = null;
                            selected_y = null ;
                        }
                        else {
                            /* First point */
                            if (PointsLocation.length == 0) {
                                PointsLocation.push(hitPoint);
                                pathsPointsfitsY.push(click.event.offsetY);
                                pathsPointsfitsX.push(click.event.offsetX);
                            }
                            /* There are points */
                            else {
                                for (var i = 0 ; i < PointsLocation.length ; i++) {
                                    /* Insert point in array */
                                    if (click.event.offsetX < PointsLocation[i].x) {
                                        PointsLocation.splice(i, 0, hitPoint);
                                        pathsPointsfitsX.splice(i, 0, click.event.offsetX);
                                        pathsPointsfitsY.splice(i, 0, click.event.offsetY);
                                        break;
                                    }
                                    /* New point at the end, append point */
                                    else if (i == PointsLocation.length - 1) {
                                            PointsLocation.splice(PointsLocation.length, 0, hitPoint);
                                            pathsPointsfitsX.splice(PointsLocation.length, 0, click.event.offsetX);
                                            pathsPointsfitsY.splice(PointsLocation.length, 0, click.event.offsetY);
                                            break;
                                    }
                                }
                            }
                        }
                    } 
                    else {
                        /* No point is selected. Draw spline */
                        selected_x = click.event.offsetX;  
                        selected_y = click.event.offsetY ;
                    }
                    draw_spline();
                };
                console.log("Interaction ready");
            }

            function buttons(){
                var delPoint = $('#delPoint');
                /* delete point */
                delPoint.click(function() { 
                    /* loops through all the drawn points */
                    for (points = 0 ; points < PointsLocation.length ; points++) {
                        /* if difference between (x,y) coordinate of point and (x,y) coordinate of selected (clicked on screen)
                            is less than 10, point is found and remove that point from array */
                        if ((Math.abs(PointsLocation[points].x - selected_x) < 10) && (Math.abs(PointsLocation[points].y - selected_y) < 10)) {
                            PointsLocation.splice(points, 1);
                            pathsPointsfitsX.splice(points, 1);
                            pathsPointsfitsY.splice(points, 1);
                        }
                    }
                    /* deselect point and draw new spline */
                    selected_x = null;
                    selected_y = null ;
                    draw_spline();
                });

                var delAll = $('#delAll');
                /* delete all points */
                delAll.click(function() { 
                    /* splice(0, .length) removes all items from array */
                    PointsLocation.splice(0, PointsLocation.length);
                    pathsPointsfitsX.splice(0, pathsPointsfitsX.length);
                    pathsPointsfitsY.splice(0, pathsPointsfitsY.length);
                    drawnPoints.removeChildren();
                    splinePoints.removeChildren();
                    /* draw spline */
                    draw_spline();
                });
                
                var buttonMin = $('#buttonMin');
                /* min function */
                buttonMin.click(function() {
                    /* loops through all the drawn points */
                    for (points = 0 ; points < PointsLocation.length ; points++ ){
                        /* if difference between (x,y) coordinate of point and (x,y) coordinate where clicked on screen
                            is less than 10, point is found and remove that point from array */
                        if ((Math.abs(PointsLocation[points].x - selected_x) < 10) && (Math.abs(PointsLocation[points].y - selected_y) < 10)) {
                            /* 'temporarily' save y-coordinate of selected point */
                            var tempy = PointsLocation[points].y;
                            /* insert point before selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(points,0, new scope.Point(selected_x - deltax, tempy - deltay ));          
                            pathsPointsfitsX.splice(points, 0, selected_x - deltax );
                            pathsPointsfitsY.splice(points, 0, tempy - deltay);
                            /* insert point after selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(points+2, 0, new scope.Point(selected_x + deltax, tempy - deltay ) );
                            pathsPointsfitsX.splice(points+2, 0, selected_x + deltax);
                            pathsPointsfitsY.splice(points+2, 0, tempy - deltay);
                            break;
                        }
                    }
                    /* deselect point and draw new spline */
                    selected_x = null;
                    selected_y = null ;
                    draw_spline();
                });  
                
                var buttonMax = $('#buttonMax');
                /* max function */
                buttonMax.click(function() { 
                    /* loops through all the drawn points */
                    for (points = 0 ; points < PointsLocation.length ; points++ ){
                        /* if difference between (x,y) coordinate of point and (x,y) coordinate where clicked on screen
                            is less than 10, point is found and remove that point from array */
                        if ((Math.abs(PointsLocation[points].x - selected_x) < 10) && (Math.abs(PointsLocation[points].y - selected_y) < 10)) {
                            /* 'temporarily' save y-coordinate of selected point */
                            var tempy = PointsLocation[points].y;
                            /* insert point before selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(points,0, new scope.Point(selected_x - deltax, tempy + deltay ) );               
                            pathsPointsfitsX.splice(points, 0, selected_x - deltax);
                            pathsPointsfitsY.splice(points, 0, tempy + deltay);
                            /* insert point after selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(points+2, 0, new scope.Point(selected_x + deltax, tempy + deltay ) );
                            pathsPointsfitsX.splice(points+2, 0, selected_x + deltax);
                            pathsPointsfitsY.splice(points+2, 0, tempy + deltay);
                            break;
                        }
                    }
                    /* deselect point and draw new spline */
                    selected_x = null;
                    selected_y = null ;
                    draw_spline();
                });

                var cont = $('#toggleContrast');
                /* toggle contrast settings */
                cont.click(function() {
                    /* get div element with id: contrast */
                    var div_contrast = document.getElementById('contrast');
                    /* Default style.display is 'none', thus the div is hidden.
                        On click style.display switches between 'block' and 'none'.
                        The 'block' type ensures the display uses the entire line and not inline. */
                    if (div_contrast.style.display === 'none') {
                        div_contrast.style.display = 'block';
                    } 
                    else {
                        div_contrast.style.display = 'none';
                    }
                });
                
                var gridMajor = $('#gridMajor');
                /* major grid lines slider */
                gridMajor.click(function() { 
                    /* clears #myCanvas */
                    scope.project.clear();
                    major_grid_lines.lineColor = gridMajor.val()/10;
                    /* redraw axis */
                    draw_axis();
                    /* draw spline */
                    draw_spline();
                });
                
                var gridMinor = $('#gridMinor');
                /* minor grid lines slider */
                gridMinor.click(function() { 
                    /* clears #myCanvas */
                    scope.project.clear();
                    minor_grid_lines.lineColor = gridMinor.val()/10;
                    /* redraw axis */
                    draw_axis();
                    /* draw spline */
                    draw_spline();
                });
                console.log("Button functionality ready");
            };
        });
    });
}