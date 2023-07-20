/****** NOTES ******
 * This app requires two other scripts:
 * cubic_spline.js 
 * paper-full.js v0.12.17
 * Also uses jQuery
 * 
 * version 3.1
 * 20 July 2023
 * Developed for Möbius (Digital Ed)
 * 
 * Creator: Anatoly Ilin
 * Latest version by: Mario van den Berg
 * 
 * Note, you might need to change the path for jQuery.getScript()
 * 
 */

function runApp(array, type) {
    console.log("Welcome to the SketchApp! \n Running version 3.0 \n Release date: 5 April 2023 \n By: Anatoly Ilin & Mario van den Berg");
    console.log("This version uses Paper.js v0.12.17");

    jQuery.getScript('https://tudelft-exercise.mobius.cloud/web/Cie4305000/Public_Html/HTML_SketchApp/cubic_spline.js', function() {
        jQuery.getScript('https://tudelft-exercise.mobius.cloud/web/Cie4305000/Public_Html/HTML_SketchApp/paper-full.js', function() {
            console.log("Scripts loaded succesfully!");
            /* Create a variable "scope" with the PaperScope object to access Paper.js classes. */
            /* Create a Tool object, necessary for the mouse interaction. */
            var scope = new paper.PaperScope();
            var tool  = new scope.Tool();
            
            /* Set initial canvas dimensions, it will be resized later. */
            /* Set up an empty project within scope and provide the HTML canvas. */
            $("#myCanvas").width(  canvasDef.width  );
            $("#myCanvas").height( canvasDef.height );
            scope.setup($("#myCanvas")[0]);
            
            /* If teachermode is true, append a <div> HTML element with a <table> HTML element. */
            /* In the table, the coordinates of the clicked points will be displayed. */
            if(teachermode) {
                var teacherDiv = document.createElement('div');
                teacherDiv.id = 'teacher';
                teacherDiv.className = 'teacher';
                teacherDiv.style="overflow-y:scroll; height:300px";
                document.getElementsByTagName('body')[0].appendChild(teacherDiv);
            }
            
            console.log("Paper.js project is ready.");      

            /* Create 3 Paper.js group objects to draw to the screen */
            var BackgroundGraph = new scope.Group(); /* stores objects to draw the background */
            var UserCircles = new scope.Group(); /* stores Circle objects to draw user points */
            var SplineDrawn = new scope.Group(); /* stores the Path object to draw the spline */

            /* Create arrays that store information about the user and spline Points */
            var UserArray = []; /* stores Point objects where the user clicked */ 
            var SplineArray = []; /* stores Point objects from the spline */
            var PointsXcoordinate = []; /* stores UserArray Point.x values to create spline */
            var PointsYcoordinate = []; /* stores UserArray Point.y values to create spline */

            /* Global variables for drawing the background graph */
            var y_axis_x_coordinate; /* pixel location of horizontal axis (x-axis) */
            var x_axis_y_coordinate; /* pixel location of vertical   axis (y-axis) */
            var majorX_PixelStep;  /* pixel distance between major vertical   gridlines */
            var majorY_PixelStep;  /* pixel distance between major horiztonal gridlines */
            var minorX_PixelStep;  /* pixel distance between minor vertical   gridlines */
            var minorY_PixelStep;  /* pixel distance between minor horizontal gridlines */

            /* Global variables for selecting a Point */
            var selected_x = null; /* pixel x-coordinate where the user clicked */
            var selected_y = null; /* pixel y-coordinate where the user clicked */
            var hitPoint; /* Point object where the user clicked */
            var hitOptions = /* Options for the hitTest */
                {
                fill: false,
                stroke: true,
                segments: true,
                curves: false,
                tolerance: 10
                };

            /* Boolean for viewing Möbius gradebook */
            var viewingGradebook = false;
            /* Initialize variable for Monotonic Cubic Interpolation */
            var mySplineDraw;
            /* String variable to display when teachermode is true */
            var errormessages = "No errors from the code. If it's not working, check console log.";
            
            /************************************************/
            /* EVERYTHING IS SET UP. TIME TO START DRAWING! */
            /************************************************/

            draw_axis();
            console.log("Background graph drawn succesfully!");
            
            /*************************************************/
            /* APP BEHAVIOUR IS DEFINED HERE, BASED ON TYPE. */
            /*************************************************/

            if (type==1) {
                buttons();
                interact();
            }
            else if (type==2) {
                /* array = "[[spline axis] , [user pixel] , [user axis] , [spline axis minimum] , [spline axis maximum]]" */
                /* spline axis miminum & maximum are only elements of string if getResponse() got called. */
                /* Each element consists of point coordinates in an array, i.e. [x1,y1],[x2,y2],...,[xn,yn] */
                var Response = JSON.parse(array);
                var PixelCoor = Response[1];

                for (var i = 0; i < PixelCoor.length; i++) {
                    UserArray.push(new scope.Point(PixelCoor[i][0], PixelCoor[i][1]));
                }
                
                if (gradebook) {
                    draw_spline();
                } 
                else {
                    buttons();
                    interact();
                    draw_spline();
                    create_response();
                }
            } 
            else if (type==3) {
                viewingGradebook = true;
                /* array = "[[x1,y1],[x2,y2],...,[xn,yn]]" as defined by $answer in Möbius Question Algorithm. */
                var AnswerParsed  = JSON.parse(array); /* parses array and returns it without " ". */
                var CorrectAnswer = JSON.parse(AnswerParsed); /* parses array again to get true array. */

                for (var i = 0; i < CorrectAnswer.length; i++) {
                    UserArray.push(new scope.Point(AxisXtoPixelX(CorrectAnswer[i][0]), AxisYtoPixelY(CorrectAnswer[i][1])));
                }
                draw_spline();
            }
            else {
                console.log("Error! incorrect type for RunApp(array,type): type = 1, 2 or 3.");
            }

            /***********************************************/
            /* ALL THE FUNCTIONS THAT ARE CALLED ARE BELOW */
            /***********************************************/

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
                    BackgroundGraph.addChild(axisLine);
                    /* add arrow head */
                    var vector = endPoint.subtract(startPoint);
                    vector.length = axes_arrow.Size;
                    var vectorItem = new scope.Path([
                        endPoint.add(vector.rotate(axes_arrow.Angle)),
                        endPoint,
                        endPoint.add(vector.rotate(-axes_arrow.Angle))
                    ]);
                    vectorItem.strokeWidth = axes_arrow.ArrowLineThickness;
                    vectorItem.strokeColor = axes_arrow.ArrowLineColor;
                    BackgroundGraph.addChild(vectorItem);
                };

                /**
                 * Draw the axis name.
                 * @param {class} axis_settings - Class from Möbius HTML response area
                 * @param {PointText} axistext - Paper.js PointText object
                 */
                function draw_axis_name(axis_settings, axistext) {
                    if (axis_settings.Name != "") {
                        axistext.rotate(axis_settings.NameOrientation);
                        axistext.justification = axis_settings.NameJustification;
                        axistext.fillColor = axis_settings.NameFontColor;
                        axistext.fontSize = axis_settings.NameFontSize;
                        axistext.content = axis_settings.Name;
                        BackgroundGraph.addChild(axistext);
                    }
                };

                /**
                 * Draw a line. Used to draw the major and minor gridlines,
                 * and major and minor axis check marks.
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
                    BackgroundGraph.addChild(line);
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
                    BackgroundGraph.addChild(text);                            
                };

                /**
                 * In Chromium browsers (tested: Chrome, MS Edge) gridlines are blurred as they are drawn over 2 pixels.
                 * This is fixed by shifting the gridlines.
                 * !CAUTION! Fix is unsafe because it checks userAgent string, which is not "unique".
                 * @param {Number} number - current pixel
                 * @param {Number} value - pixel shift
                 * @returns 
                 */
                function pixelBugFix(number, value) {
                    var isChromeEdge = false;
                    var agent = navigator.userAgent;
                    if ((agent.indexOf("Chrome") !== -1) || (agent.indexOf("Edg") !== -1)) {
                        console.log("Chrome/Edge browser identified to fix draw line pixel bug.");
                        isChromeEdge = true;
                    }
                    if (isChromeEdge) {
                        return number + value;
                    }
                    else {
                        return number;
                    }
                };

                BackgroundGraph.removeChildren();

                minorX_PixelStep = Math.round((canvasDef.width  - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0]) / minor_grid_lines.xStep)));
                minorY_PixelStep = Math.round((canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2]) / minor_grid_lines.yStep)));

                canvasDef.width  = minorX_PixelStep * ((Math.abs(axes[1] - axes[0]) / minor_grid_lines.xStep)) + canvasDef.hPad*2;
                canvasDef.height = minorY_PixelStep * ((Math.abs(axes[3] - axes[2]) / minor_grid_lines.yStep)) + canvasDef.vPad*2;

                $("#myCanvas").width( canvasDef.width );
                $("#myCanvas").height( canvasDef.height );
                scope.viewSize = [canvasDef.width, canvasDef.height]; 
                console.log("Re-sizing canvas (width x height): " + canvasDef.width + " x " + canvasDef.height);

                majorX_PixelStep = Math.round((canvasDef.width  - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0]) / major_grid_lines.xStep)));
                majorY_PixelStep = Math.round((canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2]) / major_grid_lines.yStep)));
                
                /*************************************************/
                /* DETERMINE WHERE AXES ARE POSITIONED IN CANVAS */
                /*************************************************/

                /* FIRST IS X-AXIS. */
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
                else {
                    if (axes[2] >= 0 && axes[3] > 0 && !y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.height - canvasDef.vPad;
                    }
                    else if (axes[2] >= 0 && axes[3] > 0 && y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.vPad;
                    } 
                    else if (axes[2] < 0 && axes[3] <= 0 && !y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.vPad;
                    }
                    else if (axes[2] < 0 && axes[3] <= 0 && y_axis_definition.Flipped) {
                        x_axis_y_coordinate = canvasDef.height - canvasDef.vPad;
                    } 
                    else if (!y_axis_definition.Flipped) {
                        x_axis_y_coordinate =  Math.abs(axes[3])/major_grid_lines.yStep * majorY_PixelStep + canvasDef.vPad; 
                    } 
                    else {
                        x_axis_y_coordinate = -Math.abs(axes[3])/major_grid_lines.yStep * majorY_PixelStep - canvasDef.vPad + canvasDef.height;
                    }
                }

                /* SECOND IS Y-AXIS. */
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
                else {
                    if (axes[0] >= 0 && axes[1] > 0 && !x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.hPad; 
                    }
                    else if (axes[0] >= 0 && axes[1] > 0 && x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.width - canvasDef.hPad;
                    }
                    else if (axes[0] < 0 && axes[1] <= 0 && !x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.width - canvasDef.hPad;
                    } 
                    else if (axes[0] < 0 && axes[1] <= 0 && x_axis_definition.Flipped) {
                        y_axis_x_coordinate = canvasDef.hPad;
                    } 
                    else if (!x_axis_definition.Flipped) {
                        y_axis_x_coordinate =  Math.abs(axes[0]) / major_grid_lines.xStep * majorX_PixelStep + canvasDef.hPad;
                    } 
                    else {
                        y_axis_x_coordinate = -Math.abs(axes[0]) / major_grid_lines.xStep * majorX_PixelStep - canvasDef.hPad + canvasDef.width; 
                    }
                }

                /*****************************/
                /* DRAW THE BACKGROUND GRAPH */
                /*****************************/

                /* FIRST IS X-AXIS. */
                if (!x_axis_definition.Flipped) {
                    if (x_axis_definition.Arrow) {
                        draw_arrow(new scope.Point(canvasDef.hPad, x_axis_y_coordinate), new scope.Point(canvasDef.width - canvasDef.hPad + 20, x_axis_y_coordinate));
                    }
                    var x_temp = pixelBugFix(canvasDef.hPad, 0.5);
                }
                else {
                    if (x_axis_definition.Arrow) {
                        draw_arrow(new scope.Point(canvasDef.width - canvasDef.hPad, x_axis_y_coordinate), new scope.Point(canvasDef.hPad - 20, x_axis_y_coordinate));
                    }
                    var x_temp = pixelBugFix(canvasDef.width - canvasDef.hPad, -0.5);
                }
                var x_axis_text = new scope.PointText(new scope.Point(canvasDef.width/2 + x_axis_definition.NameHorizontal, x_axis_y_coordinate + x_axis_definition.NameVertical));
                draw_axis_name(x_axis_definition, x_axis_text);

                /* SECOND IS Y-AXIS. */
                if (!y_axis_definition.Flipped) {
                    if (y_axis_definition.Arrow) {
                        draw_arrow(new scope.Point(y_axis_x_coordinate, canvasDef.height - canvasDef.vPad), new scope.Point(y_axis_x_coordinate, canvasDef.vPad - 20));
                    }
                    var y_temp = pixelBugFix(canvasDef.height - canvasDef.vPad, 0.5);
                }
                else {
                    if (y_axis_definition.Arrow){
                        draw_arrow(new scope.Point(y_axis_x_coordinate, canvasDef.vPad), new scope.Point(y_axis_x_coordinate, canvasDef.height - canvasDef.vPad + 20));
                    }
                    var y_temp = pixelBugFix(canvasDef.vPad, 0.5);
                }
                var y_axis_text = new scope.PointText(new scope.Point(y_axis_x_coordinate + y_axis_definition.NameHorizontal, canvasDef.height/2 + y_axis_definition.NameVertical));
                draw_axis_name(y_axis_definition, y_axis_text);

                /* NOW DRAW MAJOR VERTICAL GRIDLINES, CHECK MARKS AND X-AXIS LABELS. */
                for (var i = axes[0] ; i <= axes[1] ; i = i + major_grid_lines.xStep) {
                    /* major vertical grid line */
                    draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, major_grid_lines.lineWidth, major_grid_lines.greyScale);
                    /* major vertical check mark */
                    draw_line(x_temp, x_axis_y_coordinate + major_grid_lines.checkmark_offset, x_temp, x_axis_y_coordinate - major_grid_lines.checkmark_offset, 
                        major_grid_lines.checkmark_width, major_grid_lines.checkmark_color);
                    /* x_axis labels */
                    draw_label_text(i, x_temp + x_axis_definition.LabelHorizontal, x_axis_y_coordinate + x_axis_definition.LabelVertical, 
                        x_axis_definition.LabelJustification, x_axis_definition.LabelColor, x_axis_definition.LabelFontSize, x_axis_definition.LabelShowZero, 
                        x_axis_definition.LabelNumberPrecision);
                    if (!x_axis_definition.Flipped) {
                        x_temp = (x_temp + majorX_PixelStep);
                    }
                    else {
                        x_temp = (x_temp - majorX_PixelStep);
                    }
                }

                /* NOW DRAW MAJOR HORIZONTAL GRIDLINES, CHECK MARKS AND Y-AXIS LABELS. */
                for (var i = axes[2] ; i <= axes[3] ; i = i + major_grid_lines.yStep) {
                    /* major horizontal grid line */
                    draw_line(canvasDef.hPad, y_temp, canvasDef.width - canvasDef.hPad, y_temp, major_grid_lines.lineWidth, major_grid_lines.greyScale);
                    /* major horizontal check mark */
                    draw_line(y_axis_x_coordinate + major_grid_lines.checkmark_offset, y_temp, y_axis_x_coordinate - major_grid_lines.checkmark_offset, y_temp, 
                        major_grid_lines.checkmark_width, major_grid_lines.checkmark_color);
                    /* y_axis labels */
                    draw_label_text(i, y_axis_x_coordinate + y_axis_definition.LabelHorizontal, y_temp + y_axis_definition.LabelVertical, 
                        y_axis_definition.LabelJustification, y_axis_definition.LabelColor, y_axis_definition.LabelFontSize, y_axis_definition.LabelShowZero, 
                        y_axis_definition.LabelNumberPrecision);
                    if (!y_axis_definition.Flipped) {
                        y_temp = y_temp - majorY_PixelStep;
                    }
                    else {
                        y_temp = y_temp + majorY_PixelStep;
                    }
                } 

                /* NOW DRAW MINOR VERTICAL GRIDLINES AND CHECK MARKS. */
                x_temp = pixelBugFix(canvasDef.hPad, 0.5);
                for (var i = axes[0] ; i <= axes[1] ; i = i + minor_grid_lines.xStep) {
                    /* Draw minor vertical grid line */
                    draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height - canvasDef.vPad, minor_grid_lines.lineWidth, minor_grid_lines.greyScale);
                    /* Draw minor vertical check mark (along x-axis) */
                    draw_line(x_temp, x_axis_y_coordinate + minor_grid_lines.checkmark_offset, x_temp, x_axis_y_coordinate - minor_grid_lines.checkmark_offset,
                        minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color);
                    x_temp = x_temp + minorX_PixelStep;
                }

                /* NOW DRAW MINOR HORIZONTAL GRIDLINES AND CHECK MARKS. */
                y_temp = pixelBugFix(canvasDef.height - canvasDef.vPad, 0.5);
                for (var i = axes[2] ; i <= axes[3] ; i = i + minor_grid_lines.yStep) {
                    /* Draw minor horizontal grid line */
                    draw_line(canvasDef.hPad, y_temp, canvasDef.width - canvasDef.hPad, y_temp, minor_grid_lines.lineWidth, minor_grid_lines.greyScale);
                    /* Draw minor horizontal check mark (along y-axis) */
                    draw_line(y_axis_x_coordinate + minor_grid_lines.checkmark_offset, y_temp, y_axis_x_coordinate - minor_grid_lines.checkmark_offset, y_temp,
                        minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color);
                    y_temp = y_temp - minorY_PixelStep;
                }

                /* LASTLY, DRAW BACKGROUND SPLINE(S). */
                for (var property in backgroundlines) {
                    if (backgroundlines.hasOwnProperty(property)) {
                        var lineObject = backgroundlines[property];
                        var x_val = lineObject.x;
                        var y_val = lineObject.y;
                        var mySplineGraph = new MonotonicCubicSpline(x_val, y_val);
                        var SplineGraphPath = new scope.Path();
                        SplineGraphPath.strokeWidth = backgroundlines.lineThickness;

                        if (lineObject.lineColorGreyShade < 0) {
                            SplineGraphPath.strokeColor = lineObject.lineColor;
                        } 
                        else {
                            SplineGraphPath.strokeColor = new scope.Color(lineObject.lineColorGreyShade);
                        }

                        for (var pointX = AxisXtoPixelX(x_val[0]); pointX <= AxisXtoPixelX(x_val[x_val.length-1]); pointX = pointX + interaction_settings.draw_step) {
                            var pointY = mySplineGraph.interpolate(PixelXtoAxisX(pointX));
                            if ((!(lineObject.hasOwnProperty("x_limit_max")) || ((lineObject.hasOwnProperty("x_limit_max")) && AxisXtoPixelX(lineObject.x_limit_max) >= pointX)) && (!(lineObject.hasOwnProperty("x_limit_min")) || ((lineObject.hasOwnProperty("x_limit_min")) && AxisXtoPixelX(lineObject.x_limit_min) <= pointX))) {
                                SplineGraphPath.add(new scope.Point(pointX, AxisYtoPixelY(pointY)));
                            }
                        }
                        
                        if (!(lineObject.hasOwnProperty("x_limit_max")) || ((lineObject.hasOwnProperty("x_limit_max")) && (lineObject.x_limit_max >= x_val[x_val.length-1]))) {
                            SplineGraphPath.add(new scope.Point(AxisXtoPixelX(x_val[x_val.length-1]), AxisYtoPixelY(y_val[x_val.length-1])));
                        }
                        BackgroundGraph.addChild(SplineGraphPath);
                    }
                }
                
                /* ADD BackgroundGraph TO THE ACTIVE LAYER OF THE PROJECT. */
                scope.project.activeLayer.addChild(BackgroundGraph);
            };

            function draw_spline() {
                if (teachermode) {
                    var tableText = "<table style='width:50%'>";
                    tableText = tableText + "<tr> <th> x: </th> <th> y: </th> </tr>";
                    for (var i = 0 ; i < UserArray.length ; i++ ) {
                        tableText = tableText + "<tr>  <td>" + PixelXtoAxisX(UserArray[i].x) + 
                                                "</td> <td>" + PixelYtoAxisY(UserArray[i].y) + 
                                                "</td> </tr>";
                    }
                    tableText = tableText + "</table>";
                    document.getElementById("teacher").innerHTML = errormessages + "<br/>" + "Drawn points <br/>" + tableText;
                }

                SplineArray = [];
                PointsXcoordinate = [];
                PointsYcoordinate = [];
                UserCircles.removeChildren();
                SplineDrawn.removeChildren();

                if (UserArray.length != 0) {
                    /* Draw circles where the user clicked if not viewing gradebook. */
                    if (!viewingGradebook) {
                        for (var i = 0 ; i < UserArray.length ; i++ ) {
                            var circle = new scope.Shape.Circle(UserArray[i], interaction_settings.circle_radius);
                            circle.strokeColor = 'black';
                            /* If circle is selected, change fillColor to red */
                            if (selected_x !== null && selected_y !== null && hitPoint.getDistance(UserArray[i]) < hitOptions.tolerance) {
                                circle.fillColor = 'red';
                            }
                            UserCircles.addChild(circle);
                        }
                    }
                }

                if (UserArray.length >= 2) {
                    /* Draw the spline from the user input. */
                    var SplinePath = new scope.Path();
                    SplinePath.strokeColor = interaction_settings.spline_color;
                    SplinePath.strokeWidth = interaction_settings.spline_width;
                    
                    for (var i = 0 ; i < UserArray.length ; i++ ) {
                        PointsXcoordinate.push(UserArray[i].x);
                        PointsYcoordinate.push(UserArray[i].y);
                    }

                    mySplineDraw = new MonotonicCubicSpline(PointsXcoordinate, PointsYcoordinate);
                    for (var pointX = UserArray[0].x; pointX <= UserArray[UserArray.length-1].x; pointX = pointX + interaction_settings.draw_step) {
                        var pointY = mySplineDraw.interpolate(pointX);
                        SplinePath.add(  new scope.Point(pointX,pointY));
                        SplineArray.push(new scope.Point(pointX,pointY));
                    } 

                    SplinePath.add(  new scope.Point(UserArray[UserArray.length-1].x, mySplineDraw.interpolate(UserArray[UserArray.length-1].x)));
                    SplineArray.push(new scope.Point(UserArray[UserArray.length-1].x, mySplineDraw.interpolate(UserArray[UserArray.length-1].x)));
                    SplineDrawn.addChild(SplinePath);
                }
                /* Draw the points and lines of the spline. */
                scope.project.activeLayer.addChild(UserCircles);
                scope.project.activeLayer.addChild(SplineDrawn);
            };

            function create_response() {
                var StringUserPixel  = ""; /* string for pixel coordinates by user */
                var StringUserAxis   = ""; /* string for axis  coordinates by user */
                var StringSplineAxis = ""; /* string for axis  coordinates from spline */
                var MinMaxPointsX = []; /* stores spline point axis x-coordinates */
                var MinMaxPointsY = []; /* stores spline point axis y-coordinates */
                StringResponse = "" /* full string to be evaluated by Möbius */

                if (UserArray.length != 0) {
                    for (var i = 0; i < UserArray.length; i++) {
                        StringUserPixel = StringUserPixel + "[" +               UserArray[i].x  + "," +               UserArray[i].y  + "],";
                        StringUserAxis  = StringUserAxis  + "[" + PixelXtoAxisX(UserArray[i].x) + "," + PixelYtoAxisY(UserArray[i].y) + "],";
                    }

                    for (var i = 0; i < SplineArray.length; i++) {
                        StringSplineAxis  = StringSplineAxis  + "[" + PixelXtoAxisX(SplineArray[i].x) + "," + PixelYtoAxisY(SplineArray[i].y) + "],";
                        MinMaxPointsX.push(PixelXtoAxisX(SplineArray[i].x));
                        MinMaxPointsY.push(PixelYtoAxisY(SplineArray[i].y));
                    }

                    /* Slice off last comma from "[x1,y1],[x2,y2],...,[xn,yn],". */
                    StringUserPixel  = StringUserPixel.slice( 0, -1);
                    StringUserAxis   = StringUserAxis.slice(  0, -1);
                    StringSplineAxis = StringSplineAxis.slice(0, -1);

                    /* Finds spline points with maximum/minimum y-coordinate. */
                    var max_y = Math.max.apply(null, MinMaxPointsY);
                    var min_y = Math.min.apply(null, MinMaxPointsY);

                    /* Finds index of max_y & min_y. */    
                    var val_pos_max = MinMaxPointsY.indexOf(max_y);
                    var val_pos_min = MinMaxPointsY.indexOf(min_y);

                    /* Get x-coordinate of max_y & min_y. */
                    var max_x = MinMaxPointsX[val_pos_max];
                    var min_x = MinMaxPointsX[val_pos_min];
                    
                    /* Simple fix if point is outside axes domain (in hpad/vpad area) */
                    if (min_x < axes[0]) {
                        min_x = axes[0];
                        min_y = mySplineDraw.interpolate(min_x);
                    }
                    if (max_x > axes[1]) {
                        max_x = axes[1];
                        max_y = mySplineDraw.interpolate(max_x);
                    }
                    /* Append all strings and close off. */
                    StringResponse = "[[" + StringSplineAxis + "] , [" + StringUserPixel + "] , [" + StringUserAxis + "] , [[" + String(max_x) + "," + String(max_y) + "]] , [[" + String(min_x) + "," + String(min_y) + "]]]";
                }
            };

            function interact() {
                tool.onMouseDown = function(click) {
                    hitPoint = click.point;
                    var hitResult = UserCircles.hitTest(hitPoint, hitOptions);
                    if (!hitResult) {
                        /* deselects point */
                        if (selected_x !== null || selected_y !== null ) {
                            selected_x = null;
                            selected_y = null;
                        }
                        else {
                            if (UserArray.length == 0) {
                                UserArray.push(hitPoint); /* first point */
                            }
                            else {
                                for (var i = 0 ; i < UserArray.length ; i++) {
                                    if (hitPoint.x < UserArray[i].x) {
                                        UserArray.splice(i, 0, hitPoint); /* insert point */
                                        break;
                                    }
                                    else if (i == UserArray.length - 1) {
                                        UserArray.splice(UserArray.length, 0, hitPoint); /* append to end */
                                        break;
                                    }
                                }
                            }
                        }
                    } 
                    else {
                        selected_x = hitResult.item.position.x;  
                        selected_y = hitResult.item.position.y;
                    }
                    draw_spline();
                    create_response();
                };

                tool.onMouseDrag = function(click) {
                    var mouseStartLocation = click.point;
                    var mouseMovedDistance = click.delta;
                    var results = [];
                    for (var i = 0 ; i < UserArray.length ; i++) {
                        /* Push all points at mouse location */
                        if (mouseStartLocation.getDistance(UserArray[i]) < hitOptions.tolerance) {
                            results.push(i);
                        }
                    }
                    /* Remove existing point by splicing */
                    for (var i = (results.length-1) ; i >= 1 ; i--) {
                        UserArray.splice(results[i], 1);
                    }

                    UserArray[results[0]] = new scope.Point(mouseStartLocation.x + mouseMovedDistance.x, mouseStartLocation.y + mouseMovedDistance.y);
                    draw_spline();
                    create_response();
                };
            }

            function buttons(){
                var delPoint = $('#delPoint'); /* Delete the selected point */
                var delAll = $('#delAll');     /* Delete all points */
                var localMin = $('#localMin'); /* Force the selected point to be a local minimum */
                var localMax = $('#localMax'); /* Force the selected point to be a local maximum */
                var toggleContrast = $('#toggleContrast'); /* Toggle sliders to adjust gridlines */
                var gridMajor = $('#gridMajor'); /* Change major gridline greyscale */
                var gridMinor = $('#gridMinor'); /* Change minor gridline greyscale */
                
                delPoint.click(function() { 
                    for ( var i = 0 ; i < UserArray.length ; i++ ) {
                        if ((Math.abs(UserArray[i].x - selected_x) < hitOptions.tolerance) && (Math.abs(UserArray[i].y - selected_y) < hitOptions.tolerance)) {
                            UserArray.splice(i, 1);
                        }
                    }
                    selected_x = null;
                    selected_y = null;
                    draw_spline();
                    create_response();
                });

                delAll.click(function() { 
                    UserArray.splice(0, UserArray.length);
                    UserCircles.removeChildren();
                    SplineDrawn.removeChildren();
                    selected_x = null;
                    selected_y = null;
                    create_response();
                });
                
                localMin.click(function() {
                    for ( var i = 0 ; i < UserArray.length ; i++ ) {
                        if ((Math.abs(UserArray[i].x - selected_x) < hitOptions.tolerance) && (Math.abs(UserArray[i].y - selected_y) < hitOptions.tolerance)) {
                            UserArray.splice(i+1, 0, new scope.Point(UserArray[i].x + interaction_settings.deltax, UserArray[i].y - interaction_settings.deltay));
                            UserArray.splice(i,0, new scope.Point(UserArray[i].x - interaction_settings.deltax, UserArray[i].y - interaction_settings.deltay));          
                            break;
                        }
                    }
                    selected_x = null;
                    selected_y = null;
                    draw_spline();
                    create_response();
                });
                
                localMax.click(function() { 
                    for ( var i = 0 ; i < UserArray.length ; i++ ) {
                        if ((Math.abs(UserArray[i].x - selected_x) < hitOptions.tolerance) && (Math.abs(UserArray[i].y - selected_y) < hitOptions.tolerance)) {
                            UserArray.splice(i+1, 0, new scope.Point(UserArray[i].x + interaction_settings.deltax, UserArray[i].y + interaction_settings.deltay));
                            UserArray.splice(i,0, new scope.Point(UserArray[i].x - interaction_settings.deltax, UserArray[i].y + interaction_settings.deltay));               
                            break;
                        }
                    }
                    selected_x = null;
                    selected_y = null;
                    draw_spline();
                    create_response();
                });

                toggleContrast.click(function() {
                    var div_contrast = document.getElementById('contrast');
                    if (div_contrast.style.display === 'none') {
                        div_contrast.style.display = 'block';
                    } 
                    else {
                        div_contrast.style.display = 'none';
                    }
                });
                
                gridMajor.click(function() { 
                    BackgroundGraph.removeChildren();
                    major_grid_lines.greyScale = gridMajor.val()/10;
                    draw_axis();
                });
                
                gridMinor.click(function() { 
                    BackgroundGraph.removeChildren();
                    minor_grid_lines.greyScale = gridMinor.val()/10;
                    draw_axis();
                });
            };

            function PixelXtoAxisX(x_loc){
                if (!x_axis_definition.Flipped) {
                    return axes[0] + (x_loc - canvasDef.hPad) * (major_grid_lines.xStep / majorX_PixelStep) ;
                } 
                else {
                    return axes[1] - (x_loc - canvasDef.hPad) * (major_grid_lines.xStep / majorX_PixelStep) ;
                }
            };

            function PixelYtoAxisY(y_loc){
                if (!y_axis_definition.Flipped) {
                    return axes[3] - (y_loc - canvasDef.vPad) * (major_grid_lines.yStep / majorY_PixelStep) ;
                } 
                else {
                    return axes[2] + (y_loc - canvasDef.vPad) * (major_grid_lines.yStep / majorY_PixelStep) ;
                }
            };

            function AxisXtoPixelX(x_loc){
                if (!x_axis_definition.Flipped) {
                    return canvasDef.hPad + Math.abs((x_loc - axes[0])) * (majorX_PixelStep / major_grid_lines.xStep) ;
                } 
                else {
                    return canvasDef.hPad + Math.abs((x_loc - axes[1])) * (majorX_PixelStep / major_grid_lines.xStep) ;
                }
            };

            function AxisYtoPixelY(y_loc){
                if (!y_axis_definition.Flipped) {
                    return canvasDef.vPad + Math.abs((axes[3] - y_loc)) * (majorY_PixelStep / major_grid_lines.yStep) ;
                } 
                else {
                    return canvasDef.vPad + Math.abs((axes[2] - y_loc)) * (majorY_PixelStep / major_grid_lines.yStep) ;
                }
            };
        });
    });
}