var teachermode = $teachermode;
var type = 0;
var gradebook = false;
var axes = $axes;
var canvasDef = $canvasDef;
var axis_definition = $axis_definition;
var major_grid_lines = $major_grid_lines;
var minor_grid_lines = $minor_grid_lines;
var backgroundlines = $backgroundlines;
var deltax = "10"; /* pixels */
var deltay = "1"; /* pixels */
var precision = 0.05;
var draw_step = 10; /* pixels */
var AnswerStr = "";
var errormessages ="";

jQuery.getScript('/web/Cie4305000/Public_Html/HTML_test/run_app_new.js', function(){});
/* jQuery.getScript('/web/Masterclass/Public_Html/run_app.js', function(){}); */

function initialize(interactiveMode) {
    console.log("initialize(" + interactiveMode + ") is called");
    gradebook = !interactiveMode;
    if (gradebook){
        /* Remove HTML buttons from page */
        jQuery( "#delPoint" ).remove();
        jQuery( "#delAll" ).remove();
        jQuery( "#buttonMin" ).remove();
        jQuery( "#buttonMax" ).remove();
        jQuery( "#toggleContrast" ).remove();
        jQuery( "#gridMinor" ).remove();
        jQuery( "#gridMajor" ).remove();
        jQuery( "#contrast" ).remove();
    }
};

/* Mobius officially supports (feb, 2023): English (US), French, German, Italian, Japanese, Simplified Chinese and Spanish (Latin America) */
/* for translations we also added: Dutch, Greek, Korean, Polish and Portuguese */
var translations = ["No answer", "Aucune réponse", "Keine Antwort", "Nessuna risposta", "解答なし", "未解答", "Sin respuesta",
                    "Geen antwoord", "Καμία απάντηση", "답변 없음", "Brak odpowiedzi", "Sem resposta"];
/* response is either "No answer" (or translation) or student answer
   answer is either null (not attempted or ungraded) or correct answer */
function setFeedback(response, answer) {
    if (translations.indexOf(response) >= 0 ) {
        /* Interaction mode, not yet attempted or when in preview */
        type = 1;
        runApp(response, type);
    }
    else if (answer == null) {
        /* Loads student response (either interactive or in gradebook) */
        type = 2;
        runApp(response, type);
    }
    else if (answer != null) {
        /* Draw correct answer ($answer) in gradebook */
        type = 3;
        runApp(answer, type);
    }
    console.log("setFeedback() with type = " + type + " is called");
};

function getResponse() {
    console.log("getResponse() is called");
    return AnswerStr;
};