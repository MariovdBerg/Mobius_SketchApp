/*
-----INSERT OLD AND NEW PATCH NOTES-----
text

-----TO FIX-----
text

-----TO DO/CHANGE-----
Split axis_definition into X-axis (line, labels), Y-axis (line, labels) and axis-arrow (for adjustability).
Keep circle fill color red when dragging point.

-----ALERTS-----
Switched x/y positions of min/max in Response array! Adjust in (old) grading code of question in Question Bank!
In case a min/max outside domain of the spline is found, a simple solution is used by redefining the min/max to the edge of the domain.
Browser detection method is unreliable due to use of navigator.userAgent
*/

function runApp(array, type) {
    console.log("Starting app...");
    console.log(" *** 2.13 *** "); /* new version by Mario is 2.11, 7 february 2023 */
    console.log("Loading app dependencies...");
    /*jQuery.getScript('https://online-exams-mobius.tudelft.nl/web/Masterclass/Public_Html/cubic_spline.js', function() {*/
    jQuery.getScript('https://tudelft-exercise.mobius.cloud/web/Cie4305000/Public_Html/HTML_test/cubic_spline_original.js', function() {
        jQuery.getScript('https://tudelft-exercise.mobius.cloud/web/Cie4305000/Public_Html/HTML_test/paper-full.js', function() {
        /*jQuery.getScript('https://online-exams-mobius.tudelft.nl/web/Masterclass/Public_Html/paper-full.min.js', function() {*/
            console.log("...Loaded app dependencies");

            /* Create a variable "scope" with the PaperScope object to access Paper.js classes.
               Then, create the Tool object. The Tool object is necessary for keyboard and mouse interaction. */
            var scope = new paper.PaperScope();
            var tool = new scope.Tool();
            
            /* Set up an empty project within scope and provide the HTML canvas. Creates the View object for drawing and interaction */
            /* But first, set initial canvas dimensions. These will be resized later. */
            $("#myCanvas").width( canvasDef.width ); 
            $("#myCanvas").height( canvasDef.height );
            scope.setup($("#myCanvas")[0]); /* Use jQuery to get DOM (Document Object Model) elements, pass [0] to get the actual element */
            
            /* If teachermode is True, create a <div> HTML element with a <table> HTML element. */
            if(teachermode) {
                var teacherDiv = document.createElement('div');
                teacherDiv.id = 'teacher';
                teacherDiv.className = 'teacher';
                teacherDiv.style="overflow-y:scroll; height:300px";
                document.getElementsByTagName('body')[0].appendChild(teacherDiv);
            }
            
            console.log("Canvas project setup. Ready for drawing and interaction.");      

            /* Create 3 Group objects to store information */
            var PermanentElements = new scope.Group(); /* stores objects that draw the background graph */
            var DrawnPoints = new scope.Group(); /* stores Circle objects that draw the user clicked */
            var SplinePoints = new scope.Group(); /* stores Point objects that make up the spline */

            /* Create arrays that store information about the user and interpolated Points */
            var PointsLocation = []; /* array of the user Point objects */ 
            var PathPoints; /* array of the spline Point objects */
            var FittedSplineBrowserX = []; /* array of the spline x-coordinates in browser pixels */
            var FittedSplineBrowserY = []; /* array of the spline y-coordinates in browser pixels */

            /* Global variables for drawing the background graph */
            var y_axis_x_coordinate; /* pixel location of horizontal axis (x-axis) */
            var x_axis_y_coordinate; /* pixel location of vertical   axis (y-axis) */
            var majorX_BrowserStep;  /* pixel distance between major vertical   gridlines */
            var majorY_BrowserStep;  /* pixel distance between major horiztonal gridlines */
            var minorX_BrowserStep;  /* pixel distance between minor vertical   gridlines */
            var minorY_BrowserStep;  /* pixel distance between minor horizontal gridlines */

            /* Global variables for selecting a Point */
            var selected_x = null; /* browser x-coordinate where the user clicked */
            var selected_y = null; /* browser y-coordinate where the user clicked */
            var hitPoint; /* Point object where the user clicked */
            var hitOptions = /* Options for the hitTest */
                {
                fill: false,
                stroke: true,
                segments: true,
                curves: false,
                tolerance: 10
                };

            /* Other */
            var correctanswerGradebook = false;
            var mySpline;
            
            draw_axis();
            console.log("Axes, labels, gridlines and optional background spline are drawn");
            
            if (type==1) {
                buttons();
                interact();
            }
            else if (type==2) {
                /* array = "[[fitted spline axis coor] , [user browser coor] , [user axis coor] , [spline coor minimum] , [spline coor maximum]]" 
                    --spline coor miminum/maximum are only elements if getResponse got called (graded) */
                var Response =  JSON.parse(array);
                var FittedSpline = Response[0];
                var BrowserCoor = Response[1];

                for (var i = 0 ; i < BrowserCoor.length ; i++) {
                    /* Adds the drawn points regardless of interactive or gradebook mode,
                        otherwise no spline is drawn */
                    PointsLocation.push(new scope.Point(BrowserCoor[i][0], BrowserCoor[i][1]));
                }
                
                if (gradebook) {
                    /* Adds the response (fitted spline) for the gradebook.
                       This requires the spline coordinates in axis format to be transformed to browser format */
                    for (var i = 0 ; i < FittedSpline.length ; i++) {
                        FittedSplineBrowserX.push(AxisXtoBrowserX(FittedSpline[i][0]));
                        FittedSplineBrowserY.push(AxisYtoBrowserY(FittedSpline[i][1]));
                    }
                    draw_spline();
                } 
                else {
                    /* Adds the response (fitted spline) when interactive mode is still true. */
                    for (var i = 0 ; i < BrowserCoor.length ; i++) {
                        FittedSplineBrowserX.push(BrowserCoor[i][0]);
                        FittedSplineBrowserY.push(BrowserCoor[i][1]);
                    }
                    buttons();
                    interact();
                    draw_spline();
                    createAnswer();
                }
            } 
            else if (type==3) {
                /* array = $answer (i.e., "[[x1,y1],[...],[xn,yn]]") */
                var Response2 = JSON.parse(array); /* parses $answer string and returns same string without " ". */
                var Response =  JSON.parse(Response2); /* parses again to get actual javascript array (i.e., [[x1,y1],[...],[xn,yn]]) */
                for (var i = 0 ; i < Response.length ; i++) {
                    correctanswerGradebook = true;
                    PointsLocation.push(new scope.Point(AxisXtoBrowserX(Response[i][0]), AxisYtoBrowserY(Response[i][1]) ) );
                    FittedSplineBrowserX.push(AxisXtoBrowserX(Response[i][0]));
                    FittedSplineBrowserY.push(AxisYtoBrowserY(Response[i][1]));
                }
                draw_spline();
            }
            else {
                console.log("Error! incorrect type for RunApp(array,type). Type is 1, 2 or 3.");
            }

            function BrowserXtoAxisX(x_loc){
                if (!x_axis_definition.Flipped) {
                    return axes[0] + (x_loc - canvasDef.hPad) * (major_grid_lines.xStep / majorX_BrowserStep) ;
                } 
                else {
                    return axes[1] - (x_loc - canvasDef.hPad) * (major_grid_lines.xStep / majorX_BrowserStep) ;
                }
            };

            function BrowserYtoAxisY(y_loc){
                if (!y_axis_definition.Flipped) {
                    return axes[3] - (y_loc - canvasDef.vPad) * (major_grid_lines.yStep / majorY_BrowserStep) ;
                } 
                else {
                    return axes[2] + (y_loc - canvasDef.vPad) * (major_grid_lines.yStep / majorY_BrowserStep) ;
                }
            };

            function AxisXtoBrowserX(x_loc){
                if (!x_axis_definition.Flipped) {
                    return canvasDef.hPad + Math.abs((x_loc - axes[0])) * (majorX_BrowserStep / major_grid_lines.xStep) ;
                } 
                else {
                    return canvasDef.hPad + Math.abs((x_loc - axes[1])) * (majorX_BrowserStep / major_grid_lines.xStep) ;
                }
            };

            function AxisYtoBrowserY(y_loc){
                if (!y_axis_definition.Flipped) {
                    return canvasDef.vPad + Math.abs((axes[3] - y_loc)) * (majorY_BrowserStep / major_grid_lines.yStep) ;
                } 
                else {
                    return canvasDef.vPad + Math.abs((axes[2] - y_loc)) * (majorY_BrowserStep / major_grid_lines.yStep) ;
                }
            };

            /**
             * Draws the background graph (axes, gridlines, labels, optional: spline)
             */
            function draw_axis() {               
                /**
                 * Draw a line with an arrow top. Used for the axes.
                 * @param {PaperScope.Point} startPoint - Paper.js Point object
                 * @param {PaperScope.Point} endPoint - Paper.js Point object
                 */
                function draw_arrow(startPoint, endPoint) {
                    /* add axis line */
                    var axisLine = new scope.Path();
                    axisLine.strokeColor = axes_arrow.AxisLineColor;
                    axisLine.strokeWidth = axes_arrow.AxisLineThickness ;
                    axisLine.add(startPoint);
                    axisLine.add(endPoint); 
                    PermanentElements.addChild(axisLine);
                    /* add arrow head
                        arrow head is constructed from a vector object
                        the vector consists of three points that create a '^','>','<','v' shape,
                        depending on function input. */
                    var vector = endPoint.subtract(startPoint);
                    vector.length = axes_arrow.Size;
                    var vectorItem = new scope.Path([
                        endPoint.add(vector.rotate(axes_arrow.Angle)),
                        endPoint,
                        endPoint.add(vector.rotate(-axes_arrow.Angle))
                    ]);
                    vectorItem.strokeWidth = axes_arrow.ArrowLineThickness;
                    vectorItem.strokeColor = axes_arrow.ArrowLineColor;
                    PermanentElements.addChild(vectorItem);
                };

                /**
                 * Draw the axis name.
                 * @param {class} axis_settings - Class from Möbius HTML response area
                 * @param {PointText} axistext - Paper.js PointText object
                 */
                function Draw_axis_name(axis_settings, axistext) {
                    if (axis_settings.Name != "") {
                        axistext.rotate(axis_settings.NameOrientation);
                        axistext.justification = axis_settings.NameJustification;
                        axistext.fillColor = axis_settings.NameFontColor;
                        axistext.fontSize = axis_settings.NameFontSize;
                        axistext.content = axis_settings.Name;
                        PermanentElements.addChild(axistext);
                    }
                };

                /**
                 * Draw a line. Used to draw the major and minor gridlines,
                 * and major and minor axis checkmarks.
                 * @param {Integer} x1 - X-coordinate start
                 * @param {Integer} y1 - Y-coordinate start
                 * @param {Integer} x2 - X-coordinate end
                 * @param {Integer} y2 - Y-coordinate end
                 * @param {Integer} width - Line width
                 * @param {String} colour - Line colour
                 */
                function draw_line(x1, y1, x2, y2, width, colour) {
                    var line = new scope.Path([new scope.Point(x1, y1), new scope.Point(x2, y2)]);
                    line.strokeWidth = width;
                    line.strokeColor = new scope.Color(colour) ;
                    PermanentElements.addChild(line);
                };

                /**
                 * Draw the text for the axis labels (not axis name).
                 * @param {Integer} digit - integer from the iteration
                 * @param {Integer} x1 - X-coordinate to draw
                 * @param {Integer} y1 - Y-coordinate to draw
                 * @param {String} Justification - Text justification (left, right, center)
                 * @param {String} Color - Text color
                 * @param {Integer} FontSize - Text font size
                 * @param {Boolean} ShowZero - Show zero value at origin
                 * @param {Number} NumberPrecision - Decimal precision (0 for integers)
                 */
                function draw_label_text(digit, x1, y1, Justification, Color, FontSize, ShowZero, NumberPrecision) {
                    var text = new scope.PointText(new scope.Point(x1, y1));
                    text.justification = Justification;
                    text.fillColor = Color;
                    text.fontSize = FontSize;
                    if (ShowZero || Math.abs(digit)> 0.00001) {
                        text.content = digit.toFixed(NumberPrecision);
                    }
                    PermanentElements.addChild(text);                            
                };

                /**
                 * In Chrome and Edge gridlines are blurred as they are drawn over 2 pixels.
                 * Fix by shifting gridlines 0.5 pixel.
                 * !CAUTION! Fix is unsafe because it checks userAgent string, which is not "unique".
                 * @param {Number} number - current pixels
                 * @param {Number} value - pixel shift
                 * @returns 
                 */
                function even_fix(number, value) {
                    var isChromeEdge = false;
                    var agent = navigator.userAgent;
                    if ((agent.indexOf("Chrome") !== -1) || (agent.indexOf("Edg") !== -1)) {
                        console.log("Chrome/Edge browser identified to fix draw line pixel bug.")
                        isChromeEdge = true;
                    }
                    if (isChromeEdge) {
                        return number + value;
                    }
                    else {
                        return number;
                    }
                };

                /* Remove everything */
                PermanentElements.removeChildren();

                /* Compute distance between minor gridlines in browser coordinate system.
                   Round because browser coordinates are always integers. */
                minorX_BrowserStep = Math.round((canvasDef.width  - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0]) / minor_grid_lines.xStep)));
                minorY_BrowserStep = Math.round((canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2]) / minor_grid_lines.yStep)));

                /* Recalculate canvas size. */
                canvasDef.width  = minorX_BrowserStep * ((Math.abs(axes[1] - axes[0]) / minor_grid_lines.xStep)) + canvasDef.hPad*2;
                canvasDef.height = minorY_BrowserStep * ((Math.abs(axes[3] - axes[2]) / minor_grid_lines.yStep)) + canvasDef.vPad*2;

                /* Resize canvas and scope. Both are necessary */
                $("#myCanvas").width( canvasDef.width );
                $("#myCanvas").height( canvasDef.height );
                scope.viewSize = [canvasDef.width, canvasDef.height]; 
                console.log("Re-sizing canvas (width x height): " + canvasDef.width + " x " + canvasDef.height);

                /* Compute distance between major gridlines in browser coordinate system.
                   Round because browser coordinates are always integers. */
                majorX_BrowserStep = Math.round((canvasDef.width  - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0]) / major_grid_lines.xStep)));
                majorY_BrowserStep = Math.round((canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2]) / major_grid_lines.yStep)));
                
                /* y-axis position validation and set its x_coordinate */
                if (y_axis_definition.Position != "auto" ) {
                    if (y_axis_definition.Position == "left") {
                        y_axis_x_coordinate = canvasDef.hPad;
                    } 
                    else if (y_axis_definition.Position == "right") {
                        y_axis_x_coordinate = canvasDef.width - canvasDef.hPad;
                    }
                    else {
                        console.log("y_axis_position undefined, selector: " + y_axis_definition.Position + " unknown. [auto, left, right]");
                    }
                }
                /* determine location when option is 'auto' */
                else {
                    /* x_axis start is >=0 AND axis end is >0 AND x_axis is not flipped */
                    if (axes[0] >= 0 && axes[1] > 0 && !x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.hPad; 
                    }
                    /* x_axis start is >=0 AND axis end is >0 AND x_axis is flipped */
                    else if (axes[0] >= 0 && axes[1] > 0 && x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.width - canvasDef.hPad;
                    }
                    /* x_axis start is <0 AND axis end is <=0 AND axis is not flipped */
                    else if (axes[0] < 0 && axes[1] <= 0 && !x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.width - canvasDef.hPad;
                    } 
                    /* x_axis start is <0 AND axis end is <=0 AND axis is flipped */
                    else if (axes[0] < 0 && axes[1] <= 0 && x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.hPad;
                    } 
                    /* x_axis crosses 0 and is not flipped, set to x = 0 coordinate */
                    else if (!x_axis_definition.Flipped) {
                        y_axis_x_coordinate =  Math.abs(axes[0]) / major_grid_lines.xStep * majorX_BrowserStep + canvasDef.hPad;
                    } 
                    /* x_axis crosses 0 and is flipped, set to x = 0 coordinate */
                    else {
                        y_axis_x_coordinate = -Math.abs(axes[0]) / major_grid_lines.xStep * majorX_BrowserStep - canvasDef.hPad + canvasDef.width; 
                    }
                }

                /* x-axis position validation and set its y_coordinate */
                if (x_axis_definition.Position != "auto" ) {
                    if (x_axis_definition.Position == "top") {
                        x_axis_y_coordinate = canvasDef.vPad;
                    } 
                    else if (x_axis_definition.Position == "bottom") {
                        x_axis_y_coordinate = canvasDef.height - canvasDef.vPad;
                    } 
                    else {
                        console.log("x_axis_position undefined, selector: " + x_axis_definition.Position + " unknown. [auto, top, bottom]");
                    }
                } 
                /* determine location when option is 'auto' */
                else {
                    /* y_axis start is >=0 AND end is >0 AND axis is not flipped */
                    if (axes[2] >= 0 && axes[3] > 0 && !y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.height - canvasDef.vPad;
                    }
                    /* y_axis start is >=0 AND end is >0 AND axis is flipped */ 
                    else if (axes[2] >= 0 && axes[3] > 0 && y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.vPad;
                    } 
                    /* y_axis start is <0 AND end is <=0 AND axis is not flipped */
                    else if (axes[2] < 0 && axes[3] <= 0 && !y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.vPad;
                    }
                    /* y_axis start is <0 AND end is <=0 AND axis is flipped */ 
                    else if (axes[2] < 0 && axes[3] <= 0 && y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.height - canvasDef.vPad;
                    } 
                    /* y_axis crosses zero and is not flipped, set to y = 0 coordinate */
                    else if (!y_axis_definition.Flipped) {
                        x_axis_y_coordinate =  Math.abs(axes[3])/major_grid_lines.yStep * majorY_BrowserStep + canvasDef.vPad; 
                    } 
                    /* y_axis crosses zero and is flipped, set to y = 0 coordinate */
                    else {
                        x_axis_y_coordinate = -Math.abs(axes[3])/major_grid_lines.yStep * majorY_BrowserStep - canvasDef.vPad + canvasDef.height;
                    }
                }

                if (!x_axis_definition.Flipped) {
                    /* Draw x_axis, not flipped. Extend line 20 pixels beyond graph area */
                    if (x_axis_definition.Arrow) {
                        draw_arrow(new scope.Point(canvasDef.hPad, x_axis_y_coordinate), new scope.Point(canvasDef.width - canvasDef.hPad + 20, x_axis_y_coordinate));
                    }
                    var x_temp = even_fix(canvasDef.hPad, 0.5);
                }
                else {
                    /* Draw x_axis, flipped. Extend line 20 pixels beyond graph area */
                    if (x_axis_definition.Arrow) {
                        draw_arrow(new scope.Point(canvasDef.width - canvasDef.hPad, x_axis_y_coordinate), new scope.Point(canvasDef.hPad - 20, x_axis_y_coordinate));
                    }
                    var x_temp = even_fix(canvasDef.width - canvasDef.hPad, -0.5);
                }
                for (var i = axes[0]; i <= axes[1] ; i = i + major_grid_lines.xStep) {
                    /* Draw major vertical grid line */
                    draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, major_grid_lines.lineWidth, major_grid_lines.lineColor);
                    /* Draw major vertical checkmark */
                    draw_line(x_temp, x_axis_y_coordinate + major_grid_lines.checkmark_offset, x_temp, x_axis_y_coordinate - major_grid_lines.checkmark_offset, 
                        major_grid_lines.checkmark_width, major_grid_lines.checkmark_color);
                    /* Draw x_axis labels */
                    draw_label_text(i, x_temp + x_axis_definition.LabelPositionHorizontal, x_axis_y_coordinate + x_axis_definition.LabelPositionVertical, 
                        x_axis_definition.LabelJustification, x_axis_definition.LabelColor, x_axis_definition.LabelFontSize, x_axis_definition.LabelShowZero, 
                        x_axis_definition.LabelNumberPrecision);
                    if (!x_axis_definition.Flipped) {
                        x_temp = (x_temp + majorX_BrowserStep);
                    }
                    else {
                        x_temp = (x_temp - majorX_BrowserStep);
                    }
                }

                if (!y_axis_definition.Flipped) {
                    /* Draw y_axis, not flipped. Extend line 0.5*vPad beyond graph area */
                    if (y_axis_definition.Arrow) {
                        draw_arrow(new scope.Point(y_axis_x_coordinate, canvasDef.height - canvasDef.vPad), new scope.Point(y_axis_x_coordinate, canvasDef.vPad - 20));
                    }
                    var y_temp = even_fix(canvasDef.height - canvasDef.vPad, 0.5);
                }
                else {
                    /* Draw y_axis, flipped. Extend line 0.5*vPad beyond graph area */
                    if (y_axis_definition.Arrow){
                        draw_arrow(new scope.Point(y_axis_x_coordinate, canvasDef.vPad), new scope.Point(y_axis_x_coordinate, canvasDef.height - canvasDef.vPad + 20));
                    }
                    var y_temp = even_fix(canvasDef.vPad, 0.5);
                }
                for (var i = axes[2]; i <= axes[3] ; i = i + major_grid_lines.yStep) {
                    /* Draw major horizontal grid line */
                    draw_line(canvasDef.hPad, y_temp, canvasDef.width - canvasDef.hPad, y_temp, major_grid_lines.lineWidth, major_grid_lines.lineColor);
                    /* Draw major horizontal checkmark */
                    draw_line(y_axis_x_coordinate + major_grid_lines.checkmark_offset, y_temp, y_axis_x_coordinate - major_grid_lines.checkmark_offset, y_temp, 
                        major_grid_lines.checkmark_width, major_grid_lines.checkmark_color);
                    /* Draw y_axis labels */
                    draw_label_text(i, y_axis_x_coordinate + y_axis_definition.LabelPositionHorizontal, y_temp + y_axis_definition.LabelPositionVertical, 
                        y_axis_definition.LabelJustification, y_axis_definition.LabelColor, y_axis_definition.LabelFontSize, y_axis_definition.LabelShowZero, 
                        y_axis_definition.LabelNumberPrecision);
                    if (!y_axis_definition.Flipped) {
                        y_temp = y_temp - majorY_BrowserStep;
                    }
                    else {
                        y_temp = y_temp + majorY_BrowserStep;
                    }
                } 

                x_temp = even_fix(canvasDef.hPad, 0.5);
                for (var i = axes[0]; i <= axes[1] ; i = i + minor_grid_lines.xStep) {
                    /* Draw minor vertical grid line */
                    draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, minor_grid_lines.lineWidth, minor_grid_lines.lineColor);
                    /* Draw minor vertical checkmark (along x-axis) */
                    draw_line(x_temp, x_axis_y_coordinate + minor_grid_lines.checkmark_offset, x_temp, x_axis_y_coordinate - minor_grid_lines.checkmark_offset,
                        minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color);
                    x_temp = x_temp + minorX_BrowserStep;
                }

                y_temp = even_fix(canvasDef.height - canvasDef.vPad, 0.5);
                for (var i = axes[2]; i <= axes[3] ; i = i + minor_grid_lines.yStep) {
                    /* Draw minor horizontal grid line */
                    draw_line(canvasDef.hPad, y_temp, canvasDef.width - canvasDef.hPad, y_temp, minor_grid_lines.lineWidth, minor_grid_lines.lineColor);
                    /* Draw minor horizontal checkmark (along y-axis) */
                    draw_line(y_axis_x_coordinate + minor_grid_lines.checkmark_offset, y_temp, y_axis_x_coordinate - minor_grid_lines.checkmark_offset, y_temp,
                        minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color);
                    y_temp = y_temp - minorY_BrowserStep;
                }

                var x_axis_text = new scope.PointText(new scope.Point(canvasDef.width/2   + x_axis_definition.NameHorizontal, x_axis_y_coordinate + x_axis_definition.NameVertical));
                var y_axis_text = new scope.PointText(new scope.Point(y_axis_x_coordinate + y_axis_definition.NameHorizontal, canvasDef.height/2  + y_axis_definition.NameVertical));
                Draw_axis_name(x_axis_definition, x_axis_text);
                Draw_axis_name(y_axis_definition, y_axis_text);
                
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
                            for (var pointX = AxisXtoBrowserX(x_val[0]); pointX >= AxisXtoBrowserX(x_val[x_val.length-1]); pointX = pointX - interaction_settings.draw_step) {
                                var temp_y = lineSpline.interpolate(BrowserXtoAxisX(pointX));
                                var temp = new scope.Point(pointX, AxisYtoBrowserY(temp_y));
                                if ((!(lineObject.hasOwnProperty("x_limit_max")) || ((lineObject.hasOwnProperty("x_limit_max")) && AxisXtoBrowserX(lineObject.x_limit_max) <= pointX)) && (!(lineObject.hasOwnProperty("x_limit_min")) || ((lineObject.hasOwnProperty("x_limit_min")) && AxisXtoBrowserX(lineObject.x_limit_min) >= pointX))) {
                                        linePath.add(temp); 
                                }
                            }
                        } 
                        else {
                            for (var pointX = AxisXtoBrowserX(x_val[0]); pointX <= AxisXtoBrowserX(x_val[x_val.length-1]); pointX = pointX + interaction_settings.draw_step) {
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
                    x_axis name, y_axis name,
                    backgroundlines */
                scope.project.activeLayer.addChild(PermanentElements);
            };

            function draw_spline() {
                if (teachermode) {
                    /* Draw extra information for teachers:
                        HTML table for drawn points (x,y)
                        Display any error message */
                    var temptext = "<table style='width:50%'>";
                    temptext = temptext + "<tr> <th> x: </th> <th> y: </th> </tr>";
                    for (var i = 0 ; i < PointsLocation.length ; i++ ) {
                        temptext = temptext + "<tr> <th>"  + BrowserXtoAxisX(PointsLocation[i].x) + 
                                              "</th> <th>" + BrowserYtoAxisY(PointsLocation[i].y) + 
                                              "</th> </tr>";
                    }
                    temptext = temptext + "</table>";
                    document.getElementById("teacher").innerHTML = errormessages + "<br/>" + "Drawn points <br/>" + temptext;
                }

                PathPoints = [];
                DrawnPoints.removeChildren();
                SplinePoints.removeChildren();

                if (PointsLocation.length != 0) {
                    /******POINTS BY USER******/
                    /* Add points to be drawn if not displaying Gradebook */
                    if (!correctanswerGradebook) {
                        for (var i = 0 ; i < PointsLocation.length ; i++ ) {
                            var circle = new scope.Shape.Circle(PointsLocation[i], interaction_settings.circle_radius);
                            circle.strokeColor = 'black';
                            /* If circle is selected, change fillColor to red */
                            if (selected_x !== null && selected_y !== null && hitPoint.getDistance(PointsLocation[i]) < hitOptions.tolerance) {
                                circle.fillColor = 'red';
                            }
                            DrawnPoints.addChild(circle);
                        }
                    }
                    
                    /******POINTS FOR SPLINE******/
                    var lineSpline = new scope.Path();
                    lineSpline.strokeColor = interaction_settings.spline_color;
                    lineSpline.strokeWidth = interaction_settings.spline_width;
                    
                    mySpline = new MonotonicCubicSpline(FittedSplineBrowserX, FittedSplineBrowserY);
                    /* Add points to draw lines between to create fitted spline.
                        Also, add those points to AnswerStr */
                    lineSpline.add( new scope.Point(PointsLocation[0].x, PointsLocation[0].y));
                    PathPoints.push(new scope.Point(PointsLocation[0].x, PointsLocation[0].y));
                    for (var pointX = PointsLocation[0].x + interaction_settings.draw_step; pointX < PointsLocation[PointsLocation.length-1].x; pointX = pointX + interaction_settings.draw_step) {
                        var pointY = mySpline.interpolate(pointX);
                        lineSpline.add( new scope.Point(pointX,pointY));
                        PathPoints.push(new scope.Point(pointX,pointY));
                    } 
                    lineSpline.add( new scope.Point(PointsLocation[PointsLocation.length-1].x, mySpline.interpolate(PointsLocation[PointsLocation.length-1].x)));
                    PathPoints.push(new scope.Point(PointsLocation[PointsLocation.length-1].x, mySpline.interpolate(PointsLocation[PointsLocation.length-1].x)));
                    SplinePoints.addChild(lineSpline);
                } 
                /* Draw the points and lines of the spline */
                scope.project.activeLayer.addChild(DrawnPoints);
                scope.project.activeLayer.addChild(SplinePoints);
            };

            function createAnswer() {
                var StringBrowserCoor = ""; /* Create string for browser coordinates */
                var StringAxisCoor = ""; /* Create string for axis coordinates */
                var pointsForMinMaxX = [];
                var pointsForMinMaxY = [];
                AnswerStr = "";
                
                if (PointsLocation.length != 0) {
                    if (!correctanswerGradebook) {
                        for (var i = 0 ; i < PointsLocation.length ; i++ ) {
                            StringBrowserCoor = StringBrowserCoor + "[" + PointsLocation[i].x + "," + PointsLocation[i].y + "],";   
                            StringAxisCoor = StringAxisCoor + "[" + BrowserXtoAxisX(PointsLocation[i].x) + "," + BrowserYtoAxisY(PointsLocation[i].y) + "],";
                        }
                    }

                    AnswerStr = "[[";
                    /* Add points to draw lines between to create fitted spline.
                        Also, add those points to AnswerStr */
                    for (var i = 0; i < PathPoints.length; i++) {
                        AnswerStr = AnswerStr + "[" + BrowserXtoAxisX(PathPoints[i].x) + "," + BrowserYtoAxisY(PathPoints[i].y) + "],";
                        pointsForMinMaxX.push(BrowserXtoAxisX(PathPoints[i].x));
                        pointsForMinMaxY.push(BrowserYtoAxisY(PathPoints[i].y)); 
                    }

                    /* Slice off last comma from "[x1,y1],[...],[xn,yn]," */
                    StringBrowserCoor = StringBrowserCoor.slice(0, -1);
                    StringAxisCoor = StringAxisCoor.slice(0, -1);
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
                    AnswerStr = AnswerStr + "] , [" + StringBrowserCoor + "] , ["+ StringAxisCoor + "] , [[" + String(max_x) + "," + String(max_y) + "]] , [[" + String(min_x) + "," + String(min_y) + "]]]";
                }
            };

            function interact() {
                tool.onMouseDown = function(click) {
                    hitPoint = click.point;
                    var hitResult = DrawnPoints.hitTest(hitPoint, hitOptions);
                    if (!hitResult) {
                        if (selected_x !== null || selected_y !== null ) {
                            selected_x = null;
                            selected_y = null;
                        }
                        else {
                            /* First point */
                            if (PointsLocation.length == 0) {
                                PointsLocation.push(hitPoint);
                                FittedSplineBrowserY.push(click.event.offsetY);
                                FittedSplineBrowserX.push(click.event.offsetX);
                            }
                            /* There are points */
                            else {
                                for (var i = 0 ; i < PointsLocation.length ; i++) {
                                    /* Insert point in array */
                                    if (click.event.offsetX < PointsLocation[i].x) {
                                        PointsLocation.splice(i, 0, hitPoint);
                                        FittedSplineBrowserX.splice(i, 0, click.event.offsetX);
                                        FittedSplineBrowserY.splice(i, 0, click.event.offsetY);
                                        break;
                                    }
                                    /* New point at the end, append point */
                                    else if (i == PointsLocation.length - 1) {
                                        PointsLocation.splice(PointsLocation.length, 0, hitPoint);
                                        FittedSplineBrowserX.splice(PointsLocation.length, 0, click.event.offsetX);
                                        FittedSplineBrowserY.splice(PointsLocation.length, 0, click.event.offsetY);
                                        break;
                                    }
                                }
                            }
                        }
                    } 
                    else {
                        selected_x = click.event.offsetX;  
                        selected_y = click.event.offsetY;
                    }
                    draw_spline();
                    createAnswer();
                };

                tool.onMouseDrag = function(click) {
                    var mouseStartLocation = click.point;
                    var mouseMovedDistance = click.delta;
                    var results = [];
                    for (var i = 0 ; i < PointsLocation.length ; i++) {
                        /* Check if the dragged point is close to an already existing point,
                           push the points to "results" */
                        if (mouseStartLocation.getDistance(PointsLocation[i]) < hitOptions.tolerance) {
                            results.push(i);
                        }
                    }
                    /* Remove existing point by splicing */
                    for (var i = (results.length-1) ; i >= 1 ; i--) {
                        PointsLocation.splice(results[i], 1);
                        FittedSplineBrowserX.splice(results[i], 1);
                        FittedSplineBrowserY.splice(results[i], 1);
                    }

                    PointsLocation[results[0]] = new scope.Point(mouseStartLocation.x + mouseMovedDistance.x,mouseStartLocation.y + mouseMovedDistance.y);
                    FittedSplineBrowserY[results[0]] = mouseStartLocation.y + mouseMovedDistance.y;
                    FittedSplineBrowserX[results[0]] = mouseStartLocation.x + mouseMovedDistance.x;
                    draw_spline();
                    createAnswer();
                };
                console.log("Interaction ready");
            }

            function buttons(){
                var delPoint = $('#delPoint');   /* Delete the selected point */
                var delAll = $('#delAll');       /* Delete all points */
                var buttonMin = $('#buttonMin'); /* Force the selected point to be a local minimum */
                var buttonMax = $('#buttonMax'); /* Force the selected point to be a local maximum */
                var toggleContrast = $('#toggleContrast'); /* Toggle sliders to adjust gridlines */
                var gridMajor = $('#gridMajor'); /* Change major gridline greyscale */
                var gridMinor = $('#gridMinor'); /* Change minor gridline greyscale */
                
                /* delete point */
                delPoint.click(function() { 
                    /* loops through all the drawn points */
                    for (var i = 0 ; i < PointsLocation.length ; i++) {
                        /* if difference between (x,y) coordinate of point and (x,y) coordinate of selected (clicked on screen)
                            is less than 10, point is found and remove that point from array */
                        if ((Math.abs(PointsLocation[i].x - selected_x) < hitOptions.tolerance) && (Math.abs(PointsLocation[i].y - selected_y) < hitOptions.tolerance)) {
                            PointsLocation.splice(i, 1);
                            PathPoints.splice(i, 1);
                            FittedSplineBrowserX.splice(i, 1);
                            FittedSplineBrowserY.splice(i, 1);
                        }
                    }
                    /* deselect point and draw new spline */
                    selected_x = null;
                    selected_y = null;
                    draw_spline();
                    createAnswer();
                });

                /* delete all points */
                delAll.click(function() { 
                    /* splice(0, .length) removes all items from array */
                    PointsLocation.splice(0, PointsLocation.length);
                    PathPoints.splice(0, PathPoints.length);
                    FittedSplineBrowserX.splice(0, FittedSplineBrowserX.length);
                    FittedSplineBrowserY.splice(0, FittedSplineBrowserY.length);
                    DrawnPoints.removeChildren();
                    SplinePoints.removeChildren();
                    createAnswer();
                });
                
                /* min function */
                buttonMin.click(function() {
                    /* loops through all the drawn points */
                    for (var i = 0 ; i < PointsLocation.length ; i++ ) {
                        /* if difference between (x,y) coordinate of point and (x,y) coordinate where clicked on screen
                            is less than hitOptions.tolerance, point is found and remove that point from array */
                        if ((Math.abs(PointsLocation[i].x - selected_x) < hitOptions.tolerance) && (Math.abs(PointsLocation[i].y - selected_y) < hitOptions.tolerance)) {
                            /* insert point after selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(i+1, 0, new scope.Point(PointsLocation[i].x + interaction_settings.deltax, PointsLocation[i].y - interaction_settings.deltay));
                            FittedSplineBrowserX.splice(i+1, 0, PointsLocation[i].x + interaction_settings.deltax);
                            FittedSplineBrowserY.splice(i+1, 0, PointsLocation[i].y - interaction_settings.deltay);
                            /* insert point before selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(i,0, new scope.Point(PointsLocation[i].x - interaction_settings.deltax, PointsLocation[i].y - interaction_settings.deltay));          
                            FittedSplineBrowserX.splice(i, 0, PointsLocation[i].x - interaction_settings.deltax );
                            FittedSplineBrowserY.splice(i, 0, PointsLocation[i].y - interaction_settings.deltay);
                            
                            break;
                        }
                    }
                    /* deselect point and draw new spline */
                    selected_x = null;
                    selected_y = null;
                    draw_spline();
                    createAnswer();
                });
                
                /* max function */
                buttonMax.click(function() { 
                    /* loops through all the drawn points */
                    for (var i = 0 ; i < PointsLocation.length ; i++ ){
                        /* if difference between (x,y) coordinate of point and (x,y) coordinate where clicked on screen
                           is less than hitOptions.tolerance, point is found and remove that point from array */
                        if ((Math.abs(PointsLocation[i].x - selected_x) < hitOptions.tolerance) && (Math.abs(PointsLocation[i].y - selected_y) < hitOptions.tolerance)) {
                            /* insert point after selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(i+1, 0, new scope.Point(PointsLocation[i].x + interaction_settings.deltax, PointsLocation[i].y + interaction_settings.deltay));
                            FittedSplineBrowserX.splice(i+1, 0, PointsLocation[i].x + interaction_settings.deltax);
                            FittedSplineBrowserY.splice(i+1, 0, PointsLocation[i].y + interaction_settings.deltay);
                            /* insert point before selected point, move point w.r.t. selected point by deltax and deltay */
                            PointsLocation.splice(i,0, new scope.Point(PointsLocation[i].x - interaction_settings.deltax, PointsLocation[i].y + interaction_settings.deltay));               
                            FittedSplineBrowserX.splice(i, 0, PointsLocation[i].x - interaction_settings.deltax);
                            FittedSplineBrowserY.splice(i, 0, PointsLocation[i].y + interaction_settings.deltay);
                            
                            break;
                        }
                    }
                    /* deselect point and draw new spline */
                    selected_x = null;
                    selected_y = null;
                    draw_spline();
                    createAnswer();
                });

                /* toggle contrast settings */
                toggleContrast.click(function() {
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
                
                /* major grid lines slider */
                gridMajor.click(function() { 
                    PermanentElements.removeChildren();
                    major_grid_lines.lineColor = gridMajor.val()/10;
                    draw_axis();
                });
                
                /* minor grid lines slider */
                gridMinor.click(function() { 
                    PermanentElements.removeChildren();
                    minor_grid_lines.lineColor = gridMinor.val()/10;
                    draw_axis();
                });
                console.log("Button functionality ready");
            };
        });
    });
}