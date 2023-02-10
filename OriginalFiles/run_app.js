 function run(array, type) {
/* 

Place this file in Master Class of Maple TA along with
cubic_spline.js
paper-full.min.js

If necessary, change /mapleta to match maple TA/mobius URL in getScript below.

version 2.10
18/01/2019
developed for TA 2017
paperjs version 0.11.3
jquery version 2.2

works best in Firefox, Safari. 
by design, doesn't work in IE
May give issues in grid lines in Chrome depending on the screen resolution and zoom-level.


Feature requests (see 3.0 branch) that did not make into this release:
 - default min/max to screen coordinates instead of the x/y coordinate system of the graph 
 - add support for points exports to the gradebook (key-press -> button -> new window with the points, or copy automatically to the clipboard)
 - export global minima and global maxima
 - export version and use the correct version - code for drawing

Change list:
2.10:
 - added support for min/max from algorithm

2.9:
 - cleaned up code
 - new attempt on 2.8 issue

2.8:
- gridline fix from 2.7 caused issues in Firefox.  fixed by checking the browser (not really)

2.7:
- in some browsers the gridlines were drown incorrectly, due to "uneven" stroke. (essentially, line was drown between two pixels, averaging the color, making it blurred and 2px thick) This is resolved by shifting the line by 0.5 pixel.
- with TA language pack/translation, the default "No answer" is translated, causing incorrect behaviour of the app. 

2.6:
- add export of student answers in axis coordinates. [spline points in axis coordinates], [student points in browser coordinates], [student points in axis coordinates]. 

2.5:
- set canvas size from javascript (Firefox requires CSS defintion, other browsers don't.) Consider this a hack for the gradebook

2.4:
- teachermode adds divs from js and no longer from HTML. (caused issues in windows version of Chrome)

2.3:
- added array-style entry for the background lines (x: [] and y: [] syntax is stil valid)
- added limits of the background lines min and max. Both are optional and can be left out.

2.2:
- Force auto scaling of the canvas for cases with minor grid size  < major_grid_size/10. 
*/

console.log(" *** 2.10 *** ");     
    
document.getElementById("myCanvas").style.width =  canvasDef.width+ "px";
document.getElementById("myCanvas").style.height =  canvasDef.height+ "px";
     
/* App is built up using following assumtions:
array is a string
array should have [[], [], []] or [[],[]] structure.
Since 3.0 [ [x/y - coordinate system points ] ,  [ orig ] , []  ,]
array is parsable to json
array is not "No answer" or one of the following translations:
Spanish, Chinese, French, German, Greek, Italian, Japanese, Polish, Korean or Portuguese */
     
var translations = ["No answer","Sin respuesta", "未解答", "Aucune réponse", "Keine Antwort", "Καμία απάντηση", "Nessuna Risposta", "解答なし", "답변 없음", "Brak odpowiedzi", "Sem resposta"];   

if (translations.indexOf(array) >= 0 ) 
	{
	array = [];
	type = 1;
	runApp();
	} 
else 
	{
	runApp();
	}
        
function runApp()
	{
	jQuery.getScript('https://online-exams-mobius.tudelft.nl/web/Masterclass/Public_Html/cubic_spline.js', function()
		{
		jQuery.getScript('https://online-exams-mobius.tudelft.nl/web/Masterclass/Public_Html/paper-full.min.js', function()
			{ 
			console.log("loaded app dependencies...");

			var scope = new paper.PaperScope(); 
			$("#myCanvas").width( canvasDef.width );
			$("#myCanvas").height( canvasDef.height );

			scope.setup($("#myCanvas")[0]);
			var tool = new scope.Tool();
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
			var x_view_steps;
			var y_view_steps;
			/* student points in paperjs point format, browser coordinate system */
			var PointsLocation = [];
			/* student points in browser coordinate system. For fitting function */
			var pathsPointsfitsX =[];
			var pathsPointsfitsY =[];
			var listendGroup = new scope.Group();
			var curveGroup = new scope.Group();
			var PermanentElements = new scope.Group();
			var correctanswerGradebook = false;
                        
			draw_axis();
			/*  array -> punten lijst
				array == [] -> new attempt, if type = 1
				type ==2 -> student result
				type ==3 -> correct answer */
			if(type==2)
				{
				/* student result [ [fit, axis], [stud points, browser]] as STRING! */
				var res =  JSON.parse(array);
				var response_edited = res[0];
				var tobeparsed = res[1];                            
				if(gradebook)
                {                            
                for (i = 0 ; i < response_edited.length ; i++) 
                    {
                    pathsPointsfitsX.push(AxisXtoBrowserX(response_edited[i][0]));
                    pathsPointsfitsY.push(AxisYtoBrowserY(response_edited[i][1]));
                    } 
                } 
                else 
                {
                for (i = 0 ; i < tobeparsed.length ; i++) 
                    {
                    pathsPointsfitsX.push(tobeparsed[i][0]);
                    pathsPointsfitsY.push(tobeparsed[i][1]);                           
                    }
                }
                for (i = 0 ; i < tobeparsed.length ; i++) 
                    {
                    PointsLocation.push(new scope.Point(tobeparsed[i][0], tobeparsed[i][1] ) );
                    }
                } 
                else 
                {
                if(type == 3)
                    { 
                    console.log(array)    
                    var res2 =  JSON.parse(array);
                    var res =  JSON.parse(res2);
                    console.log(res)
                    for (i = 0 ; i < res.length ; i++) 
                        {
                        correctanswerGradebook = true;
                        PointsLocation.push(new scope.Point(AxisXtoBrowserX(res[i][0]), AxisYtoBrowserY(res[i][1]) ) );
                        pathsPointsfitsX.push(AxisXtoBrowserX(res[i][0]));
                        pathsPointsfitsY.push(AxisYtoBrowserY(res[i][1]));
                        }
                    }
                }

                draw();

                function draw_axis()
                    {                             
                    PermanentElements.removeChildren();

                    /* compute distance between minor check marks in browser coordinate system */
                    var x_view_minor_step = Math.round( (canvasDef.width - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0])/minor_grid_lines.xStep))) ;
                    var y_view_minor_step = Math.round( (canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2])/minor_grid_lines.yStep))) ;
                    /* x_view steps is distance between checkmarks on the screen,in screen coordinates. Browser coordinates are all integers! Rounding is required, it's been decided to round up as well down, and to recalculate new canvas size. */
                    canvasDef.height = y_view_minor_step*((Math.abs(axes[3] - axes[2])/minor_grid_lines.yStep))+canvasDef.vPad*2;
                    canvasDef.width = x_view_minor_step*((Math.abs(axes[1] - axes[0])/minor_grid_lines.xStep))+canvasDef.hPad*2;
                    console.log("re-setting canvas: " + canvasDef.height + "x" +canvasDef.width);

                    $("#myCanvas").width( canvasDef.width );
                    /*$("#myCanvas").height( canvasDef.height );*/
                    paper.view.viewSize = [canvasDef.width,  canvasDef.height]; 

                    /* major check marks */
                    x_view_steps =Math.round( (canvasDef.width - canvasDef.hPad*2) / ((Math.abs(axes[1] - axes[0])/major_grid_lines.xStep))) ;
                    y_view_steps =Math.round( (canvasDef.height - canvasDef.vPad*2) / ((Math.abs(axes[3] - axes[2])/major_grid_lines.yStep))) ;

                    try 
                        {
                        if ( deltay !== "") 
                            {
                            deltay = parseFloat(deltay);
                            } 
                        else 
                            {
                            deltay = (minor_grid_lines.yStep*y_view_steps/5.0);
                            }	 
                        } 
                    catch 
                        {
                        deltay = (minor_grid_lines.yStep*y_view_steps/5.0);
                        }
                    try 
                        { 
                        if (deltax !== "") 
                            {
                            deltax = parseFloat(deltax);
                            } 
                        else 
                            {
                            deltax = (minor_grid_lines.xStep*x_view_steps/2.0) ;
                            }
                        } 
                    catch 
                        {
                        deltax = (minor_grid_lines.xStep*x_view_steps/2.0) ;
                        }
                    
                    if (axis_defintion.y_axis_position != "auto" ) 
                        {
                        if (axis_defintion.y_axis_position == "left") 
                            {
                            x_axis_coordinate = canvasDef.hPad;
                            } 
                        else if (axis_defintion.y_axis_position == "right") 
                            {
                            x_axis_coordinate = canvasDef.width-canvasDef.hPad;
                            }  
                        else 
                            {
                            console.log("y axis position undefined, selector: "+axis_defintion.y_axis_position+ " unknown. [auto, left, right]");
                            errormessages = "y axis position undefined, selector: "+axis_defintion.y_axis_position+ " unknown. [auto, left, right]";
                            }
                        } 
                    else 
                        {
                        /* X-coordinate of the axis, hence x_axis_coordinate is x-coordinate of the y-axis */
                        if( (axes[0] > 0 && axes[1] > 0 ) || (axes[0] < 0 && axes[1] < 0)  )  
                            {
                            /* special case, the x-axis doesn't start at 0, x- and y-axis are disconected */
                            x_axis_coordinate =canvasDef.hPad; 
                            } 
                        else if(axes[0] == 0 && !axis_defintion.xAxisFlipped)
                            {
                            x_axis_coordinate = canvasDef.hPad;
                            } 
                        else if(axes[0] == 0 && axis_defintion.xAxisFlipped)
                            {
                            /* x- axis starts on 0, x value increases to the left  */
                            x_axis_coordinate = canvasDef.width-canvasDef.hPad;
                            } 
                        else if (axis_defintion.xAxisFlipped)
                            {
                            x_axis_coordinate = -Math.abs(axes[0])/major_grid_lines.xStep * x_view_steps  - canvasDef.hPad + canvasDef.width; 
                            } 
                        else 
                            {
                            x_axis_coordinate = Math.abs(axes[0])/major_grid_lines.xStep * x_view_steps  + canvasDef.hPad;
                            }
                        }
                    if (axis_defintion.x_axis_position != "auto" ) {
                        if (axis_defintion.x_axis_position == "up") {
                            y_axis_coordinate = canvasDef.vPad;
                        } else if (axis_defintion.x_axis_position == "bottom") {
                            y_axis_coordinate = canvasDef.height-canvasDef.vPad;
                        } else {
                            console.log("x axis position undefined, selector: "+axis_defintion.x_axis_position+ " unknown. [auto, up, bottom]");
                            errormessages ="x axis position undefined, selector: "+axis_defintion.x_axis_position+ " unknown. [auto, up, bottom]";
                        }
                    } else {
                        /* Y-coordinate of the axis, hence the y location of the x-axis */
                        if( (axes[2] > 0 && axes[3] > 0) || (axes[2] < 0 && axes[3] < 0) ){
                            /* y-axis does not start 0, hence x and y axis lines are not intersecting */
                            y_axis_coordinate = canvasDef.vPad;
                        } else if(axes[2] == 0 && !axis_defintion.yAxisFlipped){
                            /* min y value is 0, and it's not flipped, hence it should be at the bottom */
                            y_axis_coordinate = canvasDef.height-canvasDef.vPad;
                        } else if(axes[2] == 0 && axis_defintion.yAxisFlipped){
                            /* min y value is 0, and it's  flipped, hence it should be at the top */
                            y_axis_coordinate = canvasDef.vPad;
                        } else if (axis_defintion.yAxisFlipped){
                            y_axis_coordinate = -Math.abs(axes[3])/major_grid_lines.yStep * y_view_steps  - canvasDef.vPad + canvasDef.height; 
                        } else {
                            y_axis_coordinate = (Math.abs(axes[3])/major_grid_lines.yStep * y_view_steps  + canvasDef.vPad); 
                        }
                    }
                    
                    if( !axis_defintion.xAxisFlipped) {
                        if (axis_defintion.xAxisArrow) {
                            draw_arrow(new scope.Point(canvasDef.hPad,y_axis_coordinate), new scope.Point(canvasDef.width-canvasDef.hPad/2,y_axis_coordinate));
                        }
                        /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                        /* var x_temp = canvasDef.hPad+0.5;   */
                        var x_temp = even_fix(canvasDef.hPad, 0.5);
                        /* vertical lines and x-axis labels */
                        for(var i = axes[0]; i <= axes[1] ; i = i + major_grid_lines.xStep){
                            
PermanentElements.addChild( draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height-canvasDef.vPad ,major_grid_lines.lineWidth, major_grid_lines.lineColor  )  );
                            
PermanentElements.addChild( draw_line(x_temp, y_axis_coordinate+major_grid_lines.checkmark_offset, x_temp, y_axis_coordinate-major_grid_lines.checkmark_offset ,major_grid_lines.checkmark_width, major_grid_lines.checkmark_color  )  );
                            
PermanentElements.addChild(draw_label_text(i,x_temp+ axis_defintion.xLabelPositionHorizontal, y_axis_coordinate + axis_defintion.xLabelPositionVertical, axis_defintion.xLabelJustification, axis_defintion.xLabelColor, axis_defintion.xLabelFontSize , axis_defintion.xLabelShowZero ,axis_defintion.xLabelNumberPrecision   ));                                    
                            x_temp = (x_temp + x_view_steps);
                        }
                    } else {
                        /* x-axis is inverted, running from right to left */ 
                        if(axis_defintion.xAxisArrow){
                            draw_arrow(new scope.Point(canvasDef.width-canvasDef.hPad,y_axis_coordinate), new scope.Point(canvasDef.hPad/2,y_axis_coordinate));
                        }
                        /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                        /*var x_temp = canvasDef.width - canvasDef.hPad - 0.5; */
                        x_temp = even_fix(canvasDef.width - canvasDef.hPad, -0.5);
                        /* vertical lines and x-axis labels */
                        for(var i = axes[0]; i <= axes[1] ; i = i + major_grid_lines.xStep){
                            
PermanentElements.addChild( draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height-canvasDef.vPad ,major_grid_lines.lineWidth, major_grid_lines.lineColor  )  );
                                                                
PermanentElements.addChild( draw_line(x_temp, y_axis_coordinate+major_grid_lines.checkmark_offset, x_temp, y_axis_coordinate-major_grid_lines.checkmark_offset ,major_grid_lines.checkmark_width, major_grid_lines.checkmark_color  )  );                                    
PermanentElements.addChild(draw_label_text(i,x_temp+ axis_defintion.xLabelPositionHorizontal, y_axis_coordinate + axis_defintion.xLabelPositionVertical, axis_defintion.xLabelJustification, axis_defintion.xLabelColor, axis_defintion.xLabelFontSize , axis_defintion.xLabelShowZero ,axis_defintion.xLabelNumberPrecision   ));                                       
                            
                            x_temp = (x_temp - x_view_steps);
                        }
                    }
                    if (!axis_defintion.yAxisFlipped) {
                        if(axis_defintion.yAxisArrow){
                            draw_arrow(new scope.Point(x_axis_coordinate, canvasDef.height-canvasDef.vPad), new scope.Point(x_axis_coordinate, canvasDef.vPad/2));
                        }
                        /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                        
                        /* var y_temp = canvasDef.vPad + 0.5; */
                        var y_temp = even_fix(canvasDef.vPad, 0.5);
                        /* all with y-axis, and horizontal grid lines */
                        for(var i = axes[3]; i >= axes[2] ; i = i - major_grid_lines.yStep){
                            
PermanentElements.addChild( draw_line(canvasDef.hPad, y_temp, canvasDef.width-canvasDef.vPad, y_temp ,major_grid_lines.lineWidth, major_grid_lines.lineColor  )  );                                                                     
PermanentElements.addChild( draw_line(x_axis_coordinate+major_grid_lines.checkmark_offset, y_temp, x_axis_coordinate-major_grid_lines.checkmark_offset, y_temp ,major_grid_lines.checkmark_width, major_grid_lines.checkmark_color  )  );                                     
                            
PermanentElements.addChild(draw_label_text(i,x_axis_coordinate+ axis_defintion.yLabelPositionHorizontal, y_temp+axis_defintion.yLabelPositionVertical, axis_defintion.yLabelJustification, axis_defintion.yLabelColor, axis_defintion.yLabelFontSize , axis_defintion.yLabelShowZero ,axis_defintion.yLabelNumberPrecision   ));   
                            
                            y_temp = y_temp + y_view_steps;
                        }
                    } else {
                        /* y-axis is flipped */
                        if(axis_defintion.yAxisArrow){
                            draw_arrow(new scope.Point(x_axis_coordinate, canvasDef.vPad), new scope.Point(x_axis_coordinate, canvasDef.height-canvasDef.vPad/2));
                        }
                        /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                        /*var y_temp = canvasDef.vPad + 0.5; */
                        var y_temp = even_fix(canvasDef.vPad, 0.5);
                        for(var i = axes[2]; i <= axes[3] ; i = i + major_grid_lines.yStep){
                                                                
PermanentElements.addChild( draw_line(canvasDef.hPad, y_temp, canvasDef.width-canvasDef.vPad, y_temp ,major_grid_lines.lineWidth, major_grid_lines.lineColor  )  );     
                            
                            
PermanentElements.addChild( draw_line(x_axis_coordinate+major_grid_lines.checkmark_offset, y_temp, x_axis_coordinate-major_grid_lines.checkmark_offset, y_temp ,major_grid_lines.checkmark_width, major_grid_lines.checkmark_color  )  );   
                            
PermanentElements.addChild(draw_label_text(i,x_axis_coordinate+ axis_defintion.yLabelPositionHorizontal, y_temp+axis_defintion.yLabelPositionVertical, axis_defintion.yLabelJustification, axis_defintion.yLabelColor, axis_defintion.yLabelFontSize , axis_defintion.yLabelShowZero ,axis_defintion.yLabelNumberPrecision   ));   
                            
                            
                            y_temp = y_temp + y_view_steps;
                        }
                    }
                    /* minor vertical lines */
                    /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                    /* x_temp = canvasDef.hPad + 0.5; */
                    x_temp = even_fix(canvasDef.hPad, 0.5);
                    for(var i = axes[0]; i <= axes[1] ; i = i + minor_grid_lines.xStep){

                        
PermanentElements.addChild( draw_line(x_temp, canvasDef.vPad, x_temp, canvasDef.height-canvasDef.vPad ,minor_grid_lines.lineWidth, minor_grid_lines.lineColor  )  );                                   
                    
                        
PermanentElements.addChild( draw_line(x_temp, y_axis_coordinate+minor_grid_lines.checkmark_offset, x_temp, y_axis_coordinate-minor_grid_lines.checkmark_offset ,minor_grid_lines.checkmark_width, minor_grid_lines.checkmark_color  )  );                                 
                        
                        
                        x_temp = (x_temp + x_view_minor_step);
                    }
                    /* minor horizontal lines */
                    /* FIX FOR CHROME 32 BIT +0,5 PIXEL */
                    /* y_temp = canvasDef.vPad + 0.5;*/
                    y_temp = even_fix(canvasDef.vPad, 0.5);
                    for(var i = axes[3]; i >= axes[2] ; i = i - minor_grid_lines.yStep){
                                    
PermanentElements.addChild( draw_line(canvasDef.hPad, y_temp, canvasDef.width-canvasDef.vPad, y_temp ,minor_grid_lines.lineWidth, minor_grid_lines.lineColor  )  );                                  
                        
PermanentElements.addChild( draw_line(x_axis_coordinate+minor_grid_lines.checkmark_offset, y_temp, x_axis_coordinate-minor_grid_lines.checkmark_offset, y_temp ,minor_grid_lines.lineWidth, minor_grid_lines.lineColor  )  );                                   
                        
                        y_temp = y_temp + y_view_minor_step;
                    }

                    /* axis name labels */
                    if (axis_defintion.xAxisName != "") {
                        var text = new scope.PointText(new scope.Point(canvasDef.width/2+ axis_defintion.xAxisNameHorizontal, y_axis_coordinate+axis_defintion.xAxisNameVertical));
                        text.justification = axis_defintion.xAxisNameJustification;
                        text.fillColor = axis_defintion.xAxisNameFontColor;
                        text.fontSize = axis_defintion.xAxisNameFontSize;
                        text.content =  axis_defintion.xAxisName;
                        PermanentElements.addChild(text);
                    }
                    if (axis_defintion.yAxisName != "") {
                        var text = new scope.PointText(new scope.Point(x_axis_coordinate+ axis_defintion.yAxisNameHorizontal, canvasDef.height/2+axis_defintion.yAxisNameVertical));
                        text.rotate(axis_defintion.yAxisNameOrientation);
                        text.justification = axis_defintion.yAxisNameJustification;
                        text.fillColor = axis_defintion.yAxisNameFontColor;
                        text.fontSize = axis_defintion.yAxisNameFontSize;
                        text.content =  axis_defintion.yAxisName;
                        PermanentElements.addChild(text);
                    }                            
                    for (var property in backgroundlines) {
                        if (backgroundlines.hasOwnProperty(property)) {
                            var lijnobject = backgroundlines[property];
                            
                            if(lijnobject.hasOwnProperty("bgcoord")){
                                var xlijst =[];
                                var ylijst = [];
                                for (i = 0 ; i < lijnobject.bgcoord.length ; i++) {
                                    xlijst.push(lijnobject.bgcoord[i][0]);
                                    ylijst.push(lijnobject.bgcoord[i][1]);
                                }
                                var x_val = xlijst;
                                var y_val = ylijst;
                            } else {
                                var x_val = lijnobject.x;
                                var y_val = lijnobject.y;
                            }

                    
                            var fit_graph = new scope.Path();
                            if (lijnobject.lineColorGreyShade < 0) {
                                fit_graph.strokeColor = lijnobject.lineColor;
                            } else {
                                fit_graph.strokeColor = new scope.Color(lijnobject.lineColorGreyShade);
                            }
                            fit_graph.strokeWidth = backgroundlines.lineThickness;
                            var lijnSpline = new MonotonicCubicSpline(x_val, y_val);

                            if (AxisXtoBrowserX(x_val[0])> AxisXtoBrowserX(x_val[x_val.length-1])) {
                                /* browser coordinaat eerste X-punt >browser coordinaat laatste X-punt */
                                for (var xvar = AxisXtoBrowserX(x_val[0]) ; (xvar >= AxisXtoBrowserX(x_val[x_val.length-1])) ; xvar = xvar - draw_steps){
                                    var temp_y = lijnSpline.interpolate(BrowserXtoAxisX(xvar));
                                    var temp = new scope.Point(xvar, AxisYtoBrowserY(temp_y) );
                                    if ((!(lijnobject.hasOwnProperty("x_limit_max")) || ( (lijnobject.hasOwnProperty("x_limit_max")) && AxisXtoBrowserX(lijnobject.x_limit_max) <= xvar )) &&  (!(lijnobject.hasOwnProperty("x_limit_min")) || ( (lijnobject.hasOwnProperty("x_limit_min")) && AxisXtoBrowserX(lijnobject.x_limit_min) >= xvar )) ) {
                                        fit_graph.add( temp ); 
                                    }   
                                }
                            } else {
                                for (var xvar = AxisXtoBrowserX(x_val[0]) ; (xvar <= AxisXtoBrowserX(x_val[x_val.length-1])) ; xvar = xvar + draw_steps) {
                                    var temp_y = lijnSpline.interpolate(BrowserXtoAxisX(xvar));
                                    var temp = new scope.Point(xvar, AxisYtoBrowserY(temp_y) );
                                    if ((!(lijnobject.hasOwnProperty("x_limit_max")) || ( (lijnobject.hasOwnProperty("x_limit_max")) && AxisXtoBrowserX(lijnobject.x_limit_max) >= xvar )) &&  (!(lijnobject.hasOwnProperty("x_limit_min")) || ( (lijnobject.hasOwnProperty("x_limit_min")) && AxisXtoBrowserX(lijnobject.x_limit_min) <= xvar )) ) {
                                        fit_graph.add( temp ); 
                                    }
                                        
                                }   
                            }    
                            
                            if(!(lijnobject.hasOwnProperty("x_limit_max")) || ((lijnobject.hasOwnProperty("x_limit_max")) && 
                                (lijnobject.x_limit_max >= x_val[x_val.length-1]))) {
                                fit_graph.add(new scope.Point(AxisXtoBrowserX(x_val[x_val.length-1]), AxisYtoBrowserY(y_val[x_val.length-1] )));
                            }                                            

                            PermanentElements.addChild(fit_graph);
                        }
                    }
                    scope.project.activeLayer.addChild(PermanentElements);

                };   
                        
                function draw_label_text(digit, x1,y1,LabelJustification, LabelColor, LabelFontSize, LabelShowZero, LabelNumberPrecision ){

                    var text = new scope.PointText(new scope.Point(x1, y1));
                    text.justification = LabelJustification;
                    text.fillColor = LabelColor;
                    text.fontSize =  LabelFontSize;
                    if( LabelShowZero || Math.abs(digit)> 0.00001  ){
                        text.content =  digit.toFixed(LabelNumberPrecision);
                    }
                    return text;                            
                }

                function draw_line(x1,y1,x2,y2,width, colour)
                {
                    var new_line = new scope.Path([new scope.Point(x1, y1), new scope.Point(x2, y2)]);
                    new_line.strokeWidth = width;
                    new_line.strokeColor = new scope.Color(colour) ;
                    return new_line;
                };

                function draw_arrow(startP, endP){
                    /* line */
                    var axisline = new scope.Path();
                    axisline.strokeColor = axis_defintion.AxisLineColor;
                    axisline.strokeWidth = axis_defintion.AxisLineThickness ;
                    axisline.add(startP);
                    axisline.add(endP); 
                    PermanentElements.addChild(axisline);
                    /* arrow head */
                    var vector = endP.subtract(startP);
                    vector.length = axis_defintion.AxisArrowSize;
                    var vectorItem = new scope.Path([
                        endP.add(vector.rotate(axis_defintion.AxisArrowAngle)),
                        endP,
                        endP.add(vector.rotate(-axis_defintion.AxisArrowAngle))
                    ]);
                    vectorItem.strokeWidth = axis_defintion.AxisArrowLineThickness;
                    vectorItem.strokeColor = axis_defintion.AxisArrowLineColor;
                    PermanentElements.addChild(vectorItem);
                };

                function BrowserXtoAxisX(x_loc){
                    if( !axis_defintion.xAxisFlipped) {
                        return (x_loc - (Math.abs(axes[0])/major_grid_lines.xStep * x_view_steps  + canvasDef.hPad))/x_view_steps*major_grid_lines.xStep ;
                    } else {
                        return -(x_loc - (Math.abs(axes[1])/major_grid_lines.xStep * x_view_steps  + canvasDef.hPad))/x_view_steps*major_grid_lines.xStep ;
                    }
                };

                function BrowserYtoAxisY(y_loc){
                    if( !axis_defintion.yAxisFlipped) {
                        return (-y_loc + (Math.abs(axes[3])/major_grid_lines.yStep * y_view_steps  + canvasDef.vPad))/y_view_steps*major_grid_lines.yStep;
                    } else {
                        return -(-y_loc - Math.abs(axes[3])/major_grid_lines.yStep * y_view_steps  - canvasDef.vPad + canvasDef.height )/y_view_steps*major_grid_lines.yStep;
                    }
                }; 
                
                function AxisXtoBrowserX(x_loc){
                    
                    if( !axis_defintion.xAxisFlipped) {
                        return x_loc*x_view_steps/major_grid_lines.xStep + (Math.abs(axes[0])/major_grid_lines.xStep * x_view_steps  + canvasDef.hPad);
                    } else {
                        return -x_loc*x_view_steps/major_grid_lines.xStep + (Math.abs(axes[1])/major_grid_lines.xStep * x_view_steps  + canvasDef.hPad);
                    }
                };

                function AxisYtoBrowserY(y_loc){
                    if( !axis_defintion.yAxisFlipped) {
                        return -y_loc*y_view_steps/major_grid_lines.yStep + (Math.abs(axes[3])/major_grid_lines.yStep * y_view_steps  + canvasDef.vPad);
                    } else {
                        return y_loc*y_view_steps/major_grid_lines.yStep - Math.abs(axes[3])/major_grid_lines.yStep * y_view_steps  - canvasDef.vPad + canvasDef.height;
                    }
                };

                function even_fix(getal, waarde){
                        if( (navigator.userAgent.indexOf("Chrome") !== -1)){
                        /* if((getal % 2 != 0) & (navigator.userAgent.indexOf("Chrome") !== -1)){ */
                            return getal + waarde;
                        } else {
                            return getal;
                        } 
                    
                };
                
                function testOmrekenen(){
                    for(i = -100; i <= 200 ; i = i + 0.5 ){
                        console.log(i + " to Browser Axis " + AxisYtoBrowserY(i) + " Back to axis " + BrowserYtoAxisY(AxisYtoBrowserY(i)) );
                        console.log(i + " to Browser Axis " + AxisXtoBrowserX(i) + " Back to axis " + BrowserXtoAxisX(AxisXtoBrowserX(i)) );
                    }
                }
    
                function draw(){
                    window.dispatchEvent(new Event('resize'));
                    if (teachermode){
                        
                        /* original <div id="teacher" style='overflow-y:scroll; height:500px'></div>
                            add div
                            append to div
                        */
                        
                        var teacherDiv = document.createElement('div');
                        teacherDiv.id = 'teacher';
                        teacherDiv.className = 'teacher';
                        teacherDiv.style="overflow-y:scroll; height:500px";
                        document.getElementsByTagName('body')[0].appendChild(teacherDiv);

                        var temptext = "<table style='width:80%'>";
                        temptext = temptext + "<tr> <th> x: </th> <th> y: </th> </tr>";
                        for (points = 0 ; points < PointsLocation.length ; points++ ){
                            temptext = temptext + "<tr> <th>"+BrowserXtoAxisX(PointsLocation[points].x)+"</th><th>" + BrowserYtoAxisY(PointsLocation[points].y)+" </th> </tr>";
                        }
                        temptext = temptext +  "</table>";                                                                                                         
                        document.getElementById("teacher").innerHTML = errormessages + "<br/>" +"Drawn points <br />"+ temptext;
                    }
                    if (PointsLocation.length != 0 ){
                        listendGroup.removeChildren();
                        curveGroup.removeChildren();
                        var mySpline = new MonotonicCubicSpline(pathsPointsfitsX, pathsPointsfitsY);
                        var pointsToString= "";
                        var pointsToStringAxisCoord= "";
                        if ( !correctanswerGradebook){
                            
                        /* draw points */        
                        for (points = 0 ; points < PointsLocation.length ; points++ ){
                            var circle = new scope.Shape.Circle(PointsLocation[points], 5);
                            circle.strokeColor = 'black';
                            pointsToString = pointsToString + "[" + PointsLocation[points].x + ","+PointsLocation[points].y + "]," ;   
                            pointsToStringAxisCoord = pointsToStringAxisCoord + "[" + BrowserXtoAxisX(PointsLocation[points].x) + ","+ BrowserYtoAxisY(PointsLocation[points].y) + "]," ;
                            
                            if(selected_x !== null  &&  selected_y !== null && (Math.abs(PointsLocation[points].x -  selected_x) < hitOptions.tolerance) ) {
                                circle.fillColor = 'red';
                            } 
                            listendGroup.addChild(circle);
                        }
                        }
                        pointsToString = pointsToString.slice(0, -1);
                        pointsToStringAxisCoord = pointsToStringAxisCoord.slice(0, -1);
                        
                        
                        AnswerStr = "[[";
                        var fit_graph = new scope.Path();
                        fit_graph.strokeColor = 'red';
                        fit_graph.strokeWidth = 1.7;
                        
                        /* append point to the answer string (parse into maple readable format) */
                        for (var xvar = PointsLocation[0].x ; xvar <= PointsLocation[PointsLocation.length-1].x ; xvar = xvar + draw_steps ){
                            var temp_y = mySpline.interpolate(xvar);
                            var temp = new scope.Point(xvar,temp_y );
                            AnswerStr = AnswerStr + "[" + BrowserXtoAxisX(xvar) + " , " + BrowserYtoAxisY(temp_y) + " ],";
                            fit_graph.add( temp );        
                        } 
                                                        
                        fit_graph.add( new scope.Point(PointsLocation[PointsLocation.length-1].x ,mySpline.interpolate(PointsLocation[PointsLocation.length-1].x) ) );
                        curveGroup.addChild(fit_graph);
                        AnswerStr = AnswerStr.slice(0, -1);
                        AnswerStr = AnswerStr + " ],[ " + pointsToString + "],["+ pointsToStringAxisCoord + "]]";
                        
                    } 
                    scope.project.activeLayer.addChild(listendGroup);
                    scope.project.activeLayer.addChild(curveGroup);

                }

                tool.onMouseDrag = function(e) {
                    if (!gradebook){
                        mouseDraggedFrom = e.point;
                        movedby = e.delta;
                        var results =[];
                        for( var x = 0 ; x <PointsLocation.length ; x++ ){
                            if (mouseDraggedFrom.getDistance( PointsLocation[x], false) < hitOptions.tolerance){
                                /* check if it's only one points, then move if more than 1 point, remove them */
                                results.push(x);
                            }
                        } 

                        for (i = (results.length-1) ; i >= 1 ; i--){
                            PointsLocation.splice(results[i], 1);
                            pathsPointsfitsX.splice(results[i], 1);
                            pathsPointsfitsY.splice(results[i], 1);
                        }

                        PointsLocation[results[0]] = new scope.Point(mouseDraggedFrom.x + movedby.x,mouseDraggedFrom.y + movedby.y );
                        pathsPointsfitsY[results[0]] = mouseDraggedFrom.y + movedby.y;
                        pathsPointsfitsX[results[0]] = mouseDraggedFrom.x + movedby.x;
                        draw();
                    }
                };

                tool.onMouseDown = function(e) {
                    if(!gradebook){

                        var hitPoint = new scope.Point(e.event.offsetX, e.event.offsetY);
                        var hitResult = listendGroup.hitTest(hitPoint , hitOptions);
                        if (!hitResult ) {
                            if (selected_x !== null || selected_y !== null ) {
                                selected_x = null;
                                selected_y = null ;
                            }     else {               
                                /* not on the curve or point */
                                if (PointsLocation.length == 0) {
                                    PointsLocation.push(hitPoint);
                                    /* first point */
                                    pathsPointsfitsY.push(e.event.offsetY);
                                    pathsPointsfitsX.push(e.event.offsetX);
                                } else {
                                    /* there are points already */
                                    for( var i = 0 ; i <PointsLocation.length ; i++ ){
                                        if( e.event.offsetX < PointsLocation[i].x ) {
                                            /* point to the left of this point */
                                            PointsLocation.splice(i,0, hitPoint);
                                            pathsPointsfitsX.splice(i, 0, e.event.offsetX);
                                            pathsPointsfitsY.splice(i, 0, e.event.offsetY);
                                            break;
                                        } else {
                                            if (i == PointsLocation.length - 1){
                                                /* point is on the right to the last point of the array */
                                                PointsLocation.splice(PointsLocation.length,0, hitPoint);
                                                pathsPointsfitsX.splice(PointsLocation.length, 0, e.event.offsetX);
                                                pathsPointsfitsY.splice(PointsLocation.length, 0, e.event.offsetY);
                                                break;
                                            }
                                        }
                                    }  
                                }
                            }
                            draw();
                        } else {
                            selected_x = e.event.offsetX;  
                            selected_y = e.event.offsetY ;
                            draw();
                        }
                    }
                }; 

                var dd = $('#dd');
                /* delete point */
                dd.click(function() { 
                    for (points = 0 ; points < PointsLocation.length ; points++ ){
                        if( (Math.abs(PointsLocation[points].x -  selected_x) < 10) && (Math.abs(PointsLocation[points].y -  selected_y) < 10)) {
                            PointsLocation.splice(points, 1);
                            pathsPointsfitsX.splice(points, 1);
                            pathsPointsfitsY.splice(points, 1);
                        }
                    }
                    selected_x = null;
                    selected_y = null ;
                    draw();
                });

                var cont = $('#cont');
                /* toggle contrast settings */
                cont.click(function() {
                    var x = document.getElementById('contrast');
                        if (x.style.display === 'none') {
                            x.style.display = 'block';
                        } else {
                            x.style.display = 'none';
                        }
                });

                var mm = $('#mm');
                /* min function */
                mm.click(function() { 
                    console.log(deltay)
                    for (points = 0 ; points < PointsLocation.length ; points++ ){
                        if( (Math.abs(PointsLocation[points].x -  selected_x) < 10) && (Math.abs(PointsLocation[points].y -  selected_y) < 10)) {
                            var tempy = PointsLocation[points].y;
                            PointsLocation.splice(points,0,  new scope.Point(selected_x - deltax , tempy-deltay ));          
                            pathsPointsfitsX.splice(points, 0, selected_x - deltax );
                            pathsPointsfitsY.splice(points, 0, tempy-deltay);

                            PointsLocation.splice(points+2, 0,  new scope.Point(selected_x + deltax , tempy-deltay ) );
                            pathsPointsfitsX.splice(points+2, 0, selected_x+ deltax);
                            pathsPointsfitsY.splice(points+2, 0, tempy - deltay);
                            break;
                        }
                    }
                    selected_x = null;
                    selected_y = null ;
                    draw();
                }); 

                var da = $('#ddall');
                /* wipe 'em all */
                da.click(function() {
                    if (!gradebook){          
                        PointsLocation.splice(0,PointsLocation.length);
                        pathsPointsfitsX.splice(0,pathsPointsfitsX.length);
                        pathsPointsfitsY.splice(0,pathsPointsfitsY.length);
                        listendGroup.removeChildren();
                        curveGroup.removeChildren();
                        draw();
                    } 
                });

                var mmax = $('#mmax');
                /* max function */
                mmax.click(function() { 
                    for (points = 0 ; points < PointsLocation.length ; points++ ){
                        if( (Math.abs(PointsLocation[points].x -  selected_x) < 10) && (Math.abs(PointsLocation[points].y -  selected_y) < 10)) {
                            var tempy = PointsLocation[points].y;
                            PointsLocation.splice(points,0,  new scope.Point(selected_x -deltax , tempy+deltay ) );               
                            pathsPointsfitsX.splice(points, 0, selected_x -deltax);
                            pathsPointsfitsY.splice(points, 0, tempy+deltay);
                            PointsLocation.splice(points+2, 0,  new scope.Point(selected_x +deltax , tempy +deltay ) );
                            pathsPointsfitsX.splice(points+2, 0, selected_x+ deltax);
                            pathsPointsfitsY.splice(points+2, 0, tempy +deltay);
                            break;
                        }
                    }
                    selected_x = null;
                    selected_y = null ;
                    draw();
                });
                                                    
                var mR= $('#minorR');
                /* minor grid lines slider */
                mR.click(function() { 
                    scope.project.clear();
                    minor_grid_lines.lineColor = mR.val()/10;
                    draw_axis();
                    draw();
                });
                
                var maR= $('#majorR');
                /* major grid lines slider */
                maR.click(function() { 
                    scope.project.clear();
                    major_grid_lines.lineColor = maR.val()/10;
                    draw_axis();
                    draw();
                });
            });
        });
    }
}