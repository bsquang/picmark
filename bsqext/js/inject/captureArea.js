var body = document.getElementsByTagName('body')[0],
    isDragging = false, startPos;

var temp_id_cut = Date.now();
var overlay = document.createElement('div');
overlay.setAttribute("class",'bsq-cut');
overlay.setAttribute("bsq-id",temp_id_cut);

overlay.style.position = "absolute";
overlay.style.top = body.scrollTop + "px";
overlay.style.left = "0px";
overlay.style.width = "100%";
overlay.style.height = "100%";
overlay.style.zIndex = "999999999";
overlay.style.cursor = "crosshair";

var dragArea = document.createElement('div');
dragArea.style.backgroundColor = "rgba(0,0,0,0.2)";
dragArea.style.position = "relative";
dragArea.style.display = "block";
dragArea.style.width = 0;
dragArea.style.border = "1px dotted #000";

function createButton() {
    
    var button_ok = document.createElement('div');
    button_ok.style.background = "white";
    button_ok.style.border = "1px solid #000";
    button_ok.style.position = 'absolute';
    button_ok.style.right = '0';
    button_ok.style.bottom = '0';
    button_ok.innerHTML = "OK";
    button_ok.style.margin = '5px';
    button_ok.style.padding = '5px';
    button_ok.style.color = 'black';
    button_ok.style.cursor = 'pointer';
    button_ok.onclick = function(e){
        chrome.extension.sendMessage({
            CMD: 'got_area',
            Data: {
                bsqID: temp_id_cut,
                left: dragArea.style.left.split('px')[0],
                top: dragArea.style.top.split('px')[0],
                width: dragArea.style.width.split('px')[0],
                height: dragArea.style.height.split('px')[0]
            }
        });
        
        button_ok.innerHTML = 'Waiting...';
        button_ok.onclick = '';
        button_ok.style.cursor = 'wait';
    };
    dragArea.appendChild(button_ok);

    ////
    var button_x = document.createElement('div');
    button_x.style.background = "white";
    button_x.style.border = "1px solid #000";
    button_x.style.position = 'absolute';
    button_x.style.right = '0';
    button_x.style.top = '0';
    button_x.innerHTML = "X";
    button_x.style.margin = '5px';
    button_x.style.padding = '5px';
    button_x.style.color = 'black';
    button_x.style.cursor = 'pointer';
    button_x.onmousedown = function(e){
        
        body.removeChild(overlay);
        console.log("Cancle");
    };
    dragArea.appendChild(button_x);
    ///
}

overlay.appendChild(dragArea);
body.appendChild(overlay);

overlay.onmousedown = function (e) {
    isDragging = true;
    startPos = [e.clientX, e.clientY];
    dragArea.style.left = startPos[0] + 'px';
    dragArea.style.top = startPos[1] + 'px';

    return false;
};
overlay.onmousemove = function (e) {
    if (isDragging) {
        var posx = e.clientX;
        var posy = e.clientY;
        if (posx < startPos[0]) {
            dragArea.style.left = posx + 'px';
        }
        if (posy < startPos[1]) {
            dragArea.style.top = posy + 'px';
        }
        dragArea.style.width = Math.max(posx, startPos[0]) - Math.min(posx, startPos[0]) + 'px';
        dragArea.style.height = Math.max(posy, startPos[1]) - Math.min(posy, startPos[1]) + 'px';
    }
};
overlay.onmouseup = function (e) {
    if (isDragging) {
        //chrome.extension.sendMessage({
        //    CMD: 'got_area',
        //    Data: {
        //        bsqID: temp_id_cut,
        //        left: dragArea.style.left.split('px')[0],
        //        top: dragArea.style.top.split('px')[0],
        //        width: dragArea.style.width.split('px')[0],
        //        height: dragArea.style.height.split('px')[0]
        //    }
        //});
        
        createButton();
        
        //body.removeChild(overlay);
        overlay.style.cursor = "default";
        overlay.onmousedown = null;
        overlay.onmousemove = null;
        overlay.onmouseup = null;
        
        //body.removeChild(dragArea);
        isDragging = false;
    }
};

if (typeof(bsqFirst)=='undefined') {
    
    bsqFirst = true;
    console.log('first inject');
    
    chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        if (request.greeting == "turnOff") {
            body.removeChild(overlay);
            console.log("Remove: " + request.bsq_id);
        }
    });
    
}else{
    console.log('second inject');
}


//function injectJQuery() {
//    var script = document.createElement('script');
//    script.src = '//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js';
//    script.type = 'text/javascript';
//    document.getElementsByTagName('head')[0].appendChild(script);
//    console.log("jQuery inject!");
//}
