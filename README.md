# SketchApp
## Introduction
SketchApp is the interactive spline drawing tool designed for Möbius. The tool is built within the HTML response area of the Möbius question editor. A question with the SketchApp allows students (users) to create points in a graph. Through these points a Monotonic Cubic (Hermite) Interpolated spline is drawn. The points by the user can be dragged and deleted using the mouse (cursor). When the question is graded, the answer of the user is automatically graded by Möbius using Maple code, entered in the HTML response area. For courses with a lot of students, this greatly reduces the grading load of teachers for summative assessment and allows students to directly get feedback for formative assessment.

SketchApp is created at Delft University of Technology (TU Delft), inhouse for one of its Master of Science courses. TU Delft strongly believes in the power of Open Education and Open Source. To support this believe, SketchApp has been updated and released to the public. Alongside, detailed documentation of the code is available.

## Builds
Latest:

- v3.0		First published version as open source

Older:

- v2.13		Code refactored, cleaned and minor bug fixes
- v2.11		Function unnesting and code beautify
- v2.10		Last known version by creator Anatoly Ilin

## Required Javascripts
	SketchApp....js			Your version of SketchApp, recommended is to use version 3.0 or above.
	paper-full.js			Enables interaction with a HTML canvas inside an iframe element.
	cubic_spline.js			Used to interpolate a monotonic cubic spline through user defined points.

## Documentation
To fully understand the SketchApp, documentation has been written: SketchApp_Documentation_V1.pdf. Further, only a template to setting up the SketchApp in Möbius is provided. Getting experienced with the tool is up to the user.


## Compatibility
RunApp_v3-0.js compatibility is checked for 4 browsers

	Chrome: 111.0.5563.147 (64-bit)
	Firefox: 110.00 (64-bit)
	Edge: 111.0.1661.54 (64-bit)
	Safari: unknown, tested early April 2023

## PATCH NOTES
**Version 3.0**

*Code*
- Tool behaviour optimized
- Variable name scheme improved for readibility
- Comments inserted in code for readibility
- Removed redundant code
- Console.log events inserted for simple debugging

*HTML response area*
- Beautified Question HTML
- Reduced Question Javascript clutter

## Known errors
- After selecting a point and dragging, the fill color of the circle does not remain red although still selected.
- Spline is not drawn when only two points exist, unless either point is dragged at least once.
- In case a min/max outside domain of the spline is found, a simple solution is used by redefining the min/max to the edge of the domain.
- Browser detection method is unreliable due to use of navigator.userAgent.

## To do
- Adapt code for better debugging
- Include interpolated spline for correct answer in response. To be used for grading
