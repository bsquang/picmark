var body = document.getElementsByTagName('body')[0],
    isDragging = false,
    startPos;

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
dragArea.style.backgroundColor = "gray";
dragArea.style.opacity = "0.25";
dragArea.style.position = "relative";
dragArea.style.display = "block";
dragArea.style.width = 0;
dragArea.style.border = "1px solid #000";

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

        chrome.extension.sendMessage({
                CMD: 'got_area',
                Data: {
                    bsqID: temp_id_cut,
                    left:   dragArea.style.left.split('px')[0],
                    top:    dragArea.style.top.split('px')[0],
                    width:  dragArea.style.width.split('px')[0],
                    height: dragArea.style.height.split('px')[0]
                }
            }
        );
        
        overlay.style.cursor = "default";
        overlay.onmousedown = null;
        overlay.onmousemove = null;
        
        body.removeChild(dragArea);
        
        isDragging = false;
    }

};

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
      if (request.greeting == "turnOff"){
          body.removeChild(overlay);
          console.log("Remove: " + request.bsq_id);
    }
});

