# Mobius_SketchApp
An interactive tool to draw monotonic cubic splines on a canvas within the Digital Ed Möbius Assessment HTML question type

Javascripts to run the SketchApp:
	paper-full.js (gets the canvas, draws axes and provides interaction with canvas)
	cubic_spline.js (used to interpolate a monotonic cubic spline between the drawn points)
	RunApp_v2-10.js (last version by Anatoly)
	RunApp_v2-11.js (refactored version by Mario)
	
For Möbius:
	manifest.xml (exported question from Möbius)
	sourcecode.txt (copy of sourcecode from question editor in Möbius)
	
Documentation:
	SketchApp_Introduction2015.pdf (written by Anatoly. Functionality still the same. Not all bugs/errors up-to-date)
	SketchApp_setup_2019.pdf (written by Matthijs. Details outdated. IGNORE appendices A, B & C, these are superseded by 
							  manifext.xml / sourcecode.txt)

Short recap:
The HTML question in Möbius inserts an iframe into the webpage. Within this iframe we create a <div> class for the buttons
and a <canvas>. When RunApp is called, paper.js grabs the canvas and creates a project scope. All functionality is contained
within this project. When points are clicked on the canvas, cubic_spline.js interpolates between the points and returns a set
of coordinates. These coordinates are used by paper.js to draw a path (line segments) on the canvas.

The behaviour of the SketchApp is determined by the "type" function variable. The variable is set by Möbius. For more information
on how that works, visit: https://www.digitaled.com/support/help/instructor/Content/INST-AUTHORING/QUESTION-TYPES/Author-HTML-question.htm

Compatibility:
RunApp_v2-11.js compatibility is checked for 4 browsers
	Chrome: 110.0.5481.177 (64-bit)
	Firefox: 109.00 (64-bit)
	Edge: 110.0.1587.50 (64-bit)
	Safari: unknown, whatever version was latest early February 2023